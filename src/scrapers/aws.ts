import axios from 'axios';
import * as cheerio from 'cheerio';
import * as https from 'https';
import { writeFileSync } from 'fs';
import type { ModelRegionData, ModelInfo } from '../types/index.js';
import { getAWSModelUrl } from '../utils/aws-model-urls.js';

const AWS_BEDROCK_URL = 'https://docs.aws.amazon.com/bedrock/latest/userguide/models-regions.html';

/**
 * Shared HTTPS agent that trusts self-signed certificates in the chain
 * (required behind corporate proxies that perform TLS inspection).
 */
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

/**
 * Parse a single AWS Bedrock model-region table and return ModelInfo entries
 * tagged with the given source label.
 */
function parseTable($: cheerio.CheerioAPI, table: cheerio.Cheerio<any>, source: string): ModelInfo[] {
  // Extract region names from header row
  const regions: string[] = [];
  table.find('thead tr th').each((index, element) => {
    if (index >= 2) { // Skip "Provider" and "Model" columns
      const regionName = $(element).text().trim();
      if (regionName) {
        regions.push(regionName);
      }
    }
  });

  console.log(`📍 Found ${regions.length} AWS regions in "${source}" table`);

  // Extract model data from table rows
  const models: ModelInfo[] = [];

  table.find('tbody tr').each((_rowIndex, rowElement) => {
    const cells = $(rowElement).find('td');

    if (cells.length < 3) {
      return; // Skip incomplete rows
    }

    const provider = $(cells[0]).text().trim();
    const modelName = $(cells[1]).text().trim();

    if (!modelName) {
      return; // Skip rows without model name
    }

    // Create full model name with provider prefix
    const fullModelName = `${provider} - ${modelName}`;

    // Extract availability for each region
    const regionAvailability = regions.map((region, regionIndex) => {
      const cellIndex = regionIndex + 2; // +2 to skip Provider and Model columns
      const cell = $(cells[cellIndex]);

      // Check if the cell contains "Yes" text or icon-yes.png image
      const cellText = cell.text().trim();
      const hasYesImage = cell.find('img[src*="icon-yes"]').length > 0;
      const available = cellText.includes('Yes') || hasYesImage;

      return {
        region,
        available,
        deploymentTypes: [], // AWS docs don't provide deployment type details
      };
    });

    // Create model entry
    const modelInfo: ModelInfo = {
      name: fullModelName,
      source,
      url: getAWSModelUrl(fullModelName),
      regions: regionAvailability
    };

    models.push(modelInfo);
  });

  return models;
}

/**
 * Scrapes AWS Bedrock model-region availability from public documentation.
 * Parses both the "Model support by AWS Region" table and the
 * "Inference profile support by AWS Region" table.
 */
export async function scrapeAWSBedrock(): Promise<ModelRegionData> {
  console.log('🔍 Fetching AWS Bedrock documentation...');
  
  // Fetch the HTML page
  const response = await axios.get(AWS_BEDROCK_URL, { httpsAgent });
  const $ = cheerio.load(response.data);
  
  console.log('📄 Parsing HTML...');
  
  const tables = $('table');
  
  if (tables.length < 1) {
    throw new Error('Could not find model-region table in AWS Bedrock documentation');
  }

  // Table 1: "Model support by AWS Region" (first table)
  const modelSupportTable = $(tables[0]);
  const modelSupportModels = parseTable($, modelSupportTable, 'Model support');
  console.log(`✅ Table 1 (Model support): ${modelSupportModels.length} models`);

  // Table 2: "Inference profile support by AWS Region" (second table, if present)
  let inferenceModels: ModelInfo[] = [];
  if (tables.length >= 2) {
    const inferenceTable = $(tables[1]);
    inferenceModels = parseTable($, inferenceTable, 'Inference profile support');
    console.log(`✅ Table 2 (Inference profile support): ${inferenceModels.length} models`);
  } else {
    console.warn('⚠️ Second table (Inference profile support) not found on page');
  }

  // Combine all models; models from different tables keep separate entries
  // because the same model can appear in both with different region availability.
  // To keep region arrays consistent, we unify the region set across both tables.
  const allRegionNames = new Set<string>();
  for (const m of [...modelSupportModels, ...inferenceModels]) {
    for (const r of m.regions) {
      allRegionNames.add(r.region);
    }
  }
  const regionList = Array.from(allRegionNames);

  // Normalise: ensure every model has an entry for every region
  function normalise(models: ModelInfo[]): ModelInfo[] {
    return models.map(m => {
      const existingRegions = new Map(m.regions.map(r => [r.region, r]));
      return {
        ...m,
        regions: regionList.map(region => {
          const existing = existingRegions.get(region);
          return {
            region,
            available: existing?.available ?? false,
            deploymentTypes: existing?.deploymentTypes ?? [],
          };
        })
      };
    });
  }

  const allModels = [...normalise(modelSupportModels), ...normalise(inferenceModels)];

  console.log(`\n📊 Total models combined: ${allModels.length}`);
  console.log(`   - Model support: ${modelSupportModels.length}`);
  console.log(`   - Inference profile support: ${inferenceModels.length}`);

  // Create the final data structure
  const data: ModelRegionData = {
    provider: 'AWS Bedrock',
    lastUpdated: new Date().toISOString(),
    models: allModels
  };
  
  return data;
}

/**
 * Main execution: Scrape and save AWS Bedrock data
 */
async function main() {
  try {
    const data = await scrapeAWSBedrock();
    
    // Save to JSON file
    const outputPath = './data/aws-models.json';
    writeFileSync(outputPath, JSON.stringify(data, null, 2));
    
    console.log(`\n✅ Data saved to ${outputPath}`);
    console.log(`📊 Total models: ${data.models.length}`);
    console.log(`📍 Total regions: ${data.models[0]?.regions.length || 0}`);
    
    // Show sample statistics
    const regionCounts = new Map<string, number>();
    data.models.forEach(model => {
      model.regions.forEach(r => {
        if (r.available) {
          regionCounts.set(r.region, (regionCounts.get(r.region) || 0) + 1);
        }
      });
    });
    
    // Find top 5 regions with most models
    const topRegions = Array.from(regionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    console.log('\n🏆 Top 5 regions with most models:');
    topRegions.forEach(([region, count]) => {
      const percentage = ((count / data.models.length) * 100).toFixed(1);
      console.log(`  ${region}: ${count}/${data.models.length} (${percentage}%)`);
    });
    
  } catch (error) {
    console.error('❌ Error scraping AWS Bedrock data:', error);
    process.exit(1);
  }
}

// Run if executed directly
main();
