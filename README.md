# MyBudget

**Budget without giving away your bank password.**

A privacy-first envelope budgeting app with integrated subscription tracking. All financial data stays on your device — no bank connections, no Plaid, no cloud sync, no accounts. Manual transaction entry with smart autocomplete, CSV import, and a pre-populated catalog of 200+ subscription services.

## Features

- **Envelope Budgeting** — Assign every dollar a job. Categories carry forward monthly.
- **Subscription Tracking** — 200+ pre-populated services, renewal calendar, cost dashboard.
- **CSV Import** — Import bank statements with saved column mapping profiles.
- **Smart Autocomplete** — Learns payee-to-category mappings after 3+ entries.
- **Reports** — Budget vs Actual, spending by category, income vs expenses trends.
- **Zero Network Calls** — No analytics, no telemetry, no cloud. Your data never leaves your device.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Expo (React Native) with Expo Router |
| Web | Next.js 15 |
| Database | SQLite (expo-sqlite / better-sqlite3) |
| Monorepo | Turborepo + pnpm |
| Language | TypeScript |
| Charts | victory-native (mobile), recharts (web) |
| Testing | Vitest |

## Setup

### Prerequisites

- Node.js >= 20
- pnpm >= 9.15

### Install

```bash
git clone https://github.com/tshuldberg/MyBudget.git
cd MyBudget
pnpm install
```

### Development

```bash
# All apps
pnpm dev

# Mobile only (Expo)
pnpm dev:mobile

# Web only (Next.js)
pnpm dev:web

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Project Structure

```
MyBudget/
├── apps/
│   ├── mobile/          # Expo (React Native) — iOS + Android
│   └── web/             # Next.js 15 — Web/desktop
├── packages/
│   ├── shared/          # Business logic (budget engine, subscription engine, DB, CSV parser)
│   ├── ui/              # Design tokens and shared components
│   ├── eslint-config/
│   └── typescript-config/
```

## Privacy

MyBudget makes **zero network requests**. No analytics, no crash reporting, no telemetry. No account creation. No bank credentials. Your financial data exists only on your device.

## License

FSL-1.1-Apache-2.0
