import { describe, it, expect } from 'vitest';
import type { Subscription, BillingCycle } from '../../models/schemas';
import {
  calculateNextRenewal,
  advanceRenewalDate,
  getUpcomingRenewals,
} from '../renewal';
import {
  normalizeToMonthly,
  normalizeToAnnual,
  normalizeToDaily,
  calculateSubscriptionSummary,
} from '../cost';
import {
  validateTransition,
  getValidTransitions,
} from '../status';
import {
  CATALOG_ENTRIES,
  searchCatalog,
  getCatalogByCategory,
  getPopularEntries,
  CatalogEntrySchema,
} from '../../catalog';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'sub-1',
    name: 'Netflix',
    price: 1599, // $15.99
    currency: 'USD',
    billing_cycle: 'monthly',
    custom_days: null,
    category_id: null,
    status: 'active',
    start_date: '2025-01-15',
    next_renewal: '2025-02-15',
    trial_end_date: null,
    cancelled_date: null,
    notes: null,
    url: null,
    icon: null,
    color: null,
    notify_days: 1,
    catalog_id: null,
    sort_order: 0,
    created_at: '2025-01-15T00:00:00.000Z',
    updated_at: '2025-01-15T00:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Renewal calculation
// ---------------------------------------------------------------------------

describe('calculateNextRenewal', () => {
  it('weekly: advances by 7 days', () => {
    expect(calculateNextRenewal('2025-01-01', 'weekly', null, '2025-01-01')).toBe('2025-01-08');
  });

  it('weekly: skips past today', () => {
    expect(calculateNextRenewal('2025-01-01', 'weekly', null, '2025-01-20')).toBe('2025-01-22');
  });

  it('monthly: advances by 1 month', () => {
    expect(calculateNextRenewal('2025-01-15', 'monthly', null, '2025-01-15')).toBe('2025-02-15');
  });

  it('monthly: Jan 31 -> Feb 28 (month-end clamping)', () => {
    expect(calculateNextRenewal('2025-01-31', 'monthly', null, '2025-01-31')).toBe('2025-02-28');
  });

  it('monthly: Jan 31 -> Feb 29 in leap year', () => {
    expect(calculateNextRenewal('2024-01-31', 'monthly', null, '2024-01-31')).toBe('2024-02-29');
  });

  it('monthly: Feb 28 -> Mar 31 (anchor day restores to 31)', () => {
    // Start is Jan 31, so anchor day is 31.
    // After Feb 28, next should be Mar 31.
    const result = calculateNextRenewal('2025-01-31', 'monthly', null, '2025-02-28');
    expect(result).toBe('2025-03-31');
  });

  it('quarterly: advances by 3 months', () => {
    expect(calculateNextRenewal('2025-01-15', 'quarterly', null, '2025-01-15')).toBe('2025-04-15');
  });

  it('quarterly: month-end clamping (Jan 31 -> Apr 30)', () => {
    expect(calculateNextRenewal('2025-01-31', 'quarterly', null, '2025-01-31')).toBe('2025-04-30');
  });

  it('semi_annual: advances by 6 months', () => {
    expect(calculateNextRenewal('2025-01-15', 'semi_annual', null, '2025-01-15')).toBe('2025-07-15');
  });

  it('annual: advances by 12 months', () => {
    expect(calculateNextRenewal('2025-01-15', 'annual', null, '2025-01-15')).toBe('2026-01-15');
  });

  it('annual: Feb 29 in leap year -> Feb 28 next year', () => {
    expect(calculateNextRenewal('2024-02-29', 'annual', null, '2024-02-29')).toBe('2025-02-28');
  });

  it('custom: advances by N days', () => {
    expect(calculateNextRenewal('2025-01-01', 'custom', 90, '2025-01-01')).toBe('2025-04-01');
  });

  it('custom: throws if customDays missing', () => {
    expect(() => calculateNextRenewal('2025-01-01', 'custom', null, '2025-01-01')).toThrow(
      'customDays',
    );
  });

  it('custom: throws if customDays is 0', () => {
    expect(() => calculateNextRenewal('2025-01-01', 'custom', 0, '2025-01-01')).toThrow(
      'customDays',
    );
  });

  it('advances multiple cycles to get past today', () => {
    // Monthly from Jan 15, today is May 20 -> next renewal is June 15
    expect(calculateNextRenewal('2025-01-15', 'monthly', null, '2025-05-20')).toBe('2025-06-15');
  });
});

