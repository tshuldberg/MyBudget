# AGENTS.md

Project-specific agent instructions for `/Users/trey/Desktop/Apps/MyLife/MyBudget`.

## Instruction Pair (Critical)

- Keep this file and `CLAUDE.md` synchronized for persistent project rules.
- When a long-lived workflow or constraint changes, update both files in the same session.

## Startup Checklist

- Read `AGENTS.md` and `CLAUDE.md` before making substantial edits.
- Review `.claude/settings.local.json` for local execution constraints.
- Review `.claude/skills-available.md` for the current in-repo skill snapshot.
- Review `.claude/plugins.md` for currently verified MCP/plugin availability.

## TypeScript Requirement (Critical)

- Default to TypeScript for application and shared package code whenever feasible.
- For new product/runtime code, prefer .ts/.tsx over .js/.jsx.
- Use JavaScript only when a toolchain file requires it (for example Babel or Metro config).

## Standalone/Hub Parity (Critical)

- Standalone `MyBudget` is the canonical product source of truth.
- The standalone `MyBudget` app and MyLife hub module `modules/budget` must remain feature-identical and behavior-identical.
- Do not ship module-only or standalone-only capabilities, schema changes, workflows, or settings.
- When a parity-impacting change is made, update both codebases and both instruction pairs (`AGENTS.md` + `CLAUDE.md`) in the same session.
- Bank account sync is supported as an optional user-controlled capability; manual/local workflows must still work when sync is disabled.

## Skills Availability

- Skills are sourced from the global Codex skills directory: `/Users/trey/.codex/skills`.
- Verified on 2026-02-24: 67 skills with `SKILL.md` are available (including `.system/*` skills).
- Verify current availability with:
  - `find /Users/trey/.codex/skills -maxdepth 3 -name 'SKILL.md' | wc -l`
  - `find /Users/trey/.codex/skills -maxdepth 3 -name 'SKILL.md'`
- Do not assume `.claude/skills` exists in this repo unless explicitly added later.

## Plugins / MCP Availability

- Confirmed working in this workspace on 2026-02-24:
  - `figma` MCP server (authenticated user: `trey.shuldberg@gmail.com`)
  - `openaiDeveloperDocs` MCP server tools
- Canonical inventory lives in `.claude/plugins.md`.

## Agent Teams

- Agent team support is enabled via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in MyLife `.claude/settings.json`.
- Custom agent definitions are available from `/Users/trey/Desktop/Apps/.claude/agents/` and `/Users/trey/Desktop/Apps/MyLife/.claude/agents/`.
- When spawning teams, assign file ownership zones from CLAUDE.md to prevent edit conflicts.
- All teammates automatically load CLAUDE.md and AGENTS.md, so critical rules here are enforced team-wide.

## Writing Style
- Do not use em dashes in documents or writing.
