# MCP Servers and Agents Guide

This guide explains how agents interact with MCP (Model Context Protocol) servers in OpenCode.

## What Are MCP Servers?

MCP servers provide **external tools** that extend OpenCode's capabilities. They work like plugins that add new functionality.

### Current MCP Configuration

**GitHub MCP Server** (disabled by default)
- **Purpose**: Automated GitHub operations (create repos, push files, manage branches)
- **Location**: `opencode.jsonc`
- **Status**: Disabled (to minimize context overhead)

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

## Common Use Cases

### 1. Automated Branch Creation

```
@scraper-specialist create a branch for the new Oracle Cloud scraper 
and push the initial implementation
```

### 2. Pull Request Creation

```
Create a PR with all the scraper improvements you just made
```

### 3. Issue Management

```
List all open issues related to scrapers
```

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
