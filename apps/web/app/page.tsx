'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../components/ui/Card';
import { CurrencyDisplay } from '../components/ui/CurrencyDisplay';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { getNetWorth, fetchAccounts } from './actions/accounts';
import { fetchRecentTransactions } from './actions/transactions';
import { fetchUpcomingRenewals, fetchSubscriptionSummary } from './actions/subscriptions';
import { fetchDailySpending } from './actions/reports';
import { seedDefaultCategories } from './actions/categories';
import type { Account, TransactionWithSplits, Subscription } from '@mybudget/shared';
import { CurrentSpendChart } from '../components/dashboard/CurrentSpendChart';
import { UpcomingStrip } from '../components/dashboard/UpcomingStrip';

import styles from './page.module.css';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatCurrency(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface DailyData {
  thisMonth: Array<{ day: number; cumulative: number }>;
  lastMonth: Array<{ day: number; cumulative: number }>;
  thisMonthTotal: number;
  lastMonthTotal: number;
  comparison: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [netWorth, setNetWorth] = useState({ assets: 0, liabilities: 0, netWorth: 0 });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentTxns, setRecentTxns] = useState<TransactionWithSplits[]>([]);
  const [upcomingRenewals, setUpcomingRenewals] = useState<Subscription[]>([]);
  const [subSummary, setSubSummary] = useState({ monthlyTotal: 0, annualTotal: 0, activeCount: 0 });
  const [dailySpend, setDailySpend] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedAccountType, setExpandedAccountType] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      await seedDefaultCategories();
      const [nw, accts, txns, renewals, subSum, daily] = await Promise.all([
        getNetWorth(),
        fetchAccounts(),
        fetchRecentTransactions(8),
        fetchUpcomingRenewals(7),
        fetchSubscriptionSummary(),
        fetchDailySpending(),
      ]);
      setNetWorth(nw);
      setAccounts(accts);
      setRecentTxns(txns);
      setUpcomingRenewals(renewals);
      setSubSummary(subSum);
      setDailySpend(daily);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <DashboardSkeleton />;

  // Group accounts by type
  const checking = accounts.filter((a) => a.type === 'checking');
  const savings = accounts.filter((a) => a.type === 'savings');
  const creditCards = accounts.filter((a) => a.type === 'credit_card');
  const cash = accounts.filter((a) => a.type === 'cash');
  const checkingTotal = checking.reduce((s, a) => s + a.balance, 0) + cash.reduce((s, a) => s + a.balance, 0);
  const cardTotal = creditCards.reduce((s, a) => s + Math.abs(a.balance), 0);
  const netCash = checkingTotal - cardTotal;

  const comparisonAbs = Math.abs(dailySpend?.comparison ?? 0);
  const spentMore = (dailySpend?.comparison ?? 0) > 0;

  const categoryIcon = (payee: string): string => {
    const p = payee.toLowerCase();
    if (p.includes('food') || p.includes('restaurant') || p.includes('doordash') || p.includes('uber eat')) return '🍽️';
    if (p.includes('gas') || p.includes('chevron') || p.includes('shell')) return '⛽';
    if (p.includes('grocery') || p.includes('albertson') || p.includes('trader') || p.includes('whole food')) return '🛒';
    if (p.includes('amazon')) return '📦';
    if (p.includes('netflix') || p.includes('spotify') || p.includes('disney') || p.includes('hulu')) return '🎬';
    if (p.includes('transfer')) return '🔄';
    return '💳';
  };

  return (
    <div className="fade-in">
      {/* Personalized greeting */}
      <h1 className={styles.greeting}>{getGreeting()}</h1>

      <div className={styles.grid}>
        {/* Current Spend Card - Wide */}
        <Card className={styles.spendCard}>
          <div className={styles.spendHeader}>
            <div>
              <span className={styles.cardLabel}>Current Spend</span>
              <div className={styles.spendAmount}>
                {formatCurrency(dailySpend?.thisMonthTotal ?? 0)}
              </div>
            </div>
            {dailySpend && comparisonAbs > 0 && (
              <div className={`${styles.comparisonBadge} ${spentMore ? styles.badgeNegative : styles.badgePositive}`}>
                {spentMore ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                <span>
                  You&apos;ve spent {formatCurrency(comparisonAbs)} {spentMore ? 'more' : 'less'} than last month
                </span>
              </div>
            )}
          </div>
          {dailySpend && (
            <CurrentSpendChart
              thisMonth={dailySpend.thisMonth}
              lastMonth={dailySpend.lastMonth}
            />
          )}
          <div className={styles.chartLegend}>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: 'var(--color-teal)' }} />
              This Month
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendDotDashed} />
              Last Month
            </span>
          </div>
        </Card>

        {/* Accounts Card */}
        <Card className={styles.accountsCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Accounts</span>
            <span className={styles.syncLabel}>
              <RefreshCw size={12} /> Sync now
            </span>
          </div>

          {/* Checking */}
          <AccountTypeRow
            label="Checking"
            icon="🏦"
            total={checkingTotal}
            accounts={[...checking, ...cash]}
            expanded={expandedAccountType === 'checking'}
            onToggle={() => setExpandedAccountType(expandedAccountType === 'checking' ? null : 'checking')}
          />

          {/* Card Balance */}
          <AccountTypeRow
            label="Card Balance"
            icon="💳"
            total={cardTotal}
            accounts={creditCards}
            expanded={expandedAccountType === 'cards'}
            onToggle={() => setExpandedAccountType(expandedAccountType === 'cards' ? null : 'cards')}
          />

          {/* Net Cash */}
          <div className={styles.accountTypeRow}>
            <div className={styles.accountTypeLeft}>
              <span className={styles.accountTypeIcon}>💰</span>
              <span className={styles.accountTypeName}>Net Cash</span>
            </div>
            <span className={netCash < 0 ? styles.amountNegative : styles.amountPositive}>
              {formatCurrency(netCash)}
            </span>
          </div>

          {/* Savings */}
          {savings.length > 0 ? (
            <AccountTypeRow
              label="Savings"
              icon="🐷"
              total={savings.reduce((s, a) => s + a.balance, 0)}
              accounts={savings}
              expanded={expandedAccountType === 'savings'}
              onToggle={() => setExpandedAccountType(expandedAccountType === 'savings' ? null : 'savings')}
            />
          ) : (
            <div className={styles.accountTypeRow}>
              <div className={styles.accountTypeLeft}>
                <span className={styles.accountTypeIcon}>🐷</span>
                <span className={styles.accountTypeName}>Savings</span>
              </div>
              <button className={styles.addBtn} onClick={() => router.push('/accounts')}>Add +</button>
            </div>
          )}
        </Card>

        {/* Recent Transactions - Wide */}
        <Card className={styles.wide}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Recent Transactions</span>
            <button className={styles.viewAll} onClick={() => router.push('/transactions')}>
              View all <ChevronRight size={14} />
            </button>
          </div>
          {recentTxns.length === 0 ? (
            <div className={styles.emptyText}>No transactions yet</div>
          ) : (
            <div className={styles.txnList}>
              {recentTxns.map(({ transaction: tx }) => (
                <div key={tx.id} className={styles.txnRow}>
                  <div className={styles.txnLeft}>
                    <span className={styles.txnIcon}>{categoryIcon(tx.payee)}</span>
                    <div className={styles.txnInfo}>
                      <span className={styles.txnPayee}>{tx.payee}</span>
                      <span className={styles.txnMeta}>
                        {tx.date}
                        {!tx.is_cleared && <span className={styles.pendingBadge}>Pending</span>}
                      </span>
                    </div>
                  </div>
                  <CurrencyDisplay amount={tx.amount} colorize showSign />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Upcoming Strip */}
        <Card>
          <UpcomingStrip
            renewals={upcomingRenewals}
            onSeeAll={() => router.push('/subscriptions/calendar')}
          />
        </Card>
      </div>
    </div>
  );
}

function AccountTypeRow({
  label,
  icon,
  total,
  accounts,
  expanded,
  onToggle,
}: {
  label: string;
  icon: string;
  total: number;
  accounts: Account[];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <div className={styles.accountTypeRow} onClick={onToggle} style={{ cursor: accounts.length > 1 ? 'pointer' : 'default' }}>
        <div className={styles.accountTypeLeft}>
          <span className={styles.accountTypeIcon}>{icon}</span>
          <span className={styles.accountTypeName}>{label}</span>
        </div>
        <div className={styles.accountTypeRight}>
          <span>{formatCurrency(total)}</span>
          {accounts.length > 1 && (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
        </div>
      </div>
      {expanded && accounts.length > 1 && (
        <div className={styles.subAccounts}>
          {accounts.map((a) => (
            <div key={a.id} className={styles.subAccountRow}>
              <span className={styles.subAccountName}>{a.name}</span>
              <span>{formatCurrency(a.balance)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <div className={styles.greeting} style={{ opacity: 0.3 }}>Loading...</div>
      <div className={styles.grid}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className={i === 1 || i === 3 ? styles.wide : ''}>
            <div className={styles.skeleton} />
            <div className={styles.skeletonSm} />
          </Card>
        ))}
      </div>
    </div>
  );
}
