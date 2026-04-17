import axios from 'axios';
import * as cheerio from 'cheerio';
import * as https from 'https';
import { writeFileSync } from 'fs';
import * as path from 'path';
import type { ModelRegionData, ModelInfo } from '../types/index.js';
import { getOpenAIModelUrl } from '../utils/openai-model-urls.js';

const OPENAI_MODELS_URL = 'https://developers.openai.com/api/docs/models';

/**
 * HTTPS agent that tolerates corporate TLS inspection.
 */
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

/**
 * Parse OpenAI models page and extract GPT-5.x models.
 * Returns ModelInfo array with global region availability.
 */
async function scrapeOpenAIModels(): Promise<ModelRegionData> {
  console.log('🔍 Fetching OpenAI models documentation...');
  
  const response = await axios.get(OPENAI_MODELS_URL, {
    httpsAgent,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  
  const $ = cheerio.load(response.data);
  console.log('📄 Parsing HTML for GPT-5.x models...');
  
  const models: ModelInfo[] = [];
  const modelNames = new Set<string>(); // Track unique model names
  
  // Strategy: Find all model cards/sections in the "Frontier models" section
  // Look for elements containing "Model ID" and extract relevant data
  
  // Try to find model cards by searching for common patterns
  $('a[href*="/models/gpt-5"]').each((_index, element) => {
    const $card = $(element).closest('div').parent();
    const modelName = $(element).attr('href')?.split('/models/')[1] || '';
    
    if (!modelName || !modelName.startsWith('gpt-5') || modelNames.has(modelName)) {
      return; // skip if not GPT-5.x or already processed
    }
    
    modelNames.add(modelName);
    console.log(`   ✓ Found model: ${modelName}`);
    
    // Try to extract additional info from the card
    const cardText = $card.text();
    
    // Extract knowledge cutoff (pattern: "Knowledge cutoff" followed by date)
    let knowledgeCutoff: string | undefined;
    const cutoffMatch = cardText.match(/Knowledge cutoff[:\s]+([A-Za-z]+\s+\d+,\s+\d{4})/i);
    if (cutoffMatch) {
      knowledgeCutoff = cutoffMatch[1];
    }
    
    // Determine version from model name
    const versionMatch = modelName.match(/gpt-([\d.]+(?:-\w+)?)/);
    const version = versionMatch ? versionMatch[1] : undefined;
    
    const modelInfo: ModelInfo = {
      name: modelName,
      url: getOpenAIModelUrl(modelName),
      regions: [
        {
          region: 'global',
          available: true,
          deploymentTypes: [],
        },
      ],
    };
    
    if (version) modelInfo.version = version;
    if (knowledgeCutoff) modelInfo.knowledgeCutoff = knowledgeCutoff;
    
    models.push(modelInfo);
  });
  
  // Fallback: If no models found via links, manually add known GPT-5.x models
  if (models.length === 0) {
    console.warn('⚠️  No models found via automatic parsing. Using fallback list.');
    
    const fallbackModels = [
      { name: 'gpt-5.4', version: '5.4', cutoff: 'Aug 31, 2025' },
      { name: 'gpt-5.4-mini', version: '5.4-mini', cutoff: 'Aug 31, 2025' },
      { name: 'gpt-5.4-nano', version: '5.4-nano', cutoff: 'Aug 31, 2025' },
    ];
    
    for (const { name, version, cutoff } of fallbackModels) {
      models.push({
        name,
        version,
        knowledgeCutoff: cutoff,
        url: getOpenAIModelUrl(name),
        regions: [
          {
            region: 'global',
            available: true,
            deploymentTypes: [],
          },
        ],
      });
    }
  }
  
  console.log(`✅ Extracted ${models.length} GPT-5.x models`);
  
  return {
    provider: 'OpenAI',
    lastUpdated: new Date().toISOString(),
    models,
  };
}

/**
 * Main entry point - scrapes OpenAI models and saves to JSON.
 */
async function main() {
  console.log('🚀 Starting OpenAI model scraper...\n');
  
  const data = await scrapeOpenAIModels();
  
  const outputPath = path.join(process.cwd(), 'data', 'openai-models.json');
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
