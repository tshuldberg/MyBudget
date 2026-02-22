# MyBudget — Timeline

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
