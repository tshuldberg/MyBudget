/**
 * Budget alert checking engine.
 *
 * Monitors category spending against configured thresholds and fires
 * alerts when spending crosses a percentage of the category's target.
 * Alerts are suppressed if already fired for the current month.
 *
 * All amounts in integer cents.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AlertConfig {
  id: string;
  categoryId: string;
  thresholdPct: number; // e.g. 80 means fire at 80% of target
  isEnabled: boolean;
}

export interface AlertHistoryEntry {
  alertId: string;
  categoryId: string;
  month: string;       // YYYY-MM
  thresholdPct: number;
  spentPct: number;
  amountSpent: number; // cents (positive, absolute spending)
  targetAmount: number; // cents
  notifiedAt: string;
}

export interface CategorySpendState {
  categoryId: string;
  name: string;
  spent: number;       // cents (positive = amount spent, absolute of activity)
  targetAmount: number; // cents
}

export interface AlertNotification {
  alertId: string;
  categoryId: string;
  categoryName: string;
  thresholdPct: number;
  spentPct: number;
  amountSpent: number;  // cents
  targetAmount: number; // cents
  message: string;
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Check all alert configs against current budget state and return
 * alerts that should fire this month.
 *
 * @param alertConfigs - All configured alerts
 * @param categoryStates - Current spending state per category
 * @param alertHistory - History of previously fired alerts
 * @param month - Current month YYYY-MM
 * @returns List of alert notifications to display/send
 */
export function checkAlerts(
  alertConfigs: AlertConfig[],
  categoryStates: CategorySpendState[],
  alertHistory: AlertHistoryEntry[],
  month: string,
): AlertNotification[] {
  const stateMap = new Map<string, CategorySpendState>();
  for (const state of categoryStates) {
    stateMap.set(state.categoryId, state);
  }

  const notifications: AlertNotification[] = [];

  for (const alert of alertConfigs) {
    if (!alert.isEnabled) continue;

    const state = stateMap.get(alert.categoryId);
    if (!state) continue;
    if (state.targetAmount <= 0) continue;

    if (shouldFireAlert(alert, state.spent, state.targetAmount, alertHistory, month)) {
      notifications.push(
        buildAlertNotification(alert, state),
      );
    }
  }

  return notifications;
}

/**
 * Determine if an alert should fire based on threshold crossing
 * and deduplication against alert history.
 *
 * @returns true if threshold is crossed AND not already fired this month
 */
export function shouldFireAlert(
  alert: AlertConfig,
  spent: number,
  target: number,
  alertHistory: AlertHistoryEntry[],
  month: string,
): boolean {
  if (target <= 0) return false;

  const spentPct = Math.round((spent / target) * 100);
  if (spentPct < alert.thresholdPct) return false;

  // Check if already fired this month
  const alreadyFired = alertHistory.some(
    (entry) => entry.alertId === alert.id && entry.month === month,
  );

  return !alreadyFired;
}

/**
 * Build a display-ready alert notification.
 */
export function buildAlertNotification(
  alert: AlertConfig,
  category: CategorySpendState,
): AlertNotification {
  const spentPct = Math.round((category.spent / category.targetAmount) * 100);

  return {
    alertId: alert.id,
    categoryId: alert.categoryId,
    categoryName: category.name,
    thresholdPct: alert.thresholdPct,
    spentPct,
    amountSpent: category.spent,
    targetAmount: category.targetAmount,
    message: `${category.name}: ${spentPct}% of budget spent (threshold: ${alert.thresholdPct}%)`,
  };
}
