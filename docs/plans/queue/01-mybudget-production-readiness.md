# Plan: MyBudget Production Readiness

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Metadata
- **Project:** MyBudget
- **Priority:** 1
- **Effort:** high
- **Dependencies:** none
- **Worktree:** no
- **Created:** 2026-02-28

## Objective

Make MyBudget production-ready by completing the bank sync integration (Plaid Link UI, transaction-to-budget pipeline, account balance sync), adding smart features (transaction rules engine, spending insights, income detection), implementing budget goals/rollover visibility, achieving mobile parity with web features, and hardening the app with error boundaries, data export, and performance optimizations. The result is a shippable $4.99 one-time purchase app that competes with Rocket Money and YNAB on core functionality.

## Scope

### Files/dirs affected

**Phase 1 (Bank Sync Completion):**
- `packages/shared/src/bank-sync/transaction-pipeline.ts` (NEW) -- raw bank txn to budget txn mapper
- `packages/shared/src/bank-sync/balance-sync.ts` (NEW) -- account balance reconciliation
- `packages/shared/src/bank-sync/auto-categorizer.ts` (NEW) -- payee cache + rules-based auto-categorization
- `packages/shared/src/bank-sync/sqlite-store.ts` (NEW) -- SQLite-backed BankSyncConnectorStore + TokenVaultStore (replaces in-memory)
- `packages/shared/src/db/bank-sync-crud.ts` (NEW) -- SQLite CRUD for bank sync tables
- `packages/shared/src/db/schema.ts` (MODIFY) -- also add bank_token_store table
- `packages/shared/src/db/schema.ts` (MODIFY) -- add transaction_rules table, dismissed_subscriptions table
- `packages/shared/src/models/schemas.ts` (MODIFY) -- add Zod schemas for new tables
- `apps/web/app/api/bank/_lib/auth.ts` (NEW) -- auth guard middleware for bank API routes
- `apps/web/app/api/bank/_lib/rate-limit.ts` (NEW) -- rate limiter for bank API routes
- `apps/web/app/api/bank/_lib/runtime.ts` (MODIFY) -- use SQLite-backed stores instead of in-memory
- `apps/web/app/api/bank/sync/route.ts` (NEW) -- manual sync trigger endpoint
- `apps/web/app/api/bank/accounts/route.ts` (NEW) -- list bank accounts for a connection
- `apps/web/app/api/bank/link-token/route.ts` (MODIFY) -- add auth guard and rate limit
- `apps/web/app/api/bank/exchange/route.ts` (MODIFY) -- add auth guard and rate limit
- `apps/web/app/api/bank/webhook/route.ts` (MODIFY) -- upgrade to Plaid JWT verification
- `apps/web/app/actions/bank-sync.ts` (MODIFY) -- add sync trigger, account mapping actions
- `apps/web/components/bank/PlaidLinkButton.tsx` (NEW) -- Plaid Link integration component
- `apps/web/components/bank/BankConnectionCard.tsx` (NEW) -- connection status, last synced, reauth
- `apps/web/components/bank/AccountMappingDialog.tsx` (NEW) -- map bank accounts to budget accounts
- `apps/web/components/bank/SyncStatusIndicator.tsx` (NEW) -- sync progress/status indicator
- `apps/web/app/accounts/connect/page.tsx` (MODIFY) -- replace static scaffold with working Plaid Link flow
- `apps/web/app/accounts/page.tsx` (MODIFY) -- add bank connection cards, sync buttons

**Phase 2 (Smart Features):**
- `packages/shared/src/engine/transaction-rules.ts` (NEW) -- rule matching engine
- `packages/shared/src/engine/spending-insights.ts` (NEW) -- top merchants, MoM comparison, anomaly detection
- `packages/shared/src/engine/income-detector.ts` (NEW) -- recurring income pattern detection
- `packages/shared/src/db/transaction-rules-crud.ts` (NEW) -- CRUD for transaction_rules table
- `apps/web/app/actions/transaction-rules.ts` (NEW) -- server actions for rules CRUD
- `apps/web/app/settings/page.tsx` (MODIFY) -- wire Transaction Rules section to SQLite (replace localStorage)
- `apps/web/components/transactions/TransactionRow.tsx` (MODIFY) -- add auto-categorization indicator
- `apps/web/components/dashboard/SpendingInsights.tsx` (NEW) -- dashboard insights widget
- `apps/web/components/dashboard/IncomeCard.tsx` (NEW) -- detected income + payday countdown

