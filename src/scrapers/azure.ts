import axios from 'axios';
import * as cheerio from 'cheerio';
import type { ModelRegionData, ModelInfo, RegionAvailability } from '../types/index.js';
import { getAzureModelUrl } from '../utils/azure-model-urls.js';
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';

/**
 * URLs — no tab query param needed; every tab panel is embedded in the HTML.
 */
const AZURE_OPENAI_URL = 'https://learn.microsoft.com/en-us/azure/foundry-classic/foundry-models/concepts/models-sold-directly-by-azure?pivots=azure-openai';
const AZURE_OTHER_URL  = 'https://learn.microsoft.com/en-us/azure/foundry-classic/foundry-models/concepts/models-sold-directly-by-azure?pivots=azure-direct-others';
const AZURE_PARTNER_URL = 'https://learn.microsoft.com/en-us/azure/foundry-classic/how-to/deploy-models-serverless-availability';

/**
 * Tab panel definitions — section IDs and the human-readable deployment type label.
 *
 * Tab Group 1: Azure OpenAI models (8 tabs)
 * Tab Group 2: Other model collections (3 tabs, different IDs)
 */
const OPENAI_TABS: { sectionId: string; deploymentType: string }[] = [
  { sectionId: 'tabpanel_1_global-standard-aoai',        deploymentType: 'Global Standard' },
  { sectionId: 'tabpanel_1_global-ptum-aoai',            deploymentType: 'Global Provisioned Managed' },
  { sectionId: 'tabpanel_1_global-batch',                deploymentType: 'Global Batch' },
  { sectionId: 'tabpanel_1_datazone-standard',           deploymentType: 'Data Zone Standard' },
  { sectionId: 'tabpanel_1_datazone-provisioned-managed', deploymentType: 'Data Zone Provisioned Managed' },
  { sectionId: 'tabpanel_1_datazone-batch',              deploymentType: 'Data Zone Batch' },
  { sectionId: 'tabpanel_1_standard',                    deploymentType: 'Standard' },
  { sectionId: 'tabpanel_1_provisioned',                 deploymentType: 'Provisioned Managed' },
];

const OTHER_TABS: { sectionId: string; deploymentType: string }[] = [
  { sectionId: 'tabpanel_1_global-standard',  deploymentType: 'Global Standard' },
  { sectionId: 'tabpanel_1_global-ptum',      deploymentType: 'Global Provisioned Managed' },
  { sectionId: 'tabpanel_1_data-zone-standard', deploymentType: 'Data Zone Standard' },
];

/**
 * Map display region names (from partner page) to internal Azure region IDs.
 */
const DISPLAY_TO_INTERNAL_REGION: Record<string, string> = {
  'australiaeast': 'australiaeast',
  'brazilsouth': 'brazilsouth',
  'canadacentral': 'canadacentral',
  'canadaeast': 'canadaeast',
  'centralus': 'centralus',
  'east us': 'eastus',
  'east us 2': 'eastus2',
  'france central': 'francecentral',
  'germany west central': 'germanywestcentral',
  'italy north': 'italynorth',
  'japan east': 'japaneast',
  'japan west': 'japanwest',
  'korea central': 'koreacentral',
  'north central us': 'northcentralus',
  'norway east': 'norwayeast',
  'poland central': 'polandcentral',
  'south africa north': 'southafricanorth',
  'south central us': 'southcentralus',
  'southeast asia': 'southeastasia',
  'south india': 'southindia',
  'spain central': 'spaincentral',
  'sweden central': 'swedencentral',
  'switzerland north': 'switzerlandnorth',
  'switzerland west': 'switzerlandwest',
  'uae north': 'uaenorth',
  'uk south': 'uksouth',
  'west central us': 'westcentralus',
  'west europe': 'westeurope',
  'west us': 'westus',
  'west us 2': 'westus2',
  'west us 3': 'westus3',
};

