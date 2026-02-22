/**
 * Subscription CRUD operations.
 *
 * Status state machine:
 *   trial -> active | cancelled
 *   active <-> paused
 *   active -> cancelled
 *   paused -> cancelled
 *
 * All currency amounts are integer cents.
 */

import type { DatabaseAdapter } from '../db/migrations';
import type { Subscription, SubscriptionInsert } from '../models/schemas';
import type { SubscriptionFilter, SubscriptionUpdate } from './types';

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export function createSubscription(
  db: DatabaseAdapter,
  id: string,
  input: SubscriptionInsert,
): Subscription {
  const now = new Date().toISOString();
  const currency = input.currency ?? 'USD';
  const customDays = input.custom_days ?? null;
  const categoryId = input.category_id ?? null;
  const trialEndDate = input.trial_end_date ?? null;
  const cancelledDate = input.cancelled_date ?? null;
  const notes = input.notes ?? null;
  const url = input.url ?? null;
  const icon = input.icon ?? null;
  const color = input.color ?? null;
  const notifyDays = input.notify_days ?? 1;
  const catalogId = input.catalog_id ?? null;
  const sortOrder = input.sort_order ?? 0;

  db.execute(
    `INSERT INTO subscriptions
     (id, name, price, currency, billing_cycle, custom_days, category_id,
      status, start_date, next_renewal, trial_end_date, cancelled_date,
      notes, url, icon, color, notify_days, catalog_id, sort_order,
      created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, input.name, input.price, currency, input.billing_cycle, customDays,
      categoryId, input.status, input.start_date, input.next_renewal,
      trialEndDate, cancelledDate, notes, url, icon, color,
      notifyDays, catalogId, sortOrder, now, now,
    ],
  );

  return {
    id,
    name: input.name,
    price: input.price,
    currency,
    billing_cycle: input.billing_cycle,
    custom_days: customDays,
    category_id: categoryId,
    status: input.status,
    start_date: input.start_date,
    next_renewal: input.next_renewal,
    trial_end_date: trialEndDate,
    cancelled_date: cancelledDate,
    notes,
    url,
    icon,
    color,
    notify_days: notifyDays,
    catalog_id: catalogId,
    sort_order: sortOrder,
    created_at: now,
    updated_at: now,
  };
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function getSubscriptions(
  db: DatabaseAdapter,
  filters?: SubscriptionFilter,
): Subscription[] {
  let sql = 'SELECT * FROM subscriptions';
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters?.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters?.category_id) {
    conditions.push('category_id = ?');
    params.push(filters.category_id);
  }
  if (filters?.billing_cycle) {
    conditions.push('billing_cycle = ?');
    params.push(filters.billing_cycle);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY sort_order, name';

  const rows = db.query<Record<string, unknown>>(sql, params);
  return rows.map(rowToSubscription);
}

export function getSubscriptionById(
  db: DatabaseAdapter,
  id: string,
): Subscription | null {
  const rows = db.query<Record<string, unknown>>(
    'SELECT * FROM subscriptions WHERE id = ?',
    [id],
  );
  if (rows.length === 0) return null;
  return rowToSubscription(rows[0]);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export function updateSubscription(
  db: DatabaseAdapter,
  id: string,
  updates: SubscriptionUpdate,
): void {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.price !== undefined) { fields.push('price = ?'); values.push(updates.price); }
  if (updates.currency !== undefined) { fields.push('currency = ?'); values.push(updates.currency); }
  if (updates.billing_cycle !== undefined) { fields.push('billing_cycle = ?'); values.push(updates.billing_cycle); }
  if (updates.custom_days !== undefined) { fields.push('custom_days = ?'); values.push(updates.custom_days); }
  if (updates.category_id !== undefined) { fields.push('category_id = ?'); values.push(updates.category_id); }
  if (updates.start_date !== undefined) { fields.push('start_date = ?'); values.push(updates.start_date); }
  if (updates.next_renewal !== undefined) { fields.push('next_renewal = ?'); values.push(updates.next_renewal); }
  if (updates.trial_end_date !== undefined) { fields.push('trial_end_date = ?'); values.push(updates.trial_end_date); }
  if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes); }
  if (updates.url !== undefined) { fields.push('url = ?'); values.push(updates.url); }
  if (updates.icon !== undefined) { fields.push('icon = ?'); values.push(updates.icon); }
  if (updates.color !== undefined) { fields.push('color = ?'); values.push(updates.color); }
  if (updates.notify_days !== undefined) { fields.push('notify_days = ?'); values.push(updates.notify_days); }
  if (updates.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(updates.sort_order); }

  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.execute(
    `UPDATE subscriptions SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export function deleteSubscription(db: DatabaseAdapter, id: string): void {
  db.execute('DELETE FROM subscriptions WHERE id = ?', [id]);
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

/**
 * Pause an active subscription.
 * Valid from: active
 */
export function pauseSubscription(db: DatabaseAdapter, id: string): void {
  const sub = getSubscriptionById(db, id);
  if (!sub) throw new Error(`Subscription ${id} not found`);
  if (sub.status !== 'active') {
    throw new Error(`Cannot pause subscription with status '${sub.status}'. Must be 'active'.`);
  }
  const now = new Date().toISOString();
  db.execute(
    'UPDATE subscriptions SET status = ?, updated_at = ? WHERE id = ?',
    ['paused', now, id],
  );
}

/**
 * Cancel a subscription.
 * Valid from: active, paused, trial
 */
export function cancelSubscription(db: DatabaseAdapter, id: string): void {
  const sub = getSubscriptionById(db, id);
  if (!sub) throw new Error(`Subscription ${id} not found`);
  if (sub.status === 'cancelled') {
    throw new Error('Subscription is already cancelled.');
  }
  const now = new Date().toISOString();
  const today = now.slice(0, 10); // YYYY-MM-DD
  db.execute(
    'UPDATE subscriptions SET status = ?, cancelled_date = ?, updated_at = ? WHERE id = ?',
    ['cancelled', today, now, id],
  );
}

/**
 * Resume a paused subscription back to active.
 * Valid from: paused
 */
export function resumeSubscription(db: DatabaseAdapter, id: string): void {
  const sub = getSubscriptionById(db, id);
  if (!sub) throw new Error(`Subscription ${id} not found`);
  if (sub.status !== 'paused') {
    throw new Error(`Cannot resume subscription with status '${sub.status}'. Must be 'paused'.`);
  }
  const now = new Date().toISOString();
  db.execute(
    'UPDATE subscriptions SET status = ?, updated_at = ? WHERE id = ?',
    ['active', now, id],
  );
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

function rowToSubscription(row: Record<string, unknown>): Subscription {
  return {
    id: row.id as string,
    name: row.name as string,
    price: row.price as number,
    currency: row.currency as string,
    billing_cycle: row.billing_cycle as Subscription['billing_cycle'],
    custom_days: (row.custom_days as number | null) ?? null,
    category_id: (row.category_id as string | null) ?? null,
    status: row.status as Subscription['status'],
    start_date: row.start_date as string,
    next_renewal: row.next_renewal as string,
    trial_end_date: (row.trial_end_date as string | null) ?? null,
    cancelled_date: (row.cancelled_date as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    url: (row.url as string | null) ?? null,
    icon: (row.icon as string | null) ?? null,
    color: (row.color as string | null) ?? null,
    notify_days: row.notify_days as number,
    catalog_id: (row.catalog_id as string | null) ?? null,
    sort_order: row.sort_order as number,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}
