/**
 * Budget calculation engine for MyBudget.
 *
 * Core YNAB-style envelope budgeting rules:
 * 1. Money is assigned, not predicted — users allocate actual income to categories
 * 2. Available rolls forward — underspent categories carry surplus into next month
 * 3. Overspending borrows from Ready to Assign — negative available reduces global pool
 * 4. All amounts in integer cents (no floating-point)
 */

/**
 * Budget state for a single category in a single month.
 */
export interface CategoryBudgetState {
  categoryId: string;
  groupId: string;
  name: string;
  emoji: string | null;
  /** Amount allocated this month (cents) */
  allocated: number;
  /** Activity (spending) this month — negative = outflows, positive = inflows (cents) */
  activity: number;
  /** Carry-forward from previous month (cents, can be negative) */
  carryForward: number;
  /** Available = carryForward + allocated + activity (cents) */
  available: number;
  /** Target amount if set (cents) */
  targetAmount: number | null;
  targetType: string | null;
  /** Progress toward target (0-100+, can exceed 100 for overfunded) */
  targetProgress: number | null;
}

/**
 * Budget state for a category group in a single month.
 */
export interface GroupBudgetState {
  groupId: string;
  name: string;
  /** Sum of allocated across all categories in group (cents) */
  allocated: number;
  /** Sum of activity across all categories in group (cents) */
  activity: number;
  /** Sum of available across all categories in group (cents) */
  available: number;
  categories: CategoryBudgetState[];
}

/**
 * Complete budget state for a single month.
 */
export interface MonthBudgetState {
  month: string; // YYYY-MM
  /** Total income (inflows to budget accounts) this month (cents) */
  totalIncome: number;
  /** Total allocated across all categories this month (cents) */
  totalAllocated: number;
  /** Total activity (spending) across all categories this month (cents) */
  totalActivity: number;
  /** Total overspent amount (sum of negative available, as positive number) (cents) */
  totalOverspent: number;
  /**
   * Ready to Assign = totalIncome - totalAllocated - totalOverspentLastMonth
   * The unallocated pool. Can be negative (over-assigned).
   */
  readyToAssign: number;
  groups: GroupBudgetState[];
}

/**
 * Input data needed to calculate a month's budget.
 * The caller fetches these from the database and passes them in.
 */
export interface MonthBudgetInput {
  month: string; // YYYY-MM
  /** All category groups with their categories */
  groups: Array<{
    groupId: string;
    name: string;
    categories: Array<{
      categoryId: string;
      name: string;
      emoji: string | null;
      targetAmount: number | null;
      targetType: string | null;
    }>;
  }>;
  /** Budget allocations for this month, keyed by category ID */
  allocations: Map<string, number>;
  /** Activity (sum of transaction splits) for this month, keyed by category ID.
   *  Negative = outflows, positive = inflows. */
  activity: Map<string, number>;
  /** Carry-forward from previous month, keyed by category ID.
   *  This is the "available" from the prior month. */
  carryForwards: Map<string, number>;
  /** Total income (inflows to budget accounts) for this month (cents) */
  totalIncome: number;
  /** Total overspent from last month (positive number representing the shortfall) */
  overspentLastMonth: number;
}

/**
 * Calculate the complete budget state for a single month.
 */
export function calculateMonthBudget(input: MonthBudgetInput): MonthBudgetState {
  let totalAllocated = 0;
  let totalActivity = 0;
  let totalOverspent = 0;

  const groups: GroupBudgetState[] = input.groups.map((group) => {
    let groupAllocated = 0;
    let groupActivity = 0;
    let groupAvailable = 0;

    const categories: CategoryBudgetState[] = group.categories.map((cat) => {
      const allocated = input.allocations.get(cat.categoryId) ?? 0;
      const activity = input.activity.get(cat.categoryId) ?? 0;
      const carryForward = input.carryForwards.get(cat.categoryId) ?? 0;
      const available = carryForward + allocated + activity;

      if (available < 0) {
        totalOverspent += Math.abs(available);
      }

      groupAllocated += allocated;
      groupActivity += activity;
      groupAvailable += available;

      let targetProgress: number | null = null;
      if (cat.targetAmount != null && cat.targetAmount > 0) {
        if (cat.targetType === 'savings_goal') {
          // For savings goals, progress is based on total available (cumulative)
          targetProgress = Math.round((available / cat.targetAmount) * 100);
        } else {
          // For monthly targets and debt payments, progress is based on allocation
          targetProgress = Math.round((allocated / cat.targetAmount) * 100);
        }
      }

      return {
        categoryId: cat.categoryId,
        groupId: group.groupId,
        name: cat.name,
        emoji: cat.emoji,
        allocated,
        activity,
        carryForward,
        available,
        targetAmount: cat.targetAmount,
        targetType: cat.targetType,
        targetProgress,
      };
    });

    totalAllocated += groupAllocated;
    totalActivity += groupActivity;

    return {
      groupId: group.groupId,
      name: group.name,
      allocated: groupAllocated,
      activity: groupActivity,
      available: groupAvailable,
      categories,
    };
  });

  const readyToAssign = input.totalIncome - totalAllocated - input.overspentLastMonth;

  return {
    month: input.month,
    totalIncome: input.totalIncome,
    totalAllocated,
    totalActivity,
    totalOverspent,
    readyToAssign,
    groups,
  };
}

/**
 * Calculate the carry-forward map for a given month's budget state.
 * Each category's "available" becomes the next month's carry-forward.
 *
 * @returns Map of category ID to carry-forward amount (cents)
 */
export function getCarryForward(
  budgetState: MonthBudgetState,
): Map<string, number> {
  const result = new Map<string, number>();
  for (const group of budgetState.groups) {
    for (const cat of group.categories) {
      result.set(cat.categoryId, cat.available);
    }
  }
  return result;
}

/**
 * Calculate the total overspent amount from a month's budget state.
 * This is the sum of all negative "available" amounts (returned as positive).
 * Used as the overspentLastMonth input for the next month.
 */
export function getTotalOverspent(budgetState: MonthBudgetState): number {
  return budgetState.totalOverspent;
}

/**
 * Move money between two categories within the same month.
 * Does not touch the database — returns the delta to apply.
 *
 * @param amount Amount to move in cents (positive number)
 * @returns Object with the allocation adjustments to persist
 */
export function moveMoneyBetweenCategories(
  fromCategoryId: string,
  toCategoryId: string,
  amount: number,
): { fromDelta: number; toDelta: number } {
  if (amount <= 0) {
    throw new Error('Move amount must be positive');
  }
  if (fromCategoryId === toCategoryId) {
    throw new Error('Cannot move money to the same category');
  }
  return {
    fromDelta: -amount,
    toDelta: amount,
  };
}
