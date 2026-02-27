import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';

import { initializeDatabase } from '../migrations';
import type { DatabaseAdapter } from '../migrations';
import {
  createAccount,
  getAccounts,
  getAllAccounts,
  getAccountById,
  archiveAccount,
} from '../accounts';
import {
  createCategoryGroup,
  createCategory,
  getCategoriesByGroup,
  getCategoryById,
} from '../categories';
import {
  createTransaction,
  getTransactionById,
  getTransactions,
  updateTransaction,
  deleteTransaction,
  getActivityByCategory,
  getTotalIncome,
} from '../transactions';
import {
  allocateToCategory,
  getAllocationMap,
  moveAllocation,
} from '../../engine/allocations';
import { createTransfer, getTransferPair } from '../transfers';
import {
  createRecurringTemplate,
  generatePendingTransactions,
  getTemplateById,
} from '../recurring';

function createSqliteAdapter(): DatabaseAdapter {
  const sqlite = new Database(':memory:');

  return {
    execute(sql: string, params?: unknown[]): void {
      sqlite.prepare(sql).run(...(params ?? []));
    },
    query<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] {
      return sqlite.prepare(sql).all(...(params ?? [])) as T[];
    },
    transaction(fn: () => void): void {
      const tx = sqlite.transaction(fn);
      tx();
    },
  };
}

