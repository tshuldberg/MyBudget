/**
 * Integration test: Subscription lifecycle
 *
 * Tests the full subscription lifecycle from creation through cancellation,
 * verifying that all connected systems (CRUD, recurring templates, cost
 * summaries, status state machine, price history) work together correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Subscription } from '../models/schemas';
import {
  createSubscription,
  getSubscriptionById,
  updateSubscription,
  getSubscriptions,
} from '../subscriptions/crud';
import {
  validateTransition,
  transitionSubscription,
} from '../subscriptions/status';
import {
  calculateNextRenewal,
  getUpcomingRenewals,
} from '../subscriptions/renewal';
import {
  normalizeToMonthly,
  calculateSubscriptionSummary,
} from '../subscriptions/cost';
import {
  recordPriceChange,
  getPriceHistory,
} from '../subscriptions/price-history';
import {
  createSubscriptionTemplate,
  syncSubscriptionToTemplate,
  processRenewal,
} from '../subscriptions/budget-bridge';
import {
  getTemplateBySubscriptionId,
  generatePendingTransactions,
} from '../db/recurring';
import type { DatabaseAdapter } from '../db/migrations';

// ---------------------------------------------------------------------------
// In-memory mock database
// ---------------------------------------------------------------------------

interface TableRow {
  [key: string]: unknown;
}

function createIntegrationDb(): DatabaseAdapter {
  const tables: Record<string, TableRow[]> = {
    subscriptions: [],
    recurring_templates: [],
    price_history: [],
    notification_log: [],
    transactions: [],
    transaction_splits: [],
  };

  function matchRow(row: TableRow, conditions: Array<{ col: string; val: unknown }>): boolean {
    return conditions.every(({ col, val }) => row[col] === val);
  }

  return {
    execute(sql: string, params?: unknown[]): void {
      const trimmed = sql.replace(/\s+/g, ' ').trim();

      // INSERT INTO subscriptions
      if (/^INSERT INTO subscriptions/i.test(trimmed)) {
        const p = params as unknown[];
        tables.subscriptions.push({
          id: p[0], name: p[1], price: p[2], currency: p[3],
          billing_cycle: p[4], custom_days: p[5], category_id: p[6],
          status: p[7], start_date: p[8], next_renewal: p[9],
          trial_end_date: p[10], cancelled_date: p[11],
          notes: p[12], url: p[13], icon: p[14], color: p[15],
          notify_days: p[16], catalog_id: p[17], sort_order: p[18],
          created_at: p[19], updated_at: p[20],
        });
        return;
      }

      // UPDATE subscriptions SET ...
      if (/^UPDATE subscriptions SET/i.test(trimmed)) {
        const id = params![params!.length - 1] as string;
        const row = tables.subscriptions.find((r) => r.id === id);
        if (!row) return;

        // Parse "SET field = ?, field = ?, ... WHERE id = ?"
        const setClause = trimmed.match(/SET (.+?) WHERE/i)?.[1] ?? '';
        const fields = setClause.split(',').map((f) => f.trim().split(/\s*=\s*/)[0]);
        for (let i = 0; i < fields.length; i++) {
          row[fields[i]] = params![i];
        }
        return;
      }

      // DELETE FROM subscriptions
      if (/^DELETE FROM subscriptions/i.test(trimmed)) {
        const id = params![0];
        tables.subscriptions = tables.subscriptions.filter((r) => r.id !== id);
        return;
      }

      // INSERT INTO recurring_templates
      if (/^INSERT INTO recurring_templates/i.test(trimmed)) {
        const p = params as unknown[];
        tables.recurring_templates.push({
          id: p[0], account_id: p[1], category_id: p[2], payee: p[3],
          amount: p[4], frequency: p[5], start_date: p[6], end_date: p[7],
          next_date: p[8], is_active: p[9], subscription_id: p[10],
          created_at: p[11], updated_at: p[12],
        });
        return;
      }

      // UPDATE recurring_templates SET ...
      if (/^UPDATE recurring_templates SET/i.test(trimmed)) {
        const id = params![params!.length - 1] as string;
        const row = tables.recurring_templates.find((r) => r.id === id);
        if (!row) return;

        const setClause = trimmed.match(/SET (.+?) WHERE/i)?.[1] ?? '';
        const fields = setClause.split(',').map((f) => f.trim().split(/\s*=\s*/)[0]);
        for (let i = 0; i < fields.length; i++) {
          row[fields[i]] = params![i];
        }
        return;
      }

      // INSERT INTO price_history
      if (/^INSERT INTO price_history/i.test(trimmed)) {
        const p = params as unknown[];
        tables.price_history.push({
          id: p[0], subscription_id: p[1], price: p[2],
          effective_date: p[3], created_at: p[4],
        });
        return;
      }

      // INSERT OR IGNORE INTO notification_log
      if (/^INSERT OR IGNORE INTO notification_log/i.test(trimmed)) {
        const p = params as unknown[];
        const exists = tables.notification_log.some(
          (r) =>
            r.subscription_id === p[1] &&
            r.type === p[2] &&
            r.scheduled_for === p[3],
        );
        if (!exists) {
          tables.notification_log.push({
            id: p[0], subscription_id: p[1], type: p[2],
            scheduled_for: p[3], sent_at: p[4],
          });
        }
        return;
      }

      // DELETE FROM notification_log
      if (/^DELETE FROM notification_log/i.test(trimmed)) {
        const subId = params![0];
        tables.notification_log = tables.notification_log.filter(
          (r) => !(r.subscription_id === subId && r.sent_at === null),
        );
        return;
      }
    },

    query<T>(sql: string, params?: unknown[]): T[] {
      const trimmed = sql.replace(/\s+/g, ' ').trim();

      // SELECT * FROM subscriptions WHERE id = ?
      if (/FROM subscriptions WHERE id/i.test(trimmed)) {
        const id = params![0];
        return tables.subscriptions.filter((r) => r.id === id) as T[];
      }

      // SELECT * FROM subscriptions (with optional filters)
      if (/^SELECT \* FROM subscriptions/i.test(trimmed)) {
        let rows = [...tables.subscriptions];
        if (params && params.length > 0) {
          // Extract WHERE conditions
          const conditions: Array<{ col: string; val: unknown }> = [];
          if (/status = \?/i.test(trimmed)) conditions.push({ col: 'status', val: params[conditions.length] });
          if (/category_id = \?/i.test(trimmed)) conditions.push({ col: 'category_id', val: params[conditions.length] });
          if (/billing_cycle = \?/i.test(trimmed)) conditions.push({ col: 'billing_cycle', val: params[conditions.length] });
          rows = rows.filter((r) => matchRow(r, conditions));
        }
        // Sort by sort_order, name
        rows.sort((a, b) => {
          const so = (a.sort_order as number) - (b.sort_order as number);
          if (so !== 0) return so;
          return (a.name as string).localeCompare(b.name as string);
        });
        return rows as T[];
      }

      // SELECT * FROM recurring_templates WHERE subscription_id = ?
      if (/FROM recurring_templates WHERE subscription_id/i.test(trimmed)) {
        const subId = params![0];
        return tables.recurring_templates.filter((r) => r.subscription_id === subId) as T[];
      }

      // SELECT * FROM recurring_templates WHERE id = ?
      if (/FROM recurring_templates WHERE id/i.test(trimmed)) {
        const id = params![0];
        return tables.recurring_templates.filter((r) => r.id === id) as T[];
      }

      // SELECT * FROM recurring_templates WHERE is_active = 1 AND next_date <= ?
      if (/FROM recurring_templates\s+WHERE is_active/i.test(trimmed)) {
        const asOfDate = params![0] as string;
        return tables.recurring_templates.filter(
          (r) =>
            (r.is_active === 1 || r.is_active === true) &&
            (r.next_date as string) <= asOfDate &&
            (r.end_date === null || (r.end_date as string) >= (r.next_date as string)),
        ) as T[];
      }

      // SELECT * FROM recurring_templates (active, ordered)
      if (/FROM recurring_templates WHERE is_active = 1 ORDER/i.test(trimmed)) {
        return tables.recurring_templates
          .filter((r) => r.is_active === 1 || r.is_active === true)
          .sort((a, b) => (a.next_date as string).localeCompare(b.next_date as string)) as T[];
      }

      // SELECT * FROM price_history WHERE subscription_id = ?
      if (/FROM price_history WHERE subscription_id/i.test(trimmed)) {
        const subId = params![0];
        return tables.price_history
          .filter((r) => r.subscription_id === subId)
          .sort((a, b) => (a.effective_date as string).localeCompare(b.effective_date as string)) as T[];
      }

      // SELECT 1 FROM notification_log
      if (/SELECT 1 FROM notification_log/i.test(trimmed)) {
        const [subId, type, scheduledFor] = params as [string, string, string];
        return tables.notification_log.filter(
          (r) =>
            r.subscription_id === subId &&
            r.type === type &&
            r.scheduled_for === scheduledFor,
        ) as T[];
      }

      // SELECT * FROM notification_log WHERE subscription_id = ?
      if (/FROM notification_log WHERE subscription_id/i.test(trimmed)) {
        const subId = params![0];
        return tables.notification_log
          .filter((r) => r.subscription_id === subId)
          .sort((a, b) => (b.scheduled_for as string).localeCompare(a.scheduled_for as string)) as T[];
      }

      return [];
    },

    transaction(fn: () => void): void {
      fn();
    },
  };
}

