# Project Guidelines

## Purpose
This repository tracks AI model availability by cloud provider and region.
It scrapes public documentation, normalizes data into JSON, provides a CLI query tool, and serves a Next.js web UI for browsing results.

## Architecture

### Scrapers (`src/`)
- `src/scrapers/azure.ts` and `src/scrapers/aws.ts` fetch provider documentation and convert HTML tables into the shared `ModelRegionData` shape.
- `src/query.ts` reads the generated JSON files and provides region, model, and stats queries via CLI.
- `src/types/index.ts` is the source of truth for data contracts.
- `data/*.json` are generated artifacts and should only change when scraper behavior or source documentation changes.

### Web App (`web/`)
- `web/` is a Next.js App Router application with Tailwind CSS.
- `web/lib/data.ts` reads JSON from `../data/` at build/request time (server components).
- `web/lib/regions.ts` maps provider-specific region names to geographic groups (Europe first).
- `web/app/api/refresh/route.ts` exposes a POST endpoint that re-runs scrapers on demand.
- `web/components/` contains the UI: provider selector, region selector (Europe default), filterable model table, and refresh button with last-updated timestamp.
- All filtering happens client-side after initial server-side data load.

## Build And Test

### Scrapers
- Install dependencies with `npm install`.
- Run `npm run scrape:azure` to refresh Azure data.
- Run `npm run scrape:aws` to refresh AWS data.
- Run `npm run query -- <provider?> <command> <value?>` for CLI queries.
- Run `npm test` to validate the generated data and query behavior.

### Web App
- `cd web && npm install && npm run dev` to start the development server.
- The web app reads from `data/*.json` — run scrapers first if data is missing.

## Conventions
- Keep TypeScript strictness intact; do not weaken compiler settings to land a change.
- Prefer small parsing helpers over large inlined scraper logic.
- Preserve the normalized output shape: provider -> models -> regions.
- When provider docs change, fix the parser at the root cause instead of patching generated JSON manually.
- Treat `README.md` as user-facing documentation and update it when workflows or supported providers change.
- Region grouping in the web UI must keep Europe regions first and default to a European region on page load.

## Security Requirements

**CRITICAL: OpenCode agents must always enforce these security rules automatically:**

1. **NEVER commit sensitive files:**
   - `opencode.jsonc` (contains API tokens/secrets)
   - Any file matching `*credentials*`, `*secret*`, `*private*`
   - `.env` files (except `.env.example`)
   
2. **Always use `.gitignore`:**
   - Before any commit, verify sensitive files are in `.gitignore`
   - If `.gitignore` is missing, create it with standard patterns
   - Auto-add any file containing tokens/keys to `.gitignore`

3. **Use template files for configs with secrets:**
   - Create `*.example` versions without real secrets
   - Document setup steps in the template file
   - Commit the template, never the real config

4. **If a sensitive file was already committed:**
   - Immediately run `git rm --cached <file>` to untrack it
   - Add it to `.gitignore`
   - Warn the user about git history exposure
   - Consider using `git filter-branch` or BFG Repo-Cleaner for history cleanup

5. **Automated checks before any git operation:**
   - Run `git status` to check for staged sensitive files
   - Grep `.gitignore` to verify protection exists
   - Block commits containing patterns like `*_TOKEN`, `*_SECRET`, `*_KEY`, API keys, passwords

## OpenCode Configuration

This project is configured for use with **OpenCode** - an AI coding agent. The following files control OpenCode's behavior:

### Core Files

| File | Purpose | Should Commit? |
|------|---------|----------------|
| `AGENTS.md` | Project-specific instructions and guidelines for OpenCode (this file) | ✅ Yes |
| `opencode.jsonc` | OpenCode configuration (MCP servers, agents, tools, permissions) | ❌ **NEVER** (contains secrets) |
| `opencode.jsonc.example` | Template for opencode.jsonc without secrets | ✅ Yes |
| `skills-lock.json` | Locks versions of installed skills (like package-lock.json) | ✅ Yes |

### Directory Structure

```
.opencode/
├── agents/              # Custom OpenCode subagents
│   ├── scraper-specialist.md    # Expert for web scraping and parser work
│   └── query-specialist.md      # Expert for CLI queries and data analysis
└── skills/              # Reusable instruction sets (loaded on-demand)
    ├── model-link-scraping/SKILL.md
    ├── nodejs-best-practices/SKILL.md
    ├── nodejs-backend-patterns/SKILL.md
    └── typescript-advanced-types/SKILL.md
```

### Available Agents

