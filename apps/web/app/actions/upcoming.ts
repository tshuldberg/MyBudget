'use server';

import { getDb } from './db';
import {
  getActiveTemplates,
  getUpcomingTransactions,
  groupByDate,
  getUpcomingTotal,
} from '@mybudget/shared';
import type { GroupedUpcoming } from '@mybudget/shared';

export interface UpcomingResult {
  groups: GroupedUpcoming[];
  total: number;
}

export async function fetchUpcomingTransactions(daysAhead = 30): Promise<UpcomingResult> {
  const db = getDb();
  const templates = getActiveTemplates(db);

  const mapped = templates.map((t) => ({
    id: t.id,
    accountId: t.account_id,
    categoryId: t.category_id,
    payee: t.payee,
    amount: t.amount,
    frequency: t.frequency as 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually',
    nextDate: t.next_date,
    endDate: t.end_date,
    isActive: !!t.is_active,
  }));

  const upcoming = getUpcomingTransactions(mapped, daysAhead);
  const groups = groupByDate(upcoming);
  const total = getUpcomingTotal(upcoming);

  return { groups, total };
}
