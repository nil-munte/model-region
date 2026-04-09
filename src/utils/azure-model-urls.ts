/**
 * Generate deep-link documentation URLs for Azure Foundry models.
 * Maps model names to their specific documentation section anchors.
 */

const AZURE_OPENAI_BASE = "https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure?pivots=azure-openai";
const AZURE_OTHER_BASE = "https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure?pivots=azure-direct-others";
const AZURE_PARTNER_BASE = "https://learn.microsoft.com/en-us/azure/foundry-classic/how-to/deploy-models-serverless-availability";

/**
 * Model family to anchor ID mapping for Azure OpenAI models.
 */
const OPENAI_ANCHORS: Record<string, string> = {
  "gpt-5.4": "gpt-54",
  "gpt-5.3": "gpt-53",
  "gpt-5.2": "gpt-52",
  "gpt-5.1": "gpt-51",
  "gpt-5": "gpt-5",
  "gpt-4.1": "gpt-41-series",
  "gpt-4o": "gpt-4o-and-gpt-4-turbo",
  "gpt-4": "gpt-4o-and-gpt-4-turbo",
  "o1": "o-series-models",
  "o3": "o-series-models",
  "o4": "o-series-models",
  "dall-e": "image-generation-models",
  "sora": "video-generation-models",
  "whisper": "audio-models",
  "tts": "audio-models",
  "text-embedding": "embeddings",
};

/**
 * Model family to anchor ID mapping for other Azure models.
 */
const OTHER_ANCHORS: Record<string, string> = {
  "cohere": "cohere-models-sold-directly-by-azure",
  "deepseek": "deepseek-models-sold-directly-by-azure",
  "llama": "meta-models-sold-directly-by-azure",
  "meta-llama": "meta-models-sold-directly-by-azure",
  "mistral": "mistral-models-sold-directly-by-azure",
  "ministral": "mistral-models-sold-directly-by-azure",
  "mixtral": "mistral-models-sold-directly-by-azure",
  "codestral": "mistral-models-sold-directly-by-azure",
  "grok": "xai-models-sold-directly-by-azure",
  "kimi": "moonshot-ai-models-sold-directly-by-azure",
  "phi": "microsoft-models-sold-directly-by-azure",
  "mai": "microsoft-models-sold-directly-by-azure",
  "flux": "black-forest-labs-models-sold-directly-by-azure",
  "embed-v": "cohere-models-sold-directly-by-azure",
};

/**
 * Extract model family from a full model name (e.g., "gpt-5.4-mini, 2026-03-17" → "gpt-5.4").
 */
function extractModelFamily(modelName: string): string {
  const lower = modelName.toLowerCase();
  
  // Handle versioned models (e.g., "gpt-5.4-mini" → "gpt-5.4")
  const versionMatch = lower.match(/^(gpt-\d+\.\d+)/);
  if (versionMatch && versionMatch[1]) return versionMatch[1];
  
  // Handle o-series models
  if (lower.startsWith("o1") || lower.startsWith("o3") || lower.startsWith("o4")) {
    const oMatch = lower.match(/^o\d+/);
    if (oMatch) return oMatch[0];
  }
  
  // Handle other families by prefix
  const prefixes = [
    "dall-e", "sora", "whisper", "tts", "text-embedding",
    "cohere", "deepseek", "llama", "meta-llama", "mistral", "ministral", 
    "mixtral", "codestral", "grok", "kimi", "phi", "mai", "flux", "embed-v"
  ];
  
  for (const prefix of prefixes) {
    if (lower.startsWith(prefix)) return prefix;
  }
  
  return "";
}

/**
 * Generate a documentation URL for an Azure model.
 * Returns the base URL with an anchor to the model's family section if available.
 */
export function getAzureModelUrl(modelName: string, source: string): string {
  const family = extractModelFamily(modelName);
  
  // Check if it's an OpenAI model
  const openaiAnchor = OPENAI_ANCHORS[family];
  if (openaiAnchor) {
    return `${AZURE_OPENAI_BASE}#${openaiAnchor}`;
  }
  
  // Check if it's another Azure direct model
  const otherAnchor = OTHER_ANCHORS[family];
  if (otherAnchor) {
    return `${AZURE_OTHER_BASE}#${otherAnchor}`;
  }
  
  // Partner/community models - no deep links available
  if (source === "Foundry models from partners/community") {
    return AZURE_PARTNER_BASE;
  }
  
  // Default fallback based on source
  if (source === "Foundry models from Azure") {
    // Check if it looks like an OpenAI model
    if (modelName.match(/^(gpt|o\d|text-embedding|dall-e|whisper|tts|sora)/i)) {
      return AZURE_OPENAI_BASE;
    }
    return AZURE_OTHER_BASE;
  }
  
  // Final fallback
  return AZURE_OPENAI_BASE;
}
