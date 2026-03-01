/**
 * TDD tests for net cash calculation engine.
 *
 * Net cash flow shows the user their real financial picture: income minus
 * expenses over a time period. This powers the Reports tab's cash flow
 * chart and the dashboard "Net Cash" summary widget.
 *
 * All amounts in integer cents.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateNetCash,
  calculateCashFlowByPeriod,
  calculateRunningBalance,
  type NetCashResult,
  type CashFlowPeriod,
} from '../net-cash';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

interface TransactionInput {
  date: string;
  amount: number; // negative = outflow, positive = inflow
  accountId?: string;
  categoryId?: string | null;
  isTransfer?: boolean;
}

function txn(input: TransactionInput): TransactionInput {
  return {
    accountId: 'acct-1',
    categoryId: null,
    isTransfer: false,
    ...input,
  };
}

// ---------------------------------------------------------------------------
// calculateNetCash
// ---------------------------------------------------------------------------

describe('calculateNetCash', () => {
  it('computes net cash as total inflows minus total outflows', () => {
    const transactions = [
      txn({ date: '2026-02-01', amount: 500000 }),  // $5,000 income
      txn({ date: '2026-02-05', amount: -150000 }), // $1,500 rent
      txn({ date: '2026-02-10', amount: -30000 }),   // $300 groceries
      txn({ date: '2026-02-15', amount: -15000 }),   // $150 utilities
    ];

    const result = calculateNetCash(transactions);
    expect(result.totalInflows).toBe(500000);
    expect(result.totalOutflows).toBe(195000);
    expect(result.netCash).toBe(305000); // $3,050
  });

  it('returns zero for empty transactions', () => {
    const result = calculateNetCash([]);
    expect(result.totalInflows).toBe(0);
    expect(result.totalOutflows).toBe(0);
    expect(result.netCash).toBe(0);
  });

  it('handles negative net cash (spending more than earning)', () => {
    const transactions = [
      txn({ date: '2026-02-01', amount: 200000 }),
      txn({ date: '2026-02-05', amount: -300000 }),
    ];

    const result = calculateNetCash(transactions);
    expect(result.netCash).toBe(-100000);
    expect(result.totalInflows).toBe(200000);
    expect(result.totalOutflows).toBe(300000);
  });

  it('excludes transfers by default', () => {
    const transactions = [
      txn({ date: '2026-02-01', amount: 500000 }),
      txn({ date: '2026-02-05', amount: -100000, isTransfer: true }), // transfer out
      txn({ date: '2026-02-05', amount: 100000, isTransfer: true }),   // transfer in
      txn({ date: '2026-02-10', amount: -50000 }),
    ];

    const result = calculateNetCash(transactions);
    // Transfers should not count as income or expense
    expect(result.totalInflows).toBe(500000);
    expect(result.totalOutflows).toBe(50000);
    expect(result.netCash).toBe(450000);
  });

  it('handles all outflows with no income', () => {
    const transactions = [
      txn({ date: '2026-02-01', amount: -50000 }),
      txn({ date: '2026-02-10', amount: -30000 }),
    ];

    const result = calculateNetCash(transactions);
    expect(result.totalInflows).toBe(0);
    expect(result.totalOutflows).toBe(80000);
    expect(result.netCash).toBe(-80000);
  });

  it('handles all inflows with no expenses', () => {
    const transactions = [
      txn({ date: '2026-02-01', amount: 500000 }),
      txn({ date: '2026-02-15', amount: 500000 }),
    ];

    const result = calculateNetCash(transactions);
    expect(result.totalInflows).toBe(1000000);
    expect(result.totalOutflows).toBe(0);
    expect(result.netCash).toBe(1000000);
  });
});

// ---------------------------------------------------------------------------
// calculateCashFlowByPeriod
// ---------------------------------------------------------------------------

describe('calculateCashFlowByPeriod', () => {
  it('groups cash flow by month', () => {
    const transactions = [
      txn({ date: '2026-01-15', amount: 500000 }),
      txn({ date: '2026-01-20', amount: -200000 }),
      txn({ date: '2026-02-15', amount: 500000 }),
      txn({ date: '2026-02-20', amount: -250000 }),
      txn({ date: '2026-03-15', amount: 500000 }),
      txn({ date: '2026-03-20', amount: -180000 }),
    ];

    const periods = calculateCashFlowByPeriod(transactions, 'monthly');
    expect(periods).toHaveLength(3);

    expect(periods[0].period).toBe('2026-01');
    expect(periods[0].inflows).toBe(500000);
    expect(periods[0].outflows).toBe(200000);
    expect(periods[0].netCash).toBe(300000);

    expect(periods[1].period).toBe('2026-02');
    expect(periods[1].netCash).toBe(250000);

    expect(periods[2].period).toBe('2026-03');
    expect(periods[2].netCash).toBe(320000);
  });

  it('groups cash flow by week', () => {
    const transactions = [
      txn({ date: '2026-02-02', amount: 500000 }),  // Week 1 (Mon)
      txn({ date: '2026-02-03', amount: -50000 }),   // Week 1
      txn({ date: '2026-02-09', amount: -30000 }),   // Week 2 (Mon)
      txn({ date: '2026-02-10', amount: -20000 }),   // Week 2
    ];

    const periods = calculateCashFlowByPeriod(transactions, 'weekly');
    expect(periods.length).toBeGreaterThanOrEqual(2);
  });

  it('handles empty transactions', () => {
    const periods = calculateCashFlowByPeriod([], 'monthly');
    expect(periods).toHaveLength(0);
  });

  it('handles single-day transactions', () => {
    const transactions = [
      txn({ date: '2026-02-15', amount: 500000 }),
      txn({ date: '2026-02-15', amount: -100000 }),
      txn({ date: '2026-02-15', amount: -50000 }),
    ];

    const periods = calculateCashFlowByPeriod(transactions, 'monthly');
    expect(periods).toHaveLength(1);
    expect(periods[0].inflows).toBe(500000);
    expect(periods[0].outflows).toBe(150000);
    expect(periods[0].netCash).toBe(350000);
  });

  it('excludes transfers from period calculations', () => {
    const transactions = [
      txn({ date: '2026-02-01', amount: 500000 }),
      txn({ date: '2026-02-05', amount: -200000, isTransfer: true }),
      txn({ date: '2026-02-10', amount: -50000 }),
    ];

    const periods = calculateCashFlowByPeriod(transactions, 'monthly');
    expect(periods).toHaveLength(1);
    expect(periods[0].outflows).toBe(50000);
  });
});

// ---------------------------------------------------------------------------
// calculateRunningBalance
// ---------------------------------------------------------------------------

describe('calculateRunningBalance', () => {
  it('computes cumulative running balance from a starting balance', () => {
    const transactions = [
      txn({ date: '2026-02-01', amount: 500000 }),
      txn({ date: '2026-02-05', amount: -150000 }),
      txn({ date: '2026-02-10', amount: -30000 }),
    ];

    const balances = calculateRunningBalance(transactions, 100000); // $1,000 starting
    expect(balances).toHaveLength(3);
    expect(balances[0].balance).toBe(600000);  // 100000 + 500000
    expect(balances[1].balance).toBe(450000);  // 600000 - 150000
    expect(balances[2].balance).toBe(420000);  // 450000 - 30000
  });

  it('handles zero starting balance', () => {
    const transactions = [
      txn({ date: '2026-02-01', amount: 500000 }),
      txn({ date: '2026-02-05', amount: -200000 }),
    ];

    const balances = calculateRunningBalance(transactions, 0);
    expect(balances[0].balance).toBe(500000);
    expect(balances[1].balance).toBe(300000);
  });

  it('allows balance to go negative', () => {
    const transactions = [
      txn({ date: '2026-02-01', amount: -300000 }),
    ];

    const balances = calculateRunningBalance(transactions, 100000);
    expect(balances[0].balance).toBe(-200000);
  });

  it('returns empty array for no transactions', () => {
    const balances = calculateRunningBalance([], 100000);
    expect(balances).toHaveLength(0);
  });

  it('sorts transactions by date for correct running total', () => {
    const transactions = [
      txn({ date: '2026-02-10', amount: -30000 }),
      txn({ date: '2026-02-01', amount: 500000 }),
      txn({ date: '2026-02-05', amount: -150000 }),
    ];

    const balances = calculateRunningBalance(transactions, 0);
    // Should be sorted by date
    expect(balances[0].date).toBe('2026-02-01');
    expect(balances[0].balance).toBe(500000);
    expect(balances[1].date).toBe('2026-02-05');
    expect(balances[1].balance).toBe(350000);
    expect(balances[2].date).toBe('2026-02-10');
    expect(balances[2].balance).toBe(320000);
  });
});
