/**
 * Smart transcript formatting utilities.
 * Converts structured speaker-diarized segments into readable text formats.
 */

export interface TranscriptSegment {
  speaker: string;
  text: string;
  start: number;  // ms
  end: number;    // ms
  confidence?: number;
  words?: Array<{
    text: string;
    start: number;
    end: number;
    confidence?: number;
    speaker?: string | null;
  }>;
}

/**
 * Color palette for speaker labels in the UI.
 * Each speaker gets a consistent, distinct color.
 */
export const SPEAKER_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  A: { bg: "bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-500/20", dot: "bg-indigo-500" },
  B: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/20", dot: "bg-emerald-500" },
  C: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/20", dot: "bg-amber-500" },
  D: { bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-300", border: "border-rose-500/20", dot: "bg-rose-500" },
  E: { bg: "bg-cyan-500/10", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-500/20", dot: "bg-cyan-500" },
  F: { bg: "bg-purple-500/10", text: "text-purple-700 dark:text-purple-300", border: "border-purple-500/20", dot: "bg-purple-500" },
};

/**
 * Get color config for a speaker, with fallback for unknown speakers.
 */
export function getSpeakerColor(speaker: string) {
  // Try to match the speaker letter (A, B, C...) or number (0, 1, 2...)
  const key = speaker.replace(/^(Speaker\s*)?/i, "").trim().toUpperCase();
  const letters = Object.keys(SPEAKER_COLORS);
  
  // If it's a number, map to a letter
  const numMatch = key.match(/^(\d+)$/);
  if (numMatch) {
    const idx = parseInt(numMatch[1], 10);
    const letter = letters[idx % letters.length];
    return SPEAKER_COLORS[letter];
  }
  
  // If it's a letter, use directly
  if (SPEAKER_COLORS[key]) {
    return SPEAKER_COLORS[key];
  }
  
  // Fallback: hash the speaker name to pick a consistent color
  const hash = speaker.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return SPEAKER_COLORS[letters[hash % letters.length]];
}

/**
 * Format milliseconds as HH:MM:SS or MM:SS timestamp.
 */
export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Normalize speaker label from various formats.
 * Deepgram uses numbers (0, 1, 2), AssemblyAI uses letters (A, B, C).
 */
export function normalizeSpeakerLabel(raw: string | number | undefined | null): string {
  if (raw === null || raw === undefined) return "Speaker";
  
  if (typeof raw === "number") {
    // Deepgram style: 0, 1, 2 → Speaker A, Speaker B, Speaker C
    const letter = String.fromCharCode(65 + raw); // 0→A, 1→B, 2→C
    return `Speaker ${letter}`;
  }
  
  const str = String(raw).trim();
  
  // Already formatted like "Speaker A"
  if (/^Speaker\s+/i.test(str)) return str;
  
  // Just a letter or number
  if (/^[A-Z]$/i.test(str)) return `Speaker ${str.toUpperCase()}`;
  if (/^\d+$/.test(str)) {
    const letter = String.fromCharCode(65 + parseInt(str, 10));
    return `Speaker ${letter}`;
  }
  
  // Custom name — return as-is
  return str;
}

/**
 * Check if a transcript is a meeting (has multiple speakers).
 */
export function isMeetingTranscript(speakers: string[] | null | undefined): boolean {
  return !!speakers && speakers.length > 1;
}

/**
 * Format structured segments into a conversation-style text.
 * 
 * Output:
 * ```
 * Speaker A [0:00]:
 * Hello everyone, thanks for joining.
 * 
 * Speaker B [0:05]:
 * Thanks for having me.
 * ```
 */
export function formatAsConversation(
  segments: TranscriptSegment[],
  speakerNames?: Record<string, string>
): string {
  if (!segments || segments.length === 0) return "";

  const lines: string[] = [];
  let lastSpeaker: string | null = null;

  for (const segment of segments) {
    const rawLabel = normalizeSpeakerLabel(segment.speaker);
    const displayName = speakerNames?.[rawLabel] || speakerNames?.[segment.speaker] || rawLabel;
    const timestamp = formatTimestamp(segment.start);

    if (displayName !== lastSpeaker) {
      // New speaker — add header
      if (lines.length > 0) lines.push(""); // blank line between speakers
      lines.push(`${displayName} [${timestamp}]:`);
      lastSpeaker = displayName;
    }

    lines.push(segment.text.trim());
  }

  return lines.join("\n");
}

/**
 * Format structured segments into plain paragraphed text (for single-speaker/dictation).
 */
export function formatAsPlainText(segments: TranscriptSegment[]): string {
  if (!segments || segments.length === 0) return "";
  return segments.map((s) => s.text.trim()).join("\n\n");
}

/**
 * Auto-format segments based on speaker count.
 * Multi-speaker → conversation format, single-speaker → plain text.
 */
export function autoFormatTranscript(
  segments: TranscriptSegment[],
  speakers: string[],
  speakerNames?: Record<string, string>
): string {
  if (isMeetingTranscript(speakers)) {
    return formatAsConversation(segments, speakerNames);
  }
  return formatAsPlainText(segments);
}

/**
 * Compute per-speaker statistics from segments.
 */
export function computeSpeakerStats(segments: TranscriptSegment[]) {
  const stats: Record<string, { 
    utterances: number;
    words: number;
    talkTimeMs: number;
    label: string;
  }> = {};

  for (const seg of segments) {
    const label = normalizeSpeakerLabel(seg.speaker);
    if (!stats[label]) {
      stats[label] = { utterances: 0, words: 0, talkTimeMs: 0, label };
    }
    stats[label].utterances++;
    stats[label].words += seg.text.split(/\s+/).filter(Boolean).length;
    stats[label].talkTimeMs += seg.end - seg.start;
  }

  return Object.values(stats).sort((a, b) => b.talkTimeMs - a.talkTimeMs);
}
