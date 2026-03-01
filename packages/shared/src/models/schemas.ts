import { z } from 'zod';

// --- Reusable primitives ---

const id = z.string().uuid();
const timestamp = z.string().datetime();
const monthFormat = z.string().regex(/^\d{4}-\d{2}$/, 'Must be YYYY-MM');
const dateFormat = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');
const cents = z.number().int();

// --- 1. Accounts ---

export const AccountType = z.enum(['checking', 'savings', 'credit_card', 'cash']);
export type AccountType = z.infer<typeof AccountType>;

export const AccountSchema = z.object({
  id,
  name: z.string().min(1).max(100),
  type: AccountType,
  balance: cents,
  sort_order: z.number().int().nonnegative(),
  is_active: z.boolean(),
  created_at: timestamp,
  updated_at: timestamp,
});
export type Account = z.infer<typeof AccountSchema>;

export const AccountInsertSchema = AccountSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial({ balance: true, sort_order: true, is_active: true });
export type AccountInsert = z.infer<typeof AccountInsertSchema>;

// --- 2. Category Groups ---

export const CategoryGroupSchema = z.object({
  id,
  name: z.string().min(1).max(100),
  sort_order: z.number().int().nonnegative(),
  is_hidden: z.boolean(),
  created_at: timestamp,
  updated_at: timestamp,
});
export type CategoryGroup = z.infer<typeof CategoryGroupSchema>;

export const CategoryGroupInsertSchema = CategoryGroupSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial({ sort_order: true, is_hidden: true });
export type CategoryGroupInsert = z.infer<typeof CategoryGroupInsertSchema>;

// --- 3. Categories ---

export const TargetType = z.enum(['monthly', 'savings_goal', 'debt_payment']);
export type TargetType = z.infer<typeof TargetType>;

export const CategorySchema = z.object({
  id,
  group_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  emoji: z.string().max(10).nullable(),
  target_amount: cents.nullable(),
  target_type: TargetType.nullable(),
  sort_order: z.number().int().nonnegative(),
  is_hidden: z.boolean(),
  created_at: timestamp,
  updated_at: timestamp,
});
export type Category = z.infer<typeof CategorySchema>;

export const CategoryInsertSchema = CategorySchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial({ emoji: true, target_amount: true, target_type: true, sort_order: true, is_hidden: true });
export type CategoryInsert = z.infer<typeof CategoryInsertSchema>;

// --- 4. Budget Allocations ---

export const BudgetAllocationSchema = z.object({
  id,
  category_id: z.string().uuid(),
  month: monthFormat,
  allocated: cents,
});
export type BudgetAllocation = z.infer<typeof BudgetAllocationSchema>;

export const BudgetAllocationInsertSchema = BudgetAllocationSchema.omit({ id: true });
export type BudgetAllocationInsert = z.infer<typeof BudgetAllocationInsertSchema>;

// --- 5. Transactions ---

export const TransactionSchema = z.object({
  id,
  account_id: z.string().uuid(),
  date: dateFormat,
  payee: z.string().max(200),
  memo: z.string().max(500).nullable(),
  amount: cents,
  is_cleared: z.boolean(),
  is_transfer: z.boolean(),
  transfer_id: z.string().uuid().nullable(),
  created_at: timestamp,
  updated_at: timestamp,
});
export type Transaction = z.infer<typeof TransactionSchema>;

export const TransactionInsertSchema = TransactionSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial({ memo: true, is_cleared: true, is_transfer: true, transfer_id: true });
export type TransactionInsert = z.infer<typeof TransactionInsertSchema>;

// --- 6. Transaction Splits ---

export const TransactionSplitSchema = z.object({
  id,
  transaction_id: z.string().uuid(),
  category_id: z.string().uuid().nullable(),
  amount: cents,
  memo: z.string().max(500).nullable(),
});
export type TransactionSplit = z.infer<typeof TransactionSplitSchema>;

export const TransactionSplitInsertSchema = TransactionSplitSchema.omit({ id: true }).partial({ memo: true });
export type TransactionSplitInsert = z.infer<typeof TransactionSplitInsertSchema>;

