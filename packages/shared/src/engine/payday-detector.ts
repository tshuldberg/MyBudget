/**
 * Payday detection engine.
 *
 * Analyzes transaction history to find recurring income patterns and predict
 * upcoming paydays. Powers the "Next Payday" countdown widget.
 *
 * All amounts in integer cents.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PaydayFrequency = 'weekly' | 'biweekly' | 'monthly' | 'semi_monthly';

export interface PaydayPattern {
  payee: string;
  frequency: PaydayFrequency;
  dayOfMonth?: number;
  dayOfWeek?: number;         // 0=Sun, 6=Sat
  daysOfMonth?: number[];     // e.g. [1, 15] for semi-monthly
  intervalDays?: number;      // e.g. 14 for biweekly
  averageAmount: number;      // cents
  confidence: number;         // 0-1
  lastOccurrence: string;     // YYYY-MM-DD
}

export interface PaydayPrediction {
  date: string;               // YYYY-MM-DD
  expectedAmount: number;     // cents
  daysUntil: number;
}

interface TransactionInput {
  date: string;
  payee: string;
  amount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizePayee(payee: string): string {
  return payee.trim().toLowerCase();
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function gapsDays(dates: string[]): number[] {
  const sorted = [...dates].sort();
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const d1 = parseLocalDate(sorted[i - 1]);
    const d2 = parseLocalDate(sorted[i]);
    gaps.push(Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
  }
  return gaps;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  return formatDate(date);
}

function diffDays(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const f = new Date(fy, fm - 1, fd);
  const t = new Date(ty, tm - 1, td);
  return Math.round((t.getTime() - f.getTime()) / (1000 * 60 * 60 * 24));
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Detect payday patterns from income transaction history.
 * Groups positive-amount transactions by payee and detects frequency patterns.
 */
export function detectPaydays(transactions: TransactionInput[]): PaydayPattern[] {
  const inflows = transactions.filter((t) => t.amount > 0);
  if (inflows.length === 0) return [];

  // Group by normalized payee
  const grouped = new Map<string, TransactionInput[]>();
  for (const tx of inflows) {
    const key = normalizePayee(tx.payee);
    const group = grouped.get(key) ?? [];
    group.push(tx);
    grouped.set(key, group);
  }

  const patterns: PaydayPattern[] = [];

  for (const [, txs] of grouped) {
    if (txs.length < 2) continue;

    const dates = txs.map((t) => t.date).sort();
    const amounts = txs.map((t) => t.amount);
    const gaps = gapsDays(dates);
    const avgGap = mean(gaps);
    const gapDev = stdDev(gaps);
    const avgAmount = Math.round(mean(amounts));
    const lastOccurrence = dates[dates.length - 1];
    const cv = avgGap > 0 ? gapDev / avgGap : 1;
    const confidence = Math.round(Math.max(0, Math.min(1, 1 - cv)) * 100) / 100;

    const daysOfMonth = dates.map((d) => parseInt(d.split('-')[2], 10));

    // Weekly: ~7 day gaps
    if (avgGap >= 5 && avgGap <= 9) {
      const dayOfWeek = parseLocalDate(lastOccurrence).getDay();
      patterns.push({
        payee: txs[0].payee,
        frequency: 'weekly',
        dayOfWeek,
        intervalDays: 7,
        averageAmount: avgAmount,
        confidence,
        lastOccurrence,
      });
      continue;
    }

    // For 12-17 day avg gaps, distinguish biweekly from semi-monthly.
    // Semi-monthly: same 2 days-of-month repeat (e.g. 1st & 15th every month).
    // Biweekly: 14-day interval, day-of-month drifts across months.
    const dayCounts = new Map<number, number>();
    for (const day of daysOfMonth) {
      dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
    }

    if (avgGap >= 12 && avgGap <= 17) {
      // Check if days-of-month cluster into exactly 2 repeating values.
      // For semi-monthly, most days should match one of 2 target days.
      const sortedDayCounts = [...dayCounts.entries()]
        .sort((a, b) => b[1] - a[1]);
      const topTwoDays = sortedDayCounts.slice(0, 2).map(([day]) => day).sort((a, b) => a - b);
      const topTwoCount = sortedDayCounts.slice(0, 2).reduce((s, [, c]) => s + c, 0);
      const isSemiMonthly = topTwoDays.length === 2
        && sortedDayCounts[0][1] >= 2  // each day appears at least twice
        && sortedDayCounts[1][1] >= 2
        && topTwoCount >= daysOfMonth.length * 0.8; // 80%+ of transactions hit these 2 days

      if (isSemiMonthly) {
        patterns.push({
          payee: txs[0].payee,
          frequency: 'semi_monthly',
          daysOfMonth: topTwoDays,
          averageAmount: avgAmount,
          confidence: Math.round(Math.max(0, Math.min(1, 1 - cv * 0.5)) * 100) / 100,
          lastOccurrence,
        });
      } else {
        const dayOfWeek = new Date(lastOccurrence + 'T12:00:00').getDay();
        patterns.push({
          payee: txs[0].payee,
          frequency: 'biweekly',
          dayOfWeek,
          intervalDays: 14,
          averageAmount: avgAmount,
          confidence,
          lastOccurrence,
        });
      }
      continue;
    }

    // Monthly: ~28-35 day gaps
    if (avgGap >= 25 && avgGap <= 35) {
      const mostCommonDay = [...dayCounts.entries()]
        .sort((a, b) => b[1] - a[1])[0][0];

      patterns.push({
        payee: txs[0].payee,
        frequency: 'monthly',
        dayOfMonth: mostCommonDay,
        averageAmount: avgAmount,
        confidence,
        lastOccurrence,
      });
      continue;
    }
  }

  return patterns;
}

