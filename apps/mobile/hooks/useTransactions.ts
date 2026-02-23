import { useMemo } from 'react';
import { useDatabase } from '../lib/DatabaseProvider';
import {
  getTransactions,
  createTransaction,
  deleteTransaction,
  updatePayeeCache,
} from '@mybudget/shared';
import type {
  TransactionInsert,
  TransactionSplitInsert,
  TransactionFilters,
  TransactionWithSplits,
} from '@mybudget/shared';
import { uuid } from '../lib/uuid';

export function useTransactions(filters?: TransactionFilters) {
  const { db, version, invalidate } = useDatabase();

  const transactions = useMemo(
    () => getTransactions(db, filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, version, JSON.stringify(filters)],
  );

  return {
    transactions,
    createTransaction: (
      input: TransactionInsert,
      categoryId: string | null,
    ): TransactionWithSplits => {
      const txId = uuid();
      const splits = categoryId
        ? [{ id: uuid(), transaction_id: txId, category_id: categoryId, amount: input.amount }]
        : [];
      const result = createTransaction(db, txId, input, splits);
      // Update payee autocomplete cache
      if (input.payee) {
        updatePayeeCache(db, input.payee, categoryId);
      }
      invalidate();
      return result;
    },
    deleteTransaction: (id: string) => {
      deleteTransaction(db, id);
      invalidate();
    },
  };
}
