/**
 * Budget allocation operations: assign money, move between envelopes, monthly roll-forward.
 */

import type { DatabaseAdapter } from '../db/migrations';
import type { BudgetAllocation } from '../models/schemas';

/**
 * Allocate money to a category for a given month.
 * Creates or updates the allocation record.
 *
 * @param amount The allocation amount in cents (replaces existing allocation)
 */
export function allocateToCategory(
  db: DatabaseAdapter,
  id: string,
  categoryId: string,
  month: string,
  amount: number,
): void {
  db.execute(
    `INSERT INTO budget_allocations (id, category_id, month, allocated)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(category_id, month) DO UPDATE SET allocated = excluded.allocated`,
    [id, categoryId, month, amount],
  );
}

/**
 * Move allocation from one category to another within the same month.
 * Decreases source category allocation, increases target.
 *
 * @param amount Positive number of cents to move
 * @param moveId UUID for the new allocation record if target doesn't exist yet
 */
export function moveAllocation(
  db: DatabaseAdapter,
  fromCategoryId: string,
  toCategoryId: string,
  month: string,
  amount: number,
  moveId: string,
): void {
  if (amount <= 0) throw new Error('Move amount must be positive');
  if (fromCategoryId === toCategoryId) throw new Error('Cannot move to same category');

  db.transaction(() => {
    // Decrease source
    db.execute(
      `UPDATE budget_allocations SET allocated = allocated - ?
       WHERE category_id = ? AND month = ?`,
      [amount, fromCategoryId, month],
    );

    // Increase target (upsert)
    db.execute(
      `INSERT INTO budget_allocations (id, category_id, month, allocated)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(category_id, month) DO UPDATE SET allocated = allocated + excluded.allocated`,
      [moveId, toCategoryId, month, amount],
    );
  });
}

/**
 * Get all allocations for a given month.
 */
export function getAllocationsForMonth(
  db: DatabaseAdapter,
  month: string,
): BudgetAllocation[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM budget_allocations WHERE month = ?`,
    [month],
  );
  return rows.map(rowToAllocation);
}

/**
 * Get allocations as a Map of categoryId -> allocated cents for a month.
 */
export function getAllocationMap(
  db: DatabaseAdapter,
  month: string,
): Map<string, number> {
  const rows = db.query<{ category_id: string; allocated: number }>(
    `SELECT category_id, allocated FROM budget_allocations WHERE month = ?`,
    [month],
  );
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.category_id, row.allocated);
  }
  return map;
}

function rowToAllocation(row: Record<string, unknown>): BudgetAllocation {
  return {
    id: row.id as string,
    category_id: row.category_id as string,
    month: row.month as string,
    allocated: row.allocated as number,
  };
}
