'use client';

import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { Badge } from '../ui/Badge';
import type { Subscription } from '@mybudget/shared';
import styles from './SubscriptionRow.module.css';

interface Props {
  subscription: Subscription;
  onClick: () => void;
}

const CYCLE_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
  custom: 'Custom',
};

const STATUS_VARIANT: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
  active: 'success',
  trial: 'info',
  paused: 'warning',
  cancelled: 'danger',
};

function daysUntilRenewal(nextRenewal: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const renewal = new Date(nextRenewal + 'T00:00:00');
  const diff = Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `in ${diff} days`;
}

export function SubscriptionRow({ subscription, onClick }: Props) {
  const { name, price, billing_cycle, next_renewal, status, icon } = subscription;

  return (
    <div className={styles.row} onClick={onClick} role="button" tabIndex={0}>
      <div className={styles.iconCell}>
        <span className={styles.icon}>{icon ?? '💳'}</span>
      </div>

      <div className={styles.info}>
        <span className={styles.name}>{name}</span>
        <span className={styles.cycle}>{CYCLE_LABELS[billing_cycle] ?? billing_cycle}</span>
      </div>

      <div className={styles.renewal}>
        <span className={styles.renewalDate}>{next_renewal}</span>
        <span className={styles.countdown}>{daysUntilRenewal(next_renewal)}</span>
      </div>

      <div className={styles.priceCell}>
        <CurrencyDisplay amount={price} />
      </div>

      <div className={styles.statusCell}>
        <Badge variant={STATUS_VARIANT[status] ?? 'default'}>{status}</Badge>
      </div>
    </div>
  );
}
