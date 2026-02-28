# Rocket Money Feature Comparison Report

**Date:** 2026-02-27
**Source:** Screen recording of Rocket Money web app (app.rocketmoney.com)
**Target:** MyBudget web app (apps/web/)

---

## Executive Summary

Rocket Money is a polished fintech web app focused on spending visibility, recurring charge management, and bank-synced account tracking. MyBudget already has strong envelope budgeting, subscription tracking, and reporting foundations. The main gaps are in **dashboard richness**, **spending analysis depth**, **recurring charge categorization**, and **interactive data visualizations**. This report identifies 28 specific feature enhancements organized into 6 implementation phases.

---

## Feature-by-Feature Comparison

### 1. Dashboard

| Feature | Rocket Money | MyBudget Current | Gap |
|---------|-------------|------------------|-----|
| Personalized greeting | "Good evening, [Name]" | None | **Add** |
| Current Spend card | Line chart (this month vs last month) with interactive tooltips | Net Worth card + Monthly Spending Trend (basic) | **Enhance** |
| Spend comparison badge | "You've spent $X more than last month" | None | **Add** |
| Accounts sidebar | Checking, Card Balance, Net Cash, Savings, Investments with "Sync now" + last synced | Accounts Overview card (basic list) | **Enhance** |
| Upcoming widget | "Payday in X days" badge + 7-day calendar strip with service icons + amounts | Upcoming renewals (3-item text list) | **Enhance** |
| Recent Transactions | Branded merchant logos, category icons, pending status | Recent Transactions card (basic) | **Enhance** |

### 2. Recurring/Subscriptions

| Feature | Rocket Money | MyBudget Current | Gap |
|---------|-------------|------------------|-----|
| Sub-tab navigation | Upcoming / All Recurring / Calendar | Separate pages (list + calendar) | **Enhance** |
| Category grouping | Subscriptions, Bills & Utilities, Credit Card Payments | Status grouping (Active/Paused/Cancelled) | **Add** |
| Per-group yearly totals | "You spend $X/yearly" per category | Monthly + annual totals (global only) | **Add** |
| Table columns | Name/Freq, Account (last 4), Due, Amount, Menu | Name, price, cycle, status | **Enhance** |
| Search + Sort | Search bar + "Sort by type" dropdown | None on web | **Add** |
| Monthly Breakdown chart | 6-month bar chart (Subs vs Bills) | None | **Add** |
| Inactive toggle | "Show 28 Inactive" at bottom | Status filter only | **Add** |
| Calendar view | Full month grid with service icons on charge dates | RenewalCalendar component (exists) | **Enhance** |

### 3. Spending Analysis

| Feature | Rocket Money | MyBudget Current | Gap |
|---------|-------------|------------------|-----|
| Period selector | Last Month / This Month / Custom | Month/Quarter/Year toggle | **Enhance** |
| Donut chart | Interactive, hover reveals category + % change | Pie chart (SpendingBreakdown) | **Enhance** |
| Summary sidebar | Income, Bills, Spending with month-over-month text | None | **Add** |
| Frequent Spend | Top merchants by frequency with count, avg, total | None | **Add** |
| Category table | Category, % Spend, Change arrows, Amount | CategorySpendTable (basic) | **Enhance** |
| Non-spending section | Tax Deductible, Reimbursements, Ignored, Transfers | None | **Add** |
| Category drill-down | 12-month bar chart + filtered transactions + summary stats | None | **Add** |

### 4. Transactions

| Feature | Rocket Money | MyBudget Current | Gap |
|---------|-------------|------------------|-----|
| Pending status | Visual "Pending" badge per transaction | None | **Add** |
| Category icons | Branded merchant icons + category icons | Category emoji only | **Enhance** |
| Per-date totals | Daily spending total in header | None | **Add** |
| Transaction rules | Auto-categorization rules (Settings) | Payee cache (auto-suggest) | **Add** |

### 5. Accounts & Settings

| Feature | Rocket Money | MyBudget Current | Gap |
|---------|-------------|------------------|-----|
| Net Cash calculation | Checking - Card Balance displayed | Net Worth only | **Add** |
| Settings sidebar nav | Profile, Linked Accounts, Notifications, Categories, Premium, Transaction Rules | Single settings page | **Enhance** |
| Linked Accounts mgmt | Institution cards with last synced, per-account Edit/View | Connect Bank page (scaffold) | **Enhance** |
| Transaction Rules | Auto-categorization rule editor | None | **Add** |
| Categories mgmt | Category editor in settings | Category dialog in budget page | **Enhance** |

### 6. Budget Setup

| Feature | Rocket Money | MyBudget Current | Gap |
|---------|-------------|------------------|-----|
| Income estimation | Auto-detect from transactions + 3-month chart | Manual onboarding wizard | **Add** |
| Quick setup CTA | "Set up in 2 minutes" badge | Multi-step onboarding | **Enhance** |

