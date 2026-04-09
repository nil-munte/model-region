---
name: model-link-scraping
description: Improve the quality and specificity of model documentation links across all cloud providers. Provides strategies for finding, extracting, and validating deep-links to individual model documentation pages.
---

# Model Link Scraping Skill

## Purpose
Improve the quality and specificity of model documentation links across all cloud providers. This skill provides strategies for finding, extracting, and validating deep-links to individual model documentation pages, enabling users to quickly navigate from the dashboard to detailed model information on each provider's website.

## Core Principle
**Every model should link to the most specific documentation page possible** - ideally a dedicated page or section for that exact model, not a general overview page.

## Current State Analysis

### Providers Ranked by Link Specificity

1. ✅ **Azure Databricks** (Best)
   - Status: Model-specific anchor links
   - Example: `#claude-sonnet-4-6`, `#gemini-2-0-flash-001`
   - Quality: Each model links to its own section

2. ⚠️ **Azure Foundry** (Good)
   - Status: Family-level anchor links
   - Example: `#gpt-54` (covers gpt-4o, gpt-4o-mini, etc.)
   - Quality: Multiple models share the same family section

3. ⚠️ **Google Vertex AI** (Moderate)
   - Status: Region-level section links
   - Example: `#europe_1`, `#multi-region`
   - Quality: Shows availability but not model-specific documentation
   - Opportunity: Individual model pages exist but are not linked

4. ❌ **AWS Bedrock** (Poor)
   - Status: Single page for all models
   - Example: Same URL for every model
   - Quality: No differentiation between models
   - Opportunity: Model-specific pages may exist in documentation

## Improvement Strategy

### Phase 1: Investigate Provider Documentation Structure

For each provider, answer these questions:

1. **Do individual model pages exist?**
   - Navigate the documentation site manually
   - Look for model-specific URLs in the navigation
   - Check if anchor IDs exist in the HTML

2. **What is the URL pattern?**
   - Model name in URL: `/models/{model-name}`
   - Model ID in URL: `/model/{model-id}`
   - Anchor-based: `#model-family`
   - Version-based: `/v1/models/{name}`

3. **How stable are the URLs?**
   - Do they change between documentation updates?
   - Are model names normalized (lowercase, hyphens, etc.)?
   - Do old URLs redirect to new ones?

4. **Are links available in the source HTML?**
   - Can we scrape them during data collection?
   - Are they in `<a>` tags with predictable structure?
   - Do table cells contain direct links?

### Phase 2: Implementation Approaches

#### Approach A: Scrape Links from HTML (Preferred)

**When to Use**: When the documentation table contains clickable links to individual models

**Advantages**:
- Most accurate - uses provider's own links
- Automatically updated when provider changes structure
- No need to maintain manual mappings

**Implementation**:
```typescript
// During table parsing
row.find('td').each((index, cell) => {
  const modelLink = $(cell).find('a').first();
  if (modelLink.length > 0) {
    const href = modelLink.attr('href');
    // Convert relative to absolute if needed
    const absoluteUrl = href.startsWith('http') 
      ? href 
      : `${baseUrl}${href.replace(/^\.\.\//, '')}`;
    model.url = absoluteUrl;
  }
});
```

**Example**: Azure Databricks currently uses this approach

#### Approach B: Pattern-Based URL Generation

**When to Use**: When documentation has predictable URL structure but links aren't in HTML

**Advantages**:
- Works even when source doesn't have clickable links
- Can generate links for new models automatically

**Disadvantages**:
- Requires maintenance when patterns change
- May break if provider restructures documentation

**Implementation**:
```typescript
// Define URL pattern
function getModelUrl(modelName: string): string {
  const normalized = modelName.toLowerCase().replace(/\s+/g, '-');
  return `https://docs.provider.com/models/${normalized}`;
}
```

**Example**: Could be used for AWS Bedrock if individual model pages exist

#### Approach C: Manual Mapping with Fallbacks

**When to Use**: When URL patterns are irregular or inconsistent

**Advantages**:
- Handles edge cases and special naming
- Can mix different URL patterns

**Disadvantages**:
- Requires manual curation
- Needs updates for new models

**Implementation**:
```typescript
const MODEL_URL_MAP: Record<string, string> = {
  'gpt-4o': 'https://docs.provider.com/gpt-4o-overview',
  'gpt-4o-mini': 'https://docs.provider.com/gpt-4-mini',
  // ...
};

