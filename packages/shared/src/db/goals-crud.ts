/**
 * Goals CRUD operations.
 *
 * Goals track savings targets with progress toward a target amount.
 * Each goal links to a category and supports target dates, notes, and
 * active/inactive states.
 *
 * All amounts stored as integer cents.
 */

import type { DatabaseAdapter } from './migrations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GoalRow {
  id: string;
  categoryId: string | null;
  name: string;
  targetAmount: number;      // cents
  currentAmount: number;     // cents
  targetDate: string | null; // YYYY-MM-DD
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GoalInsert {
  categoryId: string | null;
  name: string;
  targetAmount: number;       // cents
  targetDate: string | null;
  notes: string | null;
}

export interface GoalUpdate {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  targetDate?: string | null;
  notes?: string | null;
  categoryId?: string | null;
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;

function generateId(): string {
  _idCounter++;
  return `goal-${Date.now()}-${_idCounter}`;
}

function rowToGoal(row: Record<string, unknown>): GoalRow {
  return {
    id: row.id as string,
    categoryId: (row.category_id as string) ?? null,
    name: row.name as string,
    targetAmount: row.target_amount as number,
    currentAmount: row.current_amount as number,
    targetDate: (row.target_date as string) ?? null,
    notes: (row.notes as string) ?? null,
    isActive: row.is_active === 1 || row.is_active === true,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function createGoal(db: DatabaseAdapter, input: GoalInsert): GoalRow {
  if (!input.name || input.name.trim() === '') {
    throw new Error('Goal name must be non-empty');
  }
  if (input.targetAmount <= 0) {
    throw new Error('Target amount must be positive');
  }

  const id = generateId();
  const now = new Date().toISOString();

  db.execute(
    `INSERT INTO goals (id, category_id, name, target_amount, current_amount, target_date, notes, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.categoryId ?? null, input.name, input.targetAmount, 0, input.targetDate ?? null, input.notes ?? null, 1, now, now],
  );

  return {
    id,
    categoryId: input.categoryId ?? null,
    name: input.name,
    targetAmount: input.targetAmount,
    currentAmount: 0,
    targetDate: input.targetDate ?? null,
    notes: input.notes ?? null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function getGoal(db: DatabaseAdapter, id: string): GoalRow | null {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM goals WHERE id = ?`,
    [id],
  );
  if (rows.length === 0) return null;
  return rowToGoal(rows[0]);
}

export function listGoals(db: DatabaseAdapter): GoalRow[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM goals ORDER BY created_at DESC`,
  );
  return rows.map(rowToGoal);
}

export function updateGoal(db: DatabaseAdapter, id: string, updates: GoalUpdate): void {
  // Verify goal exists
  const existing = getGoal(db, id);
  if (!existing) throw new Error(`Goal not found: ${id}`);

  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.targetAmount !== undefined) {
    fields.push('target_amount = ?');
    values.push(updates.targetAmount);
  }
  if (updates.currentAmount !== undefined) {
    fields.push('current_amount = ?');
    values.push(updates.currentAmount);
  }
  if (updates.targetDate !== undefined) {
    fields.push('target_date = ?');
    values.push(updates.targetDate);
  }
  if (updates.notes !== undefined) {
    fields.push('notes = ?');
    values.push(updates.notes);
  }
  if (updates.categoryId !== undefined) {
    fields.push('category_id = ?');
    values.push(updates.categoryId);
  }
  if (updates.isActive !== undefined) {
    fields.push('is_active = ?');
    values.push(updates.isActive ? 1 : 0);
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

export function getGoalsByCategory(db: DatabaseAdapter, categoryId: string): GoalRow[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM goals WHERE category_id = ? ORDER BY created_at DESC`,
    [categoryId],
  );
  return rows.map(rowToGoal);
}

export function getActiveGoals(db: DatabaseAdapter): GoalRow[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM goals WHERE is_active = ? ORDER BY created_at DESC`,
    [1],
  );
  return rows.map(rowToGoal);
}
