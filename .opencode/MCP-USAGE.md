# MCP Servers and Agents Guide

This guide explains how agents interact with MCP (Model Context Protocol) servers in OpenCode.

## What Are MCP Servers?

MCP servers provide **external tools** that extend OpenCode's capabilities. They work like plugins that add new functionality.

### Current MCP Configuration

**GitHub MCP Server** (enabled)
- **Purpose**: Automated GitHub operations (create repos, push files, manage branches, PRs)
- **Location**: `opencode.jsonc`
- **Status**: **Enabled** - agents can autonomously manage GitHub operations
- **Authentication**: Configured via OAuth (use `opencode mcp auth github` to re-authenticate if needed)

## How Agents Use MCP Tools

### 1. MCP Tools Become Available

When an MCP server is enabled, its tools are added to the agent's toolset:

**Example: GitHub MCP provides:**
- `github_create_repository` - Create new repos
- `github_push_files` - Push multiple files
- `github_create_branch` - Create branches
- `github_create_or_update_file` - Update files
- `github_list_issues` - List issues
- `github_create_pull_request` - Create PRs

### 2. Agents Call MCP Tools Like Built-in Tools

Agents can use MCP tools automatically when needed:

```
@scraper-specialist create a new branch called "feature/improve-aws-parser" 
and push your changes to it
```

The agent recognizes it needs GitHub operations and uses:
```javascript
github_create_branch({ 
  repo: "nil-munte/model-region",
  branch: "feature/improve-aws-parser" 
})
```

### 3. Explicit MCP Tool Usage

You can explicitly tell agents to use MCP tools:

```
Use the GitHub MCP to create a PR with these changes
```

```
@scraper-specialist use GitHub tools to push this to a new branch
```

## Enabling GitHub MCP

### Step 1: Authenticate

```bash
opencode mcp auth github
```

This opens your browser for OAuth authentication.

### Step 2: Enable in Config

Edit `opencode.jsonc`:
```jsonc
"mcp": {
  "github": {
    "enabled": true  // Change from false to true
  }
}
```

### Step 3: Test

```
List the issues in this repository using GitHub MCP
```

## Controlling MCP Access Per Agent

You can configure which agents can use which MCP tools:

### Global Disable, Selective Enable

```jsonc
{
  "tools": {
    // Disable all GitHub MCP tools globally
    "github_*": false
  },
  "agent": {
    "scraper-specialist": {
      "tools": {
        // Enable only specific tools for scraper-specialist
        "github_create_branch": true,
        "github_push_files": true
      }
    }
  }
}
```

### Agent-Specific Permissions

In agent markdown files:

```markdown
---
description: Scraper specialist with GitHub integration
mode: subagent
tools:
  github_create_branch: true
  github_push_files: true
---
```

## Autonomous GitHub Operations (Senior Engineer Mode)

**Agents in this project operate autonomously** - they manage git and GitHub operations without asking for permission.

### Branch + Commit + Push Workflow

Agents should autonomously:
1. Pull latest changes: `git pull origin clean-main`
2. Create a feature branch (if needed): `github_create_branch({ branch: "feature/name" })`
3. Make changes and commit: `git add . && git commit -m "feat: description"`
4. Push to remote: `git push origin <branch-name>`
5. Create PR: `github_create_pull_request({ head: "feature/name", base: "clean-main" })`

**No permission needed** - agents use engineering judgment to decide when to commit/push.

### When to Use Direct Push vs. PR

**Direct push to `clean-main`:**
- Documentation updates
- Bug fixes (tested and working)
- Small refactors
- Data regeneration after scraper fixes

**Create PR (feature branch):**
- New provider scrapers
- Breaking changes to data contracts
- Large refactors affecting multiple files
- Experimental features

### Common Use Cases

#### 1. Autonomous Feature Development

```
@scraper-specialist add support for Oracle Cloud scraper
```

The agent will:
- Pull latest from `clean-main`
- Create branch `feature/oracle-scraper`
- Implement the scraper
- Run tests
- Commit with message like `feat: add Oracle Cloud scraper with region mapping`
- Push to remote
- Create PR automatically

**No "May I commit?" questions** - the agent knows to commit when the feature is done.

#### 2. Autonomous Bug Fix

```
@scraper-specialist the Azure parser is broken for new table structure
```

The agent will:
- Pull latest from `clean-main`
- Fix the parser
- Regenerate data
- Run tests
- Commit: `fix: handle new Azure table structure in scraper`
- Push directly to `clean-main` (it's a fix, not a feature)

#### 3. Autonomous Documentation Update

```
Update the README with the new Oracle provider
```

The agent will:
- Pull latest
- Edit README.md
- Commit: `docs: add Oracle Cloud to README`
- Push to `clean-main` (docs = direct push)

#### 4. PR Management

```
@scraper-specialist review PR #5 and merge if tests pass
```

The agent will:
- Use `github_get_pull_request` to fetch PR details
- Use `github_get_pull_request_status` to check CI status
- Use `github_get_pull_request_files` to review changes
- Use `github_merge_pull_request` if everything looks good

### Issue Management

```
List all open issues related to scrapers
```

Agent uses `github_list_issues({ state: "open", labels: ["scraper"] })`

## Other MCP Servers

You can add more MCP servers to extend functionality:

### Example: Context7 (Documentation Search)

```jsonc
{
  "mcp": {
    "github": { /* ... */ },
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp"
    }
  }
}
```

Usage:
```
@scraper-specialist use context7 to search for Cheerio best practices
```

### Example: Grep (Code Search)

```jsonc
{
  "mcp": {
    "gh_grep": {
      "type": "remote",
      "url": "https://mcp.grep.app"
    }
  }
}
```

Usage:
```
@scraper-specialist use gh_grep to find examples of HTML table parsing on GitHub
```

## Best Practices

### 1. Disable by Default
Keep MCP servers disabled to avoid context bloat. Enable only when needed.

### 2. Use Tool Permissions
Control which agents can use which MCP tools for security and clarity.

### 3. Explicit Instructions
When you want an agent to use MCP tools, be explicit:
```
Use the GitHub MCP to create this branch
```

### 4. Context Awareness
GitHub MCP adds significant tokens to context. Use it selectively.

## Troubleshooting

### MCP Tools Not Available

1. **Check if enabled**:
   ```jsonc
   "mcp": { "github": { "enabled": true } }
   ```

2. **Check authentication**:
   ```bash
   opencode mcp list
   opencode mcp auth github
   ```

3. **Check tool permissions**:
   ```jsonc
   "tools": { "github_*": true }
   ```

### Agent Can't Use MCP Tools

1. **Check agent permissions** in `opencode.jsonc`
2. **Check agent frontmatter** in `.opencode/agents/*.md`
3. **Restart OpenCode** to reload configuration

## Summary

**MCP + Agents = Powerful Automation**

- MCP servers provide external tools
- Agents can use MCP tools automatically
- You control access via permissions
- Common use: GitHub operations (branches, PRs, issues)
- Best practice: Disable by default, enable when needed

## Learn More

- MCP Documentation: https://opencode.ai/docs/mcp-servers/
- GitHub MCP: https://github.com/github/github-mcp-server
- Agent Configuration: `.opencode/AGENT-USAGE.md`
