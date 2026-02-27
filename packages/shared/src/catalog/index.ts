// Subscription catalog — 200+ pre-populated services with names, prices, icons

export { CatalogEntrySchema, BillingCycleSchema, CatalogCategorySchema, CancellationDifficultySchema } from './types';
export type { CatalogEntry, BillingCycle, CatalogCategory, CancellationDifficulty } from './types';
export { CATALOG_ENTRIES, isPopular } from './data';

import type { CatalogEntry, CatalogCategory, CancellationDifficulty } from './types';
import { CATALOG_ENTRIES, isPopular } from './data';

/**
 * Search the catalog by name (case-insensitive substring match).
 * Returns entries sorted by relevance: exact prefix matches first,
 * then substring matches, with popular entries boosted.
 */
export function searchCatalog(query: string): CatalogEntry[] {
  const q = query.toLowerCase().trim();
  if (q.length === 0) return [];

  const matches = CATALOG_ENTRIES.filter(
    (entry) =>
      entry.name.toLowerCase().includes(q) ||
      entry.id.includes(q),
  );

  return [...matches].sort((a, b) => {
    const aNameLower = a.name.toLowerCase();
    const bNameLower = b.name.toLowerCase();
    const aPrefix = aNameLower.startsWith(q) ? 0 : 1;
    const bPrefix = bNameLower.startsWith(q) ? 0 : 1;
    if (aPrefix !== bPrefix) return aPrefix - bPrefix;

    const aPopular = isPopular(a) ? 0 : 1;
    const bPopular = isPopular(b) ? 0 : 1;
    if (aPopular !== bPopular) return aPopular - bPopular;

    return aNameLower.localeCompare(bNameLower);
  });
}

/**
 * Get all catalog entries for a specific category, sorted by name.
 */
export function getCatalogByCategory(category: CatalogCategory): CatalogEntry[] {
  return CATALOG_ENTRIES
    .filter((entry) => entry.category === category)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get the most commonly-tracked entries (curated list), sorted by name.
 */
export function getPopularEntries(): CatalogEntry[] {
  return CATALOG_ENTRIES
    .filter(isPopular)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get cancellation info for a catalog entry by its ID.
 * Returns null if the entry is not found.
 */
export function getCancellationInfo(catalogId: string): {
  url: string | undefined;
  difficulty: CancellationDifficulty | undefined;
  notes: string | undefined;
} | null {
  const entry = CATALOG_ENTRIES.find((e) => e.id === catalogId);
  if (!entry) return null;
  return {
    url: entry.cancellationUrl,
    difficulty: entry.cancellationDifficulty,
    notes: entry.cancellationNotes,
  };
}
