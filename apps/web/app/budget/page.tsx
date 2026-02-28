'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Plus, ArrowRightLeft } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { fetchBudgetForMonth, setAllocation, moveMoney } from '../actions/budget';
import { fetchCategories, createCategoryGroup, createCategory } from '../actions/categories';
import { seedDefaultCategories } from '../actions/categories';
import type { MonthBudgetState, Category } from '@mybudget/shared';
import styles from './page.module.css';

function formatMonth(month: string): string {
  const [y, m] = month.split('-');
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function navigateMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function BudgetPage() {
  const [month, setMonth] = useState(currentMonth());
  const [budget, setBudget] = useState<MonthBudgetState | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [addType, setAddType] = useState<'group' | 'category'>('category');
  const [addName, setAddName] = useState('');
  const [addEmoji, setAddEmoji] = useState('');
  const [addGroupId, setAddGroupId] = useState('');
  const [moveFrom, setMoveFrom] = useState('');
  const [moveTo, setMoveTo] = useState('');
  const [moveAmount, setMoveAmount] = useState('');
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    await seedDefaultCategories();
    const [bgt, cats] = await Promise.all([
      fetchBudgetForMonth(month),
      fetchCategories(),
    ]);
    setBudget(bgt);
    setAllCategories(cats);
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const startEditAllocation = (catId: string, currentAmount: number) => {
    setEditingCategory(catId);
    setEditAmount((currentAmount / 100).toFixed(2));
  };

  const saveAllocation = async (catId: string) => {
    const cents = Math.round(parseFloat(editAmount || '0') * 100);
    await setAllocation(catId, month, cents);
    setEditingCategory(null);
    load();
  };

  const handleAddSubmit = async () => {
    if (addType === 'group') {
      await createCategoryGroup({ name: addName });
    } else {
      if (!addGroupId) return;
      await createCategory({
        group_id: addGroupId,
        name: addName,
        emoji: addEmoji || undefined,
      });
    }
    setShowAddDialog(false);
    setAddName('');
    setAddEmoji('');
    load();
  };

  const handleMoveSubmit = async () => {
    if (!moveFrom || !moveTo || !moveAmount) return;
    const cents = Math.round(parseFloat(moveAmount) * 100);
    await moveMoney(moveFrom, moveTo, month, cents);
    setShowMoveDialog(false);
    setMoveFrom('');
    setMoveTo('');
    setMoveAmount('');
    load();
  };

  if (loading || !budget) return <BudgetSkeleton />;

  const rtaColor = budget.readyToAssign > 0 ? 'var(--color-teal)' : budget.readyToAssign < 0 ? 'var(--color-coral)' : 'var(--text-muted)';

  const categoryOptions = allCategories.map((c) => ({
    value: c.id,
    label: `${c.emoji ?? ''} ${c.name}`.trim(),
  }));

  return (
    <div className="fade-in">
      <PageHeader
        title="Budget"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setShowMoveDialog(true)}>
              <ArrowRightLeft size={14} /> Move
            </Button>
            <Button variant="secondary" size="sm" onClick={() => { setAddType('category'); setShowAddDialog(true); }}>
              <Plus size={14} /> Add
            </Button>
          </div>
        }
      />

      {/* Month Navigation + Ready to Assign */}
      <div className={styles.monthBar}>
        <button className={styles.monthNav} onClick={() => setMonth(navigateMonth(month, -1))}>
          <ChevronLeft size={18} />
        </button>
        <span className={styles.monthLabel}>{formatMonth(month)}</span>
        <button className={styles.monthNav} onClick={() => setMonth(navigateMonth(month, 1))}>
          <ChevronRight size={18} />
        </button>
        <div className={styles.rta} style={{ borderColor: rtaColor }}>
          <span className={styles.rtaLabel}>Ready to Assign</span>
          <span style={{ color: rtaColor, fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>
            <CurrencyDisplay amount={budget.readyToAssign} />
          </span>
        </div>
      </div>

      {/* Category Groups */}
      <div className={styles.groups}>
        {budget.groups.map((group) => (
          <Card key={group.groupId} className={styles.groupCard}>
            <button className={styles.groupHeader} onClick={() => toggleGroup(group.groupId)}>
              <div className={styles.groupLeft}>
                {collapsedGroups.has(group.groupId) ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                <span className={styles.groupName}>{group.name}</span>
              </div>
              <div className={styles.groupTotals}>
                <span className={styles.colHeader}>Allocated</span>
                <span className={styles.colHeader}>Activity</span>
                <span className={styles.colHeader}>Available</span>
              </div>
              <div className={styles.groupValues}>
                <CurrencyDisplay amount={group.allocated} />
                <CurrencyDisplay amount={group.activity} colorize />
                <CurrencyDisplay amount={group.available} colorize />
              </div>
            </button>

            {!collapsedGroups.has(group.groupId) && (
              <div className={styles.categoryList}>
                {group.categories.map((cat) => (
                  <div key={cat.categoryId} className={styles.categoryRow}>
                    <div className={styles.catName}>
                      {cat.emoji && <span>{cat.emoji}</span>}
                      <span>{cat.name}</span>
                    </div>

                    <div className={styles.catValues}>
                      {/* Allocated - editable */}
                      <div className={styles.catCell}>
                        {editingCategory === cat.categoryId ? (
                          <input
                            className={styles.inlineInput}
                            type="number"
                            step="0.01"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            onBlur={() => saveAllocation(cat.categoryId)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveAllocation(cat.categoryId); if (e.key === 'Escape') setEditingCategory(null); }}
                            autoFocus
                          />
                        ) : (
                          <button
                            className={styles.allocBtn}
                            onClick={() => startEditAllocation(cat.categoryId, cat.allocated)}
                          >
                            <CurrencyDisplay amount={cat.allocated} />
                          </button>
                        )}
                      </div>

                      {/* Activity */}
                      <div className={styles.catCell}>
                        <CurrencyDisplay amount={cat.activity} colorize />
                      </div>

                      {/* Available */}
                      <div className={styles.catCell}>
                        <CurrencyDisplay amount={cat.available} colorize />
                      </div>
                    </div>

                    {/* Progress bar */}
                    {cat.targetAmount && (
                      <div className={styles.catProgress}>
                        <ProgressBar
                          value={cat.targetProgress ?? 0}
                          size="sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Add Category/Group Dialog */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} title={addType === 'group' ? 'New Category Group' : 'New Category'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant={addType === 'group' ? 'primary' : 'ghost'} size="sm" onClick={() => setAddType('group')}>Group</Button>
            <Button variant={addType === 'category' ? 'primary' : 'ghost'} size="sm" onClick={() => setAddType('category')}>Category</Button>
          </div>
          <Input label="Name" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder={addType === 'group' ? 'e.g. Essentials' : 'e.g. Groceries'} />
          {addType === 'category' && (
            <>
              <Input label="Emoji" value={addEmoji} onChange={(e) => setAddEmoji(e.target.value)} placeholder="e.g. 🛒" />
              <Select
                label="Group"
                value={addGroupId}
                onChange={(e) => setAddGroupId(e.target.value)}
                options={[
                  { value: '', label: 'Select group...' },
                  ...budget.groups.map((g) => ({ value: g.groupId, label: g.name })),
                ]}
              />
            </>
          )}
          <Button onClick={handleAddSubmit} disabled={!addName || (addType === 'category' && !addGroupId)}>
            Create
          </Button>
        </div>
      </Dialog>

      {/* Move Money Dialog */}
      <Dialog open={showMoveDialog} onClose={() => setShowMoveDialog(false)} title="Move Money">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Select
            label="From Category"
            value={moveFrom}
            onChange={(e) => setMoveFrom(e.target.value)}
            options={[{ value: '', label: 'Select...' }, ...categoryOptions]}
          />
          <Select
            label="To Category"
            value={moveTo}
            onChange={(e) => setMoveTo(e.target.value)}
            options={[{ value: '', label: 'Select...' }, ...categoryOptions]}
          />
          <Input label="Amount" type="number" step="0.01" value={moveAmount} onChange={(e) => setMoveAmount(e.target.value)} placeholder="0.00" />
          <Button onClick={handleMoveSubmit} disabled={!moveFrom || !moveTo || !moveAmount}>
            Move
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function BudgetSkeleton() {
  return (
    <div>
      <PageHeader title="Budget" />
      {[1, 2, 3].map((i) => (
        <Card key={i} className={styles.groupCard}>
          <div style={{ height: 40, background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 8 }} />
          <div style={{ height: 20, width: '60%', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }} />
        </Card>
      ))}
    </div>
  );
}
