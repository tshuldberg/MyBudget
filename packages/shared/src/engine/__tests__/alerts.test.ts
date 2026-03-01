/**
 * Tests for the budget alerts engine.
 *
 * Alerts monitor spending against thresholds and fire notifications
 * when spending crosses the configured percentage of the category target.
 *
 * All amounts in integer cents.
 */

import { describe, it, expect } from 'vitest';
import {
  checkAlerts,
  shouldFireAlert,
  buildAlertNotification,
  type AlertConfig,
  type AlertHistoryEntry,
  type CategorySpendState,
} from '../alerts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeAlert(overrides: Partial<AlertConfig> = {}): AlertConfig {
  return {
    id: 'alert-1',
    categoryId: 'cat-1',
    thresholdPct: 80,
    isEnabled: true,
    ...overrides,
  };
}

function makeState(overrides: Partial<CategorySpendState> = {}): CategorySpendState {
  return {
    categoryId: 'cat-1',
    name: 'Groceries',
    spent: 0,
    targetAmount: 50000, // $500
    ...overrides,
  };
}

function makeHistory(overrides: Partial<AlertHistoryEntry> = {}): AlertHistoryEntry {
  return {
    alertId: 'alert-1',
    categoryId: 'cat-1',
    month: '2026-03',
    thresholdPct: 80,
    spentPct: 85,
    amountSpent: 42500,
    targetAmount: 50000,
    notifiedAt: '2026-03-15T12:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// shouldFireAlert
// ---------------------------------------------------------------------------

describe('shouldFireAlert', () => {
  it('returns true when spending crosses threshold', () => {
    const alert = makeAlert({ thresholdPct: 80 });
    const result = shouldFireAlert(alert, 42000, 50000, [], '2026-03');
    expect(result).toBe(true); // 84% > 80%
  });

  it('returns false when spending is below threshold', () => {
    const alert = makeAlert({ thresholdPct: 80 });
    const result = shouldFireAlert(alert, 30000, 50000, [], '2026-03');
    expect(result).toBe(false); // 60% < 80%
  });

  it('returns true at exact threshold', () => {
    const alert = makeAlert({ thresholdPct: 80 });
    const result = shouldFireAlert(alert, 40000, 50000, [], '2026-03');
    expect(result).toBe(true); // 80% = 80%
  });

  it('returns false when already fired this month', () => {
    const alert = makeAlert();
    const history = [makeHistory({ alertId: 'alert-1', month: '2026-03' })];
    const result = shouldFireAlert(alert, 42000, 50000, history, '2026-03');
    expect(result).toBe(false);
  });

  it('returns true when fired in a different month', () => {
    const alert = makeAlert();
    const history = [makeHistory({ alertId: 'alert-1', month: '2026-02' })];
    const result = shouldFireAlert(alert, 42000, 50000, history, '2026-03');
    expect(result).toBe(true);
  });

  it('returns false when target is zero', () => {
    const alert = makeAlert();
    const result = shouldFireAlert(alert, 42000, 0, [], '2026-03');
    expect(result).toBe(false);
  });

  it('returns false when target is negative', () => {
    const alert = makeAlert();
    const result = shouldFireAlert(alert, 42000, -10000, [], '2026-03');
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildAlertNotification
// ---------------------------------------------------------------------------

describe('buildAlertNotification', () => {
  it('builds a notification with correct fields', () => {
    const alert = makeAlert({ thresholdPct: 80 });
    const state = makeState({ spent: 42500, targetAmount: 50000 });
    const notification = buildAlertNotification(alert, state);

    expect(notification.alertId).toBe('alert-1');
    expect(notification.categoryId).toBe('cat-1');
    expect(notification.categoryName).toBe('Groceries');
    expect(notification.thresholdPct).toBe(80);
    expect(notification.spentPct).toBe(85);
    expect(notification.amountSpent).toBe(42500);
    expect(notification.targetAmount).toBe(50000);
    expect(notification.message).toContain('Groceries');
    expect(notification.message).toContain('85%');
    expect(notification.message).toContain('80%');
  });

  it('calculates spent percentage correctly', () => {
    const alert = makeAlert({ thresholdPct: 90 });
    const state = makeState({ spent: 25000, targetAmount: 50000 });
    const notification = buildAlertNotification(alert, state);

    expect(notification.spentPct).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// checkAlerts
// ---------------------------------------------------------------------------

describe('checkAlerts', () => {
  it('fires alerts for categories that cross threshold', () => {
    const alerts = [makeAlert({ thresholdPct: 80 })];
    const states = [makeState({ spent: 42000 })]; // 84%
    const notifications = checkAlerts(alerts, states, [], '2026-03');

    expect(notifications).toHaveLength(1);
    expect(notifications[0].categoryName).toBe('Groceries');
  });

  it('does not fire for disabled alerts', () => {
    const alerts = [makeAlert({ isEnabled: false })];
    const states = [makeState({ spent: 42000 })];
    const notifications = checkAlerts(alerts, states, [], '2026-03');

    expect(notifications).toHaveLength(0);
  });

  it('does not fire for categories below threshold', () => {
    const alerts = [makeAlert({ thresholdPct: 90 })];
    const states = [makeState({ spent: 42000 })]; // 84% < 90%
    const notifications = checkAlerts(alerts, states, [], '2026-03');

    expect(notifications).toHaveLength(0);
  });

  it('does not fire for categories with no target', () => {
    const alerts = [makeAlert()];
    const states = [makeState({ spent: 42000, targetAmount: 0 })];
    const notifications = checkAlerts(alerts, states, [], '2026-03');

    expect(notifications).toHaveLength(0);
  });

  it('does not fire for already-fired alerts this month', () => {
    const alerts = [makeAlert()];
    const states = [makeState({ spent: 42000 })];
    const history = [makeHistory({ alertId: 'alert-1', month: '2026-03' })];
    const notifications = checkAlerts(alerts, states, history, '2026-03');

    expect(notifications).toHaveLength(0);
  });

  it('fires for multiple categories independently', () => {
    const alerts = [
      makeAlert({ id: 'alert-1', categoryId: 'cat-1', thresholdPct: 80 }),
      makeAlert({ id: 'alert-2', categoryId: 'cat-2', thresholdPct: 90 }),
    ];
    const states = [
      makeState({ categoryId: 'cat-1', name: 'Groceries', spent: 42000, targetAmount: 50000 }), // 84% > 80%
      makeState({ categoryId: 'cat-2', name: 'Dining', spent: 47000, targetAmount: 50000 }),     // 94% > 90%
    ];
    const notifications = checkAlerts(alerts, states, [], '2026-03');

    expect(notifications).toHaveLength(2);
  });

  it('handles missing category state gracefully', () => {
    const alerts = [makeAlert({ categoryId: 'cat-missing' })];
    const states = [makeState({ categoryId: 'cat-1' })];
    const notifications = checkAlerts(alerts, states, [], '2026-03');

    expect(notifications).toHaveLength(0);
  });
});