describe('MyBudget data pipeline: user data add/retrieve behavior', () => {
  let db: DatabaseAdapter;

  beforeEach(() => {
    db = createSqliteAdapter();
    const result = initializeDatabase(db);
    expect(result.version).toBe(2);
    expect(result.migrationsApplied).toBe(2);

    const secondRun = initializeDatabase(db);
    expect(secondRun.migrationsApplied).toBe(0);
  });

  it('creates bank sync scaffolding tables', () => {
    const rows = db.query<{ name: string }>(
      `SELECT name FROM sqlite_master
       WHERE type = 'table'
         AND name IN ('bank_connections', 'bank_accounts', 'bank_transactions_raw', 'bank_sync_state', 'bank_webhook_events')`,
    );
    expect(rows).toHaveLength(5);
  });

  it('stores accounts, retrieves active lists, and archives accounts from active view', () => {
    const checking = createAccount(db, 'acc-checking', {
      name: 'Checking',
      type: 'checking',
      balance: 125000,
    });
    createAccount(db, 'acc-savings', {
      name: 'Savings',
      type: 'savings',
      balance: 300000,
    });

    expect(checking.name).toBe('Checking');
    expect(getAccounts(db)).toHaveLength(2);
    expect(getAllAccounts(db)).toHaveLength(2);
    expect(getAccountById(db, 'acc-checking')?.balance).toBe(125000);

    archiveAccount(db, 'acc-savings');

    expect(getAccounts(db).map((account) => account.id)).toEqual(['acc-checking']);
    expect(getAllAccounts(db)).toHaveLength(2);
  });

  it('stores category groups/categories and keeps monthly allocations synchronized when moved', () => {
    createCategoryGroup(db, 'group-living', { name: 'Living', sort_order: 0 });
    createCategory(db, 'cat-rent', {
      group_id: 'group-living',
      name: 'Rent',
      emoji: '🏠',
      target_amount: 180000,
      target_type: 'monthly',
    });
    createCategory(db, 'cat-groceries', {
      group_id: 'group-living',
      name: 'Groceries',
      emoji: '🛒',
      target_amount: 50000,
      target_type: 'monthly',
    });

    allocateToCategory(db, 'alloc-1', 'cat-rent', '2026-02', 180000);
    allocateToCategory(db, 'alloc-2', 'cat-groceries', '2026-02', 50000);

    moveAllocation(db, 'cat-rent', 'cat-groceries', '2026-02', 10000, 'move-1');

    const map = getAllocationMap(db, '2026-02');
    expect(map.get('cat-rent')).toBe(170000);
    expect(map.get('cat-groceries')).toBe(60000);

    expect(getCategoriesByGroup(db, 'group-living')).toHaveLength(2);
    expect(getCategoryById(db, 'cat-rent')?.name).toBe('Rent');
  });

  it('persists uncategorized inflows and categorized spending, then returns correct activity and income totals', () => {
    createAccount(db, 'acc-main', { name: 'Checking', type: 'checking' });
    createCategoryGroup(db, 'group-essentials', { name: 'Essentials' });
    createCategory(db, 'cat-food', {
      group_id: 'group-essentials',
      name: 'Food',
    });

    createTransaction(
      db,
      'tx-grocery',
      {
        account_id: 'acc-main',
        date: '2026-02-05',
        payee: 'Whole Foods',
        amount: -8500,
      },
      [
        {
          id: 'split-grocery',
          transaction_id: 'tx-grocery',
          category_id: 'cat-food',
          amount: -8500,
        },
      ],
    );

    createTransaction(
      db,
      'tx-paycheck',
      {
        account_id: 'acc-main',
        date: '2026-02-06',
        payee: 'Acme Payroll',
        amount: 250000,
      },
      [],
    );

    const paycheck = getTransactionById(db, 'tx-paycheck');
    expect(paycheck).not.toBeNull();
    expect(paycheck?.splits).toHaveLength(1);
    expect(paycheck?.splits[0].category_id).toBeNull();
    expect(paycheck?.splits[0].amount).toBe(250000);

    const byCategory = getTransactions(db, { categoryId: 'cat-food' });
    expect(byCategory).toHaveLength(1);
    expect(byCategory[0].transaction.id).toBe('tx-grocery');

    const activity = getActivityByCategory(db, '2026-02');
    expect(activity.get('cat-food')).toBe(-8500);

    const totalIncome = getTotalIncome(db, '2026-02');
    expect(totalIncome).toBe(250000);
  });

  it('updates and deletes transactions while preserving split consistency', () => {
    createAccount(db, 'acc-main', { name: 'Checking', type: 'checking' });
    createCategoryGroup(db, 'group-essentials', { name: 'Essentials' });
    createCategory(db, 'cat-rent', {
      group_id: 'group-essentials',
      name: 'Rent',
    });
    createCategory(db, 'cat-house', {
      group_id: 'group-essentials',
      name: 'Household',
    });

    createTransaction(
      db,
      'tx-house',
      {
        account_id: 'acc-main',
        date: '2026-02-10',
        payee: 'Hardware Store',
        amount: -5000,
      },
      [
        {
          id: 'split-house-1',
          transaction_id: 'tx-house',
          category_id: 'cat-rent',
          amount: -5000,
        },
      ],
    );

    updateTransaction(
      db,
      'tx-house',
      {
        payee: 'Ace Hardware',
        amount: -6200,
      },
      [
        {
          id: 'split-house-2',
          transaction_id: 'tx-house',
          category_id: 'cat-house',
          amount: -6200,
        },
      ],
    );

    const updated = getTransactionById(db, 'tx-house');
    expect(updated?.transaction.payee).toBe('Ace Hardware');
    expect(updated?.transaction.amount).toBe(-6200);
    expect(updated?.splits).toHaveLength(1);
    expect(updated?.splits[0].category_id).toBe('cat-house');

    deleteTransaction(db, 'tx-house');
    expect(getTransactionById(db, 'tx-house')).toBeNull();
  });

  it('creates and resolves transfer pairs from either transaction side', () => {
    createAccount(db, 'acc-checking', { name: 'Checking', type: 'checking' });
    createAccount(db, 'acc-savings', { name: 'Savings', type: 'savings' });

    createTransfer(
      db,
      'tx-transfer-out',
      'tx-transfer-in',
      'acc-checking',
      'acc-savings',
      30000,
      '2026-02-15',
      'Emergency fund transfer',
    );

    const fromOutflow = getTransferPair(db, 'tx-transfer-out');
    const fromInflow = getTransferPair(db, 'tx-transfer-in');

    expect(fromOutflow?.outflow.amount).toBe(-30000);
    expect(fromOutflow?.inflow.amount).toBe(30000);
    expect(fromInflow?.outflow.account_id).toBe('acc-checking');
    expect(fromInflow?.inflow.account_id).toBe('acc-savings');
  });

  it('generates pending recurring transactions and deactivates templates after end date', () => {
    createAccount(db, 'acc-main', { name: 'Checking', type: 'checking' });

    createRecurringTemplate(db, 'tmpl-water', {
      account_id: 'acc-main',
      category_id: null,
      payee: 'Water Bill',
      amount: -12000,
      frequency: 'monthly',
      start_date: '2026-01-15',
      next_date: '2026-01-15',
      end_date: '2026-03-20',
    });

    const pending = generatePendingTransactions(db, '2026-03-16', () => ({
      txId: 'unused-tx-id',
      splitId: 'unused-split-id',
    }));

    expect(pending).toHaveLength(3);
    expect(pending.map((row) => row.date)).toEqual([
      '2026-01-15',
      '2026-02-15',
      '2026-03-15',
    ]);

    const template = getTemplateById(db, 'tmpl-water');
    expect(template?.next_date).toBe('2026-04-15');
    expect(template?.is_active).toBe(false);
  });
});
