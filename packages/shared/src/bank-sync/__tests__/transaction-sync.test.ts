/**
 * TDD tests for the bank transaction sync pipeline.
 *
 * The sync pipeline takes raw bank transactions from a provider sync result
 * and reconciles them with the local SQLite database: inserting new
 * transactions, updating modified ones, removing deleted ones, resolving
 * pending-to-posted transitions, and triggering auto-categorization.
 *
 * All amounts in integer cents.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  reconcileTransactions,
  resolvePendingTransactions,
  mapBankTransactionToLocal,
  type SyncReconciliationResult,
  type BankToLocalMapping,
} from '../transaction-sync';
import type { BankTransactionRecord, BankSyncResult } from '../types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeBankTxn(overrides: Partial<BankTransactionRecord> = {}): BankTransactionRecord {
  return {
    id: `btxn-${Math.random().toString(36).slice(2, 8)}`,
    connectionId: 'conn-1',
    bankAccountId: 'bacct-1',
    providerTransactionId: `ptxn-${Math.random().toString(36).slice(2, 8)}`,
    pendingTransactionId: null,
    datePosted: '2026-02-15',
    dateAuthorized: null,
    payee: 'Test Payee',
    memo: null,
    amount: -5000,
    currency: 'USD',
    category: null,
    isPending: false,
    rawJson: null,
    ...overrides,
  };
}

function makeSyncResult(overrides: Partial<BankSyncResult> = {}): BankSyncResult {
  return {
    added: [],
    modified: [],
    removedProviderTransactionIds: [],
    nextCursor: 'cursor-1',
    hasMore: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// reconcileTransactions
// ---------------------------------------------------------------------------

describe('reconcileTransactions', () => {
  it('inserts new transactions from sync result', () => {
    const added = [
      makeBankTxn({ providerTransactionId: 'ptxn-1', payee: 'Coffee', amount: -450 }),
      makeBankTxn({ providerTransactionId: 'ptxn-2', payee: 'Lunch', amount: -1200 }),
    ];

    const syncResult = makeSyncResult({ added });
    const existingProviderIds = new Set<string>();

    const result = reconcileTransactions(syncResult, existingProviderIds);

    expect(result.toInsert).toHaveLength(2);
    expect(result.toUpdate).toHaveLength(0);
    expect(result.toRemove).toHaveLength(0);
  });

  it('skips already-existing transactions', () => {
    const added = [
      makeBankTxn({ providerTransactionId: 'ptxn-1', payee: 'Coffee', amount: -450 }),
      makeBankTxn({ providerTransactionId: 'ptxn-2', payee: 'Lunch', amount: -1200 }),
    ];

    const syncResult = makeSyncResult({ added });
    const existingProviderIds = new Set(['ptxn-1']); // already synced

    const result = reconcileTransactions(syncResult, existingProviderIds);

    expect(result.toInsert).toHaveLength(1);
    expect(result.toInsert[0].providerTransactionId).toBe('ptxn-2');
  });

  it('queues modified transactions for update', () => {
    const modified = [
      makeBankTxn({ providerTransactionId: 'ptxn-1', payee: 'Updated Payee', amount: -500 }),
    ];

    const syncResult = makeSyncResult({ modified });
    const existingProviderIds = new Set(['ptxn-1']);

    const result = reconcileTransactions(syncResult, existingProviderIds);

    expect(result.toUpdate).toHaveLength(1);
    expect(result.toUpdate[0].providerTransactionId).toBe('ptxn-1');
  });

  it('queues removed transaction IDs for deletion', () => {
    const syncResult = makeSyncResult({
      removedProviderTransactionIds: ['ptxn-1', 'ptxn-3'],
    });
    const existingProviderIds = new Set(['ptxn-1', 'ptxn-2', 'ptxn-3']);

    const result = reconcileTransactions(syncResult, existingProviderIds);

    expect(result.toRemove).toEqual(['ptxn-1', 'ptxn-3']);
  });

  it('ignores removal of non-existing transaction IDs', () => {
    const syncResult = makeSyncResult({
      removedProviderTransactionIds: ['ptxn-99'], // doesn't exist locally
    });
    const existingProviderIds = new Set<string>();

    const result = reconcileTransactions(syncResult, existingProviderIds);

    expect(result.toRemove).toHaveLength(0);
  });

  it('handles all three operations in a single sync', () => {
    const added = [makeBankTxn({ providerTransactionId: 'ptxn-new' })];
    const modified = [makeBankTxn({ providerTransactionId: 'ptxn-mod' })];

    const syncResult = makeSyncResult({
      added,
      modified,
      removedProviderTransactionIds: ['ptxn-del'],
    });
    const existingProviderIds = new Set(['ptxn-mod', 'ptxn-del']);

    const result = reconcileTransactions(syncResult, existingProviderIds);

    expect(result.toInsert).toHaveLength(1);
    expect(result.toUpdate).toHaveLength(1);
    expect(result.toRemove).toHaveLength(1);
  });

  it('returns summary counts', () => {
    const added = [
      makeBankTxn({ providerTransactionId: 'ptxn-1' }),
      makeBankTxn({ providerTransactionId: 'ptxn-2' }),
    ];

    const syncResult = makeSyncResult({ added });
    const result = reconcileTransactions(syncResult, new Set());

    expect(result.insertedCount).toBe(2);
    expect(result.updatedCount).toBe(0);
    expect(result.removedCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// resolvePendingTransactions
// ---------------------------------------------------------------------------

describe('resolvePendingTransactions', () => {
  it('matches pending to posted by pending_transaction_id', () => {
    const pendingTxns = [
      makeBankTxn({
        providerTransactionId: 'ptxn-pending-1',
        isPending: true,
        payee: 'Coffee Shop',
        amount: -450,
      }),
    ];

    const postedTxns = [
      makeBankTxn({
        providerTransactionId: 'ptxn-posted-1',
        pendingTransactionId: 'ptxn-pending-1',
        isPending: false,
        payee: 'Coffee Shop',
        amount: -450,
      }),
    ];

    const resolved = resolvePendingTransactions(pendingTxns, postedTxns);

    expect(resolved).toHaveLength(1);
    expect(resolved[0].pendingId).toBe('ptxn-pending-1');
    expect(resolved[0].postedId).toBe('ptxn-posted-1');
    expect(resolved[0].amountChanged).toBe(false);
  });

  it('flags amount changes between pending and posted', () => {
    const pendingTxns = [
      makeBankTxn({
        providerTransactionId: 'ptxn-pending-1',
        isPending: true,
        amount: -1500, // authorized for $15
      }),
    ];

    const postedTxns = [
      makeBankTxn({
        providerTransactionId: 'ptxn-posted-1',
        pendingTransactionId: 'ptxn-pending-1',
        isPending: false,
        amount: -1800, // posted for $18 (tip added)
      }),
    ];

    const resolved = resolvePendingTransactions(pendingTxns, postedTxns);

    expect(resolved).toHaveLength(1);
    expect(resolved[0].amountChanged).toBe(true);
    expect(resolved[0].previousAmount).toBe(-1500);
    expect(resolved[0].newAmount).toBe(-1800);
  });

  it('returns empty when no pending transactions match', () => {
    const pendingTxns = [
      makeBankTxn({ providerTransactionId: 'ptxn-pending-1', isPending: true }),
    ];
    const postedTxns = [
      makeBankTxn({ providerTransactionId: 'ptxn-posted-unrelated', isPending: false }),
    ];

    const resolved = resolvePendingTransactions(pendingTxns, postedTxns);
    expect(resolved).toHaveLength(0);
  });

  it('handles multiple pending-to-posted resolutions', () => {
    const pendingTxns = [
      makeBankTxn({ providerTransactionId: 'ptxn-p1', isPending: true }),
      makeBankTxn({ providerTransactionId: 'ptxn-p2', isPending: true }),
    ];

    const postedTxns = [
      makeBankTxn({
        providerTransactionId: 'ptxn-posted-1',
        pendingTransactionId: 'ptxn-p1',
        isPending: false,
      }),
      makeBankTxn({
        providerTransactionId: 'ptxn-posted-2',
        pendingTransactionId: 'ptxn-p2',
        isPending: false,
      }),
    ];

    const resolved = resolvePendingTransactions(pendingTxns, postedTxns);
    expect(resolved).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// mapBankTransactionToLocal
// ---------------------------------------------------------------------------

describe('mapBankTransactionToLocal', () => {
  it('maps bank transaction fields to local transaction shape', () => {
    const bankTxn = makeBankTxn({
      datePosted: '2026-02-15',
      payee: 'Starbucks',
      amount: -450,
    });
    const localAccountId = 'local-acct-1';

    const mapped = mapBankTransactionToLocal(bankTxn, localAccountId);

    expect(mapped.date).toBe('2026-02-15');
    expect(mapped.payee).toBe('Starbucks');
    expect(mapped.amount).toBe(-450);
    expect(mapped.accountId).toBe('local-acct-1');
    expect(mapped.isCleared).toBe(true); // posted transaction
  });

  it('maps pending transactions as uncleared', () => {
    const bankTxn = makeBankTxn({ isPending: true });
    const mapped = mapBankTransactionToLocal(bankTxn, 'local-acct-1');

    expect(mapped.isCleared).toBe(false);
  });

  it('uses dateAuthorized when datePosted is missing', () => {
    const bankTxn = makeBankTxn({
      datePosted: '',
      dateAuthorized: '2026-02-14',
    });

    const mapped = mapBankTransactionToLocal(bankTxn, 'local-acct-1');
    expect(mapped.date).toBe('2026-02-14');
  });

  it('preserves memo from bank transaction', () => {
    const bankTxn = makeBankTxn({ memo: 'POS Purchase' });
    const mapped = mapBankTransactionToLocal(bankTxn, 'local-acct-1');

    expect(mapped.memo).toBe('POS Purchase');
  });

  it('handles null payee gracefully', () => {
    const bankTxn = makeBankTxn({ payee: null });
    const mapped = mapBankTransactionToLocal(bankTxn, 'local-acct-1');

    // Should default to a sensible fallback
    expect(mapped.payee).toBeTruthy();
  });
});