// ---------------------------------------------------------------------------
// Integration tests
// ---------------------------------------------------------------------------

describe('Subscription lifecycle integration', () => {
  let db: DatabaseAdapter;

  beforeEach(() => {
    db = createIntegrationDb();
  });

  it('full lifecycle: create -> template -> summary -> pause -> resume -> cancel', () => {
    // Step 1: Create a subscription (Netflix, $15.49/month)
    const sub = createSubscription(db, 'sub-netflix', {
      name: 'Netflix',
      price: 1549, // $15.49
      billing_cycle: 'monthly',
      status: 'active',
      start_date: '2025-01-15',
      next_renewal: '2025-02-15',
    });

    expect(sub.id).toBe('sub-netflix');
    expect(sub.price).toBe(1549);
    expect(sub.status).toBe('active');
    expect(sub.billing_cycle).toBe('monthly');

    // Step 2: Verify subscription is stored
    const fetched = getSubscriptionById(db, 'sub-netflix');
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe('Netflix');

    // Step 3: Create a linked recurring template
    const template = createSubscriptionTemplate(
      db,
      'tmpl-netflix',
      sub,
      'acct-checking',
    );

    expect(template.subscription_id).toBe('sub-netflix');
    expect(template.payee).toBe('Netflix');
    expect(template.amount).toBe(-1549); // outflow is negative
    expect(template.frequency).toBe('monthly');
    expect(template.is_active).toBe(true);

    // Step 4: Verify template is linked
    const linkedTemplate = getTemplateBySubscriptionId(db, 'sub-netflix');
    expect(linkedTemplate).not.toBeNull();
    expect(linkedTemplate!.id).toBe('tmpl-netflix');

    // Step 5: Verify subscription appears in summary with correct monthly total
    const subs = getSubscriptions(db);
    const summary = calculateSubscriptionSummary(subs);
    expect(summary.monthlyTotal).toBe(1549);
    expect(summary.activeCount).toBe(1);

    // Step 6: Generate pending transactions (advance past renewal date)
    let idCounter = 0;
    const pending = generatePendingTransactions(db, '2025-02-15', () => ({
      txId: `tx-${++idCounter}`,
      splitId: `split-${idCounter}`,
    }));

    expect(pending).toHaveLength(1);
    expect(pending[0].amount).toBe(-1549);
    expect(pending[0].payee).toBe('Netflix');
    expect(pending[0].date).toBe('2025-02-15');

    // Template next_date should have advanced
    const updatedTemplate = getTemplateBySubscriptionId(db, 'sub-netflix');
    expect(updatedTemplate!.next_date).toBe('2025-03-15');

    // Step 7: Pause subscription
    const paused = transitionSubscription(db, 'sub-netflix', 'paused');
    expect(paused.status).toBe('paused');

    // Step 8: Verify excluded from monthly totals
    const pausedSubs = getSubscriptions(db);
    const pausedSummary = calculateSubscriptionSummary(pausedSubs);
    expect(pausedSummary.monthlyTotal).toBe(0);
    expect(pausedSummary.activeCount).toBe(0);

    // Step 9: Verify template is deactivated
    const deactivatedTemplate = getTemplateBySubscriptionId(db, 'sub-netflix');
    expect(deactivatedTemplate!.is_active).toBe(false);

    // Step 10: No transactions generated while paused
    const noPending = generatePendingTransactions(db, '2025-03-15', () => ({
      txId: `tx-${++idCounter}`,
      splitId: `split-${idCounter}`,
    }));
    expect(noPending).toHaveLength(0);

    // Step 11: Resume subscription
    const resumed = transitionSubscription(db, 'sub-netflix', 'active');
    expect(resumed.status).toBe('active');

    // Step 12: Verify back in totals
    const resumedSubs = getSubscriptions(db);
    const resumedSummary = calculateSubscriptionSummary(resumedSubs);
    expect(resumedSummary.monthlyTotal).toBe(1549);
    expect(resumedSummary.activeCount).toBe(1);

    // Step 13: Verify template re-activated
    const reactivatedTemplate = getTemplateBySubscriptionId(db, 'sub-netflix');
    expect(reactivatedTemplate!.is_active).toBe(true);

    // Step 14: Cancel subscription
    const cancelled = transitionSubscription(db, 'sub-netflix', 'cancelled');
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancelled_date).not.toBeNull();

    // Step 15: Verify excluded from totals
    const cancelledSubs = getSubscriptions(db);
    const cancelledSummary = calculateSubscriptionSummary(cancelledSubs);
    expect(cancelledSummary.monthlyTotal).toBe(0);
    expect(cancelledSummary.activeCount).toBe(0);
    expect(cancelledSummary.totalCount).toBe(1); // still counted in totalCount

    // Step 16: Verify cannot transition from cancelled
    expect(() => transitionSubscription(db, 'sub-netflix', 'active')).toThrow('Invalid transition');
  });

  it('price change records history', () => {
    // Create subscription
    createSubscription(db, 'sub-spotify', {
      name: 'Spotify',
      price: 999, // $9.99
      billing_cycle: 'monthly',
      status: 'active',
      start_date: '2025-01-01',
      next_renewal: '2025-02-01',
    });

    // Record price change (old price)
    recordPriceChange(db, 'ph-1', 'sub-spotify', 999, '2025-01-01');

    // Update subscription price
    updateSubscription(db, 'sub-spotify', { price: 1099 }); // $10.99

    // Verify price history
    const history = getPriceHistory(db, 'sub-spotify');
    expect(history).toHaveLength(1);
    expect(history[0].price).toBe(999);
    expect(history[0].effective_date).toBe('2025-01-01');

    // Record another price change
    recordPriceChange(db, 'ph-2', 'sub-spotify', 1099, '2025-06-01');
    updateSubscription(db, 'sub-spotify', { price: 1199 }); // $11.99

    const history2 = getPriceHistory(db, 'sub-spotify');
    expect(history2).toHaveLength(2);
    expect(history2[0].price).toBe(999);
    expect(history2[1].price).toBe(1099);
  });

  it('trial subscription converts to active', () => {
    const trialSub = createSubscription(db, 'sub-trial', {
      name: 'YouTube Premium',
      price: 1399, // $13.99
      billing_cycle: 'monthly',
      status: 'trial',
      start_date: '2025-01-01',
      next_renewal: '2025-02-01',
      trial_end_date: '2025-01-31',
    });

    // Trial included in summary totals
    const summary = calculateSubscriptionSummary(getSubscriptions(db));
    expect(summary.monthlyTotal).toBe(1399);
    expect(summary.activeCount).toBe(1);

    // Convert trial to active
    const activated = transitionSubscription(db, 'sub-trial', 'active');
    expect(activated.status).toBe('active');

    // Still in totals
    const summary2 = calculateSubscriptionSummary(getSubscriptions(db));
    expect(summary2.monthlyTotal).toBe(1399);
  });

  it('trial can be cancelled directly', () => {
    createSubscription(db, 'sub-trial2', {
      name: 'Free Trial',
      price: 999,
      billing_cycle: 'monthly',
      status: 'trial',
      start_date: '2025-01-01',
      next_renewal: '2025-02-01',
      trial_end_date: '2025-01-15',
    });

    const cancelled = transitionSubscription(db, 'sub-trial2', 'cancelled');
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancelled_date).not.toBeNull();
  });

  it('multiple subscriptions aggregate correctly', () => {
    createSubscription(db, 'sub-1', {
      name: 'Netflix',
      price: 1549,
      billing_cycle: 'monthly',
      status: 'active',
      start_date: '2025-01-01',
      next_renewal: '2025-02-01',
      category_id: 'cat-entertainment',
    });

    createSubscription(db, 'sub-2', {
      name: 'Spotify',
      price: 999,
      billing_cycle: 'monthly',
      status: 'active',
      start_date: '2025-01-01',
      next_renewal: '2025-02-01',
      category_id: 'cat-entertainment',
    });

    createSubscription(db, 'sub-3', {
      name: 'iCloud',
      price: 299,
      billing_cycle: 'monthly',
      status: 'active',
      start_date: '2025-01-01',
      next_renewal: '2025-02-01',
      category_id: 'cat-cloud',
    });

    createSubscription(db, 'sub-4', {
      name: 'Old Service',
      price: 5000,
      billing_cycle: 'monthly',
      status: 'cancelled',
      start_date: '2024-01-01',
      next_renewal: '2024-06-01',
    });

    const subs = getSubscriptions(db);
    const summary = calculateSubscriptionSummary(subs);

    // Only active subs counted
    expect(summary.activeCount).toBe(3);
    expect(summary.totalCount).toBe(4);
    expect(summary.monthlyTotal).toBe(1549 + 999 + 299);

    // Category breakdown
    expect(summary.byCategory).toHaveLength(2);
    const entertainment = summary.byCategory.find((c) => c.category_id === 'cat-entertainment');
    expect(entertainment!.monthlyCost).toBe(1549 + 999);
    expect(entertainment!.count).toBe(2);

    const cloud = summary.byCategory.find((c) => c.category_id === 'cat-cloud');
    expect(cloud!.monthlyCost).toBe(299);
    expect(cloud!.count).toBe(1);
  });

  it('annual subscription normalizes to monthly in summary', () => {
    createSubscription(db, 'sub-annual', {
      name: 'Annual Service',
      price: 12000, // $120/year
      billing_cycle: 'annual',
      status: 'active',
      start_date: '2025-01-01',
      next_renewal: '2026-01-01',
    });

    const subs = getSubscriptions(db);
    const summary = calculateSubscriptionSummary(subs);
    expect(summary.monthlyTotal).toBe(1000); // $10/month
  });

  it('renewal date advances correctly through the lifecycle', () => {
    createSubscription(db, 'sub-renew', {
      name: 'Monthly Sub',
      price: 1000,
      billing_cycle: 'monthly',
      status: 'active',
      start_date: '2025-01-15',
      next_renewal: '2025-02-15',
    });

    // Process renewal
    const newRenewal = processRenewal(
      db,
      getSubscriptionById(db, 'sub-renew')!,
      '2025-02-15',
    );
    expect(newRenewal).toBe('2025-03-15');

    // Verify subscription updated
    const updated = getSubscriptionById(db, 'sub-renew');
    expect(updated!.next_renewal).toBe('2025-03-15');
  });

  it('sync subscription updates template fields', () => {
    const sub = createSubscription(db, 'sub-sync', {
      name: 'Original',
      price: 1000,
      billing_cycle: 'monthly',
      status: 'active',
      start_date: '2025-01-01',
      next_renewal: '2025-02-01',
      category_id: 'cat-1',
    });

    createSubscriptionTemplate(db, 'tmpl-sync', sub, 'acct-1');

    // Update subscription
    updateSubscription(db, 'sub-sync', {
      name: 'Updated',
      price: 2000,
      category_id: 'cat-2',
    });

    // Sync to template
    const updatedSub = getSubscriptionById(db, 'sub-sync')!;
    syncSubscriptionToTemplate(db, updatedSub);

    // Verify template reflects updates
    const template = getTemplateBySubscriptionId(db, 'sub-sync');
    expect(template!.payee).toBe('Updated');
    expect(template!.amount).toBe(-2000);
    expect(template!.category_id).toBe('cat-2');
  });

  it('upcoming renewals respects status filters', () => {
    const subs: Subscription[] = [
      createSubscription(db, 's1', {
        name: 'Active Sub',
        price: 1000,
        billing_cycle: 'monthly',
        status: 'active',
        start_date: '2025-01-01',
        next_renewal: '2025-02-10',
      }),
      createSubscription(db, 's2', {
        name: 'Paused Sub',
        price: 2000,
        billing_cycle: 'monthly',
        status: 'paused',
        start_date: '2025-01-01',
        next_renewal: '2025-02-15',
      }),
      createSubscription(db, 's3', {
        name: 'Cancelled Sub',
        price: 3000,
        billing_cycle: 'monthly',
        status: 'cancelled',
        start_date: '2025-01-01',
        next_renewal: '2025-02-20',
      }),
    ];

    const upcoming = getUpcomingRenewals(subs, 30, '2025-02-01');
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].name).toBe('Active Sub');
  });

  it('status state machine enforces valid transitions', () => {
    expect(validateTransition('trial', 'active')).toBe(true);
    expect(validateTransition('trial', 'cancelled')).toBe(true);
    expect(validateTransition('trial', 'paused')).toBe(false);

    expect(validateTransition('active', 'paused')).toBe(true);
    expect(validateTransition('active', 'cancelled')).toBe(true);
    expect(validateTransition('active', 'trial')).toBe(false);

    expect(validateTransition('paused', 'active')).toBe(true);
    expect(validateTransition('paused', 'cancelled')).toBe(true);

    expect(validateTransition('cancelled', 'active')).toBe(false);
    expect(validateTransition('cancelled', 'paused')).toBe(false);
    expect(validateTransition('cancelled', 'trial')).toBe(false);
  });
});
