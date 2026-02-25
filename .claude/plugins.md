# Plugin and MCP Inventory

Last verified: 2026-02-24

## Local Config

- `.claude/settings.local.json` contains local execution permission allow-lists.
- No project-local MCP server declarations are currently stored in this repo.

## Verified Available Integrations

1. `figma` MCP server
- Verified with `mcp__figma__whoami`.
- Authenticated as `trey.shuldberg@gmail.com`.
- Resources and templates are available via `list_mcp_resources` and `list_mcp_resource_templates`.

2. `openaiDeveloperDocs` MCP server
- Verified with `mcp__openaiDeveloperDocs__list_openai_docs` and `mcp__openaiDeveloperDocs__list_api_endpoints`.
- Supports official OpenAI docs search/fetch and OpenAPI endpoint discovery.

## Re-Verification Commands

```bash
# Skills
find /Users/trey/.codex/skills -maxdepth 3 -name 'SKILL.md' | wc -l

# Repo-local config
cat .claude/settings.local.json

# Skill snapshot file in this repo
cat .claude/skills-available.md

# MCP resources (if any)
# use list_mcp_resources / list_mcp_resource_templates tools
```
