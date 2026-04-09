import * as fs from 'fs';
import * as path from 'path';
import type { ModelRegionData, ModelInfo } from '../types/index.js';

// Load the scraped Azure data
const dataPath = path.join(process.cwd(), 'data', 'azure-models.json');
const data: ModelRegionData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

console.log('🧪 Testing Azure Model-Region Data\n');
console.log('=' .repeat(60));

// Test 0: Validate data structure
console.log('\n🔍 VALIDATION: Checking data structure\n');

let validationErrors = 0;

// Check that all models have deploymentTypes field
data.models.forEach((model, i) => {
  model.regions.forEach((region, j) => {
    if (!Array.isArray(region.deploymentTypes)) {
      console.log(`❌ ERROR: Model ${i} (${model.name}), Region ${j} (${region.region}) missing deploymentTypes array`);
      validationErrors++;
    }
    
    // Check consistency: available should be true when deploymentTypes.length > 0
    if (region.available && region.deploymentTypes.length === 0) {
      console.log(`⚠️  WARNING: Model ${model.name}, Region ${region.region} marked available but has no deployment types`);
    }
    
    if (!region.available && region.deploymentTypes.length > 0) {
      console.log(`⚠️  WARNING: Model ${model.name}, Region ${region.region} marked unavailable but has deployment types: ${region.deploymentTypes.join(', ')}`);
    }
  });
});

if (validationErrors === 0) {
  console.log('✅ All region entries have deploymentTypes array');
  
  // Collect all unique deployment types
  const allDeploymentTypes = new Set<string>();
  data.models.forEach(model => {
    model.regions.forEach(region => {
      region.deploymentTypes.forEach(dt => allDeploymentTypes.add(dt));
    });
  });
  
  console.log(`✅ Found ${allDeploymentTypes.size} unique deployment types:`);
  Array.from(allDeploymentTypes).sort().forEach(dt => {
    console.log(`   - ${dt}`);
  });
} else {
  console.log(`\n❌ Found ${validationErrors} validation errors`);
  process.exit(1);
}

// Test 1: Show all models
console.log('\n' + '=' .repeat(60));
console.log(`\n📊 Total Models: ${data.models.length}`);
console.log(`🏢 Provider: ${data.provider}`);

// Test 2: Show all regions
if (data.models.length > 0) {
  const allRegions = data.models[0].regions.map(r => r.region);
  console.log(`📍 Total Regions: ${allRegions.length}`);
  console.log(`\nAvailable Regions:`);
  allRegions.forEach((region, i) => {
    if (i < 10) console.log(`   ${i + 1}. ${region}`);
  });
  if (allRegions.length > 10) {
    console.log(`   ... and ${allRegions.length - 10} more`);
  }
}

// Test 3: Find models available in a specific region
console.log('\n' + '=' .repeat(60));
console.log('\n🔍 TEST: Which models are available in "eastus2"?\n');

const region = 'eastus2';
const modelsInEastUS2 = data.models.filter(model => 
  model.regions.some(r => r.region === region && r.available)
);

console.log(`Found ${modelsInEastUS2.length} models available in ${region}:`);
modelsInEastUS2.slice(0, 10).forEach((model, i) => {
  const regionData = model.regions.find(r => r.region === region);
  const dtypes = regionData?.deploymentTypes.join(', ') || 'none';
  console.log(`   ${i + 1}. ${model.name}`);
  console.log(`      → Deployment types: ${dtypes}`);
});
if (modelsInEastUS2.length > 10) {
  console.log(`   ... and ${modelsInEastUS2.length - 10} more`);
}

// Test 4: Find which regions have a specific model
console.log('\n' + '=' .repeat(60));
console.log('\n🔍 TEST: Where is "gpt-4o" available?\n');

const targetModel = data.models.find(m => 
  m.name.toLowerCase().includes('gpt-4o') && 
  m.name.toLowerCase().includes('2024-11-20')
);

if (targetModel) {
  const availableRegions = targetModel.regions.filter(r => r.available);
  console.log(`Model: ${targetModel.name}`);
  console.log(`Available in ${availableRegions.length} regions:`);
  availableRegions.forEach((region, i) => {
    if (i < 15) console.log(`   ${i + 1}. ${region.region}`);
  });
  if (availableRegions.length > 15) {
    console.log(`   ... and ${availableRegions.length - 15} more`);
  }
} else {
  console.log('Model not found');
}

// Test 5: Compare model availability across regions
console.log('\n' + '=' .repeat(60));
console.log('\n🔍 TEST: Compare GPT-5 models availability\n');

const gpt5Models = data.models.filter(m => 
  m.name.toLowerCase().startsWith('gpt-5') && 
  !m.name.includes('2025') && !m.name.includes('2026')
);

console.log('GPT-5 Series Models:');
gpt5Models.slice(0, 10).forEach(model => {
  const availableCount = model.regions.filter(r => r.available).length;
  const percentage = ((availableCount / model.regions.length) * 100).toFixed(1);
  console.log(`   ${model.name}`);
  console.log(`     → ${availableCount}/${model.regions.length} regions (${percentage}%)`);
});

// Test 6: Find most widely available models
console.log('\n' + '=' .repeat(60));
console.log('\n🔍 TEST: Most widely available models\n');

const modelsByAvailability = data.models
  .map(model => ({
    name: model.name,
    availableRegions: model.regions.filter(r => r.available).length,
    totalRegions: model.regions.length,
    percentage: ((model.regions.filter(r => r.available).length / model.regions.length) * 100).toFixed(1)
  }))
  .sort((a, b) => b.availableRegions - a.availableRegions);

console.log('Top 10 Most Available Models:');
modelsByAvailability.slice(0, 10).forEach((model, i) => {
  console.log(`   ${i + 1}. ${model.name}`);
  console.log(`      → ${model.availableRegions}/${model.totalRegions} regions (${model.percentage}%)`);
});

// Test 7: Find least available (exclusive) models
console.log('\n' + '=' .repeat(60));
console.log('\n🔍 TEST: Most exclusive models (limited availability)\n');

const exclusiveModels = modelsByAvailability
  .filter(m => m.availableRegions > 0)
  .sort((a, b) => a.availableRegions - b.availableRegions);

console.log('Top 10 Most Exclusive Models:');
exclusiveModels.slice(0, 10).forEach((model, i) => {
  console.log(`   ${i + 1}. ${model.name}`);
  console.log(`      → Only ${model.availableRegions} region${model.availableRegions > 1 ? 's' : ''} (${model.percentage}%)`);
  
  // Show which regions
  const originalModel = data.models.find(m => m.name === model.name);
  if (originalModel) {
    const regions = originalModel.regions
      .filter(r => r.available)
      .map(r => r.region)
      .join(', ');
    console.log(`      → Regions: ${regions}`);
  }
});

console.log('\n' + '=' .repeat(60));
console.log('\n✅ All tests completed successfully!\n');
