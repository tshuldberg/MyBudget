/**
 * Migration runner for MyBudget SQLite database.
 *
 * Uses a simple version-based approach:
 * - Stores current schema version in `preferences` table
 * - Runs migrations sequentially from current version to latest
 * - Each migration is a list of SQL statements executed in a transaction
 *
 * The database adapter interface is minimal so both expo-sqlite (mobile)
 * and better-sqlite3 (web) can implement it.
 */

import {
  BANK_SYNC_INDEXES,
  BANK_SYNC_TABLES,
  CORE_INDEXES,
  CORE_TABLES,
  GOALS_RULES_INDEXES,
  GOALS_RULES_TABLES,
  SCHEMA_VERSION,
} from './schema';

/**
 * Minimal database adapter interface.
 * Implementations wrap expo-sqlite or better-sqlite3.
 */
export interface DatabaseAdapter {
  /** Execute a single SQL statement with optional parameters. */
  execute(sql: string, params?: unknown[]): void;
  /** Execute a SQL query and return all rows. */
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[];
  /** Run a function inside a transaction. Rolls back on error. */
  transaction(fn: () => void): void;
}

export interface Migration {
  version: number;
  description: string;
  statements: string[];
}

/**
 * Migration 1: Initial schema bootstrap.
 */
const migration001: Migration = {
  version: 1,
  description: 'Initial schema bootstrap',
  statements: [...CORE_TABLES, ...CORE_INDEXES],
};

/**
 * Migration 2: Add bank sync scaffolding tables and indexes.
 */
const migration002: Migration = {
  version: 2,
  description: 'Bank sync scaffolding tables and indexes',
  statements: [...BANK_SYNC_TABLES, ...BANK_SYNC_INDEXES],
};

/**
 * Migration 3: Add goals and transaction rules tables.
 */
const migration003: Migration = {
  version: 3,
  description: 'Goals and transaction rules tables',
  statements: [...GOALS_RULES_TABLES, ...GOALS_RULES_INDEXES],
};

/**
 * All migrations in order. Add new migrations here.
 */
export const MIGRATIONS: Migration[] = [migration001, migration002, migration003];

/**
 * The preference key used to track schema version.
 */
const VERSION_KEY = 'schema_version';

/**
 * Ensure the preferences table exists (bootstrap step).
 * Called before reading version so migration 1 can work.
 */
function ensurePreferencesTable(db: DatabaseAdapter): void {
  db.execute(`
    CREATE TABLE IF NOT EXISTS preferences (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
}

/**
 * Get the current schema version from the database.
 * Returns 0 if no version is set (fresh database).
 */
function getSchemaVersion(db: DatabaseAdapter): number {
  const rows = db.query<{ value: string }>(
    `SELECT value FROM preferences WHERE key = ?`,
    [VERSION_KEY],
  );
  if (rows.length === 0) return 0;
  return parseInt(rows[0].value, 10) || 0;
}

/**
 * Set the schema version in preferences.
 */
function setSchemaVersion(db: DatabaseAdapter, version: number): void {
  db.execute(
    `INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)`,
    [VERSION_KEY, String(version)],
  );
}

/**
 * Run all pending migrations to bring the database up to date.
 *
 * @returns The number of migrations that were applied.
 */
export function runMigrations(db: DatabaseAdapter): number {
  ensurePreferencesTable(db);

  const currentVersion = getSchemaVersion(db);
  const pendingMigrations = MIGRATIONS.filter((m) => m.version > currentVersion);

  if (pendingMigrations.length === 0) return 0;

  // Enable foreign keys
  db.execute('PRAGMA foreign_keys = ON;');

  let applied = 0;
  for (const migration of pendingMigrations) {
    db.transaction(() => {
      for (const sql of migration.statements) {
        db.execute(sql);
      }
      setSchemaVersion(db, migration.version);
    });
    applied++;
  }

  return applied;
}

/**
 * Initialize the database: run all pending migrations.
 * Safe to call multiple times — idempotent.
 *
 * @returns Object with the final schema version and number of migrations applied.
 */
export function initializeDatabase(db: DatabaseAdapter): {
  version: number;
  migrationsApplied: number;
} {
  const migrationsApplied = runMigrations(db);
  return {
    version: SCHEMA_VERSION,
    migrationsApplied,
  };
}
