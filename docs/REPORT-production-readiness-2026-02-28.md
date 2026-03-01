# Production Readiness Feature Gap Analysis

**Date:** 2026-02-28
**Analyst:** Claude (Researcher Agent)
**Scope:** MyBudget standalone app -- envelope budgeting + subscription tracking
**Competitor Set:** YNAB, Monarch Money, Rocket Money, Copilot, Goodbudget, EveryDollar

---

## Executive Summary

MyBudget has a strong foundation: a complete envelope budgeting engine (30+ test cases), a subscription engine with 200+ catalog entries and budget bridging (81+ tests), a CSV import pipeline, and a recently overhauled web UI modeled after Rocket Money (Phases A-E shipped). Bank sync infrastructure is scaffolded with Plaid provider, token vault, webhook security, connector service, cloud adapters, and a recurring charge detector -- but none of it is wired to live bank data yet.

**What makes MyBudget competitive today:**
- 98% cheaper than YNAB ($4.99 one-time vs $109/yr)
- Built-in subscription tracking (no competitor combines envelopes + subscriptions natively)
- Complete data privacy (zero analytics, zero telemetry, local SQLite)
- 200+ subscription catalog with cancellation data
- Rocket Money-caliber web UI (Phases A-E complete)

**What blocks production readiness:**
1. Bank sync is scaffolded but not functional (no auth, no persistent storage, no Plaid Link UI)
2. Transaction rules engine uses localStorage (not SQLite, not synced)
3. No goal/savings tracking
4. Mobile app has minimal UI (6 shared components vs 35+ web components)
5. No error boundaries, loading states, or offline resilience for mobile
6. 231 shared tests but only 1 web test (failing) and 0 mobile tests

**Verdict:** MyBudget is "strong MVP" but not production-ready. The core engines are solid. The web UI is polished. The gaps are in bank sync activation, mobile parity, production hardening, and smart features.

---

## Feature Gap Table

| # | Feature | Competitor Reference | Current Status | Priority | Effort |
|---|---------|---------------------|----------------|----------|--------|
| 1 | Bank account linking (Plaid Link) | YNAB, Monarch, Rocket Money | Scaffolded (no UI, no auth) | P0 | L |
| 2 | Auth guards on bank API routes | All bank-sync competitors | Missing | P0 | M |
| 3 | Persistent token/connection storage | All bank-sync competitors | In-memory only | P0 | M |
| 4 | Plaid Link UI component (web) | YNAB, Monarch, Rocket Money | Missing | P0 | M |
| 5 | Transaction sync from bank | YNAB, Monarch, Rocket Money | Missing (connector exists) | P0 | L |
| 6 | Webhook verification (Plaid JWT) | YNAB, Monarch | HMAC only, no Plaid JWT | P0 | S |
| 7 | Transaction rules in SQLite | Rocket Money, YNAB | localStorage only | P1 | M |
| 8 | Income estimation from txns | Rocket Money | Missing | P1 | M |
| 9 | Payday detection | Rocket Money | Missing | P1 | M |
| 10 | Budget wizard (auto income) | Rocket Money | Manual onboarding only | P1 | M |
| 11 | Net Cash on dashboard | Rocket Money | Done (web) | Done | - |
| 12 | Goals/savings tracking | YNAB (targets), Monarch | Missing entirely | P1 | L |
| 13 | Mobile spending reports | All competitors | Tab exists, minimal impl | P1 | M |
| 14 | Mobile subscription calendar | Rocket Money | Screen exists, basic | P1 | S |
| 15 | Mobile dashboard parity | Rocket Money, Monarch | No CurrentSpendChart/UpcomingStrip | P1 | M |
| 16 | Mobile bank sync UI | YNAB, Monarch | Missing | P2 | M |
| 17 | Error boundaries (web) | Production standard | Missing | P0 | S |
| 18 | Error boundaries (mobile) | Production standard | Missing | P0 | S |
| 19 | Loading skeletons (mobile) | UX standard | Missing (web has them) | P1 | S |
| 20 | Offline resilience | Goodbudget | Partial (SQLite local) | P2 | M |
| 21 | Data export (JSON/CSV) | YNAB, Monarch | UI exists, not wired | P1 | S |
| 22 | Web test coverage | Production standard | 1 test (failing) | P0 | M |
| 23 | Mobile test coverage | Production standard | 0 tests | P1 | L |
| 24 | Transaction rules in SQLite schema | Rocket Money | No `transaction_rules` table | P1 | M |
| 25 | Notification preferences in SQLite | All competitors | UI toggles, not persisted | P1 | S |
| 26 | Branded merchant logos | Rocket Money, Monarch | Emoji-based only | P3 | L |
| 27 | Multi-currency support | Copilot, Monarch | Schema supports it, UI does not | P3 | L |
| 28 | Investment account tracking | Monarch, Copilot | Not supported | P3 | XL |
| 29 | Bill negotiation | Rocket Money | Not planned | P3 | XL |
| 30 | Spending alerts/notifications | YNAB, Monarch | UI exists, no push impl | P2 | M |
| 31 | Search across all transactions | All competitors | Web has it, mobile missing | P1 | S |
| 32 | Recurring charge auto-discovery | Rocket Money | Engine done, no UI trigger | P1 | S |
| 33 | Subscription cancellation flow | Rocket Money | Catalog has URLs, no in-app flow | P2 | M |
| 34 | Custom date range reports | YNAB, Monarch | Period tabs only (this/last month) | P2 | S |
| 35 | Age of Money metric | YNAB | Missing | P3 | M |
| 36 | Undo/redo for budget moves | YNAB | Missing | P3 | M |
| 37 | Payee rename/merge | YNAB | Missing | P2 | S |
| 38 | Reconciliation workflow | YNAB | Missing | P2 | M |

