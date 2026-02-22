# MyBudget — Design Document

**Date:** 2026-02-22
**Status:** Draft
**Author:** MyApps Product Team

---

## Overview

**MyBudget** — Budget without giving away your bank password.

A privacy-first envelope budgeting app that keeps all financial data on your device. No bank connections, no Plaid, no Yodlee, no cloud sync. Manual transaction entry with smart autocomplete, CSV import from downloaded bank statements, and full envelope budgeting methodology — all for a one-time $4.99 purchase.

MyBudget is the anti-Mint budgeting app for people who care about financial privacy. In a post-Mint world where every budgeting app demands your bank credentials, MyBudget proves that the best budgeting system doesn't need access to your accounts — it just needs you to be intentional about every dollar.

---

## Problem Statement

The budgeting app market has a trust problem:

1. **Mint died** (March 2024) — 3.6M users displaced overnight. Their data was sold to Intuit. Users realized "free" meant "you are the product."
2. **YNAB costs $109/year** — The gold standard of envelope budgeting, but it's a subscription and it pushes bank connections via Plaid.
3. **Monarch Money costs $100/year** — Positioned as the Mint replacement, but requires bank access and charges annually.
4. **Every competitor requires bank credentials** — Plaid and Yodlee act as intermediaries with broad read access to transaction history, balances, and account metadata. Users hand over the keys to their financial lives.
5. **Manual budgeting is proven more effective** — YNAB's own research shows that users who manually enter transactions are more aware of their spending and stick with budgeting longer. The manual workflow is a feature, not a limitation.

MyBudget fills the gap: a serious envelope budgeting app with zero bank connections, zero subscriptions, and zero data leaving the device.

---

## Target User Persona

### Primary: "Privacy-Conscious Budgeter" (Alex, 28-42)

- **Demographics:** Millennial or elder Gen-Z, $45K-$120K household income, tech-literate
- **Behavior:** Downloads bank statements as CSV monthly. Uses a spreadsheet or YNAB. Reads r/personalfinance and r/privacy. Has considered or used a VPN. Deleted Mint before it shut down.
- **Pain point:** Wants YNAB's envelope system without YNAB's subscription or bank connection requirement
- **Motivation:** "I want to budget intentionally, and I don't want Plaid scraping my Chase account"
- **Willingness to pay:** $5 one-time without hesitation; refuses $100/yr subscriptions for a budgeting tool
- **Platforms:** iPhone (primary), iPad (secondary), Mac (nice-to-have)

### Secondary: "Mint Refugee" (Jordan, 25-55)

- **Demographics:** Broader age range, used Mint for years, reluctantly moved to Monarch or YNAB
- **Pain point:** Doesn't want another subscription. Angry about Mint's data practices. Wants something simple that just works.
- **Behavior:** Downloads bank statements occasionally. Comfortable with manual entry if the UX is smooth.

### Tertiary: "Cash Budgeter" (Sam, 22-35)

- **Demographics:** Younger, may be underbanked or prefer cash/debit. Dave Ramsey adjacent.
- **Pain point:** Physical envelope system is tedious. Wants a digital version without the bank account requirement.
- **Behavior:** Already tracks spending manually. Wants a better interface than a spreadsheet.

---

## Competitive Landscape

| App | Price | Est. Users | Est. Revenue | Privacy Stance | Key Weakness |
|-----|-------|-----------|-------------|----------------|-------------|
| **YNAB** | $109/yr | 1M+ subscribers | $100M+/yr ARR | Plaid bank connections; data stored on YNAB servers | Expensive subscription; requires bank access for full experience; complex onboarding |
| **Monarch Money** | $100/yr | 500K+ (growing) | $40M+/yr ARR | Plaid bank connections; cloud-based | Subscription fatigue; positioned as "Mint replacement" but costs more; requires bank access |
| **Simplifi by Quicken** | $72/yr | 200K+ | $15M+/yr ARR | Plaid bank connections; Quicken ecosystem | Less known; Quicken brand carries legacy baggage; subscription model |
| **Actual Budget** | Free (OSS) | 50K+ | $0 (donations) | Self-hosted; privacy-first | Requires self-hosting for sync; technical users only; no mobile-native experience |
| **Goodbudget** | Free/$80/yr | 300K+ | $5M+/yr | No bank connections (manual entry) | Dated UI; limited free tier (20 envelopes); no CSV import on free plan |
| **EveryDollar** | Free/$130/yr | 1M+ | $50M+/yr | Ramsey Solutions; Plaid on premium | Dave Ramsey branding limits audience; free tier is manual-only but stripped down |

