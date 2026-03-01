/**
 * Budget alerts and alert history CRUD operations.
 *
 * Alerts configure per-category spending thresholds.
 * Alert history tracks when alerts have been fired to prevent duplicates.
 *
 * All amounts stored as integer cents.
 */

import type { DatabaseAdapter } from './migrations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AlertRow {
  id: string;
  categoryId: string;
  thresholdPct: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AlertInsert {
  categoryId: string;
  thresholdPct: number;
}

export interface AlertUpdate {
  thresholdPct?: number;
  isEnabled?: boolean;
}

export interface AlertHistoryRow {
  id: string;
  alertId: string;
  categoryId: string;
  month: string;
  thresholdPct: number;
  spentPct: number;
  amountSpent: number;  // cents
  targetAmount: number; // cents
  notifiedAt: string;
}

export interface AlertHistoryInsert {
  alertId: string;
  categoryId: string;
  month: string;
  thresholdPct: number;
  spentPct: number;
  amountSpent: number;
  targetAmount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;

function generateId(prefix: string): string {
  _idCounter++;
  return `${prefix}-${Date.now()}-${_idCounter}`;
}

function rowToAlert(row: Record<string, unknown>): AlertRow {
  return {
    id: row.id as string,
    categoryId: row.category_id as string,
    thresholdPct: row.threshold_pct as number,
    isEnabled: row.is_enabled === 1 || row.is_enabled === true,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToAlertHistory(row: Record<string, unknown>): AlertHistoryRow {
  return {
    id: row.id as string,
    alertId: row.alert_id as string,
    categoryId: row.category_id as string,
    month: row.month as string,
    thresholdPct: row.threshold_pct as number,
    spentPct: row.spent_pct as number,
    amountSpent: row.amount_spent as number,
    targetAmount: row.target_amount as number,
    notifiedAt: row.notified_at as string,
  };
}

// ---------------------------------------------------------------------------
// Alert CRUD
// ---------------------------------------------------------------------------

export function createAlert(db: DatabaseAdapter, input: AlertInsert): AlertRow {
  if (input.thresholdPct <= 0 || input.thresholdPct > 100) {
    throw new Error('Threshold percentage must be between 1 and 100');
  }

  const id = generateId('alert');
  const now = new Date().toISOString();

  db.execute(
    `INSERT INTO budget_alerts (id, category_id, threshold_pct, is_enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.categoryId, input.thresholdPct, 1, now, now],
  );

  return {
    id,
    categoryId: input.categoryId,
    thresholdPct: input.thresholdPct,
    isEnabled: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function getAlert(db: DatabaseAdapter, id: string): AlertRow | null {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM budget_alerts WHERE id = ?`,
    [id],
  );
  if (rows.length === 0) return null;
  return rowToAlert(rows[0]);
}

export function listAlerts(db: DatabaseAdapter): AlertRow[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM budget_alerts ORDER BY created_at DESC`,
  );
  return rows.map(rowToAlert);
}

export function getAlertsByCategory(db: DatabaseAdapter, categoryId: string): AlertRow[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM budget_alerts WHERE category_id = ? ORDER BY threshold_pct`,
    [categoryId],
  );
  return rows.map(rowToAlert);
}

export function updateAlert(db: DatabaseAdapter, id: string, updates: AlertUpdate): void {
  const existing = getAlert(db, id);
  if (!existing) throw new Error(`Alert not found: ${id}`);

  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.thresholdPct !== undefined) {
    if (updates.thresholdPct <= 0 || updates.thresholdPct > 100) {
      throw new Error('Threshold percentage must be between 1 and 100');
    }
    fields.push('threshold_pct = ?');
    values.push(updates.thresholdPct);
  }
  if (updates.isEnabled !== undefined) {
    fields.push('is_enabled = ?');
    values.push(updates.isEnabled ? 1 : 0);
  }

  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.execute(
    `UPDATE budget_alerts SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );
}

export function deleteAlert(db: DatabaseAdapter, id: string): void {
  db.execute(`DELETE FROM budget_alerts WHERE id = ?`, [id]);
}

// ---------------------------------------------------------------------------
// Alert History CRUD
// ---------------------------------------------------------------------------

export function createAlertHistory(db: DatabaseAdapter, input: AlertHistoryInsert): AlertHistoryRow {
  const id = generateId('ah');
  const now = new Date().toISOString();

  db.execute(
    `INSERT INTO alert_history (id, alert_id, category_id, month, threshold_pct, spent_pct, amount_spent, target_amount, notified_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.alertId, input.categoryId, input.month, input.thresholdPct, input.spentPct, input.amountSpent, input.targetAmount, now],
  );

  return {
    id,
    alertId: input.alertId,
    categoryId: input.categoryId,
    month: input.month,
    thresholdPct: input.thresholdPct,
    spentPct: input.spentPct,
    amountSpent: input.amountSpent,
    targetAmount: input.targetAmount,
    notifiedAt: now,
  };
}

export function getAlertHistory(db: DatabaseAdapter, alertId: string): AlertHistoryRow[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM alert_history WHERE alert_id = ? ORDER BY notified_at DESC`,
    [alertId],
  );
  return rows.map(rowToAlertHistory);
}

export function getAlertHistoryByMonth(db: DatabaseAdapter, month: string): AlertHistoryRow[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM alert_history WHERE month = ? ORDER BY notified_at DESC`,
    [month],
  );
  return rows.map(rowToAlertHistory);
}

export function deleteAlertHistory(db: DatabaseAdapter, id: string): void {
  db.execute(`DELETE FROM alert_history WHERE id = ?`, [id]);
}
