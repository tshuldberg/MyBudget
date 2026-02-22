/**
 * Duplicate detection for CSV imports.
 * Compares parsed transactions against existing ones to prevent double-imports.
 */

import type { ParsedTransaction } from './parser';

export interface ExistingTransaction {
  date: string;
  payee: string;
  amount: number;
}

export interface DuplicateResult {
  /** Transactions that appear to be duplicates of existing records */
  duplicates: ParsedTransaction[];
  /** Transactions that are new (safe to import) */
  unique: ParsedTransaction[];
}

/**
 * Detect potential duplicates by matching date + payee + amount.
 * A transaction is a duplicate if an existing record has the same
 * (date, payee, amount) tuple.
 */
export function detectDuplicates(
  parsed: ParsedTransaction[],
  existing: ExistingTransaction[],
): DuplicateResult {
  const existingSet = new Set(
    existing.map((tx) => `${tx.date}|${tx.payee}|${tx.amount}`),
  );

  const duplicates: ParsedTransaction[] = [];
  const unique: ParsedTransaction[] = [];

  for (const tx of parsed) {
    const key = `${tx.date}|${tx.payee}|${tx.amount}`;
    if (existingSet.has(key)) {
      duplicates.push(tx);
    } else {
      unique.push(tx);
    }
  }

  return { duplicates, unique };
}
