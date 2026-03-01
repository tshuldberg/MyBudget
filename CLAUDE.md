# MyBudget — CLAUDE.md

## Overview

Privacy-first envelope budgeting app with integrated subscription tracking. Merges traditional YNAB-style envelope budgeting with a pre-populated subscription catalog (200+ services), renewal calendar, and cost dashboard. Supports both manual local-only operation and optional secure bank sync when users choose to connect accounts. One-time $4.99 purchase.

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

## Standalone/Hub Parity (Critical)

- Standalone `MyBudget` is the canonical product source of truth.
- The standalone `MyBudget` app and MyLife hub module `modules/budget` must remain feature-identical and behavior-identical.
- Any product capability (including bank sync, notifications, reports, subscriptions, and schema updates) must ship for both implementations together.
- Do not treat standalone as experimental while hub lags, or hub as experimental while standalone lags.

## Agent Instructions and Tooling

- Persistent agent instructions are stored in both `AGENTS.md` and `CLAUDE.md`. Keep them in sync when rules change.
- Global Codex skills are sourced from `/Users/trey/.codex/skills` (67 skills verified on 2026-02-24).
- In-repo skill snapshot is tracked in `.claude/skills-available.md`.
- Plugin/MCP availability and re-verification steps are tracked in `.claude/plugins.md`.
- Local execution allow-list settings live in `.claude/settings.local.json`.

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
│   │   ├── src/catalog/        # 200+ pre-populated subscription catalog with cancellation data
│   │   ├── src/bank-sync/      # Bank sync infrastructure + recurring charge detector
│   │   └── src/utils/          # Currency formatting, date helpers
│   ├── ui/                     # Design tokens and shared components
│   │   ├── src/tokens/         # Colors, spacing, typography
│   │   ├── src/components/     # Cross-platform UI primitives
│   │   └── src/icons/          # Icon set + subscription logos
│   ├── eslint-config/
│   └── typescript-config/
```

## Data Model

20 tables total — 9 from budget system, 2 from new engines, 4 from subscription system, 5 from bank sync:

**Budget tables:** accounts, category_groups, categories, budget_allocations, transactions, transaction_splits, recurring_templates, payee_cache, csv_profiles

**Engine tables:** goals, transaction_rules

**Subscription tables:** subscriptions, price_history, notification_log, preferences

**Bank sync tables:** bank_connections, bank_accounts, bank_transactions_raw, bank_sync_state, bank_webhook_events

**Merge points:**
- `subscriptions.category_id` → `categories(id)` — subscription spending flows through envelopes
- Subscription creation auto-creates a `recurring_templates` entry
- Subscription renewal auto-generates a `transactions` entry
- Monthly subscription totals visible in both Subscriptions tab and Budget tab

**Catalog enhancements:** The 200+ entry subscription catalog includes cancellation URLs, difficulty ratings (easy/medium/hard/impossible), and step-by-step cancellation notes sourced from JustDeleteMe's open-source database.

**Bank-detected subscription discovery:** The `recurring-detector` module in `bank-sync/` analyzes Plaid transaction data to detect recurring charges and suggest them as tracked subscriptions. Pure function with confidence scoring, catalog matching, and dismissed-payee filtering. MyBudget is the sole subscription tracking module in the MyLife suite (MySubs was consolidated into MyBudget).

**Engine modules (packages/shared/src/engine/):**
- `income-estimator` -- detects recurring income streams, classifies frequency (salary/freelance/irregular), estimates monthly income with confidence scoring
- `payday-detector` -- identifies paycheck patterns (weekly/biweekly/semi-monthly/monthly), predicts next payday, generates schedule
- `net-cash` -- calculates net cash (inflows minus outflows), cash flow by period, running balance
- `transaction-rules` -- rule-based auto-categorization engine with condition types (contains/equals/starts_with/regex, amount comparisons) and actions (set_category, rename_payee, set_memo), priority ordering
- `goals` -- savings goal tracking with progress calculation, monthly contribution suggestions, on-track detection, status (completed/on_track/behind/overdue), completion projection

**Bank sync hardening (packages/shared/src/bank-sync/):**
- `transaction-sync` -- reconciliation pipeline (insert/update/remove), pending-to-posted resolution, bank-to-local transaction mapping
- `auth-guard` -- bearer token validation, sliding window rate limiting per user
- `idempotency` -- webhook deduplication with TTL-based expiry, processing status tracking

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

## Agent Teams Strategy

When 2+ plans target this project with overlapping scope, use an Agent Team instead of parallel subagents. Custom agent definitions from `/Users/trey/Desktop/Apps/.claude/agents/` and `/Users/trey/Desktop/Apps/MyLife/.claude/agents/`:
- `plan-executor` -- Execute plan phases with testing and verification
- `test-writer` -- Write tests without modifying source code
- `docs-agent` -- Update documentation
- `reviewer` -- Read-only code review (uses Sonnet)

Agents working in different File Ownership Zones can run in parallel without conflicts. Agents sharing a zone must coordinate via the team task list.

## Important Notes

- Bank account sync is an optional user-controlled mode. Manual local-only mode must remain available.
- No analytics or telemetry.
- Dark theme only for MVP.
- Free trial: 7 days full, then read-only.
- 5 tabs: Budget (home), Transactions, Subscriptions, Reports, Accounts.
- FSL-1.1-Apache-2.0 license.
- Subscriptions integrate with the budget system through categories and recurring templates.


## Writing Style
- Do not use em dashes in documents or writing.
