/**
 * Reporting engine for MyBudget.
 *
 * Pure query functions that aggregate transaction and budget data for
 * the Reports tab. Powers spending breakdowns, trend charts, budget
 * vs actual comparisons, and top payee lists.
 *
 * All amounts in integer cents.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TransactionInput {
  id: string;
  date: string;
  payee: string;
  amount: number;       // negative = outflow, positive = inflow
  categoryId: string | null;
  isTransfer?: boolean;
}

interface SplitInput {
  transactionId: string;
  categoryId: string | null;
  amount: number;       // negative = outflow, positive = inflow
}

interface CategoryInput {
  id: string;
  name: string;
  groupId: string;
  emoji: string | null;
}

interface AllocationInput {
  categoryId: string;
  allocated: number;    // cents
}

interface ActivityInput {
  categoryId: string;
  activity: number;     // cents (negative = outflow)
}

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  emoji: string | null;
  groupId: string;
  totalSpent: number;      // positive cents (absolute value of outflows)
  transactionCount: number;
  percentOfTotal: number;  // 0-100
}

export interface MonthlySpendingPoint {
  month: string;           // YYYY-MM
  totalSpent: number;      // positive cents
  totalIncome: number;     // positive cents
}

export interface BudgetVsSpentRow {
  categoryId: string;
  categoryName: string;
  budgeted: number;        // cents
  spent: number;           // positive cents (absolute outflows)
  remaining: number;       // budgeted - spent (can be negative)
  percentUsed: number;     // 0-100+
}

export interface TopPayee {
  payee: string;
  totalSpent: number;      // positive cents
  transactionCount: number;
}

export interface DateRange {
  start: string;  // YYYY-MM-DD
  end: string;    // YYYY-MM-DD
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Group spending by category within a date range.
 * Splits take priority over the transaction's top-level category.
 * Transfers are excluded. Only outflows (negative amounts) are counted.
 */
export function getSpendingByCategory(
  transactions: TransactionInput[],
  splits: SplitInput[],
  categories: CategoryInput[],
  dateRange: DateRange,
): CategorySpending[] {
  const categoryMap = new Map<string, CategoryInput>();
  for (const cat of categories) {
    categoryMap.set(cat.id, cat);
  }

  // Build a set of transaction IDs that have splits
  const splitsByTxn = new Map<string, SplitInput[]>();
  for (const split of splits) {
    const list = splitsByTxn.get(split.transactionId) ?? [];
    list.push(split);
    splitsByTxn.set(split.transactionId, list);
  }

  // Accumulate spending per category
  const spending = new Map<string, { total: number; count: number }>();

  for (const txn of transactions) {
    if (txn.isTransfer) continue;
    if (txn.date < dateRange.start || txn.date > dateRange.end) continue;

    const txnSplits = splitsByTxn.get(txn.id);
    if (txnSplits && txnSplits.length > 0) {
      // Use splits for categorization
      for (const split of txnSplits) {
        if (split.amount >= 0) continue; // only outflows
        const catId = split.categoryId ?? 'uncategorized';
        const entry = spending.get(catId) ?? { total: 0, count: 0 };
        entry.total += Math.abs(split.amount);
        entry.count += 1;
        spending.set(catId, entry);
      }
    } else {
      // No splits, use transaction-level category
      if (txn.amount >= 0) continue; // only outflows
      const catId = txn.categoryId ?? 'uncategorized';
      const entry = spending.get(catId) ?? { total: 0, count: 0 };
      entry.total += Math.abs(txn.amount);
      entry.count += 1;
      spending.set(catId, entry);
    }
  }

  // Calculate grand total for percentage
  let grandTotal = 0;
  for (const entry of spending.values()) {
    grandTotal += entry.total;
  }

  // Build result
  const result: CategorySpending[] = [];
  for (const [catId, entry] of spending) {
    const cat = categoryMap.get(catId);
    result.push({
      categoryId: catId,
      categoryName: cat?.name ?? 'Uncategorized',
      emoji: cat?.emoji ?? null,
      groupId: cat?.groupId ?? '',
      totalSpent: entry.total,
      transactionCount: entry.count,
      percentOfTotal: grandTotal > 0 ? Math.round((entry.total / grandTotal) * 100) : 0,
    });
  }

  // Sort by totalSpent descending
  result.sort((a, b) => b.totalSpent - a.totalSpent);

  return result;
}

