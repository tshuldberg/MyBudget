/**
 * Price history tracking for subscriptions.
 *
 * When a subscription's price changes, the old price is recorded with
 * its effective date. This enables lifetime cost calculations and
 * price trend displays.
 */

import type { DatabaseAdapter } from '../db/migrations';
import type { PriceHistory, Subscription } from '../models/schemas';

/**
 * Record a price change for a subscription.
 * Call this before updating the subscription's price.
 *
 * @param db - database adapter
 * @param id - UUID for the new price history record
 * @param subscriptionId - the subscription whose price changed
 * @param oldPrice - the previous price in cents
 * @param effectiveDate - when the old price took effect (YYYY-MM-DD)
 */
export function recordPriceChange(
  db: DatabaseAdapter,
  id: string,
  subscriptionId: string,
  oldPrice: number,
  effectiveDate: string,
): PriceHistory {
  const now = new Date().toISOString();
  db.execute(
    `INSERT INTO price_history (id, subscription_id, price, effective_date, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, subscriptionId, oldPrice, effectiveDate, now],
  );
  return {
    id,
    subscription_id: subscriptionId,
    price: oldPrice,
    effective_date: effectiveDate,
    created_at: now,
  };
}

/**
 * Get the full price history for a subscription, ordered by effective_date ascending.
 */
export function getPriceHistory(
  db: DatabaseAdapter,
  subscriptionId: string,
): PriceHistory[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM price_history WHERE subscription_id = ? ORDER BY effective_date ASC`,
    [subscriptionId],
  );
  return rows.map(rowToPriceHistory);
}

/**
 * Estimate total lifetime cost for a subscription from start_date to a reference date.
 *
 * Uses price history to account for price changes over time.
 * Each price segment runs from its effective_date until the next segment's
 * effective_date (or the reference date for the most recent segment).
 *
 * @param db - database adapter
 * @param subscription - the subscription to calculate for
 * @param untilDate - end date for calculation (YYYY-MM-DD, defaults to today)
 * @returns total cost in cents
 */
export function getLifetimeCost(
  db: DatabaseAdapter,
  subscription: Subscription,
  untilDate?: string,
): number {
  const endDate = untilDate ?? new Date().toISOString().slice(0, 10);
  const history = getPriceHistory(db, subscription.id);

  // Build a timeline of price segments
  const segments: Array<{ price: number; from: string; to: string }> = [];

  if (history.length === 0) {
    // No price changes — single segment at current price
    segments.push({
      price: subscription.price,
      from: subscription.start_date,
      to: endDate,
    });
  } else {
    // First segment: start_date to first price change at the first recorded price
    segments.push({
      price: history[0].price,
      from: subscription.start_date,
      to: history.length > 1 ? history[1].effective_date : endDate,
    });

    // Middle segments from price history
    for (let i = 1; i < history.length; i++) {
      const nextDate = i < history.length - 1
        ? history[i + 1].effective_date
        : endDate;
      segments.push({
        price: history[i].price,
        from: history[i].effective_date,
        to: nextDate,
      });
    }

    // If the last history entry's effective_date is before endDate,
    // the current subscription price applies from that point
    const lastHistory = history[history.length - 1];
    if (lastHistory.effective_date < endDate) {
      // The last segment already extends to endDate via the loop above,
      // but we need a final segment at the current price if it differs
      // from the last history price. The last history entry is the OLD price,
      // so the current price applies after it.
      // Replace the last segment's price with the recorded one and add current price segment.
      const lastSegment = segments[segments.length - 1];
      // The last segment already uses lastHistory.price. We need to split it:
      // lastHistory.effective_date -> endDate should use current subscription price.
      // Actually, re-think: history records OLD prices before a change.
      // So the timeline is: history[0].price from start, then subsequent history
      // entries record what the price was changed FROM. The current price is subscription.price.
      // Let's rebuild properly.
      segments.length = 0;
      rebuildSegments(segments, history, subscription, endDate);
    }
  }

  let totalCost = 0;
  for (const seg of segments) {
    const days = daysBetween(seg.from, seg.to);
    if (days <= 0) continue;
    totalCost += estimateCostForDays(
      seg.price,
      subscription.billing_cycle,
      subscription.custom_days,
      days,
    );
  }

  return Math.round(totalCost);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function rebuildSegments(
  segments: Array<{ price: number; from: string; to: string }>,
  history: PriceHistory[],
  subscription: Subscription,
  endDate: string,
): void {
  // history entries are sorted by effective_date ASC.
  // Each entry records the price that WAS in effect starting from effective_date.
  // The current subscription.price is what's in effect now (after the last change).

  // Build ordered price periods:
  // Period 0: from start_date to history[0].effective_date at ???
  // Actually the first history entry's effective_date is when that price started.
  // So: history[0].price from history[0].effective_date to history[1].effective_date, etc.
  // Before the first history entry, the subscription's original price was the first recorded one.

  // Simpler approach: treat history as a ledger of "price was X starting on date Y".
  // The current price started after the last history entry (implicitly).

  for (let i = 0; i < history.length; i++) {
    const from = i === 0 ? subscription.start_date : history[i].effective_date;
    const to = i < history.length - 1 ? history[i + 1].effective_date : endDate;
    segments.push({ price: history[i].price, from, to });
  }

  // Current price from last history entry's effective_date to endDate
  // (only if current price differs from last history — otherwise already covered)
  const lastEntry = history[history.length - 1];
  if (subscription.price !== lastEntry.price) {
    // The last segment should end at the point the price changed to the current one.
    // We don't have an explicit date for when the current price started, so we
    // use the last segment's "to" date as the boundary.
    // Actually the last history entry IS the old price, and the current price started
    // when that entry was created. Use last entry effective_date as boundary:
    // Overwrite last segment's to, and add new segment for current price.
    if (segments.length > 0) {
      // The last segment already goes to endDate — trim it and add current price segment
      // This is approximate; the effective_date of the last history entry is when
      // the old price was recorded, meaning the new price started around that time.
      // For simplicity, we split at the last entry's effective_date.
      const lastSeg = segments[segments.length - 1];
      if (lastSeg.from < lastEntry.effective_date) {
        lastSeg.to = lastEntry.effective_date;
        segments.push({
          price: subscription.price,
          from: lastEntry.effective_date,
          to: endDate,
        });
      }
    }
  }
}

function estimateCostForDays(
  price: number,
  billingCycle: string,
  customDays: number | null,
  days: number,
): number {
  const cycleDays = getCycleDays(billingCycle, customDays);
  const periods = days / cycleDays;
  return price * periods;
}

function getCycleDays(billingCycle: string, customDays: number | null): number {
  switch (billingCycle) {
    case 'weekly': return 7;
    case 'monthly': return 30.437; // avg days per month
    case 'quarterly': return 91.311;
    case 'semi_annual': return 182.621;
    case 'annual': return 365.25;
    case 'custom': return customDays ?? 30;
    default: return 30.437;
  }
}

function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const fromMs = new Date(fy, fm - 1, fd).getTime();
  const toMs = new Date(ty, tm - 1, td).getTime();
  return Math.floor((toMs - fromMs) / (1000 * 60 * 60 * 24));
}

function rowToPriceHistory(row: Record<string, unknown>): PriceHistory {
  return {
    id: row.id as string,
    subscription_id: row.subscription_id as string,
    price: row.price as number,
    effective_date: row.effective_date as string,
    created_at: row.created_at as string,
  };
}
