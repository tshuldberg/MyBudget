/**
 * CSV import parser for MyBudget.
 * Parses CSV content using a profile that maps columns to fields.
 * Supports multiple date formats and amount sign conventions.
 */

import type { CsvProfile } from '../models/schemas';

export interface ParsedTransaction {
  date: string; // YYYY-MM-DD
  payee: string;
  memo: string | null;
  /** Amount in cents, negative = outflow, positive = inflow */
  amount: number;
  /** Original row index (0-based, after skipping header rows) */
  rowIndex: number;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  errors: Array<{ row: number; message: string }>;
  totalRows: number;
}

const DATE_FORMATS: Record<string, RegExp> = {
  'MM/DD/YYYY': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  'YYYY-MM-DD': /^(\d{4})-(\d{2})-(\d{2})$/,
  'DD/MM/YYYY': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  'M/D/YY': /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,
};

/**
 * Parse CSV content using a profile.
 */
export function parseCSV(content: string, profile: CsvProfile): ParseResult {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const dataLines = lines.slice(profile.skip_rows);

  const transactions: ParsedTransaction[] = [];
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < dataLines.length; i++) {
    const row = profile.skip_rows + i;
    const columns = parseCSVLine(dataLines[i]);

    try {
      const dateRaw = columns[profile.date_column]?.trim();
      const payee = columns[profile.payee_column]?.trim();
      const memo = profile.memo_column != null ? columns[profile.memo_column]?.trim() || null : null;

      if (!dateRaw || !payee) {
        errors.push({ row, message: 'Missing date or payee' });
        continue;
      }

      const date = parseDate(dateRaw, profile.date_format);
      if (!date) {
        errors.push({ row, message: `Invalid date: ${dateRaw}` });
        continue;
      }

      let amount: number;
      if (profile.amount_sign === 'separate_columns') {
        const debit = parseAmount(columns[profile.debit_column!]?.trim() || '0');
        const credit = parseAmount(columns[profile.credit_column!]?.trim() || '0');
        amount = credit - debit; // credit = inflow (positive), debit = outflow (negative)
      } else {
        const rawAmount = parseAmount(columns[profile.amount_column]?.trim() || '');
        if (isNaN(rawAmount)) {
          errors.push({ row, message: `Invalid amount` });
          continue;
        }
        amount = profile.amount_sign === 'positive_is_outflow' ? -rawAmount : rawAmount;
      }

      transactions.push({ date, payee, memo, amount, rowIndex: i });
    } catch {
      errors.push({ row, message: 'Failed to parse row' });
    }
  }

  return { transactions, errors, totalRows: dataLines.length };
}

/**
 * Detect the most likely date format from sample values.
 */
export function detectDateFormat(samples: string[]): string | null {
  const candidates: Array<{ format: string; matches: number }> = [];

  for (const [format, regex] of Object.entries(DATE_FORMATS)) {
    let matches = 0;
    for (const sample of samples) {
      if (regex.test(sample.trim())) matches++;
    }
    if (matches > 0) candidates.push({ format, matches });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.matches - a.matches);

  // Disambiguate MM/DD/YYYY vs DD/MM/YYYY by checking if any day value > 12
  if (
    candidates[0].format === 'MM/DD/YYYY' ||
    candidates[0].format === 'DD/MM/YYYY'
  ) {
    for (const sample of samples) {
      const parts = sample.trim().split('/');
      if (parts.length >= 2) {
        const first = parseInt(parts[0], 10);
        const second = parseInt(parts[1], 10);
        if (first > 12) return 'DD/MM/YYYY';
        if (second > 12) return 'MM/DD/YYYY';
      }
    }
    // Default to MM/DD/YYYY (US convention)
    return 'MM/DD/YYYY';
  }

  return candidates[0].format;
}

// --- Internal helpers ---

function parseDate(raw: string, format: string): string | null {
  const trimmed = raw.trim();

  if (format === 'YYYY-MM-DD') {
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    return trimmed;
  }

  if (format === 'MM/DD/YYYY') {
    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;
    return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
  }

  if (format === 'DD/MM/YYYY') {
    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }

  if (format === 'M/D/YY') {
    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
    if (!match) return null;
    const year = parseInt(match[3], 10);
    const fullYear = year >= 70 ? 1900 + year : 2000 + year;
    return `${fullYear}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
  }

  return null;
}

function parseAmount(raw: string): number {
  if (!raw) return NaN;
  // Remove currency symbols, commas, spaces
  const cleaned = raw.replace(/[$,\s]/g, '').replace(/\((.+)\)/, '-$1');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return NaN;
  // Convert dollars to cents
  return Math.round(num * 100);
}

/**
 * Parse a single CSV line, handling quoted fields.
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}
