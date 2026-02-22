import { describe, it, expect } from 'vitest';
import { parseCSV, detectDateFormat } from '../parser';
import { detectDuplicates } from '../duplicates';
import type { CsvProfile } from '../../models/schemas';

function makeProfile(overrides: Partial<CsvProfile> = {}): CsvProfile {
  return {
    id: 'test-profile',
    name: 'Test',
    date_column: 0,
    payee_column: 1,
    amount_column: 2,
    memo_column: null,
    date_format: 'MM/DD/YYYY',
    amount_sign: 'negative_is_outflow',
    debit_column: null,
    credit_column: null,
    skip_rows: 1,
    created_at: '',
    ...overrides,
  };
}

describe('parseCSV', () => {
  it('parses standard CSV with headers', () => {
    const csv = `Date,Payee,Amount
01/15/2026,Whole Foods,-85.23
01/16/2026,Paycheck,3250.00`;

    const result = parseCSV(csv, makeProfile());
    expect(result.transactions).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.totalRows).toBe(2);

    expect(result.transactions[0]).toEqual({
      date: '2026-01-15',
      payee: 'Whole Foods',
      amount: -8523,
      memo: null,
      rowIndex: 0,
    });

    expect(result.transactions[1]).toEqual({
      date: '2026-01-16',
      payee: 'Paycheck',
      amount: 325000,
      memo: null,
      rowIndex: 1,
    });
  });

  it('parses with memo column', () => {
    const csv = `Date,Payee,Amount,Memo
01/15/2026,Whole Foods,-85.23,Weekly groceries`;

    const result = parseCSV(csv, makeProfile({ memo_column: 3 }));
    expect(result.transactions[0].memo).toBe('Weekly groceries');
  });

  describe('date formats', () => {
    it('parses MM/DD/YYYY', () => {
      const csv = `Date,Payee,Amount
01/15/2026,Test,-10.00`;
      const result = parseCSV(csv, makeProfile({ date_format: 'MM/DD/YYYY' }));
      expect(result.transactions[0].date).toBe('2026-01-15');
    });

    it('parses YYYY-MM-DD', () => {
      const csv = `Date,Payee,Amount
2026-01-15,Test,-10.00`;
      const result = parseCSV(csv, makeProfile({ date_format: 'YYYY-MM-DD' }));
      expect(result.transactions[0].date).toBe('2026-01-15');
    });

    it('parses DD/MM/YYYY', () => {
      const csv = `Date,Payee,Amount
15/01/2026,Test,-10.00`;
      const result = parseCSV(csv, makeProfile({ date_format: 'DD/MM/YYYY' }));
      expect(result.transactions[0].date).toBe('2026-01-15');
    });

    it('parses M/D/YY', () => {
      const csv = `Date,Payee,Amount
1/5/26,Test,-10.00`;
      const result = parseCSV(csv, makeProfile({ date_format: 'M/D/YY' }));
      expect(result.transactions[0].date).toBe('2026-01-05');
    });
  });

  describe('amount sign conventions', () => {
    it('negative_is_outflow: negative amounts are outflows', () => {
      const csv = `Date,Payee,Amount
01/15/2026,Store,-50.00
01/16/2026,Income,100.00`;

      const result = parseCSV(csv, makeProfile({ amount_sign: 'negative_is_outflow' }));
      expect(result.transactions[0].amount).toBe(-5000);
      expect(result.transactions[1].amount).toBe(10000);
    });

    it('positive_is_outflow: positive amounts become negative', () => {
      const csv = `Date,Payee,Amount
01/15/2026,Store,50.00
01/16/2026,Refund,-100.00`;

      const result = parseCSV(csv, makeProfile({ amount_sign: 'positive_is_outflow' }));
      expect(result.transactions[0].amount).toBe(-5000);
      expect(result.transactions[1].amount).toBe(10000);
    });

    it('separate_columns: debit and credit in different columns', () => {
      const csv = `Date,Payee,Amount,Debit,Credit
01/15/2026,Store,0,50.00,0
01/16/2026,Income,0,0,100.00`;

      const result = parseCSV(csv, makeProfile({
        amount_sign: 'separate_columns',
        debit_column: 3,
        credit_column: 4,
      }));
      expect(result.transactions[0].amount).toBe(-5000);
      expect(result.transactions[1].amount).toBe(10000);
    });
  });

  it('skips configurable header rows', () => {
    const csv = `Bank Export
Generated: 2026-01-20
Date,Payee,Amount
01/15/2026,Store,-50.00`;

    const result = parseCSV(csv, makeProfile({ skip_rows: 3 }));
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].payee).toBe('Store');
  });

  it('handles quoted fields with commas', () => {
    const csv = `Date,Payee,Amount
01/15/2026,"Smith, John",-50.00`;

    const result = parseCSV(csv, makeProfile());
    expect(result.transactions[0].payee).toBe('Smith, John');
  });

  it('handles parenthetical negative amounts', () => {
    const csv = `Date,Payee,Amount
01/15/2026,Store,(50.00)`;

    const result = parseCSV(csv, makeProfile());
    expect(result.transactions[0].amount).toBe(-5000);
  });

  it('handles currency symbols and commas in amounts', () => {
    const csv = `Date,Payee,Amount
01/15/2026,Store,"$1,234.56"`;

    const result = parseCSV(csv, makeProfile());
    expect(result.transactions[0].amount).toBe(123456);
  });

  it('reports errors for missing date or payee', () => {
    const csv = `Date,Payee,Amount
,Store,-50.00
01/15/2026,,-50.00`;

    const result = parseCSV(csv, makeProfile());
    expect(result.transactions).toHaveLength(0);
    expect(result.errors).toHaveLength(2);
  });

  it('reports errors for invalid dates', () => {
    const csv = `Date,Payee,Amount
not-a-date,Store,-50.00`;

    const result = parseCSV(csv, makeProfile());
    expect(result.transactions).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('Invalid date');
  });

  it('handles empty rows gracefully', () => {
    const csv = `Date,Payee,Amount
01/15/2026,Store,-50.00

01/16/2026,Shop,-25.00`;

    const result = parseCSV(csv, makeProfile());
    expect(result.transactions).toHaveLength(2);
  });

  it('parses Chase-style CSV format', () => {
    const csv = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
01/15/2026,01/16/2026,WHOLE FOODS #1234,Groceries,Sale,-85.23,`;

    const profile = makeProfile({
      date_column: 0,
      payee_column: 2,
      amount_column: 5,
      memo_column: 6,
      date_format: 'MM/DD/YYYY',
      amount_sign: 'negative_is_outflow',
    });

    const result = parseCSV(csv, profile);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].payee).toBe('WHOLE FOODS #1234');
    expect(result.transactions[0].amount).toBe(-8523);
  });

  it('parses Amex-style CSV format (positive_is_outflow)', () => {
    const csv = `Date,Description,Amount
01/15/2026,WHOLE FOODS,85.23
01/16/2026,PAYMENT RECEIVED,-500.00`;

    const profile = makeProfile({
      amount_sign: 'positive_is_outflow',
    });

    const result = parseCSV(csv, profile);
    expect(result.transactions[0].amount).toBe(-8523);
    expect(result.transactions[1].amount).toBe(50000);
  });
});

