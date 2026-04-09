import axios from 'axios';
import * as cheerio from 'cheerio';
import * as https from 'https';
import { writeFileSync } from 'fs';
import type { ModelRegionData, ModelInfo } from '../types/index.js';
import { getGCPModelUrl } from '../utils/gcp-model-urls.js';

const GCP_VERTEX_AI_URL = 'https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/data-residency';

/**
 * Shared HTTPS agent that trusts self-signed certificates in the chain
 * (required behind corporate proxies that perform TLS inspection).
 */
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

/**
 * Category definitions based on the three main sections of the page.
 * Each section is identified by an h3 header with a unique ID.
 * Tags include "Google Cloud" prefix and "support" suffix.
 */
const CATEGORIES = [
  { id: 'ml-processing-google-models', source: 'Google Cloud Model support' },
  { id: 'ml-processing-google-partner-models', source: 'Google Cloud Partner Model support' },
  { id: 'ml-processing-open-models', source: 'Google Cloud Open Model support' },
] as const;

/**
 * Parse a single availability table and return ModelInfo entries.
 * 
 * @param $ - Cheerio instance
 * @param table - Table element to parse
 * @param source - Category tag (e.g., "model support", "partner model support")
 * @returns Array of ModelInfo objects
 */
function parseTable(
  $: cheerio.CheerioAPI,
  table: cheerio.Cheerio<any>,
  source: string,
): ModelInfo[] {
  // Extract region information from header row
  // Tables don't use <thead>, headers are just the first <tr> with <th> elements
  const regions: { name: string; code: string }[] = [];
  
  const headerRow = table.find('tr').first();
  headerRow.find('th').each((index, element) => {
    if (index === 0) return; // Skip "Model" column
    
    const headerHtml = $(element).html() || '';
    const headerText = $(element).text().trim();
    
    if (!headerText) return;
    
    // Check if format includes region code: "Region Name<br>(region-code)"
    const parts = headerHtml.split(/<br[^>]*>/i);
    
    if (parts.length >= 2 && parts[0] && parts[1]) {
      // Format with code: "Region Name<br aria-hidden="true">(region-code)"
      const regionName = cheerio.load(parts[0]).text().trim();
      const regionCodeRaw = cheerio.load(parts[1]).text().trim();
      const regionCode = regionCodeRaw.replace(/[()]/g, ''); // Remove parentheses
      
      regions.push({ name: regionName, code: regionCode });
    } else {
      // Simple format without code: just "Region Name"
      // Use the region name itself as the code (normalized to lowercase with hyphens)
      const regionName = headerText;
      const regionCode = headerText.toLowerCase().replace(/\s+/g, '-');
      
      regions.push({ name: regionName, code: regionCode });
    }
  });

  if (regions.length === 0) {
    console.warn('   ⚠️ No regions found in table header');
    return [];
  }

  console.log(`   Found ${regions.length} regions: ${regions.map(r => r.code).join(', ')}`);

  // Extract model data from table rows (skip the first row which contains headers)
  const models: ModelInfo[] = [];

  table.find('tr').each((rowIndex, rowElement) => {
    if (rowIndex === 0) return; // Skip header row
    
    const cells = $(rowElement).find('td');

    if (cells.length < 2) {
      return; // Skip incomplete rows
    }

    // First cell contains the model name (and possibly API ID for Google models)
    const modelCellHtml = $(cells[0]).html() || '';
    const modelCellText = $(cells[0]).text().trim();
    
    // Extract model name - remove API ID if present (in parentheses with <code> tag)
    let modelName = modelCellText;
    const codeElement = $(cells[0]).find('code');
    if (codeElement.length > 0) {
      const apiId = codeElement.text().trim();
      // Remove the API ID part (in parentheses) from the full text
      modelName = modelCellText.replace(`(${apiId})`, '').trim();
    }

    if (!modelName) {
      return; // Skip rows without model name
    }

    // Extract availability for each region
    const regionAvailability = regions.map((region, regionIndex) => {
      const cellIndex = regionIndex + 1; // +1 to skip Model column
      const cell = $(cells[cellIndex]);

      // Check if the cell contains the availability indicator
      const hasCompareYes = cell.find('span.compare-yes').length > 0;
      const available = hasCompareYes;

      return {
        region: region.code,
        available,
        deploymentTypes: [], // GCP docs don't provide deployment type details
      };
    });

    // Create model entry
    const modelInfo: ModelInfo = {
      name: modelName,
      source,
      url: getGCPModelUrl(modelName, regionAvailability),
      regions: regionAvailability,
    };

    models.push(modelInfo);
  });

  return models;
}

