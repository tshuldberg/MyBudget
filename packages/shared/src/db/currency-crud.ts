/**
 * Currencies and exchange rates CRUD operations.
 *
 * Currencies define available monetary units with symbol and decimal info.
 * Exchange rates store conversion factors as integers (rate * 1_000_000)
 * plus an exact decimal string.
 */

import type { DatabaseAdapter } from './migrations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CurrencyRow {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isBase: boolean;
  createdAt: string;
}

export interface CurrencyInsert {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isBase?: boolean;
}

export interface ExchangeRateRow {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;         // integer: actual rate * 1_000_000
  rateDecimal: string;  // exact string, e.g. "1.08"
  fetchedAt: string;
}

export interface ExchangeRateInsert {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  rateDecimal: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;

function generateId(): string {
  _idCounter++;
  return `rate-${Date.now()}-${_idCounter}`;
}

function rowToCurrency(row: Record<string, unknown>): CurrencyRow {
  return {
    code: row.code as string,
    name: row.name as string,
    symbol: row.symbol as string,
    decimalPlaces: row.decimal_places as number,
    isBase: row.is_base === 1 || row.is_base === true,
    createdAt: row.created_at as string,
  };
}

function rowToExchangeRate(row: Record<string, unknown>): ExchangeRateRow {
  return {
    id: row.id as string,
    fromCurrency: row.from_currency as string,
    toCurrency: row.to_currency as string,
    rate: row.rate as number,
    rateDecimal: row.rate_decimal as string,
    fetchedAt: row.fetched_at as string,
  };
}

// ---------------------------------------------------------------------------
// Currency CRUD
// ---------------------------------------------------------------------------

export function createCurrency(db: DatabaseAdapter, input: CurrencyInsert): CurrencyRow {
  if (!input.code || input.code.trim() === '') {
    throw new Error('Currency code must be non-empty');
  }

  const now = new Date().toISOString();

  db.execute(
    `INSERT INTO currencies (code, name, symbol, decimal_places, is_base, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [input.code, input.name, input.symbol, input.decimalPlaces, input.isBase ? 1 : 0, now],
  );

  return {
    code: input.code,
    name: input.name,
    symbol: input.symbol,
    decimalPlaces: input.decimalPlaces,
    isBase: input.isBase ?? false,
    createdAt: now,
  };
}

export function getCurrency(db: DatabaseAdapter, code: string): CurrencyRow | null {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM currencies WHERE code = ?`,
    [code],
  );
  if (rows.length === 0) return null;
  return rowToCurrency(rows[0]);
}

export function listCurrencies(db: DatabaseAdapter): CurrencyRow[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM currencies ORDER BY is_base DESC, code ASC`,
  );
  return rows.map(rowToCurrency);
}

export function getBaseCurrency(db: DatabaseAdapter): CurrencyRow | null {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM currencies WHERE is_base = ?`,
    [1],
  );
  if (rows.length === 0) return null;
  return rowToCurrency(rows[0]);
}

export function deleteCurrency(db: DatabaseAdapter, code: string): void {
  db.execute(`DELETE FROM currencies WHERE code = ?`, [code]);
}

// ---------------------------------------------------------------------------
// Exchange Rate CRUD
// ---------------------------------------------------------------------------

export function upsertExchangeRate(db: DatabaseAdapter, input: ExchangeRateInsert): ExchangeRateRow {
  const now = new Date().toISOString();

  // Check for existing rate for this pair
  const existing = db.query<Record<string, unknown>>(
    `SELECT * FROM exchange_rates WHERE from_currency = ? AND to_currency = ?`,
    [input.fromCurrency, input.toCurrency],
  );

  if (existing.length > 0) {
    const id = existing[0].id as string;
    db.execute(
      `UPDATE exchange_rates SET rate = ?, rate_decimal = ?, fetched_at = ? WHERE id = ?`,
      [input.rate, input.rateDecimal, now, id],
    );
    return {
      id,
      fromCurrency: input.fromCurrency,
      toCurrency: input.toCurrency,
      rate: input.rate,
      rateDecimal: input.rateDecimal,
      fetchedAt: now,
    };
  }

  const id = generateId();

  db.execute(
    `INSERT INTO exchange_rates (id, from_currency, to_currency, rate, rate_decimal, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.fromCurrency, input.toCurrency, input.rate, input.rateDecimal, now],
  );

  return {
    id,
    fromCurrency: input.fromCurrency,
    toCurrency: input.toCurrency,
    rate: input.rate,
    rateDecimal: input.rateDecimal,
    fetchedAt: now,
  };
}

export function getExchangeRate(
  db: DatabaseAdapter,
  fromCurrency: string,
  toCurrency: string,
): ExchangeRateRow | null {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM exchange_rates WHERE from_currency = ? AND to_currency = ?`,
    [fromCurrency, toCurrency],
  );
  if (rows.length === 0) return null;
  return rowToExchangeRate(rows[0]);
}

export function listExchangeRates(db: DatabaseAdapter): ExchangeRateRow[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM exchange_rates ORDER BY from_currency, to_currency`,
  );
  return rows.map(rowToExchangeRate);
}

export function deleteExchangeRate(db: DatabaseAdapter, id: string): void {
  db.execute(`DELETE FROM exchange_rates WHERE id = ?`, [id]);
}
