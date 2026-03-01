/**
 * Bank transaction sync pipeline.
 *
 * Reconciles raw bank transactions from a provider sync result with the local
 * database: inserting new transactions, updating modified ones, removing
 * deleted ones, and resolving pending-to-posted transitions.
 *
 * All amounts in integer cents.
 */

import type { BankTransactionRecord, BankSyncResult } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyncReconciliationResult {
  toInsert: BankTransactionRecord[];
  toUpdate: BankTransactionRecord[];
  toRemove: string[];   // provider transaction IDs
  insertedCount: number;
  updatedCount: number;
  removedCount: number;
}

export interface PendingResolution {
  pendingId: string;     // provider transaction ID of the pending txn
  postedId: string;      // provider transaction ID of the posted txn
  amountChanged: boolean;
  previousAmount?: number;
  newAmount?: number;
}

export interface BankToLocalMapping {
  date: string;
  payee: string;
  amount: number;
  accountId: string;
  memo: string | null;
  isCleared: boolean;
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Reconcile a bank sync result against locally known provider transaction IDs.
 * Determines which transactions to insert, update, or remove.
 */
export function reconcileTransactions(
  syncResult: BankSyncResult,
  existingProviderIds: Set<string>,
): SyncReconciliationResult {
  // New transactions: added items not already in local DB
  const toInsert = syncResult.added.filter(
    (txn) => !existingProviderIds.has(txn.providerTransactionId),
  );

  // Modified transactions: only update if we have them locally
  const toUpdate = syncResult.modified.filter(
    (txn) => existingProviderIds.has(txn.providerTransactionId),
  );

  // Removed: only remove IDs we actually have locally
  const toRemove = syncResult.removedProviderTransactionIds.filter(
    (id) => existingProviderIds.has(id),
  );

  return {
    toInsert,
    toUpdate,
    toRemove,
    insertedCount: toInsert.length,
    updatedCount: toUpdate.length,
    removedCount: toRemove.length,
  };
}

/**
 * Resolve pending transactions that have been posted.
 * Matches posted transactions to pending ones via pendingTransactionId.
 */
export function resolvePendingTransactions(
  pendingTxns: BankTransactionRecord[],
  postedTxns: BankTransactionRecord[],
): PendingResolution[] {
  const pendingById = new Map<string, BankTransactionRecord>();
  for (const txn of pendingTxns) {
    pendingById.set(txn.providerTransactionId, txn);
  }

  const resolutions: PendingResolution[] = [];

  for (const posted of postedTxns) {
    if (!posted.pendingTransactionId) continue;

    const pending = pendingById.get(posted.pendingTransactionId);
    if (!pending) continue;

    const amountChanged = pending.amount !== posted.amount;
    const resolution: PendingResolution = {
      pendingId: pending.providerTransactionId,
      postedId: posted.providerTransactionId,
      amountChanged,
    };

    if (amountChanged) {
      resolution.previousAmount = pending.amount;
      resolution.newAmount = posted.amount;
    }

    resolutions.push(resolution);
  }

  return resolutions;
}

/**
 * Map a bank transaction record to the local transaction shape.
 */
export function mapBankTransactionToLocal(
  bankTxn: BankTransactionRecord,
  localAccountId: string,
): BankToLocalMapping {
  const date = bankTxn.datePosted || bankTxn.dateAuthorized || new Date().toISOString().slice(0, 10);
  const payee = bankTxn.payee || 'Unknown Payee';

  return {
    date,
    payee,
    amount: bankTxn.amount,
    accountId: localAccountId,
    memo: bankTxn.memo,
    isCleared: !bankTxn.isPending,
  };
}
