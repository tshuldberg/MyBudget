/**
 * SQLite schema for MyBudget — all 18 tables.
 *
 * Currency amounts are stored as INTEGER cents (never floating-point).
 * Dates stored as TEXT in ISO format (YYYY-MM-DD or YYYY-MM).
 * Timestamps stored as TEXT in ISO 8601 datetime format.
 * UUIDs stored as TEXT.
 */

// -- 1. Accounts --
export const CREATE_ACCOUNTS = `
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('checking', 'savings', 'credit_card', 'cash')),
  balance INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

// -- 2. Category Groups --
export const CREATE_CATEGORY_GROUPS = `
CREATE TABLE IF NOT EXISTS category_groups (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

// -- 3. Categories --
export const CREATE_CATEGORIES = `
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY NOT NULL,
  group_id TEXT NOT NULL REFERENCES category_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT,
  target_amount INTEGER,
  target_type TEXT CHECK(target_type IN ('monthly', 'savings_goal', 'debt_payment') OR target_type IS NULL),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

// -- 4. Budget Allocations --
export const CREATE_BUDGET_ALLOCATIONS = `
CREATE TABLE IF NOT EXISTS budget_allocations (
  id TEXT PRIMARY KEY NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  allocated INTEGER NOT NULL DEFAULT 0,
  UNIQUE(category_id, month)
);`;

// -- 5. Transactions --
export const CREATE_TRANSACTIONS = `
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  payee TEXT NOT NULL,
  memo TEXT,
  amount INTEGER NOT NULL,
  is_cleared INTEGER NOT NULL DEFAULT 0,
  is_transfer INTEGER NOT NULL DEFAULT 0,
  transfer_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

// -- 6. Transaction Splits --
export const CREATE_TRANSACTION_SPLITS = `
CREATE TABLE IF NOT EXISTS transaction_splits (
  id TEXT PRIMARY KEY NOT NULL,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  memo TEXT
);`;

// -- 7. Recurring Templates --
export const CREATE_RECURRING_TEMPLATES = `
CREATE TABLE IF NOT EXISTS recurring_templates (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  payee TEXT NOT NULL,
  amount INTEGER NOT NULL,
  frequency TEXT NOT NULL CHECK(frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually')),
  start_date TEXT NOT NULL,
  end_date TEXT,
  next_date TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

// -- 8. Payee Cache --
export const CREATE_PAYEE_CACHE = `
CREATE TABLE IF NOT EXISTS payee_cache (
  payee TEXT PRIMARY KEY NOT NULL,
  last_category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used TEXT NOT NULL DEFAULT (datetime('now'))
);`;

// -- 9. CSV Profiles --
export const CREATE_CSV_PROFILES = `
CREATE TABLE IF NOT EXISTS csv_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  date_column INTEGER NOT NULL,
  payee_column INTEGER NOT NULL,
  amount_column INTEGER NOT NULL,
  memo_column INTEGER,
  date_format TEXT NOT NULL,
  amount_sign TEXT NOT NULL CHECK(amount_sign IN ('negative_is_outflow', 'positive_is_outflow', 'separate_columns')),
  debit_column INTEGER,
  credit_column INTEGER,
  skip_rows INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

// -- 10. Subscriptions --
export const CREATE_SUBSCRIPTIONS = `
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_cycle TEXT NOT NULL CHECK(billing_cycle IN ('weekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'custom')),
  custom_days INTEGER,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK(status IN ('active', 'paused', 'cancelled', 'trial')),
  start_date TEXT NOT NULL,
  next_renewal TEXT NOT NULL,
  trial_end_date TEXT,
  cancelled_date TEXT,
  notes TEXT,
  url TEXT,
  icon TEXT,
  color TEXT,
  notify_days INTEGER NOT NULL DEFAULT 1,
  catalog_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

// -- 11. Price History --
export const CREATE_PRICE_HISTORY = `
CREATE TABLE IF NOT EXISTS price_history (
  id TEXT PRIMARY KEY NOT NULL,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  price INTEGER NOT NULL,
  effective_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

// -- 12. Notification Log --
export const CREATE_NOTIFICATION_LOG = `
CREATE TABLE IF NOT EXISTS notification_log (
  id TEXT PRIMARY KEY NOT NULL,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('renewal', 'trial_expiry', 'monthly_summary')),
  scheduled_for TEXT NOT NULL,
  sent_at TEXT,
  UNIQUE(subscription_id, type, scheduled_for)
);`;

// -- 13. Preferences --
export const CREATE_PREFERENCES = `
CREATE TABLE IF NOT EXISTS preferences (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);`;

// -- 14. Bank Connections --
export const CREATE_BANK_CONNECTIONS = `
CREATE TABLE IF NOT EXISTS bank_connections (
  id TEXT PRIMARY KEY NOT NULL,
  provider TEXT NOT NULL CHECK(provider IN ('plaid', 'mx', 'truelayer', 'tink', 'belvo', 'basiq', 'akoya', 'finicity', 'other')),
  provider_item_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  institution_id TEXT,
  institution_name TEXT,
  status TEXT NOT NULL CHECK(status IN ('active', 'requires_reauth', 'disconnected', 'error')),
  last_successful_sync TEXT,
  last_attempted_sync TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, provider_item_id)
);`;

// -- 15. Bank Accounts --
export const CREATE_BANK_ACCOUNTS = `
CREATE TABLE IF NOT EXISTS bank_accounts (
  id TEXT PRIMARY KEY NOT NULL,
  connection_id TEXT NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
  provider_account_id TEXT NOT NULL,
  mask TEXT,
  name TEXT NOT NULL,
  official_name TEXT,
  type TEXT NOT NULL CHECK(type IN ('checking', 'savings', 'credit', 'loan', 'investment', 'other')),
  subtype TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  current_balance INTEGER,
  available_balance INTEGER,
  local_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(connection_id, provider_account_id)
);`;

// -- 16. Bank Transactions Raw --
export const CREATE_BANK_TRANSACTIONS_RAW = `
CREATE TABLE IF NOT EXISTS bank_transactions_raw (
  id TEXT PRIMARY KEY NOT NULL,
  connection_id TEXT NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
  bank_account_id TEXT NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  provider_transaction_id TEXT NOT NULL,
  pending_transaction_id TEXT,
  date_posted TEXT NOT NULL,
  date_authorized TEXT,
  payee TEXT,
  memo TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  raw_category TEXT,
  raw_json TEXT,
  is_pending INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(connection_id, provider_transaction_id)
);`;

// -- 17. Bank Sync State --
export const CREATE_BANK_SYNC_STATE = `
CREATE TABLE IF NOT EXISTS bank_sync_state (
  connection_id TEXT PRIMARY KEY NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
  cursor TEXT,
  last_webhook_cursor TEXT,
  sync_status TEXT NOT NULL DEFAULT 'idle' CHECK(sync_status IN ('idle', 'running', 'error')),
  last_successful_sync TEXT,
  last_attempted_sync TEXT,
  last_error TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

// -- 18. Bank Webhook Events --
export const CREATE_BANK_WEBHOOK_EVENTS = `
CREATE TABLE IF NOT EXISTS bank_webhook_events (
  id TEXT PRIMARY KEY NOT NULL,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  connection_id TEXT REFERENCES bank_connections(id) ON DELETE SET NULL,
  payload TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processed', 'failed', 'ignored')),
  error_message TEXT,
  UNIQUE(provider, event_id)
);`;

// -- 19. Goals --
export const CREATE_GOALS = `
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  target_amount_cents INTEGER NOT NULL,
  current_amount_cents INTEGER NOT NULL DEFAULT 0,
  target_date TEXT,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

// -- 20. Transaction Rules --
export const CREATE_TRANSACTION_RULES = `
CREATE TABLE IF NOT EXISTS transaction_rules (
  id TEXT PRIMARY KEY NOT NULL,
  payee_pattern TEXT NOT NULL,
  match_type TEXT NOT NULL CHECK(match_type IN ('contains', 'exact', 'starts_with')),
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

// -- 21. Net Worth Snapshots --
export const CREATE_NET_WORTH_SNAPSHOTS = `
CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  id TEXT PRIMARY KEY NOT NULL,
  month TEXT NOT NULL,
  assets INTEGER NOT NULL DEFAULT 0,
  liabilities INTEGER NOT NULL DEFAULT 0,
  net_worth INTEGER NOT NULL DEFAULT 0,
  account_balances TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(month)
);`;

// -- 22. Debt Payoff Plans --
export const CREATE_DEBT_PAYOFF_PLANS = `
CREATE TABLE IF NOT EXISTS debt_payoff_plans (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  strategy TEXT NOT NULL CHECK(strategy IN ('snowball', 'avalanche')),
  extra_payment INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

// -- 23. Debt Payoff Debts --
export const CREATE_DEBT_PAYOFF_DEBTS = `
CREATE TABLE IF NOT EXISTS debt_payoff_debts (
  id TEXT PRIMARY KEY NOT NULL,
  plan_id TEXT NOT NULL REFERENCES debt_payoff_plans(id) ON DELETE CASCADE,
  account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  balance INTEGER NOT NULL,
  interest_rate INTEGER NOT NULL DEFAULT 0,
  minimum_payment INTEGER NOT NULL DEFAULT 0,
  compounding TEXT NOT NULL DEFAULT 'monthly' CHECK(compounding IN ('monthly', 'daily')),
  sort_order INTEGER NOT NULL DEFAULT 0
);`;

// -- 24. Budget Rollovers --
export const CREATE_BUDGET_ROLLOVERS = `
CREATE TABLE IF NOT EXISTS budget_rollovers (
  id TEXT PRIMARY KEY NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  from_month TEXT NOT NULL,
  to_month TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(category_id, from_month)
);`;

// -- 25. Budget Alerts --
export const CREATE_BUDGET_ALERTS = `
CREATE TABLE IF NOT EXISTS budget_alerts (
  id TEXT PRIMARY KEY NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  threshold_pct INTEGER NOT NULL DEFAULT 80,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(category_id, threshold_pct)
);`;

// -- 26. Alert History --
export const CREATE_ALERT_HISTORY = `
CREATE TABLE IF NOT EXISTS alert_history (
  id TEXT PRIMARY KEY NOT NULL,
  alert_id TEXT NOT NULL REFERENCES budget_alerts(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  month TEXT NOT NULL,
  threshold_pct INTEGER NOT NULL,
  spent_pct INTEGER NOT NULL,
  amount_spent INTEGER NOT NULL,
  target_amount INTEGER NOT NULL,
  notified_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(alert_id, month)
);`;

// -- 27. Currencies --
export const CREATE_CURRENCIES = `
CREATE TABLE IF NOT EXISTS currencies (
  code TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL DEFAULT '',
  decimal_places INTEGER NOT NULL DEFAULT 2,
  is_base INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

// -- 28. Exchange Rates --
export const CREATE_EXCHANGE_RATES = `
CREATE TABLE IF NOT EXISTS exchange_rates (
  id TEXT PRIMARY KEY NOT NULL,
  from_currency TEXT NOT NULL REFERENCES currencies(code) ON DELETE CASCADE,
  to_currency TEXT NOT NULL REFERENCES currencies(code) ON DELETE CASCADE,
  rate INTEGER NOT NULL,
  rate_decimal TEXT NOT NULL,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(from_currency, to_currency)
);`;

// -- 29. Shared Envelopes (future: household sharing) --
export const CREATE_SHARED_ENVELOPES = `
CREATE TABLE IF NOT EXISTS shared_envelopes (
  id TEXT PRIMARY KEY NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  partner_device_id TEXT,
  sharing_mode TEXT NOT NULL DEFAULT 'joint' CHECK(sharing_mode IN ('joint', 'split')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(category_id)
);`;

// -- Indexes --
export const BANK_SYNC_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_bank_connections_status ON bank_connections(status);`,
  `CREATE INDEX IF NOT EXISTS idx_bank_accounts_connection_id ON bank_accounts(connection_id);`,
  `CREATE INDEX IF NOT EXISTS idx_bank_accounts_local_account_id ON bank_accounts(local_account_id);`,
  `CREATE INDEX IF NOT EXISTS idx_bank_transactions_raw_bank_account_date ON bank_transactions_raw(bank_account_id, date_posted DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_bank_transactions_raw_pending ON bank_transactions_raw(is_pending, date_posted DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_bank_sync_state_status ON bank_sync_state(sync_status);`,
  `CREATE INDEX IF NOT EXISTS idx_bank_webhook_events_status_received ON bank_webhook_events(status, received_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_bank_webhook_events_connection_id ON bank_webhook_events(connection_id);`,
];

export const GOALS_RULES_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_goals_category_id ON goals(category_id);`,
  `CREATE INDEX IF NOT EXISTS idx_goals_target_date ON goals(target_date);`,
  `CREATE INDEX IF NOT EXISTS idx_transaction_rules_is_enabled ON transaction_rules(is_enabled, priority);`,
  `CREATE INDEX IF NOT EXISTS idx_transaction_rules_category_id ON transaction_rules(category_id);`,
];

export const FEATURES_V4_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_net_worth_snapshots_month ON net_worth_snapshots(month);`,
  `CREATE INDEX IF NOT EXISTS idx_debt_payoff_debts_plan_id ON debt_payoff_debts(plan_id);`,
  `CREATE INDEX IF NOT EXISTS idx_budget_rollovers_category_month ON budget_rollovers(category_id, from_month);`,
  `CREATE INDEX IF NOT EXISTS idx_budget_alerts_category_id ON budget_alerts(category_id);`,
  `CREATE INDEX IF NOT EXISTS idx_alert_history_alert_id ON alert_history(alert_id);`,
  `CREATE INDEX IF NOT EXISTS idx_alert_history_month ON alert_history(month);`,
  `CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair ON exchange_rates(from_currency, to_currency);`,
  `CREATE INDEX IF NOT EXISTS idx_shared_envelopes_category_id ON shared_envelopes(category_id);`,
];

export const CORE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_categories_group_id ON categories(group_id);`,
  `CREATE INDEX IF NOT EXISTS idx_budget_allocations_category_month ON budget_allocations(category_id, month);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_payee ON transactions(payee);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_transfer_id ON transactions(transfer_id);`,
  `CREATE INDEX IF NOT EXISTS idx_transaction_splits_transaction_id ON transaction_splits(transaction_id);`,
  `CREATE INDEX IF NOT EXISTS idx_transaction_splits_category_id ON transaction_splits(category_id);`,
  `CREATE INDEX IF NOT EXISTS idx_recurring_templates_account_id ON recurring_templates(account_id);`,
  `CREATE INDEX IF NOT EXISTS idx_recurring_templates_next_date ON recurring_templates(next_date);`,
  `CREATE INDEX IF NOT EXISTS idx_recurring_templates_subscription_id ON recurring_templates(subscription_id);`,
  `CREATE INDEX IF NOT EXISTS idx_payee_cache_use_count ON payee_cache(use_count DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);`,
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_next_renewal ON subscriptions(next_renewal);`,
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_category_id ON subscriptions(category_id);`,
  `CREATE INDEX IF NOT EXISTS idx_price_history_subscription_id ON price_history(subscription_id);`,
  `CREATE INDEX IF NOT EXISTS idx_notification_log_subscription_id ON notification_log(subscription_id);`,
  `CREATE INDEX IF NOT EXISTS idx_notification_log_scheduled_for ON notification_log(scheduled_for);`,
];

export const CREATE_INDEXES = [
  ...CORE_INDEXES,
  ...BANK_SYNC_INDEXES,
  ...GOALS_RULES_INDEXES,
  ...FEATURES_V4_INDEXES,
];

/**
 * All table creation statements in dependency order.
 * Tables with foreign keys come after the tables they reference.
 * Note: subscriptions must come before recurring_templates (subscription_id FK).
 */
export const BANK_SYNC_TABLES = [
  CREATE_BANK_CONNECTIONS,
  CREATE_BANK_ACCOUNTS,
  CREATE_BANK_TRANSACTIONS_RAW,
  CREATE_BANK_SYNC_STATE,
  CREATE_BANK_WEBHOOK_EVENTS,
];

export const CORE_TABLES = [
  CREATE_ACCOUNTS,
  CREATE_CATEGORY_GROUPS,
  CREATE_CATEGORIES,
  CREATE_BUDGET_ALLOCATIONS,
  CREATE_SUBSCRIPTIONS,       // Before recurring_templates (FK)
  CREATE_TRANSACTIONS,
  CREATE_TRANSACTION_SPLITS,
  CREATE_RECURRING_TEMPLATES, // After subscriptions and accounts
  CREATE_PAYEE_CACHE,
  CREATE_CSV_PROFILES,
  CREATE_PRICE_HISTORY,
  CREATE_NOTIFICATION_LOG,
  CREATE_PREFERENCES,
];

export const GOALS_RULES_TABLES = [
  CREATE_GOALS,
  CREATE_TRANSACTION_RULES,
];

export const FEATURES_V4_TABLES = [
  CREATE_NET_WORTH_SNAPSHOTS,
  CREATE_DEBT_PAYOFF_PLANS,
  CREATE_DEBT_PAYOFF_DEBTS,
  CREATE_BUDGET_ROLLOVERS,
  CREATE_BUDGET_ALERTS,
  CREATE_ALERT_HISTORY,
  CREATE_CURRENCIES,
  CREATE_EXCHANGE_RATES,
  CREATE_SHARED_ENVELOPES,
];

export const ALL_TABLES = [
  ...CORE_TABLES,
  ...BANK_SYNC_TABLES,
  ...GOALS_RULES_TABLES,
  ...FEATURES_V4_TABLES,
];

/**
 * Schema version — increment this when changing the schema.
 */
export const SCHEMA_VERSION = 4;
