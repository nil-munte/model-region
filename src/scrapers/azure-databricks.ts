import axios from 'axios';
import * as cheerio from 'cheerio';
import type { ModelRegionData, ModelInfo, RegionAvailability } from '../types/index.js';
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';

/**
 * Azure Databricks foundation model availability page
 */
const AZURE_DATABRICKS_URL = 'https://learn.microsoft.com/en-us/azure/databricks/machine-learning/model-serving/foundation-model-overview';

/** HTTPS agent that tolerates corporate TLS inspection. */
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

/**
 * Deployment types in the Azure Databricks table (column names)
 */
const DEPLOYMENT_TYPES = [
  'Foundation Model APIs pay-per-token',
  'AI Functions (batch inference)',
  'Foundation Model APIs provisioned throughput'
];

/**
 * Extract model names and URLs from a table cell that contains a list of supported models.
 * 
 * For pay-per-token and AI Functions columns:
 *   - Pattern: <a href="..."><code>databricks-model-name</code></a>
 * 
 * For provisioned throughput column:
 *   - Pattern: <li>Model Family Name</li> (plain text, may include ⥂ or "(preview)")
 * 
 * Returns: Map of modelName -> URL (or null if no URL available)
 */
function extractModelsFromCell($: cheerio.CheerioAPI, cell: cheerio.Cheerio<any>): Map<string, string | null> {
  const text = cell.text().trim();
  
  // Check if not supported
  if (text === 'Not supported' || text.includes('Not supported')) {
    return new Map();
  }

  const models = new Map<string, string | null>();
  
  // Check for code tags with databricks- prefix (pay-per-token and AI Functions)
  cell.find('a').each((_i: number, el: any) => {
    const link = $(el);
    const codeEl = link.find('code');
    if (codeEl.length > 0) {
      const modelName = codeEl.text().trim();
      if (modelName.startsWith('databricks-')) {
        // Keep the full databricks- prefix, only remove special markers
        const cleanName = modelName
          .replace(/⥂/g, '')
          .trim();
        
        // Get the href and convert relative URL to absolute
        const href = link.attr('href');
        let url: string | null = null;
        if (href && href.startsWith('../')) {
          // Convert ../foundation-model-apis/supported-models#model-id to absolute URL
          // Current page: /azure/databricks/machine-learning/model-serving/foundation-model-overview
          // Relative path ../ goes up one level from model-serving to machine-learning
          url = `https://learn.microsoft.com/en-us/azure/databricks/machine-learning/${href.replace('../', '')}`;
        }
        
        if (cleanName) {
          models.set(cleanName, url);
        }
      }
    }
  });

  // If no code tags found, check for plain text model families (provisioned throughput)
  if (models.size === 0) {
    cell.find('li').each((_i: number, el: any) => {
      const liText = $(el).text().trim();
      // Skip nested list headers
      if (liText.includes('The following model families')) {
        return;
      }
      if (liText) {
        // Clean up: remove preview markers, special symbols, etc.
        const cleanName = liText
          .replace(/\s*\(preview\)/gi, '')
          .replace(/⥂/g, '')
          .trim();
        if (cleanName && !cleanName.includes('supported for')) {
          // Model families don't have individual doc links
          models.set(cleanName, null);
        }
      }
    });
  }

  return models;
}

/**
 * Parse the main availability table and return model data grouped by region.
 * 
 * Table structure:
 * - Column 0: Region name (in <code> tag)
 * - Column 1: Foundation Model APIs pay-per-token
 * - Column 2: AI Functions (batch inference)
 * - Column 3: Foundation Model APIs provisioned throughput
 */
function parseAvailabilityTable(
  $: cheerio.CheerioAPI,
  table: cheerio.Cheerio<any>,
): { regionData: Map<string, Map<string, string[]>>; modelUrls: Map<string, string | null> } {
  // Map: regionId -> deploymentType -> modelNames[]
  const regionData = new Map<string, Map<string, string[]>>();
  // Map: modelName -> URL (deduplicated across all regions)
  const modelUrls = new Map<string, string | null>();

  table.find('tbody tr').each((_rowIdx: number, rowEl: any) => {
    const cells = $(rowEl).find('td');
    if (cells.length < 4) return;

    // Column 0: region name
    const regionCode = $(cells[0]).find('code').text().trim();
    if (!regionCode) return;

    const deploymentData = new Map<string, string[]>();

    // Columns 1-3: deployment types
    for (let i = 0; i < DEPLOYMENT_TYPES.length; i++) {
      const deploymentType = DEPLOYMENT_TYPES[i];
      if (!deploymentType) continue;
      
      const cell = $(cells[i + 1]);
      const modelsWithUrls = extractModelsFromCell($, cell);
      
      if (modelsWithUrls.size > 0) {
        const modelNames: string[] = [];
        for (const [modelName, url] of modelsWithUrls) {
          modelNames.push(modelName);
          // Store URL if we haven't seen this model before, or if this URL is better (not null)
          if (!modelUrls.has(modelName) || (url && !modelUrls.get(modelName))) {
            modelUrls.set(modelName, url);
          }
        }
        deploymentData.set(deploymentType, modelNames);
      }
    }

    if (deploymentData.size > 0) {
      regionData.set(regionCode, deploymentData);
    }
  });

  return { regionData, modelUrls };
}

/**
 * Convert region-centric data to model-centric data.
 * 
 * Input: regionId -> deploymentType -> modelNames[]
 * Output: Array of ModelInfo with availability by region
 * 
 * For Azure Databricks, we put the deployment type into the source field
 * and leave deploymentTypes empty in regions.
 */
