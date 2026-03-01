/**
 * In-memory mock DatabaseAdapter for testing goals and rules CRUD.
 *
 * Extends the existing mock-adapter pattern to support the new goals
 * and transaction_rules tables. Uses Maps to simulate SQLite storage
 * with basic SQL parsing for INSERT, SELECT, UPDATE, and DELETE.
 */

import type { DatabaseAdapter } from '../migrations';

interface GoalRow {
  id: string;
  category_id: string | null;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  notes: string | null;
  is_active: number; // SQLite boolean
  created_at: string;
  updated_at: string;
}

interface RuleRow {
  id: string;
  name: string;
  priority: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface RuleConditionRow {
  id: string;
  rule_id: string;
  field: string;
  operator: string;
  value: string;
}

interface RuleActionRow {
  id: string;
  rule_id: string;
  type: string;
  category_id: string | null;
  new_payee: string | null;
  memo: string | null;
}

/**
 * Create an in-memory mock database adapter that supports goals and rules
 * CRUD operations for testing.
 */
export function createMockDbAdapter(): DatabaseAdapter {
  const goals = new Map<string, GoalRow>();
  const rules = new Map<string, RuleRow>();
  const ruleConditions = new Map<string, RuleConditionRow[]>();
  const ruleActions = new Map<string, RuleActionRow[]>();
  let idCounter = 0;

  function nextId(): string {
    idCounter++;
    return `mock-${idCounter.toString().padStart(4, '0')}`;
  }

  let timeOffset = 0;
  function nowIso(): string {
    timeOffset += 1000;
    const ts = new Date(Date.now() + timeOffset);
    return ts.toISOString();
  }

  return {
    execute(sql: string, params?: unknown[]): void {
      const trimmed = sql.trim().toUpperCase();

      // Goal operations
      if (trimmed.startsWith('INSERT INTO GOALS')) {
        const p = params as unknown[];
        const row: GoalRow = {
          id: p[0] as string,
          category_id: p[1] as string | null,
          name: p[2] as string,
          target_amount: p[3] as number,
          current_amount: p[4] as number ?? 0,
          target_date: p[5] as string | null,
          notes: p[6] as string | null,
          is_active: (p[7] as number) ?? 1,
          created_at: (p[8] as string) ?? nowIso(),
          updated_at: (p[9] as string) ?? nowIso(),
        };
        goals.set(row.id, row);
        return;
      }

      if (trimmed.startsWith('UPDATE GOALS')) {
        const id = params?.[params.length - 1] as string;
        const goal = goals.get(id);
        if (!goal) throw new Error(`Goal not found: ${id}`);
        goal.updated_at = nowIso();

        // Simple field update based on SQL pattern
        const lowerSql = sql.toLowerCase();
        if (lowerSql.includes('name =')) goal.name = params![0] as string;
        if (lowerSql.includes('target_amount =')) goal.target_amount = params![0] as number;
        if (lowerSql.includes('current_amount =')) goal.current_amount = params![0] as number;
        if (lowerSql.includes('target_date =')) goal.target_date = params![0] as string | null;
        if (lowerSql.includes('is_active =')) goal.is_active = params![0] as number;
        return;
      }

      if (trimmed.startsWith('DELETE FROM GOALS')) {
        const id = params?.[0] as string;
        goals.delete(id);
        return;
      }

      // Rule operations
      if (trimmed.startsWith('INSERT INTO TRANSACTION_RULES')) {
        const p = params as unknown[];
        const row: RuleRow = {
          id: p[0] as string,
          name: p[1] as string,
          priority: p[2] as number,
          is_active: 1,
          created_at: nowIso(),
          updated_at: nowIso(),
        };
        rules.set(row.id, row);
        ruleConditions.set(row.id, []);
        ruleActions.set(row.id, []);
        return;
      }

      if (trimmed.startsWith('INSERT INTO RULE_CONDITIONS')) {
        const p = params as unknown[];
        const ruleId = p[1] as string;
        const conditions = ruleConditions.get(ruleId) ?? [];
        conditions.push({
          id: p[0] as string,
          rule_id: ruleId,
          field: p[2] as string,
          operator: p[3] as string,
          value: p[4] as string,
        });
        ruleConditions.set(ruleId, conditions);
        return;
      }

      if (trimmed.startsWith('INSERT INTO RULE_ACTIONS')) {
        const p = params as unknown[];
        const ruleId = p[1] as string;
        const actions = ruleActions.get(ruleId) ?? [];
        actions.push({
          id: p[0] as string,
          rule_id: ruleId,
          type: p[2] as string,
          category_id: (p[3] as string | null) ?? null,
          new_payee: (p[4] as string | null) ?? null,
          memo: (p[5] as string | null) ?? null,
        });
        ruleActions.set(ruleId, actions);
        return;
      }

      if (trimmed.startsWith('UPDATE TRANSACTION_RULES')) {
        const id = params?.[params.length - 1] as string;
        const rule = rules.get(id);
        if (!rule) throw new Error(`Rule not found: ${id}`);
        rule.updated_at = nowIso();

        const lowerSql = sql.toLowerCase();
        if (lowerSql.includes('name =')) rule.name = params![0] as string;
        if (lowerSql.includes('priority =')) rule.priority = params![0] as number;
        if (lowerSql.includes('is_active =')) rule.is_active = params![0] as number;
        return;
      }

      if (trimmed.startsWith('DELETE FROM TRANSACTION_RULES')) {
        const id = params?.[0] as string;
        rules.delete(id);
        ruleConditions.delete(id);
        ruleActions.delete(id);
        return;
      }

      if (trimmed.startsWith('DELETE FROM RULE_CONDITIONS')) {
        const ruleId = params?.[0] as string;
        ruleConditions.set(ruleId, []);
        return;
      }

      if (trimmed.startsWith('DELETE FROM RULE_ACTIONS')) {
        const ruleId = params?.[0] as string;
        ruleActions.set(ruleId, []);
        return;
      }
    },

    query<T>(sql: string, params?: unknown[]): T[] {
      const trimmed = sql.trim().toUpperCase();

      // Goal queries
      if (trimmed.includes('FROM GOALS') && trimmed.includes('WHERE ID =')) {
        const id = params?.[0] as string;
        const goal = goals.get(id);
        return goal ? [goal as T] : [];
      }

      if (trimmed.includes('FROM GOALS') && trimmed.includes('WHERE CATEGORY_ID =')) {
        const catId = params?.[0] as string;
        return Array.from(goals.values()).filter((g) => g.category_id === catId) as T[];
      }

      if (trimmed.includes('FROM GOALS') && trimmed.includes('WHERE IS_ACTIVE =')) {
        const isActive = params?.[0] as number;
        return Array.from(goals.values()).filter((g) => g.is_active === isActive) as T[];
      }

      if (trimmed.includes('FROM GOALS') && !trimmed.includes('WHERE')) {
        return Array.from(goals.values()) as T[];
      }

      // Rule queries
      if (trimmed.includes('FROM TRANSACTION_RULES') && trimmed.includes('WHERE ID =')) {
        const id = params?.[0] as string;
        const rule = rules.get(id);
        return rule ? [rule as T] : [];
      }

      if (trimmed.includes('FROM TRANSACTION_RULES') && trimmed.includes('WHERE IS_ACTIVE =')) {
        const isActive = params?.[0] as number;
        return Array.from(rules.values())
          .filter((r) => r.is_active === isActive)
          .sort((a, b) => a.priority - b.priority) as T[];
      }

      if (trimmed.includes('FROM TRANSACTION_RULES') && trimmed.includes('ORDER BY PRIORITY')) {
        return Array.from(rules.values()).sort((a, b) => a.priority - b.priority) as T[];
      }

      if (trimmed.includes('FROM TRANSACTION_RULES') && !trimmed.includes('WHERE')) {
        return Array.from(rules.values()).sort((a, b) => a.priority - b.priority) as T[];
      }

      if (trimmed.includes('FROM RULE_CONDITIONS') && trimmed.includes('WHERE RULE_ID =')) {
        const ruleId = params?.[0] as string;
        return (ruleConditions.get(ruleId) ?? []) as T[];
      }

      if (trimmed.includes('FROM RULE_ACTIONS') && trimmed.includes('WHERE RULE_ID =')) {
        const ruleId = params?.[0] as string;
        return (ruleActions.get(ruleId) ?? []) as T[];
      }

      return [];
    },

    transaction(fn: () => void): void {
      fn();
    },
  };
}
