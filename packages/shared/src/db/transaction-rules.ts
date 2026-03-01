/**
 * Transaction rule CRUD operations.
 * Rules auto-categorize transactions based on payee pattern matching.
 */

import type { DatabaseAdapter } from './migrations';
import type { TransactionRule, TransactionRuleInsert } from '../models/schemas';

export function createTransactionRule(
  db: DatabaseAdapter,
  id: string,
  input: TransactionRuleInsert,
): TransactionRule {
  const now = new Date().toISOString();
  const isEnabled = input.is_enabled ?? true;
  const priority = input.priority ?? 0;

  db.execute(
    `INSERT INTO transaction_rules (id, payee_pattern, match_type, category_id, is_enabled, priority, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.payee_pattern, input.match_type, input.category_id, isEnabled ? 1 : 0, priority, now],
  );

  return {
    id,
    payee_pattern: input.payee_pattern,
    match_type: input.match_type,
    category_id: input.category_id,
    is_enabled: isEnabled,
    priority,
    created_at: now,
  };
}

export function updateTransactionRule(
  db: DatabaseAdapter,
  id: string,
  updates: Partial<Pick<TransactionRule, 'payee_pattern' | 'match_type' | 'category_id' | 'is_enabled' | 'priority'>>,
): void {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.payee_pattern !== undefined) {
    fields.push('payee_pattern = ?');
    values.push(updates.payee_pattern);
  }
  if (updates.match_type !== undefined) {
    fields.push('match_type = ?');
    values.push(updates.match_type);
  }
  if (updates.category_id !== undefined) {
    fields.push('category_id = ?');
    values.push(updates.category_id);
  }
  if (updates.is_enabled !== undefined) {
    fields.push('is_enabled = ?');
    values.push(updates.is_enabled ? 1 : 0);
  }
  if (updates.priority !== undefined) {
    fields.push('priority = ?');
    values.push(updates.priority);
  }

  if (fields.length === 0) return;
  values.push(id);

  db.execute(
    `UPDATE transaction_rules SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );
}

export function deleteTransactionRule(db: DatabaseAdapter, id: string): void {
  db.execute(`DELETE FROM transaction_rules WHERE id = ?`, [id]);
}

export function getTransactionRules(db: DatabaseAdapter): TransactionRule[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM transaction_rules ORDER BY priority ASC, created_at ASC`,
  );
  return rows.map(rowToRule);
}

export function getEnabledTransactionRules(db: DatabaseAdapter): TransactionRule[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM transaction_rules WHERE is_enabled = 1 ORDER BY priority ASC, created_at ASC`,
  );
  return rows.map(rowToRule);
}

export function getTransactionRuleById(db: DatabaseAdapter, id: string): TransactionRule | null {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM transaction_rules WHERE id = ?`,
    [id],
  );
  if (rows.length === 0) return null;
  return rowToRule(rows[0]);
}

function rowToRule(row: Record<string, unknown>): TransactionRule {
  return {
    id: row.id as string,
    payee_pattern: row.payee_pattern as string,
    match_type: row.match_type as TransactionRule['match_type'],
    category_id: row.category_id as string,
    is_enabled: row.is_enabled === 1 || row.is_enabled === true,
    priority: row.priority as number,
    created_at: row.created_at as string,
  };
}
