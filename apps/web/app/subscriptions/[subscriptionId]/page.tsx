'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { SubscriptionDetail } from '../../../components/subscriptions/SubscriptionDetail';
import {
  fetchSubscriptionById,
  updateSubscriptionAction,
  deleteSubscriptionAction,
} from '../../actions/subscriptions';
import type { Subscription } from '@mybudget/shared';

export default function SubscriptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const subscriptionId = params.subscriptionId as string;

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    try {
      const sub = await fetchSubscriptionById(subscriptionId);
      if (!sub) {
        setNotFound(true);
      } else {
        setSubscription(sub);
      }
    } finally {
      setLoading(false);
    }
  }, [subscriptionId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpdate(id: string, updates: Record<string, unknown>) {
    await updateSubscriptionAction(id, updates as Parameters<typeof updateSubscriptionAction>[1]);
    const refreshed = await fetchSubscriptionById(id);
    if (refreshed) setSubscription(refreshed);
  }

  async function handleDelete(id: string) {
    await deleteSubscriptionAction(id);
    router.push('/subscriptions');
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Subscription" />
        <Card>
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Loading...
          </div>
        </Card>
      </div>
    );
  }

  if (notFound || !subscription) {
    return (
      <div>
        <PageHeader title="Subscription Not Found" />
        <Card>
          <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-muted)' }}>
            This subscription could not be found. It may have been deleted.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <SubscriptionDetail
        subscription={subscription}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onBack={() => router.push('/subscriptions')}
      />
    </div>
  );
}
