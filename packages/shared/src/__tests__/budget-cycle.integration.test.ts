/**
 * Integration test: full budget cycle.
 *
 * Exercises the complete flow from income → allocation → spending → carry-forward
 * using the budget engine's pure calculation functions. This validates that all
 * the pieces compose correctly end-to-end.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateMonthBudget,
  getCarryForward,
  getTotalOverspent,
  moveMoneyBetweenCategories,
} from '../engine/budget';
import type { MonthBudgetInput } from '../engine/budget';

// --- Test fixtures ---

const GROUPS = [
  {
    groupId: 'g-bills',
    name: 'Bills',
    categories: [
      { categoryId: 'c-rent', name: 'Rent', emoji: '🏠', targetAmount: 180000, targetType: 'monthly' as const },
      { categoryId: 'c-utilities', name: 'Utilities', emoji: '⚡', targetAmount: 15000, targetType: 'monthly' as const },
    ],
  },
  {
    groupId: 'g-everyday',
    name: 'Everyday',
    categories: [
      { categoryId: 'c-groceries', name: 'Groceries', emoji: '🛒', targetAmount: 50000, targetType: 'monthly' as const },
      { categoryId: 'c-dining', name: 'Dining Out', emoji: '🍕', targetAmount: 20000, targetType: 'monthly' as const },
      { categoryId: 'c-transport', name: 'Transportation', emoji: '🚗', targetAmount: 10000, targetType: 'monthly' as const },
    ],
  },
  {
    groupId: 'g-goals',
    name: 'Goals',
    categories: [
      { categoryId: 'c-savings', name: 'Emergency Fund', emoji: '💰', targetAmount: 1000000, targetType: 'savings_goal' as const },
    ],
  },
];

function makeInput(overrides: Partial<MonthBudgetInput>): MonthBudgetInput {
  return {
    month: '2026-02',
    groups: GROUPS,
    allocations: new Map(),
    activity: new Map(),
    carryForwards: new Map(),
    totalIncome: 0,
    overspentLastMonth: 0,
    ...overrides,
  };
}

describe('Full budget cycle integration', () => {
  it('Step 1-4: Income flows into Ready to Assign', () => {
    const state = calculateMonthBudget(makeInput({
      month: '2026-02',
      totalIncome: 500000, // $5,000.00
    }));

    expect(state.readyToAssign).toBe(500000);
    expect(state.totalAllocated).toBe(0);
    expect(state.totalActivity).toBe(0);
  });

  it('Step 5-6: Allocations reduce Ready to Assign', () => {
    const allocations = new Map([
      ['c-rent', 180000],     // $1,800
      ['c-groceries', 50000], // $500
      ['c-dining', 20000],    // $200
      ['c-savings', 50000],   // $500
    ]);

    const state = calculateMonthBudget(makeInput({
      month: '2026-02',
      totalIncome: 500000,
      allocations,
    }));

    expect(state.totalAllocated).toBe(300000);
    expect(state.readyToAssign).toBe(200000); // $5,000 - $3,000 = $2,000
  });

  it('Step 7-8: Spending reduces category available', () => {
    const allocations = new Map([
      ['c-rent', 180000],
      ['c-groceries', 50000],
      ['c-dining', 20000],
      ['c-savings', 50000],
    ]);

    const activity = new Map([
      ['c-groceries', -31200], // -$312.00
      ['c-dining', -7800],     // -$78.00
    ]);

    const state = calculateMonthBudget(makeInput({
      month: '2026-02',
      totalIncome: 500000,
      allocations,
      activity,
    }));

    // Groceries: 50000 + (-31200) = 18800
    const groceries = state.groups
      .flatMap((g) => g.categories)
      .find((c) => c.categoryId === 'c-groceries')!;
    expect(groceries.available).toBe(18800); // $188.00

    // Dining: 20000 + (-7800) = 12200
    const dining = state.groups
      .flatMap((g) => g.categories)
      .find((c) => c.categoryId === 'c-dining')!;
    expect(dining.available).toBe(12200); // $122.00

    // Rent: allocated but not spent = full amount available
    const rent = state.groups
      .flatMap((g) => g.categories)
      .find((c) => c.categoryId === 'c-rent')!;
    expect(rent.available).toBe(180000);

    // No overspending
    expect(state.totalOverspent).toBe(0);
  });

  it('Step 9-10: Carry-forward from month 1 to month 2', () => {
    // Month 1
    const month1 = calculateMonthBudget(makeInput({
      month: '2026-02',
      totalIncome: 500000,
      allocations: new Map([
        ['c-rent', 180000],
        ['c-groceries', 50000],
        ['c-dining', 20000],
        ['c-savings', 50000],
      ]),
      activity: new Map([
        ['c-groceries', -31200],
        ['c-dining', -7800],
      ]),
    }));

    const carryForward = getCarryForward(month1);
    const overspentLastMonth = getTotalOverspent(month1);

    // Verify carry-forward values
    expect(carryForward.get('c-groceries')).toBe(18800); // $188.00
    expect(carryForward.get('c-dining')).toBe(12200);    // $122.00
    expect(carryForward.get('c-rent')).toBe(180000);     // $1,800.00 unspent
    expect(carryForward.get('c-savings')).toBe(50000);   // $500.00
    expect(overspentLastMonth).toBe(0);

    // Month 2 — new income, new allocations, carry-forward applied
    const month2 = calculateMonthBudget(makeInput({
      month: '2026-03',
      totalIncome: 500000,
      allocations: new Map([
        ['c-rent', 180000],
        ['c-groceries', 50000],
        ['c-dining', 20000],
        ['c-savings', 50000],
      ]),
      carryForwards: carryForward,
      overspentLastMonth,
    }));

    // Groceries: carry 18800 + allocate 50000 = 68800
    const groceries2 = month2.groups
      .flatMap((g) => g.categories)
      .find((c) => c.categoryId === 'c-groceries')!;
    expect(groceries2.carryForward).toBe(18800);
    expect(groceries2.allocated).toBe(50000);
    expect(groceries2.available).toBe(68800);

    // Dining: carry 12200 + allocate 20000 = 32200
    const dining2 = month2.groups
      .flatMap((g) => g.categories)
      .find((c) => c.categoryId === 'c-dining')!;
    expect(dining2.carryForward).toBe(12200);
    expect(dining2.available).toBe(32200);

    // Savings goal: carry 50000 + allocate 50000 = 100000
    const savings2 = month2.groups
      .flatMap((g) => g.categories)
      .find((c) => c.categoryId === 'c-savings')!;
    expect(savings2.available).toBe(100000);

    // Savings goal target progress: 100000 / 1000000 = 10%
    expect(savings2.targetProgress).toBe(10);
  });

  it('Step 11-12: Multi-month chain with spending in month 2', () => {
    // Month 1
    const month1 = calculateMonthBudget(makeInput({
      month: '2026-02',
      totalIncome: 500000,
      allocations: new Map([
        ['c-rent', 180000],
        ['c-groceries', 50000],
        ['c-dining', 20000],
        ['c-savings', 50000],
      ]),
      activity: new Map([
        ['c-groceries', -31200],
        ['c-dining', -7800],
        ['c-rent', -180000],
      ]),
    }));

    const cf1 = getCarryForward(month1);
    const os1 = getTotalOverspent(month1);

    // Month 2 with spending
    const month2 = calculateMonthBudget(makeInput({
      month: '2026-03',
      totalIncome: 500000,
      allocations: new Map([
        ['c-rent', 180000],
        ['c-groceries', 50000],
        ['c-dining', 20000],
        ['c-savings', 50000],
      ]),
      activity: new Map([
        ['c-groceries', -45000],  // $450 — overspent
        ['c-dining', -15000],
        ['c-rent', -180000],
      ]),
      carryForwards: cf1,
      overspentLastMonth: os1,
    }));

    // Groceries: carry 18800 + allocate 50000 + activity -45000 = 23800
    const groceries2 = month2.groups
      .flatMap((g) => g.categories)
      .find((c) => c.categoryId === 'c-groceries')!;
    expect(groceries2.available).toBe(23800);

    // Rent: carry 0 (spent exactly) + allocate 180000 + activity -180000 = 0
    const rent2 = month2.groups
      .flatMap((g) => g.categories)
      .find((c) => c.categoryId === 'c-rent')!;
    expect(rent2.available).toBe(0);

    // Dining: carry 12200 + allocate 20000 + activity -15000 = 17200
    const dining2 = month2.groups
      .flatMap((g) => g.categories)
      .find((c) => c.categoryId === 'c-dining')!;
    expect(dining2.available).toBe(17200);

    // Savings: cumulative 100000 after two months
    const savings2 = month2.groups
      .flatMap((g) => g.categories)
      .find((c) => c.categoryId === 'c-savings')!;
    expect(savings2.available).toBe(100000);
  });

  it('Overspending carries as negative and reduces next month Ready to Assign', () => {
    // Month 1: overspend Dining by $80
    const month1 = calculateMonthBudget(makeInput({
      month: '2026-02',
      totalIncome: 500000,
      allocations: new Map([
        ['c-dining', 20000],  // $200
      ]),
      activity: new Map([
        ['c-dining', -28000], // -$280 (overspent by $80)
      ]),
    }));

    const dining1 = month1.groups
      .flatMap((g) => g.categories)
      .find((c) => c.categoryId === 'c-dining')!;
    expect(dining1.available).toBe(-8000); // -$80 overspent

    expect(month1.totalOverspent).toBe(8000);

    const cf = getCarryForward(month1);
    expect(cf.get('c-dining')).toBe(-8000);

    // Month 2: overspent last month reduces Ready to Assign
    const month2 = calculateMonthBudget(makeInput({
      month: '2026-03',
      totalIncome: 500000,
      allocations: new Map([
        ['c-dining', 20000],
      ]),
      carryForwards: cf,
      overspentLastMonth: getTotalOverspent(month1),
    }));

    // Ready to Assign = 500000 - 20000 - 8000 = 472000
    expect(month2.readyToAssign).toBe(472000);

    // Dining: carry -8000 + allocate 20000 = 12000
    const dining2 = month2.groups
      .flatMap((g) => g.categories)
      .find((c) => c.categoryId === 'c-dining')!;
    expect(dining2.available).toBe(12000);
  });

  it('Move money between categories adjusts allocations', () => {
    const { fromDelta, toDelta } = moveMoneyBetweenCategories('c-dining', 'c-groceries', 5000);

    expect(fromDelta).toBe(-5000);
    expect(toDelta).toBe(5000);

    // Simulate: Dining had 20000, Groceries had 50000
    const allocations = new Map([
      ['c-dining', 20000 + fromDelta],     // 15000
      ['c-groceries', 50000 + toDelta],    // 55000
    ]);

    const state = calculateMonthBudget(makeInput({
      month: '2026-02',
      totalIncome: 500000,
      allocations,
    }));

    const dining = state.groups
      .flatMap((g) => g.categories)
      .find((c) => c.categoryId === 'c-dining')!;
    expect(dining.available).toBe(15000);

    const groceries = state.groups
      .flatMap((g) => g.categories)
      .find((c) => c.categoryId === 'c-groceries')!;
    expect(groceries.available).toBe(55000);
  });

  it('Over-allocation produces negative Ready to Assign', () => {
    const allocations = new Map([
      ['c-rent', 180000],
      ['c-groceries', 50000],
      ['c-dining', 20000],
      ['c-utilities', 15000],
      ['c-transport', 10000],
      ['c-savings', 300000], // over-allocate
    ]);

    const state = calculateMonthBudget(makeInput({
      month: '2026-02',
      totalIncome: 500000,
      allocations,
    }));

    // Total allocated: 575000, income: 500000
    expect(state.totalAllocated).toBe(575000);
    expect(state.readyToAssign).toBe(-75000); // over-assigned by $750
  });

  it('Savings goal target progress accumulates across months', () => {
    // Month 1: allocate $500 to savings
    const month1 = calculateMonthBudget(makeInput({
      month: '2026-01',
      totalIncome: 500000,
      allocations: new Map([['c-savings', 50000]]),
    }));

    const savings1 = month1.groups
      .flatMap((g) => g.categories)
      .find((c) => c.categoryId === 'c-savings')!;
    expect(savings1.available).toBe(50000);
    expect(savings1.targetProgress).toBe(5); // 50000 / 1000000 = 5%

    // Month 2: another $500
    const month2 = calculateMonthBudget(makeInput({
      month: '2026-02',
      totalIncome: 500000,
      allocations: new Map([['c-savings', 50000]]),
      carryForwards: getCarryForward(month1),
    }));

    const savings2 = month2.groups
      .flatMap((g) => g.categories)
      .find((c) => c.categoryId === 'c-savings')!;
    expect(savings2.available).toBe(100000);
    expect(savings2.targetProgress).toBe(10); // 100000 / 1000000 = 10%

    // Month 3: another $500
    const month3 = calculateMonthBudget(makeInput({
      month: '2026-03',
      totalIncome: 500000,
      allocations: new Map([['c-savings', 50000]]),
      carryForwards: getCarryForward(month2),
    }));

    const savings3 = month3.groups
      .flatMap((g) => g.categories)
      .find((c) => c.categoryId === 'c-savings')!;
    expect(savings3.available).toBe(150000);
    expect(savings3.targetProgress).toBe(15); // 150000 / 1000000 = 15%
  });

  it('Monthly target progress is based on allocation, not available', () => {
    const state = calculateMonthBudget(makeInput({
      month: '2026-02',
      totalIncome: 500000,
      allocations: new Map([['c-rent', 90000]]), // only half allocated
      carryForwards: new Map([['c-rent', 50000]]), // has carry-forward
    }));

    const rent = state.groups
      .flatMap((g) => g.categories)
      .find((c) => c.categoryId === 'c-rent')!;
    expect(rent.available).toBe(140000); // carry 50000 + allocated 90000
    expect(rent.targetProgress).toBe(50); // 90000 / 180000 = 50% (based on allocation, not available)
  });

  it('Zero income month with only carry-forward', () => {
    const carryForwards = new Map([
      ['c-groceries', 18800],
      ['c-dining', 12200],
    ]);

    const state = calculateMonthBudget(makeInput({
      month: '2026-03',
      totalIncome: 0,
      carryForwards,
    }));

    expect(state.readyToAssign).toBe(0);

    const groceries = state.groups
      .flatMap((g) => g.categories)
      .find((c) => c.categoryId === 'c-groceries')!;
    expect(groceries.available).toBe(18800);

    const dining = state.groups
      .flatMap((g) => g.categories)
      .find((c) => c.categoryId === 'c-dining')!;
    expect(dining.available).toBe(12200);
  });

  it('Inflow (refund) increases category available', () => {
    const state = calculateMonthBudget(makeInput({
      month: '2026-02',
      totalIncome: 500000,
      allocations: new Map([['c-groceries', 50000]]),
      activity: new Map([
        ['c-groceries', -31200 + 5000], // spent $312, got $50 refund = net -$262
      ]),
    }));

    const groceries = state.groups
      .flatMap((g) => g.categories)
      .find((c) => c.categoryId === 'c-groceries')!;
    expect(groceries.activity).toBe(-26200);
    expect(groceries.available).toBe(23800); // 50000 - 26200
  });
});
