/**
 * Account CRUD operations.
 * Balance is stored on the account row for quick access but also
 * derivable from transactions (starting balance + sum of amounts).
 */

import type { DatabaseAdapter } from './migrations';
import type { Account, AccountInsert } from '../models/schemas';

export function createAccount(
  db: DatabaseAdapter,
  id: string,
  input: AccountInsert,
): Account {
  const now = new Date().toISOString();
  const balance = input.balance ?? 0;
  const sortOrder = input.sort_order ?? 0;
  const isActive = input.is_active ?? true;

  db.execute(
    `INSERT INTO accounts (id, name, type, balance, sort_order, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.name, input.type, balance, sortOrder, isActive ? 1 : 0, now, now],
  );

  return {
    id,
    name: input.name,
    type: input.type,
    balance,
    sort_order: sortOrder,
    is_active: isActive,
    created_at: now,
    updated_at: now,
  };
}

export function updateAccount(
  db: DatabaseAdapter,
  id: string,
  updates: Partial<Pick<Account, 'name' | 'type' | 'sort_order' | 'is_active'>>,
): void {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.type !== undefined) {
    fields.push('type = ?');
    values.push(updates.type);
  }
  if (updates.sort_order !== undefined) {
    fields.push('sort_order = ?');
    values.push(updates.sort_order);
  }
  if (updates.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(updates.is_active ? 1 : 0);
  }

  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.execute(
    `UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );
}

export function getAccounts(db: DatabaseAdapter): Account[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM accounts WHERE is_active = 1 ORDER BY sort_order, name`,
  );
  return rows.map(rowToAccount);
}

export function getAllAccounts(db: DatabaseAdapter): Account[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM accounts ORDER BY sort_order, name`,
  );
  return rows.map(rowToAccount);
}

export function getAccountById(db: DatabaseAdapter, id: string): Account | null {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM accounts WHERE id = ?`,
    [id],
  );
  if (rows.length === 0) return null;
  return rowToAccount(rows[0]);
}

export function archiveAccount(db: DatabaseAdapter, id: string): void {
  db.execute(
    `UPDATE accounts SET is_active = 0, updated_at = ? WHERE id = ?`,
    [new Date().toISOString(), id],
  );
}

/**
 * Compute account balance from transactions.
 * Returns the stored balance + sum of all transaction amounts for this account.
 */
export function getAccountBalance(db: DatabaseAdapter, accountId: string): number {
  const rows = db.query<{ total: number | null }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE account_id = ?`,
    [accountId],
  );
  return rows[0]?.total ?? 0;
}

/**
 * Update the stored balance on an account (used after transaction changes).
 */
export function updateAccountBalance(db: DatabaseAdapter, accountId: string, balance: number): void {
  db.execute(
    `UPDATE accounts SET balance = ?, updated_at = ? WHERE id = ?`,
    [balance, new Date().toISOString(), accountId],
  );
}

function rowToAccount(row: Record<string, unknown>): Account {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as Account['type'],
    balance: row.balance as number,
    sort_order: row.sort_order as number,
    is_active: row.is_active === 1 || row.is_active === true,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}
