/**
 * Generate documentation URLs for OpenAI models.
 * Maps model names to their specific documentation pages.
 */

const OPENAI_MODEL_URL_MAP: Record<string, string> = {
  'gpt-5.4': 'https://developers.openai.com/api/docs/models/gpt-5.4',
  'gpt-5.4-mini': 'https://developers.openai.com/api/docs/models/gpt-5.4-mini',
  'gpt-5.4-nano': 'https://developers.openai.com/api/docs/models/gpt-5.4-nano',
  'gpt-image-1.5': 'https://developers.openai.com/api/docs/models/gpt-image-1.5',
  'gpt-realtime-1.5': 'https://developers.openai.com/api/docs/models/gpt-realtime-1.5',
  'gpt-4o-mini-tts': 'https://developers.openai.com/api/docs/models/gpt-4o-mini-tts',
  'gpt-4o-transcribe': 'https://developers.openai.com/api/docs/models/gpt-4o-transcribe',
};

const OPENAI_MODELS_FALLBACK = 'https://developers.openai.com/api/docs/models';

/**
 * Get the documentation URL for an OpenAI model.
 * Returns a specific model page if available, otherwise the general models page.
 */
export function getOpenAIModelUrl(modelName: string): string {
  const normalized = modelName.toLowerCase().trim();
  
  // Direct match
  if (OPENAI_MODEL_URL_MAP[normalized]) {
    return OPENAI_MODEL_URL_MAP[normalized];
  }
  
  // Try to extract base model name (e.g., "gpt-5.4" from "gpt-5.4-turbo")
  for (const [key, url] of Object.entries(OPENAI_MODEL_URL_MAP)) {
    if (normalized.startsWith(key)) {
      return url;
    }
  }
  
  // Fallback to general models page
  return OPENAI_MODELS_FALLBACK;
}
