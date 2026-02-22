/**
 * Payee autocomplete system.
 * Learns from past entries — after 3+ uses with the same category,
 * auto-suggests that category for the payee.
 */

import type { DatabaseAdapter } from './migrations';
import type { PayeeCache } from '../models/schemas';

const SUGGESTION_THRESHOLD = 3;

/**
 * Update the payee cache after a transaction is created or updated.
 * Increments use_count and tracks the last category used.
 */
export function updatePayeeCache(
  db: DatabaseAdapter,
  payee: string,
  categoryId: string | null,
): void {
  const now = new Date().toISOString();
  db.execute(
    `INSERT INTO payee_cache (payee, last_category_id, use_count, last_used)
     VALUES (?, ?, 1, ?)
     ON CONFLICT(payee) DO UPDATE SET
       last_category_id = excluded.last_category_id,
       use_count = payee_cache.use_count + 1,
       last_used = excluded.last_used`,
    [payee, categoryId, now],
  );
}

/**
 * Get payee suggestions matching a prefix, ordered by usage frequency.
 */
export function getPayeeSuggestions(
  db: DatabaseAdapter,
  prefix: string,
  limit = 10,
): PayeeCache[] {
  if (prefix.length === 0) return [];

  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM payee_cache
     WHERE payee LIKE ?
     ORDER BY use_count DESC, last_used DESC
     LIMIT ?`,
    [`${prefix}%`, limit],
  );
  return rows.map(rowToPayeeCache);
}

/**
 * Get category suggestion for a payee.
 * Returns the last-used category ID if use_count >= threshold, else null.
 */
export function getCategorySuggestion(
  db: DatabaseAdapter,
  payee: string,
): string | null {
  const rows = db.query<{ last_category_id: string | null; use_count: number }>(
    `SELECT last_category_id, use_count FROM payee_cache WHERE payee = ?`,
    [payee],
  );
  if (rows.length === 0) return null;
  if (rows[0].use_count < SUGGESTION_THRESHOLD) return null;
  return rows[0].last_category_id;
}

function rowToPayeeCache(row: Record<string, unknown>): PayeeCache {
  return {
    payee: row.payee as string,
    last_category_id: (row.last_category_id as string) ?? null,
    use_count: row.use_count as number,
    last_used: row.last_used as string,
  };
}