---

## Detailed Analysis by Category

### 1. Bank Sync and Account Linking

**Current state:** Extensive scaffolding is in place. The `packages/shared/src/bank-sync/` directory contains 14 source files and 9 test files covering:
- `PlaidProviderClient` with link token creation and token exchange
- `BankSyncConnectorService` orchestrating connect/sync/disconnect flows
- `EncryptedBankTokenVault` with AES-256-GCM encryption
- `KmsBackedBankTokenVault` for AWS/GCP KMS integration
- `HmacWebhookVerifier` for webhook signature validation
- `BankSyncAuditLogger` for compliance logging
- `BankSyncServerRuntime` with env-driven bootstrap
- Cloud adapters for AWS SDK v3 and GCP Secret Manager
- `detectRecurringCharges` pure function for subscription discovery
- 5 bank sync tables in schema (connections, accounts, raw transactions, sync state, webhook events)
- 3 API routes (`/api/bank/link-token`, `/api/bank/exchange`, `/api/bank/webhook`)

**What is missing:**
- **Auth guards:** All 3 bank API routes accept any request. No user identity validation.
- **Persistent storage:** `createInMemoryBankSyncConnectorStore()` and `createInMemoryTokenVaultStore()` are used. Data lost on restart.
- **Plaid Link UI:** No `<PlaidLink>` component in the web app. The "Link Account" button in settings is a dead end.
- **Transaction sync loop:** `connector.syncBankConnection()` exists but is never called from any scheduled task or user action.
- **Plaid JWT webhook verification:** Current `createHmacWebhookVerifier` uses shared-secret HMAC. Plaid's production webhooks use JWK-based JWT verification (`webhook_verification_key/get`).
- **Bank-to-local transaction mapping:** Raw bank transactions are stored but never mapped to the local `transactions` table.
- **Sync status UI:** No indicator of sync progress, errors, or last-synced time (the "Sync now" label is decorative).

**Effort to production-ready:** Large. This is the single biggest gap. Requires: SQLite-backed stores, auth middleware, Plaid Link integration, transaction mapping pipeline, error recovery, and webhook verification upgrade.

### 2. Smart Features (Phase F from Rocket Money Report)

**Current state:** Not started. These were identified as P3 in the Rocket Money comparison report.

| Feature | Description | Status |
|---------|-------------|--------|
| Income estimation | Analyze inflow transactions to detect salary pattern | Missing |
| Payday detection | Identify recurring income dates, show "Payday in X days" | Missing |
| Budget wizard | Auto-suggest allocations based on detected income + spending | Missing |
| Net Cash calculation | Checking minus credit card balances | Done (web dashboard) |

**Dependency:** Income estimation and payday detection require either bank sync data OR manually entered transactions with consistent payee naming. The algorithms are straightforward (similar pattern to `detectRecurringCharges` but for inflows instead of outflows).

**Effort:** Medium. The `recurring-detector.ts` architecture can be adapted. Income detection inverts the amount filter (negative amounts = inflows in bank data). Payday detection adds a "next occurrence" prediction.

