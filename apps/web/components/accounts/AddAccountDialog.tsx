'use client';

import { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import styles from './AddAccountDialog.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; type: string; balance: number }) => void;
}

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'cash', label: 'Cash' },
];

export function AddAccountDialog({ open, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [balanceStr, setBalanceStr] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setName('');
    setType('checking');
    setBalanceStr('');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Account name is required');
      return;
    }

    const dollars = parseFloat(balanceStr || '0');
    if (isNaN(dollars)) {
      setError('Enter a valid balance');
      return;
    }

    const cents = Math.round(dollars * 100);

    onSubmit({
      name: name.trim(),
      type,
      balance: cents,
    });
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Add Account" width={440}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <Input
          label="Account Name"
          placeholder="e.g. Chase Checking"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          error={error && !name.trim() ? error : undefined}
        />

        <Select
          label="Account Type"
          options={ACCOUNT_TYPE_OPTIONS}
          value={type}
          onChange={(e) => setType(e.target.value)}
        />

        <Input
          label="Starting Balance"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={balanceStr}
          onChange={(e) => {
            setBalanceStr(e.target.value);
            setError('');
          }}
          error={error && balanceStr && isNaN(parseFloat(balanceStr)) ? error : undefined}
        />

        {error && <p style={{ color: 'var(--color-coral)', fontSize: 'var(--font-size-xs)' }}>{error}</p>}

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit">Create Account</Button>
        </div>
      </form>
    </Dialog>
  );
}
