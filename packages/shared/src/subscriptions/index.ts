// Subscription engine — CRUD, renewal calculation, cost normalization, status state machine

// Types
export { SubscriptionFilterSchema, SubscriptionUpdateSchema } from './types';
export type { SubscriptionFilter, SubscriptionUpdate } from './types';

// CRUD
export {
  createSubscription,
  getSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
  pauseSubscription,
  cancelSubscription,
  resumeSubscription,
} from './crud';

// Renewal engine
export {
  calculateNextRenewal,
  advanceRenewalDate,
  getUpcomingRenewals,
} from './renewal';

// Cost normalization
export {
  normalizeToMonthly,
  normalizeToAnnual,
  normalizeToDaily,
  calculateSubscriptionSummary,
} from './cost';
export type { CategoryCostSummary, SubscriptionSummary } from './cost';

// Price history
export {
  recordPriceChange,
  getPriceHistory,
  getLifetimeCost,
} from './price-history';

// Notifications
export {
  getRenewalNotifications,
  getTrialExpirationAlerts,
  getMonthlySummaryNotification,
  logNotification,
  cancelNotifications,
  getNotificationLog,
} from './notifications';
export type { PendingNotification } from './notifications';

// Budget bridge (subscription <-> recurring templates)
export {
  mapBillingCycleToFrequency,
  createSubscriptionTemplate,
  syncSubscriptionToTemplate,
  processRenewal,
  deactivateSubscriptionTemplate,
  reactivateSubscriptionTemplate,
} from './budget-bridge';

// Status state machine
export {
  validateTransition,
  getValidTransitions,
  transitionSubscription,
} from './status';
