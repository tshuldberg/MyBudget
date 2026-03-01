/**
 * Transaction rules engine.
 *
 * Rules allow users to define auto-categorization, payee renaming, and memo
 * assignment on incoming transactions. Each rule has conditions (payee pattern,
 * amount range, account filter) and actions (set_category, rename_payee, set_memo).
 *
 * Rules are evaluated in priority order (lower number = higher priority).
 * All amounts in integer cents.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RuleCondition {
  field: 'payee' | 'amount' | 'account_id';
  operator: 'contains' | 'equals' | 'starts_with' | 'regex' | 'greater_than' | 'less_than' | 'between';
  value: string | number | [number, number];
}

export type RuleAction =
  | { type: 'set_category'; categoryId: string }
  | { type: 'rename_payee'; newPayee: string }
  | { type: 'set_memo'; memo: string };

export interface TransactionRule {
  id: string;
  name: string;
  priority: number;
  isActive: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
}

export interface TransactionInput {
  payee: string;
  amount: number;
  date: string;
  accountId: string;
  memo: string | null;
  categoryId: string | null;
}

export interface RuleMatch {
  ruleId: string;
  ruleName: string;
  actions: RuleAction[];
}

export interface ApplyRulesResult {
  transaction: TransactionInput;
  modified: boolean;
  matchedRuleIds: string[];
}

// ---------------------------------------------------------------------------
// Condition evaluation
// ---------------------------------------------------------------------------

function evaluateStringCondition(
  fieldValue: string,
  operator: RuleCondition['operator'],
  conditionValue: string,
): boolean {
  const lower = fieldValue.toLowerCase();
  const lowerValue = conditionValue.toLowerCase();

  switch (operator) {
    case 'contains':
      return lower.includes(lowerValue);
    case 'equals':
      return lower === lowerValue;
    case 'starts_with':
      return lower.startsWith(lowerValue);
    case 'regex': {
      try {
        const regex = new RegExp(conditionValue, 'i');
        return regex.test(fieldValue);
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

function evaluateNumericCondition(
  fieldValue: number,
  operator: RuleCondition['operator'],
  conditionValue: number | [number, number],
): boolean {
  switch (operator) {
    case 'greater_than':
      return fieldValue > (conditionValue as number);
    case 'less_than':
      return fieldValue < (conditionValue as number);
    case 'between': {
      const [min, max] = conditionValue as [number, number];
      return fieldValue >= min && fieldValue <= max;
    }
    case 'equals':
      return fieldValue === (conditionValue as number);
    default:
      return false;
  }
}

/**
 * Evaluate all conditions against a transaction. All conditions must match (AND logic).
 * Empty conditions array matches everything.
 */
export function evaluateConditions(
  conditions: RuleCondition[],
  txn: TransactionInput,
): boolean {
  if (conditions.length === 0) return true;

  for (const condition of conditions) {
    let matches = false;

    switch (condition.field) {
      case 'payee':
        matches = evaluateStringCondition(txn.payee, condition.operator, condition.value as string);
        break;
      case 'amount':
        matches = evaluateNumericCondition(txn.amount, condition.operator, condition.value as number | [number, number]);
        break;
      case 'account_id':
        matches = evaluateStringCondition(txn.accountId, condition.operator, condition.value as string);
        break;
    }

    if (!matches) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Rule matching
// ---------------------------------------------------------------------------

/**
 * Test whether a single rule matches a transaction.
 * Returns a RuleMatch if conditions are met, null otherwise.
 * Inactive rules always return null.
 */
export function matchRule(
  rule: TransactionRule,
  txn: TransactionInput,
): RuleMatch | null {
  if (!rule.isActive) return null;
  if (!evaluateConditions(rule.conditions, txn)) return null;

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    actions: rule.actions,
  };
}

// ---------------------------------------------------------------------------
// Applying rules
// ---------------------------------------------------------------------------

/**
 * Apply all matching rules to a transaction.
 * Rules are sorted by priority (lower = higher priority) before evaluation.
 * If the transaction already has a categoryId set, set_category actions are skipped
 * (manual categorization takes precedence).
 *
 * @returns The potentially modified transaction with metadata about which rules matched
 */
export function applyRules(
  rules: TransactionRule[],
  txn: TransactionInput,
): ApplyRulesResult {
  // Sort by priority ascending (lower number = higher priority)
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  const result: TransactionInput = { ...txn };
  const matchedRuleIds: string[] = [];
  let modified = false;

  // If the transaction already has a category, skip set_category actions
  const hasManualCategory = txn.categoryId !== null;

  for (const rule of sorted) {
    const match = matchRule(rule, txn);
    if (!match) continue;

    // Check if any action will actually modify the transaction
    let ruleApplied = false;

    for (const action of match.actions) {
      switch (action.type) {
        case 'set_category':
          if (!hasManualCategory && result.categoryId === null) {
            result.categoryId = action.categoryId;
            ruleApplied = true;
          }
          break;
        case 'rename_payee':
          result.payee = action.newPayee;
          ruleApplied = true;
          break;
        case 'set_memo':
          result.memo = action.memo;
          ruleApplied = true;
          break;
      }
    }

    if (ruleApplied) {
      matchedRuleIds.push(match.ruleId);
      modified = true;
    }
  }

  return {
    transaction: result,
    modified,
    matchedRuleIds,
  };
}
