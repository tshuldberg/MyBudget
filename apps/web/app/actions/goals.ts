'use server';

import { getDb } from './db';
import {
  createGoal as _createGoal,
  updateGoal as _updateGoal,
  deleteGoal as _deleteGoal,
  getGoals as _getGoals,
  allocateToGoal as _allocateToGoal,
  calculateGoalProgress,
  getGoalStatus,
  suggestMonthlyContribution,
} from '@mybudget/shared';
import type {
  GoalInsert,
  GoalProgress,
  GoalStatus,
} from '@mybudget/shared';

// Use the DB model's Goal type (snake_case), not the engine's Goal type (camelCase)
// They collide in the shared package re-export, so we define the DB type explicitly.
interface DbGoal {
  id: string;
  name: string;
  target_amount_cents: number;
  current_amount_cents: number;
  target_date: string | null;
  category_id: string | null;
  created_at: string;
  updated_at: string;
}

// The engine's Goal type (camelCase)
interface EngineGoal {
  id: string;
  categoryId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  createdDate: string;
  monthlyContribution: number;
}

import { randomUUID } from 'crypto';

/** Full goal info with computed progress, status, etc. */
export interface GoalWithProgress {
  goal: DbGoal;
  progress: GoalProgress;
  status: GoalStatus;
  suggestedMonthly: number | null;
}

function toEngineGoal(g: DbGoal): EngineGoal {
  return {
    id: g.id,
    categoryId: g.category_id ?? '',
    name: g.name,
    targetAmount: g.target_amount_cents,
    currentAmount: g.current_amount_cents,
    targetDate: g.target_date,
    createdDate: g.created_at.slice(0, 10),
    monthlyContribution: 0,
  };
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function fetchGoals(): Promise<DbGoal[]> {
  return _getGoals(getDb()) as DbGoal[];
}

export async function fetchGoalsWithProgress(): Promise<GoalWithProgress[]> {
  const goals = _getGoals(getDb()) as DbGoal[];
  const t = today();
  return goals.map((g) => {
    const eg = toEngineGoal(g);
    return {
      goal: g,
      progress: calculateGoalProgress(eg),
      status: getGoalStatus(eg, t),
      suggestedMonthly: suggestMonthlyContribution(eg, t),
    };
  });
}

export async function createGoal(input: GoalInsert): Promise<DbGoal> {
  return _createGoal(getDb(), randomUUID(), input) as DbGoal;
}

export async function updateGoal(
  id: string,
  updates: Partial<Pick<DbGoal, 'name' | 'target_amount_cents' | 'current_amount_cents' | 'target_date' | 'category_id'>>,
): Promise<void> {
  _updateGoal(getDb(), id, updates);
}

export async function deleteGoal(id: string): Promise<void> {
  _deleteGoal(getDb(), id);
}

export async function allocateToGoal(goalId: string, amount: number): Promise<void> {
  _allocateToGoal(getDb(), goalId, amount);
}
