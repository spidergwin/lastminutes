import { generateCompletion } from "@/lib/ai";
import { getPromptForType } from "./prompts";
import { SummaryType } from "./schemas";

export async function generateSummary(
  transcriptText: string,
  type: SummaryType,
  customPrompt?: string
): Promise<string> {
  const systemPrompt = getPromptForType(type, customPrompt);
  
  // Basic chunking if transcript is too long (simplified for now, ideally use tiktoken)
  // GPT-4o-mini supports 128k context, so we rarely need to chunk unless it's a massive multi-hour meeting
  const userPrompt = `Here is the transcript:\n\n${transcriptText}`;

  const completion = await generateCompletion({
    systemPrompt,
    userPrompt,
    // We enforce JSON output for most of our standard templates via the prompt,
    // but we could also use OpenAI's response_format: { type: "json_object" } if desired.
    temperature: 0.2, // Low temperature for factual extraction
  });

  return completion;
}
