/**
 * Meeting recording processor.
 * Handles the pipeline: recording → AssemblyAI → Transcript creation.
 * Called after a Recall.ai bot finishes recording a meeting.
 */

import { db } from "./db";
import { submitTranscription, waitForTranscription } from "./assemblyai";
import {
  autoFormatTranscript,
  normalizeSpeakerLabel,
  isMeetingTranscript,
} from "./format-transcript";

interface ProcessMeetingOptions {
  meetingId: string;
  recordingUrl: string;
  botId?: string;
}

/**
 * Process a completed meeting recording.
 * Downloads the recording, submits to AssemblyAI, creates a Transcript.
 */
export async function processMeetingRecording({
  meetingId,
  recordingUrl,
  botId,
}: ProcessMeetingOptions): Promise<string> {
  // Get the meeting from DB
  const meeting = await db.meetingSchedule.findUnique({
    where: { id: meetingId },
    include: { user: true },
  });

  if (!meeting) {
    throw new Error(`Meeting ${meetingId} not found`);
  }

  // Update status to processing
  await db.meetingSchedule.update({
    where: { id: meetingId },
    data: {
      botStatus: "processing",
      recordingUrl,
    },
  });

  try {
    // Submit to AssemblyAI for transcription with speaker diarization
    const job = await submitTranscription({
      audioUrl: recordingUrl,
      speakerLabels: true,
      languageDetection: true,
    });

    // Wait for transcription to complete (up to 10 minutes for longer meetings)
    const result = await waitForTranscription(job.id, 600_000);

    if (!result || !result.completed) {
      throw new Error("Transcription did not complete in time");
    }

    // Normalize speaker labels
    const speakers = (result.speakers ?? []).map((s: string) =>
      normalizeSpeakerLabel(s)
    );
    const hasSpeakers = isMeetingTranscript(speakers);

    // Format the text as a meeting conversation
    const formattedText =
      hasSpeakers && result.segments
        ? autoFormatTranscript(result.segments, speakers)
        : result.text ?? "";

    // Calculate duration
    const duration = result.duration
      ? Math.round(result.duration)
      : Math.round(
          (meeting.endTime.getTime() - meeting.startTime.getTime()) / 1000
        );

    // Create the transcript record
    const transcript = await db.transcript.create({
      data: {
        userId: meeting.userId,
        title: `Meeting — ${meeting.title}`,
        originalText: formattedText,
        sourceLanguage: result.language || "en",
        fileType: "meeting",
        duration,
        wordCount: result.wordCount || formattedText.split(/\s+/).filter(Boolean).length,
        segments: result.segments ?? undefined,
        speakers: hasSpeakers ? speakers : [],
        fileUrl: recordingUrl,
      },
    });

    // Update meeting with completed status and transcript link
    await db.meetingSchedule.update({
      where: { id: meetingId },
      data: {
        botStatus: "completed",
        transcriptId: transcript.id,
      },
    });

    console.log(
      `[Meeting Processor] Meeting "${meeting.title}" processed. Transcript ID: ${transcript.id}`
    );

    return transcript.id;
  } catch (error) {
    console.error(`[Meeting Processor] Failed to process meeting ${meetingId}:`, error);

    // Update meeting with failed status
    await db.meetingSchedule.update({
      where: { id: meetingId },
      data: {
        botStatus: "failed",
        botError:
          error instanceof Error ? error.message : "Unknown processing error",
      },
    });

    throw error;
  }
}