**Phase 3 (Budget Goals & Rules):**
- `packages/shared/src/engine/goals.ts` (NEW) -- savings goal tracking, debt payoff calculator
- `packages/shared/src/engine/rollover.ts` (NEW) -- multi-month rollover chain computation
- `apps/web/app/budget/page.tsx` (MODIFY) -- add goal progress bars, rollover indicators
- `apps/web/components/budget/GoalProgressCard.tsx` (NEW) -- savings goal visualization
- `apps/web/components/budget/CategoryTargetEditor.tsx` (NEW) -- set monthly/goal/debt targets
- `apps/web/components/budget/RolloverIndicator.tsx` (NEW) -- visual carry-forward display
- `apps/web/app/reports/goals/page.tsx` (NEW) -- goals overview report page

**Phase 4 (Mobile Parity):**
- `apps/mobile/app/(tabs)/budget.tsx` (MODIFY) -- add goal progress, rollover indicators
- `apps/mobile/app/(tabs)/accounts.tsx` (MODIFY) -- add bank connection management
- `apps/mobile/app/(tabs)/transactions.tsx` (MODIFY) -- add pending badges, per-date totals
- `apps/mobile/app/bank-connect.tsx` (NEW) -- Plaid Link mobile flow
- `apps/mobile/app/transaction-rules.tsx` (NEW) -- rules management screen
- `apps/mobile/components/BankConnectionCard.tsx` (NEW)
- `apps/mobile/components/GoalProgressBar.tsx` (NEW)
- `apps/mobile/hooks/useBankSync.ts` (NEW) -- bank sync state management hook
- `apps/mobile/hooks/useTransactionRules.ts` (NEW)

**Phase 5 (Hardening):**
- `packages/shared/src/db/export.ts` (NEW) -- full data export to JSON
- `packages/shared/src/db/backup.ts` (NEW) -- SQLite backup to file
- `apps/web/app/actions/data.ts` (NEW) -- export/import server actions
- `apps/web/components/ui/ErrorBoundary.tsx` (NEW) -- React error boundary
- `apps/web/app/error.tsx` (NEW) -- Next.js error page
- `apps/web/app/loading.tsx` (NEW) -- Next.js loading page
- `apps/web/app/not-found.tsx` (NEW) -- 404 page
- `apps/web/app/settings/page.tsx` (MODIFY) -- wire data export/import buttons, notification persistence
- `apps/web/app/actions/preferences.ts` (NEW) -- preference CRUD server actions
- `apps/web/test/landing-interface.test.tsx` (MODIFY) -- fix failing test
- `apps/mobile/components/ErrorBoundary.tsx` (NEW)

### Files NOT to touch
- `packages/shared/src/catalog/data.ts` -- 200+ entry catalog is complete
- `packages/shared/src/csv/` -- CSV parser is stable
- `packages/shared/src/subscriptions/` -- subscription engine is stable (only add new integrations)
- `packages/ui/` -- design tokens and base components are stable
- `turbo.json`, `pnpm-workspace.yaml` -- monorepo config is stable
- Any files outside `MyBudget/`

## Phases

### Phase 1: Bank Sync Completion (Connect, Sync, Map Transactions)

The bank sync infrastructure (provider router, connector service, token vault, Plaid client, webhook handler, audit log) is fully built in `packages/shared/src/bank-sync/`. What's missing is the last-mile integration: a working Plaid Link UI, the pipeline that converts raw bank transactions into budget transactions, account balance synchronization, and the bank-to-budget account mapping.

#### 1.1: Transaction Pipeline

- [ ] Create `packages/shared/src/bank-sync/transaction-pipeline.ts`:
  - Pure function `mapBankTransactionToBudget(raw: BankTransactionRecord, mapping: { localAccountId: string; payeeCategoryMap: Map<string, string> }): TransactionInsert`
  - Handles amount sign normalization (Plaid uses positive for outflows)
  - Maps `raw.payee` through payee cache for auto-categorization
  - Sets `is_cleared` based on `isPending` flag
  - Deduplication check: match on `(account_id, date, payee, amount)` to avoid double-importing
  - Function `processSyncDelta(result: BankSyncResult, db: DatabaseAdapter, connectionId: string)`: iterates added/modified/removed, upserts budget transactions, handles pending-to-posted transitions
- [ ] Create `packages/shared/src/bank-sync/balance-sync.ts`:
  - Function `syncAccountBalances(bankAccounts: BankAccountRecord[], db: DatabaseAdapter)`: updates `accounts.balance` for mapped bank accounts
  - Only updates accounts where `bank_accounts.local_account_id IS NOT NULL`
  - Amounts converted to cents (Plaid reports in dollars)
- [ ] Create `packages/shared/src/db/bank-sync-crud.ts`:
  - `insertBankConnection(db, record)` / `updateBankConnectionStatus(db, id, status)`
  - `insertBankAccount(db, record)` / `linkBankAccountToLocal(db, bankAccountId, localAccountId)`
  - `insertRawBankTransaction(db, record)` / `deleteRawBankTransaction(db, providerTxnId)`
  - `upsertSyncCursor(db, connectionId, cursor)`
  - `getBankConnectionsWithAccounts(db): BankConnection[]` (join query)