### Opportunity

No app in the market combines: (1) envelope budgeting, (2) zero bank connections, (3) polished native UI, (4) one-time purchase pricing, and (5) full CSV import. Goodbudget comes closest but has a dated UI and locks CSV import behind a subscription. Actual Budget is privacy-first but requires self-hosting. MyBudget fills this exact gap.

---

## Key Features (MVP)

### 1. Envelope System (Budget Categories)

- Create unlimited budget categories ("envelopes"): Groceries, Rent, Dining Out, etc.
- Group categories into sections: Fixed Expenses, Variable Expenses, Savings Goals, Debt Payments
- Set monthly budget amounts per category
- "Ready to Assign" balance shows unallocated income — the core YNAB concept
- Move money between envelopes with drag-and-drop
- Overspent categories highlighted in coral; underspent in teal
- Category emoji/icon picker for visual identification

### 2. Transaction Entry with Smart Autocomplete

- Quick-add transaction: amount, payee, category, date, memo
- Smart autocomplete learns from previous entries (payee -> category mapping)
- After 3 entries to "Trader Joe's" categorized as "Groceries," future entries auto-suggest the category
- Split transactions across multiple categories (e.g., Target receipt: $50 groceries + $30 clothing)
- Cleared/uncleared status for reconciliation
- Swipe actions: swipe left to delete, swipe right to toggle cleared

### 3. Recurring Transactions

- Set up recurring income (paychecks) and expenses (rent, utilities, subscriptions)
- Frequency options: weekly, bi-weekly, monthly, quarterly, annually, custom
- Auto-generates pending transactions on schedule
- User confirms/adjusts amount when each recurrence posts
- Visual calendar showing upcoming recurring items

### 4. CSV Import from Bank Statements

- Import CSV files downloaded from any bank's website
- Column mapping UI: match CSV columns to Amount, Date, Payee, Memo
- Save column mappings per bank for one-tap future imports
- Preview imported transactions before committing
- Duplicate detection: flag transactions that match existing entries (date + amount + payee)
- Supported date formats: MM/DD/YYYY, YYYY-MM-DD, DD/MM/YYYY, M/D/YY
- Handle negative amounts (debits) and positive amounts (credits) with configurable sign convention

### 5. Monthly Reports

- Budget vs. Actual by category (bar chart)
- Spending by category (pie/donut chart)
- Income vs. Expenses trend (line chart, 6-month rolling)
- Net worth tracking (manual account balances)
- Monthly summary card: total income, total expenses, net savings, top 3 spending categories

### 6. Account Management

- Multiple accounts: Checking, Savings, Credit Card, Cash
- Account balances updated automatically from transactions
- Transfer between accounts (shows as outflow from one, inflow to another)
- Reconciliation workflow: compare app balance to bank statement balance
- Credit card payment tracking: category spending → credit card debt → payment from checking

### 7. Search and Filter

- Full-text search across payees, memos, and categories
- Filter by: date range, category, account, amount range, cleared status
- Sort by: date, amount, payee, category

---

## Technical Architecture

### Stack

- **Mobile:** Expo (React Native) — iOS + Android from single codebase
- **Web:** Next.js 15 — Mac/desktop access via browser
- **Database:** SQLite via `expo-sqlite` (mobile) / `better-sqlite3` (web, optional)
- **Monorepo:** Turborepo
- **Package Manager:** pnpm
- **Language:** TypeScript everywhere
- **Charts:** `react-native-svg` + `victory-native` (mobile), `recharts` (web)
- **File handling:** `expo-document-picker` for CSV import
- **Notifications:** `expo-notifications` for recurring transaction reminders
- **Payments:** RevenueCat (App Store IAP), Lemon Squeezy (direct)

