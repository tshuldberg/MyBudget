/**
 * Net Worth Snapshots CRUD operations.
 *
 * Monthly snapshots of net worth (assets minus liabilities) for
 * trend tracking and chart display in the Reports tab.
 *
 * All amounts stored as integer cents.
 */

import type { DatabaseAdapter } from './migrations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NetWorthSnapshotRow {
  id: string;
  month: string;              // YYYY-MM
  assets: number;             // cents
  liabilities: number;        // cents
  netWorth: number;           // cents
  accountBalances: string | null; // JSON
  createdAt: string;
}

export interface NetWorthSnapshotInsert {
  month: string;              // YYYY-MM
  assets: number;             // cents
  liabilities: number;        // cents
  netWorth: number;           // cents
  accountBalances: string | null;
}

export interface NetWorthSnapshotUpdate {
  assets?: number;
  liabilities?: number;
  netWorth?: number;
  accountBalances?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;

function generateId(): string {
  _idCounter++;
  return `nw-${Date.now()}-${_idCounter}`;
}

function rowToSnapshot(row: Record<string, unknown>): NetWorthSnapshotRow {
  return {
    id: row.id as string,
    month: row.month as string,
    assets: row.assets as number,
    liabilities: row.liabilities as number,
    netWorth: row.net_worth as number,
    accountBalances: (row.account_balances as string) ?? null,
    createdAt: row.created_at as string,
  };
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function createSnapshot(
  db: DatabaseAdapter,
  input: NetWorthSnapshotInsert,
): NetWorthSnapshotRow {
  if (!input.month || !/^\d{4}-\d{2}$/.test(input.month)) {
    throw new Error('Month must be in YYYY-MM format');
  }

  const id = generateId();
  const now = new Date().toISOString();

  db.execute(
    `INSERT INTO net_worth_snapshots (id, month, assets, liabilities, net_worth, account_balances, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.month, input.assets, input.liabilities, input.netWorth, input.accountBalances ?? null, now],
  );

  return {
    id,
    month: input.month,
    assets: input.assets,
    liabilities: input.liabilities,
    netWorth: input.netWorth,
    accountBalances: input.accountBalances ?? null,
    createdAt: now,
  };
}

export function getSnapshot(db: DatabaseAdapter, id: string): NetWorthSnapshotRow | null {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM net_worth_snapshots WHERE id = ?`,
    [id],
  );
  if (rows.length === 0) return null;
  return rowToSnapshot(rows[0]);
}

export function getSnapshotByMonth(db: DatabaseAdapter, month: string): NetWorthSnapshotRow | null {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM net_worth_snapshots WHERE month = ?`,
    [month],
  );
  if (rows.length === 0) return null;
  return rowToSnapshot(rows[0]);
}

export function listSnapshots(db: DatabaseAdapter): NetWorthSnapshotRow[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM net_worth_snapshots ORDER BY month DESC`,
  );
  return rows.map(rowToSnapshot);
}

export function updateSnapshot(
  db: DatabaseAdapter,
  id: string,
  updates: NetWorthSnapshotUpdate,
): void {
  const existing = getSnapshot(db, id);
  if (!existing) throw new Error(`Net worth snapshot not found: ${id}`);

  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.assets !== undefined) {
    fields.push('assets = ?');
    values.push(updates.assets);
  }
  if (updates.liabilities !== undefined) {
    fields.push('liabilities = ?');
    values.push(updates.liabilities);
  }
  if (updates.netWorth !== undefined) {
    fields.push('net_worth = ?');
    values.push(updates.netWorth);
  }
  if (updates.accountBalances !== undefined) {
    fields.push('account_balances = ?');
    values.push(updates.accountBalances);
  }

  if (fields.length === 0) return;

  values.push(id);

  db.execute(
    `UPDATE net_worth_snapshots SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );
}

export function deleteSnapshot(db: DatabaseAdapter, id: string): void {
  db.execute(`DELETE FROM net_worth_snapshots WHERE id = ?`, [id]);
}
