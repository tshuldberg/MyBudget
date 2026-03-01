'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Dialog } from '../../../components/ui/Dialog';
import {
  fetchAlerts,
  createBudgetAlert,
  updateAlertEnabled,
  deleteBudgetAlert,
  fetchAlertHistory,
  checkAndFireAlerts,
} from '../../actions/alerts';
import { fetchCategories } from '../../actions/categories';
import type { Category, AlertHistoryRow } from '@mybudget/shared';
import styles from './page.module.css';

function formatCurrency(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface AlertItem {
  id: string;
  categoryId: string;
  categoryName: string;
  thresholdPct: number;
  isEnabled: boolean;
}

export default function AlertsSettingsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [history, setHistory] = useState<AlertHistoryRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const loadData = useCallback(async () => {
    const [alertRows, cats, hist] = await Promise.all([
      fetchAlerts(),
      fetchCategories(),
      fetchAlertHistory(),
    ]);
    const catMap = new Map(cats.map((c) => [c.id, c.name]));
    setAlerts(alertRows.map((a) => ({
      ...a,
      categoryName: catMap.get(a.categoryId) ?? 'Unknown',
    })));
    setCategories(cats);
    setHistory(hist);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleToggle(alertId: string, currentEnabled: boolean) {
    await updateAlertEnabled(alertId, !currentEnabled);
    await loadData();
  }

  async function handleDelete(alertId: string) {
    await deleteBudgetAlert(alertId);
    await loadData();
  }

  async function handleCheckAlerts() {
    await checkAndFireAlerts();
    await loadData();
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Budget Alerts" subtitle="Get notified when spending hits thresholds" />
        <Card><div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading...</div></Card>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <PageHeader
        title="Budget Alerts"
        subtitle="Get notified when spending hits thresholds"
        actions={
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <Button variant="secondary" size="sm" onClick={handleCheckAlerts}>
              Check Now
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus size={14} /> Add Alert
            </Button>
          </div>
        }
      />

      <div className={styles.content}>
        {alerts.length === 0 ? (
          <Card>
            <EmptyState
              icon={Bell}
              title="No alerts configured"
              description="Set up spending alerts to get notified when a category reaches a threshold."
              actionLabel="Add Alert"
              onAction={() => setShowAddDialog(true)}
            />
          </Card>
        ) : (
          <Card>
            <div className={styles.sectionTitle}>Active Alerts</div>
            <div className={styles.alertList}>
              {alerts.map((alert) => (
                <div key={alert.id} className={styles.alertRow}>
                  <span className={styles.alertCategory}>{alert.categoryName}</span>
                  <span className={styles.alertThreshold}>{alert.thresholdPct}%</span>
                  <div className={styles.alertToggle}>
                    <button
                      className={`${styles.toggle} ${alert.isEnabled ? styles.toggleOn : styles.toggleOff}`}
                      onClick={() => handleToggle(alert.id, alert.isEnabled)}
                      aria-label={alert.isEnabled ? 'Disable alert' : 'Enable alert'}
                    />
                  </div>
                  <button className={styles.alertDeleteBtn} onClick={() => handleDelete(alert.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Alert History */}
        {history.length > 0 && (
          <Card>
            <div className={styles.sectionTitle}>Alert History (This Month)</div>
            <div className={styles.historyList}>
              <div className={`${styles.historyRow} ${styles.historyHeader}`}>
                <span>Category</span>
                <span>Threshold</span>
                <span>Spent</span>
                <span>Amount</span>
              </div>
              {history.map((h) => (
                <div key={h.id} className={styles.historyRow}>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {categories.find((c) => c.id === h.categoryId)?.name ?? h.categoryId}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{h.thresholdPct}%</span>
                  <span style={{ color: h.spentPct >= 100 ? 'var(--color-coral)' : 'var(--color-amber)' }}>
                    {h.spentPct}%
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {formatCurrency(h.amountSpent)} / {formatCurrency(h.targetAmount)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Add Alert Dialog */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} title="Add Budget Alert" width={400}>
        <AddAlertForm
          categories={categories}
          onSubmit={async (categoryId, thresholdPct) => {
            await createBudgetAlert(categoryId, thresholdPct);
            setShowAddDialog(false);
            await loadData();
          }}
          onCancel={() => setShowAddDialog(false)}
        />
      </Dialog>
    </div>
  );
}

function AddAlertForm({
  categories,
  onSubmit,
  onCancel,
}: {
  categories: Category[];
  onSubmit: (categoryId: string, thresholdPct: number) => void;
  onCancel: () => void;
}) {
  const [categoryId, setCategoryId] = useState('');
  const [threshold, setThreshold] = useState('80');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <Select
        label="Category"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        options={[
          { value: '', label: 'Select a category' },
          ...categories.map((c) => ({
            value: c.id,
            label: `${c.emoji ?? ''} ${c.name}`.trim(),
          })),
        ]}
      />
      <Input
        label="Threshold (%)"
        type="number"
        min="1"
        max="200"
        value={threshold}
        onChange={(e) => setThreshold(e.target.value)}
      />
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => onSubmit(categoryId, parseInt(threshold))}
          disabled={!categoryId || !threshold}
        >
          Add Alert
        </Button>
      </div>
    </div>
  );
}
