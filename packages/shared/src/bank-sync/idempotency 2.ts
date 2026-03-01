/**
 * Webhook idempotency layer.
 *
 * Ensures each webhook event is processed exactly once by tracking event IDs
 * and deduplicating within a configurable time window. Prevents duplicate
 * transactions, double syncs, and other data corruption from webhook
 * redelivery.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IdempotencyStatus = 'processing' | 'completed' | 'failed';

export interface IdempotencyEntry {
  eventKey: string;
  processedAtMs: number;
  status: IdempotencyStatus;
}

export interface IdempotencyStoreConfig {
  entries?: Map<string, IdempotencyEntry>;
  nowMs?: () => number;
  ttlMs?: number;
}

export interface IdempotencyStore {
  get(provider: string, eventId: string): IdempotencyEntry | null;
  entries: Map<string, IdempotencyEntry>;
  nowMs: () => number;
  ttlMs: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeKey(provider: string, eventId: string): string {
  return `${provider}:${eventId}`;
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Create an in-memory idempotency store.
 */
export function createIdempotencyStore(
  config: IdempotencyStoreConfig = {},
): IdempotencyStore {
  const entries = config.entries ?? new Map<string, IdempotencyEntry>();
  const nowMs = config.nowMs ?? (() => Date.now());
  const ttlMs = config.ttlMs ?? 86400000; // 24 hours default

  return {
    entries,
    nowMs,
    ttlMs,
    get(provider: string, eventId: string): IdempotencyEntry | null {
      const key = makeKey(provider, eventId);
      return entries.get(key) ?? null;
    },
  };
}

/**
 * Check if a webhook event has already been processed (or is in progress).
 * Returns false for failed events (allowing retry) and expired entries.
 */
export function isWebhookDuplicate(
  store: IdempotencyStore,
  provider: string,
  eventId: string,
): boolean {
  const key = makeKey(provider, eventId);
  const entry = store.entries.get(key);
  if (!entry) return false;

  // Failed events can be retried
  if (entry.status === 'failed') return false;

  // Expired entries are no longer considered duplicates
  const age = store.nowMs() - entry.processedAtMs;
  if (age > store.ttlMs) return false;

  return true;
}

/**
 * Record a webhook event as processed (or in-progress/failed).
 */
export function recordWebhookProcessed(
  store: IdempotencyStore,
  provider: string,
  eventId: string,
  status: IdempotencyStatus,
): void {
  const key = makeKey(provider, eventId);
  store.entries.set(key, {
    eventKey: key,
    processedAtMs: store.nowMs(),
    status,
  });
}

/**
 * Remove expired entries from the store.
 * Does not prune in-progress entries to avoid losing track of in-flight work.
 * Returns the number of entries pruned.
 */
export function pruneExpiredEntries(store: IdempotencyStore): number {
  const now = store.nowMs();
  let pruned = 0;

  for (const [key, entry] of store.entries) {
    // Don't prune in-progress entries
    if (entry.status === 'processing') continue;

    // Entries at epoch (processedAtMs <= 0) are always considered stale
    if (entry.processedAtMs <= 0) {
      store.entries.delete(key);
      pruned++;
      continue;
    }

    const age = now - entry.processedAtMs;
    if (age > store.ttlMs) {
      store.entries.delete(key);
      pruned++;
    }
  }

  return pruned;
}
