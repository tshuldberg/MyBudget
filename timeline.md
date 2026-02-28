# MyBudget — Timeline

## 2026-02-27 — Rocket Money-style web app redesign (Phases A-E)

Comprehensive UI/UX overhaul of the Next.js web app to match Rocket Money's fintech design patterns. Based on frame-by-frame analysis of a Rocket Money screen recording. Full comparison report at `docs/REPORT-rocket-money-comparison-2026-02-27.md`.

### Phase A: Dashboard Overhaul
- Rewrote `apps/web/app/page.tsx` with 3:2 asymmetric grid layout
- Added personalized greeting ("Good morning/afternoon/evening")
- Created `CurrentSpendChart` (dual-line recharts AreaChart: this month vs last month cumulative)
- Created `UpcomingStrip` (7-day calendar strip showing subscription renewals)
- Added Accounts card with expandable sections (Checking, Card Balance, Net Cash, Savings) and "Sync now" label
- Recent Transactions with category icon circles and pending badges
- Added 5 new server actions to `reports.ts`: `fetchDailySpending`, `fetchFrequentSpend`, `fetchSpendingSummary`, `fetchCategoryHistory`, `fetchCategoryTransactions`

### Phase B: Spending Analysis Upgrade
- Rewrote `apps/web/app/reports/spending/page.tsx` with period tabs and enhanced category table
- Category table shows % Spend, Change arrows with %, clickable rows
- Added summary sidebar (Income/Bills/Spending with comparison text)
- Added Frequent Spend section (top merchants by count with average + total)
- Created `reports/spending/[categoryId]/page.tsx` drill-down with 12-month bar chart

### Phase C: Recurring/Subscriptions Overhaul
- Rewrote `apps/web/app/subscriptions/page.tsx` with tab navigation (Upcoming/All Recurring/Calendar)
- Category-based grouping: Subscriptions, Bills & Utilities, Credit Card Payments
- Per-group yearly total display
- Search bar + Sort dropdown (type, amount, due date)
- Monthly Breakdown sidebar chart (6-month bar chart)
- Inactive subscriptions toggle

### Phase D: Transaction Enhancements
- Enhanced `TransactionList.tsx` with per-date spending totals in date headers
- Enhanced `TransactionRow.tsx` with category icon circles (emoji-based), pending badge
- Added `getCategoryIcon()` helper mapping payee names to emoji icons

### Phase E: Settings Restructure
- Rewrote `apps/web/app/settings/page.tsx` with sidebar sub-navigation
- 6 sections: Profile, Linked Accounts, Notifications, Categories, Transaction Rules, Data
- Categories management: full CRUD with edit/hide/delete per category, add groups, toggle hidden
- Transaction Rules: "When payee contains X, assign category Y" with localStorage persistence
- Notifications: toggle switches for bill reminders, over-budget alerts, weekly digest
- Linked Accounts: bank/card display with connection status badges
- Data: import CSV, export JSON, danger zone (reset data)

### Build Verification
- All 6 Turborepo typecheck tasks passing, zero type errors
- Fixed 3 type issues: `is_cleared` boolean comparison, `is_hidden` toggle type, recharts Tooltip formatter

## 2026-02-22 — Project scaffolding + full shared package build

### Scaffolding
- Created Turborepo monorepo with pnpm
- Scaffolded apps/mobile (Expo + Expo Router), apps/web (Next.js 15)
- Scaffolded packages/shared (db, models, engine, csv, subscriptions, catalog, utils)
- Scaffolded packages/ui (tokens, components, icons)
- Set up shared TypeScript, ESLint, Prettier configs
- Created 5-tab navigation: Budget, Transactions, Subscriptions, Reports, Accounts
- Wrote CLAUDE.md (Tier 2), README.md, timeline.md
- Initial commit pushed to origin/main

### Database Layer (packages/shared/src/db/)
- 13-table SQLite schema with 18 indexes, version-based migration runner
- Account CRUD with balance tracking and archive
- Category groups and categories CRUD with emoji and sort order
- Transaction CRUD with split transaction support, activity queries, filtering
- Payee autocomplete cache (prefix match, use_count threshold for category suggestion)
- Recurring transaction templates with schedule generation
- Transfer support (linked outflow+inflow pairs)

### Budget Engine (packages/shared/src/engine/)
- `calculateMonthBudget` — allocations, carry-forward, overspend, Ready to Assign
- `allocateToCategory`, `moveAllocation`, `getAllocationsForMonth`
- `calculateNextDate` for recurring schedules (weekly/biweekly/monthly/quarterly/annually)
- Month-end date clamping, leap year handling

### CSV Parser (packages/shared/src/csv/)
- `parseCSV` with profile-based column mapping
- 4 date format auto-detection (MM/DD/YYYY, YYYY-MM-DD, DD/MM/YYYY, M/D/YY)
- 3 amount sign conventions (negative_is_outflow, positive_is_outflow, separate_columns)
- Duplicate detection (date + payee + amount matching)
- CSV profile save/load/delete

### Subscription Engine (packages/shared/src/subscriptions/)
- Subscription CRUD with filtering by status, category, search
- Renewal date calculation for 6 billing cycles (weekly, monthly, quarterly, semi_annual, annual, custom)
- Monthly/annual/daily cost normalization (integer cents math, no floats)
- Price history tracking and lifetime cost calculation
- Status state machine with valid transitions and side effects
- Notification scheduling (renewal reminders, trial expiry, monthly summary)
- Budget bridge: subscription ↔ recurring_template sync, auto-transaction on renewal

