'use server';

import { getDb } from './db';
import {
  createAlert as _createAlert,
  listAlerts as _listAlerts,
  updateAlert as _updateAlert,
  deleteAlert as _deleteAlert,
  getAlertHistoryByMonth as _getAlertHistoryByMonth,
  createAlertHistory as _createAlertHistory,
  checkAlerts,
} from '@mybudget/shared';
import type {
  AlertRow,
  AlertHistoryRow,
  AlertNotification,
} from '@mybudget/shared';
import { randomUUID } from 'crypto';

export async function fetchAlerts(): Promise<AlertRow[]> {
  return _listAlerts(getDb());
}

export async function createBudgetAlert(
  categoryId: string,
  thresholdPct: number,
): Promise<AlertRow> {
  return _createAlert(getDb(), randomUUID(), {
    category_id: categoryId,
    threshold_pct: thresholdPct,
  });
}

export async function updateAlertEnabled(
  alertId: string,
  enabled: boolean,
): Promise<void> {
  _updateAlert(getDb(), alertId, { is_enabled: enabled ? 1 : 0 });
}

export async function deleteBudgetAlert(alertId: string): Promise<void> {
  _deleteAlert(getDb(), alertId);
}

export async function fetchAlertHistory(month?: string): Promise<AlertHistoryRow[]> {
  const now = new Date();
  const targetMonth = month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return _getAlertHistoryByMonth(getDb(), targetMonth);
}

export async function checkAndFireAlerts(month?: string): Promise<AlertNotification[]> {
  const db = getDb();
  const now = new Date();
  const targetMonth = month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const nextD = new Date(parseInt(targetMonth.split('-')[0]), parseInt(targetMonth.split('-')[1]), 1);
  const nextMonth = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}`;

  const alerts = _listAlerts(db);
  const history = _getAlertHistoryByMonth(db, targetMonth);

  // Build category spend states from transactions and budget allocations
  const categoryRows = db.query<{
    id: string;
    name: string;
    target_amount: number | null;
  }>(`SELECT id, name, target_amount FROM categories`);

  const categoryStates = categoryRows.map((c) => {
    const spentRows = db.query<{ total: number }>(
      `SELECT COALESCE(SUM(ABS(ts.amount)), 0) as total
       FROM transaction_splits ts
       JOIN transactions t ON t.id = ts.transaction_id
       WHERE ts.category_id = ? AND t.date >= ? AND t.date < ? AND ts.amount < 0`,
      [c.id, `${targetMonth}-01`, `${nextMonth}-01`],
    );
    return {
      categoryId: c.id,
      name: c.name,
      spent: spentRows[0]?.total ?? 0,
      targetAmount: c.target_amount ?? 0,
    };
  });

  const alertConfigs = alerts.map((a) => ({
    id: a.id,
    categoryId: a.category_id,
    thresholdPct: a.threshold_pct,
    isEnabled: a.is_enabled === 1,
  }));

  const historyEntries = history.map((h) => ({
    alertId: h.alert_id,
    categoryId: h.category_id,
    month: h.month,
    thresholdPct: h.threshold_pct,
    spentPct: h.spent_pct,
    amountSpent: h.amount_spent,
    targetAmount: h.target_amount,
    notifiedAt: h.notified_at,
  }));

  const notifications = checkAlerts(alertConfigs, categoryStates, historyEntries, targetMonth);

  // Persist any fired alerts to history
  for (const n of notifications) {
    _createAlertHistory(db, randomUUID(), {
      alert_id: n.alertId,
      category_id: n.categoryId,
      month: targetMonth,
      threshold_pct: n.thresholdPct,
      spent_pct: n.spentPct,
      amount_spent: n.amountSpent,
      target_amount: n.targetAmount,
    });
  }

  return notifications;
}