/**
 * Predict the next payday based on a detected pattern.
 */
export function predictNextPayday(
  pattern: PaydayPattern,
  today: string,
): PaydayPrediction {
  let nextDate: string;

  switch (pattern.frequency) {
    case 'weekly':
    case 'biweekly': {
      const interval = pattern.intervalDays ?? (pattern.frequency === 'weekly' ? 7 : 14);
      nextDate = addDays(pattern.lastOccurrence, interval);
      // If predicted date is in the past, advance by interval(s)
      while (nextDate < today) {
        nextDate = addDays(nextDate, interval);
      }
      break;
    }

    case 'monthly': {
      const targetDay = pattern.dayOfMonth ?? 1;
      const [y, m] = today.split('-').map(Number);
      const todayDay = parseInt(today.split('-')[2], 10);

      // Try this month first
      const maxDay = daysInMonth(y, m);
      const clampedDay = Math.min(targetDay, maxDay);

      if (todayDay <= clampedDay) {
        nextDate = `${y}-${String(m).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
      } else {
        // Next month
        let nm = m + 1;
        let ny = y;
        if (nm > 12) { nm = 1; ny++; }
        const nextMaxDay = daysInMonth(ny, nm);
        const nextClampedDay = Math.min(targetDay, nextMaxDay);
        nextDate = `${ny}-${String(nm).padStart(2, '0')}-${String(nextClampedDay).padStart(2, '0')}`;
      }
      break;
    }

    case 'semi_monthly': {
      const days = pattern.daysOfMonth ?? [1, 15];
      const [y, m] = today.split('-').map(Number);
      const todayDay = parseInt(today.split('-')[2], 10);

      // Find next pay day
      let found = false;
      for (const day of days) {
        if (day >= todayDay) {
          nextDate = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          found = true;
          break;
        }
      }
      if (!found) {
        let nm = m + 1;
        let ny = y;
        if (nm > 12) { nm = 1; ny++; }
        nextDate = `${ny}-${String(nm).padStart(2, '0')}-${String(days[0]).padStart(2, '0')}`;
      }
      nextDate = nextDate!;
      break;
    }

    default:
      nextDate = addDays(today, 30); // fallback
  }

  return {
    date: nextDate,
    expectedAmount: pattern.averageAmount,
    daysUntil: Math.max(0, diffDays(today, nextDate)),
  };
}

/**
 * Generate a schedule of upcoming paydays within a date range.
 */
export function getPaydaySchedule(
  pattern: PaydayPattern,
  startDate: string,
  endDate: string,
): PaydayPrediction[] {
  const schedule: PaydayPrediction[] = [];

  switch (pattern.frequency) {
    case 'weekly':
    case 'biweekly': {
      const interval = pattern.intervalDays ?? (pattern.frequency === 'weekly' ? 7 : 14);
      // Start from lastOccurrence and advance
      let current = addDays(pattern.lastOccurrence, interval);
      // Go back if needed
      while (current > startDate) {
        const prev = addDays(current, -interval);
        if (prev < startDate) break;
        current = prev;
      }
      // If current is before start, advance
      while (current < startDate) {
        current = addDays(current, interval);
      }
      while (current <= endDate) {
        schedule.push({
          date: current,
          expectedAmount: pattern.averageAmount,
          daysUntil: Math.max(0, diffDays(startDate, current)),
        });
        current = addDays(current, interval);
      }
      break;
    }

    case 'monthly': {
      const targetDay = pattern.dayOfMonth ?? 1;
      const [sy, sm] = startDate.split('-').map(Number);
      const [ey, em] = endDate.split('-').map(Number);

      let y = sy;
      let m = sm;
      while (y < ey || (y === ey && m <= em)) {
        const maxDay = daysInMonth(y, m);
        const day = Math.min(targetDay, maxDay);
        const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (dateStr >= startDate && dateStr <= endDate) {
          schedule.push({
            date: dateStr,
            expectedAmount: pattern.averageAmount,
            daysUntil: Math.max(0, diffDays(startDate, dateStr)),
          });
        }
        m++;
        if (m > 12) { m = 1; y++; }
      }
      break;
    }

    case 'semi_monthly': {
      const days = pattern.daysOfMonth ?? [1, 15];
      const [sy, sm] = startDate.split('-').map(Number);
      const [ey, em] = endDate.split('-').map(Number);

      let y = sy;
      let m = sm;
      while (y < ey || (y === ey && m <= em)) {
        for (const day of days) {
          const maxDay = daysInMonth(y, m);
          const clampedDay = Math.min(day, maxDay);
          const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
          if (dateStr >= startDate && dateStr <= endDate) {
            schedule.push({
              date: dateStr,
              expectedAmount: pattern.averageAmount,
              daysUntil: Math.max(0, diffDays(startDate, dateStr)),
            });
          }
        }
        m++;
        if (m > 12) { m = 1; y++; }
      }
      break;
    }
  }

  return schedule;
}
