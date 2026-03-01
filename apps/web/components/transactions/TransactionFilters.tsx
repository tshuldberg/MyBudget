'use client';

import { useCallback } from 'react';
import { SearchInput } from '../ui/SearchInput';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import type { Account, TransactionFilters as TxnFilters } from '@mybudget/shared';
import styles from './TransactionFilters.module.css';

interface Props {
  accounts: Account[];
  filters: TxnFilters;
  onFilterChange: (f: TxnFilters) => void;
}

type Direction = 'all' | 'inflows' | 'outflows';

export function TransactionFilters({ accounts, filters, onFilterChange }: Props) {
  const direction: Direction =
    filters.amountMin !== undefined && filters.amountMin > 0
      ? 'inflows'
      : filters.amountMax !== undefined && filters.amountMax < 0
        ? 'outflows'
        : 'all';

  const setDirection = useCallback(
    (d: Direction) => {
      const next = { ...filters };
      delete next.amountMin;
      delete next.amountMax;
      if (d === 'inflows') {
        next.amountMin = 1;
      } else if (d === 'outflows') {
        next.amountMax = -1;
      }
      onFilterChange(next);
    },
    [filters, onFilterChange],
  );

  const accountOptions = [
    { value: '', label: 'All Accounts' },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  return (
    <div className={styles.filterBar}>
      <div className={styles.searchWrap}>
        <SearchInput
          placeholder="Search payee..."
          value={filters.payeeSearch ?? ''}
          onChange={(val) => onFilterChange({ ...filters, payeeSearch: val || undefined })}
        />
      </div>

      <div className={styles.dateGroup}>
        <Input
          type="date"
          label="From"
          className={styles.dateInput}
          value={filters.dateFrom ?? ''}
          onChange={(e) =>
            onFilterChange({ ...filters, dateFrom: e.target.value || undefined })
          }
        />
        <Input
          type="date"
          label="To"
          className={styles.dateInput}
          value={filters.dateTo ?? ''}
          onChange={(e) =>
            onFilterChange({ ...filters, dateTo: e.target.value || undefined })
          }
        />
      </div>

      <div className={styles.accountSelect}>
        <Select
          label="Account"
          options={accountOptions}
          value={filters.accountId ?? ''}
          onChange={(e) =>
            onFilterChange({ ...filters, accountId: e.target.value || undefined })
          }
        />
      </div>

      <div className={styles.directionToggle}>
        {(['all', 'inflows', 'outflows'] as Direction[]).map((d) => (
          <button
            key={d}
            className={`${styles.directionBtn} ${direction === d ? styles.directionBtnActive : ''}`}
            onClick={() => setDirection(d)}
          >
            {d === 'all' ? 'All' : d === 'inflows' ? 'Inflows' : 'Outflows'}
          </button>
        ))}
      </div>
    </div>
  );
}
