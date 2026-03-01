/**
 * Debt payoff calculator engine for MyBudget.
 *
 * Supports two popular debt repayment strategies:
 * - Snowball: pay off smallest balance first (psychological wins)
 * - Avalanche: pay off highest interest rate first (mathematically optimal)
 *
 * Also generates amortization schedules and projects payoff dates.
 *
 * Interest rates stored as basis points (1800 = 18.00% APR).
 * All currency amounts in integer cents.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DebtInput {
  id: string;
  name: string;
  balance: number;          // cents (positive = amount owed)
  interestRate: number;     // basis points (1800 = 18.00% APR)
  minimumPayment: number;   // cents per month
  compounding: 'monthly' | 'daily';
}

export type PayoffStrategy = 'snowball' | 'avalanche';

export interface PayoffScheduleEntry {
  month: number;            // 1-indexed month number
  debtId: string;
  debtName: string;
  payment: number;          // cents paid this month
  principal: number;        // cents toward principal
  interest: number;         // cents of interest
  remainingBalance: number; // cents remaining after payment
}

export interface DebtPayoffResult {
  strategy: PayoffStrategy;
  schedule: PayoffScheduleEntry[];
  totalMonths: number;
  totalPaid: number;        // cents
  totalInterest: number;    // cents
  debtFreeDate: string | null; // YYYY-MM projected from today
}

export interface AmortizationEntry {
  month: number;
  payment: number;          // cents
  principal: number;        // cents
  interest: number;         // cents
  remainingBalance: number; // cents
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_MONTHS = 600; // 50 years safety cap

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate monthly interest for a debt.
 * Monthly compounding: balance * (APR / 12)
 * Daily compounding: balance * ((1 + APR/365)^30.4375 - 1)
 * Interest rate in basis points (1800 = 0.18).
 * Returns integer cents (rounded).
 */
function calculateMonthlyInterest(
  balance: number,
  interestRate: number,
  compounding: 'monthly' | 'daily',
): number {
  if (balance <= 0 || interestRate <= 0) return 0;

  const apr = interestRate / 10000; // basis points to decimal

  if (compounding === 'daily') {
    const dailyRate = apr / 365;
    const avgDaysPerMonth = 30.4375;
    const monthlyMultiplier = Math.pow(1 + dailyRate, avgDaysPerMonth) - 1;
    return Math.round(balance * monthlyMultiplier);
  }

  // Monthly compounding
  return Math.round(balance * (apr / 12));
}

