/**
 * Net cash flow calculator.
 *
 * Calculates income minus expenses over time. Powers the Reports tab's
 * cash flow chart and the dashboard "Net Cash" summary widget.
 *
 * All amounts in integer cents.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TransactionInput {
  date: string;
  amount: number;       // negative = outflow, positive = inflow
  accountId?: string;
  categoryId?: string | null;
  isTransfer?: boolean;
}

export interface NetCashResult {
  totalInflows: number;    // cents (sum of positive amounts)
  totalOutflows: number;   // cents (absolute sum of negative amounts)
  netCash: number;         // totalInflows - totalOutflows
}

export interface CashFlowPeriod {
  period: string;          // YYYY-MM for monthly, YYYY-Www for weekly
  inflows: number;         // cents
  outflows: number;        // cents
  netCash: number;         // cents
}

export interface RunningBalanceEntry {
  date: string;
  amount: number;
  balance: number;         // cumulative balance
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isTransfer(txn: TransactionInput): boolean {
  return txn.isTransfer === true;
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  // ISO week calculation
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const dayOfYear = Math.ceil((d.getTime() - jan1.getTime()) / (1000 * 60 * 60 * 24));
  const weekNum = Math.ceil((dayOfYear + jan1.getDay()) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Calculate net cash (inflows minus outflows) from a list of transactions.
 * Transfers are excluded by default.
 */
export function calculateNetCash(transactions: TransactionInput[]): NetCashResult {
  let totalInflows = 0;
  let totalOutflows = 0;

  for (const txn of transactions) {
    if (isTransfer(txn)) continue;

    if (txn.amount > 0) {
      totalInflows += txn.amount;
    } else {
      totalOutflows += Math.abs(txn.amount);
    }
  }

  return {
    totalInflows,
    totalOutflows,
    netCash: totalInflows - totalOutflows,
  };
}

/**
 * Group cash flow by time period (monthly or weekly).
 * Transfers are excluded.
 */
export function calculateCashFlowByPeriod(
  transactions: TransactionInput[],
  grouping: 'monthly' | 'weekly',
): CashFlowPeriod[] {
  if (transactions.length === 0) return [];

  const periodMap = new Map<string, { inflows: number; outflows: number }>();

  for (const txn of transactions) {
    if (isTransfer(txn)) continue;

    const key = grouping === 'monthly'
      ? txn.date.slice(0, 7) // YYYY-MM
      : getWeekKey(txn.date);

    const entry = periodMap.get(key) ?? { inflows: 0, outflows: 0 };

    if (txn.amount > 0) {
      entry.inflows += txn.amount;
    } else {
      entry.outflows += Math.abs(txn.amount);
    }

    periodMap.set(key, entry);
  }

  const periods: CashFlowPeriod[] = [];
  for (const [period, data] of periodMap) {
    periods.push({
      period,
      inflows: data.inflows,
      outflows: data.outflows,
      netCash: data.inflows - data.outflows,
    });
  }

  // Sort chronologically
  periods.sort((a, b) => a.period.localeCompare(b.period));

  return periods;
}

/**
 * Calculate running balance over time from a starting balance.
 * Transactions are sorted by date before calculation.
 */
export function calculateRunningBalance(
  transactions: TransactionInput[],
  startingBalance: number,
): RunningBalanceEntry[] {
  if (transactions.length === 0) return [];

  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  let balance = startingBalance;
  const entries: RunningBalanceEntry[] = [];

  for (const txn of sorted) {
    balance += txn.amount;
    entries.push({
      date: txn.date,
      amount: txn.amount,
      balance,
    });
  }

  return entries;
}