**Scraper Specialist** (`@scraper-specialist`)
- Use when: Working on web scraping, HTML parsing, provider scrapers, broken selectors
- Focus: Provider documentation parsing, resilient selector design, maintaining `ModelRegionData` contract
- Tools: read, edit, webfetch, bash

**Query Specialist** (`@query-specialist`)
- Use when: Working on CLI queries, data analysis, filtering, stats output
- Focus: CLI ergonomics, region/model matching, query correctness
- Tools: read, edit, bash

### Available Skills

Skills are loaded on-demand via the built-in `skill` tool. Invoke with: `load the <skill-name> skill`

**model-link-scraping**
- Improving model documentation link quality
- Analysis of current link specificity per provider
- Implementation approaches: scraping, pattern-based, manual mapping
- Utilities: `npm run validate-urls [provider]`, `npm run discover-patterns <url>`

**nodejs-best-practices** / **nodejs-backend-patterns**
- Node.js architecture decisions and patterns
- Framework selection, async patterns, security

**typescript-advanced-types**
- Advanced TypeScript type system usage
- Generics, conditional types, mapped types, utility types

### Usage

Invoke agents with `@` mentions:
```
@scraper-specialist the Azure parser is failing on new table structure
@query-specialist improve the region filtering logic
```

Load skills on-demand:
```
Load the model-link-scraping skill and help me improve AWS model URLs
```

## Agent Behavior: Senior Software Engineer Role

OpenCode agents in this project operate as **senior software engineers** with autonomous git and GitHub operation capabilities.

### Autonomous Git Operations

**Agents should manage git operations without asking for permission:**

1. **Pull before making changes**
   - Always `git pull origin clean-main` before starting work to avoid conflicts
   - Check current branch and sync state with `git status`

2. **Commit autonomously**
   - Make atomic commits when a logical unit of work is complete
   - Write clear, conventional commit messages (e.g., `feat:`, `fix:`, `docs:`, `refactor:`)
   - Commit examples:
     - After fixing a parser bug: `fix: handle new Azure table structure in scraper`
     - After adding a feature: `feat: add support for Oracle Cloud provider`
     - After improving docs: `docs: update contributing guidelines`
   - Do NOT ask "Should I commit this?" - use engineering judgment

3. **Push autonomously**
   - Push commits to `clean-main` when ready for deployment
   - For experimental or large changes, create a feature branch first
   - Do NOT ask "Should I push this?" - push when the work is complete and tested

4. **When to commit and push**
   - ✅ **DO commit/push**: Bug fixes, completed features, documentation updates, test additions
   - ✅ **DO commit/push**: After running tests and verifying changes work
   - ❌ **DON'T commit/push**: Partial implementations, broken code, failing tests
   - ❌ **DON'T commit/push**: Sensitive files (see Security Requirements above)

### Autonomous GitHub Operations

**GitHub MCP server is enabled** in `opencode.jsonc` for automated GitHub operations:

- **Create branches**: Use `github_create_branch` for feature work
- **Create PRs**: Use `github_create_pull_request` for review workflows
- **Manage issues**: Use `github_create_issue`, `github_list_issues`, `github_update_issue`
- **Merge PRs**: Use `github_merge_pull_request` after approval

**Example workflows:**

```
# Feature development with PR
1. git pull origin clean-main
2. github_create_branch({ branch: "feature/oracle-scraper" })
3. [implement changes]
4. git add . && git commit -m "feat: add Oracle Cloud scraper"
5. git push origin feature/oracle-scraper
6. github_create_pull_request({ head: "feature/oracle-scraper", base: "clean-main" })

# Quick fix directly to clean-main
1. git pull origin clean-main
2. [fix bug]
3. git add . && git commit -m "fix: correct AWS region mapping"
4. git push origin clean-main
```

### Engineering Judgment Guidelines

**Use your judgment to decide**:
- When a change is ready to commit (code works, tests pass, meets requirements)
- Whether to push directly to `clean-main` (small fixes, docs) or create a PR (large features, breaking changes)
- When to create a branch vs. working on `clean-main` (experimental = branch, routine = main)
- What constitutes a logical commit boundary (one bug fix, one feature, one refactor)

**Key principle**: Act like a senior engineer on the team. You have commit access because you're trusted to make good decisions. Don't ask for permission for routine operations—just do them correctly.

### Reference Documentation

- **GitHub MCP usage**: See `.opencode/MCP-USAGE.md` for detailed GitHub operation examples
- **Git workflows**: See `CONTRIBUTING.md` for branch strategy and PR process
- **Security**: Always follow Security Requirements section above before any git operation
