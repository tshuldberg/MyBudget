'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, CreditCard, Search, MoreVertical } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay';
import { DiscoveredSubscriptions } from '../../components/subscriptions/DiscoveredSubscriptions';
import {
  fetchSubscriptions,
  fetchSubscriptionSummary,
  discoverSubscriptions,
  acceptDiscoveredSubscription,
  dismissSubscriptionPayee,
} from '../actions/subscriptions';
import { fetchMonthlySpending } from '../actions/reports';
import { chartColors, axisStyle, tooltipStyle } from '../../lib/chart-theme';
import type { Subscription, DetectedSubscription } from '@mybudget/shared';
import styles from './page.module.css';

type SubTab = 'upcoming' | 'all' | 'calendar';
type SortOption = 'type' | 'amount' | 'due';

function formatCurrency(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  return `$${dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function cycleToMonthly(cycle: string, price: number): number {
  const multipliers: Record<string, number> = {
    weekly: 52 / 12,
    monthly: 1,
    quarterly: 1 / 3,
    semi_annual: 1 / 6,
    annual: 1 / 12,
  };
  return Math.round(price * (multipliers[cycle] ?? 1));
}

function daysUntil(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff < 0) return 'overdue';
  return `in ${diff} days`;
}

// Group subscriptions by type
function categorizeSubscription(sub: Subscription): 'subscription' | 'bill' | 'credit_card' {
  const name = sub.name.toLowerCase();
  if (name.includes('card') && name.includes('payment')) return 'credit_card';
  if (name.includes('credit card')) return 'credit_card';
  if (['electric', 'gas', 'water', 'internet', 'phone', 'insurance', 'rent', 'mortgage', 'utility', 'edison', 'pg&e', 'socalgas'].some((k) => name.includes(k))) return 'bill';
  return 'subscription';
}

const GROUP_LABELS: Record<string, string> = {
  subscription: 'Subscriptions',
  bill: 'Bills & Utilities',
  credit_card: 'Credit Card Payments',
};

export default function SubscriptionsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SubTab>('all');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [summary, setSummary] = useState({ monthlyTotal: 0, annualTotal: 0, activeCount: 0 });
  const [discoveries, setDiscoveries] = useState<DetectedSubscription[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('type');
  const [showInactive, setShowInactive] = useState(false);
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<Array<{ month: string; total: number }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [subs, sum, discovered, spending] = await Promise.all([
        fetchSubscriptions(),
        fetchSubscriptionSummary(),
        discoverSubscriptions(),
        fetchMonthlySpending(6),
      ]);
      setSubscriptions(subs);
      setSummary(sum);
      setDiscoveries(discovered);
      setMonthlyBreakdown(spending);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Recurring" />
        <div className={styles.skeleton}>
          <Card><div className={styles.skeletonBlock} /></Card>
        </div>
      </div>
    );
  }

  // Filter and group
  const activeSubs = subscriptions.filter((s) => ['active', 'trial'].includes(s.status));
  const inactiveSubs = subscriptions.filter((s) => !['active', 'trial'].includes(s.status));

  const displaySubs = activeTab === 'upcoming'
    ? activeSubs.filter((s) => {
        const days = Math.ceil((new Date(s.next_renewal).getTime() - Date.now()) / 86400000);
        return days >= 0 && days <= 30;
      }).sort((a, b) => a.next_renewal.localeCompare(b.next_renewal))
    : activeSubs;

  const filtered = search
    ? displaySubs.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : displaySubs;

  // Group by category
  const grouped = new Map<string, Subscription[]>();
  for (const sub of filtered) {
    const cat = categorizeSubscription(sub);
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(sub);
  }

  // Sort within groups
  for (const [, subs] of grouped) {
    if (sort === 'amount') subs.sort((a, b) => b.price - a.price);
    else if (sort === 'due') subs.sort((a, b) => a.next_renewal.localeCompare(b.next_renewal));
  }

  // Chart data for monthly breakdown
  const chartData = monthlyBreakdown.map((d) => {
    const [, m] = d.month.split('-');
    const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
    return { name: months[parseInt(m, 10) - 1] ?? m, amount: d.total / 100 };
  });

  if (subscriptions.length === 0) {
    return (
      <div className="fade-in">
        <PageHeader title="Recurring" />
        <EmptyState
          icon={CreditCard}
          title="No subscriptions yet"
          description="Add your recurring subscriptions to track spending and renewal dates."
          actionLabel="Add Subscription"
          onAction={() => router.push('/subscriptions/add')}
        />
      </div>
    );
  }

  // If calendar tab is selected, redirect to calendar page
  if (activeTab === 'calendar') {
    router.push('/subscriptions/calendar');
  }

  return (
    <div className="fade-in">
      <PageHeader
        title="Recurring"
        actions={
          <div className={styles.tabs}>
            {(['upcoming', 'all', 'calendar'] as SubTab[]).map((tab) => (
              <button
                key={tab}
                className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                onClick={() => {
                  if (tab === 'calendar') {
                    router.push('/subscriptions/calendar');
                  } else {
                    setActiveTab(tab);
                  }
                }}
              >
                {tab === 'upcoming' ? 'Upcoming' : tab === 'all' ? 'All Recurring' : 'Calendar'}
              </button>
            ))}
          </div>
        }
      />

      <div className={styles.layout}>
        <div className={styles.main}>
          {/* Search + Sort */}
          <div className={styles.toolbar}>
            <div className={styles.searchWrap}>
              <Search size={16} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Search bills and subscriptions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className={styles.sortSelect}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
            >
              <option value="type">Sort by type</option>
              <option value="amount">Sort by amount</option>
              <option value="due">Sort by due date</option>
            </select>
          </div>

          {/* Discovered subscriptions */}
          {discoveries.length > 0 && (
            <DiscoveredSubscriptions
              suggestions={discoveries}
              onAccept={async (s) => {
                await acceptDiscoveredSubscription({
                  payee: s.payee,
                  amount: s.amount,
                  frequency: s.frequency,
                  matchedCatalogId: s.matchedCatalogId,
                });
                load();
              }}
              onDismiss={async (normalizedPayee) => {
                await dismissSubscriptionPayee(normalizedPayee);
              }}
            />
          )}

          {/* Grouped subscription tables */}
          {['subscription', 'bill', 'credit_card'].map((groupKey) => {
            const subs = grouped.get(groupKey);
            if (!subs || subs.length === 0) return null;
            const yearlyTotal = subs.reduce((s, sub) => s + cycleToMonthly(sub.billing_cycle, sub.price) * 12, 0);

            return (
              <Card key={groupKey}>
                <div className={styles.groupHeader}>
                  <span className={styles.groupTitle}>
                    {subs.length} {GROUP_LABELS[groupKey]}
                  </span>
                  <span className={styles.groupYearly}>
                    You spend {formatCurrency(yearlyTotal)}/yearly
                  </span>
                </div>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name/Frequency</th>
                      <th>Account</th>
                      <th>Due</th>
                      <th className={styles.alignRight}>Amount</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {subs.map((sub) => (
                      <tr
                        key={sub.id}
                        className={styles.tableRow}
                        onClick={() => router.push(`/subscriptions/${sub.id}`)}
                      >
                        <td>
                          <div className={styles.nameCell}>
                            <span className={styles.subIcon}>{sub.icon ?? '💳'}</span>
                            <div>
                              <div className={styles.subName}>{sub.name}</div>
                              <div className={styles.subFreq}>{sub.billing_cycle.replace('_', '-')}</div>
                            </div>
                          </div>
                        </td>
                        <td className={styles.accountCell}>
                          {sub.notes?.includes('****') ? sub.notes : ''}
                        </td>
                        <td className={styles.dueCell}>{daysUntil(sub.next_renewal)}</td>
                        <td className={styles.alignRight}>
                          <CurrencyDisplay amount={sub.price} />
                        </td>
                        <td className={styles.menuCell}>
                          <MoreVertical size={16} className={styles.menuIcon} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            );
          })}

          {/* Inactive toggle */}
          {inactiveSubs.length > 0 && (
            <button
              className={styles.inactiveToggle}
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? 'Hide' : 'Show'} {inactiveSubs.length} Inactive
            </button>
          )}

          {showInactive && inactiveSubs.length > 0 && (
            <Card>
              <div className={styles.groupHeader}>
                <span className={styles.groupTitle}>Inactive</span>
              </div>
              <div className={styles.inactiveList}>
                {inactiveSubs.map((sub) => (
                  <div
                    key={sub.id}
                    className={styles.inactiveRow}
                    onClick={() => router.push(`/subscriptions/${sub.id}`)}
                  >
                    <span>{sub.icon ?? '💳'} {sub.name}</span>
                    <span className={styles.inactiveStatus}>{sub.status}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Add button */}
          <Button size="sm" onClick={() => router.push('/subscriptions/add')}>
            <Plus size={16} /> Add Subscription
          </Button>
        </div>

        {/* Sidebar: monthly breakdown chart */}
        <div className={styles.sidebar}>
          <Card>
            <div className={styles.breakdownTitle}>Monthly Breakdown</div>
            <div className={styles.breakdownSubtitle}>
              See how your recurring charges have changed over the past 6 months.
            </div>
            {chartData.length > 0 && (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" {...axisStyle} />
                  <YAxis {...axisStyle} tickFormatter={(v) => `$${v}`} hide />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Total']}
                  />
                  <Bar dataKey="amount" fill={chartColors.teal} radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
