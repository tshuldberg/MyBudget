# MyBudget — CLAUDE.md

## Overview

Privacy-first envelope budgeting app with integrated subscription tracking. Merges traditional YNAB-style envelope budgeting with a pre-populated subscription catalog (200+ services), renewal calendar, and cost dashboard. All data stays on-device — zero network calls, no bank connections, no accounts. One-time $4.99 purchase.

## Stack

- **Mobile:** Expo (React Native) with Expo Router file-based routing
- **Web:** Next.js 15
- **Database:** SQLite via `expo-sqlite` (mobile) / `better-sqlite3` (web)
- **Monorepo:** Turborepo with pnpm
- **Language:** TypeScript everywhere
- **Charts:** victory-native (mobile), recharts (web)
- **Notifications:** expo-notifications (local only)
- **Payments:** RevenueCat (IAP), Lemon Squeezy (direct)
- **Testing:** Vitest

## TypeScript Requirement

- TypeScript-first across all apps and packages in this project.
- New runtime code should be .ts/.tsx with strict typing and no implicit any.
- Use .js/.cjs only where required by tooling or platform constraints.

## Agent Instructions and Tooling

- Persistent agent instructions are stored in both AGENTS.md and CLAUDE.md. Keep them in sync when rules change.
- Global Codex skills are sourced from /Users/trey/.codex/skills (67 skills verified on 2026-02-24).
- In-repo skill snapshot is tracked in .claude/skills-available.md.
- Plugin/MCP availability and re-verification steps are tracked in .claude/plugins.md.
- Local execution allow-list settings live in .claude/settings.local.json.

## Key Commands

```bash
pnpm install             # Install all dependencies
pnpm build               # Build all packages and apps
pnpm dev                 # Dev mode for all
pnpm dev:mobile          # Expo mobile only
pnpm dev:web             # Next.js web only
pnpm test                # Run all tests (vitest)
pnpm lint                # Lint all
pnpm typecheck           # Type check all
```

## Architecture

```
MyBudget/
├── apps/
│   ├── mobile/                 # Expo (React Native) — iOS + Android
│   │   ├── app/                # Expo Router file-based routing
│   │   │   ├── (tabs)/         # 5 tabs: Budget, Transactions, Subscriptions, Reports, Accounts
│   │   │   ├── (onboarding)/   # First-launch onboarding flow
│   │   │   ├── add-transaction.tsx
│   │   │   ├── import-csv.tsx
│   │   │   ├── category/[id].tsx
│   │   │   ├── subscription/[id].tsx
│   │   │   └── settings.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── assets/
│   └── web/                    # Next.js 15
├── packages/
│   ├── shared/                 # Business logic (no React dependency)
│   │   ├── src/db/             # SQLite schema, migrations, CRUD
│   │   ├── src/models/         # Zod schemas and TypeScript types
│   │   ├── src/engine/         # Budget calculation engine
│   │   ├── src/csv/            # CSV parser and column mapper
│   │   ├── src/subscriptions/  # Subscription engine, renewal calc, status machine
│   │   ├── src/catalog/        # 200+ pre-populated subscription catalog
│   │   └── src/utils/          # Currency formatting, date helpers
│   ├── ui/                     # Design tokens and shared components
│   │   ├── src/tokens/         # Colors, spacing, typography
│   │   ├── src/components/     # Cross-platform UI primitives
│   │   └── src/icons/          # Icon set + subscription logos
│   ├── eslint-config/
│   └── typescript-config/
```

## Data Model

13 tables total — 9 from budget system, 4 from subscription system:

**Budget tables:** accounts, category_groups, categories, budget_allocations, transactions, transaction_splits, recurring_templates, payee_cache, csv_profiles

**Subscription tables:** subscriptions, price_history, notification_log, preferences

**Merge points:**
- `subscriptions.category_id` → `categories(id)` — subscription spending flows through envelopes
- Subscription creation auto-creates a `recurring_templates` entry
- Subscription renewal auto-generates a `transactions` entry
- Monthly subscription totals visible in both Subscriptions tab and Budget tab

**Critical rule:** ALL currency amounts stored as integer cents. No floating-point math on money.

## Git Workflow

- Branch naming: Conventional Commits (`feature/`, `fix/`, `refactor/`, `docs/`)
- Commit format: Conventional Commits (`feat: add budget engine`, `fix: carry-forward calc`)
- Squash merge to `main`
- Update `timeline.md` after completing work

## Context7 — Live Documentation

When writing or modifying code that uses external libraries, automatically use Context7 MCP tools (`resolve-library-id` → `query-docs`) to fetch current documentation instead of relying on training data.

**Pre-resolved library IDs for this project:**
- Expo: `/expo/expo`
- Next.js: `/vercel/next.js`
- Zod: `/colinhacks/zod`
- Vitest: `/vitest-dev/vitest`

Use when: implementing library APIs, upgrading dependencies, debugging API behavior, writing framework configuration.
Skip when: pure business logic, editing docs/config with no framework dependency.

## File Ownership (Parallel Agent Work)

| Zone | Owner | Files |
|------|-------|-------|
| Root configs | lead | CLAUDE.md, timeline.md, turbo.json, package.json, pnpm-workspace.yaml |
| DB + Budget engine | budget-dev | packages/shared/src/db/**, packages/shared/src/engine/**, packages/shared/src/csv/**, packages/shared/src/models/**, packages/shared/src/utils/** |
| Subscription engine + catalog | subs-dev | packages/shared/src/catalog/**, packages/shared/src/subscriptions/**, apps/mobile/app/**/subscriptions*, apps/mobile/app/**/calendar* |
| UI + screens | ui-dev | packages/ui/**, apps/mobile/app/(tabs)/**, apps/mobile/components/**, apps/web/** |
| Tests | tester | **/*.test.ts, **/*.test.tsx, **/*.spec.ts |

## Important Notes

- Zero network permissions. No analytics. No accounts. No Plaid/Yodlee. Local SQLite only.
- Dark theme only for MVP.
- Free trial: 7 days full, then read-only.
- 5 tabs: Budget (home), Transactions, Subscriptions, Reports, Accounts.
- FSL-1.1-Apache-2.0 license.
- Subscriptions integrate with the budget system through categories and recurring templates.