- [ ] Write tests for transaction pipeline: test amount normalization, dedup logic, pending-to-posted, payee matching
- [ ] Write tests for balance sync: test cent conversion, null balance handling, unmapped account skip
- **Acceptance:** `pnpm test` passes with new pipeline tests. `processSyncDelta` correctly maps Plaid transactions to budget transactions with proper amounts, dates, and categories.

#### 1.2: Persistent Storage, Auth Guards & Rate Limiting

- [ ] Create `packages/shared/src/bank-sync/sqlite-store.ts`:
  - Implement `BankSyncConnectorStore` interface backed by SQLite (replaces `createInMemoryBankSyncConnectorStore()`)
  - Implement `BankTokenVaultStore` interface backed by SQLite (replaces `createInMemoryTokenVaultStore()`)
  - All connection state, sync cursors, transaction deltas, and webhook records persisted to the existing bank sync tables
  - Token ciphertext stored in a new `bank_token_store` table (add to schema.ts)
  - Data survives server restarts -- this is a P0 production blocker
- [ ] Update `apps/web/app/api/bank/_lib/runtime.ts`:
  - Replace `createInMemoryBankSyncConnectorStore()` with `createSqliteBankSyncConnectorStore(db)`
  - Replace `createInMemoryTokenVaultStore()` with `createSqliteTokenVaultStore(db)`
- [ ] Create `apps/web/app/api/bank/_lib/auth.ts`:
  - `requireBankApiAuth(request: NextRequest): { userId: string }` -- validates user identity
  - For MVP: accept a `X-User-Id` header or `userId` in request body (local-only app, no cloud auth)
  - For production: validate session token when auth is added (Phase 3 of MyLife hub)
  - Reject requests without valid user identity with 401
- [ ] Create `apps/web/app/api/bank/_lib/rate-limit.ts`:
  - In-memory sliding window rate limiter (per userId, not global)
  - Limits: link-token (5/min), exchange (3/min), sync (10/min), webhook (30/min)
  - Returns 429 with `Retry-After` header when exceeded
  - Resets on server restart (acceptable for local-only app)
- [ ] Update `apps/web/app/api/bank/link-token/route.ts`: add auth guard and rate limit wrapper
- [ ] Update `apps/web/app/api/bank/exchange/route.ts`: add auth guard and rate limit wrapper
- [ ] Update `apps/web/app/api/bank/webhook/route.ts`:
  - Upgrade from HMAC verification to Plaid JWT verification (`webhook_verification_key/get`)
  - Plaid production webhooks use JWK-based JWT, not shared-secret HMAC
  - Keep HMAC as fallback for non-Plaid providers
  - Add rate limiting (no auth guard -- webhooks are server-to-server)
- [ ] Write tests: SQLite store persistence (insert, read back, survive "restart"), rate limiter window logic, auth guard rejection
- **Acceptance:** Bank API routes have auth guards and rate limiting. Connection/token data persists across server restarts. Plaid webhook verification supports JWT. Tests pass.

#### 1.3: Schema Migration for Transaction Rules & Dismissed Subscriptions

- [ ] Add to `packages/shared/src/db/schema.ts` (new tables, increment SCHEMA_VERSION to 3):
  ```sql
  CREATE TABLE IF NOT EXISTS transaction_rules (
    id TEXT PRIMARY KEY NOT NULL,
    payee_pattern TEXT NOT NULL,
    match_type TEXT NOT NULL CHECK(match_type IN ('contains', 'exact', 'starts_with')),
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    is_active INTEGER NOT NULL DEFAULT 1,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS dismissed_subscriptions (
    id TEXT PRIMARY KEY NOT NULL,
    normalized_payee TEXT NOT NULL UNIQUE,
    dismissed_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  ```
- [ ] Add indexes: `idx_transaction_rules_payee_pattern`, `idx_dismissed_subscriptions_payee`
- [ ] Add Zod schemas to `packages/shared/src/models/schemas.ts`: `TransactionRuleSchema`, `TransactionRuleInsertSchema`, `DismissedSubscriptionSchema`
- [ ] Write migration path: create tables if not exists (SQLite is additive-safe)
- **Acceptance:** Schema version 3 creates new tables. Existing data is preserved. `pnpm test` passes.

#### 1.4: Plaid Link UI & Account Mapping

- [ ] Create `apps/web/components/bank/PlaidLinkButton.tsx`:
  - Calls `/api/bank/link-token` to get link token
  - Launches Plaid Link via `react-plaid-link` (add dependency)
  - On success, calls `/api/bank/exchange` with public token + institution metadata
  - Shows loading spinner during token exchange
  - On completion, triggers initial sync and opens AccountMappingDialog
