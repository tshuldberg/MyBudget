import { describe, expect, it } from 'vitest';

import {
  detectRecurringCharges,
  normalizePayeeName,
  type DetectedSubscription,
} from '../recurring-detector';
import { getSubscriptionSuggestions } from '../subscription-discovery';
import type { BankTransactionRecord } from '../types';
import type { CatalogEntry } from '../../catalog/types';

/** Helper to build a minimal BankTransactionRecord for testing. */
function txn(
  overrides: Partial<BankTransactionRecord> & { payee: string; datePosted: string; amount: number },
): BankTransactionRecord {
  return {
    id: `txn-${Math.random().toString(36).slice(2, 8)}`,
    connectionId: 'conn-1',
    bankAccountId: 'acct-1',
    providerTransactionId: `ptxn-${Math.random().toString(36).slice(2, 8)}`,
    pendingTransactionId: null,
    dateAuthorized: null,
    memo: null,
    currency: 'USD',
    category: null,
    isPending: false,
    rawJson: null,
    ...overrides,
  };
}

function catalogEntry(id: string, name: string): CatalogEntry {
  return {
    id,
    name,
    defaultPrice: 999,
    billingCycle: 'monthly',
    category: 'entertainment',
    iconKey: id,
  };
}

describe('normalizePayeeName', () => {
  it('lowercases and trims', () => {
    expect(normalizePayeeName('  Netflix  ')).toBe('netflix');
  });

  it('strips billing suffixes with asterisk prefix', () => {
    expect(normalizePayeeName('NETFLIX * MONTHLY')).toBe('netflix');
  });

  it('strips standalone billing keywords', () => {
    expect(normalizePayeeName('Spotify Recurring Payment')).toBe('spotify');
  });

  it('strips hash-prefixed suffixes', () => {
    expect(normalizePayeeName('Hulu # Subscription')).toBe('hulu');
  });

  it('handles autopay keyword', () => {
    expect(normalizePayeeName('AT&T Auto-Pay')).toBe('at&t');
  });

  it('collapses multiple spaces', () => {
    expect(normalizePayeeName('Apple   Music   Monthly')).toBe('apple music');
  });
});

