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
