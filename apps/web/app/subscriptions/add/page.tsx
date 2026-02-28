'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { AddSubscriptionForm } from '../../../components/subscriptions/AddSubscriptionForm';
import { createSubscription } from '../../actions/subscriptions';

export default function AddSubscriptionPage() {
  const router = useRouter();

  async function handleSubmit(data: {
    name: string;
    price: number;
    billing_cycle: string;
    status: string;
    start_date: string;
    next_renewal: string;
    icon?: string | null;
    url?: string | null;
    notes?: string | null;
    catalog_id?: string | null;
  }) {
    await createSubscription(data);
    router.push('/subscriptions');
  }

  return (
    <div className="fade-in">
      <PageHeader
        title="Add Subscription"
        actions={
          <Button variant="ghost" size="sm" onClick={() => router.push('/subscriptions')}>
            <ArrowLeft size={16} /> Back
          </Button>
        }
      />

      <Card>
        <AddSubscriptionForm
          onSubmit={handleSubmit}
          onCancel={() => router.push('/subscriptions')}
        />
      </Card>
    </div>
  );
}
