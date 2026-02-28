'use server';

import { getDb } from './db';
import {
  searchCatalog,
  getCatalogByCategory as _getCatalogByCategory,
  getPopularEntries,
  getSubscriptionSuggestions,
} from '@mybudget/shared';
import type {
  Subscription,
  CatalogEntry,
  BankTransactionRecord,
  DetectedSubscription,
} from '@mybudget/shared';
import { randomUUID } from 'crypto';

export async function fetchSubscriptions(
  status?: 'active' | 'paused' | 'cancelled' | 'trial',
): Promise<Subscription[]> {
  const db = getDb();
  const rows = db.query<Record<string, unknown>>(
    status
      ? `SELECT * FROM subscriptions WHERE status = ? ORDER BY next_renewal`
      : `SELECT * FROM subscriptions ORDER BY sort_order, name`,
    status ? [status] : [],
  );
  return rows.map(rowToSubscription);
}

export async function createSubscription(input: {
  name: string;
  price: number;
  billing_cycle: string;
  status: string;
  start_date: string;
  next_renewal: string;
  category_id?: string | null;
  icon?: string | null;
  color?: string | null;
  url?: string | null;
  notes?: string | null;
  catalog_id?: string | null;
  trial_end_date?: string | null;
}): Promise<void> {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  db.execute(
    `INSERT INTO subscriptions (id, name, price, currency, billing_cycle, category_id, status, start_date, next_renewal, trial_end_date, notes, url, icon, color, notify_days, catalog_id, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, 'USD', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 0, ?, ?)`,
    [id, input.name, input.price, input.billing_cycle, input.category_id ?? null, input.status, input.start_date, input.next_renewal, input.trial_end_date ?? null, input.notes ?? null, input.url ?? null, input.icon ?? null, input.color ?? null, input.catalog_id ?? null, now, now],
  );
}

export async function updateSubscriptionAction(
  id: string,
  updates: Partial<{
    name: string;
    price: number;
    billing_cycle: string;
    status: string;
    category_id: string | null;
    notes: string | null;
    url: string | null;
  }>,
): Promise<void> {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, val] of Object.entries(updates)) {
    if (val !== undefined) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length === 0) return;
  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);
  db.execute(`UPDATE subscriptions SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteSubscriptionAction(id: string): Promise<void> {
  getDb().execute(`DELETE FROM subscriptions WHERE id = ?`, [id]);
}

export async function fetchSubscriptionById(id: string): Promise<Subscription | null> {
  const db = getDb();
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM subscriptions WHERE id = ?`,
    [id],
  );
  if (rows.length === 0) return null;
  return rowToSubscription(rows[0]);
}

export async function fetchUpcomingRenewals(days = 7): Promise<Subscription[]> {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const future = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM subscriptions WHERE status = 'active' AND next_renewal >= ? AND next_renewal <= ? ORDER BY next_renewal`,
    [today, future],
  );
  return rows.map(rowToSubscription);
}

export async function fetchSubscriptionSummary(): Promise<{
  monthlyTotal: number;
  annualTotal: number;
  activeCount: number;
}> {
  const db = getDb();
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM subscriptions WHERE status IN ('active', 'trial')`,
  );
  const subs = rows.map(rowToSubscription);
  let monthlyTotal = 0;
  for (const s of subs) {
    const multiplier = cycleToMonthly(s.billing_cycle);
    monthlyTotal += Math.round(s.price * multiplier);
  }
  return {
    monthlyTotal,
    annualTotal: monthlyTotal * 12,
    activeCount: subs.length,
  };
}

export async function searchCatalogAction(query: string): Promise<CatalogEntry[]> {
  return searchCatalog(query);
}

export async function fetchPopularCatalog(): Promise<CatalogEntry[]> {
  return getPopularEntries();
}

export async function fetchCatalogByCategory(category: 'entertainment' | 'productivity' | 'health' | 'shopping' | 'news' | 'finance' | 'utilities' | 'other'): Promise<CatalogEntry[]> {
  return _getCatalogByCategory(category);
}

function cycleToMonthly(cycle: string): number {
  switch (cycle) {
    case 'weekly': return 52 / 12;
    case 'monthly': return 1;
    case 'quarterly': return 1 / 3;
    case 'semi_annual': return 1 / 6;
    case 'annual': return 1 / 12;
    default: return 1;
  }
}

// --- Subscription Discovery (from bank transactions) ---