function getModelUrl(modelName: string): string {
  return MODEL_URL_MAP[modelName] || DEFAULT_URL;
}
```

**Example**: Azure Foundry uses this for family-level mappings

#### Approach D: Dynamic Discovery via Web Scraping

**When to Use**: When documentation structure is complex and patterns aren't obvious

**Advantages**:
- Discovers all available links automatically
- Can adapt to documentation changes

**Disadvantages**:
- Slower - requires additional HTTP requests
- More complex to implement and maintain

**Implementation**:
```typescript
async function discoverModelUrls(baseUrl: string): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  
  // Fetch documentation index
  const response = await axios.get(baseUrl);
  const $ = cheerio.load(response.data);
  
  // Find all model links in navigation or index
  $('nav a, .model-list a').each((_, el) => {
    const href = $(el).attr('href');
    const modelName = extractModelName($(el).text());
    if (href && modelName) {
      urls.set(modelName, href);
    }
  });
  
  return urls;
}
```

## Provider-Specific Improvement Plans

### Google Vertex AI

**Current**: Links to data residency page sections (`#europe_1`, `#multi-region`)

**Opportunity**: Individual model pages exist at `/models/gemini/{version}`

**Proposed Improvement**:

1. **Investigate URL patterns**:
   - Visit https://cloud.google.com/vertex-ai/generative-ai/docs/models/
   - Document URL structure for different model types:
     - Gemini: `/models/gemini/{version}` (e.g., `/models/gemini/2-5-flash`)
     - Imagen: `/models/imagen/{version}`
     - Partner models: `/partner-models/{provider}/{model}`

2. **Create URL mapping utility**:
```typescript
// src/utils/gcp-model-urls.ts (enhanced)

const BASE_MODELS = 'https://cloud.google.com/vertex-ai/generative-ai/docs/models';
const BASE_PARTNER = 'https://cloud.google.com/vertex-ai/generative-ai/docs/partner-models';

export function getGCPModelUrl(modelName: string, source: string): string {
  const lower = modelName.toLowerCase();
  
  // Google Cloud models
  if (source.includes('Google Cloud Model')) {
    if (lower.includes('gemini')) {
      const version = extractGeminiVersion(lower);
      return `${BASE_MODELS}/gemini/${version}`;
    }
    if (lower.includes('imagen')) {
      const version = extractImagenVersion(lower);
      return `${BASE_MODELS}/imagen/${version}`;
    }
    // ... more patterns
  }
  
  // Partner models
  if (source.includes('Partner Model')) {
    if (lower.includes('claude')) {
      return `${BASE_PARTNER}/claude`;
    }
    if (lower.includes('mistral')) {
      return `${BASE_PARTNER}/mistral`;
    }
  }
  
  // Fallback to data residency page
  return getRegionBasedUrl(modelName, regions);
}
```

3. **Test and validate**:
   - Generate URLs for all models
   - Manually verify a sample works
   - Add fallback to data residency page if URL fails

**Expected Outcome**: Models link to their specific documentation pages instead of regional availability tables

### AWS Bedrock

**Current**: All models link to `models-regions.html`

**Opportunity**: Individual model pages likely exist in the Bedrock documentation

**Proposed Improvement**:

1. **Investigate AWS documentation structure**:
   - Visit https://docs.aws.amazon.com/bedrock/latest/userguide/
   - Look for model-specific pages:
     - Check navigation sidebar
     - Search for specific models (e.g., "Claude 3.5 Sonnet")
     - Document any URL patterns found

2. **Potential URL patterns to check**:
   ```
   /userguide/model-parameters-{provider}-{model}.html
   /userguide/{provider}-{model}.html
   /userguide/models/{model-id}.html
   ```

3. **If individual pages exist, create mapping**:
```typescript
// src/utils/aws-model-urls.ts (enhanced)

const BASE_URL = 'https://docs.aws.amazon.com/bedrock/latest/userguide';

const MODEL_PAGE_MAP: Record<string, string> = {
  'anthropic.claude-3-5-sonnet': `${BASE_URL}/model-parameters-anthropic-claude.html`,
  'meta.llama3-3-70b': `${BASE_URL}/model-parameters-meta.html`,
  // ... discovered mappings
};

export function getAWSModelUrl(modelId: string): string {
  return MODEL_PAGE_MAP[modelId] || `${BASE_URL}/models-regions.html`;
}
```

