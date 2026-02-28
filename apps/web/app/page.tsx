'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { CurrencyDisplay } from '../components/ui/CurrencyDisplay';
import { ProgressBar } from '../components/ui/ProgressBar';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowLeftRight,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { getNetWorth, fetchAccounts } from './actions/accounts';
import { fetchBudgetForMonth } from './actions/budget';
import { fetchRecentTransactions } from './actions/transactions';
import { fetchUpcomingRenewals, fetchSubscriptionSummary } from './actions/subscriptions';
import { fetchMonthlySpending } from './actions/reports';
import { seedDefaultCategories } from './actions/categories';
import type { MonthBudgetState, Account, TransactionWithSplits, Subscription } from '@mybudget/shared';
import { MonthlySpendingChart } from '../components/dashboard/MonthlySpendingChart';

import styles from './page.module.css';

export default function DashboardPage() {
  const [netWorth, setNetWorth] = useState({ assets: 0, liabilities: 0, netWorth: 0 });
  const [budget, setBudget] = useState<MonthBudgetState | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentTxns, setRecentTxns] = useState<TransactionWithSplits[]>([]);
  const [upcomingRenewals, setUpcomingRenewals] = useState<Subscription[]>([]);
  const [subSummary, setSubSummary] = useState({ monthlyTotal: 0, annualTotal: 0, activeCount: 0 });
  const [monthlySpending, setMonthlySpending] = useState<Array<{ month: string; total: number }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      await seedDefaultCategories();
      const [nw, bgt, accts, txns, renewals, subSum, spending] = await Promise.all([
        getNetWorth(),
        fetchBudgetForMonth(),
        fetchAccounts(),
        fetchRecentTransactions(10),
        fetchUpcomingRenewals(7),
        fetchSubscriptionSummary(),
        fetchMonthlySpending(6),
      ]);
      setNetWorth(nw);
      setBudget(bgt);
      setAccounts(accts);
      setRecentTxns(txns);
      setUpcomingRenewals(renewals);
      setSubSummary(subSum);
      setMonthlySpending(spending);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <DashboardSkeleton />;

  const accountTypeIcon = (type: string) => {
    switch (type) {
      case 'checking': return '🏦';
      case 'savings': return '🐷';
      case 'credit_card': return '💳';
      case 'cash': return '💵';
      default: return '🏦';
    }
  };

  return (
    <div className="fade-in">
      <PageHeader title="Dashboard" subtitle="Your financial overview" />

      <div className={styles.grid}>
        {/* Net Worth Card */}
        <Card className={styles.wide}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Net Worth</span>
            {netWorth.netWorth >= 0 ? <TrendingUp size={18} color="var(--color-teal)" /> : <TrendingDown size={18} color="var(--color-coral)" />}
          </div>
          <div className={styles.heroAmount}>
            <CurrencyDisplay amount={netWorth.netWorth} colorize />
          </div>
          <div className={styles.subRow}>
            <span className={styles.subLabel}>Assets: <CurrencyDisplay amount={netWorth.assets} /></span>
            <span className={styles.subLabel}>Liabilities: <CurrencyDisplay amount={netWorth.liabilities} /></span>
          </div>
        </Card>

        {/* Budget Progress Card */}
        <Card>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Ready to Assign</span>
            <Wallet size={18} color="var(--color-teal)" />
          </div>
          <div className={styles.heroAmount}>
            <CurrencyDisplay amount={budget?.readyToAssign ?? 0} colorize />
          </div>
          {budget && (
            <div className={styles.budgetMini}>
              {budget.groups.slice(0, 5).map((g) => (
                <div key={g.groupId} className={styles.miniRow}>
                  <span className={styles.miniLabel}>{g.name}</span>
                  <ProgressBar
                    value={g.allocated > 0 ? Math.round((Math.abs(g.activity) / g.allocated) * 100) : 0}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Subscription Alert Card */}
        <Card>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Subscriptions</span>
            <RefreshCw size={18} color="var(--color-amber)" />
          </div>
          <div className={styles.heroAmount}>
            <CurrencyDisplay amount={subSummary.monthlyTotal} />
            <span className={styles.perMonth}>/mo</span>
          </div>
          <div className={styles.subLabel}>{subSummary.activeCount} active subscriptions</div>
          {upcomingRenewals.length > 0 && (
            <div className={styles.renewalList}>
              <div className={styles.renewalHeader}>
                <Clock size={14} /> Upcoming renewals
              </div>
              {upcomingRenewals.slice(0, 3).map((s) => (
                <div key={s.id} className={styles.renewalRow}>
                  <span>{s.icon ?? '💳'} {s.name}</span>
                  <CurrencyDisplay amount={s.price} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Transactions */}
        <Card className={styles.wide}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Recent Transactions</span>
            <ArrowLeftRight size={18} color="var(--color-lavender)" />
          </div>
          {recentTxns.length === 0 ? (
            <div className={styles.emptyText}>No transactions yet</div>
          ) : (
            <div className={styles.txnList}>
              {recentTxns.map(({ transaction: tx }) => (
                <div key={tx.id} className={styles.txnRow}>
                  <div className={styles.txnInfo}>
                    <span className={styles.txnPayee}>{tx.payee}</span>
                    <span className={styles.txnDate}>{tx.date}</span>
                  </div>
                  <CurrencyDisplay amount={tx.amount} colorize showSign />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Accounts Overview */}
        <Card>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Accounts</span>
          </div>
          {accounts.length === 0 ? (
            <div className={styles.emptyText}>No accounts yet</div>
          ) : (
            <div className={styles.accountList}>
              {accounts.map((a) => (
                <div key={a.id} className={styles.accountRow}>
                  <span>{accountTypeIcon(a.type)} {a.name}</span>
                  <CurrencyDisplay amount={a.balance} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Monthly Spending Chart */}
        <Card className={styles.fullWidth}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Spending Trend</span>
          </div>
          <MonthlySpendingChart data={monthlySpending} />
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Your financial overview" />
      <div className={styles.grid}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className={i === 1 || i === 4 ? styles.wide : i === 6 ? styles.fullWidth : ''}>
            <div className={styles.skeleton} />
            <div className={styles.skeletonSm} />
          </Card>
        ))}
      </div>
    </div>
  );
}
