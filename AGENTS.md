# Project Guidelines

## Purpose
This repository tracks AI model availability by cloud provider and region.
It scrapes public documentation, normalizes data into JSON, provides a CLI query tool, and serves a Next.js web UI for browsing results.

## Architecture

### Scrapers (`src/`)
- `src/scrapers/azure.ts`, `src/scrapers/aws.ts`, `src/scrapers/gcp.ts`, and `src/scrapers/azure-databricks.ts` fetch provider documentation and convert HTML tables into the shared `ModelRegionData` shape.
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
- Run `npm run scrape:gcp` to refresh GCP data.
- Run `npm run scrape:azure-databricks` to refresh Azure Databricks data.
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

### Git Workflow: Branch + PR Required

**All changes must go through feature branches and pull requests.** Direct pushes to `clean-main` are prohibited.

The only exception is the automated GitHub Actions workflow that commits `chore: update model data [skip ci]` on a schedule.

#### 1. Start with an Issue

Before starting non-trivial work, create or find a GitHub issue:
- Use `github_create_issue` to create a new issue describing the work
- Reference existing issues when the work is already tracked
- This creates traceability between code changes and their motivation

#### 2. Create a Feature Branch

Always branch from `clean-main`:

```bash
git pull origin clean-main
git checkout -b <type>/<short-description>
```

**Branch naming convention:**
- `feat/add-oracle-scraper` — new features
- `fix/azure-table-parsing` — bug fixes
- `refactor/remove-any-types` — code cleanup
- `docs/update-readme-providers` — documentation
- `test/multi-provider-validation` — test improvements

#### 3. Commit Atomically

- Make atomic commits when a logical unit of work is complete
- Write clear, conventional commit messages (e.g., `feat:`, `fix:`, `docs:`, `refactor:`)
- Reference issue numbers in commit messages: `fix: correct AWS region mapping (#8)`
- Do NOT ask "Should I commit this?" — use engineering judgment

#### 4. Push and Open a Pull Request

```bash
git push origin <branch-name>
```

Then create a PR using `github_create_pull_request`:
- **Title**: Use conventional commit format (e.g., `fix: correct AWS region mapping`)
- **Body**: Describe what changed and why, reference the issue with `closes #N`
- **Base**: Always `clean-main`

The PR preview deployment workflow will automatically build and deploy a preview.

#### 5. Merge via Squash

Use squash merge (`github_merge_pull_request` with `merge_method: "squash"`) to keep `clean-main` history clean. Each PR becomes a single commit on the main branch.

#### What NOT to Do

- ❌ **Never push directly to `clean-main`** (branch protection enforces this)
- ❌ **Never commit partial implementations** or broken code
- ❌ **Never commit sensitive files** (see Security Requirements above)
- ❌ **Never merge without PR preview passing**

### Autonomous GitHub Operations

**GitHub MCP server is enabled** in `opencode.jsonc` for automated GitHub operations:

- **Create issues**: Use `github_create_issue` before starting work
- **Create branches**: Use `github_create_branch` for feature work
- **Create PRs**: Use `github_create_pull_request` with issue references
- **Manage issues**: Use `github_list_issues`, `github_update_issue`
- **Merge PRs**: Use `github_merge_pull_request` with `merge_method: "squash"`

**Standard workflow:**

```
1. github_create_issue (or find existing issue)
2. git pull origin clean-main
3. git checkout -b feat/my-feature
4. [implement changes]
5. git add . && git commit -m "feat: add my feature (#N)"
6. git push origin feat/my-feature
7. github_create_pull_request({ head: "feat/my-feature", base: "clean-main", body: "closes #N" })
8. [verify PR preview passes]
9. github_merge_pull_request({ merge_method: "squash" })
10. github_update_issue({ state: "closed" })  // if not auto-closed by "closes #N"
```

### Engineering Judgment Guidelines

**Use your judgment to decide**:
- When a change is ready to commit (code works, tests pass, meets requirements)
- What constitutes a logical commit boundary (one bug fix, one feature, one refactor)
- How to break large features into reviewable PR-sized chunks

**Key principle**: Act like a senior engineer on the team. You have autonomy because you're trusted to follow the process correctly. Don't ask for permission — but always use branches and PRs.

### Reference Documentation

- **GitHub MCP usage**: See `.opencode/MCP-USAGE.md` for detailed GitHub operation examples
- **Git workflows**: See `CONTRIBUTING.md` for branch strategy and PR process
- **Security**: Always follow Security Requirements section above before any git operation
