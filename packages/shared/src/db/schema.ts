/**
 * SQLite schema for MyBudget — all 13 tables.
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

// -- Indexes --
export const CREATE_INDEXES = [
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

/**
 * All table creation statements in dependency order.
 * Tables with foreign keys come after the tables they reference.
 * Note: subscriptions must come before recurring_templates (subscription_id FK).
 */
export const ALL_TABLES = [
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

/**
 * Schema version — increment this when changing the schema.
 */
export const SCHEMA_VERSION = 1;
