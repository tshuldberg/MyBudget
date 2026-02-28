'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Landmark, Link2 } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay';
import { EmptyState } from '../../components/ui/EmptyState';
import { AccountCard } from '../../components/accounts/AccountCard';
import { AddAccountDialog } from '../../components/accounts/AddAccountDialog';
import { fetchAccounts, createAccount, getNetWorth } from '../actions/accounts';
import type { Account, AccountInsert } from '@mybudget/shared';
import styles from './page.module.css';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [netWorth, setNetWorth] = useState({ assets: 0, liabilities: 0, netWorth: 0 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [accts, nw] = await Promise.all([fetchAccounts(), getNetWorth()]);
      setAccounts(accts);
      setNetWorth(nw);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = useCallback(
    async (data: { name: string; type: string; balance: number }) => {
      const input: AccountInsert = {
        name: data.name,
        type: data.type as AccountInsert['type'],
        balance: data.balance,
      };
      await createAccount(input);
      await load();
    },
    [load],
  );

  const { budgetAccounts, creditCards } = useMemo(() => {
    const budget: Account[] = [];
    const credit: Account[] = [];
    for (const a of accounts) {
      if (a.type === 'credit_card') credit.push(a);
      else budget.push(a);
    }
    return { budgetAccounts: budget, creditCards: credit };
  }, [accounts]);

  if (loading) {
    return (
      <div className="fade-in">
        <PageHeader title="Accounts" subtitle="Loading..." />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <PageHeader
        title="Accounts"
        subtitle={`${accounts.length} account${accounts.length !== 1 ? 's' : ''}`}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus size={16} /> Add Account
          </Button>
        }
      />

      {/* Net Worth Summary */}
      <Card className={styles.netWorthCard}>
        <div className={styles.netWorthHeader}>
          <span className={styles.netWorthLabel}>Net Worth</span>
        </div>
        <div className={styles.netWorthAmount}>
          <CurrencyDisplay amount={netWorth.netWorth} colorize />
        </div>
        <div className={styles.netWorthBreakdown}>
          <div className={styles.breakdownItem}>
            <span className={styles.breakdownLabel}>Assets</span>
            <span className={styles.breakdownValue}>
              <CurrencyDisplay amount={netWorth.assets} />
            </span>
          </div>
          <div className={styles.breakdownItem}>
            <span className={styles.breakdownLabel}>Liabilities</span>
            <span className={styles.breakdownValue}>
              <CurrencyDisplay amount={netWorth.liabilities} />
            </span>
          </div>
        </div>
      </Card>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No accounts yet"
          description="Add your bank accounts, credit cards, and cash to start tracking balances."
          actionLabel="Add Account"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <>
          {budgetAccounts.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Budget Accounts</h2>
              <div className={styles.accountGrid}>
                {budgetAccounts.map((a) => (
                  <AccountCard key={a.id} account={a} />
                ))}
              </div>
            </div>
          )}

          {creditCards.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Credit Cards</h2>
              <div className={styles.accountGrid}>
                {creditCards.map((a) => (
                  <AccountCard key={a.id} account={a} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Connect Bank CTA */}
      <Link href="/accounts/connect">
        <div className={styles.connectCard}>
          <div className={styles.connectIcon}>
            <Link2 size={24} />
          </div>
          <div className={styles.connectTitle}>Connect Your Bank</div>
          <p className={styles.connectDesc}>
            Automatically import transactions by securely connecting your bank via Plaid.
            Your data stays on-device.
          </p>
          <Button variant="secondary" size="sm">
            Set Up Bank Sync
          </Button>
        </div>
      </Link>

      <AddAccountDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
