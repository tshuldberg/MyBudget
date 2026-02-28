'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, CreditCard } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { SubscriptionCostCard } from '../../components/subscriptions/SubscriptionCostCard';
import { SubscriptionList } from '../../components/subscriptions/SubscriptionList';
import { DiscoveredSubscriptions } from '../../components/subscriptions/DiscoveredSubscriptions';
import {
  fetchSubscriptions,
  fetchSubscriptionSummary,
  discoverSubscriptions,
  acceptDiscoveredSubscription,
  dismissSubscriptionPayee,
} from '../actions/subscriptions';
import type { Subscription, DetectedSubscription } from '@mybudget/shared';
import styles from './page.module.css';

export default function SubscriptionsPage() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [summary, setSummary] = useState({ monthlyTotal: 0, annualTotal: 0, activeCount: 0 });
  const [discoveries, setDiscoveries] = useState<DetectedSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [subs, sum, discovered] = await Promise.all([
        fetchSubscriptions(),
        fetchSubscriptionSummary(),
        discoverSubscriptions(),
      ]);
      setSubscriptions(subs);
      setSummary(sum);
      setDiscoveries(discovered);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleSelect(id: string) {
    router.push(`/subscriptions/${id}`);
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Subscriptions" subtitle="Track your recurring services" />
        <div className={styles.skeleton}>
          <Card><div className={styles.skeletonBlock} /></Card>
          <Card><div className={styles.skeletonBlock} /></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <PageHeader
        title="Subscriptions"
        subtitle="Track your recurring services"
        actions={
          <div className={styles.headerActions}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push('/subscriptions/calendar')}
            >
              Calendar
            </Button>
            <Button size="sm" onClick={() => router.push('/subscriptions/add')}>
              <Plus size={16} /> Add Subscription
            </Button>
          </div>
        }
      />

      {subscriptions.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No subscriptions yet"
          description="Add your recurring subscriptions to track spending and renewal dates."
          actionLabel="Add Subscription"
          onAction={() => router.push('/subscriptions/add')}
        />
      ) : (
        <div className={styles.content}>
          <SubscriptionCostCard
            monthlyTotal={summary.monthlyTotal}
            annualTotal={summary.annualTotal}
            activeCount={summary.activeCount}
          />

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

          <Card className={styles.listCard}>
            <SubscriptionList
              subscriptions={subscriptions}
              onSelect={handleSelect}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
