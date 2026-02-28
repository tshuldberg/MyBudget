import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import type { Account } from '@mybudget/shared';
import styles from './AccountCard.module.css';

interface Props {
  account: Account;
}

const TYPE_ICONS: Record<string, string> = {
  checking: '🏦',
  savings: '🐷',
  credit_card: '💳',
  cash: '💵',
};

const TYPE_LABELS: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit_card: 'Credit Card',
  cash: 'Cash',
};

export function AccountCard({ account }: Props) {
  return (
    <Card className={styles.card}>
      <div className={styles.icon}>{TYPE_ICONS[account.type] ?? '🏦'}</div>
      <div className={styles.info}>
        <div className={styles.name}>{account.name}</div>
        <div className={styles.type}>
          <Badge variant={account.type === 'credit_card' ? 'warning' : 'default'}>
            {TYPE_LABELS[account.type] ?? account.type}
          </Badge>
        </div>
      </div>
      <div className={styles.balance}>
        <CurrencyDisplay amount={account.balance} colorize />
      </div>
    </Card>
  );
}
