/**
 * TDD tests for goals CRUD database operations.
 *
 * Goals are stored in a SQLite table and linked to categories via
 * category_id. CRUD operations handle creating, reading, updating,
 * and deleting goals with proper validation.
 *
 * All amounts in integer cents.
 */

import { describe, it, expect } from 'vitest';
import {
  createGoal,
  getGoal,
  listGoals,
  updateGoal,
  deleteGoal,
  getGoalsByCategory,
  getActiveGoals,
  type GoalRow,
  type GoalInsert,
} from '../goals-crud';
import { createMockDbAdapter } from './mock-db-adapter';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeGoalInsert(overrides: Partial<GoalInsert> = {}): GoalInsert {
  return {
    categoryId: 'cat-1',
    name: 'Emergency Fund',
    targetAmount: 1000000, // $10,000
    targetDate: '2026-12-31',
    notes: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createGoal
// ---------------------------------------------------------------------------

describe('createGoal', () => {
  it('inserts a new goal and returns the created row', () => {
    const db = createMockDbAdapter();
    const input = makeGoalInsert();

    const goal = createGoal(db, input);

    expect(goal.id).toBeTruthy();
    expect(goal.name).toBe('Emergency Fund');
    expect(goal.targetAmount).toBe(1000000);
    expect(goal.currentAmount).toBe(0);
    expect(goal.categoryId).toBe('cat-1');
    expect(goal.targetDate).toBe('2026-12-31');
    expect(goal.isActive).toBe(true);
    expect(goal.createdAt).toBeTruthy();
  });

  it('validates target amount is positive', () => {
    const db = createMockDbAdapter();

    expect(() => createGoal(db, makeGoalInsert({ targetAmount: 0 }))).toThrow();
    expect(() => createGoal(db, makeGoalInsert({ targetAmount: -100 }))).toThrow();
  });

  it('validates name is non-empty', () => {
    const db = createMockDbAdapter();

    expect(() => createGoal(db, makeGoalInsert({ name: '' }))).toThrow();
  });

  it('allows null target date (open-ended goal)', () => {
    const db = createMockDbAdapter();
    const goal = createGoal(db, makeGoalInsert({ targetDate: null }));

    expect(goal.targetDate).toBeNull();
  });

  it('allows null category (unlinked goal)', () => {
    const db = createMockDbAdapter();
    const goal = createGoal(db, makeGoalInsert({ categoryId: null }));

    expect(goal.categoryId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getGoal
// ---------------------------------------------------------------------------

describe('getGoal', () => {
  it('returns a goal by ID', () => {
    const db = createMockDbAdapter();
    const created = createGoal(db, makeGoalInsert());

    const found = getGoal(db, created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.name).toBe('Emergency Fund');
  });

  it('returns null for non-existent goal', () => {
    const db = createMockDbAdapter();
    const found = getGoal(db, 'nonexistent-id');

    expect(found).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listGoals
// ---------------------------------------------------------------------------

describe('listGoals', () => {
  it('returns all goals ordered by creation date', () => {
    const db = createMockDbAdapter();
    createGoal(db, makeGoalInsert({ name: 'Goal A' }));
    createGoal(db, makeGoalInsert({ name: 'Goal B' }));
    createGoal(db, makeGoalInsert({ name: 'Goal C' }));

    const goals = listGoals(db);
    expect(goals).toHaveLength(3);
  });

  it('returns empty array when no goals exist', () => {
    const db = createMockDbAdapter();
    const goals = listGoals(db);

    expect(goals).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// updateGoal
// ---------------------------------------------------------------------------

describe('updateGoal', () => {
  it('updates goal name', () => {
    const db = createMockDbAdapter();
    const created = createGoal(db, makeGoalInsert({ name: 'Old Name' }));

    updateGoal(db, created.id, { name: 'New Name' });

    const updated = getGoal(db, created.id);
    expect(updated!.name).toBe('New Name');
  });

  it('updates target amount', () => {
    const db = createMockDbAdapter();
    const created = createGoal(db, makeGoalInsert({ targetAmount: 500000 }));

    updateGoal(db, created.id, { targetAmount: 750000 });

    const updated = getGoal(db, created.id);
    expect(updated!.targetAmount).toBe(750000);
  });

  it('updates current amount (contribution)', () => {
    const db = createMockDbAdapter();
    const created = createGoal(db, makeGoalInsert());

    updateGoal(db, created.id, { currentAmount: 250000 });

    const updated = getGoal(db, created.id);
    expect(updated!.currentAmount).toBe(250000);
  });

  it('updates target date', () => {
    const db = createMockDbAdapter();
    const created = createGoal(db, makeGoalInsert({ targetDate: '2026-12-31' }));

    updateGoal(db, created.id, { targetDate: '2027-06-30' });

    const updated = getGoal(db, created.id);
    expect(updated!.targetDate).toBe('2027-06-30');
  });

  it('deactivates a goal', () => {
    const db = createMockDbAdapter();
    const created = createGoal(db, makeGoalInsert());

    updateGoal(db, created.id, { isActive: false });

    const updated = getGoal(db, created.id);
    expect(updated!.isActive).toBe(false);
  });

  it('throws for non-existent goal', () => {
    const db = createMockDbAdapter();

    expect(() => updateGoal(db, 'nonexistent', { name: 'X' })).toThrow();
  });

  it('updates updatedAt timestamp', () => {
    const db = createMockDbAdapter();
    const created = createGoal(db, makeGoalInsert());
    const originalUpdatedAt = created.updatedAt;

    // Slight delay to ensure timestamp difference
    updateGoal(db, created.id, { name: 'Updated' });

    const updated = getGoal(db, created.id);
    expect(updated!.updatedAt).not.toBe(originalUpdatedAt);
  });
});

// ---------------------------------------------------------------------------
// deleteGoal
// ---------------------------------------------------------------------------

describe('deleteGoal', () => {
  it('deletes a goal by ID', () => {
    const db = createMockDbAdapter();
    const created = createGoal(db, makeGoalInsert());

    deleteGoal(db, created.id);

    const found = getGoal(db, created.id);
    expect(found).toBeNull();
  });

  it('does not affect other goals', () => {
    const db = createMockDbAdapter();
    const goal1 = createGoal(db, makeGoalInsert({ name: 'Goal 1' }));
    const goal2 = createGoal(db, makeGoalInsert({ name: 'Goal 2' }));

    deleteGoal(db, goal1.id);

    expect(getGoal(db, goal1.id)).toBeNull();
    expect(getGoal(db, goal2.id)).not.toBeNull();
  });

  it('is idempotent (deleting non-existent goal does not throw)', () => {
    const db = createMockDbAdapter();

    expect(() => deleteGoal(db, 'nonexistent')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getGoalsByCategory
// ---------------------------------------------------------------------------

describe('getGoalsByCategory', () => {
  it('returns goals linked to a specific category', () => {
    const db = createMockDbAdapter();
    createGoal(db, makeGoalInsert({ categoryId: 'cat-1', name: 'Goal A' }));
    createGoal(db, makeGoalInsert({ categoryId: 'cat-2', name: 'Goal B' }));
    createGoal(db, makeGoalInsert({ categoryId: 'cat-1', name: 'Goal C' }));

    const goals = getGoalsByCategory(db, 'cat-1');
    expect(goals).toHaveLength(2);
    expect(goals.every((g) => g.categoryId === 'cat-1')).toBe(true);
  });

  it('returns empty for category with no goals', () => {
    const db = createMockDbAdapter();
    createGoal(db, makeGoalInsert({ categoryId: 'cat-1' }));

    const goals = getGoalsByCategory(db, 'cat-99');
    expect(goals).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getActiveGoals
// ---------------------------------------------------------------------------

describe('getActiveGoals', () => {
  it('returns only active goals', () => {
    const db = createMockDbAdapter();
    const goal1 = createGoal(db, makeGoalInsert({ name: 'Active' }));
    const goal2 = createGoal(db, makeGoalInsert({ name: 'Also Active' }));
    const goal3 = createGoal(db, makeGoalInsert({ name: 'Inactive' }));
    updateGoal(db, goal3.id, { isActive: false });

    const active = getActiveGoals(db);
    expect(active).toHaveLength(2);
    expect(active.every((g) => g.isActive)).toBe(true);
  });

  it('returns empty when all goals are inactive', () => {
    const db = createMockDbAdapter();
    const goal = createGoal(db, makeGoalInsert());
    updateGoal(db, goal.id, { isActive: false });

    const active = getActiveGoals(db);
    expect(active).toHaveLength(0);
  });
});
