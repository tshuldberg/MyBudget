'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Coins, ArrowRight } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Dialog } from '../../../components/ui/Dialog';
import {
  fetchCurrencies,
  addCurrency,
  setExchangeRate,
  fetchExchangeRates,
} from '../../actions/currencies';
import styles from './page.module.css';

import type { CurrencyRow, ExchangeRateRow } from '@mybudget/shared';

export default function CurrencySettingsPage() {
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [rates, setRates] = useState<ExchangeRateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCurrency, setShowAddCurrency] = useState(false);
  const [showAddRate, setShowAddRate] = useState(false);

  const loadData = useCallback(async () => {
    const [currList, rateList] = await Promise.all([
      fetchCurrencies(),
      fetchExchangeRates(),
    ]);
    setCurrencies(currList);
    setRates(rateList);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const baseCurrency = currencies.find((c) => c.isBase);

  if (loading) {
    return (
      <div>
        <PageHeader title="Currencies" subtitle="Manage currencies and exchange rates" />
        <Card><div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading...</div></Card>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <PageHeader
        title="Currencies"
        subtitle="Manage currencies and exchange rates"
        actions={
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <Button variant="secondary" size="sm" onClick={() => setShowAddRate(true)} disabled={currencies.length < 2}>
              <Plus size={14} /> Add Rate
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddCurrency(true)}>
              <Plus size={14} /> Add Currency
            </Button>
          </div>
        }
      />

      <div className={styles.content}>
        {/* Base currency */}
        {baseCurrency && (
          <Card>
            <div className={styles.sectionTitle}>Base Currency</div>
            <div className={styles.currencyRow}>
              <span className={styles.currencyCode}>{baseCurrency.code}</span>
              <span className={styles.currencyName}>{baseCurrency.name}</span>
              <span className={styles.currencySymbol}>{baseCurrency.symbol}</span>
              <span className={styles.currencyBase}>Base</span>
            </div>
          </Card>
        )}

        {/* Currency list */}
        <Card>
          <div className={styles.sectionTitle}>All Currencies</div>
          {currencies.length === 0 ? (
            <EmptyState
              icon={Coins}
              title="No currencies configured"
              description="Add your base currency to get started with multi-currency support."
              actionLabel="Add Currency"
              onAction={() => setShowAddCurrency(true)}
            />
          ) : (
            <div className={styles.currencyList}>
              {currencies.map((c) => (
                <div key={c.code} className={styles.currencyRow}>
                  <span className={styles.currencyCode}>{c.code}</span>
                  <span className={styles.currencyName}>{c.name}</span>
                  <span className={styles.currencySymbol}>{c.symbol}</span>
                  {c.isBase && <span className={styles.currencyBase}>Base</span>}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Exchange rates */}
        <Card>
          <div className={styles.sectionTitle}>Exchange Rates</div>
          {rates.length === 0 ? (
            <div className={styles.emptyText}>
              No exchange rates configured. Add at least 2 currencies, then set rates.
            </div>
          ) : (
            <div className={styles.rateList}>
              {rates.map((r) => (
                <div key={r.id} className={styles.rateRow}>
                  <span className={styles.rateFrom}>{r.fromCurrency}</span>
                  <span className={styles.rateArrow}><ArrowRight size={14} /></span>
                  <span className={styles.rateTo}>{r.toCurrency}</span>
                  <span className={styles.rateValue}>{r.rateDecimal}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Add Currency Dialog */}
      <Dialog open={showAddCurrency} onClose={() => setShowAddCurrency(false)} title="Add Currency" width={400}>
        <AddCurrencyForm
          onSubmit={async (code, name, symbol) => {
            await addCurrency(code, name, symbol);
            setShowAddCurrency(false);
            await loadData();
          }}
          onCancel={() => setShowAddCurrency(false)}
        />
      </Dialog>

      {/* Add Exchange Rate Dialog */}
      <Dialog open={showAddRate} onClose={() => setShowAddRate(false)} title="Set Exchange Rate" width={400}>
        <AddRateForm
          currencies={currencies}
          onSubmit={async (from, to, rate) => {
            await setExchangeRate(from, to, rate);
            setShowAddRate(false);
            await loadData();
          }}
          onCancel={() => setShowAddRate(false)}
        />
      </Dialog>
    </div>
  );
}

function AddCurrencyForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (code: string, name: string, symbol: string) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <Input label="Currency Code" placeholder="USD" maxLength={3} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
      <Input label="Name" placeholder="US Dollar" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="Symbol" placeholder="$" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={() => onSubmit(code, name, symbol)} disabled={!code.trim() || !name.trim()}>
          Add Currency
        </Button>
      </div>
    </div>
  );
}

function AddRateForm({
  currencies,
  onSubmit,
  onCancel,
}: {
  currencies: CurrencyRow[];
  onSubmit: (from: string, to: string, rate: string) => void;
  onCancel: () => void;
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rate, setRate] = useState('');

  const options = currencies.map((c) => ({
    value: c.code,
    label: `${c.code} - ${c.name}`,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <Select
        label="From Currency"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        options={[{ value: '', label: 'Select...' }, ...options]}
      />
      <Select
        label="To Currency"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        options={[{ value: '', label: 'Select...' }, ...options]}
      />
      <Input label="Rate" type="number" step="0.000001" placeholder="1.08" value={rate} onChange={(e) => setRate(e.target.value)} />
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={() => onSubmit(from, to, rate)} disabled={!from || !to || !rate || from === to}>
          Set Rate
        </Button>
      </div>
    </div>
  );
}
