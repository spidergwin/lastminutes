// Dictation feature utilities and helpers

export const DICTATION_CONFIG = {
  autoSave: true,
  autoSaveInterval: 10000, // 10 seconds
  debounceTranslation: 2000, // 2 seconds
  maxTranscriptLength: 50000,
};



export function segmentTextForTranslation(text: string, maxChunkSize: number = 500): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}