- [ ] Create `apps/web/components/bank/BankConnectionCard.tsx`:
  - Shows institution name, connection status badge (active/error/requires_reauth)
  - Last synced timestamp (relative: "2 hours ago")
  - "Sync Now" button that calls `/api/bank/sync`
  - "Disconnect" button with confirmation dialog
  - Account list showing name, type, mask, balance
- [ ] Create `apps/web/components/bank/AccountMappingDialog.tsx`:
  - Lists bank accounts from the connection
  - Dropdown per bank account: map to existing budget account or "Create New"
  - When "Create New" selected, auto-creates account with bank name/type
  - Save button persists `bank_accounts.local_account_id` mappings
- [ ] Create `apps/web/components/bank/SyncStatusIndicator.tsx`:
  - Small badge showing sync state: idle/running/error
  - Transaction count from last sync ("12 new transactions")
  - Error message display with retry button
- [ ] Create `apps/web/app/api/bank/sync/route.ts`:
  - POST handler that triggers `connector.syncConnection()`
  - After sync, calls `processSyncDelta()` to map to budget transactions
  - Calls `syncAccountBalances()` to update account balances
  - Returns sync summary (added/modified/removed counts)
- [ ] Create `apps/web/app/api/bank/accounts/route.ts`:
  - GET handler: returns bank accounts for a connection
  - POST handler: update `local_account_id` mapping
- [ ] Update `apps/web/app/accounts/connect/page.tsx`: replace static scaffold with PlaidLinkButton + setup instructions
- [ ] Update `apps/web/app/accounts/page.tsx`: add BankConnectionCard for each connection, show sync status
- [ ] Update `apps/web/app/actions/bank-sync.ts`: add `triggerSync(connectionId)`, `mapBankAccount(bankAccountId, localAccountId)`, `fetchBankConnectionsWithAccounts()`
- **Acceptance:** User can connect a bank via Plaid Link (in sandbox mode), map bank accounts to budget accounts, trigger a sync, and see transactions appear in the Transactions page. Account balances update after sync. The connect/sync flow works end-to-end on web.

#### 1.5: Auto-Categorization Pipeline

- [ ] Create `packages/shared/src/bank-sync/auto-categorizer.ts`:
  - Function `autoCategorize(payee: string, db: DatabaseAdapter): string | null`
  - Priority order: (1) exact transaction rule match, (2) contains/starts_with rule match, (3) payee cache lookup
  - Returns `category_id` or null
  - Function `applyAutoCategoriesToSync(transactions: TransactionInsert[], db: DatabaseAdapter): TransactionInsert[]`
  - Applies auto-categorizer to each transaction, fills in category via splits
- [ ] Integrate into `processSyncDelta()`: auto-categorize before inserting budget transactions
- [ ] Write tests: rule priority, payee cache fallback, no-match returns null
- **Acceptance:** Synced transactions are auto-categorized when a matching rule or payee cache entry exists. Uncategorized transactions appear without a category (user assigns manually). Tests pass.

### Phase 2: Smart Features (Rules Engine, Insights, Income Detection)

#### 2.1: Transaction Rules Engine (SQLite-backed)

- [ ] Create `packages/shared/src/engine/transaction-rules.ts`:
  - `matchRule(payee: string, rules: TransactionRule[]): TransactionRule | null` -- returns highest-priority matching rule
  - `applyRulesToTransaction(payee: string, db: DatabaseAdapter): { categoryId: string; ruleId: string } | null`
  - Rule match types: `contains` (case-insensitive substring), `exact` (normalized match), `starts_with`
  - Rules ordered by priority (lower number = higher priority), then by specificity (exact > starts_with > contains)
- [ ] Create `packages/shared/src/db/transaction-rules-crud.ts`:
  - `getAllRules(db): TransactionRule[]`
  - `createRule(db, rule: TransactionRuleInsert): TransactionRule`
  - `updateRule(db, id, updates): void`
  - `deleteRule(db, id): void`
  - `toggleRule(db, id, isActive: boolean): void`
- [ ] Create `apps/web/app/actions/transaction-rules.ts`:
  - Server actions: `fetchRules()`, `addRule(input)`, `updateRule(id, updates)`, `removeRule(id)`, `toggleRuleActive(id, active)`
- [ ] Update `apps/web/app/settings/page.tsx` `TransactionRulesSection`:
  - Replace `localStorage` storage with SQLite via server actions
  - Add match type selector (contains/exact/starts_with)
  - Add priority field (drag-to-reorder or number input)
  - Add enable/disable toggle per rule
  - Show "X transactions matched" count per rule
