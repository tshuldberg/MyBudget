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
