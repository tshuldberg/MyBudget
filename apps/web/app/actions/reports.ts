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

/** Daily spending for the current month, used for the "Current Spend" line chart */
export async function fetchDailySpending(): Promise<{
  thisMonth: Array<{ day: number; cumulative: number }>;
  lastMonth: Array<{ day: number; cumulative: number }>;
  thisMonthTotal: number;
  lastMonthTotal: number;
  comparison: number; // positive = spent more this month
}> {
  const db = getDb();
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonthNum = now.getMonth();

  // Helper to get daily cumulative spending for a month
  function getDailyForMonth(year: number, month: number) {
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const nextD = new Date(year, month + 1, 1);
    const nextMonth = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}`;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const rows = db.query<{ day: number; total: number }>(
      `SELECT CAST(SUBSTR(date, 9, 2) AS INTEGER) as day,
              COALESCE(SUM(ABS(amount)), 0) as total
       FROM transactions
       WHERE date >= ? AND date < ? AND amount < 0 AND is_transfer = 0
       GROUP BY day ORDER BY day`,
      [`${monthStr}-01`, `${nextMonth}-01`],
    );

    const dailyMap = new Map<number, number>();
    for (const r of rows) dailyMap.set(r.day, r.total);

    const result: Array<{ day: number; cumulative: number }> = [];
    let cumulative = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      cumulative += dailyMap.get(d) ?? 0;
      result.push({ day: d, cumulative });
    }
    return { result, total: cumulative };
  }

  const thisData = getDailyForMonth(thisYear, thisMonthNum);
  const lastDate = new Date(thisYear, thisMonthNum - 1, 1);
  const lastData = getDailyForMonth(lastDate.getFullYear(), lastDate.getMonth());

  return {
    thisMonth: thisData.result,
    lastMonth: lastData.result,
    thisMonthTotal: thisData.total,
    lastMonthTotal: lastData.total,
    comparison: thisData.total - lastData.total,
  };
}

/** Frequent merchants: top payees by transaction count for a given period */
export async function fetchFrequentSpend(month?: string, limit = 5): Promise<Array<{
  payee: string;
  count: number;
  total: number;
  average: number;
}>> {
  const db = getDb();
  const now = new Date();
  const targetMonth = month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const nextD = new Date(parseInt(targetMonth.split('-')[0]), parseInt(targetMonth.split('-')[1]), 1);
  const nextMonth = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}`;

  const rows = db.query<{ payee: string; cnt: number; total: number }>(
    `SELECT payee, COUNT(*) as cnt, COALESCE(SUM(ABS(amount)), 0) as total
     FROM transactions
     WHERE date >= ? AND date < ? AND amount < 0 AND is_transfer = 0 AND payee IS NOT NULL
     GROUP BY payee
     ORDER BY cnt DESC, total DESC
     LIMIT ?`,
    [`${targetMonth}-01`, `${nextMonth}-01`, limit],
  );

  return rows.map((r) => ({
    payee: r.payee,
    count: r.cnt,
    total: r.total,
    average: r.cnt > 0 ? Math.round(r.total / r.cnt) : 0,
  }));
}

/** Spending summary with month-over-month comparison */
export async function fetchSpendingSummary(month?: string): Promise<{
  income: number;
  bills: number;
  spending: number;
  prevIncome: number;
  prevBills: number;
  prevSpending: number;
}> {
  const db = getDb();
  const now = new Date();
  const targetMonth = month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const year = parseInt(targetMonth.split('-')[0]);
  const mon = parseInt(targetMonth.split('-')[1]);
  const prevD = new Date(year, mon - 2, 1);
  const prevMonth = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`;

  function getMonthTotals(m: string) {
    const nextD = new Date(parseInt(m.split('-')[0]), parseInt(m.split('-')[1]), 1);
    const nextM = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}`;

    const incomeRow = db.query<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE date >= ? AND date < ? AND amount > 0 AND is_transfer = 0`,
      [`${m}-01`, `${nextM}-01`],
    );
    const spendingRow = db.query<{ total: number }>(
      `SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM transactions
       WHERE date >= ? AND date < ? AND amount < 0 AND is_transfer = 0`,
      [`${m}-01`, `${nextM}-01`],
    );
    // Bills: transactions linked to subscriptions or recurring templates
    const billsRow = db.query<{ total: number }>(
      `SELECT COALESCE(SUM(ABS(t.amount)), 0) as total
       FROM transactions t
       JOIN transaction_splits ts ON ts.transaction_id = t.id
       JOIN categories c ON c.id = ts.category_id
       WHERE t.date >= ? AND t.date < ? AND t.amount < 0 AND t.is_transfer = 0
       AND (c.name LIKE '%bill%' OR c.name LIKE '%utilit%' OR c.name LIKE '%rent%' OR c.name LIKE '%insurance%')`,
      [`${m}-01`, `${nextM}-01`],
    );

    return {
      income: incomeRow[0]?.total ?? 0,
      spending: spendingRow[0]?.total ?? 0,
      bills: billsRow[0]?.total ?? 0,
    };
  }

  const current = getMonthTotals(targetMonth);
  const prev = getMonthTotals(prevMonth);

  return {
    income: current.income,
    bills: current.bills,
    spending: current.spending,
    prevIncome: prev.income,
    prevBills: prev.bills,
    prevSpending: prev.spending,
  };
}

/** Category spending for a specific category over time (for drill-down) */
export async function fetchCategoryHistory(categoryId: string, months = 12): Promise<Array<{
  month: string;
  total: number;
}>> {
  const db = getDb();
  const results: Array<{ month: string; total: number }> = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const nextD = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const nextMonth = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}`;

    const rows = db.query<{ total: number }>(
      `SELECT COALESCE(SUM(ABS(ts.amount)), 0) as total
       FROM transaction_splits ts
       JOIN transactions t ON t.id = ts.transaction_id
       WHERE ts.category_id = ? AND t.date >= ? AND t.date < ? AND ts.amount < 0`,
      [categoryId, `${month}-01`, `${nextMonth}-01`],
    );
    results.push({ month, total: rows[0]?.total ?? 0 });
  }

  return results;
}

/** Transactions for a specific category in a given month */
export async function fetchCategoryTransactions(categoryId: string, month?: string): Promise<Array<{
  id: string;
  date: string;
  payee: string;
  amount: number;
}>> {
  const db = getDb();
  const now = new Date();
  const targetMonth = month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const nextD = new Date(parseInt(targetMonth.split('-')[0]), parseInt(targetMonth.split('-')[1]), 1);
  const nextMonth = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}`;

  return db.query<{ id: string; date: string; payee: string; amount: number }>(
    `SELECT t.id, t.date, t.payee, t.amount
     FROM transactions t
     JOIN transaction_splits ts ON ts.transaction_id = t.id
     WHERE ts.category_id = ? AND t.date >= ? AND t.date < ?
     ORDER BY t.date DESC`,
    [categoryId, `${targetMonth}-01`, `${nextMonth}-01`],
  );
}
