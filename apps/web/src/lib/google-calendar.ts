/**
 * Google Calendar integration.
 * Handles OAuth token management, event fetching, and meeting link extraction.
 */

import { google, calendar_v3 } from "googleapis";
import { db } from "./db";

// Google OAuth2 configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
// We will pass the redirect URI dynamically from the request
// to prevent redirect_uri_mismatch errors in different environments.

// Calendar-specific scopes (in addition to standard auth scopes)
const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/drive.file",
];

/**
 * Create an OAuth2 client for Google APIs.
 */
export function createOAuth2Client(redirectUri?: string) {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    redirectUri || (process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback` : "http://localhost:3000/api/calendar/callback")
  );
}

/**
 * Generate the OAuth authorization URL for calendar access.
 * Uses `access_type: offline` to get a refresh token.
 */
export function getCalendarAuthUrl(state: string, redirectUri: string): string {
  const oauth2Client = createOAuth2Client(redirectUri);

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // Force consent to always get refresh_token
    scope: CALENDAR_SCOPES,
    state,
  });
}

/**
 * Exchange an authorization code for access/refresh tokens.
 */
export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const oauth2Client = createOAuth2Client(redirectUri);
  const { tokens } = await oauth2Client.getToken(code);

  // Get the user's email from the token
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

/**
 * Get a configured OAuth2 client with valid credentials for a calendar connection.
 * Automatically refreshes the access token if expired.
 */
export async function getAuthenticatedClient(
  calendarConnectionId: string
): Promise<ReturnType<typeof createOAuth2Client>> {
  const connection = await db.calendarConnection.findUnique({
    where: { id: calendarConnectionId },
  });

  if (!connection) {
    throw new Error("Calendar connection not found");
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    expiry_date: connection.tokenExpiry?.getTime(),
  });

  // Check if token is expired or about to expire (within 5 minutes)
  const now = Date.now();
  const expiryBuffer = 5 * 60 * 1000; // 5 minutes
  const isExpired =
    connection.tokenExpiry && connection.tokenExpiry.getTime() < now + expiryBuffer;

  if (isExpired && connection.refreshToken) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();

      // Update stored tokens
      await db.calendarConnection.update({
        where: { id: calendarConnectionId },
        data: {
          accessToken: credentials.access_token!,
          tokenExpiry: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : null,
        },
      });

      oauth2Client.setCredentials(credentials);
    } catch (error) {
      console.error("Failed to refresh Google Calendar token:", error);
      // Mark connection as disabled if refresh fails
      await db.calendarConnection.update({
        where: { id: calendarConnectionId },
        data: { enabled: false },
      });
      throw new Error("Calendar token refresh failed. Please reconnect your calendar.");
    }
  }

  return oauth2Client;
}

// ============= Meeting Link Detection =============

/** Detected meeting platform from a URL */
export type MeetingPlatform = "zoom" | "google_meet" | "teams" | "webex" | null;

/** Regex patterns for meeting platform URLs */
const MEETING_URL_PATTERNS: Array<{ platform: MeetingPlatform; pattern: RegExp }> = [
  { platform: "zoom", pattern: /https?:\/\/[\w.-]*zoom\.us\/[jw]\/\d+/i },
  { platform: "google_meet", pattern: /https?:\/\/meet\.google\.com\/[\w-]+/i },
  { platform: "teams", pattern: /https?:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s]+/i },
  { platform: "webex", pattern: /https?:\/\/[\w.-]*webex\.com\/[\w.-]*\/j\.php/i },
];

/**
 * Detect the meeting platform from a URL.
 */
export function detectPlatform(url: string): MeetingPlatform {
  for (const { platform, pattern } of MEETING_URL_PATTERNS) {
    if (pattern.test(url)) return platform;
  }
  return null;
}

/**
 * Extract a meeting URL from text (event description, location, etc.)
 */
export function extractMeetingLink(text: string): { url: string; platform: MeetingPlatform } | null {
  for (const { platform, pattern } of MEETING_URL_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return { url: match[0], platform };
    }
  }
  return null;
}

/**
 * Extract meeting URL and platform from a Google Calendar event.
 * Checks multiple sources: conference data, location, description.
 */
export function extractMeetingFromEvent(
  event: calendar_v3.Schema$Event
): { url: string; platform: MeetingPlatform } | null {
  // 1. Check Google Meet conference data (most reliable)
  if (event.conferenceData?.entryPoints) {
    for (const entry of event.conferenceData.entryPoints) {
      if (entry.entryPointType === "video" && entry.uri) {
        const platform = detectPlatform(entry.uri);
        if (platform) return { url: entry.uri, platform };
      }
    }
  }

  // 2. Check hangoutLink (legacy Google Meet)
  if (event.hangoutLink) {
    return { url: event.hangoutLink, platform: "google_meet" };
  }

  // 3. Check location field
  if (event.location) {
    const fromLocation = extractMeetingLink(event.location);
    if (fromLocation) return fromLocation;
  }

  // 4. Check description
  if (event.description) {
    const fromDescription = extractMeetingLink(event.description);
    if (fromDescription) return fromDescription;
  }

  return null;
}

// ============= Calendar Event Fetching =============

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  meetingUrl: string | null;
  platform: MeetingPlatform;
  organizer: string | null;
  attendees: string[];
  location: string | null;
  isAllDay: boolean;
}

/**
 * Fetch upcoming calendar events for the next N days.
 */
export async function fetchUpcomingEvents(
  calendarConnectionId: string,
  daysAhead: number = 7
): Promise<CalendarEvent[]> {
  const oauth2Client = await getAuthenticatedClient(calendarConnectionId);
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const now = new Date();
  const futureDate = new Date(now);
  futureDate.setDate(futureDate.getDate() + daysAhead);

  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: futureDate.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 50,
      fields:
        "items(id,summary,description,start,end,location,attendees,organizer,conferenceData,hangoutLink),nextPageToken",
    });

    const events = response.data.items ?? [];

    return events
      .map((event): CalendarEvent | null => {
        if (!event.id || !event.start) return null;

        const startTime = event.start.dateTime
          ? new Date(event.start.dateTime)
          : event.start.date
            ? new Date(event.start.date)
            : null;

        const endTime = event.end?.dateTime
          ? new Date(event.end.dateTime)
          : event.end?.date
            ? new Date(event.end.date)
            : null;

        if (!startTime || !endTime) return null;

        const meeting = extractMeetingFromEvent(event);

        return {
          id: event.id,
          title: event.summary || "Untitled Event",
          description: event.description ?? null,
          startTime,
          endTime,
          meetingUrl: meeting?.url ?? null,
          platform: meeting?.platform ?? null,
          organizer: event.organizer?.email ?? null,
          attendees:
            event.attendees
              ?.map((a) => a.email)
              .filter((email): email is string => !!email) ?? [],
          location: event.location ?? null,
          isAllDay: !event.start.dateTime, // All-day events use date, not dateTime
        };
      })
      .filter((e): e is CalendarEvent => e !== null)
      .filter((e) => !e.isAllDay); // Filter out all-day events — they're not meetings
  } catch (error) {
    console.error("Failed to fetch calendar events:", error);
    throw new Error("Failed to fetch calendar events. Please reconnect your calendar.");
  }
}

/**
 * Sync calendar events to the MeetingSchedule table.
 * Creates new entries, updates existing, removes cancelled events.
 */
export async function syncCalendarEvents(
  userId: string,
  calendarConnectionId: string
): Promise<{ created: number; updated: number; removed: number }> {
  const events = await fetchUpcomingEvents(calendarConnectionId, 7);
  let created = 0;
  let updated = 0;

  // Get existing meetings for this connection
  const existingMeetings = await db.meetingSchedule.findMany({
    where: {
      calendarConnectionId,
      startTime: { gte: new Date() }, // Only future meetings
    },
  });

  const existingByEventId = new Map(
    existingMeetings.map((m) => [m.externalEventId, m])
  );

  // Upsert events
  for (const event of events) {
    // Only sync events that have meeting links
    if (!event.meetingUrl) continue;

    const existing = existingByEventId.get(event.id);

    if (existing) {
      // Update if changed
      if (
        existing.title !== event.title ||
        existing.startTime.getTime() !== event.startTime.getTime() ||
        existing.meetingUrl !== event.meetingUrl
      ) {
        await db.meetingSchedule.update({
          where: { id: existing.id },
          data: {
            title: event.title,
            description: event.description,
            startTime: event.startTime,
            endTime: event.endTime,
            meetingUrl: event.meetingUrl,
            platform: event.platform,
            organizer: event.organizer,
            attendees: event.attendees,
          },
        });
        updated++;
      }
      existingByEventId.delete(event.id);
    } else {
      // Create new meeting
      await db.meetingSchedule.create({
        data: {
          userId,
          calendarConnectionId,
          externalEventId: event.id,
          title: event.title,
          description: event.description,
          startTime: event.startTime,
          endTime: event.endTime,
          meetingUrl: event.meetingUrl,
          platform: event.platform,
          organizer: event.organizer,
          attendees: event.attendees,
          autoJoinEnabled: false, // User controls this
        },
      });
      created++;
    }
  }

  // Remove meetings that no longer exist in the calendar
  // (only idle ones — don't remove meetings that are already recording/completed)
  const toRemove = [...existingByEventId.values()].filter(
    (m) => m.botStatus === "idle"
  );
  const removed = toRemove.length;

  if (toRemove.length > 0) {
    await db.meetingSchedule.deleteMany({
      where: { id: { in: toRemove.map((m) => m.id) } },
    });
  }

  return { created, updated, removed };
}
