'use client';

import type { Subscription } from '@mybudget/shared';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import styles from './UpcomingStrip.module.css';

interface Props {
  renewals: Subscription[];
  onSeeAll: () => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isSameDay(dateStr: string, target: Date): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  return y === target.getFullYear() && m === target.getMonth() + 1 && d === target.getDate();
}

export function UpcomingStrip({ renewals, onSeeAll }: Props) {
  const today = new Date();
  const days: Array<{
    date: Date;
    dayName: string;
    dayNum: number;
    isToday: boolean;
    items: Subscription[];
    total: number;
  }> = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const dayItems = renewals.filter((r) => isSameDay(r.next_renewal, date));
    const total = dayItems.reduce((sum, r) => sum + r.price, 0);
    days.push({
      date,
      dayName: i === 0 ? 'Today' : DAY_NAMES[date.getDay()],
      dayNum: date.getDate(),
      isToday: i === 0,
      items: dayItems,
      total,
    });
  }

  const totalDue = renewals.reduce((sum, r) => sum + r.price, 0);
  const chargeCount = renewals.length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.title}>Upcoming</span>
          {chargeCount > 0 && (
            <span className={styles.subtitle}>
              {chargeCount} recurring charge{chargeCount !== 1 ? 's' : ''} due within 7 days for{' '}
              <CurrencyDisplay amount={totalDue} />
            </span>
          )}
        </div>
      </div>

      <div className={styles.strip}>
        {days.map((day, i) => (
          <div
            key={i}
            className={`${styles.dayCell} ${day.isToday ? styles.today : ''} ${day.items.length > 0 ? styles.hasItems : ''}`}
          >
            <span className={styles.dayName}>{day.dayName}</span>
            <span className={styles.dayNum}>{day.dayNum}</span>
            {day.items.length > 0 && (
              <div className={styles.dayIcons}>
                {day.items.slice(0, 3).map((item) => (
                  <span key={item.id} className={styles.icon} title={item.name}>
                    {item.icon ?? '💳'}
                  </span>
                ))}
                {day.items.length > 3 && (
                  <span className={styles.moreCount}>+{day.items.length - 3}</span>
                )}
              </div>
            )}
            {day.total > 0 && (
              <span className={styles.dayTotal}>
                <CurrencyDisplay amount={day.total} />
              </span>
            )}
          </div>
        ))}
      </div>

      <button className={styles.seeAll} onClick={onSeeAll}>
        See All Upcoming
      </button>
    </div>
  );
}