// --- 7. Recurring Templates ---

export const Frequency = z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'annually']);
export type Frequency = z.infer<typeof Frequency>;

export const RecurringTemplateSchema = z.object({
  id,
  account_id: z.string().uuid(),
  category_id: z.string().uuid().nullable(),
  payee: z.string().max(200),
  amount: cents,
  frequency: Frequency,
  start_date: dateFormat,
  end_date: dateFormat.nullable(),
  next_date: dateFormat,
  is_active: z.boolean(),
  subscription_id: z.string().uuid().nullable(),
  created_at: timestamp,
  updated_at: timestamp,
});
export type RecurringTemplate = z.infer<typeof RecurringTemplateSchema>;

export const RecurringTemplateInsertSchema = RecurringTemplateSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial({ category_id: true, end_date: true, is_active: true, subscription_id: true });
export type RecurringTemplateInsert = z.infer<typeof RecurringTemplateInsertSchema>;

// --- 8. Payee Cache ---

export const PayeeCacheSchema = z.object({
  payee: z.string().max(200),
  last_category_id: z.string().uuid().nullable(),
  use_count: z.number().int().nonnegative(),
  last_used: timestamp,
});
export type PayeeCache = z.infer<typeof PayeeCacheSchema>;

// --- 9. CSV Profiles ---

export const AmountSign = z.enum(['negative_is_outflow', 'positive_is_outflow', 'separate_columns']);
export type AmountSign = z.infer<typeof AmountSign>;

export const CsvProfileSchema = z.object({
  id,
  name: z.string().min(1).max(100),
  date_column: z.number().int().nonnegative(),
  payee_column: z.number().int().nonnegative(),
  amount_column: z.number().int().nonnegative(),
  memo_column: z.number().int().nonnegative().nullable(),
  date_format: z.string().max(50),
  amount_sign: AmountSign,
  debit_column: z.number().int().nonnegative().nullable(),
  credit_column: z.number().int().nonnegative().nullable(),
  skip_rows: z.number().int().nonnegative(),
  created_at: timestamp,
});
export type CsvProfile = z.infer<typeof CsvProfileSchema>;

export const CsvProfileInsertSchema = CsvProfileSchema.omit({
  id: true,
  created_at: true,
}).partial({ memo_column: true, debit_column: true, credit_column: true, skip_rows: true });
export type CsvProfileInsert = z.infer<typeof CsvProfileInsertSchema>;

// --- 10. Subscriptions ---

export const BillingCycle = z.enum(['weekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'custom']);
export type BillingCycle = z.infer<typeof BillingCycle>;

export const SubscriptionStatus = z.enum(['active', 'paused', 'cancelled', 'trial']);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatus>;

export const SubscriptionSchema = z.object({
  id,
  name: z.string().min(1).max(200),
  price: cents,
  currency: z.string().length(3).default('USD'),
  billing_cycle: BillingCycle,
  custom_days: z.number().int().positive().nullable(),
  category_id: z.string().uuid().nullable(),
  status: SubscriptionStatus,
  start_date: dateFormat,
  next_renewal: dateFormat,
  trial_end_date: dateFormat.nullable(),
  cancelled_date: dateFormat.nullable(),
  notes: z.string().max(1000).nullable(),
  url: z.string().max(500).nullable(),
  icon: z.string().max(100).nullable(),
  color: z.string().max(20).nullable(),
  notify_days: z.number().int().nonnegative(),
  catalog_id: z.string().nullable(),
  sort_order: z.number().int().nonnegative(),
  created_at: timestamp,
  updated_at: timestamp,
});
export type Subscription = z.infer<typeof SubscriptionSchema>;

export const SubscriptionInsertSchema = SubscriptionSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial({
  currency: true,
  custom_days: true,
  category_id: true,
  trial_end_date: true,
  cancelled_date: true,
  notes: true,
  url: true,
  icon: true,
  color: true,
  notify_days: true,
  catalog_id: true,
  sort_order: true,
});
export type SubscriptionInsert = z.infer<typeof SubscriptionInsertSchema>;

// --- 11. Price History ---

export const PriceHistorySchema = z.object({
  id,
  subscription_id: z.string().uuid(),
  price: cents,
  effective_date: dateFormat,
  created_at: timestamp,
});
export type PriceHistory = z.infer<typeof PriceHistorySchema>;

export const PriceHistoryInsertSchema = PriceHistorySchema.omit({
  id: true,
  created_at: true,
});
export type PriceHistoryInsert = z.infer<typeof PriceHistoryInsertSchema>;

// --- 12. Notification Log ---

export const NotificationType = z.enum(['renewal', 'trial_expiry', 'monthly_summary']);
export type NotificationType = z.infer<typeof NotificationType>;

export const NotificationLogSchema = z.object({
  id,
  subscription_id: z.string().uuid(),
  type: NotificationType,
  scheduled_for: timestamp,
  sent_at: timestamp.nullable(),
});
export type NotificationLog = z.infer<typeof NotificationLogSchema>;

export const NotificationLogInsertSchema = NotificationLogSchema.omit({ id: true }).partial({ sent_at: true });
export type NotificationLogInsert = z.infer<typeof NotificationLogInsertSchema>;

// --- 13. Preferences ---

export const PreferenceSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string(),
});
export type Preference = z.infer<typeof PreferenceSchema>;

