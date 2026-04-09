/**
 * Validates scraped data integrity
 * Run with: npm run validate-data
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface ModelRegionData {
  provider: string;
  lastUpdated: string;
  models: Array<{
    name: string;
    regions: Array<{
      region: string;
      available: boolean;
    }>;
  }>;
}

const dataDir = join(process.cwd(), 'data');
const files = readdirSync(dataDir).filter(f => f.endsWith('-models.json'));

let hasErrors = false;

console.log('🔍 Validating scraped data...\n');

for (const file of files) {
  const filePath = join(dataDir, file);
  console.log(`📄 Checking ${file}...`);
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const data: ModelRegionData = JSON.parse(content);
    
    // Check required fields
    if (!data.provider) {
      console.error(`  ❌ Missing 'provider' field`);
      hasErrors = true;
    }
    
    if (!data.lastUpdated) {
      console.error(`  ❌ Missing 'lastUpdated' field`);
      hasErrors = true;
    } else {
      // Check if lastUpdated is recent (for scheduled runs)
      const lastUpdated = new Date(data.lastUpdated);
      const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      
      if (process.env.GITHUB_EVENT_NAME === 'schedule' && daysSinceUpdate > 1) {
        console.error(`  ⚠️  Data is ${daysSinceUpdate.toFixed(1)} days old (expected fresh data on scheduled run)`);
        hasErrors = true;
      } else {
        console.log(`  ✅ Updated ${daysSinceUpdate.toFixed(1)} days ago`);
      }
    }
    
    if (!data.models || !Array.isArray(data.models)) {
      console.error(`  ❌ Missing or invalid 'models' array`);
      hasErrors = true;
    } else {
      console.log(`  ✅ ${data.models.length} models found`);
      
      if (data.models.length === 0) {
        console.error(`  ❌ No models in dataset`);
        hasErrors = true;
      } else if (data.models.length > 0) {
        // Sample check first model
        const model = data.models[0]!;
        if (!model.name || !model.regions || !Array.isArray(model.regions)) {
          console.error(`  ❌ Invalid model structure`);
          hasErrors = true;
        } else {
          const regionCount = new Set(model.regions.map(r => r.region)).size;
          console.log(`  ✅ ${regionCount} unique regions`);
        }
      }
    }
    
    console.log(`  ✅ ${file} is valid\n`);
    
  } catch (error: any) {
    console.error(`  ❌ Failed to validate: ${error.message}\n`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('❌ Data validation failed!');
  process.exit(1);
} else {
  console.log('✅ All data files are valid!');
  process.exit(0);
}
