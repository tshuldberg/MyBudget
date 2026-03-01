/**
 * Tests for the budget rollover engine.
 *
 * Rollovers formalize the carry-forward concept: unspent amounts in each
 * category transfer to the next month as persistent records.
 *
 * All amounts in integer cents.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateRollover,
  processMonthRollover,
  applyRollovers,
  type RolloverRecord,
} from '../rollover';
import type { MonthBudgetState } from '../budget';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeBudgetState(overrides: Partial<MonthBudgetState> = {}): MonthBudgetState {
  return {
    month: '2026-01',
    totalIncome: 500000,
    totalAllocated: 400000,
    totalActivity: -300000,
    totalOverspent: 0,
    readyToAssign: 100000,
    groups: [
      {
        groupId: 'grp-1',
        name: 'Bills',
        allocated: 200000,
        activity: -150000,
        available: 50000,
        categories: [
          {
            categoryId: 'cat-1',
            groupId: 'grp-1',
            name: 'Rent',
            emoji: null,
            allocated: 150000,
            activity: -150000,
            carryForward: 0,
            available: 0,
            targetAmount: 150000,
            targetType: 'monthly',
            targetProgress: 100,
          },
          {
            categoryId: 'cat-2',
            groupId: 'grp-1',
            name: 'Utilities',
            emoji: null,
            allocated: 50000,
            activity: 0,
            carryForward: 0,
            available: 50000,
            targetAmount: 50000,
            targetType: 'monthly',
            targetProgress: 100,
          },
        ],
      },
      {
        groupId: 'grp-2',
        name: 'Savings',
        allocated: 200000,
        activity: -150000,
        available: 50000,
        categories: [
          {
            categoryId: 'cat-3',
            groupId: 'grp-2',
            name: 'Emergency Fund',
            emoji: null,
            allocated: 200000,
            activity: -150000,
            carryForward: 0,
            available: 50000,
            targetAmount: 1000000,
            targetType: 'savings_goal',
            targetProgress: 5,
          },
        ],
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// calculateRollover
// ---------------------------------------------------------------------------

describe('calculateRollover', () => {
  it('computes rollover as carryForward + allocated + activity', () => {
    const result = calculateRollover({
      categoryId: 'cat-1',
      allocated: 100000,
      activity: -80000,
      carryForward: 20000,
    });
    expect(result).toBe(40000); // 20000 + 100000 - 80000
  });

  it('returns zero when fully spent', () => {
    const result = calculateRollover({
      categoryId: 'cat-1',
      allocated: 100000,
      activity: -100000,
      carryForward: 0,
    });
    expect(result).toBe(0);
  });

  it('returns negative when overspent', () => {
    const result = calculateRollover({
      categoryId: 'cat-1',
      allocated: 50000,
      activity: -80000,
      carryForward: 0,
    });
    expect(result).toBe(-30000);
  });

  it('carries forward surplus from prior month', () => {
    const result = calculateRollover({
      categoryId: 'cat-1',
      allocated: 0,
      activity: 0,
      carryForward: 75000,
    });
    expect(result).toBe(75000);
  });
});

// ---------------------------------------------------------------------------
// processMonthRollover
// ---------------------------------------------------------------------------

describe('processMonthRollover', () => {
  it('generates one rollover record per category', () => {
    const state = makeBudgetState();
    const records = processMonthRollover(state);

    expect(records).toHaveLength(3);
    expect(records[0].categoryId).toBe('cat-1');
    expect(records[1].categoryId).toBe('cat-2');
    expect(records[2].categoryId).toBe('cat-3');
  });

  it('sets fromMonth and toMonth correctly', () => {
    const state = makeBudgetState({ month: '2026-03' });
    const records = processMonthRollover(state);

    for (const record of records) {
      expect(record.fromMonth).toBe('2026-03');
      expect(record.toMonth).toBe('2026-04');
    }
  });

  it('advances December to January of next year', () => {
    const state = makeBudgetState({ month: '2026-12' });
    const records = processMonthRollover(state);

    for (const record of records) {
      expect(record.fromMonth).toBe('2026-12');
      expect(record.toMonth).toBe('2027-01');
    }
  });

  it('uses category available as rollover amount', () => {
    const state = makeBudgetState();
    const records = processMonthRollover(state);

    expect(records[0].amount).toBe(0);     // cat-1: rent fully spent
    expect(records[1].amount).toBe(50000); // cat-2: utilities unspent
    expect(records[2].amount).toBe(50000); // cat-3: emergency fund
  });

  it('returns empty array for budget with no categories', () => {
    const state = makeBudgetState({ groups: [] });
    const records = processMonthRollover(state);
    expect(records).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// applyRollovers
// ---------------------------------------------------------------------------

describe('applyRollovers', () => {
  it('adds rollover amounts to existing allocations', () => {
    const allocations = new Map([
      ['cat-1', 100000],
      ['cat-2', 50000],
    ]);
    const rollovers: RolloverRecord[] = [
      { categoryId: 'cat-1', fromMonth: '2026-01', toMonth: '2026-02', amount: 20000 },
      { categoryId: 'cat-2', fromMonth: '2026-01', toMonth: '2026-02', amount: 30000 },
    ];

    const result = applyRollovers(allocations, rollovers);
    expect(result.get('cat-1')).toBe(120000);
    expect(result.get('cat-2')).toBe(80000);
  });

  it('creates entries for categories with rollovers but no allocations', () => {
    const allocations = new Map<string, number>();
    const rollovers: RolloverRecord[] = [
      { categoryId: 'cat-1', fromMonth: '2026-01', toMonth: '2026-02', amount: 50000 },
    ];

    const result = applyRollovers(allocations, rollovers);
    expect(result.get('cat-1')).toBe(50000);
  });

  it('handles negative rollover (overspent previous month)', () => {
    const allocations = new Map([['cat-1', 100000]]);
    const rollovers: RolloverRecord[] = [
      { categoryId: 'cat-1', fromMonth: '2026-01', toMonth: '2026-02', amount: -30000 },
    ];

    const result = applyRollovers(allocations, rollovers);
    expect(result.get('cat-1')).toBe(70000);
  });

  it('preserves allocations for categories without rollovers', () => {
    const allocations = new Map([
      ['cat-1', 100000],
      ['cat-2', 50000],
    ]);
    const rollovers: RolloverRecord[] = [
      { categoryId: 'cat-1', fromMonth: '2026-01', toMonth: '2026-02', amount: 20000 },
    ];

    const result = applyRollovers(allocations, rollovers);
    expect(result.get('cat-1')).toBe(120000);
    expect(result.get('cat-2')).toBe(50000); // unchanged
  });

  it('handles empty rollovers', () => {
    const allocations = new Map([['cat-1', 100000]]);
    const result = applyRollovers(allocations, []);
    expect(result.get('cat-1')).toBe(100000);
  });
});
