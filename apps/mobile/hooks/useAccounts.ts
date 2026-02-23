import { useMemo } from 'react';
import { useDatabase } from '../lib/DatabaseProvider';
import {
  getAccounts,
  createAccount,
  updateAccount,
  archiveAccount,
} from '@mybudget/shared';
import type { Account, AccountInsert } from '@mybudget/shared';
import { uuid } from '../lib/uuid';

export function useAccounts() {
  const { db, version, invalidate } = useDatabase();

  const accounts = useMemo(() => getAccounts(db), [db, version]);

  const totalBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + a.balance, 0),
    [accounts],
  );

  return {
    accounts,
    totalBalance,
    createAccount: (input: AccountInsert): Account => {
      const result = createAccount(db, uuid(), input);
      invalidate();
      return result;
    },
    updateAccount: (id: string, updates: Parameters<typeof updateAccount>[2]) => {
      updateAccount(db, id, updates);
      invalidate();
    },
    archiveAccount: (id: string) => {
      archiveAccount(db, id);
      invalidate();
    },
  };
}
