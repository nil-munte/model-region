# OpenCode Agent Usage Guide

This guide shows you how to use the custom agents configured in this project.

## Available Agents

### 1. Scraper Specialist (`@scraper-specialist`)

**When to use:**
- Web scraping issues
- Provider parser bugs
- HTML table parsing problems
- Adding new cloud providers
- Broken selectors

**Example invocations:**

```
@scraper-specialist the Azure scraper is not extracting GPT-4 models correctly
```

```
@scraper-specialist add a new scraper for Oracle Cloud Infrastructure
```

```
@scraper-specialist the AWS parser fails when encountering regional availability tables
```

### 2. Query Specialist (`@query-specialist`)

**When to use:**
- CLI query improvements
- Data filtering issues
- Stats output formatting
- Region/model lookup behavior
- Developer experience improvements

**Example invocations:**

```
@query-specialist add fuzzy search support for model names
```

```
@query-specialist the region filter should support partial matches like "east"
```

```
@query-specialist improve the stats output to show top 10 regions by model count
```

## How Agents Work

### Automatic Invocation

OpenCode's primary agent (Build/Plan) can automatically invoke subagents when tasks match their descriptions:

```
# You say this:
Fix the Azure scraper - it's failing on new table structure

# OpenCode recognizes "scraper" + "Azure" and automatically uses @scraper-specialist
```

### Manual Invocation

Use `@` to explicitly invoke an agent:

```
@scraper-specialist <your request>
@query-specialist <your request>
```

### Agent Context

Each agent has:
- **Specialized knowledge** about their domain
- **Specific permissions** (edit, bash, webfetch)
- **Custom constraints** (what NOT to do)
- **Workflow steps** (how to approach problems)

## Skills (On-Demand)

Skills are loaded when needed:

```
Load the model-link-scraping skill and help me improve AWS documentation links
```

Available skills:
- `model-link-scraping` - Improve model documentation URLs
- `nodejs-best-practices` - Node.js architecture decisions
- `nodejs-backend-patterns` - Backend patterns and API design
- `typescript-advanced-types` - Advanced TypeScript type system

## Testing Agents

Try these examples:

### Example 1: Scraper Work
```
@scraper-specialist I need to add support for Google Cloud Vertex AI models.
The documentation is at https://cloud.google.com/vertex-ai/docs/models
```

### Example 2: Query Work
```
@query-specialist Add a new command that shows all models available in Europe regions
```

### Example 3: Using Skills
```
Load the model-link-scraping skill.
Then analyze our current model URLs and suggest improvements for AWS Bedrock.
```

## Agent Sessions

When an agent is invoked:
1. It creates a **child session**
2. You can navigate between sessions with keyboard shortcuts
3. The agent's work is tracked separately
4. Results are returned to the main session

## Best Practices

1. **Be specific** - The more context you provide, the better the agent performs
2. **Use @ mentions** - When you know exactly which agent you need
3. **Let it auto-detect** - For simple tasks, just describe what you want
4. **Chain agents** - You can use multiple agents in sequence for complex tasks

## Debugging

If an agent doesn't appear:
1. Check `.opencode/agents/` contains the `.md` files
2. Verify frontmatter has `mode: subagent`
3. Ensure `description` field exists
4. Restart OpenCode to reload agent definitions

## More Information

- See `AGENTS.md` for complete project documentation
- See `CONTRIBUTING.md` for development workflow
- Visit https://opencode.ai/docs/agents/ for OpenCode agent documentation
