'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Star } from 'lucide-react';
import { searchCatalogAction, fetchPopularCatalog } from '../../app/actions/subscriptions';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import type { CatalogEntry } from '@mybudget/shared';
import styles from './CatalogSearch.module.css';

interface Props {
  onSelect: (entry: CatalogEntry) => void;
}

export function CatalogSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogEntry[]>([]);
  const [popular, setPopular] = useState<CatalogEntry[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPopularCatalog().then(setPopular);
  }, []);

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      const entries = await searchCatalogAction(query);
      setResults(entries);
      setLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (entry: CatalogEntry) => {
      onSelect(entry);
      setQuery('');
      setShowDropdown(false);
    },
    [onSelect],
  );

  const displayList = query.trim().length > 0 ? results : popular;
  const showPopularLabel = query.trim().length === 0 && popular.length > 0;

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <div className={styles.inputWrap}>
        <Search size={16} className={styles.icon} />
        <input
          type="text"
          className={styles.input}
          placeholder="Search subscription catalog..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
        />
      </div>

      {showDropdown && (
        <div className={styles.dropdown}>
          {showPopularLabel && (
            <div className={styles.sectionLabel}>
              <Star size={12} /> Popular
            </div>
          )}

          {loading && <div className={styles.loadingText}>Searching...</div>}

          {!loading && displayList.length === 0 && query.trim().length > 0 && (
            <div className={styles.emptyText}>No results found</div>
          )}

          {!loading &&
            displayList.map((entry) => (
              <button
                key={entry.id}
                className={styles.resultRow}
                onClick={() => handleSelect(entry)}
              >
                <span className={styles.entryIcon}>{entry.iconKey}</span>
                <div className={styles.entryInfo}>
                  <span className={styles.entryName}>{entry.name}</span>
                  <span className={styles.entryCategory}>{entry.category}</span>
                </div>
                <div className={styles.entryPrice}>
                  <CurrencyDisplay amount={entry.defaultPrice} />
                  <span className={styles.entryCycle}>/{entry.billingCycle === 'annual' ? 'yr' : 'mo'}</span>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