/** HTTPS agent that tolerates corporate TLS inspection. */
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// ---------------------------------------------------------------------------
// Intermediate per-tab parse result: model name -> set of regions where
// that model is available (checked) in this deployment type table.
// ---------------------------------------------------------------------------
type TabParseResult = Map<string, Set<string>>;

/**
 * Detect whether a table cell indicates availability.
 */
function cellIsAvailable($: cheerio.CheerioAPI, cellEl: any): boolean {
  const html = $(cellEl).html() || '';
  const text = $(cellEl).text().trim().toLowerCase();
  return (
    html.includes('icon-yes') ||
    text.includes('yes') ||
    text.includes('✅') ||
    html.includes('✓') ||
    html.includes('checkmark')
  );
}

/**
 * Parse a single availability table inside a tab-panel section.
 * Returns a map: modelName -> Set<regionId>.
 *
 * Tables may be in two orientations:
 *   - Standard: rows are models, columns are regions
 *   - Transposed: rows are regions, columns are models (first header contains "region")
 */
function parseAvailabilityTable(
  $: cheerio.CheerioAPI,
  table: cheerio.Cheerio<any>,
): TabParseResult {
  const result: TabParseResult = new Map();

  const headerCells: string[] = [];
  table.find('thead tr').first().find('th, td').each((_i: number, el: any) => {
    headerCells.push($(el).text().trim());
  });

  if (headerCells.length < 2) return result;

  const isTransposed = headerCells[0]?.toLowerCase().includes('region');

  if (isTransposed) {
    // Columns = models (skip first), Rows = regions
    const modelNames = headerCells.slice(1);
    table.find('tbody tr').each((_ri: number, rowEl: any) => {
      const cells = $(rowEl).find('td');
      if (cells.length < 2) return;
      const regionName = $(cells[0]).text().trim();
      if (!regionName) return;
      cells.slice(1).each((ci: number, cellEl: any) => {
        if (ci >= modelNames.length) return;
        const modelName = modelNames[ci];
        if (!modelName) return;
        if (cellIsAvailable($, cellEl)) {
          if (!result.has(modelName)) result.set(modelName, new Set());
          result.get(modelName)!.add(regionName);
        }
      });
    });
  } else {
    // Columns = regions (skip first), Rows = models
    const regionNames = headerCells.slice(1);
    table.find('tbody tr').each((_ri: number, rowEl: any) => {
      const cells = $(rowEl).find('td');
      if (cells.length < 2) return;
      const modelName = $(cells[0]).text().trim();
      if (!modelName) return;
      cells.slice(1).each((ci: number, cellEl: any) => {
        if (ci >= regionNames.length) return;
        const regionName = regionNames[ci];
        if (!regionName) return;
        if (cellIsAvailable($, cellEl)) {
          if (!result.has(modelName)) result.set(modelName, new Set());
          result.get(modelName)!.add(regionName);
        }
      });
    });
  }

  return result;
}

/**
 * Merged model accumulator: for each model, track which regions are available
 * under which deployment types.
 */
interface MergedModel {
  /** regionId -> set of deployment-type labels */
  regionDeployments: Map<string, Set<string>>;
}

/**
 * Scrape a single Azure page (either OpenAI or Other pivot) and parse all
 * specified tab panels.  Returns a merged map: modelName -> MergedModel.
 */
