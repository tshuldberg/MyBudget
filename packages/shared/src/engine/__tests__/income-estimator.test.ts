/**
 * TDD tests for income estimation engine.
 *
 * The income estimator analyzes transaction history to detect income patterns
 * (salary, freelance, irregular) and predict expected monthly income. This
 * powers the "Expected Income" widget on the Budget tab and helps users
 * pre-allocate envelopes before payday arrives.
 *
 * All amounts in integer cents.
 */

import { describe, it, expect } from 'vitest';
import {
  estimateMonthlyIncome,
  detectIncomeStreams,
  classifyIncomePattern,
  type IncomeStream,
  type IncomeEstimate,
  type IncomePattern,
} from '../income-estimator';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

interface TransactionInput {
  date: string;
  payee: string;
  amount: number; // positive = inflow
  accountId?: string;
  categoryId?: string | null;
}

function txn(input: TransactionInput): TransactionInput {
  return {
    accountId: 'acct-1',
    categoryId: null,
    ...input,
  };
}

// ---------------------------------------------------------------------------
// detectIncomeStreams
// ---------------------------------------------------------------------------

describe('detectIncomeStreams', () => {
  it('detects a single regular salary pattern', () => {
    const transactions = [
      txn({ date: '2026-01-15', payee: 'ACME Corp Payroll', amount: 350000 }),
      txn({ date: '2026-01-31', payee: 'ACME Corp Payroll', amount: 350000 }),
      txn({ date: '2026-02-15', payee: 'ACME Corp Payroll', amount: 350000 }),
      txn({ date: '2026-02-28', payee: 'ACME Corp Payroll', amount: 350000 }),
    ];

    const streams = detectIncomeStreams(transactions);
    expect(streams).toHaveLength(1);
    expect(streams[0].payee).toBe('ACME Corp Payroll');
    expect(streams[0].averageAmount).toBe(350000);
    expect(streams[0].frequency).toBe('biweekly');
    expect(streams[0].occurrences).toBe(4);
  });

  it('detects multiple income streams from different payees', () => {
    const transactions = [
      txn({ date: '2026-01-01', payee: 'Employer Inc', amount: 500000 }),
      txn({ date: '2026-02-01', payee: 'Employer Inc', amount: 500000 }),
      txn({ date: '2026-03-01', payee: 'Employer Inc', amount: 500000 }),
      txn({ date: '2026-01-10', payee: 'Side Gig LLC', amount: 80000 }),
      txn({ date: '2026-02-12', payee: 'Side Gig LLC', amount: 75000 }),
      txn({ date: '2026-03-09', payee: 'Side Gig LLC', amount: 85000 }),
    ];

    const streams = detectIncomeStreams(transactions);
    expect(streams).toHaveLength(2);

    const employer = streams.find((s) => s.payee === 'Employer Inc');
    const sideGig = streams.find((s) => s.payee === 'Side Gig LLC');
    expect(employer).toBeDefined();
    expect(sideGig).toBeDefined();
    expect(employer!.frequency).toBe('monthly');
    expect(sideGig!.frequency).toBe('monthly');
  });

  it('ignores outflows (negative amounts)', () => {
    const transactions = [
      txn({ date: '2026-01-15', payee: 'Employer', amount: 350000 }),
      txn({ date: '2026-01-20', payee: 'Grocery Store', amount: -5000 }),
      txn({ date: '2026-02-15', payee: 'Employer', amount: 350000 }),
      txn({ date: '2026-02-20', payee: 'Grocery Store', amount: -4500 }),
    ];

    const streams = detectIncomeStreams(transactions);
    expect(streams).toHaveLength(1);
    expect(streams[0].payee).toBe('Employer');
  });

  it('returns empty array when no income transactions exist', () => {
    const transactions = [
      txn({ date: '2026-01-20', payee: 'Store', amount: -5000 }),
      txn({ date: '2026-02-20', payee: 'Store', amount: -4500 }),
    ];

    const streams = detectIncomeStreams(transactions);
    expect(streams).toHaveLength(0);
  });

  it('ignores single-occurrence inflows (not recurring)', () => {
    const transactions = [
      txn({ date: '2026-01-15', payee: 'Employer', amount: 350000 }),
      txn({ date: '2026-02-15', payee: 'Employer', amount: 350000 }),
      txn({ date: '2026-01-25', payee: 'One-Time Gift', amount: 50000 }),
    ];

    const streams = detectIncomeStreams(transactions);
    expect(streams).toHaveLength(1);
    expect(streams[0].payee).toBe('Employer');
  });

  it('handles variable amounts from same payee', () => {
    const transactions = [
      txn({ date: '2026-01-15', payee: 'Freelance Client', amount: 120000 }),
      txn({ date: '2026-02-15', payee: 'Freelance Client', amount: 95000 }),
      txn({ date: '2026-03-15', payee: 'Freelance Client', amount: 140000 }),
    ];

    const streams = detectIncomeStreams(transactions);
    expect(streams).toHaveLength(1);
    expect(streams[0].averageAmount).toBe(118333); // Math.round((120000+95000+140000)/3)
  });
});

// ---------------------------------------------------------------------------
// classifyIncomePattern
// ---------------------------------------------------------------------------