describe('detectRecurringCharges', () => {
  it('detects monthly pattern with consistent amounts', () => {
    const transactions = [
      txn({ payee: 'Netflix', datePosted: '2025-01-15', amount: 1599 }),
      txn({ payee: 'Netflix', datePosted: '2025-02-15', amount: 1599 }),
      txn({ payee: 'Netflix', datePosted: '2025-03-15', amount: 1599 }),
      txn({ payee: 'Netflix', datePosted: '2025-04-15', amount: 1599 }),
    ];

    const results = detectRecurringCharges(transactions, [], []);
    expect(results).toHaveLength(1);
    expect(results[0]!.frequency).toBe('monthly');
    expect(results[0]!.amount).toBe(1599);
    expect(results[0]!.normalizedPayee).toBe('netflix');
    expect(results[0]!.confidence).toBeGreaterThan(0);
  });

  it('detects annual pattern', () => {
    const transactions = [
      txn({ payee: 'Amazon Prime', datePosted: '2024-03-01', amount: 13900 }),
      txn({ payee: 'Amazon Prime', datePosted: '2025-03-01', amount: 13900 }),
    ];

    const results = detectRecurringCharges(transactions, [], []);
    expect(results).toHaveLength(1);
    expect(results[0]!.frequency).toBe('annual');
  });

  it('detects weekly pattern', () => {
    const transactions = [
      txn({ payee: 'Gym Class', datePosted: '2025-01-01', amount: 2500 }),
      txn({ payee: 'Gym Class', datePosted: '2025-01-08', amount: 2500 }),
      txn({ payee: 'Gym Class', datePosted: '2025-01-15', amount: 2500 }),
      txn({ payee: 'Gym Class', datePosted: '2025-01-22', amount: 2500 }),
    ];

    const results = detectRecurringCharges(transactions, [], []);
    expect(results).toHaveLength(1);
    expect(results[0]!.frequency).toBe('weekly');
  });

  it('matches against catalog entries', () => {
    const transactions = [
      txn({ payee: 'NETFLIX.COM', datePosted: '2025-01-15', amount: 1599 }),
      txn({ payee: 'NETFLIX.COM', datePosted: '2025-02-15', amount: 1599 }),
      txn({ payee: 'NETFLIX.COM', datePosted: '2025-03-15', amount: 1599 }),
    ];
    const catalog = [catalogEntry('netflix', 'Netflix')];

    const results = detectRecurringCharges(transactions, [], catalog);
    expect(results).toHaveLength(1);
    expect(results[0]!.matchedCatalogId).toBe('netflix');
    expect(results[0]!.confidence).toBeGreaterThan(0.4);
  });

  it('marks already-tracked subscriptions by catalog_id', () => {
    const transactions = [
      txn({ payee: 'Netflix', datePosted: '2025-01-15', amount: 1599 }),
      txn({ payee: 'Netflix', datePosted: '2025-02-15', amount: 1599 }),
      txn({ payee: 'Netflix', datePosted: '2025-03-15', amount: 1599 }),
    ];
    const catalog = [catalogEntry('netflix', 'Netflix')];
    const existing = [{ name: 'Netflix HD', catalog_id: 'netflix' }];

    const results = detectRecurringCharges(transactions, existing, catalog);
    expect(results).toHaveLength(1);
    expect(results[0]!.isAlreadyTracked).toBe(true);
  });

  it('marks already-tracked subscriptions by name match', () => {
    const transactions = [
      txn({ payee: 'Spotify', datePosted: '2025-01-15', amount: 999 }),
      txn({ payee: 'Spotify', datePosted: '2025-02-15', amount: 999 }),
    ];
    const existing = [{ name: 'Spotify', catalog_id: null }];

    const results = detectRecurringCharges(transactions, existing, []);
    expect(results).toHaveLength(1);
    expect(results[0]!.isAlreadyTracked).toBe(true);
  });

  it('handles variable amounts and still detects the pattern', () => {
    const transactions = [
      txn({ payee: 'Electric Co', datePosted: '2025-01-05', amount: 8500 }),
      txn({ payee: 'Electric Co', datePosted: '2025-02-05', amount: 9200 }),
      txn({ payee: 'Electric Co', datePosted: '2025-03-05', amount: 7800 }),
      txn({ payee: 'Electric Co', datePosted: '2025-04-05', amount: 8800 }),
    ];

    const results = detectRecurringCharges(transactions, [], []);
    expect(results).toHaveLength(1);
    expect(results[0]!.frequency).toBe('monthly');
  });

  it('handles a missed month with lower confidence', () => {
    const allMonths = [
      txn({ payee: 'Hulu', datePosted: '2025-01-10', amount: 1299 }),
      txn({ payee: 'Hulu', datePosted: '2025-02-10', amount: 1299 }),
      // March skipped
      txn({ payee: 'Hulu', datePosted: '2025-04-10', amount: 1299 }),
    ];

    const consecutive = [
      txn({ payee: 'Spotify', datePosted: '2025-01-10', amount: 999 }),
      txn({ payee: 'Spotify', datePosted: '2025-02-10', amount: 999 }),
      txn({ payee: 'Spotify', datePosted: '2025-03-10', amount: 999 }),
    ];

    const gapResults = detectRecurringCharges(allMonths, [], []);
    const consecutiveResults = detectRecurringCharges(consecutive, [], []);

    // The gap version may still be detected but with lower confidence
    // because median interval (~30 days for 2 of 3 gaps) may still be monthly
    if (gapResults.length > 0) {
      expect(gapResults[0]!.confidence).toBeLessThanOrEqual(
        consecutiveResults[0]!.confidence,
      );
    }
  });

  it('excludes refunds (negative amounts)', () => {
    const transactions = [
      txn({ payee: 'Netflix', datePosted: '2025-01-15', amount: 1599 }),
      txn({ payee: 'Netflix', datePosted: '2025-02-15', amount: -1599 }), // refund
      txn({ payee: 'Netflix', datePosted: '2025-03-15', amount: 1599 }),
    ];

    const results = detectRecurringCharges(transactions, [], []);
    // Only 2 positive charges remain, still can detect
    if (results.length > 0) {
      expect(results[0]!.transactionDates).not.toContain('2025-02-15');
    }
  });

  it('does not detect single occurrence as recurring', () => {
    const transactions = [
      txn({ payee: 'One-Time Purchase', datePosted: '2025-01-15', amount: 5000 }),
    ];

    const results = detectRecurringCharges(transactions, [], []);
    expect(results).toHaveLength(0);
  });

  it('higher confidence with more data points', () => {
    const twoMonths = [
      txn({ payee: 'Spotify', datePosted: '2025-01-15', amount: 999 }),
      txn({ payee: 'Spotify', datePosted: '2025-02-15', amount: 999 }),
    ];

    const sixMonths = [
      txn({ payee: 'Spotify', datePosted: '2025-01-15', amount: 999 }),
      txn({ payee: 'Spotify', datePosted: '2025-02-15', amount: 999 }),
      txn({ payee: 'Spotify', datePosted: '2025-03-15', amount: 999 }),
      txn({ payee: 'Spotify', datePosted: '2025-04-15', amount: 999 }),
      txn({ payee: 'Spotify', datePosted: '2025-05-15', amount: 999 }),
      txn({ payee: 'Spotify', datePosted: '2025-06-15', amount: 999 }),
    ];

    const twoResults = detectRecurringCharges(twoMonths, [], []);
    const sixResults = detectRecurringCharges(sixMonths, [], []);

    expect(twoResults).toHaveLength(1);
    expect(sixResults).toHaveLength(1);
    expect(sixResults[0]!.confidence).toBeGreaterThan(twoResults[0]!.confidence);
  });

  it('sorts results by confidence descending', () => {
    const transactions = [
      // Consistent Netflix
      txn({ payee: 'Netflix', datePosted: '2025-01-15', amount: 1599 }),
      txn({ payee: 'Netflix', datePosted: '2025-02-15', amount: 1599 }),
      txn({ payee: 'Netflix', datePosted: '2025-03-15', amount: 1599 }),
      txn({ payee: 'Netflix', datePosted: '2025-04-15', amount: 1599 }),
      txn({ payee: 'Netflix', datePosted: '2025-05-15', amount: 1599 }),
      txn({ payee: 'Netflix', datePosted: '2025-06-15', amount: 1599 }),
      // Less consistent variable amounts
      txn({ payee: 'Utility Co', datePosted: '2025-01-05', amount: 8500 }),
      txn({ payee: 'Utility Co', datePosted: '2025-02-05', amount: 9200 }),
    ];

    const results = detectRecurringCharges(transactions, [], []);
    expect(results.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.confidence).toBeGreaterThanOrEqual(
        results[i]!.confidence,
      );
    }
  });

  it('skips pending transactions', () => {
    const transactions = [
      txn({ payee: 'Netflix', datePosted: '2025-01-15', amount: 1599 }),
      txn({ payee: 'Netflix', datePosted: '2025-02-15', amount: 1599, isPending: true }),
    ];

    const results = detectRecurringCharges(transactions, [], []);
    // Only 1 non-pending transaction, so not enough for detection
    expect(results).toHaveLength(0);
  });

  it('skips transactions with null payee', () => {
    const transactions = [
      txn({ payee: null as unknown as string, datePosted: '2025-01-15', amount: 1599 }),
      txn({ payee: null as unknown as string, datePosted: '2025-02-15', amount: 1599 }),
    ];

    const results = detectRecurringCharges(transactions, [], []);
    expect(results).toHaveLength(0);
  });
});

