/**
 * Transaction CRUD operations with split transaction support.
 * Each transaction has one or more splits assigning portions to categories.
 * Split amounts must sum to the transaction amount.
 */

import type { DatabaseAdapter } from './migrations';
import type {
  Transaction,
  TransactionInsert,
  TransactionSplit,
  TransactionSplitInsert,
} from '../models/schemas';

export interface TransactionWithSplits {
  transaction: Transaction;
  splits: TransactionSplit[];
}

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  payeeSearch?: string;
  memoSearch?: string;
  amountMin?: number;
  amountMax?: number;
  isCleared?: boolean;
  limit?: number;
  offset?: number;
}

export function createTransaction(
  db: DatabaseAdapter,
  txId: string,
  input: TransactionInsert,
  splits: Array<{ id: string } & TransactionSplitInsert>,
): TransactionWithSplits {
  const now = new Date().toISOString();
  const memo = input.memo ?? null;
  const isCleared = input.is_cleared ?? false;
  const isTransfer = input.is_transfer ?? false;
  const transferId = input.transfer_id ?? null;

  const normalizedSplits = normalizeSplits(txId, input.amount, splits);

  // Validate splits sum to transaction amount
  const splitSum = normalizedSplits.reduce((sum, s) => sum + s.amount, 0);
  if (splitSum !== input.amount) {
    throw new Error(
      `Split amounts (${splitSum}) must equal transaction amount (${input.amount})`,
    );
  }

  db.transaction(() => {
    db.execute(
      `INSERT INTO transactions (id, account_id, date, payee, memo, amount, is_cleared, is_transfer, transfer_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [txId, input.account_id, input.date, input.payee, memo, input.amount, isCleared ? 1 : 0, isTransfer ? 1 : 0, transferId, now, now],
    );

    for (const split of normalizedSplits) {
      db.execute(
        `INSERT INTO transaction_splits (id, transaction_id, category_id, amount, memo)
         VALUES (?, ?, ?, ?, ?)`,
        [split.id, txId, split.category_id ?? null, split.amount, split.memo ?? null],
      );
    }
  });

  const transaction: Transaction = {
    id: txId,
    account_id: input.account_id,
    date: input.date,
    payee: input.payee,
    memo,
    amount: input.amount,
    is_cleared: isCleared,
    is_transfer: isTransfer,
    transfer_id: transferId,
    created_at: now,
    updated_at: now,
  };

  const resultSplits: TransactionSplit[] = normalizedSplits.map((s) => ({
    id: s.id,
    transaction_id: txId,
    category_id: s.category_id ?? null,
    amount: s.amount,
    memo: s.memo ?? null,
  }));

  return { transaction, splits: resultSplits };
}

export function updateTransaction(
  db: DatabaseAdapter,
  id: string,
  updates: Partial<Pick<Transaction, 'date' | 'payee' | 'memo' | 'amount' | 'is_cleared' | 'account_id'>>,
  newSplits?: Array<{ id: string } & TransactionSplitInsert>,
): void {
  db.transaction(() => {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.date !== undefined) {
      fields.push('date = ?');
      values.push(updates.date);
    }
    if (updates.payee !== undefined) {
      fields.push('payee = ?');
      values.push(updates.payee);
    }
    if (updates.memo !== undefined) {
      fields.push('memo = ?');
      values.push(updates.memo);
    }
    if (updates.amount !== undefined) {
      fields.push('amount = ?');
      values.push(updates.amount);
    }
    if (updates.is_cleared !== undefined) {
      fields.push('is_cleared = ?');
      values.push(updates.is_cleared ? 1 : 0);
    }
    if (updates.account_id !== undefined) {
      fields.push('account_id = ?');
      values.push(updates.account_id);
    }

    if (fields.length > 0) {
      fields.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(id);
      db.execute(
        `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`,
        values,
      );
    }

    if (newSplits) {
      // Validate splits if amount was updated
      const txAmount = updates.amount ?? getTransactionAmount(db, id);
      const normalizedSplits = normalizeSplits(id, txAmount, newSplits);
      const splitSum = normalizedSplits.reduce((sum, s) => sum + s.amount, 0);
      if (splitSum !== txAmount) {
        throw new Error(
          `Split amounts (${splitSum}) must equal transaction amount (${txAmount})`,
        );
      }

      db.execute(`DELETE FROM transaction_splits WHERE transaction_id = ?`, [id]);
      for (const split of normalizedSplits) {
        db.execute(
          `INSERT INTO transaction_splits (id, transaction_id, category_id, amount, memo)
           VALUES (?, ?, ?, ?, ?)`,
          [split.id, id, split.category_id ?? null, split.amount, split.memo ?? null],
        );
      }
    }
  });
}

export function deleteTransaction(db: DatabaseAdapter, id: string): void {
  db.transaction(() => {
    db.execute(`DELETE FROM transaction_splits WHERE transaction_id = ?`, [id]);
    db.execute(`DELETE FROM transactions WHERE id = ?`, [id]);
  });
}

export function getTransactions(
  db: DatabaseAdapter,
  filters: TransactionFilters = {},
): TransactionWithSplits[] {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.accountId) {
    where.push('t.account_id = ?');
    params.push(filters.accountId);
  }
  if (filters.categoryId) {
    where.push('t.id IN (SELECT transaction_id FROM transaction_splits WHERE category_id = ?)');
    params.push(filters.categoryId);
  }
  if (filters.dateFrom) {
    where.push('t.date >= ?');
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    where.push('t.date <= ?');
    params.push(filters.dateTo);
  }
  if (filters.payeeSearch) {
    where.push('t.payee LIKE ?');
    params.push(`%${filters.payeeSearch}%`);
  }
  if (filters.memoSearch) {
    where.push('t.memo LIKE ?');
    params.push(`%${filters.memoSearch}%`);
  }
  if (filters.amountMin !== undefined) {
    where.push('t.amount >= ?');
    params.push(filters.amountMin);
  }
  if (filters.amountMax !== undefined) {
    where.push('t.amount <= ?');
    params.push(filters.amountMax);
  }
  if (filters.isCleared !== undefined) {
    where.push('t.is_cleared = ?');
    params.push(filters.isCleared ? 1 : 0);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const limit = filters.limit ? `LIMIT ${filters.limit}` : '';
  const offset = filters.offset ? `OFFSET ${filters.offset}` : '';

  const txRows = db.query<Record<string, unknown>>(
    `SELECT * FROM transactions t ${whereClause} ORDER BY t.date DESC, t.created_at DESC ${limit} ${offset}`,
    params,
  );

  return txRows.map((row) => {
    const tx = rowToTransaction(row);
    const splitRows = db.query<Record<string, unknown>>(
      `SELECT * FROM transaction_splits WHERE transaction_id = ?`,
      [tx.id],
    );
    return {
      transaction: tx,
      splits: splitRows.map(rowToSplit),
    };
  });
}

export function getTransactionById(
  db: DatabaseAdapter,
  id: string,
): TransactionWithSplits | null {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM transactions WHERE id = ?`,
    [id],
  );
  if (rows.length === 0) return null;
  const tx = rowToTransaction(rows[0]);
  const splitRows = db.query<Record<string, unknown>>(
    `SELECT * FROM transaction_splits WHERE transaction_id = ?`,
    [tx.id],
  );
  return {
    transaction: tx,
    splits: splitRows.map(rowToSplit),
  };
}

/**
 * Get activity (sum of split amounts) per category for a month.
 * Used by the budget engine.
 */
export function getActivityByCategory(
  db: DatabaseAdapter,
  month: string,
): Map<string, number> {
  const rows = db.query<{ category_id: string; total: number }>(
    `SELECT ts.category_id, SUM(ts.amount) as total
     FROM transaction_splits ts
     JOIN transactions t ON t.id = ts.transaction_id
     WHERE t.date >= ? AND t.date < ?
       AND ts.category_id IS NOT NULL
     GROUP BY ts.category_id`,
    [`${month}-01`, nextMonth(month) + '-01'],
  );
  const result = new Map<string, number>();
  for (const row of rows) {
    result.set(row.category_id, row.total);
  }
  return result;
}

/**
 * Get total income (inflows to budget accounts) for a month.
 */
export function getTotalIncome(
  db: DatabaseAdapter,
  month: string,
): number {
  const rows = db.query<{ total: number | null }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM transactions
     WHERE date >= ? AND date < ? AND amount > 0 AND is_transfer = 0`,
    [`${month}-01`, nextMonth(month) + '-01'],
  );
  return rows[0]?.total ?? 0;
}

function normalizeSplits(
  transactionId: string,
  amount: number,
  splits: Array<{ id: string } & TransactionSplitInsert>,
): Array<{ id: string } & TransactionSplitInsert> {
  if (splits.length > 0) return splits;

  return [
    {
      id: `${transactionId}-split-uncategorized`,
      transaction_id: transactionId,
      category_id: null,
      amount,
      memo: null,
    },
  ];
}

// --- Helpers ---

function getTransactionAmount(db: DatabaseAdapter, id: string): number {
  const rows = db.query<{ amount: number }>(
    `SELECT amount FROM transactions WHERE id = ?`,
    [id],
  );
  if (rows.length === 0) throw new Error(`Transaction ${id} not found`);
  return rows[0].amount;
}

function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, '0')}`;
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

function rowToSplit(row: Record<string, unknown>): TransactionSplit {
  return {
    id: row.id as string,
    transaction_id: row.transaction_id as string,
    category_id: (row.category_id as string) ?? null,
    amount: row.amount as number,
    memo: (row.memo as string) ?? null,
  };
}
