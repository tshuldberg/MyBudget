'use server';

import { getDb } from './db';
import {
  createPlan as _createPlan,
  listPlans as _listPlans,
  deletePlan as _deletePlan,
  createDebt as _createDebt,
  listDebtsByPlan as _listDebtsByPlan,
  deleteDebt as _deleteDebt,
  calculateSnowball,
  calculateAvalanche,
} from '@mybudget/shared';
import type {
  DebtPayoffPlanRow,
  DebtPayoffDebtRow,
  DebtPayoffResult,
  DebtInput,
} from '@mybudget/shared';
import { randomUUID } from 'crypto';

export async function fetchDebtPayoffPlans(): Promise<Array<DebtPayoffPlanRow & { debts: DebtPayoffDebtRow[] }>> {
  const db = getDb();
  const plans = _listPlans(db);
  return plans.map((plan) => ({
    ...plan,
    debts: _listDebtsByPlan(db, plan.id),
  }));
}

export async function createDebtPayoffPlan(
  name: string,
  strategy: 'snowball' | 'avalanche',
): Promise<DebtPayoffPlanRow> {
  return _createPlan(getDb(), randomUUID(), { name, strategy });
}

export async function addDebtToPlan(
  planId: string,
  name: string,
  balance: number,
  interestRate: number,
  minimumPayment: number,
  compounding: 'monthly' | 'daily',
): Promise<DebtPayoffDebtRow> {
  return _createDebt(getDb(), randomUUID(), {
    plan_id: planId,
    name,
    balance,
    interest_rate: interestRate,
    minimum_payment: minimumPayment,
    compounding,
  });
}

export async function deleteDebtFromPlan(debtId: string): Promise<void> {
  _deleteDebt(getDb(), debtId);
}

export async function deleteDebtPayoffPlan(planId: string): Promise<void> {
  _deletePlan(getDb(), planId);
}

export async function calculatePayoffProjection(
  planId: string,
  extraPayment: number,
): Promise<DebtPayoffResult> {
  const db = getDb();
  const debts = _listDebtsByPlan(db, planId);
  const plans = _listPlans(db);
  const plan = plans.find((p) => p.id === planId);
  const strategy = plan?.strategy ?? 'snowball';

  const debtInputs: DebtInput[] = debts.map((d) => ({
    id: d.id,
    name: d.name,
    balance: d.balance,
    interestRate: d.interest_rate,
    minimumPayment: d.minimum_payment,
    compounding: d.compounding as 'monthly' | 'daily',
  }));

  if (strategy === 'avalanche') {
    return calculateAvalanche(debtInputs, extraPayment);
  }
  return calculateSnowball(debtInputs, extraPayment);
}
