'use client';

import { useEffect, useState, useCallback } from 'react';
import { Landmark } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { CurrencyDisplay } from '../../../components/ui/CurrencyDisplay';
import { EmptyState } from '../../../components/ui/EmptyState';
import { NetWorthChart } from '../../../components/reports/NetWorthChart';
import { fetchNetWorthHistory } from '../../actions/reports';
import styles from './page.module.css';

interface NetWorthRow {
  month: string;
  netWorth: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function NetWorthPage() {
  const [data, setData] = useState<NetWorthRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const result = await fetchNetWorthHistory(12);
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

  if (data.length === 0) {
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
      <PageHeader title="Net Worth" subtitle="12-month history" />

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
      </div>
    </div>
  );
}
