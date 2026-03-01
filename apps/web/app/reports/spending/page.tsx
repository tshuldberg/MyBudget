'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PieChart as PieChartIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { CurrencyDisplay } from '../../../components/ui/CurrencyDisplay';
import { SpendingBreakdown } from '../../../components/reports/SpendingBreakdown';
import {
  fetchCategorySpending,
  fetchSpendingSummary,
  fetchFrequentSpend,
} from '../../actions/reports';
import type { CategorySpending } from '../../actions/reports';
import styles from './page.module.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type Period = 'last' | 'this' | 'custom';

function getMonthStr(offset = 0): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

function formatCurrency(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function SpendingPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('this');
  const [data, setData] = useState<CategorySpending[]>([]);
  const [prevData, setPrevData] = useState<CategorySpending[]>([]);
  const [summary, setSummary] = useState<{
    income: number; bills: number; spending: number;
    prevIncome: number; prevBills: number; prevSpending: number;
  } | null>(null);
  const [frequent, setFrequent] = useState<Array<{
    payee: string; count: number; total: number; average: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  const monthStr = period === 'last' ? getMonthStr(-1) : getMonthStr(0);
  const prevMonthStr = period === 'last' ? getMonthStr(-2) : getMonthStr(-1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, prevCats, sum, freq] = await Promise.all([
        fetchCategorySpending(monthStr),
        fetchCategorySpending(prevMonthStr),
        fetchSpendingSummary(monthStr),
        fetchFrequentSpend(monthStr, 5),
      ]);
      setData(cats);
      setPrevData(prevCats);
      setSummary(sum);
      setFrequent(freq);
    } finally {
      setLoading(false);
    }
  }, [monthStr, prevMonthStr]);

  useEffect(() => { load(); }, [load]);

  const chartData = data.map((d) => ({
    categoryId: d.categoryId,
    categoryName: d.categoryName,
    emoji: d.emoji,
    total: d.total,
  }));

  const grandTotal = data.reduce((s, d) => s + d.total, 0);

  // Build change map for categories
  const prevMap = new Map<string, number>();
  for (const p of prevData) prevMap.set(p.categoryId, p.total);

  return (
    <div className="fade-in">
      <PageHeader
        title="Spending"
        actions={
          <div className={styles.periodTabs}>
            <button
              className={`${styles.tab} ${period === 'last' ? styles.tabActive : ''}`}
              onClick={() => setPeriod('last')}
            >
              Last Month
            </button>
            <button
              className={`${styles.tab} ${period === 'this' ? styles.tabActive : ''}`}
              onClick={() => setPeriod('this')}
            >
              This Month
            </button>
          </div>
        }
      />

      {loading ? (
        <div className={styles.layout}>
          <div className={styles.main}><Card><div className={styles.skeleton} /></Card></div>
          <div className={styles.sidebar}><Card><div className={styles.skeletonSm} /></Card></div>
        </div>
      ) : chartData.length === 0 ? (
        <Card>
          <EmptyState
            icon={PieChartIcon}
            title="No spending data"
            description="Add transactions to see your spending breakdown by category."
          />
        </Card>
      ) : (
        <div className={styles.layout}>
          {/* Main content: chart + category table */}
          <div className={styles.main}>
            {/* Donut chart */}
            <Card>
              <SpendingBreakdown data={chartData} />
            </Card>

            {/* Category table with change indicators */}
            <Card>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>% Spend</th>
                    <th>Change</th>
                    <th className={styles.alignRight}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data].sort((a, b) => b.total - a.total).map((row) => {
                    const pct = grandTotal > 0 ? (row.total / grandTotal) * 100 : 0;
                    const prevTotal = prevMap.get(row.categoryId) ?? 0;
                    const change = prevTotal > 0
                      ? Math.round(((row.total - prevTotal) / prevTotal) * 100)
                      : null;

                    return (
                      <tr
                        key={row.categoryId}
                        className={styles.tableRow}
                        onClick={() => router.push(`/reports/spending/${row.categoryId}`)}
                      >
                        <td>
                          <div className={styles.categoryCell}>
                            <span className={styles.emoji}>{row.emoji ?? '📂'}</span>
                            <span>{row.categoryName}</span>
                          </div>
                        </td>
                        <td className={styles.pctCell}>{pct.toFixed(0)}% of spend</td>
                        <td>
                          {change !== null ? (
                            <span className={change > 0 ? styles.changeUp : styles.changeDown}>
                              {change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                              {' '}{Math.abs(change)}%
                            </span>
                          ) : (
                            <span className={styles.changeNew}>New</span>
                          )}
                        </td>
                        <td className={styles.alignRight}>
                          <CurrencyDisplay amount={row.total} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Sidebar: summary + frequent spend */}
          <div className={styles.sidebar}>
            {/* Summary */}
            {summary && (
              <Card>
                <div className={styles.summaryHeader}>
                  <span className={styles.summaryTitle}>Summary</span>
                  <span className={styles.summaryPeriod}>{getMonthLabel(monthStr)}</span>
                </div>

                <div className={styles.summaryRow}>
                  <div className={styles.summaryLeft}>
                    <span className={styles.summaryIcon} style={{ color: 'var(--color-teal)' }}>+</span>
                    <div>
                      <div className={styles.summaryLabel}>Income</div>
                      {summary.prevIncome > 0 && (
                        <div className={styles.summaryCompare}>
                          {formatCurrency(Math.abs(summary.income - summary.prevIncome))}{' '}
                          {summary.income >= summary.prevIncome ? 'more' : 'less'} than prev
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={styles.summaryAmount} style={{ color: 'var(--color-teal)' }}>
                    {formatCurrency(summary.income)}
                  </span>
                </div>

                <div className={styles.summaryRow}>
                  <div className={styles.summaryLeft}>
                    <span className={styles.summaryIcon} style={{ color: 'var(--color-amber)' }}>-</span>
                    <div>
                      <div className={styles.summaryLabel}>Bills</div>
                      {summary.prevBills > 0 && (
                        <div className={styles.summaryCompare}>
                          {formatCurrency(Math.abs(summary.bills - summary.prevBills))}{' '}
                          {summary.bills <= summary.prevBills ? 'less' : 'more'} than prev
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={styles.summaryAmount}>
                    {formatCurrency(summary.bills)}
                  </span>
                </div>

                <div className={styles.summaryRow}>
                  <div className={styles.summaryLeft}>
                    <span className={styles.summaryIcon} style={{ color: 'var(--color-coral)' }}>-</span>
                    <div>
                      <div className={styles.summaryLabel}>Spending</div>
                      {summary.prevSpending > 0 && (
                        <div className={styles.summaryCompare}>
                          {formatCurrency(Math.abs(summary.spending - summary.prevSpending))}{' '}
                          {summary.spending <= summary.prevSpending ? 'less' : 'more'} than prev
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={styles.summaryAmount}>
                    {formatCurrency(summary.spending)}
                  </span>
                </div>
              </Card>
            )}

            {/* Frequent Spend */}
            {frequent.length > 0 && (
              <Card>
                <div className={styles.frequentHeader}>Frequent Spend</div>
                <div className={styles.frequentList}>
                  {frequent.map((f) => (
                    <div key={f.payee} className={styles.frequentRow}>
                      <div className={styles.frequentLeft}>
                        <span className={styles.frequentCount}>{f.count}x</span>
                        <div>
                          <div className={styles.frequentPayee}>{f.payee}</div>
                          <div className={styles.frequentAvg}>Average {formatCurrency(f.average)}</div>
                        </div>
                      </div>
                      <span className={styles.frequentTotal}>{formatCurrency(f.total)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
