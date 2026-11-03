import { google } from "googleapis";
import { db } from "./db";

// Google OAuth2 configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

// We use the same OAuth2 setup but request Drive scopes
const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.file", // Permission to see, edit, create, and delete only the specific Google Drive files you use with this app
];

export function createDriveOAuth2Client(redirectUri?: string) {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    redirectUri || (process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/drive/callback` : "http://localhost:3000/api/drive/callback")
  );
}

export function getDriveAuthUrl(state: string, redirectUri: string): string {
  const oauth2Client = createDriveOAuth2Client(redirectUri);

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: DRIVE_SCOPES,
    state,
  });
}

export async function exchangeCodeForDriveTokens(code: string, redirectUri: string) {
  const oauth2Client = createDriveOAuth2Client(redirectUri);
  const { tokens } = await oauth2Client.getToken(code);

  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();

  return {
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token ?? null,
    expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    email: userInfo.data.email!,
  };
}

export async function getAuthenticatedDriveClient(userId: string) {
  const connection = await db.googleDriveConnection.findUnique({
    where: { userId },
  });

  if (!connection || !connection.enabled) {
    throw new Error("Google Drive is not connected or enabled.");
  }

  const oauth2Client = createDriveOAuth2Client();
  oauth2Client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    expiry_date: connection.tokenExpiry?.getTime(),
  });

  const now = Date.now();
  const expiryBuffer = 5 * 60 * 1000;
  const isExpired = connection.tokenExpiry && connection.tokenExpiry.getTime() < now + expiryBuffer;

  if (isExpired && connection.refreshToken) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      await db.googleDriveConnection.update({
        where: { userId },
        data: {
          accessToken: credentials.access_token!,
          tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        },
      });

      oauth2Client.setCredentials(credentials);
    } catch (error) {
      console.error("Failed to refresh Google Drive token:", error);
      await db.googleDriveConnection.update({
        where: { userId },
        data: { enabled: false },
      });
      throw new Error("Google Drive token refresh failed. Please reconnect.");
    }
  }

  return oauth2Client;
}

/**
 * Uploads an audio/video buffer to the user's Google Drive.
 * Makes the file viewable by anyone with the link temporarily so AssemblyAI can access it.
 */
export async function uploadToGoogleDrive(
  userId: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<{ fileId: string; publicUrl: string }> {
  const authClient = await getAuthenticatedDriveClient(userId);
  const drive = google.drive({ version: "v3", auth: authClient });

  // Upload the file
  const media = {
    mimeType,
    body: Readable.from(buffer), // Convert buffer to stream
  };

  const fileMetadata = {
    name: fileName,
    // Note: We are not specifying a parent folder here, so it uploads to the root directory
    // or a specific app folder if we wanted. Since we use drive.file scope, the app only
    // sees files it created.
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id, webViewLink, webContentLink",
  });

  const fileId = response.data.id!;

  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  const publicUrl = response.data.webContentLink!;

  return { fileId, publicUrl };
}

/**
 * Creates a resumable upload session for direct client-to-Google-Drive uploads.
 * Returns the upload URI that the client can PUT the file to.
 */
export async function getResumableUploadUrl(
  userId: string,
  fileName: string,
  mimeType: string,
  fileSize: number
): Promise<{ uploadUrl: string; fileId: string }> {
  const authClient = await getAuthenticatedDriveClient(userId);
  
  // We have to use fetch because googleapis doesn't natively expose just creating the resumable session easily
  const token = await authClient.getAccessToken();
  
  const metadata = {
    name: fileName,
  };

  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token.token}`,
      "X-Upload-Content-Type": mimeType,
      "X-Upload-Content-Length": fileSize.toString(),
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create resumable upload session: ${error}`);
  }

  const uploadUrl = response.headers.get("Location");
  if (!uploadUrl) {
    throw new Error("No upload URL returned from Google Drive");
  }

  // The file ID isn't returned until the upload is complete for resumable uploads.
  // The client will complete the upload and we'll need to fetch the file details later,
  // or the client can return the response body (which contains the file ID) to the server.
  return { uploadUrl, fileId: "" };
}

export async function makeFilePublic(userId: string, fileId: string): Promise<string> {
  const authClient = await getAuthenticatedDriveClient(userId);
  const drive = google.drive({ version: "v3", auth: authClient });

  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  const file = await drive.files.get({
    fileId,
    fields: "webContentLink",
  });

  return file.data.webContentLink!;
}

// Helper to convert Buffer to Readable Stream for googleapis
import { Readable } from "stream";