/**
 * Calculate monthly spending trend over N months.
 * Returns one data point per month with total outflows and inflows.
 * Transfers are excluded.
 */
export function getMonthlySpendingTrend(
  transactions: TransactionInput[],
  months: number,
): MonthlySpendingPoint[] {
  if (transactions.length === 0 || months <= 0) return [];

  // Build per-month totals
  const monthMap = new Map<string, { spent: number; income: number }>();

  for (const txn of transactions) {
    if (txn.isTransfer) continue;
    const month = txn.date.slice(0, 7); // YYYY-MM
    const entry = monthMap.get(month) ?? { spent: 0, income: 0 };
    if (txn.amount < 0) {
      entry.spent += Math.abs(txn.amount);
    } else {
      entry.income += txn.amount;
    }
    monthMap.set(month, entry);
  }

  // Sort by month and take last N
  const allMonths = Array.from(monthMap.keys()).sort();
  const recentMonths = allMonths.slice(-months);

  return recentMonths.map((month) => {
    const entry = monthMap.get(month)!;
    return {
      month,
      totalSpent: entry.spent,
      totalIncome: entry.income,
    };
  });
}

/**
 * Compare budgeted amounts vs actual spending for a given month.
 * Activity values are expected as negative for outflows.
 */
export function getBudgetedVsSpent(
  allocations: AllocationInput[],
  activity: ActivityInput[],
  categories: CategoryInput[],
): BudgetVsSpentRow[] {
  const categoryMap = new Map<string, CategoryInput>();
  for (const cat of categories) {
    categoryMap.set(cat.id, cat);
  }

  const activityMap = new Map<string, number>();
  for (const a of activity) {
    activityMap.set(a.categoryId, a.activity);
  }

  const result: BudgetVsSpentRow[] = [];

  for (const alloc of allocations) {
    const cat = categoryMap.get(alloc.categoryId);
    const rawActivity = activityMap.get(alloc.categoryId) ?? 0;
    const spent = Math.abs(Math.min(0, rawActivity)); // only outflows as positive
    const remaining = alloc.allocated - spent;
    const percentUsed = alloc.allocated > 0
      ? Math.round((spent / alloc.allocated) * 100)
      : (spent > 0 ? 100 : 0);

    result.push({
      categoryId: alloc.categoryId,
      categoryName: cat?.name ?? 'Unknown',
      budgeted: alloc.allocated,
      spent,
      remaining,
      percentUsed,
    });
  }

  // Sort by percentUsed descending (most-spent categories first)
  result.sort((a, b) => b.percentUsed - a.percentUsed);

  return result;
}

/**
 * Get top payees by total spend (outflows only).
 * Transfers are excluded.
 */
export function getTopPayees(
  transactions: TransactionInput[],
  limit: number,
): TopPayee[] {
  const payeeMap = new Map<string, { total: number; count: number }>();

  for (const txn of transactions) {
    if (txn.isTransfer) continue;
    if (txn.amount >= 0) continue; // only outflows

    const entry = payeeMap.get(txn.payee) ?? { total: 0, count: 0 };
    entry.total += Math.abs(txn.amount);
    entry.count += 1;
    payeeMap.set(txn.payee, entry);
  }

  const result: TopPayee[] = [];
  for (const [payee, entry] of payeeMap) {
    result.push({
      payee,
      totalSpent: entry.total,
      transactionCount: entry.count,
    });
  }

  result.sort((a, b) => b.totalSpent - a.totalSpent);

  return result.slice(0, limit);
}
