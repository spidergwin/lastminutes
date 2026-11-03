/**
 * Deepgram client configuration and helpers.
 * Used for real-time streaming transcription via WebSocket.
 *
 * Architecture note: On Vercel, we can't maintain persistent WebSockets
 * in serverless functions. Instead, we generate temporary API keys that
 * the browser SDK uses to connect directly to Deepgram's servers.
 * This is actually more scalable — no audio proxying through our server.
 */

import { DeepgramClient } from "@deepgram/sdk";

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

if (!DEEPGRAM_API_KEY && process.env.NODE_ENV === "production") {
  console.warn("⚠️ DEEPGRAM_API_KEY is not set. Real-time transcription will not work.");
}

/**
 * Server-side Deepgram client (for generating temporary keys, etc.)
 */
export const deepgramClient = DEEPGRAM_API_KEY
  ? new DeepgramClient({ apiKey: DEEPGRAM_API_KEY })
  : null;

/**
 * Default transcription options for streaming sessions.
 * These are optimized for real-time meeting/dictation use cases.
 */
export const DEFAULT_STREAM_OPTIONS = {
  model: "nova-3",
  language: "en",
  smart_format: true,
  punctuate: true,
  diarize: true,
  filler_words: false,
  interim_results: true,
  utterance_end_ms: 1000,
  vad_events: true,
  encoding: "linear16" as const,
  sample_rate: 16000,
  channels: 1,
} as const;

/**
 * Supported languages for Deepgram streaming.
 * Nigerian languages are not natively supported by Deepgram,
 * so we map them to the closest available option or use translation post-processing.
 */
export const DEEPGRAM_SUPPORTED_LANGUAGES: Record<string, string> = {
  en: "en",
  "en-US": "en-US",
  "en-GB": "en-GB",
  fr: "fr",
  es: "es",
  de: "de",
  pt: "pt",
  it: "it",
  nl: "nl",
  ja: "ja",
  ko: "ko",
  zh: "zh",
  hi: "hi",
  ar: "ar",
  ru: "ru",
  tr: "tr",
  pl: "pl",
  sv: "sv",
  da: "da",
  no: "no",
  fi: "fi",
} as const;

export function isDeepgramSupportedLanguage(code: string): boolean {
  return code in DEEPGRAM_SUPPORTED_LANGUAGES;
}

/**
 * Generate a temporary API key for client-side Deepgram usage.
 * This key is scoped and time-limited for security.
 */
export async function generateTemporaryKey(options?: {
  timeToLiveSeconds?: number;
}): Promise<{ key: string; expiresAt: Date }> {
  if (!deepgramClient) {
    throw new Error("Deepgram client not configured. Set DEEPGRAM_API_KEY.");
  }

  const ttl = options?.timeToLiveSeconds ?? 600; // 10 minutes default

  try {
    const response = await deepgramClient.manage.v1.projects.keys.create(
      process.env.DEEPGRAM_PROJECT_ID!,
      {
        comment: `Temporary streaming key - ${new Date().toISOString()}`,
        scopes: ["usage:write"],
        time_to_live_in_seconds: ttl,
      }
    );

    return {
      key: response.key!,
      expiresAt: new Date(Date.now() + ttl * 1000),
    };
  } catch (error: any) {
    throw new Error(`Failed to create temporary Deepgram key: ${error.message}`);
  }
}
