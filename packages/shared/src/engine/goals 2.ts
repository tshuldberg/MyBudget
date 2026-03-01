/**
 * Goal tracking engine.
 *
 * Goals extend the existing budget target system with richer tracking:
 * due dates, monthly contribution suggestions, progress visualization,
 * and goal completion detection.
 *
 * All amounts in integer cents.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Goal {
  id: string;
  categoryId: string;
  name: string;
  targetAmount: number;        // cents
  currentAmount: number;       // cents
  targetDate: string | null;   // YYYY-MM-DD or null for open-ended
  createdDate: string;         // YYYY-MM-DD
  monthlyContribution: number; // cents
}

export interface GoalProgress {
  percentage: number;      // 0-100+ (can exceed 100 if overfunded)
  remaining: number;       // cents, 0 if overfunded
  currentAmount: number;   // cents
  targetAmount: number;    // cents
}

export type GoalStatus = 'completed' | 'on_track' | 'behind' | 'overdue';

export interface GoalProjection {
  projectedDate: string | null;   // YYYY-MM-DD
  monthsRemaining: number | null;
  meetsTargetDate: boolean | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function diffMonths(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

function diffDays(from: string, to: string): number {
  const f = new Date(from);
  const t = new Date(to);
  return Math.round((t.getTime() - f.getTime()) / (1000 * 60 * 60 * 24));
}

function addMonths(dateStr: string, months: number): string {
  const [y, m] = dateStr.split('-').map(Number);
  const d = parseInt(dateStr.split('-')[2], 10);
  let newMonth = m + months;
  let newYear = y;
  while (newMonth > 12) {
    newMonth -= 12;
    newYear++;
  }
  while (newMonth < 1) {
    newMonth += 12;
    newYear--;
  }
  const daysInMonth = new Date(newYear, newMonth, 0).getDate();
  const clampedDay = Math.min(d, daysInMonth);
  return `${newYear}-${String(newMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Calculate progress toward a goal.
 */
export function calculateGoalProgress(goal: Goal): GoalProgress {
  if (goal.targetAmount === 0) {
    return {
      percentage: 100,
      remaining: 0,
      currentAmount: goal.currentAmount,
      targetAmount: goal.targetAmount,
    };
  }

  const percentage = Math.round((goal.currentAmount / goal.targetAmount) * 100);
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

  return {
    percentage,
    remaining,
    currentAmount: goal.currentAmount,
    targetAmount: goal.targetAmount,
  };
}

/**
 * Suggest how much to contribute monthly to hit the target by the target date.
 * Returns null for open-ended goals (no target date).
 * Rounds up so the user always meets or exceeds the goal.
 */
export function suggestMonthlyContribution(
  goal: Goal,
  today: string,
): number | null {
  // Already met
  if (goal.currentAmount >= goal.targetAmount) return 0;

  // No target date = open-ended
  if (!goal.targetDate) return null;

  const remaining = goal.targetAmount - goal.currentAmount;
  const monthsLeft = diffMonths(today, goal.targetDate);

  // Target date is in this month or past
  if (monthsLeft <= 0) return remaining;

  return Math.ceil(remaining / monthsLeft);
}

/**
 * Check whether the goal is on track to meet its target date.
 * A goal is on track if saved percentage >= elapsed time percentage.
 * Completed goals are always on track.
 */
export function isGoalOnTrack(
  goal: Goal,
  today: string,
): boolean {
  if (goal.currentAmount >= goal.targetAmount) return true;

  if (!goal.targetDate) return true; // open-ended, no deadline to miss

  const totalDays = diffDays(goal.createdDate, goal.targetDate);
  if (totalDays <= 0) return false;

  const elapsedDays = diffDays(goal.createdDate, today);
  const elapsedPercent = elapsedDays / totalDays;
  const savedPercent = goal.currentAmount / goal.targetAmount;

  return savedPercent >= elapsedPercent;
}

/**
 * Get the current status of a goal.
 */
export function getGoalStatus(
  goal: Goal,
  today: string,
): GoalStatus {
  // Completed takes precedence over everything
  if (goal.currentAmount >= goal.targetAmount) return 'completed';

  // Overdue if past target date
  if (goal.targetDate && today > goal.targetDate) return 'overdue';

  // On track vs behind
  if (isGoalOnTrack(goal, today)) return 'on_track';

  return 'behind';
}

/**
 * Project when the goal will be completed based on monthly contribution.
 */
export function calculateGoalProjection(
  goal: Goal,
  today: string,
): GoalProjection {
  // Already funded
  if (goal.currentAmount >= goal.targetAmount) {
    return {
      projectedDate: today,
      monthsRemaining: 0,
      meetsTargetDate: true,
    };
  }

  // No monthly contribution = can't project
  if (goal.monthlyContribution <= 0) {
    return {
      projectedDate: null,
      monthsRemaining: null,
      meetsTargetDate: goal.targetDate ? false : null,
    };
  }

  const remaining = goal.targetAmount - goal.currentAmount;
  const monthsNeeded = Math.ceil(remaining / goal.monthlyContribution);
  const projectedDate = addMonths(today, monthsNeeded);

  let meetsTargetDate: boolean | null = null;
  if (goal.targetDate) {
    // The last contribution happens in month (monthsNeeded - 1) from today,
    // so compare that month against the target date's month.
    const lastContributionMonth = addMonths(today, monthsNeeded - 1).slice(0, 7);
    meetsTargetDate = lastContributionMonth <= goal.targetDate.slice(0, 7);
  }

  return {
    projectedDate,
    monthsRemaining: monthsNeeded,
    meetsTargetDate,
  };
}
