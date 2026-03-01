/**
 * Tests for debt payoff calculator engine.
 *
 * Validates snowball and avalanche strategies, amortization schedules,
 * and payoff date projections.
 *
 * Interest rates in basis points (1800 = 18.00% APR).
 * All currency amounts in integer cents.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateSnowball,
  calculateAvalanche,
  generateAmortizationSchedule,
  projectPayoffDate,
  type DebtInput,
} from '../debt-payoff';

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

function debt(overrides: Partial<DebtInput> & { id: string; name: string }): DebtInput {
  return {
    balance: 0,
    interestRate: 0,
    minimumPayment: 0,
    compounding: 'monthly',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// calculateSnowball
// ---------------------------------------------------------------------------

describe('calculateSnowball', () => {
  it('pays smallest balance first', () => {
    const debts = [
      debt({ id: 'd1', name: 'Big Card', balance: 500000, interestRate: 1800, minimumPayment: 10000 }),
      debt({ id: 'd2', name: 'Small Card', balance: 100000, interestRate: 2400, minimumPayment: 5000 }),
    ];

    const result = calculateSnowball(debts, 10000);
    expect(result.strategy).toBe('snowball');
    expect(result.totalMonths).toBeGreaterThan(0);
    expect(result.totalPaid).toBeGreaterThanOrEqual(600000); // at least sum of balances

    // Small Card should be paid off first -- find the last entry for each
    const d2LastEntry = [...result.schedule]
      .filter((e) => e.debtId === 'd2' && e.remainingBalance === 0)
      .sort((a, b) => a.month - b.month)[0];
    const d1LastEntry = [...result.schedule]
      .filter((e) => e.debtId === 'd1' && e.remainingBalance === 0)
      .sort((a, b) => a.month - b.month)[0];

    expect(d2LastEntry).toBeDefined();
    expect(d1LastEntry).toBeDefined();
    expect(d2LastEntry!.month).toBeLessThan(d1LastEntry!.month);
  });

  it('returns empty for no debts', () => {
    const result = calculateSnowball([], 10000);
    expect(result.totalMonths).toBe(0);
    expect(result.totalPaid).toBe(0);
    expect(result.schedule).toHaveLength(0);
  });

  it('handles single debt', () => {
    const debts = [
      debt({ id: 'd1', name: 'Card', balance: 50000, interestRate: 0, minimumPayment: 10000 }),
    ];

    const result = calculateSnowball(debts, 0);
    expect(result.totalMonths).toBe(5); // 50000 / 10000 = 5 months
    expect(result.totalPaid).toBe(50000);
    expect(result.totalInterest).toBe(0);
  });

  it('handles zero interest debt', () => {
    const debts = [
      debt({ id: 'd1', name: 'Personal Loan', balance: 100000, interestRate: 0, minimumPayment: 25000 }),
    ];

    const result = calculateSnowball(debts, 0);
    expect(result.totalMonths).toBe(4);
    expect(result.totalInterest).toBe(0);
    expect(result.totalPaid).toBe(100000);
  });

  it('extra payment accelerates payoff', () => {
    const debts = [
      debt({ id: 'd1', name: 'Card', balance: 100000, interestRate: 1800, minimumPayment: 5000 }),
    ];

    const withoutExtra = calculateSnowball(debts, 0);
    const withExtra = calculateSnowball(debts, 10000);

    expect(withExtra.totalMonths).toBeLessThan(withoutExtra.totalMonths);
    expect(withExtra.totalInterest).toBeLessThan(withoutExtra.totalInterest);
  });
});

// ---------------------------------------------------------------------------
// calculateAvalanche
// ---------------------------------------------------------------------------

describe('calculateAvalanche', () => {
  it('pays highest interest rate first', () => {
    const debts = [
      debt({ id: 'd1', name: 'Low Rate', balance: 300000, interestRate: 500, minimumPayment: 5000 }),
      debt({ id: 'd2', name: 'High Rate', balance: 300000, interestRate: 2400, minimumPayment: 5000 }),
    ];

    const result = calculateAvalanche(debts, 10000);
    expect(result.strategy).toBe('avalanche');

    // High Rate should be paid off first
    const d2Zeroed = result.schedule
      .filter((e) => e.debtId === 'd2' && e.remainingBalance === 0)
      .sort((a, b) => a.month - b.month)[0];
    const d1Zeroed = result.schedule
      .filter((e) => e.debtId === 'd1' && e.remainingBalance === 0)
      .sort((a, b) => a.month - b.month)[0];

    expect(d2Zeroed).toBeDefined();
    expect(d1Zeroed).toBeDefined();
    expect(d2Zeroed!.month).toBeLessThan(d1Zeroed!.month);
  });

  it('saves more interest than snowball for same debts', () => {
    const debts = [
      debt({ id: 'd1', name: 'Low Rate Big Balance', balance: 500000, interestRate: 500, minimumPayment: 5000 }),
      debt({ id: 'd2', name: 'High Rate Small Balance', balance: 100000, interestRate: 2400, minimumPayment: 5000 }),
    ];

    const snowball = calculateSnowball(debts, 10000);
    const avalanche = calculateAvalanche(debts, 10000);

    // Avalanche should pay less or equal total interest
    expect(avalanche.totalInterest).toBeLessThanOrEqual(snowball.totalInterest);
  });

  it('returns empty for no debts', () => {
    const result = calculateAvalanche([], 5000);
    expect(result.totalMonths).toBe(0);
    expect(result.schedule).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// generateAmortizationSchedule
// ---------------------------------------------------------------------------

describe('generateAmortizationSchedule', () => {
  it('generates a complete amortization schedule', () => {
    const d = debt({
      id: 'd1',
      name: 'Card',
      balance: 100000, // $1,000
      interestRate: 1200, // 12% APR
      minimumPayment: 20000, // $200/mo
    });

    const schedule = generateAmortizationSchedule(d);
    expect(schedule.length).toBeGreaterThan(0);

    // Final entry should have zero remaining
    const last = schedule[schedule.length - 1];
    expect(last.remainingBalance).toBe(0);

    // Each entry should have payment = principal + interest
    for (const entry of schedule) {
      expect(entry.payment).toBe(entry.principal + entry.interest);
    }
  });

  it('handles zero balance', () => {
    const d = debt({ id: 'd1', name: 'Empty', balance: 0, minimumPayment: 5000 });
    expect(generateAmortizationSchedule(d)).toHaveLength(0);
  });

  it('handles zero minimum payment', () => {
    const d = debt({ id: 'd1', name: 'No Payment', balance: 100000, minimumPayment: 0 });
    expect(generateAmortizationSchedule(d)).toHaveLength(0);
  });

  it('handles zero interest rate', () => {
    const d = debt({
      id: 'd1',
      name: 'No Interest',
      balance: 50000,
      interestRate: 0,
      minimumPayment: 10000,
    });

    const schedule = generateAmortizationSchedule(d);
    expect(schedule).toHaveLength(5); // 50000 / 10000
    for (const entry of schedule) {
      expect(entry.interest).toBe(0);
    }
  });

  it('supports daily compounding', () => {
    const monthlyDebt = debt({
      id: 'd1',
      name: 'Monthly',
      balance: 100000,
      interestRate: 1800,
      minimumPayment: 10000,
      compounding: 'monthly',
    });
    const dailyDebt = debt({
      id: 'd2',
      name: 'Daily',
      balance: 100000,
      interestRate: 1800,
      minimumPayment: 10000,
      compounding: 'daily',
    });

    const monthlySchedule = generateAmortizationSchedule(monthlyDebt);
    const dailySchedule = generateAmortizationSchedule(dailyDebt);

    // Daily compounding accrues slightly more interest
    const monthlyInterest = monthlySchedule.reduce((sum, e) => sum + e.interest, 0);
    const dailyInterest = dailySchedule.reduce((sum, e) => sum + e.interest, 0);
    expect(dailyInterest).toBeGreaterThanOrEqual(monthlyInterest);
  });

  it('each month reduces the balance', () => {
    const d = debt({
      id: 'd1',
      name: 'Card',
      balance: 100000,
      interestRate: 1200,
      minimumPayment: 20000,
    });

    const schedule = generateAmortizationSchedule(d);
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].remainingBalance).toBeLessThan(schedule[i - 1].remainingBalance);
    }
  });
});

// ---------------------------------------------------------------------------
// projectPayoffDate
// ---------------------------------------------------------------------------

describe('projectPayoffDate', () => {
  it('projects a payoff date', () => {
    const debts = [
      debt({ id: 'd1', name: 'Card', balance: 100000, interestRate: 1200, minimumPayment: 20000 }),
    ];

    const result = projectPayoffDate(debts, 'snowball', 0);
    expect(result.totalMonths).toBeGreaterThan(0);
    expect(result.debtFreeDate).toMatch(/^\d{4}-\d{2}$/);
  });

  it('returns null date for no debts', () => {
    const result = projectPayoffDate([], 'snowball', 0);
    expect(result.totalMonths).toBe(0);
    expect(result.debtFreeDate).toBeNull();
  });

  it('extra payment shortens payoff', () => {
    const debts = [
      debt({ id: 'd1', name: 'Card', balance: 200000, interestRate: 1800, minimumPayment: 5000 }),
    ];

    const withoutExtra = projectPayoffDate(debts, 'avalanche', 0);
    const withExtra = projectPayoffDate(debts, 'avalanche', 10000);

    expect(withExtra.totalMonths).toBeLessThan(withoutExtra.totalMonths);
  });
});
