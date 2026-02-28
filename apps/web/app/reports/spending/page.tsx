'use client';

import { useEffect, useState, useCallback } from 'react';
import { PieChart as PieChartIcon } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SpendingBreakdown } from '../../../components/reports/SpendingBreakdown';
import { CategorySpendTable } from '../../../components/reports/CategorySpendTable';
import { fetchCategorySpending } from '../../actions/reports';
import type { CategorySpending } from '../../actions/reports';
import styles from './page.module.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getCurrentMonthLabel(): string {
  const now = new Date();
  return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}

export default function SpendingPage() {
  const [data, setData] = useState<CategorySpending[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const result = await fetchCategorySpending();
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
        <PageHeader title="Spending Breakdown" subtitle={getCurrentMonthLabel()} />
        <div className={styles.content}>
          <div className={styles.topRow}>
            <Card><div className={styles.skeleton} /></Card>
            <Card><div className={styles.skeleton} /></Card>
          </div>
          <Card><div className={styles.skeletonTable} /></Card>
        </div>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    categoryName: d.categoryName,
    emoji: d.emoji,
    total: d.total,
  }));

  if (chartData.length === 0) {
    return (
      <div className="fade-in">
        <PageHeader title="Spending Breakdown" subtitle={getCurrentMonthLabel()} />
        <Card>
          <EmptyState
            icon={PieChartIcon}
            title="No spending data"
            description="Add transactions to see your spending breakdown by category."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <PageHeader title="Spending Breakdown" subtitle={getCurrentMonthLabel()} />

      <div className={styles.content}>
        <div className={styles.topRow}>
          <Card>
            <SpendingBreakdown data={chartData} />
          </Card>
          <Card>
            <CategorySpendTable data={chartData} />
          </Card>
        </div>
      </div>
    </div>
  );
}
