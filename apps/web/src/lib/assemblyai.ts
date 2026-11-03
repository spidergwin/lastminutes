/**
 * AssemblyAI client configuration for batch transcription.
 * Used for processing uploaded audio/video files where real-time latency isn't needed.
 * Provides speaker diarization, language detection, and rich metadata.
 */

import { AssemblyAI, TranscriptStatus } from "assemblyai";

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;

if (!ASSEMBLYAI_API_KEY && process.env.NODE_ENV === "production") {
  console.warn("⚠️ ASSEMBLYAI_API_KEY is not set. File transcription will not work.");
}

export const assemblyClient = ASSEMBLYAI_API_KEY
  ? new AssemblyAI({ apiKey: ASSEMBLYAI_API_KEY })
  : null;

/**
 * Submit an audio file for transcription.
 * Returns a transcript ID that can be polled for completion.
 */
export async function submitTranscription(options: {
  audioUrl?: string;
  audioData?: Buffer;
  languageCode?: string;
  speakerLabels?: boolean;
  languageDetection?: boolean;
}): Promise<{ id: string; status: string }> {
  if (!assemblyClient) {
    throw new Error("AssemblyAI client not configured. Set ASSEMBLYAI_API_KEY.");
  }

  const isLanguageDetection = options.languageDetection ?? !options.languageCode;

  const config: Record<string, unknown> = {
    speaker_labels: options.speakerLabels ?? true,
    language_detection: isLanguageDetection,
    punctuate: true,
    format_text: true,
  };

  if (isLanguageDetection) {
    config.speech_models = ["universal-3-pro", "universal-2"];
  } else if (options.languageCode) {
    config.language_code = options.languageCode;
    config.speech_models = ["universal-3-pro"]; // Use best available model
  }

  if (options.audioUrl) {
    config.audio_url = options.audioUrl;
  } else if (options.audioData) {
    // Upload the audio data first
    const uploadUrl = await assemblyClient.files.upload(options.audioData);
    config.audio_url = uploadUrl;
  } else {
    throw new Error("Either audioUrl or audioData must be provided.");
  }

  const transcript = await assemblyClient.transcripts.create(config as Parameters<typeof assemblyClient.transcripts.create>[0]);

  return {
    id: transcript.id,
    status: transcript.status,
  };
}

/**
 * Poll for transcription completion.
 * Returns the full transcript with speaker labels and word-level timestamps.
 */
export async function getTranscriptionResult(transcriptId: string) {
  if (!assemblyClient) {
    throw new Error("AssemblyAI client not configured. Set ASSEMBLYAI_API_KEY.");
  }

  const transcript = await assemblyClient.transcripts.get(transcriptId);

  if (transcript.status === "error") {
    throw new Error(`Transcription failed: ${transcript.error}`);
  }

  if (transcript.status !== "completed") {
    return {
      id: transcript.id,
      status: transcript.status as string,
      completed: false,
    };
  }

  // Build segments from utterances (speaker-labeled chunks)
  const segments = transcript.utterances?.map((utterance) => ({
    speaker: utterance.speaker,
    text: utterance.text,
    start: utterance.start,
    end: utterance.end,
    confidence: utterance.confidence,
    words: utterance.words?.map((w) => ({
      text: w.text,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
      speaker: w.speaker,
    })),
  })) ?? [];

  // Extract unique speakers
  const speakers = [...new Set(segments.map((s) => s.speaker))].filter(Boolean) as string[];

  return {
    id: transcript.id,
    status: "completed" as const,
    completed: true,
    text: transcript.text ?? "",
    segments,
    speakers,
    language: transcript.language_code,
    audioUrl: transcript.audio_url,
    duration: transcript.audio_duration,
    confidence: transcript.confidence,
    wordCount: transcript.words?.length ?? 0,
  };
}

/**
 * Wait for a transcription to complete (blocking).
 * Polls every 3 seconds until done or timeout.
 */
export async function waitForTranscription(
  transcriptId: string,
  timeoutMs: number = 300_000 // 5 minutes
) {
  if (!assemblyClient) {
    throw new Error("AssemblyAI client not configured. Set ASSEMBLYAI_API_KEY.");
  }

  const transcript = await assemblyClient.transcripts.waitUntilReady(transcriptId, {
    pollingInterval: 3000,
    pollingTimeout: timeoutMs,
  });

  if (transcript.status === "error") {
    throw new Error(`Transcription failed: ${transcript.error}`);
  }

  return getTranscriptionResult(transcriptId);
}
