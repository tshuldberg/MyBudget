/**
 * Subscription status state machine.
 *
 * Valid transitions:
 *   trial   → active     (trial converts)
 *   trial   → cancelled  (trial expired or user cancelled)
 *   active  → paused     (stop renewals, exclude from totals)
 *   active  → cancelled  (cancel: mark cancelled_date, keep in history)
 *   paused  → active     (resume: re-enable renewals)
 *   paused  → cancelled  (cancel from paused)
 *
 * Terminal state: cancelled (must delete and re-create to resubscribe)
 */

import type { DatabaseAdapter } from '../db/migrations';
import type { SubscriptionStatus, Subscription } from '../models/schemas';
import { getSubscriptionById } from './crud';
import { deactivateSubscriptionTemplate, reactivateSubscriptionTemplate } from './budget-bridge';
import { cancelNotifications } from './notifications';

/** Map of valid transitions: currentStatus -> allowed next statuses. */
const VALID_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  trial: ['active', 'cancelled'],
  active: ['paused', 'cancelled'],
  paused: ['active', 'cancelled'],
  cancelled: [],
};

/**
 * Check if a status transition is valid.
 */
export function validateTransition(
  currentStatus: SubscriptionStatus,
  newStatus: SubscriptionStatus,
): boolean {
  return VALID_TRANSITIONS[currentStatus].includes(newStatus);
}

/**
 * Get the list of valid next statuses from a given status.
 */
export function getValidTransitions(status: SubscriptionStatus): SubscriptionStatus[] {
  return [...VALID_TRANSITIONS[status]];
}

/**
 * Transition a subscription to a new status with all side effects.
 *
 * Side effects:
 * - active → paused: deactivate recurring template
 * - paused → active: reactivate recurring template
 * - * → cancelled: deactivate template, set cancelled_date, cancel pending notifications
 * - trial → active: no special side effects (template stays active)
 *
 * @throws if the transition is invalid or subscription not found
 */
export function transitionSubscription(
  db: DatabaseAdapter,
  subscriptionId: string,
  newStatus: SubscriptionStatus,
): Subscription {
  const sub = getSubscriptionById(db, subscriptionId);
  if (!sub) throw new Error(`Subscription ${subscriptionId} not found`);

  if (!validateTransition(sub.status, newStatus)) {
    throw new Error(
      `Invalid transition: '${sub.status}' → '${newStatus}'. ` +
      `Valid transitions from '${sub.status}': ${VALID_TRANSITIONS[sub.status].join(', ') || 'none'}.`,
    );
  }

  const now = new Date().toISOString();

  switch (newStatus) {
    case 'paused':
      db.execute(
        'UPDATE subscriptions SET status = ?, updated_at = ? WHERE id = ?',
        ['paused', now, subscriptionId],
      );
      deactivateSubscriptionTemplate(db, subscriptionId);
      break;

    case 'cancelled': {
      const today = now.slice(0, 10);
      db.execute(
        'UPDATE subscriptions SET status = ?, cancelled_date = ?, updated_at = ? WHERE id = ?',
        ['cancelled', today, now, subscriptionId],
      );
      deactivateSubscriptionTemplate(db, subscriptionId);
      cancelNotifications(db, subscriptionId);
      break;
    }

    case 'active':
      db.execute(
        'UPDATE subscriptions SET status = ?, updated_at = ? WHERE id = ?',
        ['active', now, subscriptionId],
      );
      // If resuming from paused, reactivate the template
      if (sub.status === 'paused') {
        reactivateSubscriptionTemplate(db, subscriptionId, sub.next_renewal);
      }
      break;
  }

  // Return the updated subscription
  return getSubscriptionById(db, subscriptionId)!;
}