// --- 14. Goals ---

export const GoalSchema = z.object({
  id,
  name: z.string().min(1).max(200),
  target_amount_cents: cents,
  current_amount_cents: cents,
  target_date: dateFormat.nullable(),
  category_id: z.string().uuid().nullable(),
  created_at: timestamp,
  updated_at: timestamp,
});
export type Goal = z.infer<typeof GoalSchema>;

export const GoalInsertSchema = GoalSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial({
  current_amount_cents: true,
  target_date: true,
  category_id: true,
});
export type GoalInsert = z.infer<typeof GoalInsertSchema>;

// --- 15. Transaction Rules ---

export const RuleMatchType = z.enum(['contains', 'exact', 'starts_with']);
export type RuleMatchType = z.infer<typeof RuleMatchType>;

export const TransactionRuleSchema = z.object({
  id,
  payee_pattern: z.string().min(1).max(200),
  match_type: RuleMatchType,
  category_id: z.string().uuid(),
  is_enabled: z.boolean(),
  priority: z.number().int().nonnegative(),
  created_at: timestamp,
});
export type TransactionRule = z.infer<typeof TransactionRuleSchema>;

export const TransactionRuleInsertSchema = TransactionRuleSchema.omit({
  id: true,
  created_at: true,
}).partial({
  is_enabled: true,
  priority: true,
});
export type TransactionRuleInsert = z.infer<typeof TransactionRuleInsertSchema>;

// --- 16. Net Worth Snapshots ---

export const NetWorthSnapshotSchema = z.object({
  id,
  month: monthFormat,
  assets: cents,
  liabilities: cents,
  net_worth: cents,
  account_balances: z.string().nullable(),
  created_at: timestamp,
});
export type NetWorthSnapshot = z.infer<typeof NetWorthSnapshotSchema>;

export const NetWorthSnapshotInsertSchema = NetWorthSnapshotSchema.omit({
  id: true,
  created_at: true,
}).partial({ account_balances: true });
export type NetWorthSnapshotInsert = z.infer<typeof NetWorthSnapshotInsertSchema>;

// --- 17. Debt Payoff Plans ---

export const DebtPayoffStrategy = z.enum(['snowball', 'avalanche']);
export type DebtPayoffStrategy = z.infer<typeof DebtPayoffStrategy>;

export const DebtPayoffPlanSchema = z.object({
  id,
  name: z.string().min(1).max(200),
  strategy: DebtPayoffStrategy,
  extra_payment: cents,
  is_active: z.boolean(),
  created_at: timestamp,
  updated_at: timestamp,
});
export type DebtPayoffPlan = z.infer<typeof DebtPayoffPlanSchema>;