### 3. Transaction Rules Engine

**Current state:** The web settings page has a Transaction Rules section (Settings > Transaction Rules). Rules use the format "When payee contains X, assign category Y." However:
- Rules are stored in `localStorage` (`mybudget_txn_rules` key)
- No `transaction_rules` table exists in the SQLite schema
- Rules are not applied during transaction creation or CSV import
- No mobile equivalent exists
- The payee cache (`payee_cache` table) provides basic auto-suggest but not auto-assign

**What competitors do:** YNAB and Rocket Money auto-apply rules during bank sync import. Rules fire on payee match and assign category, rename payee, or flag as transfer. Rules can be created from any transaction.

**What is needed:**
1. New `transaction_rules` SQLite table (id, payee_contains, category_id, rename_to, is_active, priority, created_at)
2. Rule matching function in shared package
3. Apply rules during: manual transaction creation, CSV import, bank sync import
4. Migrate existing localStorage rules on first launch
5. Mobile UI for rule management

**Effort:** Medium.

### 4. Goal/Savings Tracking

**Current state:** The `categories` table has `target_type` supporting `monthly`, `savings_goal`, and `debt_payment`, and `target_amount` for the target. However:
- No goal-specific UI exists on web or mobile
- No progress tracking (current vs target)
- No target date or monthly contribution calculation
- No visual progress indicators
- The web standalone actions file references `bg_goals` table but this is separate from the shared schema

**What competitors do:**
- YNAB: Targets on categories with automatic underfunded calculation
- Monarch: Dedicated Goals section with progress bars and target dates
- Goodbudget: Envelope goals with fill-to-target

**What is needed:**
1. Extend `categories` schema: add `target_date`, `target_monthly` fields
2. Goal calculation engine: monthly needed, months remaining, on-track status
3. Web UI: goals dashboard or section within Reports
4. Mobile UI: goals screen or tab
5. "Quick fund" action to allocate to a goal category

**Effort:** Large. This is a new feature vertical.

### 5. Reporting and Analytics

**Current state (web):** Rich and fairly complete.
- Dashboard: CurrentSpendChart (dual-line), spend comparison badge, accounts sidebar, UpcomingStrip
- Spending: interactive donut chart, category table with % and change arrows, summary sidebar, frequent spend, category drill-down with 12-month bar chart
- Net Worth: NetWorthChart component
- Income vs Expense: dedicated report page
- Monthly trend: MonthlyTrendChart component

**Current state (mobile):** Minimal. The Reports tab exists but has basic content.

**Gaps:**
- No custom date range picker (only "This Month" / "Last Month" tabs)
- No YTD or annual summary view
- No spending trends over time (week-over-week, month-over-month line charts)
- No budget vs actual comparison report
- Mobile reports tab needs charts (victory-native dependency exists in package.json but unused)
- No export of reports (PDF, image, or share)

**Effort:** Medium for custom date range and budget vs actual. Small for mobile chart parity if victory-native is already available.

### 6. Mobile App Parity

**Current state:** The mobile app has:
- 5 tabs: Budget, Transactions, Subscriptions, Reports, Accounts
- 7 modal/screens: Add Transaction, Add Subscription, Subscription Detail, Renewal Calendar, CSV Import, Settings, Onboarding
- 6 shared components: BudgetHeader, CategoryRow, CategoryGroupSection, TransactionRow, SubscriptionRow, SettingsRow

**Web has (that mobile lacks):**
- CurrentSpendChart (dashboard dual-line chart)
- UpcomingStrip (7-day calendar strip)
- SpendingBreakdown (donut chart)
- CategorySpendTable (% spend, change arrows)
- MonthlyTrendChart
- NetWorthChart
- TransactionFilters
- SearchInput
- DiscoveredSubscriptions (bank-detected recurring charges)
- CatalogSearch (subscription catalog browser)
- SubscriptionDetail (full detail view with price history)
- SubscriptionCostCard
- AddAccountDialog
- Settings with 6 sub-sections
- 35+ web components vs 6 mobile components

**Critical mobile gaps:**
1. No dashboard data visualization (charts, graphs)
2. No spending breakdown or drill-down
3. No transaction search or filtering
4. No subscription discovery UI
5. No settings sub-sections (categories, rules, notifications, linked accounts)
6. No bank sync UI

**Effort:** Large. Mobile requires significant component development. However, the business logic is shared via `packages/shared/`, so the work is primarily UI.

