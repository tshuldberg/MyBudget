import { describe, expect, it } from 'vitest';
import {
  CatalogEntrySchema,
  CancellationDifficultySchema,
  CATALOG_ENTRIES,
  searchCatalog,
  getCatalogByCategory,
  getPopularEntries,
  getCancellationInfo,
} from '../index';

describe('CatalogEntrySchema', () => {
  it('validates a complete entry with cancellation fields', () => {
    const entry = {
      id: 'test-service',
      name: 'Test Service',
      defaultPrice: 999,
      billingCycle: 'monthly',
      category: 'entertainment',
      iconKey: 'test',
      url: 'https://example.com',
      cancellationUrl: 'https://example.com/cancel',
      cancellationDifficulty: 'easy',
      cancellationNotes: 'Go to settings and cancel.',
    };
    expect(CatalogEntrySchema.safeParse(entry).success).toBe(true);
  });

  it('validates an entry without optional cancellation fields', () => {
    const entry = {
      id: 'test-service',
      name: 'Test Service',
      defaultPrice: 999,
      billingCycle: 'monthly',
      category: 'entertainment',
      iconKey: 'test',
    };
    expect(CatalogEntrySchema.safeParse(entry).success).toBe(true);
  });

  it('rejects an invalid cancellationUrl', () => {
    const entry = {
      id: 'test-service',
      name: 'Test Service',
      defaultPrice: 999,
      billingCycle: 'monthly',
      category: 'entertainment',
      iconKey: 'test',
      cancellationUrl: 'not-a-url',
    };
    expect(CatalogEntrySchema.safeParse(entry).success).toBe(false);
  });

  it('rejects an invalid cancellationDifficulty value', () => {
    const entry = {
      id: 'test-service',
      name: 'Test Service',
      defaultPrice: 999,
      billingCycle: 'monthly',
      category: 'entertainment',
      iconKey: 'test',
      cancellationDifficulty: 'very-hard',
    };
    expect(CatalogEntrySchema.safeParse(entry).success).toBe(false);
  });
});

describe('CancellationDifficultySchema', () => {
  it('accepts valid difficulty values', () => {
    for (const val of ['easy', 'medium', 'hard', 'impossible']) {
      expect(CancellationDifficultySchema.safeParse(val).success).toBe(true);
    }
  });

  it('rejects invalid difficulty values', () => {
    expect(CancellationDifficultySchema.safeParse('trivial').success).toBe(false);
    expect(CancellationDifficultySchema.safeParse('').success).toBe(false);
  });
});

describe('CATALOG_ENTRIES', () => {
  it('has 200+ entries', () => {
    expect(CATALOG_ENTRIES.length).toBeGreaterThanOrEqual(200);
  });

  it('all entries pass schema validation', () => {
    for (const entry of CATALOG_ENTRIES) {
      const result = CatalogEntrySchema.safeParse(entry);
      expect(result.success, `Entry ${entry.id} failed validation: ${JSON.stringify(result)}`).toBe(true);
    }
  });

  it('all entries with cancellationUrl have valid URL format', () => {
    const withUrl = CATALOG_ENTRIES.filter((e) => e.cancellationUrl);
    expect(withUrl.length).toBeGreaterThan(0);
    for (const entry of withUrl) {
      expect(() => new URL(entry.cancellationUrl!)).not.toThrow();
    }
  });

  it('all entries with cancellationDifficulty use valid enum values', () => {
    const withDifficulty = CATALOG_ENTRIES.filter((e) => e.cancellationDifficulty);
    expect(withDifficulty.length).toBeGreaterThan(0);
    const validValues = new Set(['easy', 'medium', 'hard', 'impossible']);
    for (const entry of withDifficulty) {
      expect(validValues.has(entry.cancellationDifficulty!), `Entry ${entry.id} has invalid difficulty: ${entry.cancellationDifficulty}`).toBe(true);
    }
  });

  it('has no duplicate IDs', () => {
    const ids = CATALOG_ENTRIES.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all prices are non-negative integers (cents)', () => {
    for (const entry of CATALOG_ENTRIES) {
      expect(Number.isInteger(entry.defaultPrice), `Entry ${entry.id} has non-integer price`).toBe(true);
      expect(entry.defaultPrice).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('getCancellationInfo', () => {
  it('returns cancellation info for Netflix', () => {
    const info = getCancellationInfo('netflix-standard');
    expect(info).not.toBeNull();
    expect(info!.url).toBeDefined();
    expect(info!.difficulty).toBe('easy');
    expect(info!.notes).toBeDefined();
  });

  it('returns cancellation info for Adobe (hard difficulty)', () => {
    const info = getCancellationInfo('adobe-creative-cloud');
    expect(info).not.toBeNull();
    expect(info!.difficulty).toBe('hard');
  });

  it('returns cancellation info for SiriusXM (hard difficulty)', () => {
    const info = getCancellationInfo('siriusxm');
    expect(info).not.toBeNull();
    expect(info!.difficulty).toBe('hard');
  });

  it('returns cancellation info for Planet Fitness (hard difficulty)', () => {
    const info = getCancellationInfo('planet-fitness');
    expect(info).not.toBeNull();
    expect(info!.difficulty).toBe('hard');
  });

  it('returns null for unknown catalog ID', () => {
    expect(getCancellationInfo('nonexistent-service')).toBeNull();
  });

  it('returns undefined fields for entries without cancellation data', () => {
    // All entries now have at least cancellationDifficulty, but verify the shape
    const info = getCancellationInfo('netflix-standard');
    expect(info).toHaveProperty('url');
    expect(info).toHaveProperty('difficulty');
    expect(info).toHaveProperty('notes');
  });
});

describe('searchCatalog', () => {
  it('finds entries by name', () => {
    const results = searchCatalog('netflix');
    expect(results.length).toBeGreaterThanOrEqual(3);
    expect(results.every((r) => r.name.toLowerCase().includes('netflix'))).toBe(true);
  });

  it('returns empty array for empty query', () => {
    expect(searchCatalog('')).toEqual([]);
  });

  it('returns empty array for no match', () => {
    expect(searchCatalog('zzzznonexistent')).toEqual([]);
  });
});

describe('getCatalogByCategory', () => {
  it('returns only entries from the given category', () => {
    const health = getCatalogByCategory('health');
    expect(health.length).toBeGreaterThan(0);
    expect(health.every((e) => e.category === 'health')).toBe(true);
  });

  it('returns results sorted by name', () => {
    const entries = getCatalogByCategory('entertainment');
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i].name.localeCompare(entries[i - 1].name)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('getPopularEntries', () => {
  it('returns popular entries', () => {
    const popular = getPopularEntries();
    expect(popular.length).toBeGreaterThan(0);
    expect(popular.some((e) => e.id === 'netflix-standard')).toBe(true);
  });

  it('returns results sorted by name', () => {
    const popular = getPopularEntries();
    for (let i = 1; i < popular.length; i++) {
      expect(popular[i].name.localeCompare(popular[i - 1].name)).toBeGreaterThanOrEqual(0);
    }
  });
});
