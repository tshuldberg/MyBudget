'use server';

import { getDb } from './db';
import {
  createAccount as _createAccount,
  updateAccount as _updateAccount,
  getAccounts as _getAccounts,
  getAllAccounts as _getAllAccounts,
  getAccountById as _getAccountById,
  archiveAccount as _archiveAccount,
  getAccountBalance as _getAccountBalance,
  updateAccountBalance as _updateAccountBalance,
} from '@mybudget/shared';
import type { AccountInsert, Account } from '@mybudget/shared';
import { randomUUID } from 'crypto';

export async function fetchAccounts(includeInactive = false): Promise<Account[]> {
  const db = getDb();
  return includeInactive ? _getAllAccounts(db) : _getAccounts(db);
}

export async function fetchAccountById(id: string): Promise<Account | null> {
  return _getAccountById(getDb(), id);
}

export async function createAccount(input: AccountInsert): Promise<Account> {
  const id = randomUUID();
  return _createAccount(getDb(), id, input);
}

export async function updateAccount(
  id: string,
  updates: Partial<Pick<Account, 'name' | 'type' | 'sort_order' | 'is_active'>>,
): Promise<void> {
  _updateAccount(getDb(), id, updates);
}

export async function archiveAccount(id: string): Promise<void> {
  _archiveAccount(getDb(), id);
}

export async function getAccountBalance(accountId: string): Promise<number> {
  return _getAccountBalance(getDb(), accountId);
}

export async function recalcAccountBalance(accountId: string): Promise<void> {
  const db = getDb();
  const balance = _getAccountBalance(db, accountId);
  _updateAccountBalance(db, accountId, balance);
}

export async function getNetWorth(): Promise<{ assets: number; liabilities: number; netWorth: number }> {
  const db = getDb();
  const accounts = _getAccounts(db);
  let assets = 0;
  let liabilities = 0;
  for (const a of accounts) {
    if (a.type === 'credit_card') {
      liabilities += Math.abs(a.balance);
    } else {
      assets += a.balance;
    }
  }
  return { assets, liabilities, netWorth: assets - liabilities };
}
