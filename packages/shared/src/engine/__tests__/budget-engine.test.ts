import { describe, it, expect } from 'vitest';
import {
  calculateMonthBudget,
  getCarryForward,
  getTotalOverspent,
  moveMoneyBetweenCategories,
} from '../budget';
import type { MonthBudgetInput } from '../budget';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Shorthand to build a minimal MonthBudgetInput with one group and N categories. */
function buildInput(
  overrides: Partial<MonthBudgetInput> & {
    categories?: Array<{
      categoryId: string;
      name: string;
      emoji?: string | null;
      targetAmount?: number | null;
      targetType?: string | null;
    }>;
  } = {},
): MonthBudgetInput {
  const {
    categories = [
      { categoryId: 'cat-1', name: 'Groceries' },
      { categoryId: 'cat-2', name: 'Rent' },
    ],
    ...rest
  } = overrides;

  return {
    month: '2026-02',
    groups: [
      {
        groupId: 'group-1',
        name: 'Essentials',
        categories: categories.map((c) => ({
          emoji: null,
          targetAmount: null,
          targetType: null,
          ...c,
        })),
      },
    ],
    allocations: new Map(),
    activity: new Map(),
    carryForwards: new Map(),
    totalIncome: 0,
    overspentLastMonth: 0,
    ...rest,
  };
}

