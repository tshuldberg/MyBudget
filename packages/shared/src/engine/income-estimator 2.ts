/**
 * Income estimator engine.
 *
 * Analyzes transaction history to detect income patterns (salary, freelance,
 * irregular) and predict expected monthly income. Powers the "Expected Income"
 * widget on the Budget tab.
 *
 * All amounts in integer cents.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IncomeFrequency = 'weekly' | 'biweekly' | 'semi_monthly' | 'monthly' | 'irregular';
export type IncomePattern = 'salary' | 'freelance' | 'irregular';

export interface IncomeStream {
  payee: string;
  averageAmount: number;        // cents
  frequency: IncomeFrequency;
  occurrences: number;
  amountVariance: number;       // coefficient of variation (0-1)
  lastSeen: string;             // YYYY-MM-DD
}

export interface IncomeEstimate {
  totalMonthlyEstimate: number; // cents
  confidence: number;           // 0-1
  streams: IncomeStream[];
}

interface TransactionInput {
  date: string;
  payee: string;
  amount: number;
  accountId?: string;
  categoryId?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizePayee(payee: string): string {
  return payee.trim().toLowerCase();
}

function gapsDays(dates: string[]): number[] {
  const sorted = [...dates].sort();
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const d1 = new Date(sorted[i - 1]);
    const d2 = new Date(sorted[i]);
    gaps.push(Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
  }
  return gaps;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  if (avg === 0) return 0;
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance) / Math.abs(avg);
}

function detectFrequency(gaps: number[]): IncomeFrequency {
  if (gaps.length === 0) return 'irregular';
  const avg = mean(gaps);

  if (avg >= 5 && avg <= 9) return 'weekly';
  if (avg >= 12 && avg <= 17) return 'biweekly';
  if (avg >= 13 && avg <= 16) return 'semi_monthly';
  if (avg >= 25 && avg <= 35) return 'monthly';
  return 'irregular';
}

function toMonthlyAmount(frequency: IncomeFrequency, avgAmount: number): number {
  switch (frequency) {
    case 'weekly':
      return Math.round(avgAmount * (52 / 12));
    case 'biweekly':
      return Math.round(avgAmount * (26 / 12));
    case 'semi_monthly':
      return Math.round(avgAmount * 2);
    case 'monthly':
      return avgAmount;
    case 'irregular':
      return avgAmount;
  }
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Detect income streams from transaction history.
 * Groups positive-amount transactions by payee, calculates frequency and variance.
 * Only inflows (positive amounts) are considered. Requires at least 2 occurrences.
 */
export function detectIncomeStreams(transactions: TransactionInput[]): IncomeStream[] {
  // Filter to only positive amounts (inflows)
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

  const streams: IncomeStream[] = [];

  for (const [, txs] of grouped) {
    if (txs.length < 2) continue;

    const amounts = txs.map((t) => t.amount);
    const dates = txs.map((t) => t.date);
    const gaps = gapsDays(dates);
    const avgAmount = Math.round(mean(amounts));
    const variance = coefficientOfVariation(amounts);
    const frequency = detectFrequency(gaps);
    const sortedDates = [...dates].sort();
    const lastSeen = sortedDates[sortedDates.length - 1];

    streams.push({
      payee: txs[0].payee, // use original payee (not normalized)
      averageAmount: avgAmount,
      frequency,
      occurrences: txs.length,
      amountVariance: Math.round(variance * 100) / 100,
      lastSeen,
    });
  }

  // Sort by average amount descending
  streams.sort((a, b) => b.averageAmount - a.averageAmount);

  return streams;
}

/**
 * Classify an income stream pattern based on frequency and amount variance.
 * - "salary": consistent amount, regular frequency (weekly/biweekly/monthly/semi-monthly)
 * - "freelance": variable amount with somewhat regular frequency
 * - "irregular": irregular timing or very high variance
 */
export function classifyIncomePattern(stream: IncomeStream): IncomePattern {
  if (stream.frequency === 'irregular') return 'irregular';

  // High variance in amounts = freelance
  if (stream.amountVariance > 0.15) return 'freelance';

  // Regular frequency with consistent amounts = salary
  return 'salary';
}

/**
 * Estimate total monthly income from transaction history.
 * Detects income streams, converts to monthly estimates, and calculates confidence.
 */
export function estimateMonthlyIncome(transactions: TransactionInput[]): IncomeEstimate {
  const streams = detectIncomeStreams(transactions);

  if (streams.length === 0) {
    return {
      totalMonthlyEstimate: 0,
      confidence: 0,
      streams: [],
    };
  }

  let totalMonthly = 0;
  let weightedConfidence = 0;
  let totalWeight = 0;

  for (const stream of streams) {
    const monthly = toMonthlyAmount(stream.frequency, stream.averageAmount);
    totalMonthly += monthly;

    // Confidence factors:
    // 1. More occurrences = higher confidence (cap at 4 for faster ramp)
    const occurrenceFactor = Math.min(stream.occurrences / 4, 1);
    // 2. Lower variance = higher confidence
    const varianceFactor = Math.max(0, 1 - stream.amountVariance);
    // 3. Regular frequency = higher confidence
    const frequencyFactor = stream.frequency === 'irregular' ? 0.3 : 0.95;

    const streamConfidence = occurrenceFactor * varianceFactor * frequencyFactor;
    weightedConfidence += streamConfidence * monthly;
    totalWeight += monthly;
  }

  const confidence = totalWeight > 0
    ? Math.round((weightedConfidence / totalWeight) * 100) / 100
    : 0;

  return {
    totalMonthlyEstimate: totalMonthly,
    confidence,
    streams,
  };
}
