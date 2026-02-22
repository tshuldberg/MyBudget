import { describe, it, expect, beforeEach } from 'vitest';
import { updatePayeeCache, getPayeeSuggestions, getCategorySuggestion } from '../payee-cache';
import { createMockAdapter } from './mock-adapter';

describe('payee-cache', () => {
  let db: ReturnType<typeof createMockAdapter>;

  beforeEach(() => {
    db = createMockAdapter();
  });

  describe('updatePayeeCache', () => {
    it('creates cache entry with count=1 on first use', () => {
      updatePayeeCache(db, 'Whole Foods', 'cat-groceries');
      const rows = db.getPayeeCacheRows();
      expect(rows).toHaveLength(1);
      expect(rows[0].payee).toBe('Whole Foods');
      expect(rows[0].last_category_id).toBe('cat-groceries');
      expect(rows[0].use_count).toBe(1);
    });

    it('increments count on second use', () => {
      updatePayeeCache(db, 'Whole Foods', 'cat-groceries');
      updatePayeeCache(db, 'Whole Foods', 'cat-groceries');
      const rows = db.getPayeeCacheRows();
      expect(rows).toHaveLength(1);
      expect(rows[0].use_count).toBe(2);
    });

    it('updates last_category_id when category changes', () => {
      updatePayeeCache(db, 'Whole Foods', 'cat-groceries');
      updatePayeeCache(db, 'Whole Foods', 'cat-household');
      const rows = db.getPayeeCacheRows();
      expect(rows[0].last_category_id).toBe('cat-household');
    });

    it('handles null category_id', () => {
      updatePayeeCache(db, 'ATM Withdrawal', null);
      const rows = db.getPayeeCacheRows();
      expect(rows[0].last_category_id).toBeNull();
    });

    it('tracks multiple payees independently', () => {
      updatePayeeCache(db, 'Whole Foods', 'cat-groceries');
      updatePayeeCache(db, 'Target', 'cat-shopping');
      const rows = db.getPayeeCacheRows();
      expect(rows).toHaveLength(2);
    });
  });

  describe('getCategorySuggestion', () => {
    it('returns null when payee is not in cache', () => {
      const suggestion = getCategorySuggestion(db, 'Unknown Store');
      expect(suggestion).toBeNull();
    });

    it('returns null when use_count < 3', () => {
      updatePayeeCache(db, 'Whole Foods', 'cat-groceries');
      updatePayeeCache(db, 'Whole Foods', 'cat-groceries');
      const suggestion = getCategorySuggestion(db, 'Whole Foods');
      expect(suggestion).toBeNull();
    });

    it('returns category_id when use_count >= 3', () => {
      updatePayeeCache(db, 'Whole Foods', 'cat-groceries');
      updatePayeeCache(db, 'Whole Foods', 'cat-groceries');
      updatePayeeCache(db, 'Whole Foods', 'cat-groceries');
      const suggestion = getCategorySuggestion(db, 'Whole Foods');
      expect(suggestion).toBe('cat-groceries');
    });

    it('returns updated category after override', () => {
      updatePayeeCache(db, 'Target', 'cat-groceries');
      updatePayeeCache(db, 'Target', 'cat-groceries');
      updatePayeeCache(db, 'Target', 'cat-shopping'); // override on third use
      const suggestion = getCategorySuggestion(db, 'Target');
      expect(suggestion).toBe('cat-shopping');
    });
  });

  describe('getPayeeSuggestions', () => {
    it('returns empty for empty prefix', () => {
      updatePayeeCache(db, 'Whole Foods', 'cat-groceries');
      const suggestions = getPayeeSuggestions(db, '');
      expect(suggestions).toHaveLength(0);
    });

    it('matches payees by prefix', () => {
      updatePayeeCache(db, 'Trader Joes', 'cat-groceries');
      updatePayeeCache(db, 'Transit Authority', 'cat-transport');
      updatePayeeCache(db, 'Whole Foods', 'cat-groceries');

      const suggestions = getPayeeSuggestions(db, 'Tra');
      expect(suggestions).toHaveLength(2);
      expect(suggestions.map((s) => s.payee)).toContain('Trader Joes');
      expect(suggestions.map((s) => s.payee)).toContain('Transit Authority');
    });

    it('does not match non-prefix substrings', () => {
      updatePayeeCache(db, 'Whole Foods', 'cat-groceries');
      const suggestions = getPayeeSuggestions(db, 'Foods');
      expect(suggestions).toHaveLength(0);
    });

    it('sorts by use_count descending', () => {
      updatePayeeCache(db, 'Trader Joes', 'cat-groceries');
      updatePayeeCache(db, 'Transit Authority', 'cat-transport');
      updatePayeeCache(db, 'Transit Authority', 'cat-transport');
      updatePayeeCache(db, 'Transit Authority', 'cat-transport');

      const suggestions = getPayeeSuggestions(db, 'Tra');
      expect(suggestions[0].payee).toBe('Transit Authority');
      expect(suggestions[0].use_count).toBe(3);
      expect(suggestions[1].payee).toBe('Trader Joes');
      expect(suggestions[1].use_count).toBe(1);
    });

    it('respects limit parameter', () => {
      updatePayeeCache(db, 'Store A', null);
      updatePayeeCache(db, 'Store B', null);
      updatePayeeCache(db, 'Store C', null);

      const suggestions = getPayeeSuggestions(db, 'Store', 2);
      expect(suggestions).toHaveLength(2);
    });
  });
});
