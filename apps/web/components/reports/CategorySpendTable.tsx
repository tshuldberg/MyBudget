'use client';

import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { ProgressBar } from '../ui/ProgressBar';
import styles from './CategorySpendTable.module.css';

interface Props {
  data: Array<{ categoryName: string; emoji: string | null; total: number }>;
}

export function CategorySpendTable({ data }: Props) {
  if (data.length === 0) {
    return <div className={styles.emptyText}>No spending data for this month</div>;
  }

  const sorted = [...data].sort((a, b) => b.total - a.total);
  const grandTotal = sorted.reduce((sum, d) => sum + d.total, 0);

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Category</th>
          <th>Spent</th>
          <th className={styles.progressCell}>Share</th>
          <th>%</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((row) => {
          const pct = grandTotal > 0 ? (row.total / grandTotal) * 100 : 0;
          return (
            <tr key={row.categoryName}>
              <td>
                <div className={styles.categoryCell}>
                  <span className={styles.emoji}>{row.emoji ?? '📂'}</span>
                  <span className={styles.categoryName}>{row.categoryName}</span>
                </div>
              </td>
              <td className={styles.amountCell}>
                <CurrencyDisplay amount={row.total} />
              </td>
              <td className={styles.progressCell}>
                <ProgressBar value={pct} color="teal" size="sm" />
              </td>
              <td className={styles.percentCell}>
                {pct.toFixed(1)}%
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
