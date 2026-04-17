/**
 * Generate documentation URLs for models based on provider and model name.
 *
 * Azure OpenAI models link to the Azure Foundry Models docs page.
 * Azure partner/community models link to the partner availability page.
 * AWS models link to the Bedrock supported models reference page.
 * Azure Databricks models use the URL from model data (if available).
 * Google Vertex AI models link to the data residency docs page.
 * OpenAI models link to the OpenAI developer documentation.
 * Claude models link to the Claude platform documentation.
 */

import type { ModelInfo } from "./data";

const AZURE_OPENAI_DOC =
  "https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure?pivots=azure-openai";
const AZURE_OTHER_DOC =
  "https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure?pivots=azure-direct-others";
const AZURE_PARTNER_DOC =
  "https://learn.microsoft.com/en-us/azure/foundry-classic/how-to/deploy-models-serverless-availability";

const AWS_MODELS_DOC =
  "https://docs.aws.amazon.com/bedrock/latest/userguide/models-regions.html";

const AZURE_DATABRICKS_DOC =
  "https://learn.microsoft.com/en-us/azure/databricks/machine-learning/model-serving/foundation-model-overview";

const GCP_VERTEX_AI_DOC =
  "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/data-residency";

const OPENAI_DOC = "https://developers.openai.com/api/docs/models";

const CLAUDE_DOC =
  "https://platform.claude.com/docs/en/about-claude/models/overview";

/**
 * Azure OpenAI model name patterns (matched from the OpenAI pivot page).
 * These are models sold directly by Azure under the "Azure OpenAI" section.
 */
const AZURE_OPENAI_PATTERNS: RegExp[] = [
  /^gpt-/i,
  /^o[1-9]/i,
  /^codex-/i,
  /^text-embedding/i,
  /^dall-e/i,
  /^tts/i,
  /^whisper/i,
  /^sora-/i,
  /^computer-use-preview/i,
  /^model-router/i,
  /^gpt-oss/i,
];

/**
 * Azure "Other" model patterns (non-OpenAI models sold directly by Azure).
 * These appear on the azure-direct-others pivot.
 */
const AZURE_OTHER_PATTERNS: RegExp[] = [
  /^Cohere/i,
  /^DeepSeek/i,
  /^FLUX/i,
  /^Llama/i,
  /^Meta-Llama/i,
  /^MAI-/i,
  /^Mistral/i,
  /^mistral/i,
  /^Ministral/i,
  /^Codestral/i,
  /^Mixtral/i,
  /^grok/i,
  /^Kimi/i,
  /^embed-v/i,
];

function isAzureOpenAI(modelName: string): boolean {
  return AZURE_OPENAI_PATTERNS.some((p) => p.test(modelName));
}

function isAzureOther(modelName: string): boolean {
  return AZURE_OTHER_PATTERNS.some((p) => p.test(modelName));
}

/**
 * Return a documentation URL for the given model, or null if none can be
 * determined.
 * 
 * For models with embedded URLs (e.g., Azure Databricks), use those directly.
 * Otherwise, generate provider-specific docs links.
 */
export function getModelUrl(
  model: ModelInfo,
  provider: string,
): string | null {
  // If the model has an embedded URL, use it
  if (model.url) {
    return model.url;
  }

  // Otherwise, fall back to provider-specific defaults
  if (provider === "aws") {
    return AWS_MODELS_DOC;
  }

  if (provider === "azure") {
    if (isAzureOpenAI(model.name)) return AZURE_OPENAI_DOC;
    if (isAzureOther(model.name)) return AZURE_OTHER_DOC;
    // Remaining Azure models are likely partner/community models
    return AZURE_PARTNER_DOC;
  }

  if (provider === "azure-databricks") {
    // Fallback for Azure Databricks models without specific URLs
    return AZURE_DATABRICKS_DOC;
  }

  if (provider === "vertex" || provider === "gcp") {
    return GCP_VERTEX_AI_DOC;
  }

  if (provider === "openai") {
    return OPENAI_DOC;
  }

  if (provider === "claude") {
    return CLAUDE_DOC;
  }

  return null;
}