/**
 * Scrapes Google Vertex AI model-region availability from public documentation.
 * Parses three main categories: Google Cloud models, Partner models, and Open models.
 */
export async function scrapeGCPVertexAI(): Promise<ModelRegionData> {
  console.log('🔍 Fetching Google Vertex AI documentation...');

  // Fetch the HTML page
  const response = await axios.get(GCP_VERTEX_AI_URL, { 
    httpsAgent,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  const $ = cheerio.load(response.data);

  console.log('📄 Parsing HTML...');

  const allModels: ModelInfo[] = [];
  const allRegionCodes = new Set<string>();

  // Process each category
  for (const { id, source } of CATEGORIES) {
    console.log(`\n📦 Processing category: "${source}"`);
    
    // Find the section by its h3 header ID
    const categoryHeader = $(`h3#${id}`);
    if (categoryHeader.length === 0) {
      console.warn(`   ⚠️ Category header #${id} not found — skipping "${source}"`);
      continue;
    }

    // Tables are nested inside a <div class="ds-selector-tabs"> container
    // which comes after the category header as a sibling
    let currentElement = categoryHeader;
    const categoryTables: cheerio.Cheerio<any>[] = [];
    
    // Navigate siblings to find the ds-selector-tabs div
    while (currentElement.length > 0) {
      currentElement = currentElement.next();
      
      if (currentElement.length === 0) break;
      
      // Stop if we hit another h3 category header
      if (currentElement.is('h3') && currentElement.attr('id')?.startsWith('ml-processing-')) {
        break;
      }
      
      // Look for the tabbed container
      if (currentElement.hasClass('ds-selector-tabs') || currentElement.find('.ds-selector-tabs').length > 0) {
        const tabContainer = currentElement.hasClass('ds-selector-tabs') 
          ? currentElement 
          : currentElement.find('.ds-selector-tabs').first();
        
        // Find all tables inside the tab container
        tabContainer.find('table').each((_i, tableEl) => {
          categoryTables.push($(tableEl));
        });
        
        break; // Found the container, no need to continue
      }
    }

    console.log(`   Found ${categoryTables.length} tables for "${source}"`);

    // Parse each table
    let modelCount = 0;
    for (const table of categoryTables) {
      const tableModels = parseTable($, table, source);
      
      // Track regions
      for (const model of tableModels) {
        for (const regionInfo of model.regions) {
          allRegionCodes.add(regionInfo.region);
        }
      }
      
      allModels.push(...tableModels);
      modelCount += tableModels.length;
    }

    console.log(`   ✅ Parsed ${modelCount} models from "${source}"`);
  }

  console.log(`\n🔄 Deduplicating models (models may appear in multiple tabs)...`);
  
  // Deduplicate models by name - merge region availability from all instances
  const modelMap = new Map<string, ModelInfo>();
  
  for (const model of allModels) {
    const existing = modelMap.get(model.name);
    
    if (!existing) {
      // First time seeing this model - add it
      modelMap.set(model.name, model);
    } else {
      // Model already exists - merge region availability
      // A region is available if it's available in ANY of the duplicate instances
      for (const regionInfo of model.regions) {
        const existingRegionIndex = existing.regions.findIndex(r => r.region === regionInfo.region);
        
        if (existingRegionIndex >= 0) {
          const existingRegion = existing.regions[existingRegionIndex];
          
          if (!existingRegion) continue; // Should never happen but satisfies TypeScript
          
          // Merge: available if either says yes
          if (regionInfo.available && !existingRegion.available) {
            existingRegion.available = true;
            existingRegion.deploymentTypes = [...new Set([...existingRegion.deploymentTypes, ...regionInfo.deploymentTypes])];
          } else if (regionInfo.available && existingRegion.available) {
            // Both available - merge deployment types
            existingRegion.deploymentTypes = [...new Set([...existingRegion.deploymentTypes, ...regionInfo.deploymentTypes])];
          }
        } else {
          // Region not in existing model - add it
          existing.regions.push(regionInfo);
        }
      }
    }
  }
  
  const deduplicatedModels = Array.from(modelMap.values());
  console.log(`   Reduced from ${allModels.length} to ${deduplicatedModels.length} unique models`);

  // Filter out models that have no available regions
  const modelsWithRegions = deduplicatedModels.filter((model) => {
    return model.regions.some((r) => r.available);
  });
  console.log(`   Filtered out ${deduplicatedModels.length - modelsWithRegions.length} models with no available regions`);

  // Normalize: ensure every model has an entry for every region
  const regionList = Array.from(allRegionCodes).sort();
  
  const normalizedModels = modelsWithRegions.map((model) => {
    const existingRegions = new Map(model.regions.map((r) => [r.region, r]));
    
    const normalizedRegions = regionList.map((region) => {
      const existing = existingRegions.get(region);
      return {
        region,
        available: existing?.available ?? false,
        deploymentTypes: existing?.deploymentTypes ?? [],
      };
    });
    
    return {
      ...model,
      regions: normalizedRegions,
      // Regenerate URL based on normalized regions
      url: getGCPModelUrl(model.name, normalizedRegions),
    };
  });

  console.log(`\n📊 Total models combined: ${normalizedModels.length}`);
  console.log(`📍 Total regions: ${regionList.length}`);

  // Create the final data structure
  const data: ModelRegionData = {
    provider: 'Google Vertex AI',
    lastUpdated: new Date().toISOString(),
    models: normalizedModels,
  };

  return data;
}

/**
 * Main execution: Scrape and save Google Vertex AI data
 */
async function main() {
  try {
    const data = await scrapeGCPVertexAI();

    // Save to JSON file
    const outputPath = './data/gcp-models.json';
    writeFileSync(outputPath, JSON.stringify(data, null, 2));

    console.log(`\n✅ Data saved to ${outputPath}`);
    console.log(`📊 Total models: ${data.models.length}`);
    console.log(`📍 Total regions: ${data.models[0]?.regions.length || 0}`);

    // Show sample statistics by category
    const categoryCounts = new Map<string, number>();
    data.models.forEach((model) => {
      const source = model.source || 'unknown';
      categoryCounts.set(source, (categoryCounts.get(source) || 0) + 1);
    });

    console.log('\n📦 Models by category:');
    for (const [category, count] of categoryCounts.entries()) {
      console.log(`   ${category}: ${count} models`);
    }

    // Show top 5 regions with most models
    const regionCounts = new Map<string, number>();
    data.models.forEach((model) => {
      model.regions.forEach((r) => {
        if (r.available) {
          regionCounts.set(r.region, (regionCounts.get(r.region) || 0) + 1);
        }
      });
    });

    const topRegions = Array.from(regionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    console.log('\n🏆 Top 5 regions with most models:');
    topRegions.forEach(([region, count]) => {
      const percentage = ((count / data.models.length) * 100).toFixed(1);
      console.log(`   ${region}: ${count}/${data.models.length} (${percentage}%)`);
    });

    // Show first 5 models
    console.log('\n🔝 First 5 models:');
    data.models.slice(0, 5).forEach((model, i) => {
      const availableCount = model.regions.filter((r) => r.available).length;
      console.log(`   ${i + 1}. ${model.name} [${model.source}]: ${availableCount} regions`);
    });
  } catch (error) {
    console.error('❌ Error scraping Google Vertex AI data:', error);
    process.exit(1);
  }
}

// Run if executed directly
main();
