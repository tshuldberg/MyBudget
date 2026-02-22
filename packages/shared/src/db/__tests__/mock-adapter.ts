/**
 * In-memory mock DatabaseAdapter for testing.
 * Stores data in Maps, simulating SQLite behavior for payee_cache table.
 */

import type { DatabaseAdapter } from '../migrations';

interface PayeeCacheRow {
  payee: string;
  last_category_id: string | null;
  use_count: number;
  last_used: string;
}

export function createMockAdapter(): DatabaseAdapter & {
  getPayeeCacheRows(): PayeeCacheRow[];
} {
  const payeeCache = new Map<string, PayeeCacheRow>();

  return {
    execute(sql: string, params?: unknown[]): void {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.startsWith('INSERT INTO PAYEE_CACHE')) {
        const [payee, categoryId, lastUsed] = params as [string, string | null, string];
        const existing = payeeCache.get(payee);
        if (existing) {
          // ON CONFLICT: increment use_count, update category and last_used
          existing.last_category_id = categoryId;
          existing.use_count += 1;
          existing.last_used = lastUsed;
        } else {
          payeeCache.set(payee, {
            payee,
            last_category_id: categoryId,
            use_count: 1,
            last_used: lastUsed,
          });
        }
      }
    },

    query<T>(sql: string, params?: unknown[]): T[] {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.includes('FROM PAYEE_CACHE') && trimmed.includes('LIKE')) {
        const prefix = (params?.[0] as string).replace('%', '');
        const limit = (params?.[1] as number) ?? 10;
        const matches = Array.from(payeeCache.values())
          .filter((row) => row.payee.startsWith(prefix))
          .sort((a, b) => {
            if (b.use_count !== a.use_count) return b.use_count - a.use_count;
            return b.last_used.localeCompare(a.last_used);
          })
          .slice(0, limit);
        return matches as T[];
      }

      if (trimmed.includes('FROM PAYEE_CACHE') && trimmed.includes('WHERE PAYEE = ?')) {
        const payee = params?.[0] as string;
        const row = payeeCache.get(payee);
        if (!row) return [];
        return [{ last_category_id: row.last_category_id, use_count: row.use_count }] as T[];
      }

      return [];
    },

    transaction(fn: () => void): void {
      fn();
    },

    getPayeeCacheRows(): PayeeCacheRow[] {
      return Array.from(payeeCache.values());
    },
  };
}