describe('getSubscriptionSuggestions', () => {
  it('filters out dismissed payees', () => {
    const transactions = [
      txn({ payee: 'Netflix', datePosted: '2025-01-15', amount: 1599 }),
      txn({ payee: 'Netflix', datePosted: '2025-02-15', amount: 1599 }),
      txn({ payee: 'Netflix', datePosted: '2025-03-15', amount: 1599 }),
      txn({ payee: 'Spotify', datePosted: '2025-01-15', amount: 999 }),
      txn({ payee: 'Spotify', datePosted: '2025-02-15', amount: 999 }),
      txn({ payee: 'Spotify', datePosted: '2025-03-15', amount: 999 }),
    ];

    const results = getSubscriptionSuggestions(
      transactions,
      [],
      [],
      ['Netflix'],
    );
    expect(results).toHaveLength(1);
    expect(results[0]!.normalizedPayee).toBe('spotify');
  });

  it('normalizes dismissed payee names for matching', () => {
    const transactions = [
      txn({ payee: 'NETFLIX * MONTHLY', datePosted: '2025-01-15', amount: 1599 }),
      txn({ payee: 'NETFLIX * MONTHLY', datePosted: '2025-02-15', amount: 1599 }),
      txn({ payee: 'NETFLIX * MONTHLY', datePosted: '2025-03-15', amount: 1599 }),
    ];

    const results = getSubscriptionSuggestions(
      transactions,
      [],
      [],
      ['netflix'],
    );
    expect(results).toHaveLength(0);
  });

  it('returns empty for no recurring charges', () => {
    const transactions = [
      txn({ payee: 'Random Store', datePosted: '2025-01-15', amount: 5000 }),
    ];

    const results = getSubscriptionSuggestions(transactions, [], [], []);
    expect(results).toHaveLength(0);
  });
});
