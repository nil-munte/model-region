/**
 * Region grouping and ordering for the web UI.
 * Europe regions appear first and the default selection on page load
 * is the European region with the best model coverage.
 */

export type RegionGroup =
  | "Europe"
  | "North America"
  | "Asia Pacific"
  | "Middle East & Africa"
  | "South America"
  | "Government";

/** Which geographic group a region belongs to, keyed by exact region string. */
const AZURE_REGION_GROUPS: Record<string, RegionGroup> = {
  // Europe
  swedencentral: "Europe",
  francecentral: "Europe",
  germanywestcentral: "Europe",
  italynorth: "Europe",
  norwayeast: "Europe",
  northeurope: "Europe",
  polandcentral: "Europe",
  spaincentral: "Europe",
  switzerlandnorth: "Europe",
  switzerlandwest: "Europe",
  uksouth: "Europe",
  westeurope: "Europe",

  // North America
  canadacentral: "North America",
  canadaeast: "North America",
  centralus: "North America",
  eastus: "North America",
  eastus2: "North America",
  northcentralus: "North America",
  southcentralus: "North America",
  westcentralus: "North America",
  westus: "North America",
  westus2: "North America",
  westus3: "North America",

  // Asia Pacific
  australiaeast: "Asia Pacific",
  eastasia: "Asia Pacific",
  japaneast: "Asia Pacific",
  japanwest: "Asia Pacific",
  koreacentral: "Asia Pacific",
  southeastasia: "Asia Pacific",
  southindia: "Asia Pacific",
  centralindia: "Asia Pacific",

  // Middle East & Africa
  southafricanorth: "Middle East & Africa",
  uaenorth: "Middle East & Africa",

  // South America
  brazilsouth: "South America",
};

const AWS_REGION_GROUPS: Record<string, RegionGroup> = {
  // Europe
  "Europe (Frankfurt)": "Europe",
  "Europe (Zurich)": "Europe",
  "Europe (Stockholm)": "Europe",
  "Europe (Milan)": "Europe",
  "Europe (Spain)": "Europe",
  "Europe (Ireland)": "Europe",
  "Europe (London)": "Europe",
  "Europe (Paris)": "Europe",

  // North America
  "US East (N. Virginia)": "North America",
  "US East (Ohio)": "North America",
  "US West (N. California)": "North America",
  "US West (Oregon)": "North America",
  "Canada (Central)": "North America",
  "Canada West (Calgary)": "North America",
  "Mexico (Central)": "North America",

  // Asia Pacific
  "Asia Pacific (Taipei)": "Asia Pacific",
  "Asia Pacific (Tokyo)": "Asia Pacific",
  "Asia Pacific (Seoul)": "Asia Pacific",
  "Asia Pacific (Osaka)": "Asia Pacific",
  "Asia Pacific (Mumbai)": "Asia Pacific",
  "Asia Pacific (Hyderabad)": "Asia Pacific",
  "Asia Pacific (Singapore)": "Asia Pacific",
  "Asia Pacific (Sydney)": "Asia Pacific",
  "Asia Pacific (Jakarta)": "Asia Pacific",
  "Asia Pacific (Melbourne)": "Asia Pacific",
  "Asia Pacific (Malaysia)": "Asia Pacific",
  "Asia Pacific (New Zealand)": "Asia Pacific",
  "Asia Pacific (Thailand)": "Asia Pacific",

  // Middle East & Africa
  "Africa (Cape Town)": "Middle East & Africa",
  "Israel (Tel Aviv)": "Middle East & Africa",
  "Middle East (UAE)": "Middle East & Africa",
  "Middle East (Bahrain)": "Middle East & Africa",

  // South America
  "South America (São Paulo)": "South America",

  // Government
  "AWS GovCloud (US-East)": "Government",
  "AWS GovCloud (US-West)": "Government",
};

const GCP_REGION_GROUPS: Record<string, RegionGroup> = {
  // Multi-region
  "us-multi-region": "North America",
  "eu-multi-region": "Europe",

  // Europe
  "europe-west1": "Europe",
  "europe-west2": "Europe",
  "europe-west3": "Europe",
  "europe-west4": "Europe",
  "europe-west9": "Europe",

  // North America
  "northamerica-northeast1": "North America",

  // South America
  "southamerica-east1": "South America",

  // Asia Pacific
  "asia-east1": "Asia Pacific",
  "asia-northeast1": "Asia Pacific",
  "asia-northeast3": "Asia Pacific",
  "asia-south1": "Asia Pacific",
  "asia-southeast1": "Asia Pacific",
  "australia-southeast1": "Asia Pacific",
};

/** Group ordering – Europe always first. */
export const GROUP_ORDER: RegionGroup[] = [
  "Europe",
  "North America",
  "Asia Pacific",
  "Middle East & Africa",
  "South America",
  "Government",
];

/** Prefix used to distinguish continent entries from individual regions in the selector. */
export const CONTINENT_PREFIX = "continent:";

/**
 * Check whether a selector value represents a continent rather than a single region.
 */
export function isContinent(value: string): boolean {
  return value.startsWith(CONTINENT_PREFIX);
}

/**
 * Extract the RegionGroup name from a continent selector value.
 */
export function continentGroup(value: string): RegionGroup {
  return value.slice(CONTINENT_PREFIX.length) as RegionGroup;
}

/**
 * Given a continent selector value (e.g. "continent:Europe") and the full list
 * of region names for the provider, return the subset of regions belonging to
 * that continent.
 */
export function regionsForContinent(
  continentValue: string,
  allRegionNames: string[],
  provider: string,
): string[] {
  const group = continentGroup(continentValue);
  const map = getGroupMap(provider);
  return allRegionNames.filter((r) => map[r] === group);
}

/**
 * Given a provider key, return the region-to-group mapping.
 */
function getGroupMap(provider: string): Record<string, RegionGroup> {
  if (provider === "aws") return AWS_REGION_GROUPS;
  if (provider === "gcp") return GCP_REGION_GROUPS;
  // Azure and Azure Databricks use the same region naming convention
  return AZURE_REGION_GROUPS;
}

export interface GroupedRegions {
  group: RegionGroup;
  regions: string[];
}

/**
 * Groups regions by geographic area, Europe first.
 * Regions not in the mapping land in a trailing "Other" bucket
 * (should not happen if the mapping is complete).
 */
export function groupRegions(
  regionNames: string[],
  provider: string,
): GroupedRegions[] {
  const map = getGroupMap(provider);

  const buckets = new Map<RegionGroup, string[]>();
  for (const g of GROUP_ORDER) buckets.set(g, []);

  for (const r of regionNames) {
    const g = map[r];
    if (g) {
      buckets.get(g)!.push(r);
    }
  }

  const result: GroupedRegions[] = [];
  for (const g of GROUP_ORDER) {
    const regions = buckets.get(g)!;
    if (regions.length > 0) {
      result.push({ group: g, regions: regions.sort() });
    }
  }
  return result;
}

/**
 * Default European region per provider (best model coverage).
 */
const DEFAULT_REGIONS: Record<string, string> = {
  azure: "swedencentral",
  aws: "Europe (Frankfurt)",
  "azure-databricks": "westeurope",
  gcp: "eu-multi-region",
};

export function getDefaultRegion(provider: string): string {
  return DEFAULT_REGIONS[provider] ?? DEFAULT_REGIONS["azure"]!;
}
