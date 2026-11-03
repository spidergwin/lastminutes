import { Transcript } from "@prisma/client";

export function formatVttTime(seconds: number): string {
  const date = new Date(0);
  date.setSeconds(seconds);
  date.setMilliseconds((seconds % 1) * 1000);
  const iso = date.toISOString();
  // VTT format: 00:00:00.000
  return iso.substring(11, 23);
}

export function exportAsVtt(transcript: Transcript): string {
  let vttContent = "WEBVTT\n\n";
  
  const segments = (transcript as any).segments;
  
  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    return `WEBVTT\n\n1\n00:00:00.000 --> ${formatVttTime(transcript.duration)}\n${transcript.originalText}\n`;
  }

  segments.forEach((segment, index) => {
    const startTime = formatVttTime(segment.start);
    const endTime = formatVttTime(segment.end);
    const text = segment.text.trim();
    
    // WebVTT supports speaker tags <v Speaker Name>
    const displayText = segment.speaker ? `<v Speaker ${segment.speaker}>${text}</v>` : text;

    vttContent += `${index + 1}\n`;
    vttContent += `${startTime} --> ${endTime}\n`;
    vttContent += `${displayText}\n\n`;
  });

  return vttContent;
}