- [ ] Write tests: rule matching priority, all match types, case insensitivity, empty rules list
- **Acceptance:** Transaction rules are persisted in SQLite. Rules apply to both manual transactions and bank-synced transactions. Settings page manages rules with full CRUD. Tests pass.

#### 2.2: Spending Insights Engine

- [ ] Create `packages/shared/src/engine/spending-insights.ts`:
  - `getTopMerchants(db, month: string, limit: number): Array<{ payee, count, total, average }>` -- top merchants by frequency
  - `getMonthOverMonthComparison(db, month: string): { thisMonth, lastMonth, percentChange, delta }` -- total spending comparison
  - `getCategoryComparison(db, month: string): Array<{ categoryId, name, thisMonth, lastMonth, percentChange }>` -- per-category MoM
  - `detectSpendingAnomalies(db, month: string): Array<{ payee, amount, averageAmount, deviation }>` -- unusually large transactions (>2x average for that payee)
  - All functions are read-only, no side effects
- [ ] Create `apps/web/components/dashboard/SpendingInsights.tsx`:
  - Card showing top 3 merchants with frequency and total
  - "You've spent X% more/less than last month" comparison
  - Anomaly alert: "Unusually large charge at [payee]: $X (typically $Y)"
- [ ] Add `fetchSpendingInsights(month)` to `apps/web/app/actions/reports.ts`
- [ ] Wire SpendingInsights into dashboard page (`apps/web/app/page.tsx`)
- [ ] Write tests: top merchants aggregation, MoM comparison with no prior month, anomaly detection threshold
- **Acceptance:** Dashboard shows top merchants, month-over-month spending change, and anomaly alerts. Insights update when the current month changes. Tests pass.

#### 2.3: Income Detection Engine

- [ ] Create `packages/shared/src/engine/income-detector.ts`:
  - `detectRecurringIncome(db, lookbackMonths: number): Array<{ payee, amount, frequency, confidence, nextExpected }>` -- analyzes positive (inflow) transactions for recurring patterns
  - Uses same frequency detection logic as `recurring-detector.ts` but for inflows
  - `getPaydayCountdown(db): { nextPayday: string; daysUntil: number } | null` -- estimates next payday based on detected income pattern
  - `estimateMonthlyIncome(db): number` -- average monthly income over last 3 months
- [ ] Create `apps/web/components/dashboard/IncomeCard.tsx`:
  - Shows estimated monthly income
  - "Payday in X days" countdown badge
  - Last 3 income deposits with dates and amounts
- [ ] Wire into dashboard
- [ ] Write tests: income detection with biweekly/monthly patterns, payday estimation, insufficient data handling
- **Acceptance:** Income detection identifies recurring deposits. Payday countdown shows on dashboard when patterns are found. Tests pass.

### Phase 3: Budget Goals & Rollover Visibility

#### 3.1: Goals Engine

- [ ] Create `packages/shared/src/engine/goals.ts`:
  - `calculateSavingsGoalProgress(category: CategoryBudgetState): { target, current, percentComplete, onTrack, estimatedCompletion }` -- for `target_type = 'savings_goal'`
  - `calculateDebtPayoffSchedule(category: CategoryBudgetState, interestRate: number): { monthsRemaining, totalInterest, payoffDate }` -- for `target_type = 'debt_payment'`
  - `getGoalsSummary(budgetState: MonthBudgetState): { totalGoals, onTrack, needsAttention, completed }` -- aggregate stats
- [ ] Create `apps/web/components/budget/GoalProgressCard.tsx`:
  - Circular progress ring showing % complete
  - "On track" / "Needs attention" / "Completed" status badge
  - Estimated completion date
  - "Fund" button to allocate more to this category
- [ ] Create `apps/web/components/budget/CategoryTargetEditor.tsx`:
  - Dialog to set target_type (monthly/savings_goal/debt_payment) and target_amount
  - For savings goals: target date picker, auto-calculates monthly needed
  - For debt: interest rate input, minimum payment, payoff timeline chart
- [ ] Create `apps/web/app/reports/goals/page.tsx`:
  - Overview of all savings goals and debt payoff targets
  - Progress bars per goal
  - Total saved toward goals
  - Projected completion dates
- [ ] Write tests: savings goal progress calculation, debt payoff with interest, edge cases (zero target, over-funded goal)
- **Acceptance:** Categories with targets show progress visualization. Goals report page shows all goals. Users can set/edit targets via the editor dialog. Tests pass.

#### 3.2: Rollover Visibility

- [ ] Create `packages/shared/src/engine/rollover.ts`:
  - `computeRolloverChain(db, fromMonth: string, toMonth: string): Map<string, RolloverEntry[]>` -- compute carry-forward chain per category across months
  - `RolloverEntry = { month, allocated, activity, carryIn, carryOut }`
  - This supplements the existing `getCarryForward()` by providing a multi-month view
