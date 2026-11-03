/**
 * Recall.ai Meeting Bot API client.
 * Handles bot creation, status polling, and transcript/recording retrieval.
 * 
 * Docs: https://docs.recall.ai
 */

import crypto from "crypto";

const RECALL_API_KEY = process.env.RECALL_API_KEY || "";
const RECALL_API_BASE = process.env.RECALL_API_BASE_URL || "https://us-west-2.recall.ai/api/v1";
const RECALL_WEBHOOK_SECRET = process.env.RECALL_WEBHOOK_SECRET || "";

interface RecallBotOptions {
  meetingUrl: string;
  botName?: string;
  joinAt?: Date;
  /** Use our own transcription (AssemblyAI) instead of Recall's */
  transcriptionEnabled?: boolean;
  /** Recording mode: "speaker_view" | "gallery_view" | "audio_only" */
  recordingMode?: "speaker_view" | "gallery_view" | "audio_only";
}

interface RecallBot {
  id: string;
  meeting_url: string;
  status: {
    code: string;
    message: string;
    created_at: string;
  };
  bot_name: string;
  recording?: {
    id: string;
  };
}

interface RecallRecording {
  id: string;
  media: {
    url: string;
    content_type: string;
  };
  duration: number;
}

interface RecallTranscriptEntry {
  speaker: string;
  words: Array<{
    text: string;
    start_time: number;
    end_time: number;
  }>;
}

/**
 * Make an authenticated request to the Recall.ai API.
 */
async function recallFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  if (!RECALL_API_KEY) {
    throw new Error("RECALL_API_KEY is not configured. Set it in your environment variables.");
  }

  const url = `${RECALL_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${RECALL_API_KEY}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Recall.ai API error (${response.status}): ${errorBody}`
    );
  }

  return response;
}

/**
 * Create a bot and send it to join a meeting.
 */
export async function createBot(options: RecallBotOptions): Promise<RecallBot> {
  const body: Record<string, unknown> = {
    meeting_url: options.meetingUrl,
    bot_name: options.botName || "Last Minutes Notetaker",
    recording_mode: options.recordingMode || "audio_only",
  };

  // Schedule bot for a future time
  if (options.joinAt) {
    body.join_at = options.joinAt.toISOString();
  }

  // Disable Recall's transcription if we're using our own (AssemblyAI)
  if (options.transcriptionEnabled === false) {
    body.transcription_options = { provider: "none" };
  }

  const response = await recallFetch("/bot/", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return response.json();
}

/**
 * Get the current status of a bot.
 */
export async function getBotStatus(botId: string): Promise<RecallBot> {
  const response = await recallFetch(`/bot/${botId}/`);
  return response.json();
}

/**
 * Cancel a scheduled bot or stop a recording bot.
 */
export async function deleteBot(botId: string): Promise<void> {
  await recallFetch(`/bot/${botId}/`, { method: "DELETE" });
}

/**
 * Tell a bot to leave the meeting.
 */
export async function leaveMeeting(botId: string): Promise<void> {
  await recallFetch(`/bot/${botId}/leave_call/`, { method: "POST" });
}

/**
 * Get the recording for a bot (available after meeting ends).
 */
export async function getRecording(botId: string): Promise<RecallRecording | null> {
  try {
    const response = await recallFetch(`/bot/${botId}/recording/`);
    return response.json();
  } catch {
    return null;
  }
}

/**
 * Get the transcript for a bot (if Recall transcription was enabled).
 */
export async function getTranscript(
  botId: string
): Promise<RecallTranscriptEntry[]> {
  try {
    const response = await recallFetch(`/bot/${botId}/transcript/`);
    return response.json();
  } catch {
    return [];
  }
}

/**
 * Get the download URL for the recording audio.
 * Returns a presigned URL for downloading the raw audio file.
 */
export async function getRecordingUrl(botId: string): Promise<string | null> {
  const recording = await getRecording(botId);
  return recording?.media?.url ?? null;
}

// ============= Webhook Verification =============

/**
 * Verify the authenticity of a Recall.ai webhook request.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (!RECALL_WEBHOOK_SECRET) {
    console.warn("RECALL_WEBHOOK_SECRET not set. Skipping webhook verification.");
    return true; // Allow in dev without secret
  }

  const expectedSignature = crypto
    .createHmac("sha256", RECALL_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// ============= Bot Status Types =============

/** Recall.ai bot status codes mapped to our internal status */
export function mapBotStatusToInternal(
  recallStatus: string
): "idle" | "scheduled" | "joining" | "recording" | "processing" | "completed" | "failed" {
  switch (recallStatus) {
    case "ready":
    case "waiting_room":
      return "joining";
    case "joining_call":
      return "joining";
    case "in_call_not_recording":
      return "joining";
    case "in_call_recording":
      return "recording";
    case "call_ended":
    case "recording_done":
      return "processing";
    case "done":
      return "completed";
    case "fatal":
    case "analysis_failed":
      return "failed";
    default:
      return "idle";
  }
}

/**
 * Check if Recall.ai is configured and available.
 */
export function isRecallConfigured(): boolean {
  return !!RECALL_API_KEY;
}
