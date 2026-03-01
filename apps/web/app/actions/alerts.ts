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

export async function fetchAlerts(): Promise<AlertRow[]> {
  return _listAlerts(getDb());
}

export async function createBudgetAlert(
  categoryId: string,
  thresholdPct: number,
): Promise<AlertRow> {
  return _createAlert(getDb(), {
    categoryId,
    thresholdPct,
  });
}

export async function updateAlertEnabled(
  alertId: string,
  enabled: boolean,
): Promise<void> {
  _updateAlert(getDb(), alertId, { isEnabled: enabled });
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
    categoryId: a.categoryId,
    thresholdPct: a.thresholdPct,
    isEnabled: a.isEnabled,
  }));

  const historyEntries = history.map((h) => ({
    alertId: h.alertId,
    categoryId: h.categoryId,
    month: h.month,
    thresholdPct: h.thresholdPct,
    spentPct: h.spentPct,
    amountSpent: h.amountSpent,
    targetAmount: h.targetAmount,
    notifiedAt: h.notifiedAt,
  }));

  const notifications = checkAlerts(alertConfigs, categoryStates, historyEntries, targetMonth);

  // Persist any fired alerts to history
  for (const n of notifications) {
    _createAlertHistory(db, {
      alertId: n.alertId,
      categoryId: n.categoryId,
      month: targetMonth,
      thresholdPct: n.thresholdPct,
      spentPct: n.spentPct,
      amountSpent: n.amountSpent,
      targetAmount: n.targetAmount,
    });
  }

  return notifications;
}
