'use client';

import { useMemo } from 'react';
import { TransactionRow } from './TransactionRow';
import type { TransactionWithSplits, Account } from '@mybudget/shared';
import styles from './TransactionList.module.css';

interface CategoryInfo {
  id: string;
  name: string;
  emoji: string | null;
}

interface Props {
  transactions: TransactionWithSplits[];
  accounts: Account[];
  categories?: CategoryInfo[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

interface DateGroup {
  label: string;
  date: string;
  items: TransactionWithSplits[];
}

export function TransactionList({ transactions, accounts, categories, onEdit, onDelete }: Props) {
  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of accounts) {
      map.set(a.id, a.name);
    }
    return map;
  }, [accounts]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories ?? []) {
      map.set(c.id, `${c.emoji ?? ''} ${c.name}`.trim());
    }
    return map;
  }, [categories]);

  const groups = useMemo(() => groupByDate(transactions), [transactions]);

  return (
    <div className={styles.container}>
      {groups.map((group) => (
        <div key={group.date} className={styles.dateGroup}>
          <div className={styles.dateHeader}>{group.label}</div>
          <div className={styles.rows}>
            {group.items.map((txn) => {
              const catId = txn.splits[0]?.category_id;
              return (
                <TransactionRow
                  key={txn.transaction.id}
                  txn={txn}
                  accountName={accountMap.get(txn.transaction.account_id) ?? 'Unknown'}
                  categoryLabel={catId ? categoryMap.get(catId) : undefined}
                  onEdit={() => onEdit(txn.transaction.id)}
                  onDelete={() => onDelete(txn.transaction.id)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function groupByDate(transactions: TransactionWithSplits[]): DateGroup[] {
  const map = new Map<string, TransactionWithSplits[]>();
  for (const txn of transactions) {
    const date = txn.transaction.date;
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(txn);
  }

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const groups: DateGroup[] = [];
  for (const [date, items] of map.entries()) {
    let label: string;
    if (date === today) {
      label = 'Today';
    } else if (date === yesterday) {
      label = 'Yesterday';
    } else {
      label = formatGroupDate(date);
    }
    groups.push({ label, date, items });
  }

  groups.sort((a, b) => b.date.localeCompare(a.date));
  return groups;
}

function formatGroupDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