---

## Priority Matrix

### P0 - High Impact, Moderate Effort (Do First)
1. Enhanced Dashboard: Current Spend chart, spend comparison, upcoming calendar strip
2. Spending Page: donut chart upgrade, summary sidebar, frequent spend, category drill-down
3. Recurring page: sub-tabs (Upcoming/All/Calendar), category grouping, search + sort

### P1 - High Impact, Lower Effort
4. Transaction enhancements: pending status, per-date totals
5. Monthly Breakdown sidebar chart on subscriptions page
6. Personalized greeting on dashboard
7. Non-spending categories (Ignored, Transfers, Reimbursements)

### P2 - Medium Impact
8. Settings restructure: sidebar navigation with sub-pages
9. Transaction Rules system
10. Categories management page
11. Net Cash calculation on dashboard
12. Inactive subscriptions toggle

### P3 - Future / Bank-Sync Dependent
13. Linked Accounts management UI (requires active Plaid)
14. Income estimation from transaction history
15. "Payday in X days" detection
16. Branded merchant logo system

---

## Implementation Phases

### Phase A: Dashboard Overhaul (P0)
**Effort:** Large | **Files:** 8-12 new/modified

1. Replace dashboard with Rocket Money-style layout:
   - Current Spend card with dual-line chart (this month vs last month)
   - Interactive tooltips on chart hover
   - "You've spent $X more/less than last month" comparison badge
2. Enhanced Accounts card:
   - Expandable sections (Checking, Cards, Net Cash calculation)
   - "Sync now" button (wired to bank sync when available)
   - Last synced timestamp
3. Upcoming widget:
   - 7-day horizontal calendar strip
   - Service icons on upcoming charge dates
   - Daily amount totals
   - "See All Upcoming" link to recurring page
4. Personalized greeting header ("Good evening" based on time of day)
5. Enhanced Recent Transactions with category icons and pending badges

### Phase B: Spending Analysis Upgrade (P0)
**Effort:** Large | **Files:** 6-8 new/modified

1. Upgrade SpendingBreakdown to interactive donut chart:
   - Hover reveals category name, amount, % of total
   - Click-through to category drill-down
   - Month-over-month % change per category
2. Add Summary sidebar:
   - Income card with month comparison
   - Bills total with comparison
   - Spending total with comparison
3. Add Frequent Spend section:
   - Top 5 merchants by transaction frequency
   - Count badge, average transaction amount, total
4. Enhance CategorySpendTable:
   - % Spend column
   - Change column with up/down arrows and percentages
5. Add Non-Spending section:
   - Ignored transactions total
   - Internal Transfers count
   - Reimbursements total
6. New Category Drill-down page (`/reports/spending/[category]`):
   - 12-month bar chart for that category
   - Filtered transaction list with month picker
   - Summary stats: total transactions, average amount

### Phase C: Recurring/Subscriptions Overhaul (P0)
**Effort:** Medium | **Files:** 5-7 modified

1. Add tab navigation: Upcoming | All Recurring | Calendar
2. Category-based grouping:
   - Subscriptions (entertainment, productivity, etc.)
   - Bills & Utilities
   - Credit Card Payments
   - Per-group yearly total display
3. Enhanced table layout:
   - Account column (last 4 digits when bank-synced)
   - "Due" column with relative dates ("in X days", "tomorrow")
   - 3-dot action menu per row
4. Search bar + Sort dropdown (by type, by amount, by due date)
5. Monthly Breakdown sidebar chart (6-month Subs vs Bills bar chart)
6. "Show X Inactive" toggle
7. Enhanced Calendar view with service icons on dates

### Phase D: Transaction Enhancements (P1)
**Effort:** Small-Medium | **Files:** 3-5 modified

1. Pending status badge on transactions
2. Per-date spending totals in section headers
3. Category icon display (use subscription catalog icons where applicable)
4. Enhanced transaction row layout matching Rocket Money style

### Phase E: Settings Restructure (P2)
**Effort:** Medium | **Files:** 5-8 new/modified

1. Settings page with sidebar sub-navigation:
   - Profile (display name, preferences)
   - Linked Accounts (bank connections management)
   - Notifications (renewal reminders, spending alerts)
   - Categories (manage category groups and categories)
   - Transaction Rules (auto-categorization)
   - Data (import/export, reset)
2. Transaction Rules editor:
   - Rule: "When payee contains [X], assign category [Y]"
   - Rule list with enable/disable toggle
3. Categories management page (move from budget dialog)

### Phase F: Smart Features (P3)
**Effort:** Medium | **Files:** 4-6 new

1. Income estimation engine (analyze transaction patterns)
2. "Payday in X days" detection and badge
3. Budget setup wizard with auto-detected income
4. Net Cash calculation (Checking - Credit Card balances)