export async function discoverSubscriptions(): Promise<DetectedSubscription[]> {
  const db = getDb();

  // Fetch raw bank transactions
  const rawRows = db.query<Record<string, unknown>>(
    `SELECT id, connection_id, bank_account_id, provider_transaction_id,
            pending_transaction_id, date_posted, date_authorized, payee, memo,
            amount, currency, category, is_pending, raw_json
     FROM bank_transactions_raw
     WHERE is_pending = 0
     ORDER BY date_posted DESC`,
  );

  if (rawRows.length === 0) return [];

  const transactions: BankTransactionRecord[] = rawRows.map((r) => ({
    id: r.id as string,
    connectionId: r.connection_id as string,
    bankAccountId: r.bank_account_id as string,
    providerTransactionId: r.provider_transaction_id as string,
    pendingTransactionId: (r.pending_transaction_id as string) ?? null,
    datePosted: r.date_posted as string,
    dateAuthorized: (r.date_authorized as string) ?? null,
    payee: (r.payee as string) ?? null,
    memo: (r.memo as string) ?? null,
    amount: r.amount as number,
    currency: (r.currency as string) ?? 'USD',
    category: (r.category as string) ?? null,
    isPending: r.is_pending === 1 || r.is_pending === true,
    rawJson: (r.raw_json as string) ?? null,
  }));

  // Fetch existing subscriptions for dedup
  const existingRows = db.query<Record<string, unknown>>(
    `SELECT name, catalog_id FROM subscriptions`,
  );
  const existing = existingRows.map((r) => ({
    name: r.name as string,
    catalog_id: (r.catalog_id as string) ?? null,
  }));

  // Fetch catalog
  const catalog = getPopularEntries().concat(
    ...[
      'entertainment', 'productivity', 'health', 'shopping',
      'news', 'finance', 'utilities', 'other',
    ].map((c) => _getCatalogByCategory(c as 'entertainment' | 'productivity' | 'health' | 'shopping' | 'news' | 'finance' | 'utilities' | 'other')),
  );
  // Deduplicate catalog entries
  const catalogMap = new Map<string, CatalogEntry>();
  for (const entry of catalog) catalogMap.set(entry.id, entry);
  const uniqueCatalog = Array.from(catalogMap.values());

  // Fetch dismissed payees
  const dismissed = getDismissedPayees(db);

  return getSubscriptionSuggestions(transactions, existing, uniqueCatalog, dismissed);
}

export async function dismissSubscriptionPayee(normalizedPayee: string): Promise<void> {
  const db = getDb();
  const dismissed = getDismissedPayees(db);
  if (!dismissed.includes(normalizedPayee)) {
    dismissed.push(normalizedPayee);
    db.execute(
      `INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)`,
      ['dismissed_subscription_payees', JSON.stringify(dismissed)],
    );
  }
}

export async function acceptDiscoveredSubscription(suggestion: {
  payee: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'annual' | 'unknown';
  matchedCatalogId: string | null;
}): Promise<void> {
  const cycleMap: Record<string, string> = {
    weekly: 'weekly',
    monthly: 'monthly',
    annual: 'annual',
    unknown: 'monthly',
  };
  const today = new Date().toISOString().slice(0, 10);
  await createSubscription({
    name: suggestion.payee,
    price: suggestion.amount,
    billing_cycle: cycleMap[suggestion.frequency] ?? 'monthly',
    status: 'active',
    start_date: today,
    next_renewal: today,
    catalog_id: suggestion.matchedCatalogId,
  });
}

function getDismissedPayees(db: ReturnType<typeof getDb>): string[] {
  const rows = db.query<{ value: string }>(
    `SELECT value FROM preferences WHERE key = ?`,
    ['dismissed_subscription_payees'],
  );
  if (rows.length === 0) return [];
  try {
    return JSON.parse(rows[0].value);
  } catch {
    return [];
  }
}

function rowToSubscription(row: Record<string, unknown>): Subscription {
  return {
    id: row.id as string,
    name: row.name as string,
    price: row.price as number,
    currency: (row.currency as string) ?? 'USD',
    billing_cycle: row.billing_cycle as Subscription['billing_cycle'],
    custom_days: (row.custom_days as number) ?? null,
    category_id: (row.category_id as string) ?? null,
    status: row.status as Subscription['status'],
    start_date: row.start_date as string,
    next_renewal: row.next_renewal as string,
    trial_end_date: (row.trial_end_date as string) ?? null,
    cancelled_date: (row.cancelled_date as string) ?? null,
    notes: (row.notes as string) ?? null,
    url: (row.url as string) ?? null,
    icon: (row.icon as string) ?? null,
    color: (row.color as string) ?? null,
    notify_days: (row.notify_days as number) ?? 1,
    catalog_id: (row.catalog_id as string) ?? null,
    sort_order: (row.sort_order as number) ?? 0,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}
