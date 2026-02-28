'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, ArrowLeftRight } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay';
import { TransactionFilters } from '../../components/transactions/TransactionFilters';
import { TransactionList } from '../../components/transactions/TransactionList';
import { AddTransactionDialog } from '../../components/transactions/AddTransactionDialog';
import { fetchTransactions, createTransaction, deleteTransaction } from '../actions/transactions';
import { fetchAccounts } from '../actions/accounts';
import { fetchCategories } from '../actions/categories';
import type {
  TransactionWithSplits,
  Account,
  Category,
  TransactionFilters as TxnFilters,
} from '@mybudget/shared';
import styles from './page.module.css';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithSplits[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<TxnFilters>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [txns, accts, cats] = await Promise.all([
        fetchTransactions(filters),
        fetchAccounts(),
        fetchCategories(),
      ]);
      setTransactions(txns);
      setAccounts(accts);
      setCategories(cats);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFilterChange = useCallback((f: TxnFilters) => {
    setFilters(f);
  }, []);

  const handleCreate = useCallback(
    async (data: {
      amount: number;
      payee: string;
      accountId: string;
      categoryId: string | null;
      date: string;
      memo: string;
    }) => {
      await createTransaction(
        {
          account_id: data.accountId,
          date: data.date,
          payee: data.payee,
          amount: data.amount,
          memo: data.memo || null,
        },
        data.categoryId,
      );
      await load();
    },
    [load],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteTransaction(id);
      await load();
    },
    [load],
  );

  const handleEdit = useCallback((_id: string) => {
    // Edit functionality will be implemented in a future iteration
  }, []);

  const { totalInflows, totalOutflows } = useMemo(() => {
    let inflows = 0;
    let outflows = 0;
    for (const { transaction } of transactions) {
      if (transaction.amount > 0) inflows += transaction.amount;
      else outflows += Math.abs(transaction.amount);
    }
    return { totalInflows: inflows, totalOutflows: outflows };
  }, [transactions]);

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji })),
    [categories],
  );

  if (loading) {
    return (
      <div className="fade-in">
        <PageHeader title="Transactions" subtitle="Loading..." />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <PageHeader
        title="Transactions"
        subtitle={`${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus size={16} /> Add Transaction
          </Button>
        }
      />

      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Inflows</span>
          <span className={styles.summaryValue}>
            <CurrencyDisplay amount={totalInflows} colorize />
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Outflows</span>
          <span className={styles.summaryValue}>
            <CurrencyDisplay amount={-totalOutflows} colorize />
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Net</span>
          <span className={styles.summaryValue}>
            <CurrencyDisplay amount={totalInflows - totalOutflows} colorize showSign />
          </span>
        </div>
      </div>

      <TransactionFilters
        accounts={accounts}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {transactions.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No transactions yet"
          description="Add your first transaction to start tracking your spending."
          actionLabel="Add Transaction"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <Card className={styles.listCard}>
          <TransactionList
            transactions={transactions}
            accounts={accounts}
            categories={categoryOptions}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </Card>
      )}

      <AddTransactionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        accounts={accounts}
        categories={categoryOptions}
        onSubmit={handleCreate}
      />
    </div>
  );
}
