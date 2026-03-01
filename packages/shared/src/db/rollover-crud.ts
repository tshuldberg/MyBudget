/**
 * Budget rollovers CRUD operations.
 *
 * Rollover records track the carry-forward amount for each category
 * transitioning from one month to the next.
 *
 * All amounts stored as integer cents.
 */

import type { DatabaseAdapter } from './migrations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RolloverRow {
  id: string;
  categoryId: string;
  fromMonth: string;  // YYYY-MM
  toMonth: string;    // YYYY-MM
  amount: number;     // cents
  createdAt: string;
}

export interface RolloverInsert {
  categoryId: string;
  fromMonth: string;
  toMonth: string;
  amount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;

function generateId(): string {
  _idCounter++;
  return `rollover-${Date.now()}-${_idCounter}`;
}

function rowToRollover(row: Record<string, unknown>): RolloverRow {
  return {
    id: row.id as string,
    categoryId: row.category_id as string,
    fromMonth: row.from_month as string,
    toMonth: row.to_month as string,
    amount: row.amount as number,
    createdAt: row.created_at as string,
  };
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function createRollover(db: DatabaseAdapter, input: RolloverInsert): RolloverRow {
  const id = generateId();
  const now = new Date().toISOString();

  db.execute(
    `INSERT INTO budget_rollovers (id, category_id, from_month, to_month, amount, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.categoryId, input.fromMonth, input.toMonth, input.amount, now],
  );

  return {
    id,
    categoryId: input.categoryId,
    fromMonth: input.fromMonth,
    toMonth: input.toMonth,
    amount: input.amount,
    createdAt: now,
  };
}

export function getRollover(db: DatabaseAdapter, id: string): RolloverRow | null {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM budget_rollovers WHERE id = ?`,
    [id],
  );
  if (rows.length === 0) return null;
  return rowToRollover(rows[0]);
}

export function listRollovers(db: DatabaseAdapter): RolloverRow[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM budget_rollovers ORDER BY created_at DESC`,
  );
  return rows.map(rowToRollover);
}

export function getRolloversByMonth(db: DatabaseAdapter, toMonth: string): RolloverRow[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM budget_rollovers WHERE to_month = ? ORDER BY category_id`,
    [toMonth],
  );
  return rows.map(rowToRollover);
}

export function getRolloversByCategory(db: DatabaseAdapter, categoryId: string): RolloverRow[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM budget_rollovers WHERE category_id = ? ORDER BY from_month DESC`,
    [categoryId],
  );
  return rows.map(rowToRollover);
}

export function deleteRollover(db: DatabaseAdapter, id: string): void {
  db.execute(`DELETE FROM budget_rollovers WHERE id = ?`, [id]);
}

export function deleteRolloversByMonth(db: DatabaseAdapter, fromMonth: string): void {
  db.execute(`DELETE FROM budget_rollovers WHERE from_month = ?`, [fromMonth]);
}
