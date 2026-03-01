'use client';

import { useState } from 'react';
import { SubscriptionRow } from './SubscriptionRow';
import type { Subscription } from '@mybudget/shared';
import styles from './SubscriptionList.module.css';

interface Props {
  subscriptions: Subscription[];
  onSelect: (id: string) => void;
}

type Tab = 'all' | 'active' | 'trial' | 'paused' | 'cancelled';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'trial', label: 'Trial' },
  { key: 'paused', label: 'Paused' },
  { key: 'cancelled', label: 'Cancelled' },
];

export function SubscriptionList({ subscriptions, onSelect }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('all');

  const counts: Record<Tab, number> = {
    all: subscriptions.length,
    active: subscriptions.filter((s) => s.status === 'active').length,
    trial: subscriptions.filter((s) => s.status === 'trial').length,
    paused: subscriptions.filter((s) => s.status === 'paused').length,
    cancelled: subscriptions.filter((s) => s.status === 'cancelled').length,
  };

  const filtered =
    activeTab === 'all'
      ? subscriptions
      : subscriptions.filter((s) => s.status === activeTab);

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <span className={styles.count}>{counts[tab.key]}</span>
          </button>
        ))}
      </div>

      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>No subscriptions in this category</div>
        ) : (
          filtered.map((sub) => (
            <SubscriptionRow
              key={sub.id}
              subscription={sub}
              onClick={() => onSelect(sub.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
