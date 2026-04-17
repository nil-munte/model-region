/**
 * Generate documentation URLs for Claude models.
 * Maps model names to their specific documentation sections.
 */

const CLAUDE_MODEL_URL_MAP: Record<string, string> = {
  'claude-opus-4-7': 'https://platform.claude.com/docs/en/about-claude/models/overview#latest-models-comparison',
  'claude-sonnet-4-6': 'https://platform.claude.com/docs/en/about-claude/models/overview#latest-models-comparison',
  'claude-haiku-4-5': 'https://platform.claude.com/docs/en/about-claude/models/overview#latest-models-comparison',
  'claude-haiku-4-5-20251001': 'https://platform.claude.com/docs/en/about-claude/models/overview#latest-models-comparison',
  'claude-opus-4-6': 'https://platform.claude.com/docs/en/about-claude/models/overview#legacy-models',
  'claude-sonnet-4-5': 'https://platform.claude.com/docs/en/about-claude/models/overview#legacy-models',
};

const CLAUDE_MODELS_FALLBACK = 'https://platform.claude.com/docs/en/about-claude/models/overview';

/**
 * Get the documentation URL for a Claude model.
 * Returns a specific section anchor if available, otherwise the general models overview page.
 */
export function getClaudeModelUrl(modelName: string): string {
  const normalized = modelName.toLowerCase().trim();
  
  // Direct match
  if (CLAUDE_MODEL_URL_MAP[normalized]) {
    return CLAUDE_MODEL_URL_MAP[normalized];
  }
  
  // Try to match base model name (e.g., "claude-opus-4-7" from "claude-opus-4-7-20250101")
  for (const [key, url] of Object.entries(CLAUDE_MODEL_URL_MAP)) {
    if (normalized.startsWith(key)) {
      return url;
    }
  }
  
  // Fallback to general models page
  return CLAUDE_MODELS_FALLBACK;
}
