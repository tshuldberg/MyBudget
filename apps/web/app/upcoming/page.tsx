'use client';

import { useEffect, useState, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay';
import { EmptyState } from '../../components/ui/EmptyState';
import { fetchUpcomingTransactions } from '../actions/upcoming';
import type { UpcomingResult } from '../actions/upcoming';
import styles from './page.module.css';

function formatCurrency(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getRelativeLabel(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 7) return `In ${diff} days`;
  if (diff < 14) return 'Next week';
  return `In ${Math.ceil(diff / 7)} weeks`;
}

const FREQ_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

export default function UpcomingPage() {
  const [data, setData] = useState<UpcomingResult | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const result = await fetchUpcomingTransactions(30);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Upcoming" subtitle="Scheduled transactions for the next 30 days" />
        <Card><div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading...</div></Card>
      </div>
    );
  }

  if (!data || data.groups.length === 0) {
    return (
      <div className="fade-in">
        <PageHeader title="Upcoming" subtitle="Scheduled transactions for the next 30 days" />
        <Card>
          <EmptyState
            icon={Calendar}
            title="No upcoming transactions"
            description="Add recurring templates to see scheduled transactions here."
          />
        </Card>
      </div>
    );
  }

  const txnCount = data.groups.reduce((sum, g) => sum + g.transactions.length, 0);

  return (
    <div className="fade-in">
      <PageHeader title="Upcoming" subtitle="Scheduled transactions for the next 30 days" />

      <div className={styles.content}>
        <Card>
          <div className={styles.heroCard}>
            <div className={styles.heroLabel}>Total Upcoming (30 days)</div>
            <div className={styles.heroAmount}>
              <CurrencyDisplay amount={data.total} colorize />
            </div>
            <div className={styles.heroSub}>{txnCount} transactions across {data.groups.length} dates</div>
          </div>
        </Card>

        {data.groups.map((group) => (
          <Card key={group.date}>
            <div className={styles.dateGroup}>
              <div className={styles.dateHeader}>
                <div>
                  <span className={styles.dateLabel}>{formatDate(group.date)}</span>
                  <span className={styles.dateRelative}>{getRelativeLabel(group.date)}</span>
                </div>
                <span className={styles.dateTotal}>{formatCurrency(group.total)}</span>
              </div>

              {group.transactions.map((txn, i) => (
                <div key={`${txn.templateId}-${i}`} className={styles.txnRow}>
                  <div className={styles.txnLeft}>
                    <span className={styles.txnPayee}>{txn.payee}</span>
                    <span className={styles.txnFreq}>{FREQ_LABELS[txn.frequency] ?? txn.frequency}</span>
                  </div>
                  <span className={`${styles.txnAmount} ${txn.amount < 0 ? styles.txnAmountNeg : styles.txnAmountPos}`}>
                    {formatCurrency(txn.amount)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