// ---------------------------------------------------------------------------
// advanceRenewalDate
// ---------------------------------------------------------------------------

describe('advanceRenewalDate', () => {
  it('advances by one monthly cycle', () => {
    expect(advanceRenewalDate('2025-03-15', 'monthly')).toBe('2025-04-15');
  });

  it('respects anchorDay for month-end', () => {
    // Feb 28, anchor 31 -> Mar 31
    expect(advanceRenewalDate('2025-02-28', 'monthly', null, 31)).toBe('2025-03-31');
  });

  it('advances weekly', () => {
    expect(advanceRenewalDate('2025-03-01', 'weekly')).toBe('2025-03-08');
  });

  it('advances custom days', () => {
    expect(advanceRenewalDate('2025-03-01', 'custom', 45)).toBe('2025-04-15');
  });
});

// ---------------------------------------------------------------------------
// getUpcomingRenewals
// ---------------------------------------------------------------------------

describe('getUpcomingRenewals', () => {
  const baseSubs: Subscription[] = [
    makeSub({ id: 'a', name: 'Netflix', next_renewal: '2025-03-10', status: 'active' }),
    makeSub({ id: 'b', name: 'Spotify', next_renewal: '2025-03-20', status: 'active' }),
    makeSub({ id: 'c', name: 'Gym', next_renewal: '2025-04-15', status: 'active' }),
    makeSub({ id: 'd', name: 'Cancelled', next_renewal: '2025-03-05', status: 'cancelled' }),
    makeSub({ id: 'e', name: 'Paused', next_renewal: '2025-03-12', status: 'paused' }),
    makeSub({ id: 'f', name: 'Trial', next_renewal: '2025-03-08', status: 'trial' }),
  ];

  it('returns active and trial subs within default 30 days', () => {
    const result = getUpcomingRenewals(baseSubs, 30, '2025-03-01');
    const names = result.map((s) => s.name);
    expect(names).toContain('Netflix');
    expect(names).toContain('Spotify');
    expect(names).toContain('Trial');
    expect(names).not.toContain('Cancelled');
    expect(names).not.toContain('Paused');
  });

  it('excludes renewals beyond daysAhead', () => {
    const result = getUpcomingRenewals(baseSubs, 15, '2025-03-01');
    const names = result.map((s) => s.name);
    expect(names).toContain('Netflix');
    expect(names).not.toContain('Spotify'); // Mar 20 is 19 days ahead
    expect(names).not.toContain('Gym');
  });

  it('sorts by next_renewal ascending', () => {
    const result = getUpcomingRenewals(baseSubs, 30, '2025-03-01');
    for (let i = 1; i < result.length; i++) {
      expect(result[i].next_renewal >= result[i - 1].next_renewal).toBe(true);
    }
  });

  it('returns empty for no matching subscriptions', () => {
    const result = getUpcomingRenewals([], 30, '2025-03-01');
    expect(result).toEqual([]);
  });

  it('excludes renewals in the past', () => {
    const result = getUpcomingRenewals(
      [makeSub({ next_renewal: '2025-02-28', status: 'active' })],
      30,
      '2025-03-01',
    );
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Cost normalization
// ---------------------------------------------------------------------------

describe('normalizeToMonthly', () => {
  it('weekly $10 -> monthly ~$43.33 (4333 cents)', () => {
    // weekly: price * 52 / 12 = 1000 * 52 / 12 = 4333.33... -> 4333
    expect(normalizeToMonthly(1000, 'weekly')).toBe(4333);
  });

  it('monthly: returns same price', () => {
    expect(normalizeToMonthly(1599, 'monthly')).toBe(1599);
  });

  it('quarterly: divides by 3', () => {
    // $30 quarterly -> $10/month = 1000 cents
    expect(normalizeToMonthly(3000, 'quarterly')).toBe(1000);
  });

  it('semi_annual: divides by 6', () => {
    // $60 semi-annual -> $10/month = 1000 cents
    expect(normalizeToMonthly(6000, 'semi_annual')).toBe(1000);
  });

  it('annual $120 -> monthly $10 (1000 cents)', () => {
    expect(normalizeToMonthly(12000, 'annual')).toBe(1000);
  });

  it('custom 90 days: (price * 365/90) / 12', () => {
    // 1000 * (365/90) / 12 = 1000 * 4.0556 / 12 = 338.0
    const result = normalizeToMonthly(1000, 'custom', 90);
    expect(result).toBe(Math.round((1000 * (365 / 90)) / 12));
  });

  it('custom: throws without customDays', () => {
    expect(() => normalizeToMonthly(1000, 'custom')).toThrow('customDays');
  });

  it('custom: throws with customDays = 0', () => {
    expect(() => normalizeToMonthly(1000, 'custom', 0)).toThrow('customDays');
  });
});

describe('normalizeToAnnual', () => {
  it('weekly: multiplies by 52', () => {
    expect(normalizeToAnnual(1000, 'weekly')).toBe(52000);
  });

  it('monthly: multiplies by 12', () => {
    expect(normalizeToAnnual(1599, 'monthly')).toBe(19188);
  });

  it('quarterly: multiplies by 4', () => {
    expect(normalizeToAnnual(3000, 'quarterly')).toBe(12000);
  });

  it('semi_annual: multiplies by 2', () => {
    expect(normalizeToAnnual(6000, 'semi_annual')).toBe(12000);
  });

  it('annual: returns same price', () => {
    expect(normalizeToAnnual(12000, 'annual')).toBe(12000);
  });

  it('custom: price * 365 / customDays', () => {
    expect(normalizeToAnnual(1000, 'custom', 90)).toBe(Math.round(1000 * (365 / 90)));
  });
});

describe('normalizeToDaily', () => {
  it('annual divided by 365', () => {
    // $365/year -> $1/day = 100 cents
    expect(normalizeToDaily(36500, 'annual')).toBe(100);
  });

  it('monthly: annual / 365', () => {
    // $10/month -> annual = $120 = 12000 cents -> daily = 12000 / 365 = 33 cents
    expect(normalizeToDaily(1000, 'monthly')).toBe(Math.round(12000 / 365));
  });

  it('weekly: annual / 365', () => {
    // $10/week -> annual = $520 = 52000 -> daily = 52000 / 365 = 142 cents
    expect(normalizeToDaily(1000, 'weekly')).toBe(Math.round(52000 / 365));
  });
});

// ---------------------------------------------------------------------------
// calculateSubscriptionSummary
// ---------------------------------------------------------------------------

describe('calculateSubscriptionSummary', () => {
  it('calculates totals for active subs only', () => {
    const subs = [
      makeSub({ id: '1', price: 1000, billing_cycle: 'monthly', status: 'active' }),
      makeSub({ id: '2', price: 2000, billing_cycle: 'monthly', status: 'active' }),
      makeSub({ id: '3', price: 5000, billing_cycle: 'monthly', status: 'cancelled' }),
    ];
    const summary = calculateSubscriptionSummary(subs);
    expect(summary.monthlyTotal).toBe(3000);
    expect(summary.activeCount).toBe(2);
    expect(summary.totalCount).toBe(3);
  });

  it('includes trial subs in totals', () => {
    const subs = [
      makeSub({ id: '1', price: 1000, billing_cycle: 'monthly', status: 'active' }),
      makeSub({ id: '2', price: 500, billing_cycle: 'monthly', status: 'trial' }),
    ];
    const summary = calculateSubscriptionSummary(subs);
    expect(summary.monthlyTotal).toBe(1500);
    expect(summary.activeCount).toBe(2);
  });

  it('excludes paused subs from totals', () => {
    const subs = [
      makeSub({ id: '1', price: 1000, billing_cycle: 'monthly', status: 'active' }),
      makeSub({ id: '2', price: 2000, billing_cycle: 'monthly', status: 'paused' }),
    ];
    const summary = calculateSubscriptionSummary(subs);
    expect(summary.monthlyTotal).toBe(1000);
    expect(summary.activeCount).toBe(1);
  });

  it('excludes cancelled subs from totals', () => {
    const subs = [
      makeSub({ id: '1', price: 500, billing_cycle: 'monthly', status: 'cancelled' }),
    ];
    const summary = calculateSubscriptionSummary(subs);
    expect(summary.monthlyTotal).toBe(0);
    expect(summary.activeCount).toBe(0);
    expect(summary.totalCount).toBe(1);
  });

  it('calculates annual from monthly total * 12', () => {
    const subs = [
      makeSub({ id: '1', price: 1000, billing_cycle: 'monthly', status: 'active' }),
    ];
    const summary = calculateSubscriptionSummary(subs);
    expect(summary.annualTotal).toBe(12000);
  });

  it('calculates daily from annual / 365', () => {
    const subs = [
      makeSub({ id: '1', price: 1000, billing_cycle: 'monthly', status: 'active' }),
    ];
    const summary = calculateSubscriptionSummary(subs);
    expect(summary.dailyCost).toBe(Math.round(12000 / 365));
  });

  it('groups by category in byCategory', () => {
    const subs = [
      makeSub({ id: '1', price: 1000, billing_cycle: 'monthly', status: 'active', category_id: 'cat-1' }),
      makeSub({ id: '2', price: 2000, billing_cycle: 'monthly', status: 'active', category_id: 'cat-1' }),
      makeSub({ id: '3', price: 500, billing_cycle: 'monthly', status: 'active', category_id: 'cat-2' }),
    ];
    const summary = calculateSubscriptionSummary(subs);
    expect(summary.byCategory).toHaveLength(2);
    // Sorted by monthlyCost descending
    expect(summary.byCategory[0].category_id).toBe('cat-1');
    expect(summary.byCategory[0].monthlyCost).toBe(3000);
    expect(summary.byCategory[0].count).toBe(2);
    expect(summary.byCategory[1].category_id).toBe('cat-2');
    expect(summary.byCategory[1].monthlyCost).toBe(500);
    expect(summary.byCategory[1].count).toBe(1);
  });

  it('handles null category_id', () => {
    const subs = [
      makeSub({ id: '1', price: 1000, billing_cycle: 'monthly', status: 'active', category_id: null }),
    ];
    const summary = calculateSubscriptionSummary(subs);
    expect(summary.byCategory).toHaveLength(1);
    expect(summary.byCategory[0].category_id).toBeNull();
  });

  it('normalizes non-monthly billing cycles', () => {
    const subs = [
      makeSub({ id: '1', price: 12000, billing_cycle: 'annual', status: 'active' }),
    ];
    const summary = calculateSubscriptionSummary(subs);
    expect(summary.monthlyTotal).toBe(1000); // $120/year = $10/month
  });

  it('handles empty subscription list', () => {
    const summary = calculateSubscriptionSummary([]);
    expect(summary.monthlyTotal).toBe(0);
    expect(summary.annualTotal).toBe(0);
    expect(summary.dailyCost).toBe(0);
    expect(summary.byCategory).toEqual([]);
    expect(summary.activeCount).toBe(0);
    expect(summary.totalCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Status state machine
// ---------------------------------------------------------------------------

describe('validateTransition', () => {
  it('trial -> active is valid', () => {
    expect(validateTransition('trial', 'active')).toBe(true);
  });

  it('trial -> cancelled is valid', () => {
    expect(validateTransition('trial', 'cancelled')).toBe(true);
  });

  it('trial -> paused is invalid', () => {
    expect(validateTransition('trial', 'paused')).toBe(false);
  });

  it('active -> paused is valid', () => {
    expect(validateTransition('active', 'paused')).toBe(true);
  });

  it('active -> cancelled is valid', () => {
    expect(validateTransition('active', 'cancelled')).toBe(true);
  });

  it('active -> trial is invalid', () => {
    expect(validateTransition('active', 'trial')).toBe(false);
  });

  it('paused -> active is valid', () => {
    expect(validateTransition('paused', 'active')).toBe(true);
  });

  it('paused -> cancelled is valid', () => {
    expect(validateTransition('paused', 'cancelled')).toBe(true);
  });

  it('paused -> trial is invalid', () => {
    expect(validateTransition('paused', 'trial')).toBe(false);
  });

  it('cancelled -> anything is invalid', () => {
    expect(validateTransition('cancelled', 'active')).toBe(false);
    expect(validateTransition('cancelled', 'paused')).toBe(false);
    expect(validateTransition('cancelled', 'trial')).toBe(false);
  });
});

describe('getValidTransitions', () => {
  it('returns correct transitions for trial', () => {
    expect(getValidTransitions('trial')).toEqual(['active', 'cancelled']);
  });

  it('returns correct transitions for active', () => {
    expect(getValidTransitions('active')).toEqual(['paused', 'cancelled']);
  });

  it('returns correct transitions for paused', () => {
    expect(getValidTransitions('paused')).toEqual(['active', 'cancelled']);
  });

  it('returns empty for cancelled', () => {
    expect(getValidTransitions('cancelled')).toEqual([]);
  });

  it('returns a copy (not the internal array)', () => {
    const transitions = getValidTransitions('active');
    transitions.push('trial');
    expect(getValidTransitions('active')).toEqual(['paused', 'cancelled']);
  });
});

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

describe('catalog data integrity', () => {
  it('has 200+ entries', () => {
    expect(CATALOG_ENTRIES.length).toBeGreaterThanOrEqual(200);
  });

  it('has unique IDs across all entries', () => {
    const ids = new Set(CATALOG_ENTRIES.map((e) => e.id));
    expect(ids.size).toBe(CATALOG_ENTRIES.length);
  });

  it('all entries validate against CatalogEntrySchema', () => {
    for (const entry of CATALOG_ENTRIES) {
      const result = CatalogEntrySchema.safeParse(entry);
      if (!result.success) {
        throw new Error(`Entry "${entry.id}" failed validation: ${result.error.message}`);
      }
    }
  });

  it('all prices are non-negative integers (cents)', () => {
    for (const entry of CATALOG_ENTRIES) {
      expect(Number.isInteger(entry.defaultPrice), `${entry.id} price not integer`).toBe(true);
      expect(entry.defaultPrice >= 0, `${entry.id} price negative`).toBe(true);
    }
  });

  it('all IDs are kebab-case', () => {
    for (const entry of CATALOG_ENTRIES) {
      expect(entry.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it('meets category minimums', () => {
    expect(getCatalogByCategory('entertainment').length).toBeGreaterThanOrEqual(50);
    expect(getCatalogByCategory('productivity').length).toBeGreaterThanOrEqual(40);
    expect(getCatalogByCategory('health').length).toBeGreaterThanOrEqual(20);
    expect(getCatalogByCategory('shopping').length).toBeGreaterThanOrEqual(15);
    expect(getCatalogByCategory('news').length).toBeGreaterThanOrEqual(20);
    expect(getCatalogByCategory('finance').length).toBeGreaterThanOrEqual(15);
    expect(getCatalogByCategory('utilities').length).toBeGreaterThanOrEqual(15);
    expect(getCatalogByCategory('other').length).toBeGreaterThanOrEqual(25);
  });
});

describe('searchCatalog', () => {
  it('finds entries by name substring', () => {
    const results = searchCatalog('netflix');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((e) => e.id.includes('netflix'))).toBe(true);
  });

  it('finds entries by id match', () => {
    const results = searchCatalog('chatgpt');
    expect(results.some((e) => e.id === 'chatgpt-plus')).toBe(true);
  });

  it('is case-insensitive', () => {
    const lower = searchCatalog('spotify');
    const upper = searchCatalog('SPOTIFY');
    expect(lower.length).toBe(upper.length);
  });

  it('returns empty for no match', () => {
    expect(searchCatalog('zzz-nonexistent-service')).toEqual([]);
  });

  it('returns empty for blank query', () => {
    expect(searchCatalog('')).toEqual([]);
    expect(searchCatalog('   ')).toEqual([]);
  });

  it('ranks prefix matches before substring matches', () => {
    const results = searchCatalog('apple');
    if (results.length > 1) {
      expect(results[0].name.toLowerCase().startsWith('apple')).toBe(true);
    }
  });
});

describe('getPopularEntries', () => {
  it('returns a non-empty curated list', () => {
    const popular = getPopularEntries();
    expect(popular.length).toBeGreaterThan(0);
  });

  it('includes well-known services', () => {
    const ids = getPopularEntries().map((e) => e.id);
    expect(ids).toContain('netflix-standard');
    expect(ids).toContain('spotify-premium');
  });

  it('is sorted alphabetically by name', () => {
    const popular = getPopularEntries();
    const names = popular.map((e) => e.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });
});
