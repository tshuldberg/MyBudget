/**
 * TDD tests for transaction rules CRUD database operations.
 *
 * Transaction rules are stored in SQLite and define conditions/actions
 * for auto-categorization. CRUD operations manage the rule lifecycle
 * with priority ordering and activation state.
 *
 * All amounts in integer cents.
 */

import { describe, it, expect } from 'vitest';
import {
  createRule,
  getRule,
  listRules,
  updateRule,
  deleteRule,
  reorderRules,
  getActiveRules,
  type RuleRow,
  type RuleInsert,
  type RuleConditionRow,
  type RuleActionRow,
} from '../rules-crud';
import { createMockDbAdapter } from './mock-db-adapter';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeRuleInsert(overrides: Partial<RuleInsert> = {}): RuleInsert {
  return {
    name: 'Starbucks Rule',
    priority: 0,
    conditions: [
      { field: 'payee', operator: 'contains', value: 'starbucks' },
    ],
    actions: [
      { type: 'set_category', categoryId: 'cat-dining' },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createRule
// ---------------------------------------------------------------------------

describe('createRule', () => {
  it('inserts a new rule with conditions and actions', () => {
    const db = createMockDbAdapter();
    const input = makeRuleInsert();

    const rule = createRule(db, input);

    expect(rule.id).toBeTruthy();
    expect(rule.name).toBe('Starbucks Rule');
    expect(rule.priority).toBe(0);
    expect(rule.isActive).toBe(true);
    expect(rule.conditions).toHaveLength(1);
    expect(rule.conditions[0].field).toBe('payee');
    expect(rule.conditions[0].operator).toBe('contains');
    expect(rule.conditions[0].value).toBe('starbucks');
    expect(rule.actions).toHaveLength(1);
    expect(rule.actions[0].type).toBe('set_category');
  });

  it('validates name is non-empty', () => {
    const db = createMockDbAdapter();

    expect(() => createRule(db, makeRuleInsert({ name: '' }))).toThrow();
  });

  it('validates at least one condition exists', () => {
    const db = createMockDbAdapter();

    expect(() => createRule(db, makeRuleInsert({ conditions: [] }))).toThrow();
  });

  it('validates at least one action exists', () => {
    const db = createMockDbAdapter();

    expect(() => createRule(db, makeRuleInsert({ actions: [] }))).toThrow();
  });

  it('supports multiple conditions on a single rule', () => {
    const db = createMockDbAdapter();
    const rule = createRule(db, makeRuleInsert({
      conditions: [
        { field: 'payee', operator: 'contains', value: 'uber' },
        { field: 'amount', operator: 'less_than', value: '-1000' },
      ],
    }));

    expect(rule.conditions).toHaveLength(2);
  });

  it('supports multiple actions on a single rule', () => {
    const db = createMockDbAdapter();
    const rule = createRule(db, makeRuleInsert({
      actions: [
        { type: 'set_category', categoryId: 'cat-transport' },
        { type: 'rename_payee', newPayee: 'Uber' },
      ],
    }));

    expect(rule.actions).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// getRule
// ---------------------------------------------------------------------------

describe('getRule', () => {
  it('returns a rule by ID with conditions and actions', () => {
    const db = createMockDbAdapter();
    const created = createRule(db, makeRuleInsert());

    const found = getRule(db, created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.conditions).toHaveLength(1);
    expect(found!.actions).toHaveLength(1);
  });

  it('returns null for non-existent rule', () => {
    const db = createMockDbAdapter();
    const found = getRule(db, 'nonexistent-id');

    expect(found).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listRules
// ---------------------------------------------------------------------------

describe('listRules', () => {
  it('returns all rules ordered by priority', () => {
    const db = createMockDbAdapter();
    createRule(db, makeRuleInsert({ name: 'Low Priority', priority: 10 }));
    createRule(db, makeRuleInsert({ name: 'High Priority', priority: 1 }));
    createRule(db, makeRuleInsert({ name: 'Medium Priority', priority: 5 }));

    const rules = listRules(db);
    expect(rules).toHaveLength(3);
    expect(rules[0].name).toBe('High Priority');
    expect(rules[1].name).toBe('Medium Priority');
    expect(rules[2].name).toBe('Low Priority');
  });

  it('returns empty array when no rules exist', () => {
    const db = createMockDbAdapter();
    const rules = listRules(db);

    expect(rules).toHaveLength(0);
  });

  it('includes conditions and actions for each rule', () => {
    const db = createMockDbAdapter();
    createRule(db, makeRuleInsert());

    const rules = listRules(db);
    expect(rules[0].conditions).toHaveLength(1);
    expect(rules[0].actions).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// updateRule
// ---------------------------------------------------------------------------

describe('updateRule', () => {
  it('updates rule name', () => {
    const db = createMockDbAdapter();
    const created = createRule(db, makeRuleInsert({ name: 'Old Name' }));

    updateRule(db, created.id, { name: 'New Name' });

    const updated = getRule(db, created.id);
    expect(updated!.name).toBe('New Name');
  });

  it('updates rule priority', () => {
    const db = createMockDbAdapter();
    const created = createRule(db, makeRuleInsert({ priority: 5 }));

    updateRule(db, created.id, { priority: 1 });

    const updated = getRule(db, created.id);
    expect(updated!.priority).toBe(1);
  });

  it('deactivates a rule', () => {
    const db = createMockDbAdapter();
    const created = createRule(db, makeRuleInsert());

    updateRule(db, created.id, { isActive: false });

    const updated = getRule(db, created.id);
    expect(updated!.isActive).toBe(false);
  });

  it('replaces conditions', () => {
    const db = createMockDbAdapter();
    const created = createRule(db, makeRuleInsert({
      conditions: [{ field: 'payee', operator: 'contains', value: 'old' }],
    }));

    updateRule(db, created.id, {
      conditions: [
        { field: 'payee', operator: 'starts_with', value: 'new' },
        { field: 'amount', operator: 'less_than', value: '-500' },
      ],
    });

    const updated = getRule(db, created.id);
    expect(updated!.conditions).toHaveLength(2);
    expect(updated!.conditions[0].operator).toBe('starts_with');
  });

  it('replaces actions', () => {
    const db = createMockDbAdapter();
    const created = createRule(db, makeRuleInsert({
      actions: [{ type: 'set_category', categoryId: 'cat-old' }],
    }));

    updateRule(db, created.id, {
      actions: [{ type: 'set_category', categoryId: 'cat-new' }],
    });

    const updated = getRule(db, created.id);
    expect(updated!.actions[0].categoryId).toBe('cat-new');
  });

  it('throws for non-existent rule', () => {
    const db = createMockDbAdapter();

    expect(() => updateRule(db, 'nonexistent', { name: 'X' })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// deleteRule
// ---------------------------------------------------------------------------

describe('deleteRule', () => {
  it('deletes a rule and its conditions and actions', () => {
    const db = createMockDbAdapter();
    const created = createRule(db, makeRuleInsert());

    deleteRule(db, created.id);

    const found = getRule(db, created.id);
    expect(found).toBeNull();
  });

  it('does not affect other rules', () => {
    const db = createMockDbAdapter();
    const rule1 = createRule(db, makeRuleInsert({ name: 'Rule 1' }));
    const rule2 = createRule(db, makeRuleInsert({ name: 'Rule 2' }));

    deleteRule(db, rule1.id);

    expect(getRule(db, rule1.id)).toBeNull();
    expect(getRule(db, rule2.id)).not.toBeNull();
  });

  it('is idempotent (deleting non-existent rule does not throw)', () => {
    const db = createMockDbAdapter();

    expect(() => deleteRule(db, 'nonexistent')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// reorderRules
// ---------------------------------------------------------------------------

describe('reorderRules', () => {
  it('updates priorities based on ordered ID list', () => {
    const db = createMockDbAdapter();
    const r1 = createRule(db, makeRuleInsert({ name: 'R1', priority: 0 }));
    const r2 = createRule(db, makeRuleInsert({ name: 'R2', priority: 1 }));
    const r3 = createRule(db, makeRuleInsert({ name: 'R3', priority: 2 }));

    // Reverse the order
    reorderRules(db, [r3.id, r2.id, r1.id]);

    const rules = listRules(db);
    expect(rules[0].id).toBe(r3.id);
    expect(rules[0].priority).toBe(0);
    expect(rules[1].id).toBe(r2.id);
    expect(rules[1].priority).toBe(1);
    expect(rules[2].id).toBe(r1.id);
    expect(rules[2].priority).toBe(2);
  });

  it('handles single rule reorder', () => {
    const db = createMockDbAdapter();
    const r1 = createRule(db, makeRuleInsert({ priority: 5 }));

    reorderRules(db, [r1.id]);

    const updated = getRule(db, r1.id);
    expect(updated!.priority).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getActiveRules
// ---------------------------------------------------------------------------

describe('getActiveRules', () => {
  it('returns only active rules ordered by priority', () => {
    const db = createMockDbAdapter();
    const r1 = createRule(db, makeRuleInsert({ name: 'Active 1', priority: 0 }));
    const r2 = createRule(db, makeRuleInsert({ name: 'Inactive', priority: 1 }));
    const r3 = createRule(db, makeRuleInsert({ name: 'Active 2', priority: 2 }));
    updateRule(db, r2.id, { isActive: false });

    const active = getActiveRules(db);
    expect(active).toHaveLength(2);
    expect(active[0].name).toBe('Active 1');
    expect(active[1].name).toBe('Active 2');
    expect(active.every((r) => r.isActive)).toBe(true);
  });

  it('returns empty when all rules are inactive', () => {
    const db = createMockDbAdapter();
    const r = createRule(db, makeRuleInsert());
    updateRule(db, r.id, { isActive: false });

    const active = getActiveRules(db);
    expect(active).toHaveLength(0);
  });
});