### 7. Production Hardening

| Area | Current State | Needed | Priority |
|------|--------------|--------|----------|
| Error boundaries | None on web or mobile | React error boundaries wrapping each route | P0 |
| API error handling | Basic try/catch in server actions | Consistent error types, user-facing messages | P0 |
| Loading states | Web has skeletons; mobile has minimal | Skeleton screens for all mobile tabs | P1 |
| Input validation | Zod schemas exist but not enforced at UI layer | Validate all form inputs before submission | P1 |
| Rate limiting | None on bank API routes | Rate limit bank sync endpoints | P0 |
| CSRF protection | Next.js built-in for server actions | Verify headers on bank API routes | P0 |
| Data backup | None | SQLite backup/export on schedule | P2 |
| Crash reporting | None (privacy-first) | Optional opt-in crash reports | P3 |
| Accessibility | Unknown | Screen reader labels, keyboard navigation | P1 |
| Performance | No profiling done | Measure and optimize large transaction lists | P2 |
| Web test suite | 1 test (failing: `landing-interface.test.tsx`) | Fix failing test, add route + action tests | P0 |
| Mobile test suite | 0 tests | Component tests, navigation tests | P1 |
| Shared test suite | 231 tests (19 test files, all passing) | Solid. Add integration tests for bank sync flow | P1 |

### 8. Onboarding and UX Polish

**Current state:** Mobile has an onboarding flow (`apps/mobile/app/onboarding.tsx`). Web seeds default categories on first load.

