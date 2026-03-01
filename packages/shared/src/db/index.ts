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
