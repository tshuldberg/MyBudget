'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Target, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  fetchGoalsWithProgress,
  createGoal,
  deleteGoal,
  allocateToGoal,
} from '../actions/goals';
import type { GoalWithProgress } from '../actions/goals';
import { fetchCategories } from '../actions/categories';
import type { Category } from '@mybudget/shared';
import styles from './page.module.css';

function formatCurrency(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_LABELS: Record<string, string> = {
  completed: 'Complete',
  on_track: 'On Track',
  behind: 'Behind',
  overdue: 'Overdue',
};

export default function GoalsPage() {
  const [items, setItems] = useState<GoalWithProgress[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [allocGoalId, setAllocGoalId] = useState<string | null>(null);
  const [allocAmount, setAllocAmount] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [gwp, cats] = await Promise.all([
      fetchGoalsWithProgress(),
      fetchCategories(),
    ]);
    setItems(gwp);
    setCategories(cats);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleDelete(id: string) {
    await deleteGoal(id);
    loadData();
  }

  async function handleAllocate() {
    if (!allocGoalId || !allocAmount) return;
    const cents = Math.round(parseFloat(allocAmount) * 100);
    if (cents <= 0) return;
    await allocateToGoal(allocGoalId, cents);
    setAllocGoalId(null);
    setAllocAmount('');
    loadData();
  }

  const completedCount = items.filter((i) => i.status === 'completed').length;
  const totalSaved = items.reduce((s, i) => s + i.goal.current_amount_cents, 0);
  const totalTarget = items.reduce((s, i) => s + i.goal.target_amount_cents, 0);

  if (loading) {
    return (
      <div>
        <PageHeader title="Goals" />
        <Card><div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading...</div></Card>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <PageHeader
        title="Goals"
        subtitle="Track your savings targets"
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus size={14} /> New Goal
          </Button>
        }
      />

      {items.length === 0 ? (
        <Card>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><Target size={48} color="var(--text-muted)" /></div>
            <div className={styles.emptyText}>
              No goals yet. Create a savings goal to start tracking your progress.
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus size={14} /> Create First Goal
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className={styles.summary}>
            <Card className={styles.summaryCard}>
              <div className={styles.summaryLabel}>Total Saved</div>
              <div className={styles.summaryValue}>{formatCurrency(totalSaved)}</div>
            </Card>
            <Card className={styles.summaryCard}>
              <div className={styles.summaryLabel}>Total Target</div>
              <div className={styles.summaryValue}>{formatCurrency(totalTarget)}</div>
            </Card>
            <Card className={styles.summaryCard}>
              <div className={styles.summaryLabel}>Completed</div>
              <div className={styles.summaryValue}>
                {completedCount} / {items.length}
              </div>
            </Card>
          </div>

          {/* Goal cards */}
          <div className={styles.goalGrid}>
            {items.map(({ goal, progress, status, suggestedMonthly }) => {
              const badgeClass = status === 'completed'
                ? styles.badgeComplete
                : status === 'overdue'
                ? styles.badgeOverdue
                : styles.badgeActive;

              return (
                <Card key={goal.id} className={styles.goalCard}>
                  <div className={styles.goalHeader}>
                    <span className={styles.goalName}>{goal.name}</span>
                    <span className={`${styles.goalBadge} ${badgeClass}`}>
                      {STATUS_LABELS[status] ?? status}
                    </span>
                  </div>

                  <div className={styles.goalAmounts}>
                    <span className={styles.goalCurrent}>{formatCurrency(progress.currentAmount)}</span>
                    <span className={styles.goalTarget}>of {formatCurrency(progress.targetAmount)}</span>
                  </div>

                  <ProgressBar value={Math.min(progress.percentage, 100)} size="md" />

                  <div className={styles.goalMeta}>
                    <span>{progress.percentage}% funded</span>
                    {goal.target_date && (
                      <span>Due {goal.target_date}</span>
                    )}
                    {suggestedMonthly !== null && status !== 'completed' && (
                      <span>{formatCurrency(suggestedMonthly)}/mo needed</span>
                    )}
                  </div>

                  <div className={styles.goalActions}>
                    {status !== 'completed' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => { setAllocGoalId(goal.id); setAllocAmount(''); }}
                      >
                        <Plus size={14} /> Add Funds
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(goal.id)}
                      style={{ color: 'var(--color-coral)' }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Add Goal Dialog */}
      <Dialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        title="New Goal"
        width={440}
      >
        <AddGoalForm
          categories={categories}
          onSubmit={async (input) => {
            await createGoal(input);
            setShowAddDialog(false);
            loadData();
          }}
          onCancel={() => setShowAddDialog(false)}
        />
      </Dialog>

      {/* Allocate Funds Dialog */}
      <Dialog
        open={allocGoalId !== null}
        onClose={() => setAllocGoalId(null)}
        title="Add Funds to Goal"
        width={360}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <Input
            label="Amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={allocAmount}
            onChange={(e) => setAllocAmount(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setAllocGoalId(null)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleAllocate} disabled={!allocAmount || parseFloat(allocAmount) <= 0}>
              Add Funds
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function AddGoalForm({
  categories,
  onSubmit,
  onCancel,
}: {
  categories: Category[];
  onSubmit: (input: { name: string; target_amount_cents: number; target_date?: string | null; category_id?: string | null }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [categoryId, setCategoryId] = useState('');

  function handleSubmit() {
    if (!name.trim() || !targetAmount) return;
    const cents = Math.round(parseFloat(targetAmount) * 100);
    if (cents <= 0) return;
    onSubmit({
      name: name.trim(),
      target_amount_cents: cents,
      target_date: targetDate || null,
      category_id: categoryId || null,
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <Input label="Goal Name" placeholder="e.g. Emergency Fund" value={name} onChange={(e) => setName(e.target.value)} />
      <div className={styles.formGrid}>
        <Input label="Target Amount" type="number" step="0.01" placeholder="1000.00" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
        <Input label="Target Date (optional)" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
      </div>
      <Select
        label="Linked Category (optional)"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        options={[
          { value: '', label: 'None' },
          ...categories.map((c) => ({
            value: c.id,
            label: `${c.emoji ?? ''} ${c.name}`.trim(),
          })),
        ]}
      />
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!name.trim() || !targetAmount}>
          Create Goal
        </Button>
      </div>
    </div>
  );
}
