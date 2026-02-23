import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { DatabaseAdapter } from '@mybudget/shared';
import { initializeDatabase } from '@mybudget/shared';
import { createExpoAdapter } from './database-adapter';
import { seedDatabase } from './seed';

interface DatabaseContextValue {
  db: DatabaseAdapter;
  /** Incremented after every mutation to trigger re-renders in hooks. */
  version: number;
  /** Call after any write operation to refresh all consuming hooks. */
  invalidate: () => void;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);

  const db = useMemo(() => createExpoAdapter(), []);
  const invalidate = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    initializeDatabase(db);
    seedDatabase(db);
    setReady(true);
  }, [db]);

  const value = useMemo(
    () => ({ db, version, invalidate }),
    [db, version, invalidate],
  );

  if (!ready) return null;

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase(): DatabaseContextValue {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error('useDatabase must be used within DatabaseProvider');
  return ctx;
}
