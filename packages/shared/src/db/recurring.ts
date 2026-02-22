/**
 * Recurring transaction template CRUD and auto-generation.
 * Templates define repeating transactions that generate entries on schedule.
 */

import type { DatabaseAdapter } from './migrations';
import type { RecurringTemplate, RecurringTemplateInsert } from '../models/schemas';
import { calculateNextDate } from '../engine/schedule';

export function createRecurringTemplate(
  db: DatabaseAdapter,
  id: string,
  input: RecurringTemplateInsert,
): RecurringTemplate {
  const now = new Date().toISOString();
  const categoryId = input.category_id ?? null;
  const endDate = input.end_date ?? null;
  const isActive = input.is_active ?? true;
  const subscriptionId = input.subscription_id ?? null;

  db.execute(
    `INSERT INTO recurring_templates (id, account_id, category_id, payee, amount, frequency, start_date, end_date, next_date, is_active, subscription_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.account_id, categoryId, input.payee, input.amount, input.frequency, input.start_date, endDate, input.next_date, isActive ? 1 : 0, subscriptionId, now, now],
  );

  return {
    id,
    account_id: input.account_id,
    category_id: categoryId,
    payee: input.payee,
    amount: input.amount,
    frequency: input.frequency,
    start_date: input.start_date,
    end_date: endDate,
    next_date: input.next_date,
    is_active: isActive,
    subscription_id: subscriptionId,
    created_at: now,
    updated_at: now,
  };
}

export function updateRecurringTemplate(
  db: DatabaseAdapter,
  id: string,
  updates: Partial<Pick<RecurringTemplate, 'payee' | 'amount' | 'frequency' | 'category_id' | 'end_date' | 'next_date' | 'is_active' | 'account_id'>>,
): void {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.payee !== undefined) {
    fields.push('payee = ?');
    values.push(updates.payee);
  }
  if (updates.amount !== undefined) {
    fields.push('amount = ?');
    values.push(updates.amount);
  }
  if (updates.frequency !== undefined) {
    fields.push('frequency = ?');
    values.push(updates.frequency);
  }
  if (updates.category_id !== undefined) {
    fields.push('category_id = ?');
    values.push(updates.category_id);
  }
  if (updates.end_date !== undefined) {
    fields.push('end_date = ?');
    values.push(updates.end_date);
  }
  if (updates.next_date !== undefined) {
    fields.push('next_date = ?');
    values.push(updates.next_date);
  }
  if (updates.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(updates.is_active ? 1 : 0);
  }
  if (updates.account_id !== undefined) {
    fields.push('account_id = ?');
    values.push(updates.account_id);
  }

  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.execute(
    `UPDATE recurring_templates SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );
}

export function getActiveTemplates(db: DatabaseAdapter): RecurringTemplate[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM recurring_templates WHERE is_active = 1 ORDER BY next_date`,
  );
  return rows.map(rowToTemplate);
}

export function getTemplateById(db: DatabaseAdapter, id: string): RecurringTemplate | null {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM recurring_templates WHERE id = ?`,
    [id],
  );
  if (rows.length === 0) return null;
  return rowToTemplate(rows[0]);
}

export function getTemplateBySubscriptionId(
  db: DatabaseAdapter,
  subscriptionId: string,
): RecurringTemplate | null {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM recurring_templates WHERE subscription_id = ?`,
    [subscriptionId],
  );
  if (rows.length === 0) return null;
  return rowToTemplate(rows[0]);
}

export interface PendingTransaction {
  templateId: string;
  accountId: string;
  categoryId: string | null;
  payee: string;
  amount: number;
  date: string;
}

/**
 * Generate pending transactions for all active templates where next_date <= asOfDate.
 * Returns the transactions to create and advances each template's next_date.
 *
 * @param generateIds Function to generate UUIDs for new transaction + split records
 */
export function generatePendingTransactions(
  db: DatabaseAdapter,
  asOfDate: string,
  generateIds: () => { txId: string; splitId: string },
): PendingTransaction[] {
  const templates = db.query<Record<string, unknown>>(
    `SELECT * FROM recurring_templates
     WHERE is_active = 1 AND next_date <= ?
       AND (end_date IS NULL OR end_date >= next_date)`,
    [asOfDate],
  );

  const pending: PendingTransaction[] = [];

  for (const row of templates) {
    const template = rowToTemplate(row);
    let nextDate = template.next_date;
    const startDay = parseInt(template.start_date.split('-')[2], 10);

    // Generate all occurrences up to asOfDate
    while (nextDate <= asOfDate) {
      if (template.end_date && nextDate > template.end_date) break;

      pending.push({
        templateId: template.id,
        accountId: template.account_id,
        categoryId: template.category_id,
        payee: template.payee,
        amount: template.amount,
        date: nextDate,
      });

      nextDate = calculateNextDate(nextDate, template.frequency, startDay);
    }

    // Advance next_date on the template
    const now = new Date().toISOString();
    db.execute(
      `UPDATE recurring_templates SET next_date = ?, updated_at = ? WHERE id = ?`,
      [nextDate, now, template.id],
    );

    // Deactivate if past end_date
    if (template.end_date && nextDate > template.end_date) {
      db.execute(
        `UPDATE recurring_templates SET is_active = 0, updated_at = ? WHERE id = ?`,
        [now, template.id],
      );
    }
  }

  return pending;
}

function rowToTemplate(row: Record<string, unknown>): RecurringTemplate {
  return {
    id: row.id as string,
    account_id: row.account_id as string,
    category_id: (row.category_id as string) ?? null,
    payee: row.payee as string,
    amount: row.amount as number,
    frequency: row.frequency as RecurringTemplate['frequency'],
    start_date: row.start_date as string,
    end_date: (row.end_date as string) ?? null,
    next_date: row.next_date as string,
    is_active: row.is_active === 1 || row.is_active === true,
    subscription_id: (row.subscription_id as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}
