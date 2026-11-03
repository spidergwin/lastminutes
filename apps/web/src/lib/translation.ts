import { generateCompletion } from "./ai";
import { getLanguageName } from "@/features/translation/utils";

export async function translateText(
  text: string, 
  sourceLang: string = "auto",
  targetLang: string = "en"
): Promise<string> {
  const sLang = sourceLang && sourceLang.trim() !== "" ? sourceLang : "auto";
  const tLang = targetLang && targetLang.trim() !== "" ? targetLang : "en";
  
  const sourceName = sLang === "auto" ? "its original language" : getLanguageName(sLang);
  const targetName = getLanguageName(tLang);

  const systemPrompt = `You are a professional translator. 
Translate the following text from ${sourceName} to ${targetName}.
Preserve the original formatting, tone, and punctuation as much as possible.
If the text contains specific industry jargon, translate it accurately.
Only return the translated text without any conversational filler or explanations.`;

  try {
    const result = await generateCompletion({
      systemPrompt,
      userPrompt: text,
      temperature: 0.1, // Low temperature for consistent translation
    });
    
    return result.trim();
  } catch (error) {
    console.error("Translation error:", error);
    throw new Error("Failed to translate text");
  }
}

/**
 * Translates an entire object or array recursively.
 * Useful for translating siteConfig or other structured data.
 */
export async function translateContent<T>(
  content: T,
  targetLang: string = 'en'
): Promise<T> {
  // For complex objects, we could stringify, translate, and parse back,
  // but it requires careful prompting. For now, returning as-is to avoid breaking structured data.
  // This can be expanded if needed.
  console.warn("Recursive translation not yet fully implemented for OpenAI.");
  return content;
}