function convertToModelInfo(
  regionData: Map<string, Map<string, string[]>>,
  modelUrls: Map<string, string | null>,
): { models: ModelInfo[]; allRegions: string[] } {
  // Collect all unique models and regions
  // Map: modelName -> Set of deployment types
  const modelDeploymentTypes = new Map<string, Set<string>>();
  // Map: modelName -> Set of regions where available
  const modelAvailableRegions = new Map<string, Set<string>>();
  const allRegions = Array.from(regionData.keys()).sort();

  for (const [regionId, deploymentMap] of regionData) {
    for (const [deploymentType, modelNames] of deploymentMap) {
      for (const modelName of modelNames) {
        if (!modelDeploymentTypes.has(modelName)) {
          modelDeploymentTypes.set(modelName, new Set());
        }
        if (!modelAvailableRegions.has(modelName)) {
          modelAvailableRegions.set(modelName, new Set());
        }
        modelDeploymentTypes.get(modelName)!.add(deploymentType);
        modelAvailableRegions.get(modelName)!.add(regionId);
      }
    }
  }

  // Convert to ModelInfo array
  const models: ModelInfo[] = [];
  
  for (const [modelName, deploymentTypesSet] of modelDeploymentTypes) {
    const availableRegionsSet = modelAvailableRegions.get(modelName) || new Set();
    
    // Use the first deployment type alphabetically as the source
    const deploymentTypesList = Array.from(deploymentTypesSet).sort();
    const source = deploymentTypesList.length > 0 ? deploymentTypesList[0] : undefined;
    
    const regions: RegionAvailability[] = allRegions.map((regionId) => {
      return {
        region: regionId,
        available: availableRegionsSet.has(regionId),
        deploymentTypes: [], // Leave empty as per requirement
      };
    });

    const modelUrl = modelUrls.get(modelName);
    const modelInfo: ModelInfo = {
      name: modelName,
      regions,
    };
    
    // Add source if available
    if (source) {
      modelInfo.source = source;
    }
    
    // Only add url if it exists and is not null
    if (modelUrl) {
      modelInfo.url = modelUrl;
    }
    
    models.push(modelInfo);
  }

  return { models: models.sort((a, b) => a.name.localeCompare(b.name)), allRegions };
}

/**
 * Main scraper function
 */
async function scrapeAzureDatabricks(): Promise<ModelRegionData> {
  console.log('🚀 Starting Azure Databricks model scraper...\n');
  console.log(`🔍 Fetching ${AZURE_DATABRICKS_URL}...`);

  const response = await axios.get(AZURE_DATABRICKS_URL, {
    httpsAgent,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });

  const $ = cheerio.load(response.data);
  console.log('📄 Page loaded, parsing availability table...');

  // Find the main table (should be the first table on the page)
  const tables = $('table');
  if (tables.length === 0) {
    throw new Error('❌ No tables found on the page');
  }

  // Find the table with region availability
  let targetTable: cheerio.Cheerio<any> | null = null;
  tables.each((_idx: number, tableEl: any) => {
    const table = $(tableEl);
    const headers = table.find('thead th').map((_i: number, el: any) => $(el).text().trim()).get();
    
    // Check if this table has the expected columns
    if (headers.includes('Region') && 
        headers.includes('Foundation Model APIs pay-per-token')) {
      targetTable = table;
      return false; // break
    }
  });

  if (!targetTable) {
    throw new Error('❌ Could not find the region availability table');
  }

  console.log('✅ Found availability table');

  // Parse the table
  const { regionData, modelUrls } = parseAvailabilityTable($, targetTable);
  console.log(`📊 Parsed ${regionData.size} regions with model availability`);

  // Convert to model-centric format
  const { models, allRegions } = convertToModelInfo(regionData, modelUrls);
  console.log(`📊 Extracted ${models.length} unique models across ${allRegions.length} regions`);

  // Count deployment types
  const deploymentTypeCounts = new Map<string, number>();
  for (const model of models) {
    for (const region of model.regions) {
      for (const deploymentType of region.deploymentTypes) {
        deploymentTypeCounts.set(
          deploymentType,
          (deploymentTypeCounts.get(deploymentType) || 0) + 1
        );
      }
    }
  }

  console.log('\n📈 Deployment type coverage:');
  for (const [deploymentType, count] of deploymentTypeCounts) {
    console.log(`   - ${deploymentType}: ${count} model-region combinations`);
  }

  return {
    provider: 'Azure Databricks',
    lastUpdated: new Date().toISOString(),
    models,
  };
}

/**
 * CLI entry point
 */
async function main() {
  try {
    const data = await scrapeAzureDatabricks();

    const outputPath = path.join(process.cwd(), 'data', 'azure-databricks-models.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

    console.log(`\n💾 Data saved to: ${outputPath}`);
    console.log(`📊 Total models: ${data.models.length}`);

    if (data.models.length > 0) {
      const firstModel = data.models[0];
      if (firstModel) {
        console.log(`📍 Total regions: ${firstModel.regions.length}`);
      }
      console.log(`\n🔝 First 10 models:`);
      data.models.slice(0, 10).forEach((model: ModelInfo, i: number) => {
        const availableCount = model.regions.filter((r: RegionAvailability) => r.available).length;
        const dtypes = new Set<string>();
        model.regions.forEach((r) => r.deploymentTypes.forEach((d) => dtypes.add(d)));
        console.log(`   ${i + 1}. ${model.name}: ${availableCount} regions`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