4. **Alternative: Scrape from source table**:
   - Check if the models-regions table has clickable model names
   - Extract `href` attributes during scraping
   - Store with model data

**Expected Outcome**: Models link to provider-specific documentation pages (e.g., Anthropic page for Claude, Meta page for Llama)

### Azure Foundry

**Current**: Family-level anchors (`#gpt-54`, `#mistral-models-sold-directly-by-azure`)

**Opportunity**: More granular model pages may exist

**Proposed Improvement**:

1. **Check for individual model pages**:
   - Navigate to https://learn.microsoft.com/en-us/azure/ai-services/openai/
   - Look for model-specific documentation
   - Example: `/concepts/models/gpt-4o` vs current `/concepts/models#gpt-54`

2. **If individual pages exist**:
```typescript
// Enhanced mapping with page URLs instead of anchors
const MODEL_PAGES: Record<string, string> = {
  'gpt-4o': `${BASE}/concepts/models/gpt-4o`,
  'gpt-4o-mini': `${BASE}/concepts/models/gpt-4o-mini`,
  'o1-preview': `${BASE}/concepts/models/o1-preview`,
};
```

3. **If not, improve anchor specificity**:
   - Check if finer-grained anchors exist (e.g., `#gpt-4o` vs `#gpt-54`)
   - Update mapping to use most specific anchor available

**Expected Outcome**: Each model variant gets its own page or more specific anchor

### Azure Databricks

**Current**: ✅ Already optimal - model-specific anchors scraped from HTML

**Maintenance**:
- Monitor for documentation structure changes
- Validate URLs periodically
- Ensure relative-to-absolute URL conversion remains correct

## Implementation Checklist

When improving links for a provider:

### Discovery Phase
- [ ] Navigate provider documentation manually
- [ ] Identify if individual model pages exist
- [ ] Document URL patterns and examples
- [ ] Check HTML source for embedded links
- [ ] Test URL stability (do old URLs redirect?)

### Planning Phase
- [ ] Choose implementation approach (A, B, C, or D)
- [ ] Design URL generation logic or scraping strategy
- [ ] Plan fallback strategy for missing/broken links
- [ ] Consider version handling (stable IDs vs versioned URLs)

### Implementation Phase
- [ ] Create/update URL utility in `src/utils/{provider}-model-urls.ts`
- [ ] Modify scraper to call URL utility or extract from HTML
- [ ] Handle edge cases (special characters, spaces, versions)
- [ ] Add comprehensive comments explaining the strategy

### Testing Phase
- [ ] Run scraper and check generated URLs
- [ ] Manually verify 10+ URLs in browser
- [ ] Test URLs for models from different categories/families
- [ ] Verify fallback URLs work
- [ ] Check that no models have missing URLs (unless intentional)

