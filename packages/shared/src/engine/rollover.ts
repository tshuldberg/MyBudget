/**
 * Budget rollover engine.
 *
 * Formalizes the carry-forward concept from the budget engine by generating
 * persistent rollover records. Each record captures the unspent (or overspent)
 * amount for a category transitioning from one month to the next.
 *
 * All amounts in integer cents.
 */

import type { MonthBudgetState, CategoryBudgetState } from './budget';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RolloverRecord {
  categoryId: string;
  fromMonth: string; // YYYY-MM
  toMonth: string;   // YYYY-MM
  amount: number;    // cents (positive = surplus, negative = overspent)
}

export interface RolloverInput {
  categoryId: string;
  allocated: number;   // cents
  activity: number;    // cents (negative = outflows)
  carryForward: number; // cents from prior month
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Advance a YYYY-MM string by one month.
 */
function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const newMonth = m + 1;
  if (newMonth > 12) {
    return `${y + 1}-01`;
  }
  return `${y}-${String(newMonth).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Calculate the rollover amount for a single category.
 * Rollover = carryForward + allocated + activity (i.e., the "available" amount).
 */
export function calculateRollover(input: RolloverInput): number {
  return input.carryForward + input.allocated + input.activity;
}

/**
 * Generate rollover records for all categories transitioning from one month
 * to the next. Uses the budget state to compute each category's available
 * balance as the rollover amount.
 *
 * @param budgetState - Completed budget state for the month being closed
 * @returns Array of rollover records to persist
 */
export function processMonthRollover(
  budgetState: MonthBudgetState,
): RolloverRecord[] {
  const fromMonth = budgetState.month;
  const toMonth = nextMonth(fromMonth);
  const records: RolloverRecord[] = [];

  for (const group of budgetState.groups) {
    for (const cat of group.categories) {
      records.push({
        categoryId: cat.categoryId,
        fromMonth,
        toMonth,
        amount: cat.available,
      });
    }
  }

  return records;
}

/**
 * Apply rollover records to a month's starting allocations.
 * Returns a new Map of category ID to adjusted starting balance
 * (the rollover amount becomes that category's carry-forward).
 *
 * @param allocations - Current month's raw allocations (category ID -> cents)
 * @param rollovers - Rollover records from the previous month
 * @returns Map of category ID to effective allocation (allocation + rollover)
 */
export function applyRollovers(
  allocations: Map<string, number>,
  rollovers: RolloverRecord[],
): Map<string, number> {
  const result = new Map(allocations);

  for (const rollover of rollovers) {
    const current = result.get(rollover.categoryId) ?? 0;
    result.set(rollover.categoryId, current + rollover.amount);
  }

  return result;
}