### Monorepo Structure

```
MyBudget/
├── apps/
│   ├── mobile/                # Expo (React Native) — iOS + Android
│   │   ├── app/               # Expo Router file-based routing
│   │   │   ├── (tabs)/        # Tab navigation
│   │   │   │   ├── budget.tsx         # Budget/envelope view (home)
│   │   │   │   ├── transactions.tsx   # Transaction list
│   │   │   │   ├── reports.tsx        # Charts and reports
│   │   │   │   └── accounts.tsx       # Account balances
│   │   │   ├── add-transaction.tsx    # Quick-add modal
│   │   │   ├── category/[id].tsx      # Category detail
│   │   │   ├── import-csv.tsx         # CSV import flow
│   │   │   └── settings.tsx           # App settings
│   │   ├── components/        # Mobile-specific components
│   │   ├── hooks/             # Mobile-specific hooks
│   │   └── assets/            # Icons, images, fonts
│   └── web/                   # Next.js 15 — Web/Mac app
│       ├── app/               # App Router
│       └── components/        # Web-specific components
├── packages/
│   ├── shared/                # Shared business logic
│   │   ├── src/
│   │   │   ├── db/            # Database layer (SQLite operations)
│   │   │   ├── models/        # TypeScript types and Zod schemas
│   │   │   ├── engine/        # Budget calculation engine
│   │   │   ├── csv/           # CSV parser and column mapper
│   │   │   └── utils/         # Date helpers, currency formatting
│   │   └── package.json
│   ├── ui/                    # Shared UI components
│   │   ├── src/
│   │   │   ├── tokens/        # Design tokens (colors, spacing, typography)
│   │   │   ├── components/    # Cross-platform UI primitives
│   │   │   └── icons/         # Icon set
│   │   └── package.json
│   ├── eslint-config/
│   └── typescript-config/
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── CLAUDE.md
├── timeline.md
└── README.md
```

### Data Model (SQLite Schema)

