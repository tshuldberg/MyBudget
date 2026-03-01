/**
 * Tests for the upcoming/scheduled transactions engine.
 *
 * Projects future transactions from recurring templates within a configurable
 * lookahead window. Powers the dashboard "Upcoming" strip.
 *
 * All amounts in integer cents.
 */

import { describe, it, expect } from 'vitest';
import {
  getUpcomingTransactions,
  groupByDate,
  getUpcomingTotal,
  type RecurringTemplate,
} from '../upcoming';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeTemplate(overrides: Partial<RecurringTemplate> = {}): RecurringTemplate {
  return {
    id: 'tmpl-1',
    accountId: 'acct-1',
    categoryId: 'cat-1',
    payee: 'Netflix',
    amount: -1599,
    frequency: 'monthly',
    nextDate: '2026-03-15',
    endDate: null,
    isActive: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getUpcomingTransactions
// ---------------------------------------------------------------------------

describe('getUpcomingTransactions', () => {
  it('projects a single monthly transaction within 30-day window', () => {
    const templates = [makeTemplate({ nextDate: '2026-03-15' })];
    const result = getUpcomingTransactions(templates, 30, '2026-03-01');

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-03-15');
    expect(result[0].payee).toBe('Netflix');
    expect(result[0].amount).toBe(-1599);
    expect(result[0].templateId).toBe('tmpl-1');
  });

  it('projects multiple occurrences for weekly frequency', () => {
    const templates = [
      makeTemplate({
        id: 'tmpl-2',
        payee: 'Gym',
        frequency: 'weekly',
        nextDate: '2026-03-02',
        amount: -2000,
      }),
    ];
    const result = getUpcomingTransactions(templates, 30, '2026-03-01');

    // From March 2 over 30 days: Mar 2, 9, 16, 23, 30 = 5 occurrences
    expect(result).toHaveLength(5);
    expect(result[0].date).toBe('2026-03-02');
    expect(result[1].date).toBe('2026-03-09');
    expect(result[4].date).toBe('2026-03-30');
  });

  it('projects biweekly transactions', () => {
    const templates = [
      makeTemplate({
        frequency: 'biweekly',
        nextDate: '2026-03-01',
        amount: 250000, // paycheck
        payee: 'Employer',
      }),
    ];
    const result = getUpcomingTransactions(templates, 30, '2026-03-01');

    // Mar 1, 15, 29 = 3 occurrences
    expect(result).toHaveLength(3);
    expect(result[0].date).toBe('2026-03-01');
    expect(result[1].date).toBe('2026-03-15');
    expect(result[2].date).toBe('2026-03-29');
  });

  it('excludes inactive templates', () => {
    const templates = [
      makeTemplate({ isActive: false, nextDate: '2026-03-10' }),
    ];
    const result = getUpcomingTransactions(templates, 30, '2026-03-01');
    expect(result).toHaveLength(0);
  });

  it('excludes transactions past the end date', () => {
    const templates = [
      makeTemplate({
        frequency: 'weekly',
        nextDate: '2026-03-01',
        endDate: '2026-03-10',
      }),
    ];
    const result = getUpcomingTransactions(templates, 30, '2026-03-01');

    // Only Mar 1 and Mar 8 are before end date
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2026-03-01');
    expect(result[1].date).toBe('2026-03-08');
  });

  it('excludes transactions with nextDate beyond the window', () => {
    const templates = [
      makeTemplate({ nextDate: '2026-05-01' }),
    ];
    const result = getUpcomingTransactions(templates, 30, '2026-03-01');
    expect(result).toHaveLength(0);
  });

  it('handles multiple templates', () => {
    const templates = [
      makeTemplate({ id: 'tmpl-1', payee: 'Netflix', nextDate: '2026-03-15', amount: -1599 }),
      makeTemplate({ id: 'tmpl-2', payee: 'Spotify', nextDate: '2026-03-10', amount: -999 }),
      makeTemplate({ id: 'tmpl-3', payee: 'Rent', nextDate: '2026-03-01', amount: -150000 }),
    ];
    const result = getUpcomingTransactions(templates, 30, '2026-03-01');

    expect(result).toHaveLength(3);
    // Should be sorted by date
    expect(result[0].payee).toBe('Rent');
    expect(result[1].payee).toBe('Spotify');
    expect(result[2].payee).toBe('Netflix');
  });

  it('returns empty for empty templates', () => {
    const result = getUpcomingTransactions([], 30, '2026-03-01');
    expect(result).toHaveLength(0);
  });

  it('handles quarterly frequency within a large window', () => {
    const templates = [
      makeTemplate({
        frequency: 'quarterly',
        nextDate: '2026-03-01',
        amount: -5000,
      }),
    ];
    const result = getUpcomingTransactions(templates, 120, '2026-03-01');

    // Mar 1, Jun 1 within 120 days from Mar 1
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2026-03-01');
    expect(result[1].date).toBe('2026-06-01');
  });

  it('handles annually frequency', () => {
    const templates = [
      makeTemplate({
        frequency: 'annually',
        nextDate: '2026-03-15',
        amount: -12000,
      }),
    ];
    const result = getUpcomingTransactions(templates, 30, '2026-03-01');

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-03-15');
  });
});

// ---------------------------------------------------------------------------
// groupByDate
// ---------------------------------------------------------------------------

describe('groupByDate', () => {
  it('groups transactions by date', () => {
    const upcoming = [
      { templateId: 'tmpl-1', accountId: 'a', categoryId: null, payee: 'Netflix', amount: -1599, date: '2026-03-15', frequency: 'monthly' as const },
      { templateId: 'tmpl-2', accountId: 'a', categoryId: null, payee: 'Spotify', amount: -999, date: '2026-03-15', frequency: 'monthly' as const },
      { templateId: 'tmpl-3', accountId: 'a', categoryId: null, payee: 'Rent', amount: -150000, date: '2026-03-01', frequency: 'monthly' as const },
    ];

    const groups = groupByDate(upcoming);
    expect(groups).toHaveLength(2);
    expect(groups[0].date).toBe('2026-03-01');
    expect(groups[0].transactions).toHaveLength(1);
    expect(groups[1].date).toBe('2026-03-15');
    expect(groups[1].transactions).toHaveLength(2);
  });

  it('calculates total per group', () => {
    const upcoming = [
      { templateId: 'tmpl-1', accountId: 'a', categoryId: null, payee: 'Netflix', amount: -1599, date: '2026-03-15', frequency: 'monthly' as const },
      { templateId: 'tmpl-2', accountId: 'a', categoryId: null, payee: 'Spotify', amount: -999, date: '2026-03-15', frequency: 'monthly' as const },
    ];

    const groups = groupByDate(upcoming);
    expect(groups[0].total).toBe(-2598);
  });

  it('returns empty for empty input', () => {
    expect(groupByDate([])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getUpcomingTotal
// ---------------------------------------------------------------------------

describe('getUpcomingTotal', () => {
  it('sums all upcoming transaction amounts', () => {
    const upcoming = [
      { templateId: 'tmpl-1', accountId: 'a', categoryId: null, payee: 'Netflix', amount: -1599, date: '2026-03-15', frequency: 'monthly' as const },
      { templateId: 'tmpl-2', accountId: 'a', categoryId: null, payee: 'Spotify', amount: -999, date: '2026-03-15', frequency: 'monthly' as const },
      { templateId: 'tmpl-3', accountId: 'a', categoryId: null, payee: 'Rent', amount: -150000, date: '2026-03-01', frequency: 'monthly' as const },
    ];

    expect(getUpcomingTotal(upcoming)).toBe(-152598);
  });

  it('returns zero for empty input', () => {
    expect(getUpcomingTotal([])).toBe(0);
  });

  it('handles mix of inflows and outflows', () => {
    const upcoming = [
      { templateId: 'tmpl-1', accountId: 'a', categoryId: null, payee: 'Paycheck', amount: 250000, date: '2026-03-01', frequency: 'biweekly' as const },
      { templateId: 'tmpl-2', accountId: 'a', categoryId: null, payee: 'Rent', amount: -150000, date: '2026-03-01', frequency: 'monthly' as const },
    ];

    expect(getUpcomingTotal(upcoming)).toBe(100000);
  });
});
