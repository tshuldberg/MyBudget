'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { Badge } from '../ui/Badge';
import type { TransactionWithSplits } from '@mybudget/shared';
import styles from './TransactionRow.module.css';

interface Props {
  txn: TransactionWithSplits;
  accountName: string;
  categoryLabel?: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function TransactionRow({ txn, accountName, categoryLabel, onEdit, onDelete }: Props) {
  const { transaction } = txn;

  return (
    <div className={styles.row}>
      <div
        className={`${styles.clearedDot} ${transaction.is_cleared ? styles.cleared : ''}`}
        title={transaction.is_cleared ? 'Cleared' : 'Uncleared'}
      />

      <div className={styles.payeeInfo}>
        <span className={styles.payee}>{transaction.payee}</span>
        <span className={styles.accountName}>{accountName}</span>
      </div>

      {categoryLabel && (
        <div className={styles.category}>
          <Badge>{categoryLabel}</Badge>
        </div>
      )}

      <div className={styles.amount}>
        <CurrencyDisplay amount={transaction.amount} colorize showSign />
      </div>

      <span className={styles.date}>{formatDate(transaction.date)}</span>

      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={onEdit} title="Edit">
          <Pencil size={14} />
        </button>
        <button
          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
          onClick={onDelete}
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${month}/${day}/${year}`;
}
