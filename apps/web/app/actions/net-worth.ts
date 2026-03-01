'use server';

import { getDb } from './db';
import {
  createSnapshot as _createSnapshot,
  listSnapshots as _listSnapshots,
  getAccounts as _getAccounts,
  captureSnapshot,
} from '@mybudget/shared';
import type { NetWorthSnapshotRow } from '@mybudget/shared';
import { randomUUID } from 'crypto';

export async function fetchNetWorthSnapshots(): Promise<NetWorthSnapshotRow[]> {
  return _listSnapshots(getDb());
}

export async function createNetWorthSnapshot(month: string): Promise<NetWorthSnapshotRow> {
  const db = getDb();
  const accounts = _getAccounts(db);

  const input = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type as 'checking' | 'savings' | 'credit_card' | 'cash',
    balance: a.balance,
    isActive: a.is_active === 1,
  }));

  const snapshot = captureSnapshot({ accounts: input, month });

  return _createSnapshot(db, randomUUID(), {
    month: snapshot.month,
    assets: snapshot.assets,
    liabilities: snapshot.liabilities,
    net_worth: snapshot.netWorth,
    account_balances: snapshot.accountBalances,
  });
}

export async function fetchAccountBreakdown(): Promise<Array<{
  id: string;
  name: string;
  type: string;
  balance: number;
  isAsset: boolean;
}>> {
  const db = getDb();
  const accounts = _getAccounts(db);

  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    balance: a.balance,
    isAsset: a.type !== 'credit_card',
  }));
}
