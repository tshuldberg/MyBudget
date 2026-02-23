import { useMemo } from 'react';
import { useDatabase } from '../lib/DatabaseProvider';
import {
  getCategoryGroups,
  getCategories,
  getCategoriesByGroup,
  createCategoryGroup,
  createCategory,
} from '@mybudget/shared';
import type { CategoryGroup, CategoryGroupInsert, Category, CategoryInsert } from '@mybudget/shared';
import { uuid } from '../lib/uuid';

export function useCategories() {
  const { db, version, invalidate } = useDatabase();

  const groups = useMemo(() => getCategoryGroups(db), [db, version]);
  const categories = useMemo(() => getCategories(db), [db, version]);

  /** Map of category id → Category for quick lookups. */
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  return {
    groups,
    categories,
    categoryMap,
    categoriesByGroup: (groupId: string) => getCategoriesByGroup(db, groupId),
    createGroup: (input: CategoryGroupInsert): CategoryGroup => {
      const result = createCategoryGroup(db, uuid(), input);
      invalidate();
      return result;
    },
    createCategory: (input: CategoryInsert): Category => {
      const result = createCategory(db, uuid(), input);
      invalidate();
      return result;
    },
  };
}
