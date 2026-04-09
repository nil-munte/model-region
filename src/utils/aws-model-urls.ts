/**
 * Generate documentation URLs for AWS Bedrock models.
 * AWS documentation doesn't have deep links for individual models,
 * so we return the main models-regions page.
 */

const AWS_MODELS_DOC = "https://docs.aws.amazon.com/bedrock/latest/userguide/models-regions.html";

/**
 * Generate a documentation URL for an AWS Bedrock model.
 * Returns the main models-regions documentation page.
 */
export function getAWSModelUrl(_modelName: string): string {
  return AWS_MODELS_DOC;
}