```sql
-- Accounts (checking, savings, credit card, cash)
CREATE TABLE accounts (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name        TEXT NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'credit_card', 'cash')),
    balance     INTEGER NOT NULL DEFAULT 0,  -- cents, not dollars
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Category Groups (Fixed Expenses, Variable Expenses, Savings, etc.)
CREATE TABLE category_groups (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name        TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_hidden   INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Categories (envelopes) — the core budgeting unit
CREATE TABLE categories (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    group_id        TEXT NOT NULL REFERENCES category_groups(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    emoji           TEXT,  -- optional emoji icon
    target_amount   INTEGER,  -- monthly target in cents (nullable for non-goal categories)
    target_type     TEXT CHECK (target_type IN ('monthly', 'savings_goal', 'debt_payment', NULL)),
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_hidden       INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Monthly Budget Allocations — how much is assigned to each category per month
CREATE TABLE budget_allocations (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    month       TEXT NOT NULL,  -- 'YYYY-MM' format
    allocated   INTEGER NOT NULL DEFAULT 0,  -- cents assigned this month
    UNIQUE(category_id, month)
);

-- Transactions — every income and expense entry
CREATE TABLE transactions (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    account_id      TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    date            TEXT NOT NULL,  -- 'YYYY-MM-DD'
    payee           TEXT NOT NULL,
    memo            TEXT,
    amount          INTEGER NOT NULL,  -- cents; negative = outflow, positive = inflow
    is_cleared      INTEGER NOT NULL DEFAULT 0,
    is_transfer     INTEGER NOT NULL DEFAULT 0,
    transfer_id     TEXT REFERENCES transactions(id),  -- linked transfer transaction
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Transaction Splits — category allocations for each transaction
CREATE TABLE transaction_splits (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    transaction_id  TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    category_id     TEXT REFERENCES categories(id) ON DELETE SET NULL,
    amount          INTEGER NOT NULL,  -- cents; must sum to transaction.amount
    memo            TEXT
);

-- Recurring Transaction Templates
CREATE TABLE recurring_templates (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    account_id      TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    category_id     TEXT REFERENCES categories(id) ON DELETE SET NULL,
    payee           TEXT NOT NULL,
    amount          INTEGER NOT NULL,  -- cents
    frequency       TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually')),
    start_date      TEXT NOT NULL,  -- 'YYYY-MM-DD'
    end_date        TEXT,  -- nullable; NULL = no end
    next_date       TEXT NOT NULL,  -- next occurrence
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Payee Autocomplete Cache
CREATE TABLE payee_cache (
    payee           TEXT PRIMARY KEY,
    last_category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    use_count       INTEGER NOT NULL DEFAULT 1,
    last_used       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- CSV Import Profiles — saved column mappings per bank
CREATE TABLE csv_profiles (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name            TEXT NOT NULL,  -- 'Chase Checking', 'Amex Gold'
    date_column     INTEGER NOT NULL,
    payee_column    INTEGER NOT NULL,
    amount_column   INTEGER NOT NULL,
    memo_column     INTEGER,
    date_format     TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
    amount_sign     TEXT NOT NULL DEFAULT 'negative_is_outflow' CHECK (amount_sign IN ('negative_is_outflow', 'positive_is_outflow', 'separate_columns')),
    debit_column    INTEGER,  -- for separate_columns mode
    credit_column   INTEGER,  -- for separate_columns mode
    skip_rows       INTEGER NOT NULL DEFAULT 1,  -- header rows to skip
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_payee ON transactions(payee);
CREATE INDEX idx_transaction_splits_transaction ON transaction_splits(transaction_id);
CREATE INDEX idx_transaction_splits_category ON transaction_splits(category_id);
CREATE INDEX idx_budget_allocations_month ON budget_allocations(month);
CREATE INDEX idx_budget_allocations_category ON budget_allocations(category_id);
CREATE INDEX idx_recurring_next ON recurring_templates(next_date) WHERE is_active = 1;
```

### Budget Calculation Engine

The core budget logic lives in `packages/shared/src/engine/`:

```typescript
// Core budget state for a single month
interface MonthBudgetState {
  month: string;                    // 'YYYY-MM'
  totalIncome: number;              // cents
  totalAllocated: number;           // cents across all categories
  readyToAssign: number;            // totalIncome - totalAllocated + carryover
  categories: CategoryBudgetState[];
}

interface CategoryBudgetState {
  categoryId: string;
  allocated: number;      // what was budgeted this month
  activity: number;       // sum of transaction splits this month
  available: number;      // allocated + activity + carryover from prior months
  isOverspent: boolean;   // available < 0
}
```

Key engine rules:
1. **Money is assigned, not predicted.** Users allocate actual income to categories.
2. **Available rolls forward.** Underspent categories carry their surplus into the next month.
3. **Overspending borrows from Ready to Assign.** If a category goes negative, the deficit reduces the global "Ready to Assign" pool.
4. **Credit card spending creates debt.** Outflows on credit card accounts move available budget from the spending category to a credit card payment category.
5. **All amounts stored in cents (integers).** No floating-point currency math.

### Privacy Architecture

- **Zero network calls by default.** The app makes no HTTP requests. No analytics, no crash reporting, no telemetry.
- **SQLite database on-device only.** No iCloud sync, no CloudKit, no remote backup.
- **Backup exclusion:**
  - iOS: Set `NSURLIsExcludedFromBackupKey` on app data directory — prevents iCloud backup of user data
  - Android: Set `android:allowBackup="false"` in AndroidManifest.xml — prevents Google Drive backup of user data
  - All platforms: User data never leaves the device, even through system backups