function findCategory(
  state: ReturnType<typeof calculateMonthBudget>,
  categoryId: string,
) {
  for (const group of state.groups) {
    const cat = group.categories.find((c) => c.categoryId === categoryId);
    if (cat) return cat;
  }
  throw new Error(`Category ${categoryId} not found in budget state`);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('calculateMonthBudget', () => {
  it('returns zero state when no allocations, activity, or income', () => {
    const state = calculateMonthBudget(buildInput());

    expect(state.month).toBe('2026-02');
    expect(state.totalIncome).toBe(0);
    expect(state.totalAllocated).toBe(0);
    expect(state.totalActivity).toBe(0);
    expect(state.totalOverspent).toBe(0);
    expect(state.readyToAssign).toBe(0);

    const groceries = findCategory(state, 'cat-1');
    expect(groceries.allocated).toBe(0);
    expect(groceries.activity).toBe(0);
    expect(groceries.carryForward).toBe(0);
    expect(groceries.available).toBe(0);
  });

  it('allocates income to a category and computes available balance', () => {
    const state = calculateMonthBudget(
      buildInput({
        totalIncome: 500000, // $5000
        allocations: new Map([['cat-1', 30000]]), // $300 to Groceries
      }),
    );

    const groceries = findCategory(state, 'cat-1');
    expect(groceries.allocated).toBe(30000);
    expect(groceries.available).toBe(30000); // no activity, no carry
    expect(state.totalAllocated).toBe(30000);
    expect(state.readyToAssign).toBe(470000); // 5000 - 300 = 4700
  });

  it('computes available = carryForward + allocated + activity', () => {
    const state = calculateMonthBudget(
      buildInput({
        totalIncome: 500000,
        allocations: new Map([['cat-1', 30000]]),
        activity: new Map([['cat-1', -15000]]), // spent $150
        carryForwards: new Map([['cat-1', 5000]]), // $50 from last month
      }),
    );

    const groceries = findCategory(state, 'cat-1');
    // available = 5000 + 30000 + (-15000) = 20000
    expect(groceries.available).toBe(20000);
    expect(groceries.carryForward).toBe(5000);
    expect(groceries.activity).toBe(-15000);
  });

  it('carries forward underspent surplus to next month via getCarryForward', () => {
    const month1 = calculateMonthBudget(
      buildInput({
        month: '2026-01',
        totalIncome: 500000,
        allocations: new Map([['cat-1', 30000]]),
        activity: new Map([['cat-1', -20000]]), // spent only $200
      }),
    );

    // Groceries available = 0 + 30000 + (-20000) = 10000 ($100 surplus)
    expect(findCategory(month1, 'cat-1').available).toBe(10000);

    const carryForwards = getCarryForward(month1);
    expect(carryForwards.get('cat-1')).toBe(10000);

    // Month 2 uses carry-forward from month 1
    const month2 = calculateMonthBudget(
      buildInput({
        month: '2026-02',
        totalIncome: 500000,
        allocations: new Map([['cat-1', 30000]]),
        activity: new Map([['cat-1', -25000]]),
        carryForwards,
      }),
    );

    // available = 10000 + 30000 + (-25000) = 15000
    expect(findCategory(month2, 'cat-1').available).toBe(15000);
  });

  it('tracks overspending and reduces Ready to Assign via overspentLastMonth', () => {
    const month1 = calculateMonthBudget(
      buildInput({
        month: '2026-01',
        totalIncome: 500000,
        allocations: new Map([['cat-1', 20000]]),
        activity: new Map([['cat-1', -35000]]), // overspent by $150
      }),
    );

    // available = 0 + 20000 + (-35000) = -15000
    expect(findCategory(month1, 'cat-1').available).toBe(-15000);
    expect(month1.totalOverspent).toBe(15000);
    expect(getTotalOverspent(month1)).toBe(15000);

    // Month 2: last month's overspend reduces Ready to Assign
    const month2 = calculateMonthBudget(
      buildInput({
        month: '2026-02',
        totalIncome: 500000,
        overspentLastMonth: 15000,
      }),
    );

    // readyToAssign = 500000 - 0 - 15000 = 485000
    expect(month2.readyToAssign).toBe(485000);
  });

  it('computes Ready to Assign = totalIncome - totalAllocated - overspentLastMonth', () => {
    const state = calculateMonthBudget(
      buildInput({
        totalIncome: 600000, // $6000
        allocations: new Map([
          ['cat-1', 30000],
          ['cat-2', 150000],
        ]),
        overspentLastMonth: 5000, // $50 overspent last month
      }),
    );

    // readyToAssign = 600000 - 180000 - 5000 = 415000
    expect(state.totalAllocated).toBe(180000);
    expect(state.readyToAssign).toBe(415000);
  });

  it('allows allocating more than available (negative Ready to Assign)', () => {
    const state = calculateMonthBudget(
      buildInput({
        totalIncome: 100000, // $1000
        allocations: new Map([
          ['cat-1', 60000],
          ['cat-2', 80000],
        ]),
      }),
    );

    // readyToAssign = 100000 - 140000 - 0 = -40000
    expect(state.totalAllocated).toBe(140000);
    expect(state.readyToAssign).toBe(-40000);
  });

  it('aggregates group totals correctly across multiple categories', () => {
    const state = calculateMonthBudget(
      buildInput({
        totalIncome: 500000,
        allocations: new Map([
          ['cat-1', 30000],
          ['cat-2', 150000],
        ]),
        activity: new Map([
          ['cat-1', -20000],
          ['cat-2', -140000],
        ]),
      }),
    );

    const group = state.groups[0];
    expect(group.allocated).toBe(180000);
    expect(group.activity).toBe(-160000);
    // available = (30000-20000) + (150000-140000) = 10000 + 10000 = 20000
    expect(group.available).toBe(20000);
  });

  it('handles multiple groups with separate categories', () => {
    const input: MonthBudgetInput = {
      month: '2026-03',
      groups: [
        {
          groupId: 'g1',
          name: 'Essentials',
          categories: [
            { categoryId: 'c1', name: 'Rent', emoji: null, targetAmount: null, targetType: null },
          ],
        },
        {
          groupId: 'g2',
          name: 'Fun',
          categories: [
            { categoryId: 'c2', name: 'Dining', emoji: null, targetAmount: null, targetType: null },
          ],
        },
      ],
      allocations: new Map([
        ['c1', 150000],
        ['c2', 20000],
      ]),
      activity: new Map([['c2', -15000]]),
      carryForwards: new Map(),
      totalIncome: 400000,
      overspentLastMonth: 0,
    };

    const state = calculateMonthBudget(input);

    expect(state.groups).toHaveLength(2);
    expect(state.groups[0].allocated).toBe(150000);
    expect(state.groups[0].available).toBe(150000);
    expect(state.groups[1].allocated).toBe(20000);
    expect(state.groups[1].available).toBe(5000); // 20000 - 15000
    expect(state.totalAllocated).toBe(170000);
    expect(state.readyToAssign).toBe(230000); // 400000 - 170000
  });

  it('handles multiple months of carry-forward chained together', () => {
    // Month 1: allocate $300, spend $200 -> $100 surplus
    const m1 = calculateMonthBudget(
      buildInput({
        month: '2026-01',
        totalIncome: 500000,
        allocations: new Map([['cat-1', 30000]]),
        activity: new Map([['cat-1', -20000]]),
      }),
    );
    const cf1 = getCarryForward(m1);
    expect(cf1.get('cat-1')).toBe(10000);

    // Month 2: allocate $300, spend $350 -> carry $100 + $300 - $350 = $50 surplus
    const m2 = calculateMonthBudget(
      buildInput({
        month: '2026-02',
        totalIncome: 500000,
        allocations: new Map([['cat-1', 30000]]),
        activity: new Map([['cat-1', -35000]]),
        carryForwards: cf1,
      }),
    );
    const cf2 = getCarryForward(m2);
    // available = 10000 + 30000 + (-35000) = 5000
    expect(cf2.get('cat-1')).toBe(5000);

    // Month 3: allocate $300, spend $200 -> carry $50 + $300 - $200 = $150
    const m3 = calculateMonthBudget(
      buildInput({
        month: '2026-03',
        totalIncome: 500000,
        allocations: new Map([['cat-1', 30000]]),
        activity: new Map([['cat-1', -20000]]),
        carryForwards: cf2,
      }),
    );
    // available = 5000 + 30000 + (-20000) = 15000
    expect(findCategory(m3, 'cat-1').available).toBe(15000);
  });

  it('counts overspent only from categories with negative available', () => {
    const state = calculateMonthBudget(
      buildInput({
        totalIncome: 500000,
        allocations: new Map([
          ['cat-1', 30000],
          ['cat-2', 10000],
        ]),
        activity: new Map([
          ['cat-1', -20000], // cat-1 available = 10000 (positive)
          ['cat-2', -25000], // cat-2 available = -15000 (negative)
        ]),
      }),
    );

    expect(findCategory(state, 'cat-1').available).toBe(10000);
    expect(findCategory(state, 'cat-2').available).toBe(-15000);
    // Only cat-2 is overspent
    expect(state.totalOverspent).toBe(15000);
  });

  it('handles empty groups (no categories)', () => {
    const input: MonthBudgetInput = {
      month: '2026-01',
      groups: [{ groupId: 'g1', name: 'Empty', categories: [] }],
      allocations: new Map(),
      activity: new Map(),
      carryForwards: new Map(),
      totalIncome: 500000,
      overspentLastMonth: 0,
    };

    const state = calculateMonthBudget(input);
    expect(state.groups[0].allocated).toBe(0);
    expect(state.groups[0].activity).toBe(0);
    expect(state.groups[0].available).toBe(0);
    expect(state.readyToAssign).toBe(500000);
  });

  it('handles categories with no matching allocations or activity', () => {
    const state = calculateMonthBudget(
      buildInput({
        totalIncome: 500000,
        allocations: new Map([['cat-1', 30000]]),
        // cat-2 has no allocation or activity
      }),
    );

    const rent = findCategory(state, 'cat-2');
    expect(rent.allocated).toBe(0);
    expect(rent.activity).toBe(0);
    expect(rent.available).toBe(0);
  });

  it('handles positive activity (inflows/refunds)', () => {
    const state = calculateMonthBudget(
      buildInput({
        totalIncome: 500000,
        allocations: new Map([['cat-1', 30000]]),
        activity: new Map([['cat-1', 5000]]), // $50 refund
      }),
    );

    const groceries = findCategory(state, 'cat-1');
    // available = 0 + 30000 + 5000 = 35000
    expect(groceries.available).toBe(35000);
  });
});

describe('calculateMonthBudget — target progress', () => {
  it('computes monthly target progress based on allocation', () => {
    const state = calculateMonthBudget(
      buildInput({
        totalIncome: 500000,
        categories: [
          { categoryId: 'cat-1', name: 'Groceries', targetAmount: 40000, targetType: 'monthly' },
        ],
        allocations: new Map([['cat-1', 30000]]), // 75% of target
      }),
    );

    const groceries = findCategory(state, 'cat-1');
    expect(groceries.targetProgress).toBe(75); // 30000/40000 * 100
  });

  it('computes savings goal progress based on available (cumulative)', () => {
    const state = calculateMonthBudget(
      buildInput({
        totalIncome: 500000,
        categories: [
          { categoryId: 'cat-1', name: 'Vacation', targetAmount: 100000, targetType: 'savings_goal' },
        ],
        allocations: new Map([['cat-1', 30000]]),
        carryForwards: new Map([['cat-1', 20000]]), // $200 saved previously
      }),
    );

    const vacation = findCategory(state, 'cat-1');
    // available = 20000 + 30000 + 0 = 50000
    // progress = 50000/100000 * 100 = 50%
    expect(vacation.targetProgress).toBe(50);
  });

  it('allows target progress to exceed 100 for overfunded categories', () => {
    const state = calculateMonthBudget(
      buildInput({
        totalIncome: 500000,
        categories: [
          { categoryId: 'cat-1', name: 'Groceries', targetAmount: 20000, targetType: 'monthly' },
        ],
        allocations: new Map([['cat-1', 30000]]), // 150% funded
      }),
    );

    expect(findCategory(state, 'cat-1').targetProgress).toBe(150);
  });

  it('returns null targetProgress when no target is set', () => {
    const state = calculateMonthBudget(
      buildInput({
        totalIncome: 500000,
        allocations: new Map([['cat-1', 30000]]),
      }),
    );

    expect(findCategory(state, 'cat-1').targetProgress).toBeNull();
  });

  it('returns null targetProgress when target is zero', () => {
    const state = calculateMonthBudget(
      buildInput({
        totalIncome: 500000,
        categories: [
          { categoryId: 'cat-1', name: 'Groceries', targetAmount: 0, targetType: 'monthly' },
        ],
        allocations: new Map([['cat-1', 30000]]),
      }),
    );

    expect(findCategory(state, 'cat-1').targetProgress).toBeNull();
  });

  it('computes debt_payment progress based on allocation', () => {
    const state = calculateMonthBudget(
      buildInput({
        totalIncome: 500000,
        categories: [
          { categoryId: 'cat-1', name: 'CC Payment', targetAmount: 50000, targetType: 'debt_payment' },
        ],
        allocations: new Map([['cat-1', 25000]]),
      }),
    );

    expect(findCategory(state, 'cat-1').targetProgress).toBe(50);
  });
});

describe('getCarryForward', () => {
  it('returns a map of categoryId to available', () => {
    const state = calculateMonthBudget(
      buildInput({
        totalIncome: 500000,
        allocations: new Map([
          ['cat-1', 30000],
          ['cat-2', 10000],
        ]),
        activity: new Map([
          ['cat-1', -20000],
          ['cat-2', -15000],
        ]),
      }),
    );

    const cf = getCarryForward(state);
    expect(cf.get('cat-1')).toBe(10000); // 30000 - 20000
    expect(cf.get('cat-2')).toBe(-5000); // 10000 - 15000
    expect(cf.size).toBe(2);
  });

  it('includes categories with zero available', () => {
    const state = calculateMonthBudget(
      buildInput({
        totalIncome: 500000,
        allocations: new Map([['cat-1', 20000]]),
        activity: new Map([['cat-1', -20000]]),
      }),
    );

    const cf = getCarryForward(state);
    expect(cf.get('cat-1')).toBe(0);
    expect(cf.get('cat-2')).toBe(0); // no allocation or activity
  });
});

describe('getTotalOverspent', () => {
  it('returns totalOverspent from budget state', () => {
    const state = calculateMonthBudget(
      buildInput({
        totalIncome: 500000,
        allocations: new Map([['cat-1', 10000]]),
        activity: new Map([['cat-1', -25000]]),
      }),
    );

    // available = 10000 - 25000 = -15000
    expect(getTotalOverspent(state)).toBe(15000);
  });

  it('returns zero when nothing is overspent', () => {
    const state = calculateMonthBudget(
      buildInput({
        totalIncome: 500000,
        allocations: new Map([['cat-1', 30000]]),
        activity: new Map([['cat-1', -20000]]),
      }),
    );

    expect(getTotalOverspent(state)).toBe(0);
  });
});

describe('moveMoneyBetweenCategories', () => {
  it('returns correct deltas for a move', () => {
    const result = moveMoneyBetweenCategories('cat-1', 'cat-2', 15000);
    expect(result.fromDelta).toBe(-15000);
    expect(result.toDelta).toBe(15000);
  });

  it('throws when amount is zero', () => {
    expect(() => moveMoneyBetweenCategories('cat-1', 'cat-2', 0)).toThrow(
      'Move amount must be positive',
    );
  });

  it('throws when amount is negative', () => {
    expect(() => moveMoneyBetweenCategories('cat-1', 'cat-2', -5000)).toThrow(
      'Move amount must be positive',
    );
  });

  it('throws when moving to the same category', () => {
    expect(() => moveMoneyBetweenCategories('cat-1', 'cat-1', 15000)).toThrow(
      'Cannot move money to the same category',
    );
  });

  it('works with very small amounts (1 cent)', () => {
    const result = moveMoneyBetweenCategories('cat-1', 'cat-2', 1);
    expect(result.fromDelta).toBe(-1);
    expect(result.toDelta).toBe(1);
  });

  it('works with large amounts', () => {
    const result = moveMoneyBetweenCategories('cat-1', 'cat-2', 99999999);
    expect(result.fromDelta).toBe(-99999999);
    expect(result.toDelta).toBe(99999999);
  });
});
