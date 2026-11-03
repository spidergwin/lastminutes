import { Transcript, Summary } from "@prisma/client";

export function exportAsJson(transcript: Transcript, summaries?: Summary[]): string {
  const exportData = {
    metadata: {
      title: transcript.title,
      date: transcript.createdAt,
      duration: transcript.duration,
      wordCount: transcript.wordCount,
      language: transcript.sourceLanguage,
    },
    originalText: transcript.originalText,
    translatedText: transcript.translatedText,
    targetLanguage: transcript.targetLanguage,
    segments: (transcript as any).segments || [],
    speakers: (transcript as any).speakers || [],
    summaries: summaries?.map(s => ({
      type: s.type,
      content: s.metadata || s.content
    })) || []
  };

  return JSON.stringify(exportData, null, 2);
}
