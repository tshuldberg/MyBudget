import { useMemo } from 'react';
import { useDatabase } from '../lib/DatabaseProvider';
import {
  calculateMonthBudget,
  getCategoryGroups,
  getCategoriesByGroup,
  getAllocationMap,
  getActivityByCategory,
  getTotalIncome,
  allocateToCategory,
} from '@mybudget/shared';
import type { MonthBudgetState, MonthBudgetInput } from '@mybudget/shared';
import { uuid } from '../lib/uuid';

export function useBudget(month: string): MonthBudgetState {
  const { db, version } = useDatabase();

  return useMemo(() => {
    const groups = getCategoryGroups(db);
    const budgetGroups = groups.map((g) => {
      const cats = getCategoriesByGroup(db, g.id);
      return {
        groupId: g.id,
        name: g.name,
        categories: cats.map((c) => ({
          categoryId: c.id,
          name: c.name,
          emoji: c.emoji,
          targetAmount: c.target_amount,
          targetType: c.target_type,
        })),
      };
    });

    const allocations = getAllocationMap(db, month);
    const activity = getActivityByCategory(db, month);
    const totalIncome = getTotalIncome(db, month);

    // MVP: carry-forwards start empty. A follow-up can compute from prior months.
    const carryForwards = new Map<string, number>();

    const input: MonthBudgetInput = {
      month,
      groups: budgetGroups,
      allocations,
      activity,
      carryForwards,
      totalIncome,
      overspentLastMonth: 0,
    };

    return calculateMonthBudget(input);
  }, [db, month, version]);
}

export function useAllocate() {
  const { db, invalidate } = useDatabase();

  return (categoryId: string, month: string, amount: number) => {
    allocateToCategory(db, uuid(), categoryId, month, amount);
    invalidate();
  };
}
