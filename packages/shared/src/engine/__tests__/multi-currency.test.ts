/**
 * Tests for the multi-currency conversion engine.
 *
 * Exchange rates stored as integers (rate * 1_000_000) for precision.
 * All monetary amounts in integer cents.
 */

import { describe, it, expect } from 'vitest';
import {
  convertAmount,
  formatCurrencyAmount,
  convertToBase,
  RATE_PRECISION,
  type ExchangeRate,
  type CurrencyInfo,
} from '../multi-currency';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const USD: CurrencyInfo = { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2, isBase: true };
const EUR: CurrencyInfo = { code: 'EUR', name: 'Euro', symbol: '\u20AC', decimalPlaces: 2, isBase: false };
const GBP: CurrencyInfo = { code: 'GBP', name: 'British Pound', symbol: '\u00A3', decimalPlaces: 2, isBase: false };
const JPY: CurrencyInfo = { code: 'JPY', name: 'Japanese Yen', symbol: '\u00A5', decimalPlaces: 0, isBase: false };

const currencies: CurrencyInfo[] = [USD, EUR, GBP, JPY];

function makeRate(from: string, to: string, decimalRate: string): ExchangeRate {
  return {
    fromCurrency: from,
    toCurrency: to,
    rate: Math.round(parseFloat(decimalRate) * RATE_PRECISION),
    rateDecimal: decimalRate,
  };
}

// ---------------------------------------------------------------------------
// convertAmount
// ---------------------------------------------------------------------------

describe('convertAmount', () => {
  it('converts using a 1:1 rate', () => {
    const rate = 1 * RATE_PRECISION; // 1.0
    expect(convertAmount(10000, rate)).toBe(10000);
  });

  it('converts EUR to USD (1 EUR = 1.08 USD)', () => {
    const rate = 1_080_000; // 1.08
    expect(convertAmount(10000, rate)).toBe(10800); // 100 EUR -> 108 USD
  });

  it('converts GBP to USD (1 GBP = 1.27 USD)', () => {
    const rate = 1_270_000; // 1.27
    expect(convertAmount(10000, rate)).toBe(12700); // 100 GBP -> 127 USD
  });

  it('handles small amounts without losing precision', () => {
    const rate = 1_080_000; // 1.08
    expect(convertAmount(1, rate)).toBe(1); // 0.01 EUR -> 0.01 USD (rounded)
  });

  it('handles large amounts', () => {
    const rate = 1_080_000;
    expect(convertAmount(10000000, rate)).toBe(10800000); // $100,000 EUR -> $108,000 USD
  });

  it('handles rates less than 1', () => {
    const rate = 925_926; // ~0.925926 (USD to EUR inverse of 1.08)
    expect(convertAmount(10000, rate)).toBe(9259); // 100 USD -> ~92.59 EUR
  });

  it('rounds to nearest integer cent', () => {
    const rate = 1_333_333; // 1.333333
    // 10000 * 1333333 / 1000000 = 13333.33 -> rounds to 13333
    expect(convertAmount(10000, rate)).toBe(13333);
  });
});

// ---------------------------------------------------------------------------
// formatCurrencyAmount
// ---------------------------------------------------------------------------

describe('formatCurrencyAmount', () => {
  it('formats USD with dollar sign', () => {
    expect(formatCurrencyAmount(12550, 'USD', currencies)).toBe('$125.50');
  });

  it('formats EUR with euro sign', () => {
    expect(formatCurrencyAmount(9999, 'EUR', currencies)).toBe('\u20AC99.99');
  });

  it('formats GBP with pound sign', () => {
    expect(formatCurrencyAmount(5000, 'GBP', currencies)).toBe('\u00A350.00');
  });

  it('formats JPY with no decimal places', () => {
    const result = formatCurrencyAmount(1250, 'JPY', currencies);
    expect(result).toContain('1,250');
  });

  it('formats zero amount', () => {
    expect(formatCurrencyAmount(0, 'USD', currencies)).toBe('$0.00');
  });

  it('falls back to currency code for unknown currencies', () => {
    const result = formatCurrencyAmount(5000, 'CHF', currencies);
    expect(result).toContain('CHF');
    expect(result).toContain('50.00');
  });
});

// ---------------------------------------------------------------------------
// convertToBase
// ---------------------------------------------------------------------------

describe('convertToBase', () => {
  it('returns same amount when currencies match', () => {
    const rates: ExchangeRate[] = [];
    expect(convertToBase(10000, 'USD', 'USD', rates)).toBe(10000);
  });

  it('converts using direct rate', () => {
    const rates = [makeRate('EUR', 'USD', '1.08')];
    const result = convertToBase(10000, 'EUR', 'USD', rates);
    expect(result).toBe(10800);
  });

  it('converts using inverse rate when direct is not available', () => {
    const rates = [makeRate('USD', 'EUR', '0.925926')];
    const result = convertToBase(10000, 'EUR', 'USD', rates);
    // Inverse of 0.925926 = ~1.08
    // Should be approximately 10800
    expect(result).toBeGreaterThan(10790);
    expect(result).toBeLessThan(10810);
  });

  it('throws when no rate is found', () => {
    const rates: ExchangeRate[] = [];
    expect(() => convertToBase(10000, 'EUR', 'USD', rates)).toThrow(
      'No exchange rate found for EUR -> USD',
    );
  });

  it('handles multiple rates and picks the correct one', () => {
    const rates = [
      makeRate('GBP', 'USD', '1.27'),
      makeRate('EUR', 'USD', '1.08'),
    ];
    expect(convertToBase(10000, 'EUR', 'USD', rates)).toBe(10800);
    expect(convertToBase(10000, 'GBP', 'USD', rates)).toBe(12700);
  });
});