async function scrapeAllTabs(
  url: string,
  tabs: { sectionId: string; deploymentType: string }[],
  label: string,
): Promise<{ merged: Map<string, MergedModel>; allRegionIds: Set<string> }> {
  console.log(`\n🔍 Fetching ${label}...`);

  const response = await axios.get(url, {
    httpsAgent,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });

  const $ = cheerio.load(response.data);
  console.log('📄 Page loaded, parsing deployment-type tabs...');

  const merged = new Map<string, MergedModel>();
  const allRegionIds = new Set<string>();

  for (const { sectionId, deploymentType } of tabs) {
    const section = $(`section#${sectionId}`);
    if (section.length === 0) {
      console.warn(`   ⚠️  Section #${sectionId} not found — skipping "${deploymentType}"`);
      continue;
    }

    const table = section.find('table').first();
    if (table.length === 0) {
      console.warn(`   ⚠️  No table in #${sectionId} — skipping "${deploymentType}"`);
      continue;
    }

    const tabResult = parseAvailabilityTable($, table);
    let modelCount = 0;

    for (const [modelName, regionSet] of tabResult) {
      modelCount++;
      if (!merged.has(modelName)) {
        merged.set(modelName, { regionDeployments: new Map() });
      }
      const m = merged.get(modelName)!;
      for (const regionId of regionSet) {
        allRegionIds.add(regionId);
        if (!m.regionDeployments.has(regionId)) {
          m.regionDeployments.set(regionId, new Set());
        }
        m.regionDeployments.get(regionId)!.add(deploymentType);
      }
    }

    console.log(`   ✅ ${deploymentType}: ${modelCount} models`);
  }

  console.log(`   📊 ${label} total unique models: ${merged.size}`);
  return { merged, allRegionIds };
}

/**
 * Convert a MergedModel map into an array of ModelInfo, filling every region
 * with an entry (available=true when at least one deployment type is present).
 */
function toModelInfoArray(
  merged: Map<string, MergedModel>,
  allRegionIds: string[],
  source: string,
): ModelInfo[] {
  const models: ModelInfo[] = [];

  for (const [modelName, data] of merged) {
    const regions: RegionAvailability[] = allRegionIds.map((regionId) => {
      const types = data.regionDeployments.get(regionId);
      return {
        region: regionId,
        available: !!types && types.size > 0,
        deploymentTypes: types ? Array.from(types).sort() : [],
      };
    });

    models.push({ 
      name: modelName, 
      source, 
      url: getAzureModelUrl(modelName, source),
      regions 
    });
  }

  return models;
}

// ---------------------------------------------------------------------------
// Partner / Community page scraper
// ---------------------------------------------------------------------------

