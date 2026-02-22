/**
 * CSV profile CRUD — save and load column mapping profiles.
 */

import type { DatabaseAdapter } from '../db/migrations';
import type { CsvProfile, CsvProfileInsert } from '../models/schemas';

export function saveCsvProfile(
  db: DatabaseAdapter,
  id: string,
  input: CsvProfileInsert,
): CsvProfile {
  const now = new Date().toISOString();
  const memoColumn = input.memo_column ?? null;
  const debitColumn = input.debit_column ?? null;
  const creditColumn = input.credit_column ?? null;
  const skipRows = input.skip_rows ?? 1;

  db.execute(
    `INSERT INTO csv_profiles (id, name, date_column, payee_column, amount_column, memo_column, date_format, amount_sign, debit_column, credit_column, skip_rows, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.name, input.date_column, input.payee_column, input.amount_column, memoColumn, input.date_format, input.amount_sign, debitColumn, creditColumn, skipRows, now],
  );

  return {
    id,
    name: input.name,
    date_column: input.date_column,
    payee_column: input.payee_column,
    amount_column: input.amount_column,
    memo_column: memoColumn,
    date_format: input.date_format,
    amount_sign: input.amount_sign,
    debit_column: debitColumn,
    credit_column: creditColumn,
    skip_rows: skipRows,
    created_at: now,
  };
}

export function loadCsvProfiles(db: DatabaseAdapter): CsvProfile[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM csv_profiles ORDER BY name`,
  );
  return rows.map(rowToProfile);
}

export function deleteCsvProfile(db: DatabaseAdapter, id: string): void {
  db.execute(`DELETE FROM csv_profiles WHERE id = ?`, [id]);
}

function rowToProfile(row: Record<string, unknown>): CsvProfile {
  return {
    id: row.id as string,
    name: row.name as string,
    date_column: row.date_column as number,
    payee_column: row.payee_column as number,
    amount_column: row.amount_column as number,
    memo_column: (row.memo_column as number) ?? null,
    date_format: row.date_format as string,
    amount_sign: row.amount_sign as CsvProfile['amount_sign'],
    debit_column: (row.debit_column as number) ?? null,
    credit_column: (row.credit_column as number) ?? null,
    skip_rows: row.skip_rows as number,
    created_at: row.created_at as string,
  };
}
