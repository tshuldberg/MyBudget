/**
 * Debt Payoff Plans and Debts CRUD operations.
 *
 * Plans define a repayment strategy (snowball/avalanche) with an extra
 * monthly payment amount. Each plan contains one or more debts with
 * balances, interest rates, and minimum payments.
 *
 * Interest rates stored as basis points (1800 = 18.00% APR).
 * All currency amounts in integer cents.
 */

import type { DatabaseAdapter } from './migrations';

// ---------------------------------------------------------------------------
// Types — Plans
// ---------------------------------------------------------------------------

export interface DebtPayoffPlanRow {
  id: string;
  name: string;
  strategy: 'snowball' | 'avalanche';
  extraPayment: number;     // cents
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DebtPayoffPlanInsert {
  name: string;
  strategy: 'snowball' | 'avalanche';
  extraPayment: number;     // cents
}

export interface DebtPayoffPlanUpdate {
  name?: string;
  strategy?: 'snowball' | 'avalanche';
  extraPayment?: number;
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Types — Debts
// ---------------------------------------------------------------------------

export interface DebtPayoffDebtRow {
  id: string;
  planId: string;
  accountId: string | null;
  name: string;
  balance: number;          // cents
  interestRate: number;     // basis points
  minimumPayment: number;   // cents
  compounding: 'monthly' | 'daily';
  sortOrder: number;
}

export interface DebtPayoffDebtInsert {
  planId: string;
  accountId: string | null;
  name: string;
  balance: number;          // cents
  interestRate: number;     // basis points
  minimumPayment: number;   // cents
  compounding?: 'monthly' | 'daily';
  sortOrder?: number;
}

export interface DebtPayoffDebtUpdate {
  accountId?: string | null;
  name?: string;
  balance?: number;
  interestRate?: number;
  minimumPayment?: number;
  compounding?: 'monthly' | 'daily';
  sortOrder?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _planIdCounter = 0;
let _debtIdCounter = 0;

function generatePlanId(): string {
  _planIdCounter++;
  return `dp-${Date.now()}-${_planIdCounter}`;
}

function generateDebtId(): string {
  _debtIdCounter++;
  return `dd-${Date.now()}-${_debtIdCounter}`;
}

function rowToPlan(row: Record<string, unknown>): DebtPayoffPlanRow {
  return {
    id: row.id as string,
    name: row.name as string,
    strategy: row.strategy as 'snowball' | 'avalanche',
    extraPayment: row.extra_payment as number,
    isActive: row.is_active === 1 || row.is_active === true,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToDebt(row: Record<string, unknown>): DebtPayoffDebtRow {
  return {
    id: row.id as string,
    planId: row.plan_id as string,
    accountId: (row.account_id as string) ?? null,
    name: row.name as string,
    balance: row.balance as number,
    interestRate: row.interest_rate as number,
    minimumPayment: row.minimum_payment as number,
    compounding: row.compounding as 'monthly' | 'daily',
    sortOrder: row.sort_order as number,
  };
}

// ---------------------------------------------------------------------------
// CRUD — Plans
// ---------------------------------------------------------------------------

export function createPlan(
  db: DatabaseAdapter,
  input: DebtPayoffPlanInsert,
): DebtPayoffPlanRow {
  if (!input.name || input.name.trim() === '') {
    throw new Error('Plan name must be non-empty');
  }

  const id = generatePlanId();
  const now = new Date().toISOString();

  db.execute(
    `INSERT INTO debt_payoff_plans (id, name, strategy, extra_payment, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.name, input.strategy, input.extraPayment, 1, now, now],
  );

  return {
    id,
    name: input.name,
    strategy: input.strategy,
    extraPayment: input.extraPayment,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function getPlan(db: DatabaseAdapter, id: string): DebtPayoffPlanRow | null {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM debt_payoff_plans WHERE id = ?`,
    [id],
  );
  if (rows.length === 0) return null;
  return rowToPlan(rows[0]);
}

export function listPlans(db: DatabaseAdapter): DebtPayoffPlanRow[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM debt_payoff_plans ORDER BY created_at DESC`,
  );
  return rows.map(rowToPlan);
}

export function updatePlan(
  db: DatabaseAdapter,
  id: string,
  updates: DebtPayoffPlanUpdate,
): void {
  const existing = getPlan(db, id);
  if (!existing) throw new Error(`Debt payoff plan not found: ${id}`);

  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.strategy !== undefined) {
    fields.push('strategy = ?');
    values.push(updates.strategy);
  }
  if (updates.extraPayment !== undefined) {
    fields.push('extra_payment = ?');
    values.push(updates.extraPayment);
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
    `UPDATE debt_payoff_plans SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );
}

export function deletePlan(db: DatabaseAdapter, id: string): void {
  db.execute(`DELETE FROM debt_payoff_plans WHERE id = ?`, [id]);
}

export function getActivePlans(db: DatabaseAdapter): DebtPayoffPlanRow[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM debt_payoff_plans WHERE is_active = ? ORDER BY created_at DESC`,
    [1],
  );
  return rows.map(rowToPlan);
}

// ---------------------------------------------------------------------------
// CRUD — Debts within Plans
// ---------------------------------------------------------------------------

export function createDebt(
  db: DatabaseAdapter,
  input: DebtPayoffDebtInsert,
): DebtPayoffDebtRow {
  if (!input.name || input.name.trim() === '') {
    throw new Error('Debt name must be non-empty');
  }
  if (input.balance < 0) {
    throw new Error('Debt balance must be non-negative');
  }

  const id = generateDebtId();
  const compounding = input.compounding ?? 'monthly';
  const sortOrder = input.sortOrder ?? 0;

  db.execute(
    `INSERT INTO debt_payoff_debts (id, plan_id, account_id, name, balance, interest_rate, minimum_payment, compounding, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.planId, input.accountId ?? null, input.name, input.balance, input.interestRate, input.minimumPayment, compounding, sortOrder],
  );

  return {
    id,
    planId: input.planId,
    accountId: input.accountId ?? null,
    name: input.name,
    balance: input.balance,
    interestRate: input.interestRate,
    minimumPayment: input.minimumPayment,
    compounding,
    sortOrder,
  };
}

export function getDebt(db: DatabaseAdapter, id: string): DebtPayoffDebtRow | null {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM debt_payoff_debts WHERE id = ?`,
    [id],
  );
  if (rows.length === 0) return null;
  return rowToDebt(rows[0]);
}

export function listDebtsByPlan(db: DatabaseAdapter, planId: string): DebtPayoffDebtRow[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM debt_payoff_debts WHERE plan_id = ? ORDER BY sort_order ASC`,
    [planId],
  );
  return rows.map(rowToDebt);
}

export function updateDebt(
  db: DatabaseAdapter,
  id: string,
  updates: DebtPayoffDebtUpdate,
): void {
  const existing = getDebt(db, id);
  if (!existing) throw new Error(`Debt not found: ${id}`);

  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.accountId !== undefined) {
    fields.push('account_id = ?');
    values.push(updates.accountId);
  }
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.balance !== undefined) {
    fields.push('balance = ?');
    values.push(updates.balance);
  }
  if (updates.interestRate !== undefined) {
    fields.push('interest_rate = ?');
    values.push(updates.interestRate);
  }
  if (updates.minimumPayment !== undefined) {
    fields.push('minimum_payment = ?');
    values.push(updates.minimumPayment);
  }
  if (updates.compounding !== undefined) {
    fields.push('compounding = ?');
    values.push(updates.compounding);
  }
  if (updates.sortOrder !== undefined) {
    fields.push('sort_order = ?');
    values.push(updates.sortOrder);
  }

  if (fields.length === 0) return;

  values.push(id);

  db.execute(
    `UPDATE debt_payoff_debts SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );
}

export function deleteDebt(db: DatabaseAdapter, id: string): void {
  db.execute(`DELETE FROM debt_payoff_debts WHERE id = ?`, [id]);
}
