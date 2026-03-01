/**
 * TDD tests for the goals engine.
 *
 * Goals extend the existing target system with richer tracking: due dates,
 * monthly contribution suggestions, progress visualization, and goal
 * completion detection. Goals are linked to categories via targetType
 * and targetAmount, plus new goal-specific metadata.
 *
 * All amounts in integer cents.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateGoalProgress,
  suggestMonthlyContribution,
  isGoalOnTrack,
  getGoalStatus,
  calculateGoalProjection,
  type Goal,
  type GoalProgress,
  type GoalStatus,
} from '../goals';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    categoryId: 'cat-1',
    name: 'Emergency Fund',
    targetAmount: 1000000, // $10,000
    currentAmount: 0,
    targetDate: '2026-12-31',
    createdDate: '2026-01-01',
    monthlyContribution: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// calculateGoalProgress
// ---------------------------------------------------------------------------

describe('calculateGoalProgress', () => {
  it('calculates percentage progress toward target', () => {
    const goal = makeGoal({ targetAmount: 1000000, currentAmount: 250000 });
    const progress = calculateGoalProgress(goal);

    expect(progress.percentage).toBe(25);
    expect(progress.remaining).toBe(750000);
    expect(progress.currentAmount).toBe(250000);
    expect(progress.targetAmount).toBe(1000000);
  });

  it('returns 0% for zero current amount', () => {
    const goal = makeGoal({ currentAmount: 0 });
    const progress = calculateGoalProgress(goal);

    expect(progress.percentage).toBe(0);
    expect(progress.remaining).toBe(1000000);
  });

  it('returns 100% when goal is fully funded', () => {
    const goal = makeGoal({ targetAmount: 500000, currentAmount: 500000 });
    const progress = calculateGoalProgress(goal);

    expect(progress.percentage).toBe(100);
    expect(progress.remaining).toBe(0);
  });

  it('allows progress to exceed 100% (overfunded)', () => {
    const goal = makeGoal({ targetAmount: 500000, currentAmount: 600000 });
    const progress = calculateGoalProgress(goal);

    expect(progress.percentage).toBe(120);
    expect(progress.remaining).toBe(0); // no remaining, overfunded
  });

  it('handles zero target amount gracefully', () => {
    const goal = makeGoal({ targetAmount: 0, currentAmount: 0 });
    const progress = calculateGoalProgress(goal);

    expect(progress.percentage).toBe(100); // trivially complete
    expect(progress.remaining).toBe(0);
  });

  it('uses integer cents throughout (no floating point)', () => {
    const goal = makeGoal({ targetAmount: 333333, currentAmount: 111111 });
    const progress = calculateGoalProgress(goal);

    // 111111 / 333333 = 33.33...%, should round to integer
    expect(progress.percentage).toBe(33);
    expect(progress.remaining).toBe(222222);
    expect(Number.isInteger(progress.remaining)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// suggestMonthlyContribution
// ---------------------------------------------------------------------------

describe('suggestMonthlyContribution', () => {
  it('divides remaining evenly across remaining months', () => {
    const goal = makeGoal({
      targetAmount: 1200000, // $12,000
      currentAmount: 0,
      targetDate: '2027-01-01',
    });

    // From 2026-01-01 to 2027-01-01 = 12 months
    const suggestion = suggestMonthlyContribution(goal, '2026-01-01');
    expect(suggestion).toBe(100000); // $1,000/month
  });

  it('adjusts for already-saved amount', () => {
    const goal = makeGoal({
      targetAmount: 1200000,
      currentAmount: 600000, // already half saved
      targetDate: '2027-01-01',
    });

    const suggestion = suggestMonthlyContribution(goal, '2026-07-01');
    // 600000 remaining / 6 months = 100000
    expect(suggestion).toBe(100000);
  });

  it('returns zero when goal is already met', () => {
    const goal = makeGoal({
      targetAmount: 500000,
      currentAmount: 500000,
    });

    const suggestion = suggestMonthlyContribution(goal, '2026-06-01');
    expect(suggestion).toBe(0);
  });

  it('returns full remaining amount when target date is this month', () => {
    const goal = makeGoal({
      targetAmount: 500000,
      currentAmount: 300000,
      targetDate: '2026-02-28',
    });

    const suggestion = suggestMonthlyContribution(goal, '2026-02-01');
    expect(suggestion).toBe(200000); // all remaining, due this month
  });

  it('returns full remaining amount when target date is past', () => {
    const goal = makeGoal({
      targetAmount: 500000,
      currentAmount: 300000,
      targetDate: '2026-01-31',
    });

    const suggestion = suggestMonthlyContribution(goal, '2026-02-15');
    expect(suggestion).toBe(200000);
  });

  it('handles no target date (open-ended goal)', () => {
    const goal = makeGoal({
      targetAmount: 1000000,
      currentAmount: 0,
      targetDate: null as unknown as string,
    });

    // Without a target date, should return null or a sensible default
    const suggestion = suggestMonthlyContribution(goal, '2026-02-01');
    expect(suggestion).toBeNull();
  });

  it('rounds up to nearest cent', () => {
    const goal = makeGoal({
      targetAmount: 100000, // $1,000
      currentAmount: 0,
      targetDate: '2026-04-01',
    });

    // 100000 / 3 months = 33333.33... -> should round up to 33334
    const suggestion = suggestMonthlyContribution(goal, '2026-01-01');
    expect(suggestion).toBe(33334); // rounds up so user always meets goal
  });
});

// ---------------------------------------------------------------------------
// isGoalOnTrack
// ---------------------------------------------------------------------------

describe('isGoalOnTrack', () => {
  it('returns true when progress matches or exceeds time elapsed', () => {
    const goal = makeGoal({
      targetAmount: 1200000,
      currentAmount: 600000, // 50% saved
      targetDate: '2027-01-01',
      createdDate: '2026-01-01',
    });

    // At 2026-07-01 = 50% of time elapsed, 50% saved -> on track
    expect(isGoalOnTrack(goal, '2026-07-01')).toBe(true);
  });

  it('returns false when behind schedule', () => {
    const goal = makeGoal({
      targetAmount: 1200000,
      currentAmount: 100000, // only 8.3% saved
      targetDate: '2027-01-01',
      createdDate: '2026-01-01',
    });

    // At 2026-07-01 = 50% of time elapsed, only 8.3% saved -> behind
    expect(isGoalOnTrack(goal, '2026-07-01')).toBe(false);
  });

  it('returns true when goal is completed', () => {
    const goal = makeGoal({
      targetAmount: 500000,
      currentAmount: 500000,
      targetDate: '2026-12-31',
    });

    expect(isGoalOnTrack(goal, '2026-03-01')).toBe(true);
  });

  it('returns true when ahead of schedule', () => {
    const goal = makeGoal({
      targetAmount: 1200000,
      currentAmount: 900000, // 75% saved
      targetDate: '2027-01-01',
      createdDate: '2026-01-01',
    });

    // At 2026-07-01 = 50% elapsed, 75% saved -> ahead
    expect(isGoalOnTrack(goal, '2026-07-01')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getGoalStatus
// ---------------------------------------------------------------------------

describe('getGoalStatus', () => {
  it('returns "completed" when fully funded', () => {
    const goal = makeGoal({ targetAmount: 500000, currentAmount: 500000 });
    expect(getGoalStatus(goal, '2026-06-01')).toBe('completed');
  });

  it('returns "on_track" when progress matches timeline', () => {
    const goal = makeGoal({
      targetAmount: 1200000,
      currentAmount: 600000,
      targetDate: '2027-01-01',
      createdDate: '2026-01-01',
    });
    expect(getGoalStatus(goal, '2026-07-01')).toBe('on_track');
  });

  it('returns "behind" when behind schedule', () => {
    const goal = makeGoal({
      targetAmount: 1200000,
      currentAmount: 100000,
      targetDate: '2027-01-01',
      createdDate: '2026-01-01',
    });
    expect(getGoalStatus(goal, '2026-07-01')).toBe('behind');
  });

  it('returns "overdue" when past target date and not funded', () => {
    const goal = makeGoal({
      targetAmount: 500000,
      currentAmount: 200000,
      targetDate: '2026-01-31',
    });
    expect(getGoalStatus(goal, '2026-02-15')).toBe('overdue');
  });

  it('returns "completed" even if past target date when fully funded', () => {
    const goal = makeGoal({
      targetAmount: 500000,
      currentAmount: 500000,
      targetDate: '2026-01-31',
    });
    expect(getGoalStatus(goal, '2026-02-15')).toBe('completed');
  });
});

// ---------------------------------------------------------------------------
// calculateGoalProjection
// ---------------------------------------------------------------------------

describe('calculateGoalProjection', () => {
  it('projects completion date based on monthly contribution', () => {
    const goal = makeGoal({
      targetAmount: 1000000,
      currentAmount: 400000,
      monthlyContribution: 100000,
    });

    const projection = calculateGoalProjection(goal, '2026-02-01');
    // 600000 remaining / 100000 per month = 6 months -> 2026-08-01
    expect(projection.projectedDate).toBe('2026-08-01');
    expect(projection.monthsRemaining).toBe(6);
  });

  it('returns current month when already funded', () => {
    const goal = makeGoal({
      targetAmount: 500000,
      currentAmount: 600000,
      monthlyContribution: 100000,
    });

    const projection = calculateGoalProjection(goal, '2026-02-01');
    expect(projection.projectedDate).toBe('2026-02-01');
    expect(projection.monthsRemaining).toBe(0);
  });

  it('returns null date when monthly contribution is zero', () => {
    const goal = makeGoal({
      targetAmount: 1000000,
      currentAmount: 0,
      monthlyContribution: 0,
    });

    const projection = calculateGoalProjection(goal, '2026-02-01');
    expect(projection.projectedDate).toBeNull();
    expect(projection.monthsRemaining).toBeNull();
  });

  it('rounds up months for partial amounts', () => {
    const goal = makeGoal({
      targetAmount: 1000000,
      currentAmount: 0,
      monthlyContribution: 300000,
    });

    // 1000000 / 300000 = 3.33 months -> ceil to 4
    const projection = calculateGoalProjection(goal, '2026-02-01');
    expect(projection.monthsRemaining).toBe(4);
    expect(projection.projectedDate).toBe('2026-06-01');
  });

  it('indicates if projection meets target date', () => {
    const goal = makeGoal({
      targetAmount: 1200000,
      currentAmount: 0,
      monthlyContribution: 100000,
      targetDate: '2026-12-31',
    });

    const projection = calculateGoalProjection(goal, '2026-01-01');
    // 12 months of 100000 = 1200000 -> just makes it
    expect(projection.meetsTargetDate).toBe(true);
  });

  it('indicates when projection misses target date', () => {
    const goal = makeGoal({
      targetAmount: 1200000,
      currentAmount: 0,
      monthlyContribution: 50000, // too slow
      targetDate: '2026-12-31',
    });

    const projection = calculateGoalProjection(goal, '2026-01-01');
    // 24 months needed, but only 12 remain
    expect(projection.meetsTargetDate).toBe(false);
  });
});
