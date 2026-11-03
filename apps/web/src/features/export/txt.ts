import { Transcript, Summary } from "@prisma/client";
import { formatSummaryToText } from "../summarization/formatter";

export function exportAsTxt(transcript: Transcript, summaries?: Summary[]): string {
  let content = `${transcript.title}\n`;
  content += `${"=".repeat(transcript.title.length)}\n\n`;
  
  content += `Date: ${transcript.createdAt.toDateString()}\n`;
  content += `Duration: ${Math.round((transcript.duration || 0) / 60)} minutes\n`;
  content += `Word Count: ${transcript.wordCount || 0}\n\n`;

  if (summaries && summaries.length > 0) {
    content += `--- SUMMARIES & INSIGHTS ---\n\n`;
    summaries.forEach((s) => {
      content += formatSummaryToText(s.metadata || s.content, s.type);
      content += `\n\n${"-".repeat(20)}\n\n`;
    });
  }

  content += `--- TRANSCRIPT ---\n\n`;
  content += transcript.originalText;

  if (transcript.translatedText) {
    content += `\n\n--- TRANSLATION (${transcript.targetLanguage}) ---\n\n`;
    content += transcript.translatedText;
  }

  return content;
}

