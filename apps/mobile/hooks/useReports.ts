import { useMemo } from 'react';
import { useDatabase } from '../lib/DatabaseProvider';
import {
  getActivityByCategory,
  getTotalIncome,
  getCategories,
  getSubscriptions,
  calculateSubscriptionSummary,
} from '@mybudget/shared';

export interface SpendingCategory {
  name: string;
  emoji: string | null;
  amount: number;
  percent: number;
}

export interface ReportData {
  totalIncome: number;
  totalSpending: number;
  netSavings: number;
  spendingByCategory: SpendingCategory[];
  subscriptionMonthly: number;
  subscriptionAnnual: number;
}

export function useReports(month: string): ReportData {
  const { db, version } = useDatabase();

  return useMemo(() => {
    const activity = getActivityByCategory(db, month);
    const totalIncome = getTotalIncome(db, month);
    const categories = getCategories(db);
    const activeSubs = getSubscriptions(db, { status: 'active' });
    const subSummary = calculateSubscriptionSummary(activeSubs);

    let totalSpending = 0;
    const categorySpending = categories
      .map((cat) => {
        const amount = Math.abs(activity.get(cat.id) ?? 0);
        totalSpending += amount;
        return { name: cat.name, emoji: cat.emoji, amount };
      })
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const spendingByCategory = categorySpending.map((c) => ({
      ...c,
      percent: totalSpending > 0 ? Math.round((c.amount / totalSpending) * 100) : 0,
    }));

    return {
      totalIncome,
      totalSpending,
      netSavings: totalIncome - totalSpending,
      spendingByCategory,
      subscriptionMonthly: subSummary.monthlyTotal,
      subscriptionAnnual: subSummary.annualTotal,
    };
  }, [db, month, version]);
}