describe('classifyIncomePattern', () => {
  it('classifies consistent bi-weekly as "salary"', () => {
    const stream: IncomeStream = {
      payee: 'ACME Corp',
      averageAmount: 350000,
      frequency: 'biweekly',
      occurrences: 6,
      amountVariance: 0,
      lastSeen: '2026-03-15',
    };

    expect(classifyIncomePattern(stream)).toBe('salary');
  });

  it('classifies consistent monthly as "salary"', () => {
    const stream: IncomeStream = {
      payee: 'Employer',
      averageAmount: 700000,
      frequency: 'monthly',
      occurrences: 3,
      amountVariance: 0,
      lastSeen: '2026-03-01',
    };

    expect(classifyIncomePattern(stream)).toBe('salary');
  });

  it('classifies variable monthly amounts as "freelance"', () => {
    const stream: IncomeStream = {
      payee: 'Client',
      averageAmount: 200000,
      frequency: 'monthly',
      occurrences: 4,
      amountVariance: 0.35, // 35% variance
      lastSeen: '2026-03-10',
    };

    expect(classifyIncomePattern(stream)).toBe('freelance');
  });

  it('classifies irregular timing as "irregular"', () => {
    const stream: IncomeStream = {
      payee: 'Random Income',
      averageAmount: 50000,
      frequency: 'irregular',
      occurrences: 3,
      amountVariance: 0.5,
      lastSeen: '2026-02-20',
    };

    expect(classifyIncomePattern(stream)).toBe('irregular');
  });
});

// ---------------------------------------------------------------------------
// estimateMonthlyIncome
// ---------------------------------------------------------------------------

describe('estimateMonthlyIncome', () => {
  it('estimates monthly income from a single salary stream', () => {
    const transactions = [
      txn({ date: '2026-01-01', payee: 'Employer', amount: 500000 }),
      txn({ date: '2026-02-01', payee: 'Employer', amount: 500000 }),
      txn({ date: '2026-03-01', payee: 'Employer', amount: 500000 }),
    ];

    const estimate = estimateMonthlyIncome(transactions);
    expect(estimate.totalMonthlyEstimate).toBe(500000);
    expect(estimate.confidence).toBeGreaterThan(0.7);
    expect(estimate.streams).toHaveLength(1);
  });

  it('combines multiple income streams', () => {
    const transactions = [
      txn({ date: '2026-01-01', payee: 'Employer', amount: 400000 }),
      txn({ date: '2026-02-01', payee: 'Employer', amount: 400000 }),
      txn({ date: '2026-03-01', payee: 'Employer', amount: 400000 }),
      txn({ date: '2026-01-15', payee: 'Side Hustle', amount: 100000 }),
      txn({ date: '2026-02-15', payee: 'Side Hustle', amount: 100000 }),
      txn({ date: '2026-03-15', payee: 'Side Hustle', amount: 100000 }),
    ];

    const estimate = estimateMonthlyIncome(transactions);
    expect(estimate.totalMonthlyEstimate).toBe(500000);
    expect(estimate.streams).toHaveLength(2);
  });

  it('converts bi-weekly salary to monthly estimate', () => {
    const transactions = [
      txn({ date: '2026-01-10', payee: 'Employer', amount: 250000 }),
      txn({ date: '2026-01-24', payee: 'Employer', amount: 250000 }),
      txn({ date: '2026-02-07', payee: 'Employer', amount: 250000 }),
      txn({ date: '2026-02-21', payee: 'Employer', amount: 250000 }),
    ];

    const estimate = estimateMonthlyIncome(transactions);
    // Bi-weekly: 26 paychecks/year = avg 2.167/month -> 250000 * 26/12 ~ 541667
    expect(estimate.totalMonthlyEstimate).toBeGreaterThan(500000);
    expect(estimate.totalMonthlyEstimate).toBeLessThan(560000);
  });

  it('returns zero estimate with no income history', () => {
    const estimate = estimateMonthlyIncome([]);
    expect(estimate.totalMonthlyEstimate).toBe(0);
    expect(estimate.confidence).toBe(0);
    expect(estimate.streams).toHaveLength(0);
  });

  it('has lower confidence with fewer data points', () => {
    const twoMonths = [
      txn({ date: '2026-01-01', payee: 'Employer', amount: 500000 }),
      txn({ date: '2026-02-01', payee: 'Employer', amount: 500000 }),
    ];

    const sixMonths = [
      txn({ date: '2025-10-01', payee: 'Employer', amount: 500000 }),
      txn({ date: '2025-11-01', payee: 'Employer', amount: 500000 }),
      txn({ date: '2025-12-01', payee: 'Employer', amount: 500000 }),
      txn({ date: '2026-01-01', payee: 'Employer', amount: 500000 }),
      txn({ date: '2026-02-01', payee: 'Employer', amount: 500000 }),
      txn({ date: '2026-03-01', payee: 'Employer', amount: 500000 }),
    ];

    const shortEstimate = estimateMonthlyIncome(twoMonths);
    const longEstimate = estimateMonthlyIncome(sixMonths);

    expect(longEstimate.confidence).toBeGreaterThan(shortEstimate.confidence);
  });

  it('has lower confidence with variable amounts', () => {
    const stable = [
      txn({ date: '2026-01-01', payee: 'Employer', amount: 500000 }),
      txn({ date: '2026-02-01', payee: 'Employer', amount: 500000 }),
      txn({ date: '2026-03-01', payee: 'Employer', amount: 500000 }),
    ];

    const variable = [
      txn({ date: '2026-01-01', payee: 'Client', amount: 300000 }),
      txn({ date: '2026-02-01', payee: 'Client', amount: 600000 }),
      txn({ date: '2026-03-01', payee: 'Client', amount: 450000 }),
    ];

    const stableEstimate = estimateMonthlyIncome(stable);
    const variableEstimate = estimateMonthlyIncome(variable);

    expect(stableEstimate.confidence).toBeGreaterThan(variableEstimate.confidence);
  });
});
