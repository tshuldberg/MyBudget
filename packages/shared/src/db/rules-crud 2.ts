/**
 * Transaction rules CRUD operations.
 *
 * Rules have conditions and actions stored in separate tables (rule_conditions
 * and rule_actions), linked by rule_id. CRUD operations manage the full
 * rule lifecycle with priority ordering.
 *
 * All amounts stored as integer cents.
 */

import type { DatabaseAdapter } from './migrations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RuleConditionRow {
  id: string;
  ruleId: string;
  field: string;
  operator: string;
  value: string;
}

export interface RuleActionRow {
  id: string;
  ruleId: string;
  type: string;
  categoryId: string | null;
  newPayee: string | null;
  memo: string | null;
}

export interface RuleRow {
  id: string;
  name: string;
  priority: number;
  isActive: boolean;
  conditions: RuleConditionRow[];
  actions: RuleActionRow[];
  createdAt: string;
  updatedAt: string;
}

export interface RuleConditionInsert {
  field: string;
  operator: string;
  value: string;
}

export interface RuleActionInsert {
  type: string;
  categoryId?: string;
  newPayee?: string;
  memo?: string;
}

export interface RuleInsert {
  name: string;
  priority: number;
  conditions: RuleConditionInsert[];
  actions: RuleActionInsert[];
}

export interface RuleUpdate {
  name?: string;
  priority?: number;
  isActive?: boolean;
  conditions?: RuleConditionInsert[];
  actions?: RuleActionInsert[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;

function generateId(prefix: string): string {
  _idCounter++;
  return `${prefix}-${Date.now()}-${_idCounter}`;
}

function loadConditions(db: DatabaseAdapter, ruleId: string): RuleConditionRow[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM rule_conditions WHERE rule_id = ?`,
    [ruleId],
  );
  return rows.map((row) => ({
    id: row.id as string,
    ruleId: row.rule_id as string,
    field: row.field as string,
    operator: row.operator as string,
    value: row.value as string,
  }));
}

function loadActions(db: DatabaseAdapter, ruleId: string): RuleActionRow[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM rule_actions WHERE rule_id = ?`,
    [ruleId],
  );
  return rows.map((row) => ({
    id: row.id as string,
    ruleId: row.rule_id as string,
    type: row.type as string,
    categoryId: (row.category_id as string) ?? null,
    newPayee: (row.new_payee as string) ?? null,
    memo: (row.memo as string) ?? null,
  }));
}

function toRuleRow(row: Record<string, unknown>, conditions: RuleConditionRow[], actions: RuleActionRow[]): RuleRow {
  return {
    id: row.id as string,
    name: row.name as string,
    priority: row.priority as number,
    isActive: row.is_active === 1 || row.is_active === true,
    conditions,
    actions,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function insertConditions(db: DatabaseAdapter, ruleId: string, conditions: RuleConditionInsert[]): void {
  for (const cond of conditions) {
    const condId = generateId('cond');
    db.execute(
      `INSERT INTO rule_conditions (id, rule_id, field, operator, value) VALUES (?, ?, ?, ?, ?)`,
      [condId, ruleId, cond.field, cond.operator, cond.value],
    );
  }
}

function insertActions(db: DatabaseAdapter, ruleId: string, actions: RuleActionInsert[]): void {
  for (const action of actions) {
    const actionId = generateId('act');
    db.execute(
      `INSERT INTO rule_actions (id, rule_id, type, category_id, new_payee, memo) VALUES (?, ?, ?, ?, ?, ?)`,
      [actionId, ruleId, action.type, action.categoryId ?? null, action.newPayee ?? null, action.memo ?? null],
    );
  }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function createRule(db: DatabaseAdapter, input: RuleInsert): RuleRow {
  if (!input.name || input.name.trim() === '') {
    throw new Error('Rule name must be non-empty');
  }
  if (input.conditions.length === 0) {
    throw new Error('Rule must have at least one condition');
  }
  if (input.actions.length === 0) {
    throw new Error('Rule must have at least one action');
  }

  const id = generateId('rule');
  const now = new Date().toISOString();

  db.transaction(() => {
    db.execute(
      `INSERT INTO transaction_rules (id, name, priority) VALUES (?, ?, ?)`,
      [id, input.name, input.priority],
    );

    insertConditions(db, id, input.conditions);
    insertActions(db, id, input.actions);
  });

  return {
    id,
    name: input.name,
    priority: input.priority,
    isActive: true,
    conditions: loadConditions(db, id),
    actions: loadActions(db, id),
    createdAt: now,
    updatedAt: now,
  };
}

export function getRule(db: DatabaseAdapter, id: string): RuleRow | null {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM transaction_rules WHERE id = ?`,
    [id],
  );
  if (rows.length === 0) return null;

  const conditions = loadConditions(db, id);
  const actions = loadActions(db, id);
  return toRuleRow(rows[0], conditions, actions);
}

export function listRules(db: DatabaseAdapter): RuleRow[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM transaction_rules ORDER BY priority ASC`,
  );
  return rows.map((row) => {
    const id = row.id as string;
    return toRuleRow(row, loadConditions(db, id), loadActions(db, id));
  });
}

export function updateRule(db: DatabaseAdapter, id: string, updates: RuleUpdate): void {
  const existing = getRule(db, id);
  if (!existing) throw new Error(`Rule not found: ${id}`);

  db.transaction(() => {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.priority !== undefined) {
      fields.push('priority = ?');
      values.push(updates.priority);
    }
    if (updates.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.isActive ? 1 : 0);
    }

    if (fields.length > 0) {
      values.push(id);
      db.execute(
        `UPDATE transaction_rules SET ${fields.join(', ')} WHERE id = ?`,
        values,
      );
    }

    if (updates.conditions !== undefined) {
      db.execute(`DELETE FROM rule_conditions WHERE rule_id = ?`, [id]);
      insertConditions(db, id, updates.conditions);
    }

    if (updates.actions !== undefined) {
      db.execute(`DELETE FROM rule_actions WHERE rule_id = ?`, [id]);
      insertActions(db, id, updates.actions);
    }
  });
}

export function deleteRule(db: DatabaseAdapter, id: string): void {
  db.transaction(() => {
    db.execute(`DELETE FROM rule_conditions WHERE rule_id = ?`, [id]);
    db.execute(`DELETE FROM rule_actions WHERE rule_id = ?`, [id]);
    db.execute(`DELETE FROM transaction_rules WHERE id = ?`, [id]);
  });
}

export function reorderRules(db: DatabaseAdapter, orderedIds: string[]): void {
  db.transaction(() => {
    for (let i = 0; i < orderedIds.length; i++) {
      db.execute(
        `UPDATE transaction_rules SET priority = ? WHERE id = ?`,
        [i, orderedIds[i]],
      );
    }
  });
}

export function getActiveRules(db: DatabaseAdapter): RuleRow[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM transaction_rules WHERE is_active = ? ORDER BY priority ASC`,
    [1],
  );
  return rows.map((row) => {
    const id = row.id as string;
    return toRuleRow(row, loadConditions(db, id), loadActions(db, id));
  });
}
