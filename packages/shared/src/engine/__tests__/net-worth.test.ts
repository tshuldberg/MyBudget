/**
 * Tests for net worth tracking engine.
 *
 * Validates net worth calculation from accounts, snapshot capture,
 * and timeline formatting for chart display.
 *
 * All amounts in integer cents.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateNetWorth,
  buildNetWorthTimeline,
  captureSnapshot,
  type AccountInput,
  type NetWorthSnapshot,
} from '../net-worth';

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

function account(overrides: Partial<AccountInput> & { id: string; name: string }): AccountInput {
  return {
    type: 'checking',
    balance: 0,
    isActive: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// calculateNetWorth
// ---------------------------------------------------------------------------

describe('calculateNetWorth', () => {
  it('calculates assets minus liabilities', () => {
    const accounts = [
      account({ id: 'a1', name: 'Checking', type: 'checking', balance: 500000 }),
      account({ id: 'a2', name: 'Savings', type: 'savings', balance: 1000000 }),
      account({ id: 'a3', name: 'Credit Card', type: 'credit_card', balance: 200000 }),
    ];

    const result = calculateNetWorth(accounts);
    expect(result.assets).toBe(1500000);     // $15,000
    expect(result.liabilities).toBe(200000); // $2,000
    expect(result.netWorth).toBe(1300000);   // $13,000
  });

  it('excludes inactive accounts', () => {
    const accounts = [
      account({ id: 'a1', name: 'Active Checking', type: 'checking', balance: 500000 }),
      account({ id: 'a2', name: 'Closed Savings', type: 'savings', balance: 300000, isActive: false }),
    ];

    const result = calculateNetWorth(accounts);
    expect(result.assets).toBe(500000);
    expect(result.accountBreakdown).toHaveLength(1);
  });

  it('handles all liability accounts (negative net worth)', () => {
    const accounts = [
      account({ id: 'a1', name: 'Credit Card 1', type: 'credit_card', balance: 500000 }),
      account({ id: 'a2', name: 'Credit Card 2', type: 'credit_card', balance: 300000 }),
    ];

    const result = calculateNetWorth(accounts);
    expect(result.assets).toBe(0);
    expect(result.liabilities).toBe(800000);
    expect(result.netWorth).toBe(-800000);
  });

  it('handles empty accounts list', () => {
    const result = calculateNetWorth([]);
    expect(result.assets).toBe(0);
    expect(result.liabilities).toBe(0);
    expect(result.netWorth).toBe(0);
    expect(result.accountBreakdown).toHaveLength(0);
  });

  it('treats cash accounts as assets', () => {
    const accounts = [
      account({ id: 'a1', name: 'Cash', type: 'cash', balance: 10000 }),
    ];

    const result = calculateNetWorth(accounts);
    expect(result.assets).toBe(10000);
    expect(result.accountBreakdown[0].isAsset).toBe(true);
  });

  it('provides account breakdown', () => {
    const accounts = [
      account({ id: 'a1', name: 'Checking', type: 'checking', balance: 100000 }),
      account({ id: 'a2', name: 'Visa', type: 'credit_card', balance: 50000 }),
    ];

    const result = calculateNetWorth(accounts);
    expect(result.accountBreakdown).toHaveLength(2);

    const checking = result.accountBreakdown.find((a) => a.accountId === 'a1')!;
    expect(checking.isAsset).toBe(true);
    expect(checking.balance).toBe(100000);

    const visa = result.accountBreakdown.find((a) => a.accountId === 'a2')!;
    expect(visa.isAsset).toBe(false);
    expect(visa.balance).toBe(50000);
  });
});

// ---------------------------------------------------------------------------
// buildNetWorthTimeline
// ---------------------------------------------------------------------------

describe('buildNetWorthTimeline', () => {
  it('sorts snapshots chronologically', () => {
    const snapshots: NetWorthSnapshot[] = [
      { id: 's3', month: '2026-03', assets: 160000, liabilities: 20000, netWorth: 140000, accountBalances: null, createdAt: '2026-03-01T00:00:00Z' },
      { id: 's1', month: '2026-01', assets: 140000, liabilities: 20000, netWorth: 120000, accountBalances: null, createdAt: '2026-01-01T00:00:00Z' },
      { id: 's2', month: '2026-02', assets: 150000, liabilities: 20000, netWorth: 130000, accountBalances: null, createdAt: '2026-02-01T00:00:00Z' },
    ];

    const timeline = buildNetWorthTimeline(snapshots);
    expect(timeline).toHaveLength(3);
    expect(timeline[0].month).toBe('2026-01');
    expect(timeline[1].month).toBe('2026-02');
    expect(timeline[2].month).toBe('2026-03');
  });

  it('returns correct data points', () => {
    const snapshots: NetWorthSnapshot[] = [
      { id: 's1', month: '2026-01', assets: 1000000, liabilities: 200000, netWorth: 800000, accountBalances: null, createdAt: '2026-01-01T00:00:00Z' },
    ];

    const timeline = buildNetWorthTimeline(snapshots);
    expect(timeline[0].assets).toBe(1000000);
    expect(timeline[0].liabilities).toBe(200000);
    expect(timeline[0].netWorth).toBe(800000);
  });

  it('returns empty for no snapshots', () => {
    expect(buildNetWorthTimeline([])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// captureSnapshot
// ---------------------------------------------------------------------------

describe('captureSnapshot', () => {
  it('creates a snapshot from current accounts', () => {
    const accounts = [
      account({ id: 'a1', name: 'Checking', type: 'checking', balance: 500000 }),
      account({ id: 'a2', name: 'Savings', type: 'savings', balance: 1000000 }),
      account({ id: 'a3', name: 'Visa', type: 'credit_card', balance: 200000 }),
    ];

    const snapshot = captureSnapshot({ accounts, month: '2026-02' });
    expect(snapshot.month).toBe('2026-02');
    expect(snapshot.assets).toBe(1500000);
    expect(snapshot.liabilities).toBe(200000);
    expect(snapshot.netWorth).toBe(1300000);
    expect(snapshot.accountBalances).not.toBeNull();

    const balances = JSON.parse(snapshot.accountBalances!);
    expect(balances).toHaveLength(3);
  });

  it('excludes inactive accounts from balances JSON', () => {
    const accounts = [
      account({ id: 'a1', name: 'Active', type: 'checking', balance: 500000 }),
      account({ id: 'a2', name: 'Closed', type: 'savings', balance: 300000, isActive: false }),
    ];

    const snapshot = captureSnapshot({ accounts, month: '2026-02' });
    const balances = JSON.parse(snapshot.accountBalances!);
    expect(balances).toHaveLength(1);
    expect(balances[0].id).toBe('a1');
  });

  it('handles zero net worth', () => {
    const snapshot = captureSnapshot({ accounts: [], month: '2026-02' });
    expect(snapshot.assets).toBe(0);
    expect(snapshot.liabilities).toBe(0);
    expect(snapshot.netWorth).toBe(0);
  });
});
