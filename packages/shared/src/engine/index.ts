// Budget calculation engine — MonthBudgetState, allocation, carry-forward, overspend

export {
  calculateMonthBudget,
  getCarryForward,
  getTotalOverspent,
  moveMoneyBetweenCategories,
} from './budget';
export type {
  CategoryBudgetState,
  GroupBudgetState,
  MonthBudgetState,
  MonthBudgetInput,
} from './budget';

export {
  allocateToCategory,
  moveAllocation,
  getAllocationsForMonth,
  getAllocationMap,
} from './allocations';

export {
  calculateNextDate,
  generateOccurrences,
} from './schedule';

// Transaction rules engine
export {
  evaluateConditions,
  matchRule,
  applyRules,
} from './transaction-rules';
export type {
  RuleCondition,
  RuleAction,
  TransactionRule as EngineTransactionRule,
  TransactionInput as RuleTransactionInput,
  RuleMatch,
  ApplyRulesResult,
} from './transaction-rules';

// Income estimator
export {
  detectIncomeStreams,
  classifyIncomePattern,
  estimateMonthlyIncome,
} from './income-estimator';
export type {
  IncomeFrequency,
  IncomePattern,
  IncomeStream,
  IncomeEstimate,
} from './income-estimator';

// Payday detector
export {
  detectPaydays,
  predictNextPayday,
  getPaydaySchedule,
} from './payday-detector';
export type {
  PaydayFrequency,
  PaydayPattern,
  PaydayPrediction,
} from './payday-detector';

// Net cash calculator
export {
  calculateNetCash,
  calculateCashFlowByPeriod,
  calculateRunningBalance,
} from './net-cash';
export type {
  NetCashResult,
  CashFlowPeriod,
  RunningBalanceEntry,
} from './net-cash';

// Goal tracking
export {
  calculateGoalProgress,
  suggestMonthlyContribution,
  isGoalOnTrack,
  getGoalStatus,
  calculateGoalProjection,
} from './goals';
export type {
  Goal as GoalInput,
  GoalProgress,
  GoalStatus,
  GoalProjection,
} from './goals';

// Reporting engine
export {
  getSpendingByCategory,
  getMonthlySpendingTrend,
  getBudgetedVsSpent,
  getTopPayees,
} from './reporting';
export type {
  CategorySpending as ReportCategorySpending,
  MonthlySpendingPoint,
  BudgetVsSpentRow,
  TopPayee,
  DateRange,
} from './reporting';

// Net worth engine
export {
  calculateNetWorth,
  buildNetWorthTimeline,
  captureSnapshot,
} from './net-worth';
export type {
  AccountInput as NetWorthAccountInput,
  NetWorthResult,
  NetWorthSnapshot as NetWorthEngineSnapshot,
  NetWorthTimelinePoint,
  SnapshotInput,
} from './net-worth';

// Debt payoff engine
export {
  calculateSnowball,
  calculateAvalanche,
  generateAmortizationSchedule,
  projectPayoffDate,
} from './debt-payoff';
export type {
  DebtInput,
  PayoffStrategy,
  PayoffScheduleEntry,
  DebtPayoffResult,
  AmortizationEntry,
} from './debt-payoff';

// Rollover engine
export {
  calculateRollover,
  processMonthRollover,
  applyRollovers,
} from './rollover';
export type {
  RolloverRecord,
  RolloverInput,
} from './rollover';

// Upcoming transactions engine
export {
  getUpcomingTransactions,
  groupByDate,
  getUpcomingTotal,
} from './upcoming';
export type {
  RecurringTemplate as UpcomingTemplate,
  UpcomingTransaction,
  GroupedUpcoming,
} from './upcoming';

// Budget alerts engine
export {
  checkAlerts,
  shouldFireAlert,
  buildAlertNotification,
} from './alerts';
export type {
  AlertConfig,
  AlertHistoryEntry,
  CategorySpendState,
  AlertNotification,
} from './alerts';

// Multi-currency engine
export {
  RATE_PRECISION,
  convertAmount,
  formatCurrencyAmount,
  convertToBase,
} from './multi-currency';
export type {
  ExchangeRate as CurrencyExchangeRate,
  CurrencyInfo,
} from './multi-currency';
