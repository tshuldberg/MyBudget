'use server';

import { getDb } from './db';
import {
  estimateMonthlyIncome,
  detectPaydays,
  predictNextPayday,
} from '@mybudget/shared';
import type { IncomeEstimate, PaydayPattern, PaydayPrediction } from '@mybudget/shared';

/** Fetch estimated monthly income from transaction history */
export async function fetchIncomeEstimate(months = 6): Promise<IncomeEstimate> {
  const db = getDb();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months, 1);
  const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;

  const rows = db.query<{ date: string; payee: string; amount: number }>(
    `SELECT date, payee, amount FROM transactions
     WHERE amount > 0 AND is_transfer = 0 AND date >= ?
     ORDER BY date DESC`,
    [startStr],
  );

  return estimateMonthlyIncome(rows);
}

/** Detect payday patterns and predict next payday */
export async function fetchPaydayPrediction(months = 6): Promise<{ pattern: PaydayPattern; prediction: PaydayPrediction } | null> {
  const db = getDb();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months, 1);
  const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;

  const rows = db.query<{ date: string; payee: string; amount: number }>(
    `SELECT date, payee, amount FROM transactions
     WHERE amount > 0 AND is_transfer = 0 AND date >= ?
     ORDER BY date ASC`,
    [startStr],
  );

  const patterns = detectPaydays(rows);
  if (patterns.length === 0) return null;

  // Use the highest-confidence pattern
  const best = patterns.sort((a, b) => b.confidence - a.confidence)[0];
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const prediction = predictNextPayday(best, today);

  return { pattern: best, prediction };
}
