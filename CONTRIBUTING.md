# Contributing to Model-Region Tracker

Thank you for your interest in contributing! This guide will help you get started.

## Development with OpenCode

This project is configured for **OpenCode**, an AI coding agent. If you use OpenCode:

- **Agents**: Invoke specialized agents with `@scraper-specialist` or `@query-specialist`
- **Skills**: Load skills with commands like `load the model-link-scraping skill`
- **Configuration**: See `AGENTS.md` for complete OpenCode documentation

## Development Workflow

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/nilmunte/model-region.git
   cd model-region
   ```

2. **Install dependencies**
   ```bash
   # Root dependencies (scrapers)
   npm install
   
   # Web dependencies
   cd web && npm install
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

4. **Make your changes**
   - For scrapers: Edit files in `src/scrapers/`
   - For web UI: Edit files in `web/`
   - For workflows: Edit files in `.github/workflows/`

5. **Test locally**
   ```bash
   # Test scrapers
   npm run scrape:azure
   npm run validate-data
   
   # Test web app
   cd web && npm run dev
   # Open http://localhost:3000
   ```

6. **Push and create a pull request**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/my-feature
   ```
   
   Then create a PR on GitHub.

## Pull Request Process

1. **Automated Checks**: Your PR will automatically:
   - Build and deploy a preview
   - Run TypeScript type checks
   - Validate data integrity (if data files changed)

2. **Preview Deployment**: 
   - A preview URL will be posted as a PR comment within 2-3 minutes
   - Preview updates automatically on each push
   - Format: `https://nilmunte.github.io/model-region/pr-NUMBER/`

3. **Review**: 
   - Maintainers will review your changes
   - Address any feedback in new commits
   - Push updates to the same branch

4. **Merge**: 
   - Once approved, PR will be merged to `main`
   - Production deployment happens automatically
   - Preview cleanup happens automatically

## Local Development

### Scrapers

```bash
# Run individual scrapers
npm run scrape:azure
npm run scrape:aws
npm run scrape:azure-databricks
npm run scrape:gcp

# Query data
npm run query azure region swedencentral
npm run query aws model claude
npm run query gcp stats

# Validate data
npm run validate-data
```

### Web Application

```bash
cd web
npm run dev
# Open http://localhost:3000
```

The web app reads from `../data/*.json`, so make sure to run scrapers first if you need fresh data.

### Building for Production

```bash
cd web
npm run build
# Static files will be in web/out/
```

## Testing

### Run Tests

```bash
# Validate scraped data
npm run validate-data

# Test data structure
npm test

# Type check
npx tsc --noEmit
cd web && npx tsc --noEmit
```

### Validate URLs (Optional)

```bash
# Validate all model documentation URLs
npm run validate-urls

# Validate for specific provider
npm run validate-urls azure
```

## Project Structure

```
model-region/
├── src/
│   ├── scrapers/          # Data scrapers for each provider
│   ├── types/             # TypeScript type definitions
│   ├── query.ts           # CLI query tool
│   └── test-data.ts       # Data validation tests
├── web/
│   ├── app/               # Next.js app router pages
│   ├── components/        # React components
│   ├── lib/               # Utility functions
│   └── next.config.ts     # Next.js configuration
├── data/                  # Scraped data (JSON files)
├── scripts/               # Utility scripts
├── .github/workflows/     # GitHub Actions workflows
└── README.md
```

## Code Style

- **TypeScript**: Use strict mode, no `any` types
- **Formatting**: Follow existing code style
- **Comments**: Add comments for complex logic
- **Commit Messages**: Use conventional commits format
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation
  - `chore:` for maintenance tasks

## Adding a New Provider

To add support for a new cloud provider:

1. **Create scraper**: `src/scrapers/new-provider.ts`
2. **Follow existing patterns**: See `azure.ts` or `aws.ts` as examples
3. **Add script to `package.json`**: `"scrape:new-provider": "tsx src/scrapers/new-provider.ts"`
4. **Update workflows**: Add scraper to `.github/workflows/deploy.yml`
5. **Test locally**: Run scraper and validate output
6. **Update docs**: Add provider to README.md

## GitHub MCP Server (Optional)

This project includes configuration for the GitHub MCP (Model Context Protocol) server, which enables OpenCode to interact with GitHub directly.

### When to Use

The GitHub MCP is **disabled by default** to minimize context usage. Enable it when you need:
- Automated repository operations
- Programmatic PR/issue management
- Batch GitHub operations

### Enabling GitHub MCP

**Option 1: Per-prompt** (recommended)
```
use github to create a new repository named my-repo
```

**Option 2: Enable globally**

Edit `opencode.json`:
```json
{
  "mcp": {
    "github": {
      "enabled": true
    }
  }
}
```

### Authentication

**Using OAuth** (requires GitHub Copilot subscription):
```bash
opencode mcp auth github
```

**Using Personal Access Token** (alternative):

1. Create PAT: https://github.com/settings/personal-access-tokens/new
2. Required scopes: `repo`, `read:org`, `workflow`
3. Set environment variable: `GITHUB_PERSONAL_ACCESS_TOKEN`
4. Update `opencode.json`:
```json
{
  "mcp": {
    "github": {
      "oauth": false,
      "headers": {
        "Authorization": "Bearer {env:GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    }
  }
}
```

### Testing

```bash
# List MCP servers
opencode mcp list

# Debug GitHub MCP connection
opencode mcp debug github

# Check auth status
opencode mcp auth list
```

### Context Considerations

⚠️ The GitHub MCP server adds significant tokens to your context. Use it selectively to avoid exceeding token limits.

For most repository operations, manual git commands are simpler and more efficient.

## Questions or Issues?

- **Bug reports**: [Open an issue](https://github.com/nilmunte/model-region/issues)
- **Feature requests**: [Open an issue](https://github.com/nilmunte/model-region/issues)
- **Questions**: [Start a discussion](https://github.com/nilmunte/model-region/discussions)

## License

By contributing, you agree that your contributions will be licensed under the same ISC License that covers the project.