**Gaps:**
- No web onboarding wizard
- No "Quick Start" guide or tooltips for new users
- No sample data mode to explore the app before committing
- No guided budget setup (Rocket Money's "Set up in 2 minutes" pattern)
- No currency/locale selection during onboarding
- Transaction rules not surfaced during manual categorization ("Always categorize X as Y?")
- No "suggested budget" based on income or spending history

**Effort:** Medium. Onboarding wizard is straightforward. Sample data mode requires a seed dataset.

---

## Recommended Implementation Order

### Tier 1: Production Blockers (must fix before any public release)

1. **Fix failing web test** -- `apps/web/test/landing-interface.test.tsx` (S)
2. **Error boundaries** -- Add React error boundaries to web and mobile route layouts (S)
3. **Transaction rules to SQLite** -- New table, migration, rule matching in shared, migrate localStorage data (M)
4. **Bank API auth guards** -- Add user identity validation to all `/api/bank/*` routes (M)
5. **Rate limiting on bank routes** -- Prevent abuse of Plaid link-token and exchange endpoints (S)

### Tier 2: Core Feature Completion (needed for competitive launch)

6. **Bank sync activation** -- Persistent stores, Plaid Link UI, transaction mapping, sync loop, error recovery (L)
7. **Plaid JWT webhook verification** -- Replace HMAC with Plaid's JWK-based verification (S)
8. **Income estimation engine** -- Detect salary patterns from transaction history (M)
9. **Payday detection** -- Identify income dates, predict next payday (M)
10. **Budget wizard** -- Auto-suggest allocations from detected income + historical spending (M)
11. **Goals/savings tracking** -- Schema extension, calculation engine, web + mobile UI (L)
12. **Data export** -- Wire up JSON export button, add CSV export option (S)

### Tier 3: Mobile Parity (needed for App Store launch)

13. **Mobile dashboard charts** -- Port CurrentSpendChart and UpcomingStrip to React Native (M)
14. **Mobile spending reports** -- Port donut chart, category table, drill-down using victory-native (M)
15. **Mobile transaction search/filter** -- SearchInput + TransactionFilters for mobile (S)
16. **Mobile settings sub-sections** -- Categories, Transaction Rules, Notifications (M)
17. **Mobile loading skeletons** -- Skeleton screens for all 5 tabs (S)

### Tier 4: Polish and Differentiation (launch week / post-launch)

18. **Custom date range reports** -- Date picker for spending analysis (S)
19. **Budget vs actual report** -- Side-by-side comparison per category (M)
20. **Payee rename/merge** -- Combine duplicate payees across transactions (S)
21. **Reconciliation workflow** -- Mark transactions as reconciled, running cleared balance (M)
22. **Subscription cancellation flow** -- Deep-link to cancellation URL with difficulty warning (S)
23. **Notification preferences persistence** -- Save toggle states to SQLite preferences table (S)
24. **Accessibility audit** -- Screen reader labels, keyboard navigation, color contrast (M)

### Tier 5: Future Differentiation

25. **Age of Money** -- YNAB-style metric (days since oldest unspent dollar) (M)
26. **Branded merchant logos** -- Logo service or icon pack for top 100 merchants (L)
27. **Multi-currency** -- Full currency conversion with exchange rates (L)
28. **Undo/redo** -- Action history stack for budget moves (M)

---

## What Makes MyBudget "Production-Ready" vs "Still MVP"

### The MVP Line (current state)

MyBudget today is a **strong MVP**. It has:
- A working envelope budgeting engine with carry-forward and overspend handling
- A subscription tracking engine with 200+ catalog entries and budget bridging
- A polished web UI matching Rocket Money's design language
- CSV import with intelligent column mapping
- 231 passing tests on core business logic
- Local-only SQLite storage (privacy promise delivered)

### The Production Line (what is needed)

To cross from MVP to production-ready, MyBudget needs:

1. **Data integrity guarantees** -- Error boundaries prevent data loss on crashes. Transaction rules in SQLite prevent data living in localStorage. Notification preferences persisted.
2. **Bank sync working end-to-end** -- At least one path (Plaid sandbox to production) where a user can link a bank account, see transactions flow in, and have subscriptions auto-discovered. This is the #1 feature gap vs every competitor.
3. **Mobile feature parity** -- Charts, search, settings sub-sections. The 5-tab mobile shell exists but 3 of 5 tabs are thin implementations. A user downloading the mobile app today would find it significantly less capable than the web app.
4. **Test coverage on web and mobile** -- 231 shared tests are excellent, but 1 failing web test and 0 mobile tests means UI regressions are undetectable.
5. **Smart features (income + payday)** -- These differentiate MyBudget from "another budgeting app" to "a budgeting app that understands your money." Without them, the dashboard's "Current Spend" and "Upcoming" widgets lack the income context that makes Rocket Money compelling.

### The Competitive Line (what makes users switch)

Beyond production-ready, these features drive user acquisition:
- **$4.99 one-time pricing** is the headline differentiator (already in place)
- **Subscription tracking built-in** is unique in the envelope budgeting space (already working)
- **Cancellation assistance** with difficulty ratings and direct links (catalog has data, needs UI flow)
- **Privacy-first** positioning as the anti-Mint (already the core promise)
- **Goals/savings tracking** makes the app sticky for long-term users (not started)

---

## Appendix: Test Coverage Summary

| Package | Test Files | Test Count | Status |
|---------|-----------|------------|--------|
| `packages/shared` (engine) | 2 | ~55 | Passing |
| `packages/shared` (csv) | 1 | ~28 | Passing |
| `packages/shared` (subscriptions) | 1 | ~81 | Passing |
| `packages/shared` (db) | 2 | ~24 | Passing |
| `packages/shared` (integration) | 2 | ~22 | Passing |
| `packages/shared` (bank-sync) | 9 | ~21 | Passing |
| `packages/shared` (catalog) | 1 | Variable | Passing |
| `apps/web` | 1 | 1 | **Failing** |
| `apps/mobile` | 0 | 0 | N/A |
| **Total** | 19 | ~231+ | 1 failure |

## Appendix: File Counts by Area

| Area | Files | Key Components |
|------|-------|---------------|
| Web components | 35 | Layout (4), UI primitives (9), Dashboard (3), Reports (4), Subscriptions (7), Transactions (4), Accounts (2), Other (2) |
| Web pages/routes | 14 | Dashboard, Budget, Transactions, Subscriptions (4), Reports (4), Accounts (2), Settings |
| Web server actions | 7 | accounts, budget, categories, db, reports, subscriptions, bank-sync |
| Web API routes | 3 | bank/link-token, bank/exchange, bank/webhook |
| Mobile screens | 14 | 5 tabs + 7 modals + _layout + settings |
| Mobile components | 6 | BudgetHeader, CategoryRow, CategoryGroupSection, TransactionRow, SubscriptionRow, SettingsRow |
| Shared engine files | 14 | budget (3), subscriptions (7), csv (1), catalog (1), utils (2) |
| Shared bank-sync files | 14 | providers, connector, token-vault, webhook, audit, cloud-adapters, runtime, recurring-detector, subscription-discovery |
| Shared model files | Variable | Zod schemas for all 18 tables |
| UI package | ~10 | tokens (3), components (7) |