async function scrapePartnerPage(allRegionIds: string[]): Promise<ModelInfo[]> {
  const sectionName = 'Azure Foundry Partner/Community Models';
  console.log(`\n🔍 Fetching ${sectionName}...`);

  try {
    const response = await axios.get(AZURE_PARTNER_URL, {
      httpsAgent,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });

    const $ = cheerio.load(response.data);
    console.log('📄 Page loaded, parsing partner model tables...');

    const models: ModelInfo[] = [];

    $('table').each((_tableIdx: number, tableEl: any) => {
      const table = $(tableEl);
      const headers = table.find('thead th');
      if (headers.length < 3) return;

      const thirdHeader = $(headers[2]).text().trim().toLowerCase();
      if (!thirdHeader.includes('deployment')) return;

      table.find('tbody tr').each((_rowIdx: number, rowEl: any) => {
        const cells = $(rowEl).find('td');
        if (cells.length < 3) return;

        // Column 0: model names (may contain multiple, <br>-separated)
        const modelCellHtml = $(cells[0]).html() || '';
        const modelNames = modelCellHtml
          .split(/<br\s*\/?>/i)
          .map((s: string) => cheerio.load(s).text().trim())
          .filter((s: string) => s.length > 0)
          .map((s: string) =>
            s.replace(/\s*\(preview\)/gi, '').replace(/\s*\(gated research preview\)/gi, '').trim(),
          )
          .filter((s: string) => s.length > 0 && !s.match(/^\d+$/));

        // Column 2: deployment regions (<br>-separated display names)
        const regionCellHtml = $(cells[2]).html() || '';
        const deployRegions = regionCellHtml
          .split(/<br\s*\/?>/i)
          .map((s: string) => cheerio.load(s).text().trim())
          .filter((s: string) => s.length > 0);

        const availableRegionIds = new Set<string>();
        for (const displayName of deployRegions) {
          const lower = displayName.toLowerCase().trim();
          const internal = DISPLAY_TO_INTERNAL_REGION[lower];
          if (internal) {
            availableRegionIds.add(internal);
          } else {
            availableRegionIds.add(lower.replace(/\s+/g, ''));
            console.warn(`   ⚠️ Unknown region display name: "${displayName}" → using "${lower.replace(/\s+/g, '')}"`);
          }
        }

        for (const modelName of modelNames) {
          const source = 'Foundry models from partners/community';
          const regions: RegionAvailability[] = allRegionIds.map((regionId) => ({
            region: regionId,
            available: availableRegionIds.has(regionId),
            deploymentTypes: availableRegionIds.has(regionId) ? ['Global Standard'] : [],
          }));
          models.push({ 
            name: modelName, 
            source,
            url: getAzureModelUrl(modelName, source),
            regions 
          });
        }
      });
    });

    console.log(`✅ Parsed ${models.length} models from ${sectionName}`);
    return models;
  } catch (error) {
    console.error(`❌ Error scraping ${sectionName}:`, error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

async function scrapeAzureModels(): Promise<ModelRegionData> {
  console.log('🚀 Starting Azure model scraper (all deployment types)...\n');

  // 1. Scrape OpenAI pivot (8 tabs)
  const openAI = await scrapeAllTabs(AZURE_OPENAI_URL, OPENAI_TABS, 'Azure OpenAI Models');

  // 2. Scrape Other pivot (3 tabs)
  const other = await scrapeAllTabs(AZURE_OTHER_URL, OTHER_TABS, 'Azure Other Models');

  // 3. Union of all region IDs
  const allRegionIdSet = new Set<string>([...openAI.allRegionIds, ...other.allRegionIds]);
  const allRegionIds = Array.from(allRegionIdSet).sort();
  console.log(`\n📍 Region IDs from direct pages: ${allRegionIds.length}`);

  // 4. Convert merged maps to ModelInfo arrays
  const openAIModels = toModelInfoArray(openAI.merged, allRegionIds, 'Foundry models from Azure');
  const otherModels  = toModelInfoArray(other.merged, allRegionIds, 'Foundry models from Azure');

  // 5. Scrape partner page
  const partnerModels = await scrapePartnerPage(allRegionIds);

  // 6. Combine all, dedup by name (first-seen wins)
  const modelMap = new Map<string, ModelInfo>();
  for (const model of [...openAIModels, ...otherModels, ...partnerModels]) {
    if (!modelMap.has(model.name)) {
      modelMap.set(model.name, model);
    }
  }
  const allModels = Array.from(modelMap.values());

  console.log(`\n📊 Total models combined: ${allModels.length}`);
  console.log(`   - OpenAI models: ${openAIModels.length}`);
  console.log(`   - Other models: ${otherModels.length}`);
  console.log(`   - Partner models: ${partnerModels.length}`);
  console.log(`   - After deduplication: ${allModels.length}`);

  return {
    provider: 'Azure Foundry',
    lastUpdated: new Date().toISOString(),
    models: allModels,
  };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

async function main() {
  console.log('🚀 Starting Azure model scraper...\n');

  const data = await scrapeAzureModels();

  const outputPath = path.join(process.cwd(), 'data', 'azure-models.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

  console.log(`\n💾 Data saved to: ${outputPath}`);
  console.log(`📊 Total models: ${data.models.length}`);

  if (data.models.length > 0) {
    const firstModel = data.models[0];
    if (firstModel) {
      console.log(`📍 Total regions: ${firstModel.regions.length}`);
    }
    console.log(`\n🔝 First 5 models:`);
    data.models.slice(0, 5).forEach((model: ModelInfo, i: number) => {
      const availableCount = model.regions.filter((r: RegionAvailability) => r.available).length;
      const dtypes = new Set<string>();
      model.regions.forEach((r) => r.deploymentTypes.forEach((d) => dtypes.add(d)));
      console.log(`   ${i + 1}. ${model.name}: ${availableCount} regions [${Array.from(dtypes).join(', ')}]`);
    });
  }
}

main();
