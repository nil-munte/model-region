import { readFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * Shape of data consumed by the web UI.
 * Mirrors the scraper output in src/types/index.ts but kept local so the
 * web app has no import-path dependency on the scraper package.
 */
export interface RegionAvailability {
  region: string;
  available: boolean;
  /** Deployment types available in this region (e.g. "Global Standard", "Data Zone Standard"). */
  deploymentTypes: string[];
}

export interface ModelInfo {
  name: string;
  /** Where the model comes from (e.g. "Azure" vs "Partner/Community", or "Model support" vs "Inference profile support"). */
  source?: string;
  /** Documentation URL for this model. */
  url?: string;
  regions: RegionAvailability[];
}

export interface ProviderData {
  provider: string;
  lastUpdated: string;
  models: ModelInfo[];
}

/** Supported provider keys used throughout the web UI. */
export type ProviderKey = "azure" | "aws" | "azure-databricks" | "gcp";

const DATA_DIR = join(process.cwd(), "..", "data");

const FILE_MAP: Record<ProviderKey, string> = {
  azure: "azure-models.json",
  aws: "aws-models.json",
  "azure-databricks": "azure-databricks-models.json",
  gcp: "gcp-models.json",
};

/**
 * Read a single provider JSON file from disk.
 * Called from server components / API routes only.
 */
export function loadProviderData(provider: ProviderKey): ProviderData | null {
  const filePath = join(DATA_DIR, FILE_MAP[provider]);
  if (!existsSync(filePath)) return null;
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as ProviderData;
}

/**
 * Load every provider that has data on disk.
 */
export function loadAllProviders(): Record<ProviderKey, ProviderData | null> {
  return {
    azure: loadProviderData("azure"),
    aws: loadProviderData("aws"),
    "azure-databricks": loadProviderData("azure-databricks"),
    gcp: loadProviderData("gcp"),
  };
}
