'use client';

import { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import type { Account } from '@mybudget/shared';
import styles from './AddTransactionDialog.module.css';

interface CategoryOption {
  id: string;
  name: string;
  emoji: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: CategoryOption[];
  onSubmit: (data: {
    amount: number;
    payee: string;
    accountId: string;
    categoryId: string | null;
    date: string;
    memo: string;
  }) => void;
}

export function AddTransactionDialog({ open, onClose, accounts, categories, onSubmit }: Props) {
  const [amountStr, setAmountStr] = useState('');
  const [direction, setDirection] = useState<'outflow' | 'inflow'>('outflow');
  const [payee, setPayee] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setAmountStr('');
    setDirection('outflow');
    setPayee('');
    setAccountId(accounts[0]?.id ?? '');
    setCategoryId('');
    setDate(new Date().toISOString().slice(0, 10));
    setMemo('');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dollars = parseFloat(amountStr);
    if (isNaN(dollars) || dollars <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!payee.trim()) {
      setError('Payee is required');
      return;
    }
    if (!accountId) {
      setError('Select an account');
      return;
    }

    const cents = Math.round(dollars * 100);
    const signedAmount = direction === 'outflow' ? -cents : cents;

    onSubmit({
      amount: signedAmount,
      payee: payee.trim(),
      accountId,
      categoryId: categoryId || null,
      date,
      memo: memo.trim(),
    });
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }));
  const categoryOptions = [
    { value: '', label: 'Uncategorized' },
    ...categories.map((c) => ({
      value: c.id,
      label: `${c.emoji ?? ''} ${c.name}`.trim(),
    })),
  ];

  return (
    <Dialog open={open} onClose={handleClose} title="Add Transaction" width={520}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.amountRow}>
          <div className={styles.amountInput}>
            <Input
              label="Amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amountStr}
              onChange={(e) => {
                setAmountStr(e.target.value);
                setError('');
              }}
              error={error && !amountStr ? error : undefined}
            />
          </div>
          <div className={styles.directionToggle}>
            <button
              type="button"
              className={`${styles.directionBtn} ${direction === 'outflow' ? styles.directionBtnActive + ' ' + styles.directionBtnOutflow : ''}`}
              onClick={() => setDirection('outflow')}
            >
              Outflow
            </button>
            <button
              type="button"
              className={`${styles.directionBtn} ${direction === 'inflow' ? styles.directionBtnActive + ' ' + styles.directionBtnInflow : ''}`}
              onClick={() => setDirection('inflow')}
            >
              Inflow
            </button>
          </div>
        </div>

        <Input
          label="Payee"
          placeholder="Who was this to/from?"
          value={payee}
          onChange={(e) => {
            setPayee(e.target.value);
            setError('');
          }}
          error={error && !payee.trim() ? error : undefined}
        />

        <div className={styles.row}>
          <Select
            label="Account"
            options={accountOptions}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          />
          <Select
            label="Category"
            options={categoryOptions}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          />
        </div>

        <div className={styles.row}>
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input
            label="Memo"
            placeholder="Optional note"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>

        {error && <p style={{ color: 'var(--color-coral)', fontSize: 'var(--font-size-xs)' }}>{error}</p>}

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit">Add Transaction</Button>
        </div>
      </form>
    </Dialog>
  );
}