- [ ] Create `apps/web/components/budget/RolloverIndicator.tsx`:
  - Small badge on each category row showing carry-forward amount
  - Green for positive rollover, amber for negative
  - Tooltip with "Carried $X from last month"
  - Click opens rollover history (last 3 months breakdown)
- [ ] Update `apps/web/app/budget/page.tsx`:
  - Add RolloverIndicator to each category row
  - Add GoalProgressCard for categories with targets
  - Add "Goals" summary card at top of budget page
- [ ] Write tests: rollover chain computation across 3+ months, negative rollover propagation
- **Acceptance:** Budget page shows rollover indicators and goal progress. Multi-month rollover chain computes correctly. Tests pass.

### Phase 4: Mobile Parity

#### 4.1: Mobile Bank Sync

- [ ] Create `apps/mobile/app/bank-connect.tsx`:
  - Uses `react-native-plaid-link-sdk` for Plaid Link on mobile
  - Same flow as web: get link token, launch Link, exchange token, map accounts
  - Shows connection status after linking
- [ ] Create `apps/mobile/hooks/useBankSync.ts`:
  - Hook providing: `connections`, `isLoading`, `syncConnection(id)`, `disconnectConnection(id)`
  - Calls shared bank-sync CRUD functions via database adapter
- [ ] Create `apps/mobile/components/BankConnectionCard.tsx`:
  - Mobile-optimized connection card (matches web but for React Native)
  - Sync button, status badge, account list
- [ ] Update `apps/mobile/app/(tabs)/accounts.tsx`:
  - Add "Connect Bank" button
  - Show BankConnectionCard for each connection
  - Show sync status
- **Acceptance:** Mobile users can connect bank accounts via Plaid Link, sync transactions, and see bank connection status. Matches web functionality.

#### 4.2: Mobile Budget Goals & Rules

- [ ] Create `apps/mobile/components/GoalProgressBar.tsx`:
  - React Native progress bar matching web GoalProgressCard design
- [ ] Create `apps/mobile/app/transaction-rules.tsx`:
  - Mobile rules management screen
  - List of rules with swipe-to-delete
  - Add rule form at bottom
- [ ] Create `apps/mobile/hooks/useTransactionRules.ts`:
  - Hook providing: `rules`, `addRule`, `deleteRule`, `toggleRule`
- [ ] Update `apps/mobile/app/(tabs)/budget.tsx`:
  - Add rollover indicators to category rows
  - Add goal progress to categories with targets
- [ ] Update `apps/mobile/app/(tabs)/transactions.tsx`:
  - Add pending transaction badges
  - Add per-date spending totals as section headers
- [ ] Update `apps/mobile/app/settings.tsx`:
  - Add "Transaction Rules" navigation item
- **Acceptance:** Mobile app has feature parity with web for goals, rollover, transaction rules, and pending badges. `pnpm check:parity` validates alignment.

### Phase 5: Hardening & Ship Prep

#### 5.1: Data Export & Backup

- [ ] Create `packages/shared/src/db/export.ts`:
  - `exportAllData(db): BudgetExportData` -- exports all 18+ tables to a typed JSON structure
  - `importData(db, data: BudgetExportData): ImportResult` -- imports from JSON, handles conflicts (skip duplicates)
  - Export format includes schema version for forward compatibility
- [ ] Create `packages/shared/src/db/backup.ts`:
  - `createBackup(db, filePath: string): void` -- SQLite `.backup()` to file
  - `restoreBackup(db, filePath: string): void` -- restore from backup file
- [ ] Create `apps/web/app/actions/data.ts`:
  - `exportBudgetData(): BudgetExportData` -- JSON export
  - `importBudgetData(data: BudgetExportData): ImportResult`
- [ ] Update `apps/web/app/settings/page.tsx` `DataSection`:
  - Wire Export button to download JSON file
  - Wire Import button to file upload + parse + import
  - Add "Create Backup" button
  - Wire Reset button to actual database reset with confirmation
- [ ] Write tests: export round-trip (export then import produces same data), backup/restore integrity
- **Acceptance:** Users can export all data as JSON, import from JSON, and create/restore SQLite backups. Export format is versioned. Tests pass.

#### 5.2: Error Boundaries & Loading States

- [ ] Create `apps/web/components/ui/ErrorBoundary.tsx`:
  - React error boundary component with "Something went wrong" UI
  - "Try again" button that resets error state
  - Reports error details in collapsed section
- [ ] Create `apps/web/app/error.tsx` (Next.js error page):
  - Catches unhandled errors
  - Shows error boundary UI with navigation back to dashboard
- [ ] Create `apps/web/app/loading.tsx`:
  - Global loading skeleton
