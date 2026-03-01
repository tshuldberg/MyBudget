/**
 * Goal CRUD operations.
 * Goals track savings targets with progress toward a target amount.
 * All amounts stored as integer cents.
 */

import type { DatabaseAdapter } from './migrations';
import type { Goal, GoalInsert } from '../models/schemas';

export function createGoal(
  db: DatabaseAdapter,
  id: string,
  input: GoalInsert,
): Goal {
  const now = new Date().toISOString();
  const currentAmountCents = input.current_amount_cents ?? 0;
  const targetDate = input.target_date ?? null;
  const categoryId = input.category_id ?? null;

  db.execute(
    `INSERT INTO goals (id, name, target_amount_cents, current_amount_cents, target_date, category_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.name, input.target_amount_cents, currentAmountCents, targetDate, categoryId, now, now],
  );

  return {
    id,
    name: input.name,
    target_amount_cents: input.target_amount_cents,
    current_amount_cents: currentAmountCents,
    target_date: targetDate,
    category_id: categoryId,
    created_at: now,
    updated_at: now,
  };
}

export function updateGoal(
  db: DatabaseAdapter,
  id: string,
  updates: Partial<Pick<Goal, 'name' | 'target_amount_cents' | 'current_amount_cents' | 'target_date' | 'category_id'>>,
): void {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.target_amount_cents !== undefined) {
    fields.push('target_amount_cents = ?');
    values.push(updates.target_amount_cents);
  }
  if (updates.current_amount_cents !== undefined) {
    fields.push('current_amount_cents = ?');
    values.push(updates.current_amount_cents);
  }
  if (updates.target_date !== undefined) {
    fields.push('target_date = ?');
    values.push(updates.target_date);
  }
  if (updates.category_id !== undefined) {
    fields.push('category_id = ?');
    values.push(updates.category_id);
  }

  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.execute(
    `UPDATE goals SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );
}

export function deleteGoal(db: DatabaseAdapter, id: string): void {
  db.execute(`DELETE FROM goals WHERE id = ?`, [id]);
}

export function getGoals(db: DatabaseAdapter): Goal[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM goals ORDER BY created_at DESC`,
  );
  return rows.map(rowToGoal);
}

export function getGoalById(db: DatabaseAdapter, id: string): Goal | null {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM goals WHERE id = ?`,
    [id],
  );
  if (rows.length === 0) return null;
  return rowToGoal(rows[0]);
}

export function getGoalsByCategory(db: DatabaseAdapter, categoryId: string): Goal[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM goals WHERE category_id = ? ORDER BY created_at DESC`,
    [categoryId],
  );
  return rows.map(rowToGoal);
}

/**
 * Add funds to a goal's current amount.
 * @param amount Positive number of cents to allocate
 */
export function allocateToGoal(
  db: DatabaseAdapter,
  goalId: string,
  amount: number,
): void {
  if (amount <= 0) throw new Error('Allocation amount must be positive');
  db.execute(
    `UPDATE goals SET current_amount_cents = current_amount_cents + ?, updated_at = ? WHERE id = ?`,
    [amount, new Date().toISOString(), goalId],
  );
}

function rowToGoal(row: Record<string, unknown>): Goal {
  return {
    id: row.id as string,
    name: row.name as string,
    target_amount_cents: row.target_amount_cents as number,
    current_amount_cents: row.current_amount_cents as number,
    target_date: (row.target_date as string) ?? null,
    category_id: (row.category_id as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}
