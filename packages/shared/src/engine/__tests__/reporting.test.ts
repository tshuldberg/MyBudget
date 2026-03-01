/**
 * Tests for reporting engine.
 *
 * Validates spending breakdowns, trend calculations, budget vs spent
 * comparisons, and top payee aggregation.
 *
 * All amounts in integer cents.
 */

import { describe, it, expect } from 'vitest';
import {
  getSpendingByCategory,
  getMonthlySpendingTrend,
  getBudgetedVsSpent,
  getTopPayees,
} from '../reporting';

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

function txn(overrides: {
  id: string;
  date: string;
  payee: string;
  amount: number;
  categoryId?: string | null;
  isTransfer?: boolean;
}) {
  return {
    categoryId: null as string | null,
    isTransfer: false,
    ...overrides,
  };
}

const categories = [
  { id: 'cat-food', name: 'Food', groupId: 'grp-1', emoji: '🍕' },
  { id: 'cat-rent', name: 'Rent', groupId: 'grp-2', emoji: '🏠' },
  { id: 'cat-fun', name: 'Entertainment', groupId: 'grp-1', emoji: '🎮' },
];

// ---------------------------------------------------------------------------
// getSpendingByCategory
// ---------------------------------------------------------------------------

describe('getSpendingByCategory', () => {
  it('groups outflows by category', () => {
    const transactions = [
      txn({ id: 't1', date: '2026-02-01', payee: 'Grocery Store', amount: -15000, categoryId: 'cat-food' }),
      txn({ id: 't2', date: '2026-02-05', payee: 'Restaurant', amount: -3500, categoryId: 'cat-food' }),
      txn({ id: 't3', date: '2026-02-10', payee: 'Landlord', amount: -200000, categoryId: 'cat-rent' }),
    ];

    const result = getSpendingByCategory(transactions, [], categories, {
      start: '2026-02-01',
      end: '2026-02-28',
    });

    expect(result).toHaveLength(2);
    expect(result[0].categoryId).toBe('cat-rent');
    expect(result[0].totalSpent).toBe(200000);
    expect(result[0].transactionCount).toBe(1);

    expect(result[1].categoryId).toBe('cat-food');
    expect(result[1].totalSpent).toBe(18500);
    expect(result[1].transactionCount).toBe(2);
  });

  it('uses splits when available', () => {
    const transactions = [
      txn({ id: 't1', date: '2026-02-01', payee: 'Target', amount: -10000 }),
    ];
    const splits = [
      { transactionId: 't1', categoryId: 'cat-food', amount: -6000 },
      { transactionId: 't1', categoryId: 'cat-fun', amount: -4000 },
    ];

    const result = getSpendingByCategory(transactions, splits, categories, {
      start: '2026-02-01',
      end: '2026-02-28',
    });

    expect(result).toHaveLength(2);
    const food = result.find((r) => r.categoryId === 'cat-food')!;
    const fun = result.find((r) => r.categoryId === 'cat-fun')!;
    expect(food.totalSpent).toBe(6000);
    expect(fun.totalSpent).toBe(4000);
  });

  it('excludes transfers', () => {
    const transactions = [
      txn({ id: 't1', date: '2026-02-01', payee: 'Transfer', amount: -50000, isTransfer: true }),
      txn({ id: 't2', date: '2026-02-01', payee: 'Store', amount: -10000, categoryId: 'cat-food' }),
    ];

    const result = getSpendingByCategory(transactions, [], categories, {
      start: '2026-02-01',
      end: '2026-02-28',
    });

    expect(result).toHaveLength(1);
    expect(result[0].totalSpent).toBe(10000);
  });

  it('excludes inflows', () => {
    const transactions = [
      txn({ id: 't1', date: '2026-02-01', payee: 'Employer', amount: 500000, categoryId: 'cat-food' }),
      txn({ id: 't2', date: '2026-02-05', payee: 'Store', amount: -10000, categoryId: 'cat-food' }),
    ];

    const result = getSpendingByCategory(transactions, [], categories, {
      start: '2026-02-01',
      end: '2026-02-28',
    });

    expect(result).toHaveLength(1);
    expect(result[0].totalSpent).toBe(10000);
  });

  it('filters by date range', () => {
    const transactions = [
      txn({ id: 't1', date: '2026-01-15', payee: 'Store', amount: -10000, categoryId: 'cat-food' }),
      txn({ id: 't2', date: '2026-02-15', payee: 'Store', amount: -20000, categoryId: 'cat-food' }),
      txn({ id: 't3', date: '2026-03-15', payee: 'Store', amount: -30000, categoryId: 'cat-food' }),
    ];

    const result = getSpendingByCategory(transactions, [], categories, {
      start: '2026-02-01',
      end: '2026-02-28',
    });

    expect(result).toHaveLength(1);
    expect(result[0].totalSpent).toBe(20000);
  });

  it('returns empty array for no transactions', () => {
    const result = getSpendingByCategory([], [], categories, {
      start: '2026-02-01',
      end: '2026-02-28',
    });
    expect(result).toHaveLength(0);
  });

  it('labels uncategorized transactions', () => {
    const transactions = [
      txn({ id: 't1', date: '2026-02-01', payee: 'Unknown', amount: -5000 }),
    ];

    const result = getSpendingByCategory(transactions, [], categories, {
      start: '2026-02-01',
      end: '2026-02-28',
    });

    expect(result).toHaveLength(1);
    expect(result[0].categoryName).toBe('Uncategorized');
  });

  it('calculates percent of total', () => {
    const transactions = [
      txn({ id: 't1', date: '2026-02-01', payee: 'Store', amount: -75000, categoryId: 'cat-food' }),
      txn({ id: 't2', date: '2026-02-01', payee: 'Landlord', amount: -25000, categoryId: 'cat-rent' }),
    ];

    const result = getSpendingByCategory(transactions, [], categories, {
      start: '2026-02-01',
      end: '2026-02-28',
    });

    expect(result[0].percentOfTotal).toBe(75);
    expect(result[1].percentOfTotal).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// getMonthlySpendingTrend
// ---------------------------------------------------------------------------

describe('getMonthlySpendingTrend', () => {
  it('calculates spending and income per month', () => {
    const transactions = [
      txn({ id: 't1', date: '2026-01-15', payee: 'Employer', amount: 500000 }),
      txn({ id: 't2', date: '2026-01-20', payee: 'Store', amount: -100000 }),
      txn({ id: 't3', date: '2026-02-15', payee: 'Employer', amount: 500000 }),
      txn({ id: 't4', date: '2026-02-20', payee: 'Store', amount: -150000 }),
    ];

    const result = getMonthlySpendingTrend(transactions, 12);
    expect(result).toHaveLength(2);
    expect(result[0].month).toBe('2026-01');
    expect(result[0].totalSpent).toBe(100000);
    expect(result[0].totalIncome).toBe(500000);
    expect(result[1].month).toBe('2026-02');
    expect(result[1].totalSpent).toBe(150000);
  });

  it('limits to N most recent months', () => {
    const transactions = [
      txn({ id: 't1', date: '2025-11-01', payee: 'Store', amount: -10000 }),
      txn({ id: 't2', date: '2025-12-01', payee: 'Store', amount: -20000 }),
      txn({ id: 't3', date: '2026-01-01', payee: 'Store', amount: -30000 }),
      txn({ id: 't4', date: '2026-02-01', payee: 'Store', amount: -40000 }),
    ];

    const result = getMonthlySpendingTrend(transactions, 2);
    expect(result).toHaveLength(2);
    expect(result[0].month).toBe('2026-01');
    expect(result[1].month).toBe('2026-02');
  });

  it('returns empty for no transactions', () => {
    expect(getMonthlySpendingTrend([], 12)).toHaveLength(0);
  });

  it('returns empty for zero months', () => {
    const transactions = [
      txn({ id: 't1', date: '2026-02-01', payee: 'Store', amount: -10000 }),
    ];
    expect(getMonthlySpendingTrend(transactions, 0)).toHaveLength(0);
  });

  it('excludes transfers', () => {
    const transactions = [
      txn({ id: 't1', date: '2026-02-01', payee: 'Transfer', amount: -50000, isTransfer: true }),
      txn({ id: 't2', date: '2026-02-05', payee: 'Store', amount: -10000 }),
    ];

    const result = getMonthlySpendingTrend(transactions, 12);
    expect(result).toHaveLength(1);
    expect(result[0].totalSpent).toBe(10000);
  });
});

// ---------------------------------------------------------------------------
// getBudgetedVsSpent
// ---------------------------------------------------------------------------

describe('getBudgetedVsSpent', () => {
  it('compares budgeted vs actual', () => {
    const allocations = [
      { categoryId: 'cat-food', allocated: 50000 },
      { categoryId: 'cat-rent', allocated: 200000 },
    ];
    const activity = [
      { categoryId: 'cat-food', activity: -35000 },
      { categoryId: 'cat-rent', activity: -200000 },
    ];

    const result = getBudgetedVsSpent(allocations, activity, categories);
    expect(result).toHaveLength(2);

    const rent = result.find((r) => r.categoryId === 'cat-rent')!;
    expect(rent.budgeted).toBe(200000);
    expect(rent.spent).toBe(200000);
    expect(rent.remaining).toBe(0);
    expect(rent.percentUsed).toBe(100);

    const food = result.find((r) => r.categoryId === 'cat-food')!;
    expect(food.budgeted).toBe(50000);
    expect(food.spent).toBe(35000);
    expect(food.remaining).toBe(15000);
    expect(food.percentUsed).toBe(70);
  });

  it('handles overspending (>100%)', () => {
    const allocations = [{ categoryId: 'cat-food', allocated: 30000 }];
    const activity = [{ categoryId: 'cat-food', activity: -50000 }];

    const result = getBudgetedVsSpent(allocations, activity, categories);
    expect(result[0].percentUsed).toBe(167);
    expect(result[0].remaining).toBe(-20000);
  });

  it('handles zero budget', () => {
    const allocations = [{ categoryId: 'cat-food', allocated: 0 }];
    const activity = [{ categoryId: 'cat-food', activity: -10000 }];

    const result = getBudgetedVsSpent(allocations, activity, categories);
    expect(result[0].percentUsed).toBe(100);
  });

  it('handles no activity', () => {
    const allocations = [{ categoryId: 'cat-food', allocated: 50000 }];

    const result = getBudgetedVsSpent(allocations, [], categories);
    expect(result[0].spent).toBe(0);
    expect(result[0].remaining).toBe(50000);
    expect(result[0].percentUsed).toBe(0);
  });

  it('ignores inflow activity', () => {
    const allocations = [{ categoryId: 'cat-food', allocated: 50000 }];
    const activity = [{ categoryId: 'cat-food', activity: 20000 }]; // refund

    const result = getBudgetedVsSpent(allocations, activity, categories);
    expect(result[0].spent).toBe(0); // inflows don't count as spending
    expect(result[0].remaining).toBe(50000);
  });
});

// ---------------------------------------------------------------------------
// getTopPayees
// ---------------------------------------------------------------------------

describe('getTopPayees', () => {
  it('returns top payees by spend', () => {
    const transactions = [
      txn({ id: 't1', date: '2026-02-01', payee: 'Grocery Store', amount: -15000 }),
      txn({ id: 't2', date: '2026-02-05', payee: 'Grocery Store', amount: -12000 }),
      txn({ id: 't3', date: '2026-02-10', payee: 'Coffee Shop', amount: -500 }),
      txn({ id: 't4', date: '2026-02-15', payee: 'Landlord', amount: -200000 }),
    ];

    const result = getTopPayees(transactions, 2);
    expect(result).toHaveLength(2);
    expect(result[0].payee).toBe('Landlord');
    expect(result[0].totalSpent).toBe(200000);
    expect(result[0].transactionCount).toBe(1);
    expect(result[1].payee).toBe('Grocery Store');
    expect(result[1].totalSpent).toBe(27000);
    expect(result[1].transactionCount).toBe(2);
  });

  it('excludes transfers', () => {
    const transactions = [
      txn({ id: 't1', date: '2026-02-01', payee: 'Transfer', amount: -50000, isTransfer: true }),
      txn({ id: 't2', date: '2026-02-01', payee: 'Store', amount: -10000 }),
    ];

    const result = getTopPayees(transactions, 10);
    expect(result).toHaveLength(1);
    expect(result[0].payee).toBe('Store');
  });

  it('excludes inflows', () => {
    const transactions = [
      txn({ id: 't1', date: '2026-02-01', payee: 'Employer', amount: 500000 }),
      txn({ id: 't2', date: '2026-02-01', payee: 'Store', amount: -10000 }),
    ];

    const result = getTopPayees(transactions, 10);
    expect(result).toHaveLength(1);
    expect(result[0].payee).toBe('Store');
  });

  it('returns empty for no outflows', () => {
    expect(getTopPayees([], 5)).toHaveLength(0);
  });

  it('respects the limit', () => {
    const transactions = [
      txn({ id: 't1', date: '2026-02-01', payee: 'A', amount: -10000 }),
      txn({ id: 't2', date: '2026-02-01', payee: 'B', amount: -20000 }),
      txn({ id: 't3', date: '2026-02-01', payee: 'C', amount: -30000 }),
    ];

    const result = getTopPayees(transactions, 1);
    expect(result).toHaveLength(1);
    expect(result[0].payee).toBe('C');
  });
});
