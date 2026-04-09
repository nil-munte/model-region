export interface ModelRegionData {
  provider: string;
  lastUpdated: string;
  models: ModelInfo[];
}

export interface ModelInfo {
  name: string;
  version?: string;
  /** Where the model comes from (e.g. "Foundry Models Azure" vs "Foundry Models Partners/Community"). */
  source?: string;
  /** Documentation URL for this model. */
  url?: string;
  regions: RegionAvailability[];
}

export interface RegionAvailability {
  region: string;
  available: boolean;
  /** Deployment types available in this region (e.g. "Global Standard", "Data Zone Standard"). */
  deploymentTypes: string[];
}

export interface AzureModelRow {
  model: string;
  version: string;
  regions: Record<string, boolean>;
}
