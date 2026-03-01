'use client';

import { DollarSign, Calendar, TrendingUp, Hash } from 'lucide-react';
import { Card } from '../ui/Card';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import styles from './SubscriptionCostCard.module.css';

interface Props {
  monthlyTotal: number;
  annualTotal: number;
  activeCount: number;
}

export function SubscriptionCostCard({ monthlyTotal, annualTotal, activeCount }: Props) {
  const dailyAverage = Math.round(annualTotal / 365);

  return (
    <div className={styles.grid}>
      <Card className={styles.card}>
        <div className={styles.iconWrap}>
          <DollarSign size={18} />
        </div>
        <div className={styles.label}>Monthly Total</div>
        <div className={styles.value}>
          <CurrencyDisplay amount={monthlyTotal} />
        </div>
      </Card>

      <Card className={styles.card}>
        <div className={styles.iconWrap}>
          <Calendar size={18} />
        </div>
        <div className={styles.label}>Annual Total</div>
        <div className={styles.value}>
          <CurrencyDisplay amount={annualTotal} />
        </div>
      </Card>

      <Card className={styles.card}>
        <div className={styles.iconWrap}>
          <TrendingUp size={18} />
        </div>
        <div className={styles.label}>Daily Average</div>
        <div className={styles.value}>
          <CurrencyDisplay amount={dailyAverage} />
        </div>
      </Card>

      <Card className={styles.card}>
        <div className={styles.iconWrap}>
          <Hash size={18} />
        </div>
        <div className={styles.label}>Active</div>
        <div className={styles.count}>{activeCount}</div>
      </Card>
    </div>
  );
}
