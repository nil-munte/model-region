import * as fs from 'fs';
import * as path from 'path';
import type { ModelRegionData } from '../types/index.js';

// Get command line arguments
const args = process.argv.slice(2);

// Determine which provider to query
let provider = 'azure'; // default
const validProviders = ['azure', 'aws', 'azure-databricks', 'gcp'];
if (args[0] && validProviders.includes(args[0].toLowerCase())) {
  provider = args.shift()!.toLowerCase();
}

// Load the appropriate data file
const dataPath = path.join(process.cwd(), 'data', `${provider}-models.json`);
if (!fs.existsSync(dataPath)) {
  console.log(`❌ Data file not found: ${dataPath}`);
  console.log(`\nPlease run: npm run scrape:${provider}`);
  process.exit(1);
}

const data: ModelRegionData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

if (args.length === 0) {
  console.log('🔍 Model-Region Query Tool\n');
  console.log('Usage:');
  console.log('  npm run query [provider] <command> <args>    # Query provider data\n');
  console.log('Providers: azure, aws, azure-databricks, gcp (default: azure)\n');
  console.log('Commands:');
  console.log('  region <region-name>    # Find models in a region');
  console.log('  model <model-name>      # Find regions for a model');
  console.log('  stats                   # Show statistics\n');
  console.log('Examples:');
  console.log('  npm run query region eastus2              # Azure by default');
  console.log('  npm run query azure model gpt-4o');
  console.log('  npm run query aws region us-east-1');
  console.log('  npm run query azure-databricks model claude');
  console.log('  npm run query gcp region us-multi-region');
  console.log('  npm run query gcp stats');
  process.exit(0);
}

const command = args[0]?.toLowerCase();
const query = args.slice(1).join(' ').toLowerCase();

switch (command) {
  case 'region': {
    if (!query) {
      console.log('❌ Please specify a region name');
      console.log('Available regions:', data.models[0]?.regions.map((r: any) => r.region).join(', '));
      process.exit(1);
    }

    const modelsInRegion = data.models.filter((model: any) =>
      model.regions.some((r: any) => r.region.toLowerCase().includes(query) && r.available)
    );

    const matchingRegion = data.models[0]?.regions.find((r: any) => 
      r.region.toLowerCase().includes(query)
    );

    console.log(`\n🌍 Models available in "${matchingRegion?.region || query}":\n`);
    console.log(`Found ${modelsInRegion.length} models:\n`);
    
    modelsInRegion.forEach((model: any, i: number) => {
      const sourceTag = model.source ? ` [${model.source}]` : '';
      console.log(`${i + 1}. ${model.name}${sourceTag}`);
    });
    break;
  }

  case 'model': {
    if (!query) {
      console.log('❌ Please specify a model name');
      process.exit(1);
    }

    const matchingModels = data.models.filter((m: any) =>
      m.name.toLowerCase().includes(query)
    );

    if (matchingModels.length === 0) {
      console.log(`❌ No models found matching "${query}"`);
      console.log('\nTry searching for: gpt-4, gpt-5, o3, o4, codex, etc.');
      process.exit(1);
    }

    console.log(`\n🤖 Found ${matchingModels.length} model(s) matching "${query}":\n`);

    matchingModels.forEach((model: any) => {
      const availableRegions = model.regions.filter((r: any) => r.available);
      const percentage = ((availableRegions.length / model.regions.length) * 100).toFixed(1);
      const sourceTag = model.source ? ` [${model.source}]` : '';
      
      console.log(`📦 ${model.name}${sourceTag}`);
      console.log(`   Available in: ${availableRegions.length}/${model.regions.length} regions (${percentage}%)`);
      console.log(`   Regions: ${availableRegions.map((r: any) => r.region).join(', ')}\n`);
    });
    break;
  }

  case 'stats': {
    const totalModels = data.models.length;
    const totalRegions = data.models[0]?.regions.length || 0;

    console.log(`\n📊 ${data.provider} Statistics\n`);
    console.log('=' .repeat(60));
    console.log(`Total Models: ${totalModels}`);
    console.log(`Total Regions: ${totalRegions}\n`);

    // Most available models
    const byAvailability = data.models
      .map((model: any) => ({
        name: model.name,
        count: model.regions.filter((r: any) => r.available).length
      }))
      .sort((a: any, b: any) => b.count - a.count);

    console.log('🌟 Top 5 Most Available Models:');
    byAvailability.slice(0, 5).forEach((m: any, i: number) => {
      const sourceTag = data.models.find((dm: any) => dm.name === m.name)?.source;
      const tag = sourceTag ? ` [${sourceTag}]` : '';
      console.log(`   ${i + 1}. ${m.name}${tag} (${m.count} regions)`);
    });

    console.log('\n💎 Top 5 Most Exclusive Models:');
    const exclusive = byAvailability
      .filter((m: any) => m.count > 0)
      .sort((a: any, b: any) => a.count - b.count);
    
    exclusive.slice(0, 5).forEach((m: any, i: number) => {
      const sourceTag = data.models.find((dm: any) => dm.name === m.name)?.source;
      const tag = sourceTag ? ` [${sourceTag}]` : '';
      console.log(`   ${i + 1}. ${m.name}${tag} (only ${m.count} region${m.count > 1 ? 's' : ''})`);
    });

    // Region statistics
    console.log('\n📍 Top 5 Regions (by model count):');
    const regionStats = new Map();
    
    data.models.forEach((model: any) => {
      model.regions.forEach((r: any) => {
        if (r.available) {
          regionStats.set(r.region, (regionStats.get(r.region) || 0) + 1);
        }
      });
    });

    const sortedRegions = Array.from(regionStats.entries())
      .sort((a: any, b: any) => b[1] - a[1]);

    sortedRegions.slice(0, 5).forEach(([region, count]: any, i: number) => {
      console.log(`   ${i + 1}. ${region} (${count} models)`);
    });

    console.log('\n' + '=' .repeat(60));
    break;
  }

  default:
    console.log(`❌ Unknown command: ${command}`);
    console.log('Valid commands: region, model, stats');
    process.exit(1);
}
