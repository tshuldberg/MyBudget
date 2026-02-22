/**
 * Bridge between the subscription engine and the budget system.
 *
 * Manages the lifecycle of recurring_templates linked to subscriptions:
 * - Creates a template when a subscription is added
 * - Syncs template fields when the subscription is updated
 * - Deactivates the template when the subscription is paused/cancelled
 * - Generates renewal transactions via the template system
 */

import type { DatabaseAdapter } from '../db/migrations';
import type { Subscription, RecurringTemplate, Frequency } from '../models/schemas';
import {
  createRecurringTemplate,
  updateRecurringTemplate,
  getTemplateBySubscriptionId,
} from '../db/recurring';
import { calculateNextRenewal } from './renewal';

/**
 * Map subscription billing cycle to recurring template frequency.
 * Recurring templates support: weekly, biweekly, monthly, quarterly, annually.
 * Subscriptions support: weekly, monthly, quarterly, semi_annual, annual, custom.
 *
 * semi_annual has no direct equivalent in recurring template frequency,
 * so we approximate it as quarterly with double the amount.
 * Custom billing cycles are mapped to monthly as a fallback.
 */
export function mapBillingCycleToFrequency(
  billingCycle: Subscription['billing_cycle'],
): Frequency {
  switch (billingCycle) {
    case 'weekly': return 'weekly';
    case 'monthly': return 'monthly';
    case 'quarterly': return 'quarterly';
    case 'semi_annual': return 'quarterly'; // approximation
    case 'annual': return 'annually';
    case 'custom': return 'monthly'; // fallback
  }
}

/**
 * Create a recurring template linked to a subscription.
 * The template will auto-generate transactions on renewal dates.
 *
 * @param db - database adapter
 * @param templateId - UUID for the new template
 * @param subscription - the subscription to link
 * @param accountId - the account to post transactions to
 * @returns the created recurring template
 */
export function createSubscriptionTemplate(
  db: DatabaseAdapter,
  templateId: string,
  subscription: Subscription,
  accountId: string,
): RecurringTemplate {
  const frequency = mapBillingCycleToFrequency(subscription.billing_cycle);

  // For semi-annual mapped to quarterly, we don't change the amount —
  // the template will fire quarterly at the subscription price.
  // The actual billing happens at the subscription's billing cycle,
  // so the template amount matches the subscription price.
  const amount = -Math.abs(subscription.price); // outflow is negative

  return createRecurringTemplate(db, templateId, {
    account_id: accountId,
    category_id: subscription.category_id,
    payee: subscription.name,
    amount,
    frequency,
    start_date: subscription.start_date,
    next_date: subscription.next_renewal,
    subscription_id: subscription.id,
  });
}

/**
 * Sync a subscription's fields to its linked recurring template.
 * Call this after updating subscription name, price, category, etc.
 *
 * @param db - database adapter
 * @param subscription - the updated subscription
 */
export function syncSubscriptionToTemplate(
  db: DatabaseAdapter,
  subscription: Subscription,
): void {
  const template = getTemplateBySubscriptionId(db, subscription.id);
  if (!template) return;

  const frequency = mapBillingCycleToFrequency(subscription.billing_cycle);
  const amount = -Math.abs(subscription.price);
  const isActive = subscription.status === 'active' || subscription.status === 'trial';

  updateRecurringTemplate(db, template.id, {
    payee: subscription.name,
    amount,
    frequency,
    category_id: subscription.category_id,
    next_date: subscription.next_renewal,
    is_active: isActive,
  });
}

/**
 * Process a subscription renewal: advance the next_renewal date
 * and sync the template.
 *
 * @param db - database adapter
 * @param subscription - the subscription to renew
 * @param today - reference date for calculating next renewal
 * @returns the new next_renewal date
 */
export function processRenewal(
  db: DatabaseAdapter,
  subscription: Subscription,
  today?: string,
): string {
  const newRenewal = calculateNextRenewal(
    subscription.start_date,
    subscription.billing_cycle,
    subscription.custom_days,
    today,
  );

  // Update subscription's next_renewal
  const now = new Date().toISOString();
  db.execute(
    'UPDATE subscriptions SET next_renewal = ?, updated_at = ? WHERE id = ?',
    [newRenewal, now, subscription.id],
  );

  // Sync the template's next_date
  const template = getTemplateBySubscriptionId(db, subscription.id);
  if (template) {
    updateRecurringTemplate(db, template.id, {
      next_date: newRenewal,
    });
  }

  return newRenewal;
}

/**
 * Deactivate the recurring template linked to a subscription.
 * Called when a subscription is paused or cancelled.
 */
export function deactivateSubscriptionTemplate(
  db: DatabaseAdapter,
  subscriptionId: string,
): void {
  const template = getTemplateBySubscriptionId(db, subscriptionId);
  if (!template) return;

  updateRecurringTemplate(db, template.id, {
    is_active: false,
  });
}

/**
 * Reactivate the recurring template linked to a subscription.
 * Called when a paused subscription is resumed.
 */
export function reactivateSubscriptionTemplate(
  db: DatabaseAdapter,
  subscriptionId: string,
  nextRenewal: string,
): void {
  const template = getTemplateBySubscriptionId(db, subscriptionId);
  if (!template) return;

  updateRecurringTemplate(db, template.id, {
    is_active: true,
    next_date: nextRenewal,
  });
}
