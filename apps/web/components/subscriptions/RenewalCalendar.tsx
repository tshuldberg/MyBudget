'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Subscription } from '@mybudget/shared';
import styles from './RenewalCalendar.module.css';

interface Props {
  subscriptions: Subscription[];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function RenewalCalendar({ subscriptions }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const renewalMap = useMemo(() => {
    const map = new Map<string, Subscription[]>();
    for (const sub of subscriptions) {
      if (sub.status !== 'active' && sub.status !== 'trial') continue;
      const key = sub.next_renewal;
      const existing = map.get(key) ?? [];
      existing.push(sub);
      map.set(key, existing);
    }
    return map;
  }, [subscriptions]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }

  function getDateKey(day: number): string {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  const blanks = Array.from({ length: firstDayOfWeek }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <button className={styles.navBtn} onClick={prevMonth} aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <span className={styles.monthLabel}>
          {MONTH_NAMES[month]} {year}
        </span>
        <button className={styles.navBtn} onClick={nextMonth} aria-label="Next month">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className={styles.weekdays}>
        {WEEKDAYS.map((d) => (
          <div key={d} className={styles.weekday}>{d}</div>
        ))}
      </div>

      <div className={styles.grid}>
        {blanks.map((i) => (
          <div key={`blank-${i}`} className={styles.cell} />
        ))}

        {days.map((day) => {
          const dateKey = getDateKey(day);
          const renewals = renewalMap.get(dateKey) ?? [];
          const hasRenewals = renewals.length > 0;
          const isToday = day === todayDate && month === todayMonth && year === todayYear;

          return (
            <div
              key={day}
              className={`${styles.cell} ${isToday ? styles.today : ''} ${hasRenewals ? styles.hasRenewal : ''}`}
              onMouseEnter={() => hasRenewals && setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <span className={styles.dayNumber}>{day}</span>
              {hasRenewals && <span className={styles.dot} />}

              {hoveredDay === day && hasRenewals && (
                <div className={styles.tooltip}>
                  {renewals.map((r) => (
                    <div key={r.id} className={styles.tooltipRow}>
                      <span>{r.icon ?? '💳'} {r.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
