/**
 * TDD tests for webhook idempotency.
 *
 * Bank sync webhooks can be delivered multiple times. The idempotency layer
 * ensures each webhook event is processed exactly once by tracking event IDs
 * and deduplicating within a configurable time window. This prevents
 * duplicate transactions, double syncs, and other data corruption.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createIdempotencyStore,
  isWebhookDuplicate,
  recordWebhookProcessed,
  pruneExpiredEntries,
  type IdempotencyStore,
  type IdempotencyEntry,
} from '../idempotency';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeStore(
  entries: Map<string, IdempotencyEntry> = new Map(),
  nowMs: () => number = () => 1000000,
): IdempotencyStore {
  return createIdempotencyStore({
    entries,
    nowMs,
    ttlMs: 86400000, // 24 hours default
  });
}

// ---------------------------------------------------------------------------
// isWebhookDuplicate
// ---------------------------------------------------------------------------

describe('isWebhookDuplicate', () => {
  it('returns false for first-time event', () => {
    const store = makeStore();
    const result = isWebhookDuplicate(store, 'plaid', 'evt-1');

    expect(result).toBe(false);
  });

  it('returns true for already-processed event', () => {
    const entries = new Map<string, IdempotencyEntry>([
      ['plaid:evt-1', { eventKey: 'plaid:evt-1', processedAtMs: 900000, status: 'completed' }],
    ]);
    const store = makeStore(entries);

    const result = isWebhookDuplicate(store, 'plaid', 'evt-1');
    expect(result).toBe(true);
  });

  it('returns true for in-progress event (prevents concurrent processing)', () => {
    const entries = new Map<string, IdempotencyEntry>([
      ['plaid:evt-2', { eventKey: 'plaid:evt-2', processedAtMs: 999000, status: 'processing' }],
    ]);
    const store = makeStore(entries);

    const result = isWebhookDuplicate(store, 'plaid', 'evt-2');
    expect(result).toBe(true);
  });

  it('returns false for expired entry (outside TTL)', () => {
    const entries = new Map<string, IdempotencyEntry>([
      ['plaid:evt-old', {
        eventKey: 'plaid:evt-old',
        processedAtMs: 100000, // very old
        status: 'completed',
      }],
    ]);
    const store = makeStore(entries, () => 100000 + 86400001); // 24h + 1ms later

    const result = isWebhookDuplicate(store, 'plaid', 'evt-old');
    expect(result).toBe(false);
  });

  it('creates composite key from provider and event ID', () => {
    const entries = new Map<string, IdempotencyEntry>([
      ['plaid:evt-1', { eventKey: 'plaid:evt-1', processedAtMs: 900000, status: 'completed' }],
    ]);
    const store = makeStore(entries);

    // Same event ID but different provider should not be duplicate
    expect(isWebhookDuplicate(store, 'mx', 'evt-1')).toBe(false);
    expect(isWebhookDuplicate(store, 'plaid', 'evt-1')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// recordWebhookProcessed
// ---------------------------------------------------------------------------

describe('recordWebhookProcessed', () => {
  it('records a new event as processing', () => {
    const store = makeStore();

    recordWebhookProcessed(store, 'plaid', 'evt-1', 'processing');

    expect(isWebhookDuplicate(store, 'plaid', 'evt-1')).toBe(true);
  });

  it('updates status from processing to completed', () => {
    const store = makeStore();

    recordWebhookProcessed(store, 'plaid', 'evt-1', 'processing');
    recordWebhookProcessed(store, 'plaid', 'evt-1', 'completed');

    const entry = store.get('plaid', 'evt-1');
    expect(entry).not.toBeNull();
    expect(entry!.status).toBe('completed');
  });

  it('updates status from processing to failed', () => {
    const store = makeStore();

    recordWebhookProcessed(store, 'plaid', 'evt-1', 'processing');
    recordWebhookProcessed(store, 'plaid', 'evt-1', 'failed');

    const entry = store.get('plaid', 'evt-1');
    expect(entry!.status).toBe('failed');
  });

  it('re-allows failed events to be reprocessed', () => {
    const entries = new Map<string, IdempotencyEntry>([
      ['plaid:evt-fail', {
        eventKey: 'plaid:evt-fail',
        processedAtMs: 900000,
        status: 'failed',
      }],
    ]);
    const store = makeStore(entries);

    // Failed events should not be considered duplicates (allow retry)
    expect(isWebhookDuplicate(store, 'plaid', 'evt-fail')).toBe(false);
  });

  it('stores timestamp of processing', () => {
    const now = 1234567890;
    const store = makeStore(new Map(), () => now);

    recordWebhookProcessed(store, 'plaid', 'evt-1', 'completed');

    const entry = store.get('plaid', 'evt-1');
    expect(entry!.processedAtMs).toBe(now);
  });
});

// ---------------------------------------------------------------------------
// pruneExpiredEntries
// ---------------------------------------------------------------------------

describe('pruneExpiredEntries', () => {
  it('removes entries older than TTL', () => {
    const now = 1000000;
    const ttlMs = 86400000; // 24 hours

    const entries = new Map<string, IdempotencyEntry>([
      ['plaid:old', {
        eventKey: 'plaid:old',
        processedAtMs: now - ttlMs - 1, // expired
        status: 'completed',
      }],
      ['plaid:recent', {
        eventKey: 'plaid:recent',
        processedAtMs: now - 1000, // 1 second ago
        status: 'completed',
      }],
    ]);

    const store = makeStore(entries, () => now);
    const prunedCount = pruneExpiredEntries(store);

    expect(prunedCount).toBe(1);
    expect(store.get('plaid', 'old')).toBeNull();
    expect(store.get('plaid', 'recent')).not.toBeNull();
  });

  it('returns 0 when nothing to prune', () => {
    const store = makeStore();
    const prunedCount = pruneExpiredEntries(store);
    expect(prunedCount).toBe(0);
  });

  it('prunes all entries when all are expired', () => {
    const now = 1000000;
    const entries = new Map<string, IdempotencyEntry>([
      ['plaid:1', { eventKey: 'plaid:1', processedAtMs: 0, status: 'completed' }],
      ['plaid:2', { eventKey: 'plaid:2', processedAtMs: 0, status: 'completed' }],
      ['plaid:3', { eventKey: 'plaid:3', processedAtMs: 0, status: 'completed' }],
    ]);

    const store = makeStore(entries, () => now);
    const prunedCount = pruneExpiredEntries(store);

    expect(prunedCount).toBe(3);
  });

  it('does not prune in-progress entries even if old', () => {
    const now = 1000000;
    const entries = new Map<string, IdempotencyEntry>([
      ['plaid:stuck', {
        eventKey: 'plaid:stuck',
        processedAtMs: 0, // very old
        status: 'processing', // but still processing
      }],
    ]);

    const store = makeStore(entries, () => now);
    const prunedCount = pruneExpiredEntries(store);

    // Should not prune processing entries to avoid losing track of in-flight work
    expect(prunedCount).toBe(0);
    expect(store.get('plaid', 'stuck')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createIdempotencyStore (integration)
// ---------------------------------------------------------------------------

describe('createIdempotencyStore', () => {
  it('provides get/set/delete operations', () => {
    const store = makeStore();

    expect(store.get('plaid', 'evt-1')).toBeNull();

    recordWebhookProcessed(store, 'plaid', 'evt-1', 'completed');
    expect(store.get('plaid', 'evt-1')).not.toBeNull();
  });

  it('handles concurrent events from different providers', () => {
    const store = makeStore();

    recordWebhookProcessed(store, 'plaid', 'evt-1', 'completed');
    recordWebhookProcessed(store, 'mx', 'evt-1', 'completed');

    expect(store.get('plaid', 'evt-1')).not.toBeNull();
    expect(store.get('mx', 'evt-1')).not.toBeNull();
    // They are distinct entries
    expect(store.get('plaid', 'evt-1')!.eventKey).toBe('plaid:evt-1');
    expect(store.get('mx', 'evt-1')!.eventKey).toBe('mx:evt-1');
  });

  it('respects custom TTL', () => {
    const now = 1000000;
    const shortTtl = 5000; // 5 seconds
    const entries = new Map<string, IdempotencyEntry>([
      ['plaid:evt', {
        eventKey: 'plaid:evt',
        processedAtMs: now - 6000, // 6 seconds ago
        status: 'completed',
      }],
    ]);

    const store = createIdempotencyStore({
      entries,
      nowMs: () => now,
      ttlMs: shortTtl,
    });

    // Should be expired with short TTL
    expect(isWebhookDuplicate(store, 'plaid', 'evt')).toBe(false);
  });
});