- [ ] Create `apps/web/app/not-found.tsx`:
  - 404 page with navigation back to dashboard
- [ ] Create `apps/mobile/components/ErrorBoundary.tsx`:
  - React Native error boundary with retry
- [ ] Add error boundaries to all page-level components (wrap in ErrorBoundary)
- [ ] Replace all raw `try/finally` patterns in page components with proper error handling (show user-friendly error messages instead of empty states on failure)
- **Acceptance:** Unhandled errors show user-friendly error pages instead of white screens. Loading states show skeletons. 404 page exists. Mobile has error boundaries.

#### 5.3: Fix Failing Tests & Notification Persistence

- [ ] Fix `apps/web/test/landing-interface.test.tsx` -- currently the only web test and it's failing (P0 blocker from research report)
- [ ] Wire notification preferences (bill reminders, over-budget alerts, weekly digest toggles in Settings) to SQLite `preferences` table instead of local React state
  - Use existing `preferences` table with keys: `notify_bill_reminders`, `notify_over_budget`, `notify_weekly_digest`
  - Load saved preferences on mount, persist on toggle
- [ ] Add server actions to `apps/web/app/actions/preferences.ts` (NEW): `getPreference(key)`, `setPreference(key, value)`, `getAllPreferences()`
- **Acceptance:** All existing web tests pass. Notification toggle states survive page reload.

#### 5.4: Performance & Final Polish

- [ ] Audit all `useEffect` + `useCallback` patterns in web app pages for unnecessary re-renders
- [ ] Add `React.memo` to expensive list item components: `TransactionRow`, `CategoryRow`, `SubscriptionRow`
- [ ] Ensure all database queries use proper indexes (verify with EXPLAIN QUERY PLAN)
- [ ] Add loading skeletons to all page components (budget, transactions, subscriptions, reports, accounts)
- [ ] Verify dark theme consistency across all new components
- [ ] Update version number from `0.1.0` to `1.0.0` in settings display
- **Acceptance:** No visible performance issues with 500+ transactions. All pages have loading skeletons. Dark theme is consistent. Version shows 1.0.0.

## Acceptance Criteria

- [ ] All existing tests pass (`pnpm test`) -- including fixed `landing-interface.test.tsx`
- [ ] All new engine/pipeline tests pass (transaction pipeline, SQLite stores, rules engine, insights, goals, rollover, income detector, export, rate limiter)
- [ ] Bank sync end-to-end works in Plaid sandbox: connect, sync transactions, auto-categorize, update balances
- [ ] Bank API routes have auth guards and rate limiting
- [ ] Bank connection/token data persists across server restarts (SQLite-backed, not in-memory)
- [ ] Plaid webhook verification supports JWT (production-ready)
- [ ] Transaction rules engine persists in SQLite and applies to both manual and synced transactions
- [ ] Dashboard shows spending insights, income detection, and payday countdown
- [ ] Budget page shows goal progress and rollover indicators
- [ ] Mobile app has feature parity: bank sync, goals, rules, pending badges
- [ ] Data export/import round-trip produces identical data
- [ ] Notification preferences persist across page reloads (SQLite preferences table)
- [ ] Error boundaries catch and display errors gracefully on all pages
- [ ] `pnpm typecheck` passes with no errors
- [ ] `pnpm lint` passes
- [ ] `pnpm check:parity` passes (standalone/hub parity maintained)
- [ ] `timeline.md` updated with all changes

## Constraints

- Do NOT modify files outside the declared Scope
- Follow MyBudget CLAUDE.md conventions (Conventional Commits, TypeScript-first, integer cents for money)
- ALL currency amounts stored as integer cents -- no floating-point math on money
- Bank sync is optional -- manual mode must remain fully functional
- No analytics, no telemetry, no cloud data storage (privacy-first)
- Dark theme only for MVP
- The `packages/shared/` code must have zero React dependency (business logic only)
- Use `react-plaid-link` for web and `react-native-plaid-link-sdk` for mobile (do not build custom Plaid integration)
- Transaction rules in SQLite, not localStorage (the current localStorage implementation in settings is a scaffold to be replaced)
- Test all new engine functions with Vitest -- minimum one test file per new engine module
- Maintain backward compatibility: existing data must survive schema migration to v3

## File Ownership Zone Assignments

