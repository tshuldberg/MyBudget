'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, TrendingDown, Trash2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';
import { Dialog } from '../../components/ui/Dialog';
import {
  fetchDebtPayoffPlans,
  createDebtPayoffPlan,
  addDebtToPlan,
  deleteDebtFromPlan,
  deleteDebtPayoffPlan,
  calculatePayoffProjection,
} from '../actions/debt-payoff';
import type { DebtPayoffResult } from '@mybudget/shared';
import { chartColors, axisStyle, gridStyle, tooltipStyle, CHART_PALETTE } from '../../lib/chart-theme';
import styles from './page.module.css';

function formatCurrency(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface PlanWithDebts {
  id: string;
  name: string;
  strategy: string;
  extra_payment: number;
  is_active: number;
  debts: Array<{
    id: string;
    plan_id: string;
    name: string;
    balance: number;
    interest_rate: number;
    minimum_payment: number;
    compounding: string;
    sort_order: number;
  }>;
}

export default function DebtPayoffPage() {
  const [plans, setPlans] = useState<PlanWithDebts[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [projection, setProjection] = useState<DebtPayoffResult | null>(null);
  const [extraPayment, setExtraPayment] = useState('0');
  const [loading, setLoading] = useState(true);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [showAddDebt, setShowAddDebt] = useState(false);

  const loadPlans = useCallback(async () => {
    const result = await fetchDebtPayoffPlans();
    setPlans(result as PlanWithDebts[]);
    if (result.length > 0 && !activePlanId) {
      setActivePlanId(result[0].id);
    }
    setLoading(false);
  }, [activePlanId]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const loadProjection = useCallback(async () => {
    if (!activePlanId) return;
    const plan = plans.find((p) => p.id === activePlanId);
    if (!plan || plan.debts.length === 0) {
      setProjection(null);
      return;
    }
    const extraCents = Math.round(parseFloat(extraPayment || '0') * 100);
    const result = await calculatePayoffProjection(activePlanId, extraCents);
    setProjection(result);
  }, [activePlanId, plans, extraPayment]);

  useEffect(() => {
    loadProjection();
  }, [loadProjection]);

  const activePlan = plans.find((p) => p.id === activePlanId);

  async function handleDeletePlan(planId: string) {
    await deleteDebtPayoffPlan(planId);
    if (activePlanId === planId) setActivePlanId(null);
    await loadPlans();
  }

  async function handleDeleteDebt(debtId: string) {
    await deleteDebtFromPlan(debtId);
    await loadPlans();
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Debt Payoff" subtitle="Plan your path to debt freedom" />
        <Card><div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading...</div></Card>
      </div>
    );
  }

  // Build chart data from projection
  const chartData: Array<{ month: number; [key: string]: number }> = [];
  if (projection && projection.schedule.length > 0) {
    const debtNames = [...new Set(projection.schedule.map((e) => e.debtName))];
    const maxMonth = projection.totalMonths;
    // Sample at most 24 points to avoid chart overload
    const step = Math.max(1, Math.floor(maxMonth / 24));

    for (let m = 1; m <= maxMonth; m += step) {
      const point: Record<string, number> = { month: m };
      for (const name of debtNames) {
        const entry = projection.schedule.find((e) => e.month === m && e.debtName === name);
        point[name] = entry ? entry.remainingBalance / 100 : 0;
      }
      chartData.push(point);
    }
  }

  const debtNames = projection ? [...new Set(projection.schedule.map((e) => e.debtName))] : [];

  return (
    <div className="fade-in">
      <PageHeader
        title="Debt Payoff"
        subtitle="Plan your path to debt freedom"
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowNewPlan(true)}>
            <Plus size={14} /> New Plan
          </Button>
        }
      />

      {plans.length === 0 ? (
        <Card>
          <EmptyState
            icon={TrendingDown}
            title="No debt payoff plans"
            description="Create a plan to start tracking your debt repayment strategy."
            actionLabel="Create Plan"
            onAction={() => setShowNewPlan(true)}
          />
        </Card>
      ) : (
        <div className={styles.content}>
          {/* Plan selector */}
          {plans.length > 1 && (
            <Card>
              <Select
                label="Active Plan"
                value={activePlanId ?? ''}
                onChange={(e) => setActivePlanId(e.target.value)}
                options={plans.map((p) => ({ value: p.id, label: `${p.name} (${p.strategy})` }))}
              />
            </Card>
          )}

          {activePlan && (
            <>
              {/* Strategy */}
              <div className={styles.strategyToggle}>
                <div className={`${styles.strategyBtn} ${activePlan.strategy === 'snowball' ? styles.strategyBtnActive : ''}`}>
                  Snowball (lowest balance first)
                </div>
                <div className={`${styles.strategyBtn} ${activePlan.strategy === 'avalanche' ? styles.strategyBtnActive : ''}`}>
                  Avalanche (highest interest first)
                </div>
              </div>

              {/* Debts list */}
              <Card>
                <div className={styles.sectionTitle}>Debts in Plan</div>
                {activePlan.debts.length === 0 ? (
                  <div style={{ padding: 'var(--spacing-lg)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                    No debts added yet. Add a debt to calculate payoff projections.
                  </div>
                ) : (
                  <div className={styles.debtList}>
                    {activePlan.debts.map((debt) => (
                      <div key={debt.id} className={styles.debtRow}>
                        <span className={styles.debtName}>{debt.name}</span>
                        <span className={styles.debtDetail}>{formatCurrency(debt.balance)}</span>
                        <span className={styles.debtDetail}>{(debt.interest_rate / 100).toFixed(2)}%</span>
                        <span className={styles.debtDetail}>{formatCurrency(debt.minimum_payment)}/mo</span>
                        <span className={styles.debtDetail}>{debt.compounding}</span>
                        <button className={styles.debtDeleteBtn} onClick={() => handleDeleteDebt(debt.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 'var(--spacing-md)' }}>
                  <Button variant="secondary" size="sm" onClick={() => setShowAddDebt(true)}>
                    <Plus size={14} /> Add Debt
                  </Button>
                </div>
              </Card>

              {/* Extra payment input */}
              <Card>
                <div className={styles.extraPaymentRow}>
                  <Input
                    label="Extra Monthly Payment"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={extraPayment}
                    onChange={(e) => setExtraPayment(e.target.value)}
                  />
                </div>
              </Card>

              {/* Projection summary */}
              {projection && activePlan.debts.length > 0 && (
                <>
                  <div className={styles.summary}>
                    <Card className={styles.summaryCard}>
                      <div className={styles.summaryLabel}>Months to Pay Off</div>
                      <div className={styles.summaryValue}>{projection.totalMonths}</div>
                    </Card>
                    <Card className={styles.summaryCard}>
                      <div className={styles.summaryLabel}>Total Paid</div>
                      <div className={styles.summaryValue}>{formatCurrency(projection.totalPaid)}</div>
                    </Card>
                    <Card className={styles.summaryCard}>
                      <div className={styles.summaryLabel}>Total Interest</div>
                      <div className={`${styles.summaryValue} ${styles.summaryValueCoral}`}>
                        {formatCurrency(projection.totalInterest)}
                      </div>
                    </Card>
                    <Card className={styles.summaryCard}>
                      <div className={styles.summaryLabel}>Debt Free Date</div>
                      <div className={`${styles.summaryValue} ${styles.summaryValueTeal}`}>
                        {projection.debtFreeDate ?? 'N/A'}
                      </div>
                    </Card>
                  </div>

                  {/* Balance chart */}
                  {chartData.length > 0 && (
                    <Card>
                      <div className={styles.sectionTitle}>Remaining Balance Over Time</div>
                      <div className={styles.chartWrap}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid {...gridStyle} />
                            <XAxis dataKey="month" {...axisStyle} label={{ value: 'Month', position: 'insideBottom', offset: -5, ...axisStyle }} />
                            <YAxis {...axisStyle} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                              {...tooltipStyle}
                              formatter={(value: number, name: string) => [
                                `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                                name,
                              ]}
                            />
                            <Legend />
                            {debtNames.map((name, i) => (
                              <Bar
                                key={name}
                                dataKey={name}
                                stackId="a"
                                fill={CHART_PALETTE[i % CHART_PALETTE.length]}
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  )}

                  {/* Amortization table (show first 24 months) */}
                  <Card>
                    <div className={styles.sectionTitle}>Monthly Amortization Schedule</div>
                    <div style={{ overflowX: 'auto' }}>
                      <table className={styles.amortTable}>
                        <thead>
                          <tr>
                            <th>Month</th>
                            <th>Debt</th>
                            <th>Payment</th>
                            <th>Principal</th>
                            <th>Interest</th>
                            <th>Remaining</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projection.schedule.slice(0, 48).map((entry, i) => (
                            <tr key={`${entry.month}-${entry.debtId}-${i}`}>
                              <td>{entry.month}</td>
                              <td>{entry.debtName}</td>
                              <td>{formatCurrency(entry.payment)}</td>
                              <td>{formatCurrency(entry.principal)}</td>
                              <td style={{ color: 'var(--color-coral)' }}>{formatCurrency(entry.interest)}</td>
                              <td>{formatCurrency(entry.remainingBalance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {projection.schedule.length > 48 && (
                        <div style={{ padding: 'var(--spacing-md)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                          Showing first 48 entries of {projection.schedule.length} total
                        </div>
                      )}
                    </div>
                  </Card>
                </>
              )}

              {/* Delete plan */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeletePlan(activePlan.id)}
                >
                  <Trash2 size={14} /> Delete Plan
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* New Plan Dialog */}
      <Dialog open={showNewPlan} onClose={() => setShowNewPlan(false)} title="New Debt Payoff Plan" width={440}>
        <NewPlanForm
          onSubmit={async (name, strategy) => {
            const plan = await createDebtPayoffPlan(name, strategy);
            setShowNewPlan(false);
            setActivePlanId(plan.id);
            await loadPlans();
          }}
          onCancel={() => setShowNewPlan(false)}
        />
      </Dialog>

      {/* Add Debt Dialog */}
      <Dialog open={showAddDebt} onClose={() => setShowAddDebt(false)} title="Add Debt" width={480}>
        {activePlanId && (
          <AddDebtForm
            planId={activePlanId}
            onSubmit={async (planId, name, balance, interestRate, minimumPayment, compounding) => {
              await addDebtToPlan(planId, name, balance, interestRate, minimumPayment, compounding);
              setShowAddDebt(false);
              await loadPlans();
            }}
            onCancel={() => setShowAddDebt(false)}
          />
        )}
      </Dialog>
    </div>
  );
}

function NewPlanForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (name: string, strategy: 'snowball' | 'avalanche') => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [strategy, setStrategy] = useState<'snowball' | 'avalanche'>('snowball');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <Input label="Plan Name" placeholder="e.g. Credit Cards" value={name} onChange={(e) => setName(e.target.value)} />
      <Select
        label="Strategy"
        value={strategy}
        onChange={(e) => setStrategy(e.target.value as 'snowball' | 'avalanche')}
        options={[
          { value: 'snowball', label: 'Snowball (smallest balance first)' },
          { value: 'avalanche', label: 'Avalanche (highest interest first)' },
        ]}
      />
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={() => onSubmit(name, strategy)} disabled={!name.trim()}>
          Create Plan
        </Button>
      </div>
    </div>
  );
}

function AddDebtForm({
  planId,
  onSubmit,
  onCancel,
}: {
  planId: string;
  onSubmit: (planId: string, name: string, balance: number, interestRate: number, minimumPayment: number, compounding: 'monthly' | 'daily') => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');
  const [compounding, setCompounding] = useState<'monthly' | 'daily'>('monthly');

  function handleSubmit() {
    if (!name.trim() || !balance || !minimumPayment) return;
    const balanceCents = Math.round(parseFloat(balance) * 100);
    // Convert percentage to basis points (18.00% -> 1800)
    const rateBps = Math.round(parseFloat(interestRate || '0') * 100);
    const minPayCents = Math.round(parseFloat(minimumPayment) * 100);
    onSubmit(planId, name.trim(), balanceCents, rateBps, minPayCents, compounding);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <Input label="Debt Name" placeholder="e.g. Chase Visa" value={name} onChange={(e) => setName(e.target.value)} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
        <Input label="Balance ($)" type="number" step="0.01" placeholder="5000.00" value={balance} onChange={(e) => setBalance(e.target.value)} />
        <Input label="Interest Rate (%)" type="number" step="0.01" placeholder="18.00" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
        <Input label="Minimum Payment ($)" type="number" step="0.01" placeholder="100.00" value={minimumPayment} onChange={(e) => setMinimumPayment(e.target.value)} />
        <Select
          label="Compounding"
          value={compounding}
          onChange={(e) => setCompounding(e.target.value as 'monthly' | 'daily')}
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'daily', label: 'Daily' },
          ]}
        />
      </div>
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!name.trim() || !balance || !minimumPayment}>
          Add Debt
        </Button>
      </div>
    </div>
  );
}
