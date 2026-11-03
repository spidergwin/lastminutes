import { Transcript, Summary } from "@prisma/client";

export function formatTime(seconds: number): string {
  const date = new Date(0);
  date.setSeconds(seconds);
  date.setMilliseconds((seconds % 1) * 1000);
  const iso = date.toISOString();
  return iso.substring(11, 23).replace('.', ',');
}

export function exportAsSrt(transcript: Transcript): string {
  let srtContent = "";
  
  // We need segment data to create a proper SRT file.
  // Assuming transcript.segments exists and is an array of { start, end, text }
  const segments = (transcript as any).segments;
  
  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    // Fallback if no segments are available (e.g., from old Web Speech API)
    // We just create one big subtitle, which isn't ideal but prevents crashing.
    return `1\n00:00:00,000 --> ${formatTime(transcript.duration)}\n${transcript.originalText}\n`;
  }

  segments.forEach((segment, index) => {
    const startTime = formatTime(segment.start);
    const endTime = formatTime(segment.end);
    const text = segment.text.trim();
    
    // Add speaker label if available
    const displayText = segment.speaker ? `[Speaker ${segment.speaker}] ${text}` : text;

    srtContent += `${index + 1}\n`;
    srtContent += `${startTime} --> ${endTime}\n`;
    srtContent += `${displayText}\n\n`;
  });

  return srtContent;
}
