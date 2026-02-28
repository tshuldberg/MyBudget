/**
 * Database adapter for the web app.
 * Wraps better-sqlite3 in the shared DatabaseAdapter interface.
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { initializeDatabase } from '@mybudget/shared';
import type { DatabaseAdapter } from '@mybudget/shared';

const DB_PATH = path.join(process.cwd(), '.data', 'mybudget-web.sqlite');

let _db: Database.Database | null = null;

function getRawDb(): Database.Database {
  if (!_db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

/**
 * DatabaseAdapter implementation for better-sqlite3.
 * Compatible with all @mybudget/shared CRUD functions.
 */
export function getAdapter(): DatabaseAdapter {
  const raw = getRawDb();

  return {
    execute(sql: string, params?: unknown[]): void {
      if (params && params.length > 0) {
        raw.prepare(sql).run(...params);
      } else {
        raw.exec(sql);
      }
    },

    query<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] {
      const stmt = raw.prepare(sql);
      if (params && params.length > 0) {
        return stmt.all(...params) as T[];
      }
      return stmt.all() as T[];
    },

    transaction(fn: () => void): void {
      const trx = raw.transaction(fn);
      trx();
    },
  };
}

let _initialized = false;

/**
 * Get an initialized database adapter.
 * Runs migrations on first call, then returns cached adapter.
 */
export function getDb(): DatabaseAdapter {
  const adapter = getAdapter();
  if (!_initialized) {
    initializeDatabase(adapter);
    _initialized = true;
  }
  return adapter;
}
