'use server';

import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';

type AccountType = 'cash' | 'checking' | 'savings' | 'credit' | 'other';
type TransactionDirection = 'inflow' | 'outflow' | 'transfer';

interface EnvelopeRow {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  monthly_budget: number;
  rollover_enabled: number;
  archived: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface AccountRow {
  id: string;
  name: string;
  type: AccountType;
  current_balance: number;
  currency: string;
  archived: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface TransactionRow {
  id: string;
  envelope_id: string | null;
  account_id: string | null;
  amount: number;
  direction: TransactionDirection;
  merchant: string | null;
  note: string | null;
  occurred_on: string;
  created_at: string;
  updated_at: string;
}

interface GoalRow {
  id: string;
  envelope_id: string;
  name: string;
  target_amount: number;
  target_date: string | null;
  completed_amount: number;
  is_completed: number;
  created_at: string;
  updated_at: string;
}

export interface EnvelopeInsert {
  name: string;
  icon?: string | null;
  color?: string | null;
  monthly_budget?: number;
  rollover_enabled?: number;
  archived?: number;
  sort_order?: number;
}

export interface EnvelopeUpdate {
  name?: string;
  icon?: string | null;
  color?: string | null;
  monthly_budget?: number;
  rollover_enabled?: number;
  archived?: number;
  sort_order?: number;
}

export interface AccountInsert {
  name: string;
  type?: AccountType;
  current_balance?: number;
  currency?: string;
  archived?: number;
  sort_order?: number;
}

export interface AccountUpdate {
  name?: string;
  type?: AccountType;
  current_balance?: number;
  currency?: string;
  archived?: number;
  sort_order?: number;
}

export interface BudgetTransactionInsert {
  envelope_id?: string | null;
  account_id?: string | null;
  amount: number;
  direction: TransactionDirection;
  merchant?: string | null;
  note?: string | null;
  occurred_on: string;
}

export interface BudgetTransactionUpdate {
  envelope_id?: string | null;
  account_id?: string | null;
  amount?: number;
  direction?: TransactionDirection;
  merchant?: string | null;
  note?: string | null;
  occurred_on?: string;
}

export interface BudgetTransactionFilter {
  envelope_id?: string;
  account_id?: string;
  direction?: TransactionDirection;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export interface BudgetGoalInsert {
  envelope_id: string;
  name: string;
  target_amount: number;
  target_date?: string | null;
  completed_amount?: number;
  is_completed?: number;
}

export interface BudgetGoalUpdate {
  envelope_id?: string;
  name?: string;
  target_amount?: number;
  target_date?: string | null;
  completed_amount?: number;
  is_completed?: number;
}

let sqlite: Database.Database | null = null;

function getDb(): Database.Database {
  if (sqlite) {
    return sqlite;
  }

  const dbPath = resolve(process.cwd(), '.data', 'mybudget-web.sqlite');
  mkdirSync(dirname(dbPath), { recursive: true });

  sqlite = new Database(dbPath);
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('journal_mode = WAL');
  ensureSchema(sqlite);
  seedDefaults(sqlite);

  return sqlite;
}

function ensureSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bg_envelopes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      monthly_budget INTEGER NOT NULL DEFAULT 0,
      rollover_enabled INTEGER NOT NULL DEFAULT 1,
      archived INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bg_accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'checking'
        CHECK (type IN ('cash', 'checking', 'savings', 'credit', 'other')),
      current_balance INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      archived INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bg_transactions (
      id TEXT PRIMARY KEY,
      envelope_id TEXT REFERENCES bg_envelopes(id) ON DELETE SET NULL,
      account_id TEXT REFERENCES bg_accounts(id) ON DELETE SET NULL,
      amount INTEGER NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('inflow', 'outflow', 'transfer')),
      merchant TEXT,
      note TEXT,
      occurred_on TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bg_goals (
      id TEXT PRIMARY KEY,
      envelope_id TEXT NOT NULL REFERENCES bg_envelopes(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      target_amount INTEGER NOT NULL,
      target_date TEXT,
      completed_amount INTEGER NOT NULL DEFAULT 0,
      is_completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS bg_envelopes_archived_idx ON bg_envelopes(archived, sort_order, name);
    CREATE INDEX IF NOT EXISTS bg_accounts_archived_idx ON bg_accounts(archived, sort_order, name);
    CREATE INDEX IF NOT EXISTS bg_transactions_date_idx ON bg_transactions(occurred_on DESC);
    CREATE INDEX IF NOT EXISTS bg_transactions_account_idx ON bg_transactions(account_id);
    CREATE INDEX IF NOT EXISTS bg_transactions_envelope_idx ON bg_transactions(envelope_id);
    CREATE INDEX IF NOT EXISTS bg_goals_envelope_idx ON bg_goals(envelope_id);
  `);
}

function seedDefaults(db: Database.Database): void {
  const now = new Date().toISOString();

  const accountCount = Number(
    (db.prepare('SELECT COUNT(*) as count FROM bg_accounts').get() as { count: number })
      .count,
  );
  if (accountCount === 0) {
    db.prepare(
      `INSERT INTO bg_accounts
        (id, name, type, current_balance, currency, archived, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('acct-checking', 'Checking', 'checking', 250000, 'USD', 0, 0, now, now);
  }

  const envelopeCount = Number(
    (db.prepare('SELECT COUNT(*) as count FROM bg_envelopes').get() as { count: number })
      .count,
  );
  if (envelopeCount === 0) {
    db.prepare(
      `INSERT INTO bg_envelopes
        (id, name, icon, color, monthly_budget, rollover_enabled, archived, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('env-groceries', 'Groceries', '🛒', null, 50000, 1, 0, 0, now, now);
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function run(sql: string, params: unknown[] = []): void {
  getDb().prepare(sql).run(...params);
}

function all<T>(sql: string, params: unknown[] = []): T[] {
  return getDb().prepare(sql).all(...params) as T[];
}

function applyUpdate<T>(
  table: string,
  id: string,
  updates: T,
  allowedFields: readonly (keyof T)[],
): void {
  const updateMap = updates as Record<string, unknown>;
  const setParts: string[] = [];
  const values: unknown[] = [];

  for (const key of allowedFields) {
    const value = updateMap[String(key)];
    if (value === undefined) continue;
    setParts.push(`${String(key)} = ?`);
    values.push(value);
  }

  if (setParts.length === 0) return;

  setParts.push('updated_at = ?');
  values.push(nowIso(), id);
  run(`UPDATE ${table} SET ${setParts.join(', ')} WHERE id = ?`, values);
}

export async function fetchEnvelopes(includeArchived = false): Promise<EnvelopeRow[]> {
  if (includeArchived) {
    return all<EnvelopeRow>(
      'SELECT * FROM bg_envelopes ORDER BY archived ASC, sort_order ASC, name ASC',
    );
  }

  return all<EnvelopeRow>(
    'SELECT * FROM bg_envelopes WHERE archived = 0 ORDER BY sort_order ASC, name ASC',
  );
}

export async function doCreateEnvelope(id: string, input: EnvelopeInsert): Promise<void> {
  const timestamp = nowIso();
  run(
    `INSERT INTO bg_envelopes
      (id, name, icon, color, monthly_budget, rollover_enabled, archived, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.icon ?? null,
      input.color ?? null,
      input.monthly_budget ?? 0,
      input.rollover_enabled ?? 1,
      input.archived ?? 0,
      input.sort_order ?? 0,
      timestamp,
      timestamp,
    ],
  );
}

export async function doUpdateEnvelope(id: string, updates: EnvelopeUpdate): Promise<void> {
  applyUpdate('bg_envelopes', id, updates, [
    'name',
    'icon',
    'color',
    'monthly_budget',
    'rollover_enabled',
    'archived',
    'sort_order',
  ]);
}

export async function doArchiveEnvelope(id: string): Promise<void> {
  await doUpdateEnvelope(id, { archived: 1 });
}

export async function doRestoreEnvelope(id: string): Promise<void> {
  await doUpdateEnvelope(id, { archived: 0 });
}

export async function doDeleteEnvelope(id: string): Promise<void> {
  run('DELETE FROM bg_envelopes WHERE id = ?', [id]);
}

export async function fetchAccounts(includeArchived = false): Promise<AccountRow[]> {
  if (includeArchived) {
    return all<AccountRow>(
      'SELECT * FROM bg_accounts ORDER BY archived ASC, sort_order ASC, name ASC',
    );
  }

  return all<AccountRow>(
    'SELECT * FROM bg_accounts WHERE archived = 0 ORDER BY sort_order ASC, name ASC',
  );
}

export async function doCreateAccount(id: string, input: AccountInsert): Promise<void> {
  const timestamp = nowIso();
  run(
    `INSERT INTO bg_accounts
      (id, name, type, current_balance, currency, archived, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.type ?? 'checking',
      input.current_balance ?? 0,
      input.currency ?? 'USD',
      input.archived ?? 0,
      input.sort_order ?? 0,
      timestamp,
      timestamp,
    ],
  );
}

export async function doUpdateAccount(id: string, updates: AccountUpdate): Promise<void> {
  applyUpdate('bg_accounts', id, updates, [
    'name',
    'type',
    'current_balance',
    'currency',
    'archived',
    'sort_order',
  ]);
}

export async function doArchiveAccount(id: string): Promise<void> {
  await doUpdateAccount(id, { archived: 1 });
}

export async function doRestoreAccount(id: string): Promise<void> {
  await doUpdateAccount(id, { archived: 0 });
}

export async function doDeleteAccount(id: string): Promise<void> {
  run('DELETE FROM bg_accounts WHERE id = ?', [id]);
}

export async function fetchTransactions(
  filters: BudgetTransactionFilter = {},
): Promise<TransactionRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.envelope_id) {
    where.push('envelope_id = ?');
    params.push(filters.envelope_id);
  }
  if (filters.account_id) {
    where.push('account_id = ?');
    params.push(filters.account_id);
  }
  if (filters.direction) {
    where.push('direction = ?');
    params.push(filters.direction);
  }
  if (filters.from_date) {
    where.push('occurred_on >= ?');
    params.push(filters.from_date);
  }
  if (filters.to_date) {
    where.push('occurred_on <= ?');
    params.push(filters.to_date);
  }

  let sql = 'SELECT * FROM bg_transactions';
  if (where.length > 0) {
    sql += ` WHERE ${where.join(' AND ')}`;
  }
  sql += ' ORDER BY occurred_on DESC, created_at DESC';

  if (typeof filters.limit === 'number') {
    sql += ' LIMIT ?';
    params.push(filters.limit);
    if (typeof filters.offset === 'number') {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }
  }

  return all<TransactionRow>(sql, params);
}

export async function doCreateTransaction(
  id: string,
  input: BudgetTransactionInsert,
): Promise<void> {
  const timestamp = nowIso();
  run(
    `INSERT INTO bg_transactions
      (id, envelope_id, account_id, amount, direction, merchant, note, occurred_on, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.envelope_id ?? null,
      input.account_id ?? null,
      input.amount,
      input.direction,
      input.merchant ?? null,
      input.note ?? null,
      input.occurred_on,
      timestamp,
      timestamp,
    ],
  );
}

export async function doUpdateTransaction(
  id: string,
  updates: BudgetTransactionUpdate,
): Promise<void> {
  applyUpdate('bg_transactions', id, updates, [
    'envelope_id',
    'account_id',
    'amount',
    'direction',
    'merchant',
    'note',
    'occurred_on',
  ]);
}

export async function doDeleteTransaction(id: string): Promise<void> {
  run('DELETE FROM bg_transactions WHERE id = ?', [id]);
}

export async function fetchGoals(envelopeId?: string): Promise<GoalRow[]> {
  if (envelopeId) {
    return all<GoalRow>(
      'SELECT * FROM bg_goals WHERE envelope_id = ? ORDER BY created_at DESC',
      [envelopeId],
    );
  }

  return all<GoalRow>('SELECT * FROM bg_goals ORDER BY created_at DESC');
}

export async function doCreateGoal(id: string, input: BudgetGoalInsert): Promise<void> {
  const timestamp = nowIso();
  const completedAmount = input.completed_amount ?? 0;
  const targetAmount = input.target_amount;

  run(
    `INSERT INTO bg_goals
      (id, envelope_id, name, target_amount, target_date, completed_amount, is_completed, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.envelope_id,
      input.name,
      targetAmount,
      input.target_date ?? null,
      completedAmount,
      input.is_completed ?? (completedAmount >= targetAmount ? 1 : 0),
      timestamp,
      timestamp,
    ],
  );
}

export async function doUpdateGoal(id: string, updates: BudgetGoalUpdate): Promise<void> {
  applyUpdate('bg_goals', id, updates, [
    'envelope_id',
    'name',
    'target_amount',
    'target_date',
    'completed_amount',
    'is_completed',
  ]);
}

export async function doDeleteGoal(id: string): Promise<void> {
  run('DELETE FROM bg_goals WHERE id = ?', [id]);
}