- **No account creation.** No email, no password, no OAuth. The app works immediately on launch.
- **Export is explicit.** Users can export their data as CSV or JSON. This is the only time data leaves the device.
- **No Plaid/Yodlee SDK.** No bank credential handling whatsoever. Not even as an optional feature.
- **CSV files processed locally.** Imported CSV files are parsed in-memory and never persisted as raw files.
- **App Lock (optional).** FaceID/TouchID/passcode gate on app launch.

---

## UI/UX Direction

### Design Language

- **Dark mode native** — Deep charcoal (#1A1A2E) background, not pure black
- **Warm accent palette:**
  - Amber (#F5A623) — income, positive balances, success states
  - Coral (#FF6B6B) — overspent categories, warnings, outflows
  - Teal (#4ECDC4) — savings goals, progress, navigation highlights
  - Muted lavender (#A0A0C8) — secondary text, borders, subtle accents
- **Typography:** Inter (humanist sans-serif), SF Mono for currency amounts
- **Spacing:** 8px grid system
- **Corners:** 12px border-radius on cards, 8px on buttons
- **No shield icons.** Privacy is communicated through copy and behavior, not defensive iconography.

### Screen Flow

#### 1. Budget Screen (Home Tab)

The primary view. Shows the current month's envelope state.

```
┌─────────────────────────────────────┐
│ ← Feb 2026 →           Ready: $842 │
│─────────────────────────────────────│
│ FIXED EXPENSES                      │
│ 🏠 Rent ............... $1,800/$1,800 │
│ ⚡ Utilities ........... $89/$150    │
│ 📱 Phone .............. $45/$45     │
│                                     │
│ VARIABLE EXPENSES                   │
│ 🛒 Groceries .......... $312/$500   │
│ 🍽️ Dining Out ........ $78/$200    │
│ ⛽ Gas ................ $0/$120     │
│                                     │
│ SAVINGS                             │
│ 💰 Emergency Fund ..... $500/$500   │
│ ✈️ Vacation ........... $200/$300   │
│─────────────────────────────────────│
│ [Budget] [Transactions] [Reports] [Accounts] │
└─────────────────────────────────────┘
```

- Swipe left/right to navigate months
- Tap a category to see transactions and adjust allocation
- Long-press to move money between categories
- Progress bars show spent/allocated ratio with color coding:
  - Green (under 75%) → Amber (75-100%) → Coral (over 100%)

#### 2. Add Transaction (Modal)

Slides up from bottom. Optimized for one-handed, fast entry.

```
┌─────────────────────────────────────┐
│ Add Transaction              Cancel │
│─────────────────────────────────────│
│                                     │
│        $ [    45.67    ]            │
│                                     │
│ Payee:    [Trader Joe's    ▼]       │
│ Category: [Groceries       ▼]  ← auto │
│ Account:  [Chase Checking  ▼]       │
│ Date:     [Feb 22, 2026    ▼]       │
│ Memo:     [Weekly groceries     ]   │
│                                     │
│          [ Save Transaction ]       │
│─────────────────────────────────────│
│ RECENT: Trader Joe's | Costco | ... │
└─────────────────────────────────────┘
```

- Amount field is focused on open — user types number immediately
- Payee autocomplete from `payee_cache` — shows top matches as chips below
- Category auto-fills based on payee history
- Recent payees shown at bottom for one-tap re-entry
- "Split" button appears after category selection for multi-category transactions

#### 3. Transaction List (Tab)

Reverse-chronological list with search bar and filters.

```
┌─────────────────────────────────────┐
│ 🔍 Search transactions...    Filter │
│─────────────────────────────────────│
│ TODAY                               │
│ ✓ Trader Joe's          -$45.67    │
│   Groceries · Chase Checking        │
│                                     │
│ YESTERDAY                           │
│ ○ Shell Gas Station     -$52.30    │
│   Gas · Chase Checking              │
│ ✓ Direct Deposit      +$2,150.00   │
│   Income · Chase Checking           │
│─────────────────────────────────────│
│ [Budget] [Transactions] [Reports] [Accounts] │
└─────────────────────────────────────┘
```

- ✓ = cleared, ○ = uncleared
- Swipe left to delete, swipe right to toggle cleared
- Filter chips: Date range, Category, Account, Amount range

#### 4. Reports (Tab)

Monthly and trend visualizations.

- **Budget vs. Actual** — Horizontal bar chart, category by category
- **Spending by Category** — Donut chart with tap-to-drill-down
- **Income vs. Expenses** — Line chart, 6-month rolling trend
- **Net Worth** — Line chart from manual account balance snapshots

#### 5. CSV Import Flow

Three-step wizard:

1. **Pick file** — Document picker opens, user selects CSV from Files app
2. **Map columns** — Preview table shows first 5 rows; dropdowns above each column to assign Date/Payee/Amount/Memo; saved profiles appear as presets
3. **Review & import** — List of transactions with duplicate flags; user unchecks duplicates; "Import N transactions" button

#### 6. Settings

- App lock (FaceID/TouchID toggle)
- Currency format (USD, EUR, GBP, CAD, AUD, etc.)
- First day of week
- CSV import profiles management
- Export data (CSV or JSON)
- About / Licenses

### Onboarding Flow (First Launch)

1. **Welcome screen** — "Your budget. Your device. No bank passwords required." Single CTA: "Get Started"
2. **Add accounts** — Prompt to add 1-3 accounts with starting balances. Pre-filled suggestions: "Checking Account," "Savings Account," "Credit Card"
3. **Create categories** — Offer a starter template (essentials: Rent, Groceries, Utilities, Transportation, Dining, Entertainment, Savings) or blank slate. User can customize.
4. **First income** — "When was your last paycheck?" → Creates the first income transaction and seeds "Ready to Assign"
5. **Assign money** — Interactive tutorial: "Tap a category and assign money from your Ready to Assign pool." Walk through assigning to 2-3 categories.
6. **Done** — "You're budgeting! Add transactions as you spend." Links to CSV import for catching up on past transactions.

---

## Monetization

### Pricing Model

**One-time purchase: $4.99**

No subscriptions. No in-app purchases for features. No ads. Pay once, use forever, get all updates.

### Revenue Projections (Conservative)

| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| Downloads (free trial) | 50,000 | 120,000 | 200,000 |
| Conversion rate | 8% | 10% | 12% |
| Paid users | 4,000 | 12,000 | 24,000 |
| Revenue (after 30% App Store cut) | $14,000 | $42,000 | $84,000 |
| Cumulative paid users | 4,000 | 16,000 | 40,000 |

### Purchase Structure

- **Free trial:** Full functionality for 7 days. After trial, read-only mode (can view budget and transactions but cannot add new entries). This preserves user data and creates urgency without being hostile.
- **App Store IAP:** $4.99 via RevenueCat
- **Direct purchase:** $4.99 via Lemon Squeezy (for web version or sideloading)
- **No tiered pricing.** One price, all features. Simplicity is the brand.

### Why One-Time Works

1. Budgeting apps have near-zero marginal cost per user (no server, no API calls, no cloud storage)
2. One-time pricing is the primary differentiator against YNAB/Monarch/Simplifi
3. The target audience is explicitly anti-subscription (they're on r/frugal and r/personalfinance)
4. Updates are low-cost: bug fixes + occasional feature additions. No infrastructure to maintain.

---

## Marketing Angle

### Core Message

**"Budget without giving away your bank password."**

Secondary messages:
- "Your financial data never leaves your device."
- "One price. No subscriptions. No bank connections."
- "The anti-Mint budgeting app."

### Launch Channels

#### Reddit (Primary — organic)
- **r/YNAB** (380K members) — "I built a YNAB alternative that doesn't require bank connections and costs $5 one-time" (post as genuine indie dev)
- **r/personalfinance** (18M members) — Engage in "best budgeting app" threads with honest positioning
- **r/frugal** (2.5M members) — "Stop paying $109/year to budget" resonates here
- **r/privacy** (1.8M members) — "I built a budgeting app that makes zero network calls" is catnip for this community
- **r/ynab** migration threads — Users frequently post about leaving YNAB; comment with genuine alternative

#### Content Marketing
- Blog post: "Why Your Budgeting App Shouldn't Know Your Bank Password" (SEO play for "budgeting app privacy")
- Blog post: "Envelope Budgeting in 2026: The Complete Guide" (SEO for "envelope budgeting")
- Blog post: "YNAB Alternatives 2026" (comparison SEO)

#### Product Hunt Launch
- Position as "Privacy-first envelope budgeting" in the Finance category
- Emphasize the one-time pricing in tagline

#### App Store Optimization
- Keywords: budget, envelope budgeting, YNAB alternative, privacy budget, no subscription, personal finance
- Screenshots emphasizing: "No bank connection required," envelope view, reports, CSV import
- Subtitle: "Envelope Budgeting, Zero Bank Access"

#### YouTube/Creator Outreach
- Target personal finance YouTubers who have done YNAB reviews
- Offer free licenses to reviewers (costs nothing; just unlock codes)
- Focus on channels with 10K-100K subscribers (responsive, engaged audiences)

### Positioning Matrix

| Attribute | MyBudget | YNAB | Monarch | Actual Budget |
|-----------|----------|------|---------|---------------|
| Bank connections | Never | Yes (Plaid) | Yes (Plaid) | Optional |
| Pricing | $4.99 once | $109/yr | $100/yr | Free (OSS) |
| Data location | On-device only | YNAB servers | Monarch servers | Self-hosted |
| Envelope method | Yes | Yes | No (categories) | Yes |
| CSV import | Yes | Yes | Yes | Yes |
| Mobile app | Native (Expo) | Native | Native | Web (PWA) |
| Ease of setup | Instant | Account + bank | Account + bank | Server setup |

---

## MVP Timeline

### Pre-Development (Week 0)
- Finalize design tokens and component library spec
- Set up Turborepo monorepo with pnpm
- Configure shared TypeScript, ESLint, Prettier configs
- Create SQLite schema and migration system
- Set up Expo project with Expo Router

### Phase 1: Foundation (Weeks 1-2)
- Implement SQLite database layer with all tables
- Build budget calculation engine in `packages/shared`
- Create design token system and base UI components in `packages/ui`
- Implement account CRUD operations
- Implement category group and category CRUD
- Build budget allocation logic (assign, move, carry forward)
- Unit tests for budget engine (especially carry-forward and overspend logic)

### Phase 2: Core Transactions (Weeks 3-4)
- Build add transaction modal with amount input
- Implement payee autocomplete system
- Build transaction list with search and filters
- Implement split transactions
- Implement transaction editing and deletion
- Build transfer between accounts workflow
- Implement cleared/uncleared toggling
- Wire transactions into budget engine (real-time category updates)

### Phase 3: Recurring & Import (Weeks 5-6)
- Build recurring transaction template CRUD
- Implement recurring transaction generation logic
- Build CSV import wizard (file picker → column mapper → preview)
- Implement CSV profile saving and loading
- Build duplicate detection algorithm
- Implement date format auto-detection
- Test with real CSV exports from Chase, Bank of America, Amex, Wells Fargo, Capital One

### Phase 4: Reports & Polish (Weeks 7-8)
- Build Budget vs. Actual bar chart
- Build Spending by Category donut chart
- Build Income vs. Expenses trend line chart
- Implement net worth tracking (manual balance snapshots)
- Build onboarding flow (5-step wizard)
- Implement app lock (FaceID/TouchID)
- Build settings screen with export functionality
- Implement data export (CSV and JSON)

### Phase 5: Launch Prep (Weeks 9-10)
- App Store screenshots and metadata
- Write App Store description and keywords
- Set up RevenueCat for IAP
- Set up Lemon Squeezy for direct sales
- Build simple marketing landing page
- Write launch blog post
- Beta test with 20-30 users from target communities
- Fix bugs from beta feedback
- Submit to App Store review

### Phase 6: Launch (Week 11)
- App Store release
- Product Hunt launch
- Reddit posts (r/YNAB, r/personalfinance, r/frugal, r/privacy)
- Begin content marketing cadence

### Post-MVP Roadmap (Not in scope for MVP)
- iPad-optimized layout
- Mac App Store release (Catalyst or native web wrapper)
- Widgets (monthly spending summary, category balance)
- Dark/light theme toggle (MVP is dark-only)
- iCloud backup (opt-in, encrypted)
- Goal tracking with progress visualization
- Debt payoff calculator (snowball/avalanche)
- Multi-currency support
- Localization (Spanish, French, German, Portuguese)

---

## Acceptance Criteria

### Functional Requirements

1. **Accounts:** User can create, edit, and archive checking, savings, credit card, and cash accounts with starting balances.
2. **Categories:** User can create category groups and categories (envelopes) with emoji icons and monthly targets.
3. **Budget allocation:** User can assign money to categories from "Ready to Assign." Available balances carry forward monthly. Overspent categories reduce Ready to Assign.
4. **Transactions:** User can add, edit, and delete transactions with payee, amount, date, memo, category, and account fields. Split transactions work correctly.
5. **Autocomplete:** After 3+ entries for a payee, the app auto-suggests the most frequent category for that payee.
6. **Recurring:** User can create recurring transaction templates that auto-generate pending transactions on schedule.
7. **CSV import:** User can import a CSV file, map columns, save the mapping as a profile, preview transactions, and import with duplicate detection.
8. **Reports:** Budget vs. Actual, Spending by Category, and Income vs. Expenses charts render correctly with accurate data.
9. **Search:** User can search transactions by payee and memo text, and filter by date, category, account, and amount.
10. **Export:** User can export all data as CSV or JSON to the device's file system.

### Non-Functional Requirements

11. **Privacy:** The app makes zero network requests. Verified by monitoring network traffic during a full test session.
12. **Performance:** Transaction list scrolls at 60fps with 10,000+ transactions. Budget view recalculates in <100ms.
13. **Data integrity:** All currency amounts stored as integer cents. No floating-point arithmetic on money.
14. **Offline:** The app works identically with airplane mode enabled (it should — there's no network dependency).
15. **App lock:** FaceID/TouchID gate prevents unauthorized access when enabled.
16. **Platform:** Runs on iOS 16+ and Android 13+ (Expo managed workflow).

### Launch Requirements

17. **App Store approval:** App passes Apple review on first submission.
18. **Payment integration:** RevenueCat IAP flow works end-to-end (purchase → unlock → restore).
19. **Onboarding:** New user can go from first launch to first budgeted transaction in under 3 minutes.
20. **Beta feedback:** At least 15 beta testers have used the app for 1+ week with no data loss or crashes.

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Bank CSV formats vary wildly and change without notice | High | High | Ship with saved column-mapping profiles per bank; support the top 10 US banks out of the box; add format auto-detection heuristics; community-contributed profile sharing via JSON export |
| Users abandon manual entry after initial enthusiasm | Medium | High | Smart autocomplete reduces entry friction to ~5 seconds per transaction; CSV import catches up history in bulk; recurring templates auto-generate common transactions; daily notification reminder (optional) |
| YNAB or Monarch drops price or adds free tier, eroding competitive advantage | Low | Medium | One-time pricing and zero-network architecture are structural moats that subscription apps cannot easily replicate; focus marketing on total cost of ownership over 3+ years |
| Credit card payment tracking logic confuses users (category debt vs. payment flow) | Medium | Medium | Clear onboarding tutorial for credit card workflow; contextual help tooltips on credit card payment screen; simplify to "pay from checking" one-tap action |
| Floating-point rounding errors introduced by contributor PRs despite integer-cents rule | Medium | High | Enforce integer-cents rule via TypeScript branded types (`CentsAmount`); add CI lint rule that flags any `REAL` column or `parseFloat` on currency values; unit tests for all budget engine edge cases |
