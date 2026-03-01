/**
 * Net worth tracking engine for MyBudget.
 *
 * Calculates net worth from account balances (assets minus liabilities),
 * creates monthly snapshots, and formats timeline data for chart display.
 *
 * All amounts in integer cents.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AccountInput {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit_card' | 'cash';
  balance: number; // cents (positive for assets, positive for credit cards = amount owed)
  isActive: boolean;
}

export interface NetWorthResult {
  assets: number;       // cents
  liabilities: number;  // cents (positive number)
  netWorth: number;     // assets - liabilities (can be negative)
  accountBreakdown: Array<{
    accountId: string;
    accountName: string;
    type: string;
    balance: number;
    isAsset: boolean;
  }>;
}

export interface NetWorthSnapshot {
  id: string;
  month: string;          // YYYY-MM
  assets: number;         // cents
  liabilities: number;    // cents
  netWorth: number;       // cents
  accountBalances: string | null; // JSON string of per-account balances
  createdAt: string;
}

export interface NetWorthTimelinePoint {
  month: string;          // YYYY-MM
  assets: number;         // cents
  liabilities: number;    // cents
  netWorth: number;       // cents
}

export interface SnapshotInput {
  accounts: AccountInput[];
  month: string;          // YYYY-MM
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isAssetType(type: string): boolean {
  return type === 'checking' || type === 'savings' || type === 'cash';
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Calculate current net worth from a list of accounts.
 * Assets: checking, savings, cash (balance = what you have).
 * Liabilities: credit_card (balance = what you owe).
 * Only active accounts are included.
 */
export function calculateNetWorth(accounts: AccountInput[]): NetWorthResult {
  let assets = 0;
  let liabilities = 0;
  const breakdown: NetWorthResult['accountBreakdown'] = [];

  for (const account of accounts) {
    if (!account.isActive) continue;

    const isAsset = isAssetType(account.type);

    if (isAsset) {
      assets += account.balance;
    } else {
      liabilities += account.balance;
    }

    breakdown.push({
      accountId: account.id,
      accountName: account.name,
      type: account.type,
      balance: account.balance,
      isAsset,
    });
  }

  return {
    assets,
    liabilities,
    netWorth: assets - liabilities,
    accountBreakdown: breakdown,
  };
}

/**
 * Build a timeline of net worth data points from snapshots for chart display.
 * Snapshots are sorted chronologically.
 */
export function buildNetWorthTimeline(
  snapshots: NetWorthSnapshot[],
): NetWorthTimelinePoint[] {
  if (snapshots.length === 0) return [];

  const sorted = [...snapshots].sort((a, b) => a.month.localeCompare(b.month));

  return sorted.map((s) => ({
    month: s.month,
    assets: s.assets,
    liabilities: s.liabilities,
    netWorth: s.netWorth,
  }));
}

/**
 * Create a snapshot record from current account balances for a given month.
 * Returns the data needed to persist a snapshot (caller handles DB insert).
 */
export function captureSnapshot(
  input: SnapshotInput,
): Omit<NetWorthSnapshot, 'id' | 'createdAt'> {
  const result = calculateNetWorth(input.accounts);

  const accountBalances = input.accounts
    .filter((a) => a.isActive)
    .map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      balance: a.balance,
    }));

  return {
    month: input.month,
    assets: result.assets,
    liabilities: result.liabilities,
    netWorth: result.netWorth,
    accountBalances: JSON.stringify(accountBalances),
  };
}
