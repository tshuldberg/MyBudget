'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { PageHeader } from '../../../../components/layout/PageHeader';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { CurrencyDisplay } from '../../../../components/ui/CurrencyDisplay';
import { fetchCategoryHistory, fetchCategoryTransactions } from '../../../actions/reports';
import { chartColors, axisStyle, gridStyle, tooltipStyle } from '../../../../lib/chart-theme';
import styles from './page.module.css';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatCurrency(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  return `$${dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CategoryDrilldownPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.categoryId as string;

  const [history, setHistory] = useState<Array<{ month: string; total: number }>>([]);
  const [transactions, setTransactions] = useState<Array<{ id: string; date: string; payee: string; amount: number }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [hist, txns] = await Promise.all([
        fetchCategoryHistory(categoryId, 12),
        fetchCategoryTransactions(categoryId),
      ]);
      setHistory(hist);
      setTransactions(txns);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => { load(); }, [load]);

  const chartData = history.map((h) => {
    const [, m] = h.month.split('-');
    return {
      name: MONTH_LABELS[parseInt(m, 10) - 1],
      amount: h.total / 100,
      rawCents: h.total,
      month: h.month,
    };
  });

  const totalSpent = transactions.reduce((s, t) => s + Math.abs(t.amount), 0);
  const avgTransaction = transactions.length > 0 ? Math.round(totalSpent / transactions.length) : 0;

  if (loading) {
    return (
      <div>
        <PageHeader title="Category Details" />
        <Card><div className={styles.skeleton} /></Card>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <Button variant="ghost" size="sm" onClick={() => router.back()} style={{ marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back to Spending
      </Button>

      <div className={styles.layout}>
        {/* Main: chart + transactions */}
        <div className={styles.main}>
          {/* 12-month bar chart */}
          <Card>
            <div className={styles.chartHeader}>12-Month History</div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="name" {...axisStyle} />
                <YAxis {...axisStyle} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value: number) => [formatCurrency(value * 100), 'Spent']}
                />
                <Bar
                  dataKey="amount"
                  fill={chartColors.teal}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Transaction list */}
          <Card>
            <div className={styles.txnHeader}>
              <span className={styles.txnTitle}>Transactions</span>
              <span className={styles.txnCount}>{transactions.length} total</span>
            </div>
            {transactions.length === 0 ? (
              <div className={styles.emptyText}>No transactions this month</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Name</th>
                    <th className={styles.alignRight}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <td className={styles.dateCell}>{t.date.slice(5)}</td>
                      <td>{t.payee}</td>
                      <td className={styles.alignRight}>
                        <CurrencyDisplay amount={t.amount} colorize />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        {/* Sidebar: summary stats */}
        <div className={styles.sidebar}>
          <Card>
            <div className={styles.summaryTitle}>Summary</div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Total Transactions</span>
              <span className={styles.statValue}>{transactions.length}</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Average Transaction</span>
              <span className={styles.statValue}>{formatCurrency(avgTransaction)}</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Total Spent</span>
              <span className={styles.statValue}>{formatCurrency(totalSpent)}</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
