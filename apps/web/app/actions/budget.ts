'use server';

import { getDb } from './db';
import {
  calculateMonthBudget,
  getCarryForward,
  getTotalOverspent,
  getCategoryGroups,
  getCategoriesByGroup,
  getActivityByCategory,
  getTotalIncome,
  getAllocationMap,
  allocateToCategory,
  moveAllocation,
} from '@mybudget/shared';
import type { MonthBudgetState } from '@mybudget/shared';
import { randomUUID } from 'crypto';

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function previousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

export async function fetchBudgetForMonth(month?: string): Promise<MonthBudgetState> {
  const db = getDb();
  const targetMonth = month ?? currentMonth();
  const prevMonth = previousMonth(targetMonth);

  // Gather category groups and categories
  const groups = getCategoryGroups(db).map((g) => ({
    groupId: g.id,
    name: g.name,
    categories: getCategoriesByGroup(db, g.id).map((c) => ({
      categoryId: c.id,
      name: c.name,
      emoji: c.emoji,
      targetAmount: c.target_amount,
      targetType: c.target_type,
    })),
  }));

  // Get allocations, activity, income for target month
  const allocations = getAllocationMap(db, targetMonth);
  const activity = getActivityByCategory(db, targetMonth);
  const totalIncome = getTotalIncome(db, targetMonth);

  // Calculate previous month to get carry-forwards
  const prevGroups = getCategoryGroups(db).map((g) => ({
    groupId: g.id,
    name: g.name,
    categories: getCategoriesByGroup(db, g.id).map((c) => ({
      categoryId: c.id,
      name: c.name,
      emoji: c.emoji,
      targetAmount: c.target_amount,
      targetType: c.target_type,
    })),
  }));

  const prevAllocations = getAllocationMap(db, prevMonth);
  const prevActivity = getActivityByCategory(db, prevMonth);
  const prevIncome = getTotalIncome(db, prevMonth);
  const prevBudget = calculateMonthBudget({
    month: prevMonth,
    groups: prevGroups,
    allocations: prevAllocations,
    activity: prevActivity,
    carryForwards: new Map(),
    totalIncome: prevIncome,
    overspentLastMonth: 0,
  });

  const carryForwards = getCarryForward(prevBudget);
  const overspentLastMonth = getTotalOverspent(prevBudget);

  return calculateMonthBudget({
    month: targetMonth,
    groups,
    allocations,
    activity,
    carryForwards,
    totalIncome,
    overspentLastMonth,
  });
}

export async function setAllocation(
  categoryId: string,
  month: string,
  amount: number,
): Promise<void> {
  allocateToCategory(getDb(), randomUUID(), categoryId, month, amount);
}

export async function moveMoney(
  fromCategoryId: string,
  toCategoryId: string,
  month: string,
  amount: number,
): Promise<void> {
  moveAllocation(getDb(), fromCategoryId, toCategoryId, month, amount, randomUUID());
}
