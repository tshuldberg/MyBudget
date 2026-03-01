// Database layer — SQLite schema, migrations, CRUD operations

// Schema SQL
export {
  CREATE_ACCOUNTS,
  CREATE_CATEGORY_GROUPS,
  CREATE_CATEGORIES,
  CREATE_BUDGET_ALLOCATIONS,
  CREATE_TRANSACTIONS,
  CREATE_TRANSACTION_SPLITS,
  CREATE_RECURRING_TEMPLATES,
  CREATE_PAYEE_CACHE,
  CREATE_CSV_PROFILES,
  CREATE_SUBSCRIPTIONS,
  CREATE_PRICE_HISTORY,
  CREATE_NOTIFICATION_LOG,
  CREATE_PREFERENCES,
  CREATE_BANK_CONNECTIONS,
  CREATE_BANK_ACCOUNTS,
  CREATE_BANK_TRANSACTIONS_RAW,
  CREATE_BANK_SYNC_STATE,
  CREATE_BANK_WEBHOOK_EVENTS,
  CREATE_GOALS,
  CREATE_TRANSACTION_RULES,
  CORE_TABLES,
  BANK_SYNC_TABLES,
  GOALS_RULES_TABLES,
  CORE_INDEXES,
  BANK_SYNC_INDEXES,
  GOALS_RULES_INDEXES,
  CREATE_INDEXES,
  ALL_TABLES,
  SCHEMA_VERSION,
} from './schema';

// Migration runner
export {
  runMigrations,
  initializeDatabase,
  MIGRATIONS,
} from './migrations';
export type { DatabaseAdapter, Migration } from './migrations';

// Account CRUD
export {
  createAccount,
  updateAccount,
  getAccounts,
  getAllAccounts,
  getAccountById,
  archiveAccount,
  getAccountBalance,
  updateAccountBalance,
} from './accounts';

// Category CRUD
export {
  createCategoryGroup,
  updateCategoryGroup,
  deleteCategoryGroup,
  getCategoryGroups,
  getAllCategoryGroups,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategories,
  getCategoriesByGroup,
  getCategoryById,
} from './categories';

// Transaction CRUD
export {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactions,
  getTransactionById,
  getActivityByCategory,
  getTotalIncome,
} from './transactions';
export type { TransactionWithSplits, TransactionFilters } from './transactions';

// Payee autocomplete
export {
  updatePayeeCache,
  getPayeeSuggestions,
  getCategorySuggestion,
} from './payee-cache';

// Recurring templates
export {
  createRecurringTemplate,
  updateRecurringTemplate,
  getActiveTemplates,
  getTemplateById,
  getTemplateBySubscriptionId,
  generatePendingTransactions,
} from './recurring';
export type { PendingTransaction } from './recurring';

// Transfers
export {
  createTransfer,
  getTransferPair,
} from './transfers';
export type { TransferPair } from './transfers';

// Goal CRUD
export {
  createGoal,
  updateGoal,
  deleteGoal,
  getGoals,
  getGoalById,
  getGoalsByCategory,
  allocateToGoal,
} from './goals';

// Transaction Rule CRUD
export {
  createTransactionRule,
  updateTransactionRule,
  deleteTransactionRule,
  getTransactionRules,
  getEnabledTransactionRules,
  getTransactionRuleById,
} from './transaction-rules';

// Rich Goals CRUD (with conditions, active state, notes)
export {
  createGoal as createGoalV2,
  getGoal as getGoalV2,
  listGoals,
  updateGoal as updateGoalV2,
  deleteGoal as deleteGoalV2,
  getGoalsByCategory as getGoalsByCategoryV2,
  getActiveGoals,
} from './goals-crud';
export type {
  GoalRow,
  GoalInsert as GoalInsertV2,
  GoalUpdate as GoalUpdateV2,
} from './goals-crud';

// Rich Rules CRUD (with conditions/actions tables)
export {
  createRule,
  getRule,
  listRules,
  updateRule,
  deleteRule,
  reorderRules,
  getActiveRules,
} from './rules-crud';
export type {
  RuleRow,
  RuleConditionRow,
  RuleActionRow,
  RuleConditionInsert,
  RuleActionInsert,
  RuleInsert,
  RuleUpdate,
} from './rules-crud';

// Net Worth Snapshot CRUD
export {
  createSnapshot,
  getSnapshot,
  getSnapshotByMonth,
  listSnapshots,
  updateSnapshot,
  deleteSnapshot,
} from './net-worth-crud';
export type {
  NetWorthSnapshotRow,
  NetWorthSnapshotInsert,
  NetWorthSnapshotUpdate,
} from './net-worth-crud';

// Debt Payoff CRUD
export {
  createPlan,
  getPlan,
  listPlans,
  updatePlan,
  deletePlan,
  getActivePlans,
  createDebt,
  getDebt,
  listDebtsByPlan,
  updateDebt,
  deleteDebt,
} from './debt-payoff-crud';
export type {
  DebtPayoffPlanRow,
  DebtPayoffPlanInsert,
  DebtPayoffPlanUpdate,
  DebtPayoffDebtRow,
  DebtPayoffDebtInsert,
  DebtPayoffDebtUpdate,
} from './debt-payoff-crud';

// Rollover CRUD
export {
  createRollover,
  getRollover,
  listRollovers,
  getRolloversByMonth,
  getRolloversByCategory,
  deleteRollover,
  deleteRolloversByMonth,
} from './rollover-crud';
export type {
  RolloverRow,
  RolloverInsert as RolloverCrudInsert,
} from './rollover-crud';

// Budget Alerts CRUD
export {
  createAlert,
  getAlert,
  listAlerts,
  getAlertsByCategory,
  updateAlert,
  deleteAlert,
  createAlertHistory,
  getAlertHistory,
  getAlertHistoryByMonth,
  deleteAlertHistory,
} from './alerts-crud';
export type {
  AlertRow,
  AlertInsert as AlertCrudInsert,
  AlertUpdate as AlertCrudUpdate,
  AlertHistoryRow,
  AlertHistoryInsert as AlertHistoryCrudInsert,
} from './alerts-crud';

// Currency CRUD
export {
  createCurrency,
  getCurrency,
  listCurrencies,
  getBaseCurrency,
  deleteCurrency,
  upsertExchangeRate,
  getExchangeRate,
  listExchangeRates,
  deleteExchangeRate,
} from './currency-crud';
export type {
  CurrencyRow,
  CurrencyInsert as CurrencyCrudInsert,
  ExchangeRateRow,
  ExchangeRateInsert as ExchangeRateCrudInsert,
} from './currency-crud';

// V4 Schema exports
export {
  CREATE_NET_WORTH_SNAPSHOTS,
  CREATE_DEBT_PAYOFF_PLANS,
  CREATE_DEBT_PAYOFF_DEBTS,
  CREATE_BUDGET_ROLLOVERS,
  CREATE_BUDGET_ALERTS,
  CREATE_ALERT_HISTORY,
  CREATE_CURRENCIES,
  CREATE_EXCHANGE_RATES,
  CREATE_SHARED_ENVELOPES,
  FEATURES_V4_TABLES,
  FEATURES_V4_INDEXES,
} from './schema';