### Validation Phase
- [ ] Compare specificity to current implementation
- [ ] Ensure URLs point to correct model documentation
- [ ] Verify URLs are stable (won't break frequently)
- [ ] Document any known limitations or edge cases

## Quality Metrics

Measure improvement by:

1. **Specificity Score**:
   - 5: Model-specific page (e.g., `/models/gpt-4o`)
   - 4: Model variant page (e.g., `/models/gpt-4` covering 4o, 4-turbo, etc.)
   - 3: Family page with anchor (e.g., `/models#gpt-family`)
   - 2: Category page (e.g., `/models/text-generation`)
   - 1: Generic models page

2. **Coverage**:
   - What % of models have URLs?
   - What % link to specific pages (score 4-5)?
   - What % use generic fallbacks (score 1-2)?

3. **Accuracy**:
   - Do URLs actually work (200 response)?
   - Do they point to the correct model?
   - Are they the most direct path to model info?

## Tools and Utilities

### URL Validation Script

Create a utility to validate all generated URLs:

```typescript
// scripts/validate-model-urls.ts

import axios from 'axios';
import { readFileSync } from 'fs';

async function validateUrls(provider: string) {
  const data = JSON.parse(readFileSync(`./data/${provider}-models.json`, 'utf-8'));
  
  const results = {
    total: 0,
    withUrls: 0,
    working: 0,
    broken: 0,
  };
  
  for (const model of data.models) {
    results.total++;
    
    if (!model.url) continue;
    results.withUrls++;
    
    try {
      const response = await axios.head(model.url, { timeout: 5000 });
      if (response.status === 200) {
        results.working++;
      } else {
        results.broken++;
        console.log(`❌ ${model.name}: ${response.status}`);
      }
    } catch (error) {
      results.broken++;
      console.log(`❌ ${model.name}: ${error.message}`);
    }
  }
  
  console.log(`\n📊 ${provider} URL Validation:`);
  console.log(`   Total models: ${results.total}`);
  console.log(`   With URLs: ${results.withUrls} (${(results.withUrls/results.total*100).toFixed(1)}%)`);
  console.log(`   Working: ${results.working}`);
  console.log(`   Broken: ${results.broken}`);
}
```

### URL Pattern Discovery

Script to analyze documentation and find patterns:

```typescript
// scripts/discover-url-patterns.ts

import axios from 'axios';
import * as cheerio from 'cheerio';

async function discoverPatterns(baseUrl: string) {
  const response = await axios.get(baseUrl);
  const $ = cheerio.load(response.data);
  
  const patterns = new Map<string, number>();
  
  // Find all links that might be model-related
  $('a[href*="model"], a[href*="gpt"], a[href*="claude"], a[href*="gemini"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      // Extract pattern (replace specific values with placeholders)
      const pattern = href
        .replace(/\d+/g, '{version}')
        .replace(/[a-z0-9-]+\.html/, '{model}.html')
        .replace(/\/[a-z0-9-]+$/, '/{model}');
      
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    }
  });
  
  console.log('🔍 Discovered URL patterns:');
  Array.from(patterns.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([pattern, count]) => {
      console.log(`   ${count}x ${pattern}`);
    });
}
```

## Best Practices

1. **Prefer Scraping Over Mapping**:
   - Extract links directly from HTML when possible
   - Reduces maintenance burden
   - Automatically adapts to documentation changes

2. **Validate Before Committing**:
   - Test URLs manually in browser
   - Run automated validation script
   - Check a sample of different model types

3. **Document Your Strategy**:
   - Add comments explaining URL generation logic
   - Note any special cases or exceptions
   - Update this skill with new patterns discovered

4. **Implement Graceful Fallbacks**:
   - Always have a fallback URL (provider main docs)
   - Log when fallbacks are used
   - Return `undefined` only if no relevant page exists

5. **Consider User Experience**:
   - Specific pages > Generic overviews
   - Direct links > Pages requiring extra navigation
   - Stable URLs > Frequently changing URLs

6. **Monitor and Maintain**:
   - Periodically validate URLs still work
   - Update mappings when providers restructure
   - Keep track of provider documentation changes

## Examples of Good vs. Poor Links

### Good Links ✅

```typescript
// Azure Databricks - Model-specific section
{
  name: "databricks-claude-sonnet-4-6",
  url: "https://learn.microsoft.com/.../supported-models#claude-sonnet-4-6"
}
// User lands directly on Claude Sonnet 4.6 documentation

// Hypothetical improved GCP link
{
  name: "Gemini 2.5 Flash",
  url: "https://cloud.google.com/.../models/gemini/2-5-flash"
}
// User lands on dedicated Gemini 2.5 Flash page
```

### Poor Links ❌

```typescript
// Current AWS - Generic page
{
  name: "Claude 3.5 Sonnet",
  url: "https://docs.aws.amazon.com/.../models-regions.html"
}
// User must search entire page for their model

// Current GCP - Regional availability
{
  name: "Gemini 2.5 Flash",
  url: "https://cloud.google.com/.../data-residency#europe_1"
}
// User sees availability table, not model documentation
```

## Success Criteria

An implementation is successful when:

1. ✅ 100% of models have a `url` field (or documented reason why not)
2. ✅ 80%+ of models link to specific pages/sections (specificity score 3+)
3. ✅ All URLs return 200 status when validated
4. ✅ URLs point to the most relevant page for each model
5. ✅ Implementation is documented and maintainable
6. ✅ Fallback strategy handles edge cases gracefully

## Next Steps

1. **Prioritize providers by impact**:
   - Google Vertex AI: High impact (many models, better docs exist)
   - AWS Bedrock: Medium impact (needs investigation first)
   - Azure Foundry: Low impact (already fairly specific)

2. **Start with discovery**:
   - Manually explore GCP documentation for model pages
   - Document URL patterns found
   - Create proof-of-concept mapping

3. **Implement incrementally**:
   - Start with one provider
   - Validate thoroughly
   - Apply learnings to other providers

4. **Measure improvement**:
   - Run validation script before and after
   - Compare specificity scores
   - Get user feedback on link quality
