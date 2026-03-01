/**
 * TDD tests for payday detection engine.
 *
 * The payday detector analyzes transaction history to find recurring income
 * patterns and predict upcoming paydays. This powers the "Next Payday"
 * countdown widget and helps users time their budget allocations.
 *
 * All amounts in integer cents.
 */

import { describe, it, expect } from 'vitest';
import {
  detectPaydays,
  predictNextPayday,
  getPaydaySchedule,
  type PaydayPattern,
  type PaydayPrediction,
} from '../payday-detector';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

interface TransactionInput {
  date: string;
  payee: string;
  amount: number; // positive = inflow
}

function txn(input: TransactionInput): TransactionInput {
  return input;
}

// ---------------------------------------------------------------------------
// detectPaydays
// ---------------------------------------------------------------------------

describe('detectPaydays', () => {
  it('detects monthly payday on fixed date', () => {
    const transactions = [
      txn({ date: '2025-10-01', payee: 'Employer Inc', amount: 700000 }),
      txn({ date: '2025-11-01', payee: 'Employer Inc', amount: 700000 }),
      txn({ date: '2025-12-01', payee: 'Employer Inc', amount: 700000 }),
      txn({ date: '2026-01-01', payee: 'Employer Inc', amount: 700000 }),
      txn({ date: '2026-02-01', payee: 'Employer Inc', amount: 700000 }),
    ];

    const patterns = detectPaydays(transactions);
    expect(patterns).toHaveLength(1);
    expect(patterns[0].frequency).toBe('monthly');
    expect(patterns[0].dayOfMonth).toBe(1);
    expect(patterns[0].payee).toBe('Employer Inc');
  });

  it('detects bi-weekly payday pattern', () => {
    const transactions = [
      txn({ date: '2026-01-02', payee: 'ACME Payroll', amount: 250000 }),
      txn({ date: '2026-01-16', payee: 'ACME Payroll', amount: 250000 }),
      txn({ date: '2026-01-30', payee: 'ACME Payroll', amount: 250000 }),
      txn({ date: '2026-02-13', payee: 'ACME Payroll', amount: 250000 }),
      txn({ date: '2026-02-27', payee: 'ACME Payroll', amount: 250000 }),
    ];

    const patterns = detectPaydays(transactions);
    expect(patterns).toHaveLength(1);
    expect(patterns[0].frequency).toBe('biweekly');
    expect(patterns[0].intervalDays).toBe(14);
  });

  it('detects semi-monthly paydays (1st and 15th)', () => {
    const transactions = [
      txn({ date: '2026-01-01', payee: 'Employer', amount: 350000 }),
      txn({ date: '2026-01-15', payee: 'Employer', amount: 350000 }),
      txn({ date: '2026-02-01', payee: 'Employer', amount: 350000 }),
      txn({ date: '2026-02-15', payee: 'Employer', amount: 350000 }),
    ];

    const patterns = detectPaydays(transactions);
    expect(patterns).toHaveLength(1);
    expect(patterns[0].frequency).toBe('semi_monthly');
    expect(patterns[0].daysOfMonth).toEqual([1, 15]);
  });

  it('detects weekly payday', () => {
    const transactions = [
      txn({ date: '2026-01-02', payee: 'Gig Corp', amount: 80000 }),
      txn({ date: '2026-01-09', payee: 'Gig Corp', amount: 85000 }),
      txn({ date: '2026-01-16', payee: 'Gig Corp', amount: 78000 }),
      txn({ date: '2026-01-23', payee: 'Gig Corp', amount: 82000 }),
      txn({ date: '2026-01-30', payee: 'Gig Corp', amount: 80000 }),
    ];

    const patterns = detectPaydays(transactions);
    expect(patterns).toHaveLength(1);
    expect(patterns[0].frequency).toBe('weekly');
    expect(patterns[0].dayOfWeek).toBeDefined();
  });

  it('returns empty when no income patterns found', () => {
    const transactions = [
      txn({ date: '2026-01-05', payee: 'Store', amount: -5000 }),
      txn({ date: '2026-01-10', payee: 'Restaurant', amount: -2500 }),
    ];

    const patterns = detectPaydays(transactions);
    expect(patterns).toHaveLength(0);
  });

  it('handles paydays that shift for weekends', () => {
    // Payday is normally the 15th, but shifted to Friday the 13th
    const transactions = [
      txn({ date: '2025-11-14', payee: 'Employer', amount: 500000 }), // Fri (15th = Sat)
      txn({ date: '2025-12-15', payee: 'Employer', amount: 500000 }), // Mon (exact)
      txn({ date: '2026-01-15', payee: 'Employer', amount: 500000 }), // Thu (exact)
      txn({ date: '2026-02-13', payee: 'Employer', amount: 500000 }), // Fri (15th = Sun)
    ];

    const patterns = detectPaydays(transactions);
    expect(patterns).toHaveLength(1);
    // Should still detect the pattern despite +/- 2 day variance
    expect(patterns[0].frequency).toBe('monthly');
  });

  it('identifies multiple payday patterns from different employers', () => {
    const transactions = [
      txn({ date: '2026-01-01', payee: 'Full Time Job', amount: 400000 }),
      txn({ date: '2026-02-01', payee: 'Full Time Job', amount: 400000 }),
      txn({ date: '2026-03-01', payee: 'Full Time Job', amount: 400000 }),
      txn({ date: '2026-01-15', payee: 'Part Time Gig', amount: 100000 }),
      txn({ date: '2026-02-15', payee: 'Part Time Gig', amount: 100000 }),
      txn({ date: '2026-03-15', payee: 'Part Time Gig', amount: 100000 }),
    ];

    const patterns = detectPaydays(transactions);
    expect(patterns).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// predictNextPayday
// ---------------------------------------------------------------------------

describe('predictNextPayday', () => {
  it('predicts next monthly payday', () => {
    const pattern: PaydayPattern = {
      payee: 'Employer',
      frequency: 'monthly',
      dayOfMonth: 1,
      averageAmount: 500000,
      confidence: 0.95,
      lastOccurrence: '2026-02-01',
    };

    const prediction = predictNextPayday(pattern, '2026-02-15');
    expect(prediction.date).toBe('2026-03-01');
    expect(prediction.expectedAmount).toBe(500000);
    expect(prediction.daysUntil).toBe(14);
  });

  it('predicts next bi-weekly payday', () => {
    const pattern: PaydayPattern = {
      payee: 'ACME',
      frequency: 'biweekly',
      intervalDays: 14,
      averageAmount: 250000,
      confidence: 0.9,
      lastOccurrence: '2026-02-14',
    };

    const prediction = predictNextPayday(pattern, '2026-02-20');
    expect(prediction.date).toBe('2026-02-28');
    expect(prediction.daysUntil).toBe(8);
  });

  it('returns prediction for today if payday is today', () => {
    const pattern: PaydayPattern = {
      payee: 'Employer',
      frequency: 'monthly',
      dayOfMonth: 15,
      averageAmount: 500000,
      confidence: 0.95,
      lastOccurrence: '2026-01-15',
    };

    const prediction = predictNextPayday(pattern, '2026-02-15');
    expect(prediction.date).toBe('2026-02-15');
    expect(prediction.daysUntil).toBe(0);
  });

  it('handles month-end payday with shorter months', () => {
    const pattern: PaydayPattern = {
      payee: 'Employer',
      frequency: 'monthly',
      dayOfMonth: 31,
      averageAmount: 500000,
      confidence: 0.9,
      lastOccurrence: '2026-01-31',
    };

    // February only has 28 days
    const prediction = predictNextPayday(pattern, '2026-02-01');
    expect(prediction.date).toBe('2026-02-28');
  });
});

// ---------------------------------------------------------------------------
// getPaydaySchedule
// ---------------------------------------------------------------------------

describe('getPaydaySchedule', () => {
  it('generates upcoming paydays for a date range', () => {
    const pattern: PaydayPattern = {
      payee: 'Employer',
      frequency: 'monthly',
      dayOfMonth: 1,
      averageAmount: 500000,
      confidence: 0.95,
      lastOccurrence: '2026-01-01',
    };

    const schedule = getPaydaySchedule(pattern, '2026-02-01', '2026-04-30');
    expect(schedule).toHaveLength(3);
    expect(schedule[0].date).toBe('2026-02-01');
    expect(schedule[1].date).toBe('2026-03-01');
    expect(schedule[2].date).toBe('2026-04-01');
  });

  it('generates bi-weekly paydays across months', () => {
    const pattern: PaydayPattern = {
      payee: 'ACME',
      frequency: 'biweekly',
      intervalDays: 14,
      averageAmount: 250000,
      confidence: 0.9,
      lastOccurrence: '2026-01-30',
    };

    const schedule = getPaydaySchedule(pattern, '2026-02-01', '2026-02-28');
    // Feb 13 and Feb 27
    expect(schedule).toHaveLength(2);
  });

  it('returns empty for past date ranges', () => {
    const pattern: PaydayPattern = {
      payee: 'Employer',
      frequency: 'monthly',
      dayOfMonth: 1,
      averageAmount: 500000,
      confidence: 0.95,
      lastOccurrence: '2026-03-01',
    };

    const schedule = getPaydaySchedule(pattern, '2025-01-01', '2025-12-31');
    // All dates are before the last occurrence, but the schedule generator
    // should still produce dates in the requested range based on the pattern
    expect(schedule.length).toBeGreaterThan(0);
  });
});
