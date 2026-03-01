'use server';

import { getDb } from './db';
import {
  createTransactionRule as _createRule,
  updateTransactionRule as _updateRule,
  deleteTransactionRule as _deleteRule,
  getTransactionRules as _getRules,
  getTransactionRuleById as _getRuleById,
} from '@mybudget/shared';
import type { TransactionRule, TransactionRuleInsert } from '@mybudget/shared';
import { randomUUID } from 'crypto';

export async function fetchTransactionRules(): Promise<TransactionRule[]> {
  return _getRules(getDb());
}

export async function fetchTransactionRuleById(id: string): Promise<TransactionRule | null> {
  return _getRuleById(getDb(), id);
}

export async function createTransactionRule(input: TransactionRuleInsert): Promise<TransactionRule> {
  return _createRule(getDb(), randomUUID(), input);
}

export async function updateTransactionRule(
  id: string,
  updates: Partial<Pick<TransactionRule, 'payee_pattern' | 'match_type' | 'category_id' | 'is_enabled' | 'priority'>>,
): Promise<void> {
  _updateRule(getDb(), id, updates);
}

export async function deleteTransactionRule(id: string): Promise<void> {
  _deleteRule(getDb(), id);
}

/** Count transactions matching a given payee pattern */
export async function testRuleMatches(
  payeePattern: string,
  matchType: 'contains' | 'exact' | 'starts_with',
): Promise<number> {
  const db = getDb();
  let sql: string;
  let params: string[];

  switch (matchType) {
    case 'contains':
      sql = `SELECT COUNT(*) as cnt FROM transactions WHERE LOWER(payee) LIKE ?`;
      params = [`%${payeePattern.toLowerCase()}%`];
      break;
    case 'starts_with':
      sql = `SELECT COUNT(*) as cnt FROM transactions WHERE LOWER(payee) LIKE ?`;
      params = [`${payeePattern.toLowerCase()}%`];
      break;
    case 'exact':
      sql = `SELECT COUNT(*) as cnt FROM transactions WHERE LOWER(payee) = ?`;
      params = [payeePattern.toLowerCase()];
      break;
  }

  const rows = db.query<{ cnt: number }>(sql, params);
  return rows[0]?.cnt ?? 0;
}
