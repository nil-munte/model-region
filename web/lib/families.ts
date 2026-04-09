/**
 * Model family classification derived from model names.
 *
 * Works for Azure, AWS, Azure Databricks, and Google Vertex AI naming conventions:
 *   Azure:            "gpt-5.4-mini, 2026-03-17"  → "OpenAI"
 *   AWS:              "Anthropic - Claude 3.5 Sonnet" → "Anthropic"
 *   Azure Databricks: "databricks-claude-sonnet-4" → "Anthropic"
 *   GCP:              "Gemini 2.5 Flash" → "Google"
 */

/** Ordered list of (pattern, family) rules checked top-to-bottom. */
const FAMILY_RULES: [RegExp, string][] = [
  // ---------- AWS-style "Provider - Model" prefix ----------
  [/^AI21 Labs\s*-/i, "AI21 Labs"],
  [/^Amazon\s*-/i, "Amazon"],
  [/^Anthropic\s*-/i, "Anthropic"],
  [/^Cohere\s*-/i, "Cohere"],
  [/^DeepSeek\s*-/i, "DeepSeek"],
  [/^Google\s*-/i, "Google"],
  [/^Luma AI\s*-/i, "Luma AI"],
  [/^Meta\s*-/i, "Meta"],
  [/^MiniMax\s*-/i, "MiniMax"],
  [/^Mistral AI\s*-/i, "Mistral AI"],
  [/^Moonshot AI\s*-/i, "Moonshot AI"],
  [/^NVIDIA\s*-/i, "NVIDIA"],
  [/^OpenAI\s*-/i, "OpenAI"],
  [/^Qwen\s*-/i, "Qwen"],
  [/^Stability AI\s*-/i, "Stability AI"],
  [/^TwelveLabs\s*-/i, "TwelveLabs"],
  [/^Writer\s*-/i, "Writer"],
  [/^Z\.AI\s*-/i, "Z.AI"],

  // ---------- Google Vertex AI models ----------
  [/^Gemini /i, "Google"],
  [/^Tuning for Gemini/i, "Google"],
  [/^Imagen /i, "Google"],
  [/^Imagen [0-9]/i, "Google"],   // Imagen 2, Imagen 3, etc.
  [/^Chirp /i, "Google"],
  [/^Gemini Embedding/i, "Google"],
  [/^Embeddings for /i, "Google"],
  [/^Multilingual E5/i, "Embeddings"],
  [/^Anthropic's Claude/i, "Anthropic"],
  [/^Meta's Llama/i, "Meta"],
  [/^Mistral's /i, "Mistral AI"],
  [/^Cohere's /i, "Cohere"],

  // ---------- Azure Databricks models (databricks- prefix) ----------
  [/^databricks-claude/i, "Anthropic"],
  [/^databricks-gpt/i, "OpenAI"],
  [/^databricks-meta-llama/i, "Meta"],
  [/^databricks-llama/i, "Meta"],
  [/^databricks-gemma/i, "Google"],
  [/^databricks-qwen/i, "Qwen"],
  [/^databricks-gte/i, "Embeddings"],

  // ---------- Azure OpenAI models (no prefix) ----------
  [/^gpt-/i, "OpenAI"],
  [/^o[1-9]-?/i, "OpenAI"],       // o1, o3, o3-mini, o4-mini …
  [/^codex-/i, "OpenAI"],
  [/^model-router/i, "OpenAI"],
  [/^computer-use-preview/i, "OpenAI"],
  [/^sora[,\s-]/i, "OpenAI"],     // sora, sora-turbo, etc.
  [/^dall-e/i, "OpenAI"],
  [/^whisper[,\s-]/i, "OpenAI"],
  [/^tts[,\s-]/i, "OpenAI"],
  [/^text-embedding/i, "OpenAI"],

  // ---------- Azure partner models (no prefix) ----------
  [/^claude[ -]/i, "Anthropic"],
  [/^Claude /i, "Anthropic"],
  [/^Cohere[ -]/i, "Cohere"],
  [/^embed-v-/i, "Cohere"],       // Cohere embedding models
  [/^Llama[ -]/i, "Meta"],
  [/^Meta-Llama/i, "Meta"],
  [/^Meta Llama/i, "Meta"],
  [/^Phi-/i, "Microsoft"],
  [/^MAI-/i, "Microsoft"],
  [/^Codestral/i, "Mistral AI"],
  [/^Ministral-/i, "Mistral AI"],
  [/^Mistral[ -]/i, "Mistral AI"],
  [/^mistral[ -]/i, "Mistral AI"],
  [/^Mixtral[ -]/i, "Mistral AI"],
  [/^Stable /i, "Stability AI"],
  [/^Jamba/i, "AI21 Labs"],
  [/^DeepSeek/i, "DeepSeek"],
  [/^Gemma/i, "Google"],
  [/^Google Gemma/i, "Google"],
  [/^Nova /i, "Amazon"],
  [/^Titan /i, "Amazon"],
  [/^Nemotron/i, "NVIDIA"],
  [/^Qwen/i, "Qwen"],
  [/^GLM/i, "Z.AI"],
  [/^Kimi/i, "Moonshot AI"],
  [/^MiniMax/i, "MiniMax"],
  [/^Marengo/i, "TwelveLabs"],
  [/^Pegasus/i, "TwelveLabs"],
  [/^Ray /i, "Luma AI"],
  [/^TimeGEN/i, "Nixtla"],
  [/^tsuzumi/i, "NTT DATA"],
  [/^Llama-Guard/i, "Meta"],
  [/^OpenAI GPT/i, "OpenAI"],
  [/^gpt-oss/i, "OpenAI"],
  [/^FLUX/i, "Black Forest Labs"],
  [/^grok[,\s-]/i, "xAI"],
  [/^BGE /i, "Embeddings"],
  [/^GTE /i, "Embeddings"],
];

const DEFAULT_FAMILY = "Other";

/**
 * Return the family name for a given model name string.
 */
export function getModelFamily(modelName: string): string {
  for (const [pattern, family] of FAMILY_RULES) {
    if (pattern.test(modelName)) return family;
  }
  return DEFAULT_FAMILY;
}

/** Preferred display ordering for families. Unlisted families sort alphabetically at the end. */
const FAMILY_ORDER: string[] = [
  "OpenAI",
  "Anthropic",
  "Meta",
  "Google",
  "Mistral AI",
  "Microsoft",
  "Amazon",
  "Cohere",
  "DeepSeek",
  "xAI",
  "AI21 Labs",
  "Black Forest Labs",
  "Luma AI",
  "MiniMax",
  "Moonshot AI",
  "Nixtla",
  "NTT DATA",
  "NVIDIA",
  "Qwen",
  "Stability AI",
  "TwelveLabs",
  "Writer",
  "Z.AI",
  "Embeddings",
];

/**
 * Sort family names according to a preferred display order.
 * Unlisted families are placed at the end, sorted alphabetically.
 */
export function sortFamilies(families: string[]): string[] {
  const orderMap = new Map(FAMILY_ORDER.map((f, i) => [f, i]));

  return [...families].sort((a, b) => {
    const ia = orderMap.get(a) ?? Infinity;
    const ib = orderMap.get(b) ?? Infinity;
    if (ia !== ib) return ia - ib;
    return a.localeCompare(b);
  });
}
