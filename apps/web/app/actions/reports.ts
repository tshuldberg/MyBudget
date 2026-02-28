'use server';

import { getDb } from './db';

export interface MonthlySpending {
  month: string;
  total: number;
}

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  emoji: string | null;
  total: number;
}

export async function fetchMonthlySpending(months = 6): Promise<MonthlySpending[]> {
  const db = getDb();
  const results: MonthlySpending[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const nextD = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const nextMonth = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}`;

    const rows = db.query<{ total: number | null }>(
      `SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM transactions
       WHERE date >= ? AND date < ? AND amount < 0 AND is_transfer = 0`,
      [`${month}-01`, `${nextMonth}-01`],
    );
    results.push({ month, total: rows[0]?.total ?? 0 });
  }

  return results;
}

export async function fetchCategorySpending(month?: string): Promise<CategorySpending[]> {
  const db = getDb();
  const now = new Date();
  const targetMonth = month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const nextD = new Date(parseInt(targetMonth.split('-')[0]), parseInt(targetMonth.split('-')[1]), 1);
  const nextMonth = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}`;

  const rows = db.query<{ category_id: string; category_name: string; emoji: string | null; total: number }>(
    `SELECT ts.category_id, c.name as category_name, c.emoji,
            COALESCE(SUM(ABS(ts.amount)), 0) as total
     FROM transaction_splits ts
     JOIN transactions t ON t.id = ts.transaction_id
     LEFT JOIN categories c ON c.id = ts.category_id
     WHERE t.date >= ? AND t.date < ? AND ts.amount < 0
     GROUP BY ts.category_id
     ORDER BY total DESC`,
    [`${targetMonth}-01`, `${nextMonth}-01`],
  );

  return rows.map((r) => ({
    categoryId: r.category_id,
    categoryName: r.category_name ?? 'Uncategorized',
    emoji: r.emoji,
    total: r.total,
  }));
}

export async function fetchIncomeVsExpense(months = 6): Promise<Array<{
  month: string;
  income: number;
  expense: number;
}>> {
  const db = getDb();
  const results: Array<{ month: string; income: number; expense: number }> = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const nextD = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const nextMonth = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}`;

    const incomeRows = db.query<{ total: number | null }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE date >= ? AND date < ? AND amount > 0 AND is_transfer = 0`,
      [`${month}-01`, `${nextMonth}-01`],
    );
    const expenseRows = db.query<{ total: number | null }>(
      `SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM transactions
       WHERE date >= ? AND date < ? AND amount < 0 AND is_transfer = 0`,
      [`${month}-01`, `${nextMonth}-01`],
    );

    results.push({
      month,
      income: incomeRows[0]?.total ?? 0,
      expense: expenseRows[0]?.total ?? 0,
    });
  }

  return results;
}

export async function fetchNetWorthHistory(months = 12): Promise<Array<{
  month: string;
  netWorth: number;
}>> {
  const db = getDb();
  const accounts = db.query<{ balance: number; type: string }>(
    `SELECT balance, type FROM accounts WHERE is_active = 1`,
  );
  let currentNetWorth = 0;
  for (const a of accounts) {
    if (a.type === 'credit_card') {
      currentNetWorth -= Math.abs(a.balance);
    } else {
      currentNetWorth += a.balance;
    }
  }

  // Build a simple estimate: current net worth is the latest point
  const results: Array<{ month: string; netWorth: number }> = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    // Simplified: just use current net worth as baseline
    results.push({ month, netWorth: currentNetWorth });
  }

  return results;
}
