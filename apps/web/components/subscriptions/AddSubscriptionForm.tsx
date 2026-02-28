'use client';

import { useState, useEffect } from 'react';
import { CatalogSearch } from './CatalogSearch';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import type { CatalogEntry } from '@mybudget/shared';
import styles from './AddSubscriptionForm.module.css';

interface SubmitData {
  name: string;
  price: number;
  billing_cycle: string;
  status: string;
  start_date: string;
  next_renewal: string;
  icon?: string | null;
  url?: string | null;
  notes?: string | null;
  catalog_id?: string | null;
}

interface Props {
  onSubmit: (data: SubmitData) => void;
  onCancel: () => void;
  prefill?: CatalogEntry;
}

const BILLING_CYCLE_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'paused', label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
];

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultNextRenewal(cycle: string, startDate: string): string {
  const date = new Date(startDate + 'T00:00:00');
  switch (cycle) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'semi_annual':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'annual':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date.toISOString().slice(0, 10);
}

export function AddSubscriptionForm({ onSubmit, onCancel, prefill }: Props) {
  const [name, setName] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [status, setStatus] = useState('active');
  const [startDate, setStartDate] = useState(todayString());
  const [nextRenewal, setNextRenewal] = useState(defaultNextRenewal('monthly', todayString()));
  const [icon, setIcon] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [catalogId, setCatalogId] = useState<string | null>(null);

  useEffect(() => {
    if (prefill) {
      applyPrefill(prefill);
    }
  }, [prefill]);

  function applyPrefill(entry: CatalogEntry) {
    setName(entry.name);
    const dollars = (entry.defaultPrice / 100).toFixed(2);
    setPriceStr(dollars);
    setBillingCycle(entry.billingCycle);
    setIcon(entry.iconKey);
    setUrl(entry.url ?? '');
    setCatalogId(entry.id);
    setNextRenewal(defaultNextRenewal(entry.billingCycle, startDate));
  }

  function handleCatalogSelect(entry: CatalogEntry) {
    applyPrefill(entry);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const priceCents = Math.round(parseFloat(priceStr || '0') * 100);

    onSubmit({
      name: name.trim(),
      price: priceCents,
      billing_cycle: billingCycle,
      status,
      start_date: startDate,
      next_renewal: nextRenewal,
      icon: icon.trim() || null,
      url: url.trim() || null,
      notes: notes.trim() || null,
      catalog_id: catalogId,
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.section}>
        <label className={styles.sectionLabel}>Find in Catalog</label>
        <CatalogSearch onSelect={handleCatalogSelect} />
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Netflix, Spotify, etc."
          required
        />
      </div>

      <div className={styles.row}>
        <Input
          label="Price ($)"
          type="number"
          step="0.01"
          min="0"
          value={priceStr}
          onChange={(e) => setPriceStr(e.target.value)}
          placeholder="9.99"
          required
        />
        <Select
          label="Billing Cycle"
          options={BILLING_CYCLE_OPTIONS}
          value={billingCycle}
          onChange={(e) => {
            const newCycle = e.target.value;
            setBillingCycle(newCycle);
            setNextRenewal(defaultNextRenewal(newCycle, startDate));
          }}
        />
      </div>

      <div className={styles.row}>
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
        <Input
          label="Icon (emoji)"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="📺"
        />
      </div>

      <div className={styles.row}>
        <Input
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setNextRenewal(defaultNextRenewal(billingCycle, e.target.value));
          }}
          required
        />
        <Input
          label="Next Renewal"
          type="date"
          value={nextRenewal}
          onChange={(e) => setNextRenewal(e.target.value)}
          required
        />
      </div>

      <div className={styles.section}>
        <Input
          label="URL"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className={styles.section}>
        <div className={styles.textareaWrap}>
          <label className={styles.textareaLabel}>Notes</label>
          <textarea
            className={styles.textarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about this subscription..."
            rows={3}
          />
        </div>
      </div>

      <div className={styles.actions}>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!name.trim() || !priceStr}>
          Add Subscription
        </Button>
      </div>
    </form>
  );
}
