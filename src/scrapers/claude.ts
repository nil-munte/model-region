import axios from 'axios';
import * as cheerio from 'cheerio';
import * as https from 'https';
import { writeFileSync } from 'fs';
import * as path from 'path';
import type { ModelRegionData, ModelInfo } from '../types/index.js';
import { getClaudeModelUrl } from '../utils/claude-model-urls.js';

const CLAUDE_MODELS_URL = 'https://platform.claude.com/docs/en/about-claude/models/overview';

/**
 * HTTPS agent that tolerates corporate TLS inspection.
 */
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

/**
 * Parse Claude models page and extract Claude 4.5+ models.
 * Returns ModelInfo array with global region availability.
 */
async function scrapeClaudeModels(): Promise<ModelRegionData> {
  console.log('🔍 Fetching Claude models documentation...');
  
  const response = await axios.get(CLAUDE_MODELS_URL, {
    httpsAgent,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  
  const $ = cheerio.load(response.data);
  console.log('📄 Parsing HTML for Claude 4.5+ models...');
  
  const models: ModelInfo[] = [];
  
  // Strategy: Look for table rows containing Claude model information
  // Target: "Latest models comparison" table with columns for each model
  
  // Find table with "Claude API ID" header
  const tables = $('table');
  let parsedFromTable = false;
  
  tables.each((_index, tableEl) => {
    const table = $(tableEl);
    const tableText = table.text();
    
    if (!tableText.includes('Claude API ID') || !tableText.includes('Claude Opus')) {
      return; // continue to next table
    }
    
    console.log('   ✓ Found "Latest models comparison" table');
    parsedFromTable = true;
    
    // Extract column headers (model names)
    const headers: string[] = [];
    table.find('thead tr th').each((_i: number, th: any) => {
      const headerText = $(th).text().trim();
      if (headerText.includes('Claude Opus') || headerText.includes('Claude Sonnet') || headerText.includes('Claude Haiku')) {
        headers.push(headerText);
      }
    });
    
    console.log(`   ✓ Found ${headers.length} model columns: ${headers.join(', ')}`);
    
    // Extract data rows
    const rowData: Record<string, string[]> = {};
    
    table.find('tbody tr').each((_i: number, row: any) => {
      const cells = $(row).find('td');
      if (cells.length === 0) return;
      
      const rowLabel = $(cells[0]).text().trim();
      const values: string[] = [];
      
      cells.slice(1).each((_ci: number, cell: any) => {
        values.push($(cell).text().trim());
      });
      
      rowData[rowLabel] = values;
    });
    
    // Parse each model column
    headers.forEach((modelDisplayName, colIndex) => {
      // Extract model ID from row data
      const apiIdRow = rowData['Claude API ID'];
      const cutoffRow = rowData['Reliable knowledge cutoff'];
      
      if (!apiIdRow || colIndex >= apiIdRow.length) return;
      
      const modelId = apiIdRow[colIndex];
      const knowledgeCutoff = cutoffRow && colIndex < cutoffRow.length ? cutoffRow[colIndex] : undefined;
      
      // Filter: only Claude 4.5+ models
      if (!modelId || !modelId.includes('claude-')) return;
      
      // Extract version number
      const versionMatch = modelId.match(/claude-(?:opus|sonnet|haiku)-([\d.-]+)/);
      if (!versionMatch || !versionMatch[1]) return;
      
      const versionStr = versionMatch[1];
      
      // Parse major.minor version (e.g., "4-7" -> 4.7, "4-5-20251001" -> 4.5)
      const versionParts = versionStr.split('-');
      const majorMinor = versionParts.slice(0, 2).join('.');
      const majorVersion = parseFloat(majorMinor);
      
      // Filter: only 4.5+ (Haiku 4.5, Sonnet 4.6, Opus 4.7)
      if (majorVersion < 4.5) {
        console.log(`   ⊘ Skipping ${modelId} (version ${majorMinor} < 4.5)`);
        return;
      }
      
      console.log(`   ✓ Adding model: ${modelId} (${modelDisplayName})`);
      
      const modelInfo: ModelInfo = {
        name: modelId,
        url: getClaudeModelUrl(modelId),
        regions: [
          {
            region: 'global',
            available: true,
            deploymentTypes: [],
          },
        ],
      };
      
      if (versionStr) modelInfo.version = versionStr;
      if (knowledgeCutoff) modelInfo.knowledgeCutoff = knowledgeCutoff;
      
      models.push(modelInfo);
    });
    
    return false; // break - we found our table
  });
  
  // Fallback: If no models found via automatic parsing, manually add known Claude 4.5+ models
  if (!parsedFromTable || models.length === 0) {
    console.warn('⚠️  No models found via automatic parsing. Using fallback list.');
    
    const fallbackModels = [
      { name: 'claude-opus-4-7', version: '4.7', cutoff: 'Jan 2026' },
      { name: 'claude-sonnet-4-6', version: '4.6', cutoff: 'Aug 2025' },
      { name: 'claude-haiku-4-5-20251001', version: '4.5', cutoff: 'Feb 2025' },
    ];
    
    for (const { name, version, cutoff } of fallbackModels) {
      const modelInfo: ModelInfo = {
        name,
        url: getClaudeModelUrl(name),
        source: 'Anthropic Direct API',
        regions: [
          {
            region: 'global',
            available: true,
            deploymentTypes: [],
          },
        ],
      };
      
      if (version) modelInfo.version = version;
      if (cutoff) modelInfo.knowledgeCutoff = cutoff;
      
      models.push(modelInfo);
    }
  }
  
  console.log(`✅ Extracted ${models.length} Claude 4.5+ models`);
  
  return {
    provider: 'Claude',
    lastUpdated: new Date().toISOString(),
    models,
  };
}

/**
 * Main entry point - scrapes Claude models and saves to JSON.
 */
async function main() {
  console.log('🚀 Starting Claude model scraper...\n');
  
  const data = await scrapeClaudeModels();
  
  const outputPath = path.join(process.cwd(), 'data', 'claude-models.json');
  writeFileSync(outputPath, JSON.stringify(data, null, 2));
  
  console.log(`\n💾 Data saved to: ${outputPath}`);
  console.log(`📊 Total models: ${data.models.length}`);
  
  if (data.models.length > 0) {
    console.log(`\n📋 Models extracted:`);
    data.models.forEach((model, i) => {
      const cutoffInfo = model.knowledgeCutoff ? ` (cutoff: ${model.knowledgeCutoff})` : '';
      console.log(`   ${i + 1}. ${model.name}${cutoffInfo}`);
    });
  }
}

main();