| Zone | Agent | Files |
|------|-------|-------|
| Bank sync pipeline | dev-backend | `packages/shared/src/bank-sync/transaction-pipeline.ts`, `balance-sync.ts`, `auto-categorizer.ts`, `sqlite-store.ts`, `packages/shared/src/db/bank-sync-crud.ts` |
| Engine modules | dev-backend | `packages/shared/src/engine/transaction-rules.ts`, `spending-insights.ts`, `income-detector.ts`, `goals.ts`, `rollover.ts` |
| Schema & models | dev-backend | `packages/shared/src/db/schema.ts`, `packages/shared/src/models/schemas.ts` |
| CRUD modules | dev-backend | `packages/shared/src/db/transaction-rules-crud.ts`, `packages/shared/src/db/export.ts`, `packages/shared/src/db/backup.ts` |
| Web API routes + security | dev-frontend | `apps/web/app/api/bank/sync/route.ts`, `apps/web/app/api/bank/accounts/route.ts`, `apps/web/app/api/bank/_lib/auth.ts`, `apps/web/app/api/bank/_lib/rate-limit.ts`, modified `link-token/route.ts`, `exchange/route.ts`, `webhook/route.ts` |
| Web components | dev-frontend | `apps/web/components/bank/*`, `apps/web/components/dashboard/*`, `apps/web/components/budget/*`, `apps/web/components/ui/ErrorBoundary.tsx` |
| Web pages | dev-frontend | `apps/web/app/accounts/*`, `apps/web/app/budget/page.tsx`, `apps/web/app/reports/goals/*`, `apps/web/app/settings/page.tsx`, `apps/web/app/error.tsx`, `apps/web/app/loading.tsx`, `apps/web/app/not-found.tsx` |
| Web server actions | dev-frontend | `apps/web/app/actions/bank-sync.ts`, `apps/web/app/actions/transaction-rules.ts`, `apps/web/app/actions/data.ts` |
| Mobile screens | dev-frontend | `apps/mobile/app/bank-connect.tsx`, `apps/mobile/app/transaction-rules.tsx`, all mobile component/hook additions |
| Tests | test-writer | All `__tests__/` directories, all `.test.ts` files |

## Notes

### Research Report Reference

See `docs/REPORT-production-readiness-2026-02-28.md` for the full 38-feature gap analysis across 6 competitors (YNAB, Monarch Money, Rocket Money, Copilot, Goodbudget, EveryDollar). Key findings:
- 5 P0 production blockers: bank sync activation, auth guards, rate limiting, error boundaries, failing web test
- 231 shared tests passing, 1 web test failing, 0 mobile tests
- 35+ web components vs 6 mobile components (severe mobile parity gap)
- In-memory stores for bank sync (data lost on restart) is a P0 blocker
- HMAC webhook verification insufficient for Plaid production (needs JWT/JWK)

### Existing Infrastructure Summary

The bank sync scaffolding is extensive and production-quality:
- **Provider Router** (`provider-router.ts`): Routes to provider-specific clients. Only Plaid is implemented.
- **Connector Service** (`connector-service.ts`): Full lifecycle: createLinkToken, connectWithPublicToken, syncConnection, disconnectConnection, ingestWebhook. Includes audit logging and webhook verification.
- **Server Runtime** (`server-runtime.ts`): Singleton factory wiring Plaid client, KMS-backed token vault (AWS/GCP/dev), HMAC webhook verifier, and audit logger.
- **Plaid Client** (`providers/plaid.ts`): Raw HTTP calls to Plaid API (no Plaid SDK dependency). Supports sandbox/development/production.
- **Token Vault** (`token-vault.ts`): Encrypted at-rest storage with pluggable cipher (AWS KMS, GCP KMS, or dev fallback).
- **Webhook Security** (`webhook-security.ts`): HMAC signature verification with timestamp replay protection.
- **Recurring Detector** (`recurring-detector.ts`): Pure function analyzing bank transactions for subscription patterns. Confidence scoring with catalog matching.
- **API Routes**: `link-token`, `exchange`, and `webhook` routes are fully implemented in `apps/web/app/api/bank/`.

What's missing is the "last mile": the UI to launch Plaid Link, the pipeline to convert raw bank transactions to budget transactions, account mapping, and balance sync.

### Competitor Feature Reference

Based on Rocket Money comparison (REPORT-rocket-money-comparison-2026-02-27.md):
- Spending insights (top merchants, MoM comparison) are P0 features Rocket Money excels at
- Transaction rules auto-categorization is a core Rocket Money feature
- Income detection and payday countdown are unique Rocket Money differentiators
- Budget goals and rollover visibility are YNAB strengths that Rocket Money lacks
- MyBudget's combination of YNAB-style envelopes + Rocket Money-style insights is the competitive advantage

### Risk Mitigation

- Plaid Link in sandbox mode for development -- no real bank credentials needed
- Schema migration is additive (new tables only) -- zero risk of data loss
- All new engine functions are pure or read-only -- no side effects to existing data
- Transaction rules replace localStorage scaffold, which has no existing user data to migrate
- Mobile Plaid Link requires `react-native-plaid-link-sdk` which must be tested on physical devices
