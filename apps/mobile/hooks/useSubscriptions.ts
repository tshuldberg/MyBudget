import { useMemo } from 'react';
import { useDatabase } from '../lib/DatabaseProvider';
import {
  getSubscriptions,
  getSubscriptionById,
  createSubscription,
  pauseSubscription,
  cancelSubscription,
  resumeSubscription,
  getPriceHistory,
  calculateSubscriptionSummary,
  calculateNextRenewal,
} from '@mybudget/shared';
import type {
  Subscription,
  SubscriptionInsert,
  SubscriptionSummary,
  PriceHistory,
  SubscriptionFilter,
} from '@mybudget/shared';
import { uuid } from '../lib/uuid';

export function useSubscriptions(filters?: SubscriptionFilter) {
  const { db, version, invalidate } = useDatabase();

  const subscriptions = useMemo(
    () => getSubscriptions(db, filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, version, JSON.stringify(filters)],
  );

  const summary: SubscriptionSummary = useMemo(
    () => calculateSubscriptionSummary(subscriptions),
    [subscriptions],
  );

  return {
    subscriptions,
    summary,
    createSubscription: (input: SubscriptionInsert): Subscription => {
      const result = createSubscription(db, uuid(), input);
      invalidate();
      return result;
    },
    pause: (id: string) => {
      pauseSubscription(db, id);
      invalidate();
    },
    cancel: (id: string) => {
      cancelSubscription(db, id);
      invalidate();
    },
    resume: (id: string) => {
      resumeSubscription(db, id);
      invalidate();
    },
  };
}

export function useSubscriptionDetail(id: string | undefined) {
  const { db, version } = useDatabase();

  const subscription = useMemo(
    () => (id ? getSubscriptionById(db, id) : null),
    [db, id, version],
  );

  const priceHistory = useMemo(
    () => (id ? getPriceHistory(db, id) : []),
    [db, id, version],
  );

  return { subscription, priceHistory };
}
