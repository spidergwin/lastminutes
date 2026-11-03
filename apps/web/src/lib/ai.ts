/**
 * Centralized AI provider configuration.
 *
 * Switch providers by setting the AI_PROVIDER env variable:
 *   AI_PROVIDER=gemini   → Google Gemini 2.5 Flash (free tier, 1500 req/day)
 *   AI_PROVIDER=deepseek → DeepSeek V4-Flash ($0.14/M input tokens)
 *
 * Each provider needs its own API key:
 *   GOOGLE_GENERATIVE_AI_API_KEY  → for Gemini
 *   DEEPSEEK_API_KEY              → for DeepSeek
 */

import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, type LanguageModel } from "ai";

// ---------------------------------------------------------------------------
// Provider config
// ---------------------------------------------------------------------------

export type AIProvider = "gemini" | "deepseek";

export const AI_PROVIDER: AIProvider =
  (process.env.AI_PROVIDER?.toLowerCase() as AIProvider) || "gemini";

/** Model identifiers per provider */
const MODEL_IDS: Record<AIProvider, string> = {
  gemini: "gemini-2.5-flash",
  deepseek: "deepseek-v4-flash",
};

// ---------------------------------------------------------------------------
// Provider instances (lazy — only created when actually used)
// ---------------------------------------------------------------------------

function createDeepSeekProvider() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not set. Cannot use DeepSeek provider.");
  }
  return createDeepSeek({
    apiKey,
  });
}

function createGeminiProvider() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY is not set. Cannot use Gemini provider."
    );
  }
  return createGoogleGenerativeAI({
    apiKey,
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get an AI SDK LanguageModel for the configured provider.
 * This is the single source of truth — use this everywhere.
 *
 * @param modelOverride - Optional model ID override (e.g. "deepseek-reasoner")
 */
export function getModel(modelOverride?: string): LanguageModel {
  // Use process.env directly to be reactive to environment changes
  const provider = (process.env.AI_PROVIDER?.toLowerCase() as AIProvider) || "gemini";
  const modelId = modelOverride ?? MODEL_IDS[provider] ?? MODEL_IDS["gemini"];

  if (provider === "deepseek") {
    return createDeepSeekProvider()(modelId);
  }

  // Default: Gemini
  return createGeminiProvider()(modelId);
}

/**
 * The active provider name — useful for logging/analytics.
 */
export function getProviderName(): string {
  return AI_PROVIDER;
}

/**
 * Generate a completion with structured error handling.
 * Used by translation and summarization services.
 */
export async function generateCompletion(options: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
}): Promise<string> {
  const result = await generateText({
    model: getModel(options.model),
    system: options.systemPrompt,
    prompt: options.userPrompt,
    maxOutputTokens: options.maxOutputTokens ?? 4096,
    temperature: options.temperature ?? 0.3,
  });

  const content = result.text;

  if (!content) {
    throw new Error("AI returned empty response.");
  }

  return content;
}
