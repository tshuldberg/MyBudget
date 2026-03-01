'use server';

import { getDb } from './db';
import {
  createCurrency as _createCurrency,
  listCurrencies as _listCurrencies,
  upsertExchangeRate as _upsertExchangeRate,
  listExchangeRates as _listExchangeRates,
  RATE_PRECISION,
} from '@mybudget/shared';
import type {
  CurrencyRow,
  ExchangeRateRow,
} from '@mybudget/shared';

export async function fetchCurrencies(): Promise<CurrencyRow[]> {
  return _listCurrencies(getDb());
}

export async function addCurrency(
  code: string,
  name: string,
  symbol: string,
): Promise<CurrencyRow> {
  return _createCurrency(getDb(), {
    code: code.toUpperCase(),
    name,
    symbol,
    decimalPlaces: 2,
  });
}

export async function setExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  rateDecimal: string,
): Promise<ExchangeRateRow> {
  const rateNum = parseFloat(rateDecimal);
  const rateInt = Math.round(rateNum * RATE_PRECISION);
  return _upsertExchangeRate(getDb(), {
    fromCurrency: fromCurrency.toUpperCase(),
    toCurrency: toCurrency.toUpperCase(),
    rate: rateInt,
    rateDecimal,
  });
}

export async function fetchExchangeRates(): Promise<ExchangeRateRow[]> {
  return _listExchangeRates(getDb());
}