function orderDebts(debts: DebtInput[], strategy: PayoffStrategy): DebtInput[] {
  const copy = [...debts];
  if (strategy === 'snowball') {
    copy.sort((a, b) => a.balance - b.balance || b.interestRate - a.interestRate);
  } else {
    copy.sort((a, b) => b.interestRate - a.interestRate || a.balance - b.balance);
  }
  return copy;
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Calculate debt payoff using the snowball method.
 * Debts are ordered by balance (lowest first). Extra payment goes to the
 * first unpaid debt in the sorted order.
 */
export function calculateSnowball(
  debts: DebtInput[],
  extraPayment: number,
): DebtPayoffResult {
  return calculatePayoff(debts, 'snowball', extraPayment);
}

/**
 * Calculate debt payoff using the avalanche method.
 * Debts are ordered by interest rate (highest first). Extra payment goes to
 * the first unpaid debt in the sorted order.
 */
export function calculateAvalanche(
  debts: DebtInput[],
  extraPayment: number,
): DebtPayoffResult {
  return calculatePayoff(debts, 'avalanche', extraPayment);
}

/**
 * Internal payoff calculation for both strategies.
 */
function calculatePayoff(
  debts: DebtInput[],
  strategy: PayoffStrategy,
  extraPayment: number,
): DebtPayoffResult {
  if (debts.length === 0) {
    return {
      strategy,
      schedule: [],
      totalMonths: 0,
      totalPaid: 0,
      totalInterest: 0,
      debtFreeDate: null,
    };
  }

  const ordered = orderDebts(debts, strategy);
  const balances = new Map<string, number>();
  for (const d of ordered) {
    balances.set(d.id, d.balance);
  }

  const schedule: PayoffScheduleEntry[] = [];
  let totalPaid = 0;
  let totalInterest = 0;
  let month = 0;

  while (month < MAX_MONTHS) {
    // Check if all debts are paid off
    let allPaid = true;
    for (const bal of balances.values()) {
      if (bal > 0) { allPaid = false; break; }
    }
    if (allPaid) break;

    month++;

    // Calculate interest for each debt
    const interestThisMonth = new Map<string, number>();
    for (const debt of ordered) {
      const bal = balances.get(debt.id)!;
      if (bal <= 0) continue;
      const interest = calculateMonthlyInterest(bal, debt.interestRate, debt.compounding);
      interestThisMonth.set(debt.id, interest);
      balances.set(debt.id, bal + interest);
      totalInterest += interest;
    }

    // Pay minimums first
    let extraAvailable = extraPayment;
    for (const debt of ordered) {
      const bal = balances.get(debt.id)!;
      if (bal <= 0) continue;

      const minPay = Math.min(debt.minimumPayment, bal);
      const interest = interestThisMonth.get(debt.id) ?? 0;
      const principal = Math.max(0, minPay - interest);
      const newBal = bal - minPay;
      balances.set(debt.id, newBal);
      totalPaid += minPay;

      // If debt was fully paid with less than minimum, reclaim the excess
      if (newBal <= 0) {
        const overpay = -newBal;
        balances.set(debt.id, 0);
        extraAvailable += overpay;
        totalPaid -= overpay;
      }

      schedule.push({
        month,
        debtId: debt.id,
        debtName: debt.name,
        payment: newBal < 0 ? minPay + newBal : minPay,
        principal: newBal < 0 ? principal + newBal : principal,
        interest,
        remainingBalance: Math.max(0, newBal),
      });
    }

    // Apply extra payment to the first unpaid debt in order
    for (const debt of ordered) {
      const bal = balances.get(debt.id)!;
      if (bal <= 0 || extraAvailable <= 0) continue;

      const extraPay = Math.min(extraAvailable, bal);
      const newBal = bal - extraPay;
      balances.set(debt.id, newBal);
      totalPaid += extraPay;
      extraAvailable -= extraPay;

      // Update the schedule entry for this debt this month
      const entry = schedule.find((e) => e.month === month && e.debtId === debt.id);
      if (entry) {
        entry.payment += extraPay;
        entry.principal += extraPay;
        entry.remainingBalance = Math.max(0, newBal);
      }

      if (newBal <= 0) {
        balances.set(debt.id, 0);
      }
    }
  }

  // Project debt-free date from today
  const now = new Date();
  let debtFreeDate: string | null = null;
  if (month > 0 && month < MAX_MONTHS) {
    const projected = new Date(now.getFullYear(), now.getMonth() + month, 1);
    debtFreeDate = `${projected.getFullYear()}-${String(projected.getMonth() + 1).padStart(2, '0')}`;
  }

  return {
    strategy,
    schedule,
    totalMonths: month,
    totalPaid,
    totalInterest,
    debtFreeDate,
  };
}

/**
 * Generate a month-by-month amortization schedule for a single debt.
 * Assumes fixed monthly payment equal to the minimum payment.
 */
export function generateAmortizationSchedule(debt: DebtInput): AmortizationEntry[] {
  if (debt.balance <= 0 || debt.minimumPayment <= 0) return [];

  const entries: AmortizationEntry[] = [];
  let balance = debt.balance;
  let month = 0;

  while (balance > 0 && month < MAX_MONTHS) {
    month++;

    const interest = calculateMonthlyInterest(balance, debt.interestRate, debt.compounding);
    balance += interest;

    const payment = Math.min(debt.minimumPayment, balance);
    const principal = payment - interest;
    balance -= payment;

    // Clamp to zero to avoid floating point drift
    if (balance < 0) balance = 0;

    entries.push({
      month,
      payment,
      principal: Math.max(0, principal),
      interest,
      remainingBalance: balance,
    });
  }

  return entries;
}

/**
 * Project when all debts will be fully paid off.
 * Returns the total months and projected YYYY-MM date.
 */
export function projectPayoffDate(
  debts: DebtInput[],
  strategy: PayoffStrategy,
  extraPayment: number,
): { totalMonths: number; debtFreeDate: string | null } {
  const result = calculatePayoff(debts, strategy, extraPayment);
  return {
    totalMonths: result.totalMonths,
    debtFreeDate: result.debtFreeDate,
  };
}
