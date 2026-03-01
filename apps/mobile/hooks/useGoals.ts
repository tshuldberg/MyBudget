import { useMemo } from 'react';
import { useDatabase } from '../lib/DatabaseProvider';
import {
  getGoals,
  createGoal as _createGoal,
  updateGoal as _updateGoal,
  deleteGoal as _deleteGoal,
  allocateToGoal as _allocateToGoal,
  calculateGoalProgress,
  getGoalStatus,
  suggestMonthlyContribution,
} from '@mybudget/shared';
import type { GoalInsert, GoalProgress, GoalStatus } from '@mybudget/shared';
import { uuid } from '../lib/uuid';

// DB model Goal (snake_case) — avoids the shared package type collision
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

// Engine Goal (camelCase) — what the engine functions expect
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

export function useGoals() {
  const { db, version, invalidate } = useDatabase();

  const goals = useMemo(() => getGoals(db) as DbGoal[], [db, version]);

  const goalsWithProgress: GoalWithProgress[] = useMemo(() => {
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
  }, [goals]);

  return {
    goals,
    goalsWithProgress,
    createGoal: (input: GoalInsert): DbGoal => {
      const result = _createGoal(db, uuid(), input) as DbGoal;
      invalidate();
      return result;
    },
    updateGoal: (
      id: string,
      updates: Partial<Pick<DbGoal, 'name' | 'target_amount_cents' | 'current_amount_cents' | 'target_date' | 'category_id'>>,
    ) => {
      _updateGoal(db, id, updates);
      invalidate();
    },
    deleteGoal: (id: string) => {
      _deleteGoal(db, id);
      invalidate();
    },
    allocateToGoal: (goalId: string, amount: number) => {
      _allocateToGoal(db, goalId, amount);
      invalidate();
    },
  };
}
