/**
 * Account transfer operations.
 * A transfer creates two linked transactions: outflow from source, inflow to destination.
 * Both reference each other via transfer_id. Transfers don't affect budget categories.
 */

import type { DatabaseAdapter } from './migrations';
import type { Transaction } from '../models/schemas';

export interface TransferPair {
  outflow: Transaction;
  inflow: Transaction;
}

/**
 * Create a transfer between two accounts.
 *
 * @param outflowId UUID for the outflow transaction
 * @param inflowId UUID for the inflow transaction
 * @param amount Positive number of cents to transfer
 */
export function createTransfer(
  db: DatabaseAdapter,
  outflowId: string,
  inflowId: string,
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  date: string,
  memo?: string,
): TransferPair {
  if (amount <= 0) throw new Error('Transfer amount must be positive');
  if (fromAccountId === toAccountId) throw new Error('Cannot transfer to the same account');

  const now = new Date().toISOString();
  const memoValue = memo ?? null;

  db.transaction(() => {
    // Outflow (negative amount)
    db.execute(
      `INSERT INTO transactions (id, account_id, date, payee, memo, amount, is_cleared, is_transfer, transfer_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?)`,
      [outflowId, fromAccountId, date, 'Transfer', memoValue, -amount, inflowId, now, now],
    );

    // Inflow (positive amount)
    db.execute(
      `INSERT INTO transactions (id, account_id, date, payee, memo, amount, is_cleared, is_transfer, transfer_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?)`,
      [inflowId, toAccountId, date, 'Transfer', memoValue, amount, outflowId, now, now],
    );
  });

  const outflow: Transaction = {
    id: outflowId,
    account_id: fromAccountId,
    date,
    payee: 'Transfer',
    memo: memoValue,
    amount: -amount,
    is_cleared: false,
    is_transfer: true,
    transfer_id: inflowId,
    created_at: now,
    updated_at: now,
  };

  const inflow: Transaction = {
    id: inflowId,
    account_id: toAccountId,
    date,
    payee: 'Transfer',
    memo: memoValue,
    amount,
    is_cleared: false,
    is_transfer: true,
    transfer_id: outflowId,
    created_at: now,
    updated_at: now,
  };

  return { outflow, inflow };
}

/**
 * Get both sides of a transfer given either transaction's ID.
 */
export function getTransferPair(
  db: DatabaseAdapter,
  transactionId: string,
): TransferPair | null {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM transactions WHERE id = ? AND is_transfer = 1`,
    [transactionId],
  );
  if (rows.length === 0) return null;

  const tx = rowToTransaction(rows[0]);
  if (!tx.transfer_id) return null;

  const pairRows = db.query<Record<string, unknown>>(
    `SELECT * FROM transactions WHERE id = ?`,
    [tx.transfer_id],
  );
  if (pairRows.length === 0) return null;

  const pair = rowToTransaction(pairRows[0]);

  if (tx.amount < 0) {
    return { outflow: tx, inflow: pair };
  }
  return { outflow: pair, inflow: tx };
}

function rowToTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    account_id: row.account_id as string,
    date: row.date as string,
    payee: row.payee as string,
    memo: (row.memo as string) ?? null,
    amount: row.amount as number,
    is_cleared: row.is_cleared === 1 || row.is_cleared === true,
    is_transfer: row.is_transfer === 1 || row.is_transfer === true,
    transfer_id: (row.transfer_id as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}
