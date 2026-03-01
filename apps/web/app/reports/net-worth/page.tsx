'use client';

import { useEffect, useState, useCallback } from 'react';
import { Landmark, Plus } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { CurrencyDisplay } from '../../../components/ui/CurrencyDisplay';
import { EmptyState } from '../../../components/ui/EmptyState';
import { NetWorthChart } from '../../../components/reports/NetWorthChart';
import { fetchNetWorthHistory } from '../../actions/reports';
import {
  fetchNetWorthSnapshots,
  createNetWorthSnapshot,
  fetchAccountBreakdown,
} from '../../actions/net-worth';
import styles from './page.module.css';

interface NetWorthRow {
  month: string;
  netWorth: number;
}

interface AccountBreakdownItem {
  id: string;
  name: string;
  type: string;
  balance: number;
  isAsset: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatCurrency(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function NetWorthPage() {
  const [data, setData] = useState<NetWorthRow[]>([]);
  const [breakdown, setBreakdown] = useState<AccountBreakdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapshotSaving, setSnapshotSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [snapshots, estimated, acctBreakdown] = await Promise.all([
        fetchNetWorthSnapshots(),
        fetchNetWorthHistory(12),
        fetchAccountBreakdown(),
      ]);

      // Prefer real snapshots; fall back to estimated data
      if (snapshots.length > 0) {
        setData(snapshots.map((s) => ({
          month: s.month,
          netWorth: s.netWorth,
        })));
      } else {
        setData(estimated);
      }
      setBreakdown(acctBreakdown);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRecordSnapshot() {
    setSnapshotSaving(true);
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      await createNetWorthSnapshot(month);
      await load();
    } finally {
      setSnapshotSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Net Worth" subtitle="12-month history" />
        <div className={styles.content}>
          <Card><div className={styles.skeletonHero} /></Card>
          <Card><div className={styles.skeleton} /></Card>
        </div>
      </div>
    );
  }

  const currentNetWorth = data.length > 0 ? data[data.length - 1].netWorth : 0;
  const now = new Date();
  const currentMonthLabel = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  const assets = breakdown.filter((a) => a.isAsset);
  const liabilities = breakdown.filter((a) => !a.isAsset);
  const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);

  if (data.length === 0 && breakdown.length === 0) {
    return (
      <div className="fade-in">
        <PageHeader title="Net Worth" subtitle="12-month history" />
        <Card>
          <EmptyState
            icon={Landmark}
            title="No account data"
            description="Add accounts to start tracking your net worth over time."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <PageHeader
        title="Net Worth"
        subtitle="12-month history"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRecordSnapshot}
            disabled={snapshotSaving}
          >
            <Plus size={14} /> {snapshotSaving ? 'Saving...' : 'Record Snapshot'}
          </Button>
        }
      />

      <div className={styles.content}>
        <Card>
          <div className={styles.heroCard}>
            <div className={styles.heroLabel}>Current Net Worth</div>
            <div className={styles.heroAmount}>
              <CurrencyDisplay amount={currentNetWorth} colorize />
            </div>
            <div className={styles.heroSub}>as of {currentMonthLabel}</div>
          </div>
        </Card>

        <Card>
          <NetWorthChart data={data} />
        </Card>

        {breakdown.length > 0 && (
          <div className={styles.breakdownGrid}>
            <Card>
              <div className={styles.breakdownSection}>
                <div className={styles.breakdownHeader}>
                  <span className={styles.breakdownTitle}>Assets</span>
                  <span className={styles.breakdownTotal} style={{ color: 'var(--color-teal)' }}>
                    {formatCurrency(totalAssets)}
                  </span>
                </div>
                {assets.length === 0 ? (
                  <div className={styles.breakdownEmpty}>No asset accounts</div>
                ) : (
                  <div className={styles.breakdownList}>
                    {assets.map((a) => (
                      <div key={a.id} className={styles.breakdownRow}>
                        <div className={styles.breakdownName}>
                          <span className={styles.breakdownDot} style={{ background: 'var(--color-teal)' }} />
                          {a.name}
                          <span className={styles.breakdownType}>{a.type.replace('_', ' ')}</span>
                        </div>
                        <span className={styles.breakdownAmount}>{formatCurrency(a.balance)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <div className={styles.breakdownSection}>
                <div className={styles.breakdownHeader}>
                  <span className={styles.breakdownTitle}>Liabilities</span>
                  <span className={styles.breakdownTotal} style={{ color: 'var(--color-coral)' }}>
                    {formatCurrency(totalLiabilities)}
                  </span>
                </div>
                {liabilities.length === 0 ? (
                  <div className={styles.breakdownEmpty}>No liability accounts</div>
                ) : (
                  <div className={styles.breakdownList}>
                    {liabilities.map((a) => (
                      <div key={a.id} className={styles.breakdownRow}>
                        <div className={styles.breakdownName}>
                          <span className={styles.breakdownDot} style={{ background: 'var(--color-coral)' }} />
                          {a.name}
                          <span className={styles.breakdownType}>{a.type.replace('_', ' ')}</span>
                        </div>
                        <span className={styles.breakdownAmount}>{formatCurrency(a.balance)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
