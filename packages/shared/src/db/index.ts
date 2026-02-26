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
  CORE_TABLES,
  BANK_SYNC_TABLES,
  CORE_INDEXES,
  BANK_SYNC_INDEXES,
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
