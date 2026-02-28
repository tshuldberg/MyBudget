'use server';

import { getDb } from './db';
import {
  createTransaction as _createTransaction,
  updateTransaction as _updateTransaction,
  deleteTransaction as _deleteTransaction,
  getTransactions as _getTransactions,
  getTransactionById as _getTransactionById,
} from '@mybudget/shared';
import type { TransactionInsert, TransactionWithSplits, TransactionFilters } from '@mybudget/shared';
import { randomUUID } from 'crypto';

export async function fetchTransactions(
  filters: TransactionFilters = {},
): Promise<TransactionWithSplits[]> {
  return _getTransactions(getDb(), filters);
}

export async function fetchTransactionById(id: string): Promise<TransactionWithSplits | null> {
  return _getTransactionById(getDb(), id);
}

export async function createTransaction(
  input: TransactionInsert,
  categoryId?: string | null,
): Promise<TransactionWithSplits> {
  const txId = randomUUID();
  const splits = [
    {
      id: randomUUID(),
      transaction_id: txId,
      category_id: categoryId ?? null,
      amount: input.amount,
      memo: null,
    },
  ];
  return _createTransaction(getDb(), txId, input, splits);
}

export async function updateTransaction(
  id: string,
  updates: Partial<Pick<TransactionInsert, 'date' | 'payee' | 'memo' | 'amount' | 'is_cleared' | 'account_id'>>,
  newCategoryId?: string | null,
): Promise<void> {
  const newSplits = newCategoryId !== undefined
    ? [{
        id: randomUUID(),
        transaction_id: id,
        category_id: newCategoryId,
        amount: updates.amount ?? (await fetchTransactionById(id))?.transaction.amount ?? 0,
        memo: null,
      }]
    : undefined;
  _updateTransaction(getDb(), id, updates, newSplits);
}

export async function deleteTransaction(id: string): Promise<void> {
  _deleteTransaction(getDb(), id);
}

export async function fetchRecentTransactions(limit = 10): Promise<TransactionWithSplits[]> {
  return _getTransactions(getDb(), { limit });
}
