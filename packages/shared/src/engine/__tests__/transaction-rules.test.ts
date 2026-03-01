/**
 * TDD tests for transaction rules engine.
 *
 * Transaction rules allow users to define auto-categorization and
 * transformation rules that apply to incoming transactions. Rules match
 * on payee patterns, amount ranges, and account filters, then apply
 * actions like setting a category, renaming the payee, or adding a memo.
 *
 * All amounts in integer cents.
 */

import { describe, it, expect } from 'vitest';
import {
  matchRule,
  applyRules,
  evaluateConditions,
  type TransactionRule,
  type RuleCondition,
  type RuleAction,
  type TransactionInput,
  type RuleMatch,
} from '../transaction-rules';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeTransaction(overrides: Partial<TransactionInput> = {}): TransactionInput {
  return {
    payee: 'Test Payee',
    amount: -5000,
    date: '2026-02-15',
    accountId: 'acct-1',
    memo: null,
    categoryId: null,
    ...overrides,
  };
}

function makeRule(overrides: Partial<TransactionRule> = {}): TransactionRule {
  return {
    id: 'rule-1',
    name: 'Test Rule',
    priority: 0,
    isActive: true,
    conditions: [],
    actions: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// evaluateConditions
// ---------------------------------------------------------------------------

describe('evaluateConditions', () => {
  it('matches payee "contains" condition (case-insensitive)', () => {
    const conditions: RuleCondition[] = [
      { field: 'payee', operator: 'contains', value: 'netflix' },
    ];
    const txn = makeTransaction({ payee: 'NETFLIX * Monthly' });

    expect(evaluateConditions(conditions, txn)).toBe(true);
  });

  it('matches payee "equals" condition exactly (case-insensitive)', () => {
    const conditions: RuleCondition[] = [
      { field: 'payee', operator: 'equals', value: 'Starbucks' },
    ];

    expect(evaluateConditions(conditions, makeTransaction({ payee: 'starbucks' }))).toBe(true);
    expect(evaluateConditions(conditions, makeTransaction({ payee: 'Starbucks Coffee' }))).toBe(false);
  });

  it('matches payee "starts_with" condition', () => {
    const conditions: RuleCondition[] = [
      { field: 'payee', operator: 'starts_with', value: 'AMZ' },
    ];

    expect(evaluateConditions(conditions, makeTransaction({ payee: 'AMZN Mktp US' }))).toBe(true);
    expect(evaluateConditions(conditions, makeTransaction({ payee: 'Something AMZ' }))).toBe(false);
  });

  it('matches payee "regex" condition', () => {
    const conditions: RuleCondition[] = [
      { field: 'payee', operator: 'regex', value: '^(uber|lyft)\\s' },
    ];

    expect(evaluateConditions(conditions, makeTransaction({ payee: 'Uber Trip' }))).toBe(true);
    expect(evaluateConditions(conditions, makeTransaction({ payee: 'Lyft Ride' }))).toBe(true);
    expect(evaluateConditions(conditions, makeTransaction({ payee: 'Not Uber' }))).toBe(false);
  });

  it('matches amount "greater_than" condition', () => {
    const conditions: RuleCondition[] = [
      { field: 'amount', operator: 'greater_than', value: -10000 },
    ];

    expect(evaluateConditions(conditions, makeTransaction({ amount: -5000 }))).toBe(true);
    expect(evaluateConditions(conditions, makeTransaction({ amount: -15000 }))).toBe(false);
  });

  it('matches amount "less_than" condition', () => {
    const conditions: RuleCondition[] = [
      { field: 'amount', operator: 'less_than', value: -10000 },
    ];

    expect(evaluateConditions(conditions, makeTransaction({ amount: -15000 }))).toBe(true);
    expect(evaluateConditions(conditions, makeTransaction({ amount: -5000 }))).toBe(false);
  });

  it('matches amount "between" condition', () => {
    const conditions: RuleCondition[] = [
      { field: 'amount', operator: 'between', value: [-20000, -10000] },
    ];

    expect(evaluateConditions(conditions, makeTransaction({ amount: -15000 }))).toBe(true);
    expect(evaluateConditions(conditions, makeTransaction({ amount: -5000 }))).toBe(false);
    expect(evaluateConditions(conditions, makeTransaction({ amount: -25000 }))).toBe(false);
  });

  it('matches account_id "equals" condition', () => {
    const conditions: RuleCondition[] = [
      { field: 'account_id', operator: 'equals', value: 'acct-checking' },
    ];

    expect(evaluateConditions(conditions, makeTransaction({ accountId: 'acct-checking' }))).toBe(true);
    expect(evaluateConditions(conditions, makeTransaction({ accountId: 'acct-savings' }))).toBe(false);
  });

  it('requires ALL conditions to match (AND logic)', () => {
    const conditions: RuleCondition[] = [
      { field: 'payee', operator: 'contains', value: 'uber' },
      { field: 'amount', operator: 'less_than', value: -2000 },
    ];

    // Both match
    expect(evaluateConditions(conditions, makeTransaction({ payee: 'Uber Trip', amount: -3500 }))).toBe(true);
    // Payee matches, amount does not
    expect(evaluateConditions(conditions, makeTransaction({ payee: 'Uber Trip', amount: -1000 }))).toBe(false);
    // Amount matches, payee does not
    expect(evaluateConditions(conditions, makeTransaction({ payee: 'Lyft', amount: -3500 }))).toBe(false);
  });

  it('returns true for empty conditions (matches everything)', () => {
    expect(evaluateConditions([], makeTransaction())).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// matchRule
// ---------------------------------------------------------------------------

describe('matchRule', () => {
  it('returns a match when conditions are met', () => {
    const rule = makeRule({
      conditions: [{ field: 'payee', operator: 'contains', value: 'netflix' }],
      actions: [{ type: 'set_category', categoryId: 'cat-entertainment' }],
    });

    const result = matchRule(rule, makeTransaction({ payee: 'NETFLIX' }));
    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe('rule-1');
    expect(result!.actions).toHaveLength(1);
  });

  it('returns null when conditions are not met', () => {
    const rule = makeRule({
      conditions: [{ field: 'payee', operator: 'contains', value: 'netflix' }],
      actions: [{ type: 'set_category', categoryId: 'cat-entertainment' }],
    });

    const result = matchRule(rule, makeTransaction({ payee: 'Hulu' }));
    expect(result).toBeNull();
  });

  it('skips inactive rules', () => {
    const rule = makeRule({
      isActive: false,
      conditions: [{ field: 'payee', operator: 'contains', value: 'netflix' }],
      actions: [{ type: 'set_category', categoryId: 'cat-entertainment' }],
    });

    const result = matchRule(rule, makeTransaction({ payee: 'NETFLIX' }));
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// applyRules
// ---------------------------------------------------------------------------

describe('applyRules', () => {
  it('applies set_category action', () => {
    const rules: TransactionRule[] = [
      makeRule({
        conditions: [{ field: 'payee', operator: 'contains', value: 'starbucks' }],
        actions: [{ type: 'set_category', categoryId: 'cat-dining' }],
      }),
    ];

    const txn = makeTransaction({ payee: 'Starbucks #1234' });
    const result = applyRules(rules, txn);

    expect(result.modified).toBe(true);
    expect(result.transaction.categoryId).toBe('cat-dining');
    expect(result.matchedRuleIds).toContain('rule-1');
  });

  it('applies rename_payee action', () => {
    const rules: TransactionRule[] = [
      makeRule({
        conditions: [{ field: 'payee', operator: 'starts_with', value: 'AMZN' }],
        actions: [{ type: 'rename_payee', newPayee: 'Amazon' }],
      }),
    ];

    const txn = makeTransaction({ payee: 'AMZN Mktp US*AB12C3' });
    const result = applyRules(rules, txn);

    expect(result.modified).toBe(true);
    expect(result.transaction.payee).toBe('Amazon');
  });

  it('applies set_memo action', () => {
    const rules: TransactionRule[] = [
      makeRule({
        conditions: [{ field: 'payee', operator: 'contains', value: 'gym' }],
        actions: [{ type: 'set_memo', memo: 'Monthly gym membership' }],
      }),
    ];

    const txn = makeTransaction({ payee: 'City Gym' });
    const result = applyRules(rules, txn);

    expect(result.modified).toBe(true);
    expect(result.transaction.memo).toBe('Monthly gym membership');
  });

  it('applies multiple actions from the same rule', () => {
    const rules: TransactionRule[] = [
      makeRule({
        conditions: [{ field: 'payee', operator: 'starts_with', value: 'AMZN' }],
        actions: [
          { type: 'rename_payee', newPayee: 'Amazon' },
          { type: 'set_category', categoryId: 'cat-shopping' },
        ],
      }),
    ];

    const txn = makeTransaction({ payee: 'AMZN Mktp US' });
    const result = applyRules(rules, txn);

    expect(result.transaction.payee).toBe('Amazon');
    expect(result.transaction.categoryId).toBe('cat-shopping');
  });

  it('respects rule priority (lower number = higher priority)', () => {
    const rules: TransactionRule[] = [
      makeRule({
        id: 'rule-low',
        priority: 10,
        conditions: [{ field: 'payee', operator: 'contains', value: 'uber' }],
        actions: [{ type: 'set_category', categoryId: 'cat-general' }],
      }),
      makeRule({
        id: 'rule-high',
        priority: 1,
        conditions: [{ field: 'payee', operator: 'contains', value: 'uber' }],
        actions: [{ type: 'set_category', categoryId: 'cat-transport' }],
      }),
    ];

    const txn = makeTransaction({ payee: 'Uber Trip' });
    const result = applyRules(rules, txn);

    // Higher priority (lower number) wins for set_category
    expect(result.transaction.categoryId).toBe('cat-transport');
  });

  it('returns unmodified transaction when no rules match', () => {
    const rules: TransactionRule[] = [
      makeRule({
        conditions: [{ field: 'payee', operator: 'contains', value: 'netflix' }],
        actions: [{ type: 'set_category', categoryId: 'cat-entertainment' }],
      }),
    ];

    const txn = makeTransaction({ payee: 'Random Store' });
    const result = applyRules(rules, txn);

    expect(result.modified).toBe(false);
    expect(result.matchedRuleIds).toHaveLength(0);
    expect(result.transaction.payee).toBe('Random Store');
    expect(result.transaction.categoryId).toBeNull();
  });

  it('does not apply inactive rules', () => {
    const rules: TransactionRule[] = [
      makeRule({
        isActive: false,
        conditions: [{ field: 'payee', operator: 'contains', value: 'starbucks' }],
        actions: [{ type: 'set_category', categoryId: 'cat-dining' }],
      }),
    ];

    const txn = makeTransaction({ payee: 'Starbucks' });
    const result = applyRules(rules, txn);
    expect(result.modified).toBe(false);
  });

  it('applies rules to a batch of transactions', () => {
    const rules: TransactionRule[] = [
      makeRule({
        conditions: [{ field: 'payee', operator: 'contains', value: 'starbucks' }],
        actions: [{ type: 'set_category', categoryId: 'cat-dining' }],
      }),
    ];

    const transactions = [
      makeTransaction({ payee: 'Starbucks #1' }),
      makeTransaction({ payee: 'Walmart' }),
      makeTransaction({ payee: 'Starbucks #2' }),
    ];

    const results = transactions.map((txn) => applyRules(rules, txn));
    expect(results[0].modified).toBe(true);
    expect(results[1].modified).toBe(false);
    expect(results[2].modified).toBe(true);
  });

  it('does not overwrite manually-set category', () => {
    const rules: TransactionRule[] = [
      makeRule({
        conditions: [{ field: 'payee', operator: 'contains', value: 'store' }],
        actions: [{ type: 'set_category', categoryId: 'cat-shopping' }],
      }),
    ];

    const txn = makeTransaction({
      payee: 'Store XYZ',
      categoryId: 'cat-manual', // already categorized
    });
    const result = applyRules(rules, txn);

    // Should not overwrite an existing category assignment
    expect(result.transaction.categoryId).toBe('cat-manual');
    expect(result.modified).toBe(false);
  });
});
