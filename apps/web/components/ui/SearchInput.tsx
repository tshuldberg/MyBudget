'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import styles from './SearchInput.module.css';

interface Props {
  placeholder?: string;
  value?: string;
  onChange: (value: string) => void;
  debounceMs?: number;
}

export function SearchInput({ placeholder = 'Search...', value: controlledValue, onChange, debounceMs = 300 }: Props) {
  const [internalValue, setInternalValue] = useState(controlledValue ?? '');

  useEffect(() => {
    if (controlledValue !== undefined) setInternalValue(controlledValue);
  }, [controlledValue]);

  useEffect(() => {
    const timer = setTimeout(() => onChange(internalValue), debounceMs);
    return () => clearTimeout(timer);
  }, [internalValue, debounceMs, onChange]);

  return (
    <div className={styles.wrapper}>
      <Search size={16} className={styles.icon} />
      <input
        type="text"
        className={styles.input}
        placeholder={placeholder}
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
      />
    </div>
  );
}
