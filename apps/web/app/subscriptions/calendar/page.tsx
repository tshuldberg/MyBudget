'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { RenewalCalendar } from '../../../components/subscriptions/RenewalCalendar';
import { fetchSubscriptions } from '../../actions/subscriptions';
import type { Subscription } from '@mybudget/shared';

export default function CalendarPage() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const subs = await fetchSubscriptions();
      setSubscriptions(subs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="fade-in">
      <PageHeader
        title="Renewal Calendar"
        subtitle="See when your subscriptions renew"
        actions={
          <Button variant="ghost" size="sm" onClick={() => router.push('/subscriptions')}>
            <ArrowLeft size={16} /> Back
          </Button>
        }
      />

      <Card>
        {loading ? (
          <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Loading calendar...
          </div>
        ) : (
          <RenewalCalendar subscriptions={subscriptions} />
        )}
      </Card>
    </div>
  );
}
