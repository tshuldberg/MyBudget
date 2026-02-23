import * as SQLite from 'expo-sqlite';
import type { SQLiteBindParams } from 'expo-sqlite';
import type { DatabaseAdapter } from '@mybudget/shared';

export function createExpoAdapter(dbName = 'mybudget.db'): DatabaseAdapter {
  const db = SQLite.openDatabaseSync(dbName);

  db.execSync('PRAGMA journal_mode = WAL;');
  db.execSync('PRAGMA foreign_keys = ON;');

  return {
    execute(sql: string, params?: unknown[]): void {
      db.runSync(sql, (params ?? []) as SQLiteBindParams);
    },
    query<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] {
      return db.getAllSync<T>(sql, (params ?? []) as SQLiteBindParams);
    },
    transaction(fn: () => void): void {
      db.withTransactionSync(fn);
    },
  };
}
