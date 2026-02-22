/**
 * Schedule calculation for recurring transactions.
 * Computes the next occurrence date based on frequency.
 * Handles month-end edge cases (Jan 31 -> Feb 28).
 */

import type { Frequency } from '../models/schemas';

/**
 * Calculate the next occurrence date after the current one.
 *
 * @param currentDate Current date in YYYY-MM-DD format
 * @param frequency Recurrence frequency
 * @param originalStartDay The day-of-month from the original start_date (for monthly+ frequencies)
 * @returns Next date in YYYY-MM-DD format
 */
export function calculateNextDate(
  currentDate: string,
  frequency: Frequency,
  originalStartDay?: number,
): string {
  const [year, month, day] = currentDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      return advanceMonths(year, month, originalStartDay ?? day, 1);
    case 'quarterly':
      return advanceMonths(year, month, originalStartDay ?? day, 3);
    case 'annually':
      return advanceMonths(year, month, originalStartDay ?? day, 12);
  }

  return formatDate(date);
}

/**
 * Generate all occurrence dates between two dates (inclusive).
 */
export function generateOccurrences(
  startDate: string,
  endDate: string,
  frequency: Frequency,
): string[] {
  const dates: string[] = [];
  const startDay = parseInt(startDate.split('-')[2], 10);
  let current = startDate;

  while (current <= endDate) {
    dates.push(current);
    current = calculateNextDate(current, frequency, startDay);
  }

  return dates;
}

// --- Helpers ---

function advanceMonths(
  year: number,
  month: number,
  targetDay: number,
  monthsToAdd: number,
): string {
  let newMonth = month + monthsToAdd;
  let newYear = year;

  while (newMonth > 12) {
    newMonth -= 12;
    newYear++;
  }

  // Clamp to last day of target month
  const daysInMonth = new Date(newYear, newMonth, 0).getDate();
  const actualDay = Math.min(targetDay, daysInMonth);

  return `${newYear}-${String(newMonth).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
