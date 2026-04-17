# Model-Region Availability Tracker

[![Deploy Status](https://github.com/nil-munte/model-region/actions/workflows/deploy.yml/badge.svg)](https://github.com/nil-munte/model-region/actions/workflows/deploy.yml)

A tool to track AI model availability across different cloud providers and regions.

## 🌐 Live Demo

**Production Dashboard**: https://nil-munte.github.io/model-region/

The dashboard is automatically updated daily at 2 AM UTC with the latest model availability data.

## Overview

This project scrapes public documentation from cloud providers (Azure, AWS, Google Cloud) to extract which AI models are available in which geographic regions, then presents this data in a user-friendly format.

## Current Status

### Phase 1: Azure OpenAI (Complete)
- **Azure OpenAI Scraper**: Successfully scrapes Azure OpenAI documentation
- **Data Extraction**: Extracts 65+ models across 28 Azure regions
- **Query Tool**: Interactive CLI for querying Azure data
- **Test Suite**: Comprehensive validation and statistics

### Phase 2: AWS Bedrock (Complete)
- **AWS Bedrock Scraper**: Successfully scrapes AWS Bedrock documentation
- **Data Extraction**: Extracts 81+ models across 35 AWS regions
- **Query Tool**: Extended to support AWS data
- **Multi-provider Support**: Query tool now supports both Azure and AWS

### Phase 3: Azure Databricks (Complete)
- **Azure Databricks Scraper**: Successfully scrapes Azure Databricks Mosaic AI Model Serving documentation
- **Data Extraction**: Extracts 28+ models across 23 Azure regions
- **Deployment Types**: Tracks three deployment types (pay-per-token, batch inference, provisioned throughput)
- **Query Tool**: Extended to support Azure Databricks data

### Phase 4: Google Vertex AI (Complete)
- **Google Vertex AI Scraper**: Successfully scrapes Google Cloud Vertex AI documentation
- **Data Extraction**: Extracts 204+ models across 15 regions
- **Model Categories**: Tracks three categories (Google Cloud Model support, Google Cloud Partner Model support, Google Cloud Open Model support)
- **Query Tool**: Extended to support Google Vertex AI data
- **Documentation Links**: Each model in the web UI links to the Google Cloud documentation

### Phase 5: Direct Model Creator APIs (Complete)
- **OpenAI Scraper**: Successfully scrapes OpenAI developer documentation
- **Claude/Anthropic Scraper**: Successfully scrapes Claude platform documentation
- **Data Extraction**: GPT-5.x models (3 models) and Claude 4.5+ models (3 models)
- **Global Availability**: All models marked as available in a single "global" region (no geographic restrictions)
- **Knowledge Cutoff Tracking**: Captures training data cutoff dates for each model
- **Query Tool**: Extended to support OpenAI and Claude data

### Phase 6: Web Application (Complete)
- **Next.js Web UI**: Dark-themed dashboard to browse model availability
- **Provider Selector**: Switch between Azure and AWS
- **Region Selector**: Grouped by geography (Europe first, default European region)
- **Model Table**: Filterable list with available/unavailable status
- **Refresh Button**: Re-runs scrapers on demand with last-updated timestamp
- **Error Handling**: Graceful fallback when data is missing

## What's Working

### Azure OpenAI
- **Models Tracked**: 65 models
- **Regions Tracked**: 28 Azure regions
- **Data Source**: [Azure OpenAI Documentation](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure)
- **Top Regions**: swedencentral (93.8%), eastus2 (92.3%), centralus (64.6%)

### AWS Bedrock
- **Models Tracked**: 81 models
- **Regions Tracked**: 35 AWS regions
- **Data Source**: [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/models-regions.html)
- **Top Regions**: US East (N. Virginia) (80.2%), US West (Oregon) (79.0%), Asia Pacific (Tokyo/Sydney/London) (56.8%)

### Azure Databricks
- **Models Tracked**: 28 models
- **Regions Tracked**: 23 Azure regions
- **Data Source**: [Azure Databricks Mosaic AI Model Serving](https://learn.microsoft.com/en-us/azure/databricks/machine-learning/model-serving/foundation-model-overview)
- **Deployment Types**: Pay-per-token, AI Functions (batch inference), Provisioned throughput
- **Top Models**: Claude Sonnet 4-6 (23 regions), GPT OSS models (23 regions), Meta Llama models (23 regions)

### Google Vertex AI
- **Models Tracked**: 204 models
- **Regions Tracked**: 15 GCP regions
- **Data Source**: [Google Vertex AI Data Residency](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/data-residency)
- **Model Categories**: Google Cloud Model support (96), Google Cloud Partner Model support (51), Google Cloud Open Model support (57)
- **Top Regions**: us-multi-region (23.0%), eu-multi-region (15.2%), asia-southeast1 (5.9%)
- **Documentation Links**: Each model links to the data residency documentation page

### OpenAI (Direct API)
- **Models Tracked**: 3 models (GPT-5.x series only)
- **Availability**: Global (no regional restrictions)
- **Data Source**: [OpenAI Developer Documentation](https://developers.openai.com/api/docs/models)
- **Models**: gpt-5.4, gpt-5.4-mini, gpt-5.4-nano
- **Knowledge Cutoff**: Aug 31, 2025

### Claude/Anthropic (Direct API)
- **Models Tracked**: 3 models (Claude 4.5+ series only)
- **Availability**: Global (no regional restrictions)
- **Data Source**: [Claude Platform Documentation](https://platform.claude.com/docs/en/about-claude/models/overview)
- **Models**: Claude Opus 4.7, Claude Sonnet 4.6, Claude Haiku 4.5
- **Knowledge Cutoffs**: Jan 2026 (Opus 4.7), Aug 2025 (Sonnet 4.6), Feb 2025 (Haiku 4.5)

### Sample Output

```json
{
  "provider": "Azure OpenAI",
  "models": [
    {
      "name": "gpt-5.4-mini, 2026-03-17",
      "regions": [
        { "region": "eastus2", "available": true },
        { "region": "swedencentral", "available": true },
        { "region": "australiaeast", "available": true }
      ]
    }
  ]
}
```

### Key Findings from Azure

1. **Table Structure**: Azure docs use a **transposed table** (regions in rows, models in columns)
2. **Data Source**: `https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure?pivots=azure-openai&tabs=global-standard-aoai`
3. **Detection Method**: Scraping with Cheerio (no authentication required)
4. **Total Models**: 65 models tracked
5. **Total Regions**: 28 Azure regions
6. **Availability Indicator**: Checkmark images (`icon-yes.png`) indicate availability

### Example Models Tracked

- **gpt-5.4-mini**: Available in all 28 regions
- **gpt-5.4-nano**: Available in 4 regions (eastus2, polandcentral, southcentralus, swedencentral)
- **gpt-5.4**: Available in 28 regions
- **o3-mini**: Available in 15 regions
- **gpt-4o**: Available in 28 regions

## 🚀 Deployment

This project uses GitHub Actions for automated deployment to GitHub Pages.

### CI/CD Pipeline

- **Production**: Deploys to GitHub Pages on every push to `clean-main`
- **PR Previews**: Each PR gets a preview deployment at `/pr-{number}/`
- **Scheduled Updates**: Data is refreshed daily at 2 AM UTC
- **Build Cache**: Optimized builds complete in ~2-3 minutes

### Build Times

- **First deployment**: ~11-19 minutes (includes scraping)
- **Subsequent builds** (frontend changes only): ~2-3 minutes (cached)
- **Daily updates** (with scraping): ~7-13 minutes

### Manual Deployment

Trigger a manual deployment:
1. Go to **Actions** → **Deploy to GitHub Pages**
2. Click **Run workflow**
3. Select branch and click **Run workflow**

### PR Preview Workflow

1. Create a pull request
2. GitHub Actions automatically builds and deploys a preview
3. Preview URL is posted as a PR comment
4. Preview updates on every push to the PR
5. Preview is cleaned up when PR is closed

## Usage

### Run Scrapers

```bash
# Scrape Azure OpenAI models
npm run scrape:azure

# Scrape AWS Bedrock models
npm run scrape:aws

# Scrape Azure Databricks models
npm run scrape:azure-databricks

# Scrape Google Vertex AI models
npm run scrape:gcp

# Scrape OpenAI models (direct API, global availability)
npm run scrape:openai

# Scrape Claude/Anthropic models (direct API, global availability)
npm run scrape:claude
```

Each scraper will:
1. Fetch the documentation page
2. Parse the model-region availability table
3. Save results to `data/{provider}-models.json`

### Web Application

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000 to browse model availability:

1. **Select a provider** (Azure / AWS / GCP / Azure Databricks / OpenAI / Claude) from the dropdown
2. **Select a region** (for cloud providers) or view global availability (for OpenAI/Claude)
3. **Browse the model table** showing availability in the chosen region
4. **Filter models** by typing in the search box
5. **Refresh data** with the button in the header to re-run scrapers

### Query Data (CLI)

```bash
# Query Azure (default provider)
npm run query region eastus2
npm run query model gpt-4o
npm run query stats

# Query AWS explicitly
npm run query aws region virginia
npm run query aws model "claude 3.5"
npm run query aws stats

# Query Azure explicitly
npm run query azure region swedencentral
npm run query azure stats

# Query Azure Databricks
npm run query azure-databricks region eastus
npm run query azure-databricks model claude
npm run query azure-databricks stats

# Query Google Vertex AI
npm run query gcp region us-multi-region
npm run query gcp model gemini
npm run query gcp stats

# Query OpenAI (global availability)
npm run query openai model gpt-5.4
npm run query openai stats

# Query Claude/Anthropic (global availability)
npm run query claude model claude-opus-4-7
npm run query claude stats
```

### Run Tests

```bash
# Run comprehensive test suite (Azure only for now)
npm test
```

## Project Structure

```
model-region/
├── src/
│   ├── scrapers/
│   │   ├── azure.ts          # Azure OpenAI scraper
│   │   ├── aws.ts            # AWS Bedrock scraper
│   │   ├── azure-databricks.ts  # Azure Databricks scraper
│   │   └── gcp.ts            # Google Vertex AI scraper
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   ├── test-data.ts          # Test suite
│   └── query.ts              # Interactive query tool
├── data/
│   ├── azure-models.json     # Scraped Azure model data (65 models, 28 regions)
│   ├── aws-models.json       # Scraped AWS model data (81 models, 35 regions)
│   ├── azure-databricks-models.json  # Azure Databricks data (28 models, 23 regions)
│   ├── gcp-models.json       # Google Vertex AI data (204 models, 15 regions)
│   ├── openai-models.json    # OpenAI data (3 models, global availability)
│   └── claude-models.json    # Claude/Anthropic data (3 models, global availability)
├── web/
│   ├── app/
│   │   ├── page.tsx          # Main page (server component, loads data)
│   │   ├── layout.tsx        # Root layout with metadata
│   │   ├── globals.css       # Tailwind CSS + dark theme
│   │   └── api/refresh/
│   │       └── route.ts      # POST endpoint to re-run scrapers
│   ├── components/
│   │   └── Dashboard.tsx     # Client component: selectors, table, search
│   └── lib/
│       ├── data.ts           # Reads JSON from ../data/ (server only)
│       └── regions.ts        # Region-to-geography mapping (Europe first)
├── package.json
├── tsconfig.json
└── README.md
```

## Data Types

```typescript
interface ModelRegionData {
  provider: string;
  lastUpdated: string;   // ISO 8601 timestamp
  models: ModelInfo[];
}

interface ModelInfo {
  name: string;
  version?: string;
  knowledgeCutoff?: string;  // Training data cutoff date (OpenAI, Claude)
  regions: RegionAvailability[];
}

interface RegionAvailability {
  region: string;
  available: boolean;
  deploymentTypes: string[];  // Optional: deployment methods (Azure Databricks)
}
```

## Technical Implementation

### Azure Scraper Details

1. **HTTP Fetch**: Uses Axios to fetch the HTML documentation page
2. **HTML Parsing**: Uses Cheerio to parse and traverse the DOM
3. **Table Detection**: Finds the largest table (66 columns) which contains the model-region matrix
4. **Orientation Detection**: Checks if first header is "Region" to determine table layout
5. **Transposition**: Converts region-in-rows format to model-in-rows format
6. **Availability Detection**: Looks for checkmark images or "yes" text in cells

### Why Scraping vs API?

- **Azure ARM API**: Requires Azure subscription + OAuth authentication
- **AWS Bedrock API**: Requires AWS IAM credentials
- **Google Vertex AI**: No public API for model-region listings
- **OpenAI/Claude Direct APIs**: No authentication required for public documentation
- **Public Docs**: All providers publish comprehensive HTML tables publicly

## Provider Categories

This project tracks two types of AI model providers:

### 1. Cloud Regional Providers
These providers host models in specific geographic regions:
- **Azure OpenAI**: 28 Azure regions
- **AWS Bedrock**: 35 AWS regions
- **Google Vertex AI**: 15 GCP regions
- **Azure Databricks**: 23 Azure regions

Users must select a region when deploying models. Data residency and latency depend on region choice.

### 2. Direct API Providers
These providers offer global API access without regional restrictions:
- **OpenAI**: Global availability (no region selection)
- **Claude/Anthropic**: Global availability (no region selection)

Users access models via a single global endpoint. Data residency is managed by the provider.

## Next Steps (Planned)

### Future Enhancements
- [ ] Add Mistral API integration
- [ ] Add Cohere API integration
- [ ] Implement geographic region mapping (e.g., "Europe - West" -> azure regions + aws regions + gcp regions)
- [ ] Handle duplicate models across providers
- [ ] Add pricing data per model/region
- [ ] Track model capabilities (context window, max tokens, etc.)

## Dependencies

### Scrapers
- **axios**: HTTP client for fetching HTML pages
- **cheerio**: HTML parsing and DOM traversal
- **typescript**: Type safety
- **tsx**: TypeScript execution

### Web Application
- **next**: React framework with App Router
- **react** / **react-dom**: UI library
- **tailwindcss**: Utility-first CSS

## License

ISC
