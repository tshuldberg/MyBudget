/**
 * Renewal date calculation engine for subscriptions.
 *
 * Handles all billing cycles including month-end edge cases:
 * - Jan 31 monthly -> Feb 28, then Mar 31 (anchors to original day-of-month)
 * - Leap year handling for Feb 29
 */

import type { BillingCycle, Subscription } from '../models/schemas';

/**
 * Calculate the next renewal date from a given start date and billing cycle.
 * Advances from startDate by one billing period at a time until the result
 * is strictly after `today`.
 *
 * @param startDate - ISO date string YYYY-MM-DD
 * @param billingCycle - billing cycle enum
 * @param customDays - required when billingCycle is 'custom'
 * @param today - reference date (defaults to current date)
 * @returns ISO date string YYYY-MM-DD of the next renewal
 */
export function calculateNextRenewal(
  startDate: string,
  billingCycle: BillingCycle,
  customDays?: number | null,
  today?: string,
): string {
  const todayDate = today ? parseDate(today) : stripTime(new Date());
  let renewal = parseDate(startDate);
  const anchorDay = renewal.getDate();

  // Advance until renewal is in the future
  while (renewal <= todayDate) {
    renewal = advanceDateByOneCycle(renewal, billingCycle, anchorDay, customDays);
  }

  return formatDate(renewal);
}

/**
 * Advance a renewal date by one billing cycle period.
 *
 * @param currentRenewal - ISO date string YYYY-MM-DD
 * @param billingCycle - billing cycle enum
 * @param customDays - required when billingCycle is 'custom'
 * @param anchorDay - original day-of-month from start_date to preserve across
 *                    month-end clamping (e.g., 31 for a subscription that started Jan 31).
 *                    If omitted, uses the day from currentRenewal.
 * @returns ISO date string YYYY-MM-DD
 */
export function advanceRenewalDate(
  currentRenewal: string,
  billingCycle: BillingCycle,
  customDays?: number | null,
  anchorDay?: number,
): string {
  const date = parseDate(currentRenewal);
  const anchor = anchorDay ?? date.getDate();
  const advanced = advanceDateByOneCycle(date, billingCycle, anchor, customDays);
  return formatDate(advanced);
}

/**
 * Get all subscriptions with renewals within the next N days.
 *
 * @param subscriptions - list of subscriptions to check
 * @param daysAhead - how many days ahead to look (default 30)
 * @param today - reference date (defaults to current date)
 * @returns subscriptions with upcoming renewals, sorted by next_renewal ascending
 */
export function getUpcomingRenewals(
  subscriptions: Subscription[],
  daysAhead = 30,
  today?: string,
): Subscription[] {
  const todayDate = today ? parseDate(today) : stripTime(new Date());
  const cutoff = new Date(todayDate);
  cutoff.setDate(cutoff.getDate() + daysAhead);

  return subscriptions
    .filter((sub) => {
      if (sub.status === 'cancelled' || sub.status === 'paused') return false;
      const renewal = parseDate(sub.next_renewal);
      return renewal >= todayDate && renewal <= cutoff;
    })
    .sort((a, b) => a.next_renewal.localeCompare(b.next_renewal));
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function advanceDateByOneCycle(
  date: Date,
  billingCycle: BillingCycle,
  anchorDay: number,
  customDays?: number | null,
): Date {
  const result = new Date(date);

  switch (billingCycle) {
    case 'weekly':
      result.setDate(result.getDate() + 7);
      break;
    case 'monthly':
      advanceMonths(result, 1, anchorDay);
      break;
    case 'quarterly':
      advanceMonths(result, 3, anchorDay);
      break;
    case 'semi_annual':
      advanceMonths(result, 6, anchorDay);
      break;
    case 'annual':
      advanceMonths(result, 12, anchorDay);
      break;
    case 'custom': {
      if (!customDays || customDays < 1) {
        throw new Error('custom billing cycle requires customDays >= 1');
      }
      result.setDate(result.getDate() + customDays);
      break;
    }
  }

  return result;
}

/**
 * Advance a date by N months, clamping to month-end when the anchor day
 * exceeds the number of days in the target month.
 *
 * Example: Jan 31 + 1 month = Feb 28 (or 29 in a leap year).
 * Then Feb 28 + 1 month with anchorDay=31 = Mar 31.
 */
function advanceMonths(date: Date, months: number, anchorDay: number): void {
  const newMonth = date.getMonth() + months;
  date.setMonth(newMonth);
  // setMonth may overshoot if the day is too large for the target month.
  // We detect this by checking if the month is what we expect.
  const expectedMonth = newMonth % 12;
  if (date.getMonth() !== expectedMonth) {
    // Overshot — go back to last day of the intended month
    date.setDate(0);
  } else {
    // Month is correct, but try to restore the anchor day if possible
    const daysInMonth = getDaysInMonth(date.getFullYear(), date.getMonth());
    date.setDate(Math.min(anchorDay, daysInMonth));
  }
}

function getDaysInMonth(year: number, month: number): number {
  // month is 0-based. Date(year, month+1, 0) gives last day of month.
  return new Date(year, month + 1, 0).getDate();
}

function parseDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