export const DebtPayoffPlanInsertSchema = DebtPayoffPlanSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial({ extra_payment: true, is_active: true });
export type DebtPayoffPlanInsert = z.infer<typeof DebtPayoffPlanInsertSchema>;

// --- 18. Debt Payoff Debts ---

export const CompoundingType = z.enum(['monthly', 'daily']);
export type CompoundingType = z.infer<typeof CompoundingType>;

export const DebtPayoffDebtSchema = z.object({
  id,
  plan_id: z.string().uuid(),
  account_id: z.string().uuid().nullable(),
  name: z.string().min(1).max(200),
  balance: cents,
  interest_rate: z.number().int(),
  minimum_payment: cents,
  compounding: CompoundingType,
  sort_order: z.number().int().nonnegative(),
});
export type DebtPayoffDebt = z.infer<typeof DebtPayoffDebtSchema>;

export const DebtPayoffDebtInsertSchema = DebtPayoffDebtSchema.omit({ id: true }).partial({
  account_id: true,
  interest_rate: true,
  minimum_payment: true,
  compounding: true,
  sort_order: true,
});
export type DebtPayoffDebtInsert = z.infer<typeof DebtPayoffDebtInsertSchema>;

// --- 19. Budget Rollovers ---

export const BudgetRolloverSchema = z.object({
  id,
  category_id: z.string().uuid(),
  from_month: monthFormat,
  to_month: monthFormat,
  amount: cents,
  created_at: timestamp,
});
export type BudgetRollover = z.infer<typeof BudgetRolloverSchema>;

export const BudgetRolloverInsertSchema = BudgetRolloverSchema.omit({
  id: true,
  created_at: true,
});
export type BudgetRolloverInsert = z.infer<typeof BudgetRolloverInsertSchema>;

// --- 20. Budget Alerts ---

export const BudgetAlertSchema = z.object({
  id,
  category_id: z.string().uuid(),
  threshold_pct: z.number().int().min(1).max(200),
  is_enabled: z.boolean(),
  created_at: timestamp,
  updated_at: timestamp,
});
export type BudgetAlert = z.infer<typeof BudgetAlertSchema>;

export const BudgetAlertInsertSchema = BudgetAlertSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial({ threshold_pct: true, is_enabled: true });
export type BudgetAlertInsert = z.infer<typeof BudgetAlertInsertSchema>;

// --- 21. Alert History ---

export const AlertHistorySchema = z.object({
  id,
  alert_id: z.string().uuid(),
  category_id: z.string().uuid(),
  month: monthFormat,
  threshold_pct: z.number().int(),
  spent_pct: z.number().int(),
  amount_spent: cents,
  target_amount: cents,
  notified_at: timestamp,
});
export type AlertHistory = z.infer<typeof AlertHistorySchema>;

export const AlertHistoryInsertSchema = AlertHistorySchema.omit({
  id: true,
  notified_at: true,
});
export type AlertHistoryInsert = z.infer<typeof AlertHistoryInsertSchema>;

// --- 22. Currencies ---

export const CurrencySchema = z.object({
  code: z.string().length(3),
  name: z.string().min(1).max(100),
  symbol: z.string().max(10),
  decimal_places: z.number().int().nonnegative(),
  is_base: z.boolean(),
  created_at: timestamp,
});
export type Currency = z.infer<typeof CurrencySchema>;

export const CurrencyInsertSchema = CurrencySchema.omit({ created_at: true }).partial({
  symbol: true,
  decimal_places: true,
  is_base: true,
});
export type CurrencyInsert = z.infer<typeof CurrencyInsertSchema>;

// --- 23. Exchange Rates ---

export const ExchangeRateSchema = z.object({
  id,
  from_currency: z.string().length(3),
  to_currency: z.string().length(3),
  rate: z.number().int(),
  rate_decimal: z.string(),
  fetched_at: timestamp,
});
export type ExchangeRate = z.infer<typeof ExchangeRateSchema>;

export const ExchangeRateInsertSchema = ExchangeRateSchema.omit({
  id: true,
  fetched_at: true,
});
export type ExchangeRateInsert = z.infer<typeof ExchangeRateInsertSchema>;
