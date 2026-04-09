#!/usr/bin/env tsx
/**
 * Validate that all model URLs return successful HTTP responses.
 * Usage: npm run validate-urls [provider]
 * 
 * Examples:
 *   npm run validate-urls azure
 *   npm run validate-urls gcp
 *   npm run validate-urls all
 */

import axios from 'axios';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  total: number;
  withUrls: number;
  working: number;
  broken: number;
  brokenUrls: Array<{ model: string; url: string; error: string }>;
}

async function validateUrls(provider: string): Promise<ValidationResult> {
  const dataPath = join(process.cwd(), 'data', `${provider}-models.json`);
  const data = JSON.parse(readFileSync(dataPath, 'utf-8'));
  
  const results: ValidationResult = {
    total: 0,
    withUrls: 0,
    working: 0,
    broken: 0,
    brokenUrls: [],
  };
  
  console.log(`\n🔍 Validating URLs for ${provider}...`);
  
  for (const model of data.models) {
    results.total++;
    
    if (!model.url) continue;
    results.withUrls++;
    
    try {
      const response = await axios.head(model.url, { 
        timeout: 5000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500, // Accept redirects
      });
      
      if (response.status === 200 || response.status === 301 || response.status === 302) {
        results.working++;
      } else {
        results.broken++;
        results.brokenUrls.push({
          model: model.name,
          url: model.url,
          error: `HTTP ${response.status}`,
        });
      }
    } catch (error: any) {
      results.broken++;
      results.brokenUrls.push({
        model: model.name,
        url: model.url,
        error: error.message,
      });
    }
  }
  
  return results;
}

function printResults(provider: string, results: ValidationResult) {
  const coverage = results.total > 0 
    ? ((results.withUrls / results.total) * 100).toFixed(1) 
    : '0.0';
  const successRate = results.withUrls > 0
    ? ((results.working / results.withUrls) * 100).toFixed(1)
    : '0.0';
  
  console.log(`\n📊 ${provider.toUpperCase()} URL Validation Results:`);
  console.log(`   Total models: ${results.total}`);
  console.log(`   With URLs: ${results.withUrls} (${coverage}% coverage)`);
  console.log(`   Working: ${results.working} (${successRate}% success rate)`);
  console.log(`   Broken: ${results.broken}`);
  
  if (results.brokenUrls.length > 0) {
    console.log(`\n❌ Broken URLs:`);
    results.brokenUrls.forEach(({ model, url, error }) => {
      console.log(`   • ${model}`);
      console.log(`     URL: ${url}`);
      console.log(`     Error: ${error}`);
    });
  }
}

async function main() {
  const provider = process.argv[2] || 'all';
  
  if (provider === 'all') {
    // Find all *-models.json files in data/
    const dataDir = join(process.cwd(), 'data');
    const files = readdirSync(dataDir).filter(f => f.endsWith('-models.json'));
    
    for (const file of files) {
      const providerName = file.replace('-models.json', '');
      const results = await validateUrls(providerName);
      printResults(providerName, results);
    }
  } else {
    const results = await validateUrls(provider);
    printResults(provider, results);
  }
}

main().catch(console.error);
