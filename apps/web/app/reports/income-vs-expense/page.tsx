'use client';

import { useEffect, useState, useCallback } from 'react';
import { TrendingUp } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { CurrencyDisplay } from '../../../components/ui/CurrencyDisplay';
import { EmptyState } from '../../../components/ui/EmptyState';
import { MonthlyTrendChart } from '../../../components/reports/MonthlyTrendChart';
import { fetchIncomeVsExpense } from '../../actions/reports';
import styles from './page.module.css';

interface IncomeExpenseRow {
  month: string;
  income: number;
  expense: number;
}

export default function IncomeVsExpensePage() {
  const [data, setData] = useState<IncomeExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const result = await fetchIncomeVsExpense(6);
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
        <PageHeader title="Income vs Expense" subtitle="Last 6 months" />
        <div className={styles.content}>
          <Card><div className={styles.skeleton} /></Card>
          <div className={styles.skeletonRow}>
            <Card><div className={styles.skeletonCard} /></Card>
            <Card><div className={styles.skeletonCard} /></Card>
            <Card><div className={styles.skeletonCard} /></Card>
          </div>
        </div>
      </div>
    );
  }

  const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
  const totalExpense = data.reduce((sum, d) => sum + d.expense, 0);
  const net = totalIncome - totalExpense;

  if (data.every((d) => d.income === 0 && d.expense === 0)) {
    return (
      <div className="fade-in">
        <PageHeader title="Income vs Expense" subtitle="Last 6 months" />
        <Card>
          <EmptyState
            icon={TrendingUp}
            title="No data yet"
            description="Add income and expense transactions to see trends over time."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <PageHeader title="Income vs Expense" subtitle="Last 6 months" />

      <div className={styles.content}>
        <Card>
          <MonthlyTrendChart data={data} />
        </Card>

        <div className={styles.summaryGrid}>
          <Card>
            <div className={styles.summaryLabel}>Total Income</div>
            <div className={styles.summaryAmount}>
              <CurrencyDisplay amount={totalIncome} colorize />
            </div>
          </Card>
          <Card>
            <div className={styles.summaryLabel}>Total Expenses</div>
            <div className={styles.summaryAmount}>
              <CurrencyDisplay amount={-totalExpense} colorize />
            </div>
          </Card>
          <Card>
            <div className={styles.summaryLabel}>Net</div>
            <div className={styles.summaryAmount}>
              <CurrencyDisplay amount={net} colorize showSign />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