### Subscription Catalog (packages/shared/src/catalog/)
- 215 entries across 8 categories with accurate 2026 pricing
- Search with case-insensitive matching, prefix boost, popularity boost
- Popular entries curation (top 20)

### Zod Schemas (packages/shared/src/models/)
- Zod schemas + TypeScript types for all 13 tables
- Insert variants (omit auto-generated fields)
- Enum types for account types, subscription statuses, billing cycles

### UI Package (packages/ui/)
- Design tokens: dark theme colors, 8px spacing grid, typography (Inter + SF Mono)
- 7 components: Card, Button (3 variants + loading), Text (4 variants), Input (floating label), Badge (status pill), ProgressBar (auto-color), BottomSheet (spring animation)

### Mobile Screens (apps/mobile/)
- 5 tabs: Budget, Transactions, Subscriptions, Reports, Accounts
- 7 modals/screens: Add Transaction, Add Subscription, Subscription Detail, Renewal Calendar, CSV Import, Settings, Onboarding
- 6 shared components: BudgetHeader, CategoryRow, CategoryGroupSection, TransactionRow, SubscriptionRow, SettingsRow

### Tests (200 passing)
- Budget engine: 30 tests (allocation, carry-forward, overspend, Ready to Assign, move money)
- Schedule engine: 25 tests (all frequencies, month-end clamping, leap year)
- CSV parser: 28 tests (date formats, amount conventions, quoted fields, duplicates)
- Payee autocomplete: 14 tests (cache, increment, threshold, prefix matching)
- Subscription engine: 81 tests (renewal calc, cost normalization, status machine, catalog)
- Budget cycle integration: 12 tests (full lifecycle)
- Subscription lifecycle integration: 10 tests (full lifecycle)

## 2026-02-26 — Restored Standalone Web Rich Budget UI

### What changed
- Replaced standalone web placeholder page with the full rich budget workspace UI in `apps/web/app/page.tsx`.
- Added standalone web server actions in `apps/web/app/actions.ts` for envelopes, accounts, transactions, and goals:
  - list/create/update/archive/restore/delete for envelopes and accounts
  - list/create/update/delete for transactions
  - list/create/update/delete for goals
- Added local standalone SQLite backing for web actions using `better-sqlite3`:
  - creates `bg_envelopes`, `bg_accounts`, `bg_transactions`, and `bg_goals`
  - applies indexes and seeds initial account/envelope records
  - persists DB at `apps/web/.data/mybudget-web.sqlite` (from app working directory)
- Updated standalone web dependencies in `apps/web/package.json`:
  - `better-sqlite3`
  - `@types/better-sqlite3`
- Updated web test to validate rich interface load behavior instead of placeholder content:
  - `apps/web/test/landing-interface.test.tsx`

### Verification
- `pnpm --filter @mybudget/web typecheck` -> pass
- `pnpm --filter @mybudget/web test` -> pass
- `pnpm --filter @mylife/web test:parity` (from MyLife host) -> pass

### Next steps
- Add a lightweight standalone web smoke test that performs one create flow per entity (envelope, account, transaction, goal) against the live server actions.
- Introduce route-level tests for `/api/bank/link-token`, `/api/bank/exchange`, and `/api/bank/webhook` to lock in provider validation and failure behavior.
- Split standalone web data access into a reusable DB helper module so the budget actions and bank routes share one connection/runtime boundary.
- Mirror any standalone web budget UX/content refinements into MyLife passthrough parity checks so wrapper assertions continue to protect UI drift.

## 2026-02-26 — Build 1 Bank Sync Runtime + Web API Routes

### What changed
- Implemented shared bank-sync runtime and cloud adapter layer in `packages/shared/src/bank-sync/`:
  - runtime bootstrap with env-driven KMS and webhook secret providers
  - AWS/GCP adapter shims for KMS and secret-manager integrations
  - webhook verification strategy plumbing and audit logging
  - provider contract exports (`BANK_SYNC_PROVIDERS`, `BANK_SYNC_IMPLEMENTED_PROVIDERS`)
- Added standalone web bank API routes in `apps/web/app/api/bank/`:
  - `POST /api/bank/link-token`
  - `POST /api/bank/exchange`
  - `POST /api/bank/webhook`
- Hardened provider validation so unimplemented providers return explicit `400` errors instead of silent fallback or generic `500`.
- Added provider contract tests in `packages/shared/src/bank-sync/__tests__/types.test.ts`.
- Mirrored bank-sync package and route parity into MyLife (`modules/budget/src/bank-sync` and `apps/web/app/api/bank`) during the same session.

### Verification
- `pnpm --filter @mybudget/shared test` -> pass (231 tests)
- `pnpm --filter @mybudget/shared typecheck` -> pass
- `pnpm --filter @mybudget/web typecheck` -> pass
- `pnpm --filter @mybudget/web test` -> pass
- `pnpm --filter @mylife/budget test` -> pass (47 tests)
- `pnpm --filter @mylife/budget typecheck` -> pass
- `pnpm --filter @mylife/web typecheck` -> pass
- `pnpm check:module-parity` (MyLife) -> pass (existing deferred-module warnings unchanged)

### Next steps
- Implement Plaid-native webhook verification (JWT + `webhook_verification_key/get`) and remove placeholder shared-secret assumptions for direct Plaid webhook traffic.
- Add auth/authorization guards to all bank API routes so link token, token exchange, and sync actions are tied to authenticated user identity.
- Replace in-memory connector/token stores with persistent encrypted storage and add webhook idempotency keys to prevent duplicate event processing.
- Add route-level tests for bank API handlers (invalid provider/auth/webhook verification/failure paths) in both standalone and hub web codepaths.