describe('detectDateFormat', () => {
  it('detects MM/DD/YYYY from samples', () => {
    const result = detectDateFormat(['01/15/2026', '02/28/2026', '12/01/2026']);
    expect(result).toBe('MM/DD/YYYY');
  });

  it('detects YYYY-MM-DD from samples', () => {
    const result = detectDateFormat(['2026-01-15', '2026-02-28']);
    expect(result).toBe('YYYY-MM-DD');
  });

  it('detects M/D/YY from samples', () => {
    const result = detectDateFormat(['1/5/26', '12/1/25']);
    expect(result).toBe('M/D/YY');
  });

  it('disambiguates DD/MM/YYYY when first value > 12', () => {
    const result = detectDateFormat(['15/01/2026', '20/06/2026']);
    expect(result).toBe('DD/MM/YYYY');
  });

  it('disambiguates MM/DD/YYYY when second value > 12', () => {
    const result = detectDateFormat(['01/15/2026', '06/20/2026']);
    expect(result).toBe('MM/DD/YYYY');
  });

  it('defaults to MM/DD/YYYY when ambiguous', () => {
    // Both values <= 12, no way to tell
    const result = detectDateFormat(['01/02/2026', '03/04/2026']);
    expect(result).toBe('MM/DD/YYYY');
  });

  it('returns null for unrecognized format', () => {
    const result = detectDateFormat(['Jan 15, 2026', 'Feb 28, 2026']);
    expect(result).toBeNull();
  });
});

describe('detectDuplicates', () => {
  it('flags exact matches as duplicates', () => {
    const parsed = [
      { date: '2026-01-15', payee: 'Store', amount: -5000, memo: null, rowIndex: 0 },
      { date: '2026-01-16', payee: 'Shop', amount: -2500, memo: null, rowIndex: 1 },
    ];
    const existing = [
      { date: '2026-01-15', payee: 'Store', amount: -5000 },
    ];

    const result = detectDuplicates(parsed, existing);
    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0].payee).toBe('Store');
    expect(result.unique).toHaveLength(1);
    expect(result.unique[0].payee).toBe('Shop');
  });

  it('does not flag different amounts as duplicates', () => {
    const parsed = [
      { date: '2026-01-15', payee: 'Store', amount: -5000, memo: null, rowIndex: 0 },
    ];
    const existing = [
      { date: '2026-01-15', payee: 'Store', amount: -3000 },
    ];

    const result = detectDuplicates(parsed, existing);
    expect(result.duplicates).toHaveLength(0);
    expect(result.unique).toHaveLength(1);
  });

  it('returns all as unique when no existing transactions', () => {
    const parsed = [
      { date: '2026-01-15', payee: 'Store', amount: -5000, memo: null, rowIndex: 0 },
    ];

    const result = detectDuplicates(parsed, []);
    expect(result.duplicates).toHaveLength(0);
    expect(result.unique).toHaveLength(1);
  });
});
