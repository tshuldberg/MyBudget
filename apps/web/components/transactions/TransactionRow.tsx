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

function getCategoryIcon(payee: string, catLabel?: string): string {
  const p = payee.toLowerCase();
  if (p.includes('food') || p.includes('restaurant') || p.includes('doordash') || p.includes('uber eat')) return '🍽️';
  if (p.includes('gas') || p.includes('chevron') || p.includes('shell')) return '⛽';
  if (p.includes('grocery') || p.includes('albertson') || p.includes('trader') || p.includes('whole food')) return '🛒';
  if (p.includes('amazon')) return '📦';
  if (p.includes('netflix') || p.includes('spotify') || p.includes('disney') || p.includes('hulu')) return '🎬';
  if (p.includes('transfer')) return '🔄';
  if (catLabel) {
    const emoji = catLabel.match(/^\p{Emoji}/u);
    if (emoji) return emoji[0];
  }
  return '💳';
}

export function TransactionRow({ txn, accountName, categoryLabel, onEdit, onDelete }: Props) {
  const { transaction } = txn;
  const isPending = !transaction.is_cleared;

  return (
    <div className={styles.row}>
      <div className={styles.iconCircle}>
        <span>{getCategoryIcon(transaction.payee, categoryLabel)}</span>
      </div>

      <div className={styles.payeeInfo}>
        <span className={styles.payee}>
          {transaction.payee}
          {isPending && <span className={styles.pendingBadge}>Pending</span>}
        </span>
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
