/**
 * Generate deep-link documentation URLs for Google Vertex AI models.
 * Links to individual model pages when available, falls back to data residency page.
 */

const GCP_MODELS_BASE = "https://cloud.google.com/vertex-ai/generative-ai/docs/models";
const GCP_PARTNER_MODELS_BASE = "https://cloud.google.com/vertex-ai/generative-ai/docs/partner-models";
const GCP_MAAS_BASE = "https://cloud.google.com/vertex-ai/generative-ai/docs/maas";
const GCP_DATA_RESIDENCY = "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/data-residency";

/**
 * Extract version from model name for URL generation.
 * Examples: "Gemini 2.5 Flash" → "2-5-flash", "Gemini 3.1 Pro" → "3-1-pro"
 */
function extractGeminiVersion(modelName: string): string | null {
  const lower = modelName.toLowerCase();
  
  // Match patterns like "2.5 flash", "3.1 pro", "2.0 flash-lite"
  const match = lower.match(/(\d+)[.\s-]+(\d+)\s+(flash|pro|flash-lite|flash-image)/);
  if (match && match[1] && match[2] && match[3]) {
    const major = match[1];
    const minor = match[2];
    const variant = match[3].replace('-', '-');
    return `${major}-${minor}-${variant}`;
  }
  
  return null;
}

/**
 * Generate model-specific URL based on model name and source category.
 */
export function getGCPModelUrl(
  modelName: string,
  regions?: Array<{ region: string; available: boolean }>
): string {
  const lower = modelName.toLowerCase();
  
  // Google Cloud Models - Gemini family
  if (lower.includes('gemini')) {
    const version = extractGeminiVersion(modelName);
    if (version) {
      return `${GCP_MODELS_BASE}/gemini/${version}`;
    }
    // Fallback: just use "gemini" for embedding or other variants
    if (lower.includes('embedding')) {
      return `${GCP_MODELS_BASE}/gemini/embedding-2`;
    }
  }
  
  // Google Cloud Models - Imagen family
  if (lower.includes('imagen')) {
    // Extract version: "Imagen 2" → "imagegeneration@005", "Imagen 4" → "4-0-generate"
    if (lower.includes('imagen 2')) {
      return `${GCP_MODELS_BASE}/imagen/3-0-generate`; // Imagen 2 is actually version 3
    }
    if (lower.includes('imagen 3')) {
      return `${GCP_MODELS_BASE}/imagen/3-0-generate`;
    }
    if (lower.includes('imagen 4')) {
      return `${GCP_MODELS_BASE}/imagen/4-0-generate`;
    }
  }
  
  // Google Cloud Models - Veo family
  if (lower.includes('veo')) {
    if (lower.includes('veo 2')) {
      return `${GCP_MODELS_BASE}/veo/2-0-generate`;
    }
    if (lower.includes('veo 3.1')) {
      return `${GCP_MODELS_BASE}/veo/3-1-generate`;
    }
    if (lower.includes('veo 3')) {
      return `${GCP_MODELS_BASE}/veo/3-0-generate`;
    }
  }
  
  // Google Cloud Models - Lyria family  
  if (lower.includes('lyria')) {
    if (lower.includes('lyria 2')) {
      return `${GCP_MODELS_BASE}/lyria/lyria-002`;
    }
    if (lower.includes('lyria 3')) {
      return `${GCP_MODELS_BASE}/lyria/lyria-3`;
    }
  }
  
  // Google Cloud Models - Speech (Chirp)
  if (lower.includes('chirp')) {
    return `${GCP_MODELS_BASE}#speech-models`;
  }
  
  // Google Cloud Models - Embeddings
  if (lower.includes('embedding') || lower.includes('embeddings')) {
    if (lower.includes('text-embedding')) {
      return `${GCP_MODELS_BASE}#text-embeddings`;
    }
    if (lower.includes('multimodal')) {
      return `${GCP_MODELS_BASE}#multimodal-embeddings`;
    }
  }
  
  // Partner Models - Anthropic Claude
  if (lower.includes('claude')) {
    return `${GCP_PARTNER_MODELS_BASE}/claude`;
  }
  
  // Partner Models - Mistral
  if (lower.includes('mistral') || lower.includes('codestral')) {
    return `${GCP_PARTNER_MODELS_BASE}/mistral`;
  }
  
  // Partner Models - Llama
  if (lower.includes('llama')) {
    return `${GCP_PARTNER_MODELS_BASE}/llama`;
  }
  
  // Open Models (MaaS) - DeepSeek
  if (lower.includes('deepseek')) {
    return `${GCP_MAAS_BASE}/deepseek`;
  }
  
  // Open Models (MaaS) - Qwen
  if (lower.includes('qwen')) {
    return `${GCP_MAAS_BASE}/qwen`;
  }
  
  // Open Models (MaaS) - GLM
  if (lower.includes('glm')) {
    return `${GCP_MAAS_BASE}/zaiorg`;
  }
  
  // Open Models (MaaS) - Kimi
  if (lower.includes('kimi')) {
    return `${GCP_MAAS_BASE}/kimi`;
  }
  
  // Open Models (MaaS) - MiniMax
  if (lower.includes('minimax')) {
    return `${GCP_MAAS_BASE}/minimax`;
  }
  
  // Open Models (MaaS) - OpenAI gpt-oss
  if (lower.includes('gpt-oss')) {
    return `${GCP_MAAS_BASE}/openai`;
  }
  
  // Open Models (MaaS) - Multilingual E5
  if (lower.includes('multilingual e5')) {
    return `${GCP_MAAS_BASE}/e5`;
  }
  
  // Fallback to data residency page with region anchor
  if (regions && regions.length > 0) {
    const firstAvailable = regions.find(r => r.available);
    if (firstAvailable) {
      const anchor = getRegionSectionAnchor(firstAvailable.region);
      if (anchor) {
        return `${GCP_DATA_RESIDENCY}#${anchor}`;
      }
    }
  }
  
  // Final fallback
  return GCP_DATA_RESIDENCY;
}

/**
 * Map region codes to data residency page section anchors.
 */
function getRegionSectionAnchor(regionCode: string): string {
  if (regionCode === "us-multi-region" || regionCode === "eu-multi-region") {
    return "multi-region";
  }
  if (regionCode === "southamerica-east1" || regionCode === "northamerica-northeast1") {
    return "americas";
  }
  if (regionCode.startsWith("europe-")) {
    return "europe_1";
  }
  if (regionCode.startsWith("asia-") || regionCode.startsWith("australia-")) {
    return "asia-pacific";
  }
  return "";
}
