'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  doArchiveAccount,
  doArchiveEnvelope,
  doCreateAccount,
  doCreateEnvelope,
  doCreateGoal,
  doCreateTransaction,
  doDeleteAccount,
  doDeleteEnvelope,
  doDeleteGoal,
  doDeleteTransaction,
  doRestoreAccount,
  doRestoreEnvelope,
  doUpdateAccount,
  doUpdateEnvelope,
  doUpdateGoal,
  doUpdateTransaction,
  fetchAccounts,
  fetchEnvelopes,
  fetchGoals,
  fetchTransactions,
} from './actions';

type AccountType = 'cash' | 'checking' | 'savings' | 'credit' | 'other';
type TransactionDirection = 'inflow' | 'outflow' | 'transfer';

interface EnvelopeRow {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  monthly_budget: number;
  rollover_enabled: number;
  archived: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface AccountRow {
  id: string;
  name: string;
  type: AccountType;
  current_balance: number;
  currency: string;
  archived: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface TransactionRow {
  id: string;
  envelope_id: string | null;
  account_id: string | null;
  amount: number;
  direction: TransactionDirection;
  merchant: string | null;
  note: string | null;
  occurred_on: string;
  created_at: string;
  updated_at: string;
}

interface GoalRow {
  id: string;
  envelope_id: string;
  name: string;
  target_amount: number;
  target_date: string | null;
  completed_amount: number;
  is_completed: number;
  created_at: string;
  updated_at: string;
}

const ACCOUNT_TYPES: AccountType[] = [
  'cash',
  'checking',
  'savings',
  'credit',
  'other',
];

const TRANSACTION_DIRECTIONS: TransactionDirection[] = [
  'outflow',
  'inflow',
  'transfer',
];

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatTransactionAmount(tx: TransactionRow): string {
  const amount = formatCurrency(Math.abs(tx.amount));
  if (tx.direction === 'outflow') return `-${amount}`;
  if (tx.direction === 'inflow') return `+${amount}`;
  return amount;
}

function goalProgressPercent(goal: GoalRow): number {
  if (goal.target_amount <= 0) {
    return goal.completed_amount > 0 ? 100 : 0;
  }
  return Math.max(
    0,
    Math.min(100, Math.round((goal.completed_amount / goal.target_amount) * 100)),
  );
}

function parseDollarInput(value: string, allowNegative = false): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (!allowNegative && parsed < 0) return null;
  return Math.round(parsed * 100);
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function accountTypeIcon(type: AccountType): string {
  if (type === 'cash') return '💵';
  if (type === 'checking') return '🏦';
  if (type === 'savings') return '🪙';
  if (type === 'credit') return '💳';
  return '📒';
}

function titleCase(word: string): string {
  return `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`;
}

export default function BudgetPage() {
  const [envelopes, setEnvelopes] = useState<EnvelopeRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [includeArchivedEnvelopes, setIncludeArchivedEnvelopes] = useState(false);
  const [includeArchivedAccounts, setIncludeArchivedAccounts] = useState(false);

  const [envelopeName, setEnvelopeName] = useState('');
  const [envelopeMonthlyBudget, setEnvelopeMonthlyBudget] = useState('0.00');
  const [envelopeIcon, setEnvelopeIcon] = useState('');
  const [envelopeSubmitting, setEnvelopeSubmitting] = useState(false);
  const [workingEnvelopeId, setWorkingEnvelopeId] = useState<string | null>(
    null,
  );
  const [editingEnvelopeId, setEditingEnvelopeId] = useState<string | null>(
    null,
  );
  const [editEnvelopeName, setEditEnvelopeName] = useState('');
  const [editEnvelopeMonthlyBudget, setEditEnvelopeMonthlyBudget] =
    useState('0.00');
  const [editEnvelopeIcon, setEditEnvelopeIcon] = useState('');

  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('checking');
  const [accountBalance, setAccountBalance] = useState('0.00');
  const [accountSubmitting, setAccountSubmitting] = useState(false);
  const [workingAccountId, setWorkingAccountId] = useState<string | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editAccountName, setEditAccountName] = useState('');
  const [editAccountType, setEditAccountType] =
    useState<AccountType>('checking');
  const [editAccountBalance, setEditAccountBalance] = useState('0.00');
  const [editAccountCurrency, setEditAccountCurrency] = useState('USD');

  const [txAmount, setTxAmount] = useState('0.00');
  const [txDirection, setTxDirection] =
    useState<TransactionDirection>('outflow');
  const [txOccurredOn, setTxOccurredOn] = useState(todayIsoDate());
  const [txMerchant, setTxMerchant] = useState('');
  const [txNote, setTxNote] = useState('');
  const [txAccountId, setTxAccountId] = useState('');
  const [txEnvelopeId, setTxEnvelopeId] = useState('');
  const [txSubmitting, setTxSubmitting] = useState(false);
  const [workingTransactionId, setWorkingTransactionId] = useState<string | null>(
    null,
  );
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(
    null,
  );
  const [editTxAmount, setEditTxAmount] = useState('0.00');
  const [editTxDirection, setEditTxDirection] =
    useState<TransactionDirection>('outflow');
  const [editTxOccurredOn, setEditTxOccurredOn] = useState(todayIsoDate());
  const [editTxMerchant, setEditTxMerchant] = useState('');
  const [editTxNote, setEditTxNote] = useState('');
  const [editTxAccountId, setEditTxAccountId] = useState('');
  const [editTxEnvelopeId, setEditTxEnvelopeId] = useState('');
  const [txFilterDirection, setTxFilterDirection] = useState<
    'all' | TransactionDirection
  >('all');
  const [txFilterAccountId, setTxFilterAccountId] = useState('all');
  const [txFilterEnvelopeId, setTxFilterEnvelopeId] = useState('all');

  const [goalName, setGoalName] = useState('');
  const [goalTargetAmount, setGoalTargetAmount] = useState('0.00');
  const [goalCompletedAmount, setGoalCompletedAmount] = useState('0.00');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [goalEnvelopeId, setGoalEnvelopeId] = useState('');
  const [goalSubmitting, setGoalSubmitting] = useState(false);
  const [workingGoalId, setWorkingGoalId] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalName, setEditGoalName] = useState('');
  const [editGoalTargetAmount, setEditGoalTargetAmount] = useState('0.00');
  const [editGoalCompletedAmount, setEditGoalCompletedAmount] = useState('0.00');
  const [editGoalTargetDate, setEditGoalTargetDate] = useState('');
  const [goalFilterStatus, setGoalFilterStatus] = useState<
    'all' | 'in_progress' | 'completed'
  >('all');
  const [goalFilterEnvelopeId, setGoalFilterEnvelopeId] = useState('all');
  const [goalSortBy, setGoalSortBy] = useState<
    'newest' | 'oldest' | 'progress_desc' | 'progress_asc' | 'target_desc' | 'due_soon'
  >('newest');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [envelopeRows, accountRows, transactionRows, goalRows] =
        await Promise.all([
        fetchEnvelopes(includeArchivedEnvelopes),
        fetchAccounts(includeArchivedAccounts),
        fetchTransactions({ limit: 200 }),
        fetchGoals(),
      ]);
      setEnvelopes(envelopeRows as EnvelopeRow[]);
      setAccounts(accountRows as AccountRow[]);
      setTransactions(transactionRows as TransactionRow[]);
      setGoals(goalRows as GoalRow[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load budget dashboard data.',
      );
    } finally {
      setLoading(false);
    }
  }, [includeArchivedAccounts, includeArchivedEnvelopes]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!txAccountId) {
      const firstActive = accounts.find((account) => account.archived === 0);
      if (firstActive) setTxAccountId(firstActive.id);
    }
  }, [accounts, txAccountId]);

  useEffect(() => {
    if (!txEnvelopeId) {
      const firstActive = envelopes.find((envelope) => envelope.archived === 0);
      if (firstActive) setTxEnvelopeId(firstActive.id);
    }
  }, [envelopes, txEnvelopeId]);

  useEffect(() => {
    if (!goalEnvelopeId) {
      const firstActive = envelopes.find((envelope) => envelope.archived === 0);
      if (firstActive) setGoalEnvelopeId(firstActive.id);
    }
  }, [envelopes, goalEnvelopeId]);

  const activeEnvelopes = useMemo(
    () => envelopes.filter((envelope) => envelope.archived === 0),
    [envelopes],
  );

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.archived === 0),
    [accounts],
  );

  const totalEnvelopeBudget = useMemo(
    () =>
      activeEnvelopes.reduce(
        (sum, envelope) => sum + envelope.monthly_budget,
        0,
      ),
    [activeEnvelopes],
  );

  const totalAccountBalance = useMemo(
    () =>
      activeAccounts.reduce(
        (sum, account) => sum + account.current_balance,
        0,
      ),
    [activeAccounts],
  );

  const totalGoalTarget = useMemo(
    () => goals.reduce((sum, goal) => sum + goal.target_amount, 0),
    [goals],
  );

  const totalGoalCompleted = useMemo(
    () => goals.reduce((sum, goal) => sum + goal.completed_amount, 0),
    [goals],
  );

  const completedGoalCount = useMemo(
    () => goals.filter((goal) => goal.is_completed === 1).length,
    [goals],
  );

  const accountNameById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  );

  const envelopeNameById = useMemo(
    () => new Map(envelopes.map((envelope) => [envelope.id, envelope.name])),
    [envelopes],
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (txFilterDirection !== 'all' && tx.direction !== txFilterDirection) {
        return false;
      }
      if (txFilterAccountId !== 'all' && tx.account_id !== txFilterAccountId) {
        return false;
      }
      if (txFilterEnvelopeId !== 'all' && tx.envelope_id !== txFilterEnvelopeId) {
        return false;
      }
      return true;
    });
  }, [
    transactions,
    txFilterAccountId,
    txFilterDirection,
    txFilterEnvelopeId,
  ]);

  const filteredGoals = useMemo(() => {
    const next = goals.filter((goal) => {
      if (goalFilterStatus === 'completed' && goal.is_completed !== 1) {
        return false;
      }
      if (goalFilterStatus === 'in_progress' && goal.is_completed !== 0) {
        return false;
      }
      if (goalFilterEnvelopeId !== 'all' && goal.envelope_id !== goalFilterEnvelopeId) {
        return false;
      }
      return true;
    });

    next.sort((a, b) => {
      const progressA =
        a.target_amount > 0 ? a.completed_amount / a.target_amount : 0;
      const progressB =
        b.target_amount > 0 ? b.completed_amount / b.target_amount : 0;

      if (goalSortBy === 'newest') {
        return b.created_at.localeCompare(a.created_at);
      }
      if (goalSortBy === 'oldest') {
        return a.created_at.localeCompare(b.created_at);
      }
      if (goalSortBy === 'progress_desc') {
        return progressB - progressA;
      }
      if (goalSortBy === 'progress_asc') {
        return progressA - progressB;
      }
      if (goalSortBy === 'target_desc') {
        return b.target_amount - a.target_amount;
      }

      const dueA = a.target_date ? Date.parse(a.target_date) : Number.MAX_SAFE_INTEGER;
      const dueB = b.target_date ? Date.parse(b.target_date) : Number.MAX_SAFE_INTEGER;
      return dueA - dueB;
    });

    return next;
  }, [goals, goalFilterEnvelopeId, goalFilterStatus, goalSortBy]);

  const clearEnvelopeEdit = () => {
    setEditingEnvelopeId(null);
    setEditEnvelopeName('');
    setEditEnvelopeMonthlyBudget('0.00');
    setEditEnvelopeIcon('');
  };

  const clearAccountEdit = () => {
    setEditingAccountId(null);
    setEditAccountName('');
    setEditAccountType('checking');
    setEditAccountBalance('0.00');
    setEditAccountCurrency('USD');
  };

  const clearTransactionEdit = () => {
    setEditingTransactionId(null);
    setEditTxAmount('0.00');
    setEditTxDirection('outflow');
    setEditTxOccurredOn(todayIsoDate());
    setEditTxMerchant('');
    setEditTxNote('');
    setEditTxAccountId('');
    setEditTxEnvelopeId('');
  };

  const clearGoalEdit = () => {
    setEditingGoalId(null);
    setEditGoalName('');
    setEditGoalTargetAmount('0.00');
    setEditGoalCompletedAmount('0.00');
    setEditGoalTargetDate('');
  };

  const handleCreateEnvelope = async () => {
    const trimmedName = envelopeName.trim();
    if (!trimmedName || envelopeSubmitting) return;

    const parsedBudget = parseDollarInput(envelopeMonthlyBudget);
    if (parsedBudget === null) {
      setError('Envelope monthly budget must be a valid non-negative number.');
      return;
    }

    setEnvelopeSubmitting(true);
    setError(null);
    try {
      await doCreateEnvelope(crypto.randomUUID(), {
        name: trimmedName,
        icon: envelopeIcon.trim() || null,
        monthly_budget: parsedBudget,
      });
      setEnvelopeName('');
      setEnvelopeMonthlyBudget('0.00');
      setEnvelopeIcon('');
      await load();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create envelope.';
      if (message.toLowerCase().includes('unique')) {
        setError(`An envelope named "${trimmedName}" already exists.`);
      } else {
        setError(message);
      }
    } finally {
      setEnvelopeSubmitting(false);
    }
  };

  const beginEnvelopeEdit = (envelope: EnvelopeRow) => {
    setEditingEnvelopeId(envelope.id);
    setEditEnvelopeName(envelope.name);
    setEditEnvelopeMonthlyBudget((envelope.monthly_budget / 100).toFixed(2));
    setEditEnvelopeIcon(envelope.icon ?? '');
    setError(null);
  };

  const handleSaveEnvelopeEdit = async () => {
    if (!editingEnvelopeId) return;

    const trimmedName = editEnvelopeName.trim();
    if (!trimmedName) {
      setError('Envelope name is required.');
      return;
    }

    const parsedBudget = parseDollarInput(editEnvelopeMonthlyBudget);
    if (parsedBudget === null) {
      setError('Envelope monthly budget must be a valid non-negative number.');
      return;
    }

    setWorkingEnvelopeId(editingEnvelopeId);
    setError(null);
    try {
      await doUpdateEnvelope(editingEnvelopeId, {
        name: trimmedName,
        icon: editEnvelopeIcon.trim() || null,
        monthly_budget: parsedBudget,
      });
      clearEnvelopeEdit();
      await load();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update envelope.';
      if (message.toLowerCase().includes('unique')) {
        setError(`An envelope named "${trimmedName}" already exists.`);
      } else {
        setError(message);
      }
    } finally {
      setWorkingEnvelopeId(null);
    }
  };

  const handleEnvelopeArchiveToggle = async (envelope: EnvelopeRow) => {
    setWorkingEnvelopeId(envelope.id);
    setError(null);
    try {
      if (envelope.archived) {
        await doRestoreEnvelope(envelope.id);
      } else {
        await doArchiveEnvelope(envelope.id);
      }
      if (editingEnvelopeId === envelope.id) clearEnvelopeEdit();
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update envelope archive state.',
      );
    } finally {
      setWorkingEnvelopeId(null);
    }
  };

  const handleDeleteEnvelope = async (envelope: EnvelopeRow) => {
    if (
      !window.confirm(`Delete envelope "${envelope.name}"? This cannot be undone.`)
    ) {
      return;
    }

    setWorkingEnvelopeId(envelope.id);
    setError(null);
    try {
      await doDeleteEnvelope(envelope.id);
      if (editingEnvelopeId === envelope.id) clearEnvelopeEdit();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete envelope.');
    } finally {
      setWorkingEnvelopeId(null);
    }
  };

  const handleCreateAccount = async () => {
    const trimmedName = accountName.trim();
    if (!trimmedName || accountSubmitting) return;

    const parsedBalance = parseDollarInput(accountBalance, true);
    if (parsedBalance === null) {
      setError('Account balance must be a valid number.');
      return;
    }

    setAccountSubmitting(true);
    setError(null);
    try {
      await doCreateAccount(crypto.randomUUID(), {
        name: trimmedName,
        type: accountType,
        current_balance: parsedBalance,
        currency: 'USD',
      });
      setAccountName('');
      setAccountType('checking');
      setAccountBalance('0.00');
      await load();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create account.';
      if (message.toLowerCase().includes('unique')) {
        setError(`An account named "${trimmedName}" already exists.`);
      } else {
        setError(message);
      }
    } finally {
      setAccountSubmitting(false);
    }
  };

  const beginAccountEdit = (account: AccountRow) => {
    setEditingAccountId(account.id);
    setEditAccountName(account.name);
    setEditAccountType(account.type);
    setEditAccountBalance((account.current_balance / 100).toFixed(2));
    setEditAccountCurrency(account.currency);
    setError(null);
  };

  const handleSaveAccountEdit = async () => {
    if (!editingAccountId) return;

    const trimmedName = editAccountName.trim();
    if (!trimmedName) {
      setError('Account name is required.');
      return;
    }

    const parsedBalance = parseDollarInput(editAccountBalance, true);
    if (parsedBalance === null) {
      setError('Account balance must be a valid number.');
      return;
    }

    const trimmedCurrency = editAccountCurrency.trim().toUpperCase();
    if (trimmedCurrency.length !== 3) {
      setError('Currency must be a 3-letter code (for example: USD).');
      return;
    }

    setWorkingAccountId(editingAccountId);
    setError(null);
    try {
      await doUpdateAccount(editingAccountId, {
        name: trimmedName,
        type: editAccountType,
        current_balance: parsedBalance,
        currency: trimmedCurrency,
      });
      clearAccountEdit();
      await load();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update account.';
      if (message.toLowerCase().includes('unique')) {
        setError(`An account named "${trimmedName}" already exists.`);
      } else {
        setError(message);
      }
    } finally {
      setWorkingAccountId(null);
    }
  };

  const handleAccountArchiveToggle = async (account: AccountRow) => {
    setWorkingAccountId(account.id);
    setError(null);
    try {
      if (account.archived) {
        await doRestoreAccount(account.id);
      } else {
        await doArchiveAccount(account.id);
      }
      if (editingAccountId === account.id) clearAccountEdit();
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update account archive state.',
      );
    } finally {
      setWorkingAccountId(null);
    }
  };

  const handleDeleteAccount = async (account: AccountRow) => {
    if (!window.confirm(`Delete account "${account.name}"? This cannot be undone.`)) {
      return;
    }

    setWorkingAccountId(account.id);
    setError(null);
    try {
      await doDeleteAccount(account.id);
      if (editingAccountId === account.id) clearAccountEdit();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account.');
    } finally {
      setWorkingAccountId(null);
    }
  };

  const handleCreateTransaction = async () => {
    if (txSubmitting) return;

    const parsedAmount = parseDollarInput(txAmount);
    if (parsedAmount === null) {
      setError('Transaction amount must be a valid non-negative number.');
      return;
    }

    const date = txOccurredOn.trim();
    if (!date) {
      setError('Transaction date is required.');
      return;
    }

    setTxSubmitting(true);
    setError(null);
    try {
      await doCreateTransaction(crypto.randomUUID(), {
        amount: parsedAmount,
        direction: txDirection,
        occurred_on: date,
        merchant: txMerchant.trim() || null,
        note: txNote.trim() || null,
        account_id: txAccountId || null,
        envelope_id: txEnvelopeId || null,
      });
      setTxAmount('0.00');
      setTxDirection('outflow');
      setTxOccurredOn(todayIsoDate());
      setTxMerchant('');
      setTxNote('');
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create transaction.',
      );
    } finally {
      setTxSubmitting(false);
    }
  };

  const beginTransactionEdit = (tx: TransactionRow) => {
    setEditingTransactionId(tx.id);
    setEditTxAmount((tx.amount / 100).toFixed(2));
    setEditTxDirection(tx.direction);
    setEditTxOccurredOn(tx.occurred_on);
    setEditTxMerchant(tx.merchant ?? '');
    setEditTxNote(tx.note ?? '');
    setEditTxAccountId(tx.account_id ?? '');
    setEditTxEnvelopeId(tx.envelope_id ?? '');
    setError(null);
  };

  const handleSaveTransactionEdit = async () => {
    if (!editingTransactionId) return;

    const parsedAmount = parseDollarInput(editTxAmount);
    if (parsedAmount === null) {
      setError('Transaction amount must be a valid non-negative number.');
      return;
    }

    const date = editTxOccurredOn.trim();
    if (!date) {
      setError('Transaction date is required.');
      return;
    }

    setWorkingTransactionId(editingTransactionId);
    setError(null);
    try {
      await doUpdateTransaction(editingTransactionId, {
        amount: parsedAmount,
        direction: editTxDirection,
        occurred_on: date,
        merchant: editTxMerchant.trim() || null,
        note: editTxNote.trim() || null,
        account_id: editTxAccountId || null,
        envelope_id: editTxEnvelopeId || null,
      });
      clearTransactionEdit();
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update transaction.',
      );
    } finally {
      setWorkingTransactionId(null);
    }
  };

  const handleDeleteTransaction = async (tx: TransactionRow) => {
    if (!window.confirm('Delete this transaction? This cannot be undone.')) {
      return;
    }

    setWorkingTransactionId(tx.id);
    setError(null);
    try {
      await doDeleteTransaction(tx.id);
      if (editingTransactionId === tx.id) clearTransactionEdit();
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete transaction.',
      );
    } finally {
      setWorkingTransactionId(null);
    }
  };

  const handleCreateGoal = async () => {
    const trimmedName = goalName.trim();
    if (!trimmedName || goalSubmitting) return;

    if (!goalEnvelopeId) {
      setError('Select an envelope before creating a goal.');
      return;
    }

    const parsedTarget = parseDollarInput(goalTargetAmount);
    if (parsedTarget === null) {
      setError('Goal target amount must be a valid non-negative number.');
      return;
    }
    if (parsedTarget <= 0) {
      setError('Goal target amount must be greater than zero.');
      return;
    }

    const parsedCompleted = parseDollarInput(goalCompletedAmount);
    if (parsedCompleted === null) {
      setError('Goal progress amount must be a valid non-negative number.');
      return;
    }

    const targetDate = goalTargetDate.trim();

    setGoalSubmitting(true);
    setError(null);
    try {
      await doCreateGoal(crypto.randomUUID(), {
        envelope_id: goalEnvelopeId,
        name: trimmedName,
        target_amount: parsedTarget,
        completed_amount: parsedCompleted,
        target_date: targetDate || null,
        is_completed: parsedCompleted >= parsedTarget ? 1 : 0,
      });
      setGoalName('');
      setGoalTargetAmount('0.00');
      setGoalCompletedAmount('0.00');
      setGoalTargetDate('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create goal.');
    } finally {
      setGoalSubmitting(false);
    }
  };

  const beginGoalEdit = (goal: GoalRow) => {
    setEditingGoalId(goal.id);
    setEditGoalName(goal.name);
    setEditGoalTargetAmount((goal.target_amount / 100).toFixed(2));
    setEditGoalCompletedAmount((goal.completed_amount / 100).toFixed(2));
    setEditGoalTargetDate(goal.target_date ?? '');
    setError(null);
  };

  const handleSaveGoalEdit = async () => {
    if (!editingGoalId) return;

    const trimmedName = editGoalName.trim();
    if (!trimmedName) {
      setError('Goal name is required.');
      return;
    }

    const parsedTarget = parseDollarInput(editGoalTargetAmount);
    if (parsedTarget === null) {
      setError('Goal target amount must be a valid non-negative number.');
      return;
    }
    if (parsedTarget <= 0) {
      setError('Goal target amount must be greater than zero.');
      return;
    }

    const parsedCompleted = parseDollarInput(editGoalCompletedAmount);
    if (parsedCompleted === null) {
      setError('Goal progress amount must be a valid non-negative number.');
      return;
    }

    setWorkingGoalId(editingGoalId);
    setError(null);
    try {
      await doUpdateGoal(editingGoalId, {
        name: trimmedName,
        target_amount: parsedTarget,
        completed_amount: parsedCompleted,
        target_date: editGoalTargetDate.trim() || null,
        is_completed: parsedCompleted >= parsedTarget ? 1 : 0,
      });
      clearGoalEdit();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update goal.');
    } finally {
      setWorkingGoalId(null);
    }
  };

  const handleGoalCompletionToggle = async (goal: GoalRow) => {
    setWorkingGoalId(goal.id);
    setError(null);
    try {
      const nextCompleted = goal.is_completed ? 0 : 1;
      await doUpdateGoal(goal.id, {
        is_completed: nextCompleted,
        completed_amount:
          nextCompleted === 1
            ? Math.max(goal.completed_amount, goal.target_amount)
            : goal.completed_amount,
      });
      if (editingGoalId === goal.id) clearGoalEdit();
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update goal status.',
      );
    } finally {
      setWorkingGoalId(null);
    }
  };

  const handleDeleteGoal = async (goal: GoalRow) => {
    if (!window.confirm(`Delete goal "${goal.name}"? This cannot be undone.`)) {
      return;
    }

    setWorkingGoalId(goal.id);
    setError(null);
    try {
      await doDeleteGoal(goal.id);
      if (editingGoalId === goal.id) clearGoalEdit();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete goal.');
    } finally {
      setWorkingGoalId(null);
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Budget</h1>
        <p style={styles.subtitle}>
          Manage envelopes, accounts, transactions, and savings goals.
        </p>
      </div>

      <div style={styles.toolbar}>
        <button onClick={() => void load()} style={styles.ghostButton}>
          Refresh
        </button>
        <button
          onClick={() => setIncludeArchivedEnvelopes((value) => !value)}
          style={styles.ghostButton}
        >
          {includeArchivedEnvelopes ? 'Hide Archived Envelopes' : 'Show Archived Envelopes'}
        </button>
        <button
          onClick={() => setIncludeArchivedAccounts((value) => !value)}
          style={styles.ghostButton}
        >
          {includeArchivedAccounts ? 'Hide Archived Accounts' : 'Show Archived Accounts'}
        </button>
      </div>

      {error ? <p style={styles.errorBanner}>{error}</p> : null}

      <div style={styles.metricsGrid}>
        <section style={styles.card}>
          <p style={styles.kicker}>Active Envelope Budget</p>
          <p style={styles.total}>{formatCurrency(totalEnvelopeBudget)}</p>
          <p style={styles.meta}>
            {activeEnvelopes.length} active envelope
            {activeEnvelopes.length === 1 ? '' : 's'}
          </p>
        </section>

        <section style={styles.card}>
          <p style={styles.kicker}>Active Account Balance</p>
          <p style={styles.total}>{formatCurrency(totalAccountBalance)}</p>
          <p style={styles.meta}>
            {activeAccounts.length} active account
            {activeAccounts.length === 1 ? '' : 's'}
          </p>
        </section>

        <section style={styles.card}>
          <p style={styles.kicker}>Transactions</p>
          <p style={styles.total}>{transactions.length.toLocaleString()}</p>
          <p style={styles.meta}>Most recent 200 records</p>
        </section>

        <section style={styles.card}>
          <p style={styles.kicker}>Goals Progress</p>
          <p style={styles.total}>{formatCurrency(totalGoalCompleted)}</p>
          <p style={styles.meta}>
            {completedGoalCount}/{goals.length} completed • target {formatCurrency(totalGoalTarget)}
          </p>
        </section>
      </div>

      <div style={styles.formsGrid}>
        <section style={styles.card}>
          <p style={styles.kicker}>New Envelope</p>
          <div style={styles.formRow}>
            <input
              value={envelopeName}
              onChange={(event) => setEnvelopeName(event.target.value)}
              placeholder="Envelope name"
              style={styles.input}
            />
            <input
              value={envelopeMonthlyBudget}
              onChange={(event) => setEnvelopeMonthlyBudget(event.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              style={styles.input}
            />
          </div>
          <div style={styles.formRow}>
            <input
              value={envelopeIcon}
              onChange={(event) => setEnvelopeIcon(event.target.value)}
              placeholder="Icon (optional)"
              style={styles.input}
            />
            <button
              onClick={() => void handleCreateEnvelope()}
              disabled={envelopeSubmitting || envelopeName.trim().length === 0}
              style={{
                ...styles.button,
                ...(envelopeSubmitting || envelopeName.trim().length === 0
                  ? styles.buttonDisabled
                  : {}),
              }}
            >
              {envelopeSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </section>

        <section style={styles.card}>
          <p style={styles.kicker}>New Account</p>
          <div style={styles.formRow}>
            <input
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              placeholder="Account name"
              style={styles.input}
            />
            <input
              value={accountBalance}
              onChange={(event) => setAccountBalance(event.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              style={styles.input}
            />
          </div>
          <div style={styles.formRow}>
            <select
              value={accountType}
              onChange={(event) => setAccountType(event.target.value as AccountType)}
              style={styles.select}
            >
              {ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {titleCase(type)}
                </option>
              ))}
            </select>
            <button
              onClick={() => void handleCreateAccount()}
              disabled={accountSubmitting || accountName.trim().length === 0}
              style={{
                ...styles.button,
                ...(accountSubmitting || accountName.trim().length === 0
                  ? styles.buttonDisabled
                  : {}),
              }}
            >
              {accountSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </section>

        <section style={styles.card}>
          <p style={styles.kicker}>New Transaction</p>
          <div style={styles.formRow}>
            <input
              value={txAmount}
              onChange={(event) => setTxAmount(event.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              style={styles.input}
            />
            <select
              value={txDirection}
              onChange={(event) =>
                setTxDirection(event.target.value as TransactionDirection)
              }
              style={styles.select}
            >
              {TRANSACTION_DIRECTIONS.map((direction) => (
                <option key={direction} value={direction}>
                  {titleCase(direction)}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.formRow}>
            <input
              type="date"
              value={txOccurredOn}
              onChange={(event) => setTxOccurredOn(event.target.value)}
              style={styles.input}
            />
            <input
              value={txMerchant}
              onChange={(event) => setTxMerchant(event.target.value)}
              placeholder="Merchant (optional)"
              style={styles.input}
            />
          </div>
          <div style={styles.formRow}>
            <select
              value={txAccountId}
              onChange={(event) => setTxAccountId(event.target.value)}
              style={styles.select}
            >
              <option value="">No account</option>
              {activeAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            <select
              value={txEnvelopeId}
              onChange={(event) => setTxEnvelopeId(event.target.value)}
              style={styles.select}
            >
              <option value="">No envelope</option>
              {activeEnvelopes.map((envelope) => (
                <option key={envelope.id} value={envelope.id}>
                  {envelope.name}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.formRow}>
            <input
              value={txNote}
              onChange={(event) => setTxNote(event.target.value)}
              placeholder="Note (optional)"
              style={styles.input}
            />
            <button
              onClick={() => void handleCreateTransaction()}
              disabled={txSubmitting}
              style={{
                ...styles.button,
                ...(txSubmitting ? styles.buttonDisabled : {}),
              }}
            >
              {txSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </section>

        <section style={styles.card}>
          <p style={styles.kicker}>New Goal</p>
          <div style={styles.formRow}>
            <input
              value={goalName}
              onChange={(event) => setGoalName(event.target.value)}
              placeholder="Goal name"
              style={styles.input}
            />
            <select
              value={goalEnvelopeId}
              onChange={(event) => setGoalEnvelopeId(event.target.value)}
              style={styles.select}
            >
              <option value="">Select envelope</option>
              {activeEnvelopes.map((envelope) => (
                <option key={envelope.id} value={envelope.id}>
                  {envelope.name}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.formRow}>
            <input
              value={goalTargetAmount}
              onChange={(event) => setGoalTargetAmount(event.target.value)}
              placeholder="Target amount (0.00)"
              inputMode="decimal"
              style={styles.input}
            />
            <input
              value={goalCompletedAmount}
              onChange={(event) => setGoalCompletedAmount(event.target.value)}
              placeholder="Completed amount (0.00)"
              inputMode="decimal"
              style={styles.input}
            />
          </div>
          <div style={styles.formRow}>
            <input
              type="date"
              value={goalTargetDate}
              onChange={(event) => setGoalTargetDate(event.target.value)}
              style={styles.input}
            />
            <button
              onClick={() => void handleCreateGoal()}
              disabled={
                goalSubmitting ||
                goalName.trim().length === 0 ||
                goalEnvelopeId.length === 0
              }
              style={{
                ...styles.button,
                ...(goalSubmitting ||
                goalName.trim().length === 0 ||
                goalEnvelopeId.length === 0
                  ? styles.buttonDisabled
                  : {}),
              }}
            >
              {goalSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
          {activeEnvelopes.length === 0 ? (
            <p style={styles.meta}>
              Create an active envelope before adding goals.
            </p>
          ) : null}
        </section>
      </div>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <p style={styles.kicker}>Envelopes</p>
        </div>

        {loading ? (
          <p style={styles.meta}>Loading envelopes...</p>
        ) : envelopes.length === 0 ? (
          <p style={styles.meta}>No envelopes yet.</p>
        ) : (
          <div style={styles.list}>
            {envelopes.map((envelope) => {
              const isEditing = editingEnvelopeId === envelope.id;
              const isWorking = workingEnvelopeId === envelope.id;

              return (
                <div
                  key={envelope.id}
                  style={{
                    ...styles.item,
                    ...(envelope.archived ? styles.archivedItem : {}),
                  }}
                >
                  {isEditing ? (
                    <div style={styles.editPanel}>
                      <div style={styles.formRow}>
                        <input
                          value={editEnvelopeName}
                          onChange={(event) =>
                            setEditEnvelopeName(event.target.value)
                          }
                          placeholder="Envelope name"
                          style={styles.input}
                        />
                        <input
                          value={editEnvelopeMonthlyBudget}
                          onChange={(event) =>
                            setEditEnvelopeMonthlyBudget(event.target.value)
                          }
                          placeholder="0.00"
                          inputMode="decimal"
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.formRow}>
                        <input
                          value={editEnvelopeIcon}
                          onChange={(event) =>
                            setEditEnvelopeIcon(event.target.value)
                          }
                          placeholder="Icon (optional)"
                          style={styles.input}
                        />
                        <button
                          onClick={() => void handleSaveEnvelopeEdit()}
                          disabled={isWorking}
                          style={{
                            ...styles.button,
                            ...(isWorking ? styles.buttonDisabled : {}),
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={clearEnvelopeEdit}
                          disabled={isWorking}
                          style={styles.ghostButton}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={styles.itemLeft}>
                        <span
                          style={{
                            ...styles.itemIcon,
                            backgroundColor: envelope.color
                              ? `${envelope.color}22`
                              : 'rgba(34, 197, 94, 0.14)',
                          }}
                        >
                          {envelope.icon ?? '💼'}
                        </span>
                        <div>
                          <p style={styles.itemTitle}>{envelope.name}</p>
                          <p style={styles.itemMeta}>
                            {envelope.rollover_enabled ? 'Rollover' : 'No rollover'}
                            {envelope.archived ? ' • Archived' : ''}
                          </p>
                        </div>
                      </div>
                      <div style={styles.itemRight}>
                        <p style={styles.itemValue}>
                          {formatCurrency(envelope.monthly_budget)}
                        </p>
                        <div style={styles.itemActions}>
                          <button
                            onClick={() => beginEnvelopeEdit(envelope)}
                            disabled={isWorking}
                            style={styles.actionButton}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => void handleEnvelopeArchiveToggle(envelope)}
                            disabled={isWorking}
                            style={styles.actionButton}
                          >
                            {envelope.archived ? 'Restore' : 'Archive'}
                          </button>
                          <button
                            onClick={() => void handleDeleteEnvelope(envelope)}
                            disabled={isWorking}
                            style={{ ...styles.actionButton, ...styles.deleteButton }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <p style={styles.kicker}>Accounts</p>
        </div>

        {loading ? (
          <p style={styles.meta}>Loading accounts...</p>
        ) : accounts.length === 0 ? (
          <p style={styles.meta}>No accounts yet.</p>
        ) : (
          <div style={styles.list}>
            {accounts.map((account) => {
              const isEditing = editingAccountId === account.id;
              const isWorking = workingAccountId === account.id;

              return (
                <div
                  key={account.id}
                  style={{
                    ...styles.item,
                    ...(account.archived ? styles.archivedItem : {}),
                  }}
                >
                  {isEditing ? (
                    <div style={styles.editPanel}>
                      <div style={styles.formRow}>
                        <input
                          value={editAccountName}
                          onChange={(event) => setEditAccountName(event.target.value)}
                          placeholder="Account name"
                          style={styles.input}
                        />
                        <input
                          value={editAccountBalance}
                          onChange={(event) =>
                            setEditAccountBalance(event.target.value)
                          }
                          placeholder="0.00"
                          inputMode="decimal"
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.formRow}>
                        <select
                          value={editAccountType}
                          onChange={(event) =>
                            setEditAccountType(event.target.value as AccountType)
                          }
                          style={styles.select}
                        >
                          {ACCOUNT_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {titleCase(type)}
                            </option>
                          ))}
                        </select>
                        <input
                          value={editAccountCurrency}
                          onChange={(event) =>
                            setEditAccountCurrency(event.target.value)
                          }
                          placeholder="USD"
                          maxLength={3}
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.formRow}>
                        <button
                          onClick={() => void handleSaveAccountEdit()}
                          disabled={isWorking}
                          style={{
                            ...styles.button,
                            ...(isWorking ? styles.buttonDisabled : {}),
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={clearAccountEdit}
                          disabled={isWorking}
                          style={styles.ghostButton}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={styles.itemLeft}>
                        <span style={styles.itemIcon}>{accountTypeIcon(account.type)}</span>
                        <div>
                          <p style={styles.itemTitle}>{account.name}</p>
                          <p style={styles.itemMeta}>
                            {titleCase(account.type)} • {account.currency}
                            {account.archived ? ' • Archived' : ''}
                          </p>
                        </div>
                      </div>
                      <div style={styles.itemRight}>
                        <p style={styles.itemValue}>
                          {formatCurrency(account.current_balance)}
                        </p>
                        <div style={styles.itemActions}>
                          <button
                            onClick={() => beginAccountEdit(account)}
                            disabled={isWorking}
                            style={styles.actionButton}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => void handleAccountArchiveToggle(account)}
                            disabled={isWorking}
                            style={styles.actionButton}
                          >
                            {account.archived ? 'Restore' : 'Archive'}
                          </button>
                          <button
                            onClick={() => void handleDeleteAccount(account)}
                            disabled={isWorking}
                            style={{ ...styles.actionButton, ...styles.deleteButton }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <p style={styles.kicker}>Goals</p>
        </div>
        <div style={styles.formRow}>
          <select
            value={goalFilterStatus}
            onChange={(event) =>
              setGoalFilterStatus(
                event.target.value as 'all' | 'in_progress' | 'completed',
              )
            }
            style={styles.select}
          >
            <option value="all">All Statuses</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={goalFilterEnvelopeId}
            onChange={(event) => setGoalFilterEnvelopeId(event.target.value)}
            style={styles.select}
          >
            <option value="all">All Envelopes</option>
            {envelopes.map((envelope) => (
              <option key={envelope.id} value={envelope.id}>
                {envelope.name}
              </option>
            ))}
          </select>
          <select
            value={goalSortBy}
            onChange={(event) =>
              setGoalSortBy(
                event.target.value as
                  | 'newest'
                  | 'oldest'
                  | 'progress_desc'
                  | 'progress_asc'
                  | 'target_desc'
                  | 'due_soon',
              )
            }
            style={styles.select}
          >
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="progress_desc">Sort: Progress High-Low</option>
            <option value="progress_asc">Sort: Progress Low-High</option>
            <option value="target_desc">Sort: Target High-Low</option>
            <option value="due_soon">Sort: Due Soon</option>
          </select>
        </div>

        {loading ? (
          <p style={styles.meta}>Loading goals...</p>
        ) : goals.length === 0 ? (
          <p style={styles.meta}>No goals yet.</p>
        ) : filteredGoals.length === 0 ? (
          <p style={styles.meta}>No goals match current filters.</p>
        ) : (
          <div style={styles.list}>
            {filteredGoals.map((goal) => {
              const isEditing = editingGoalId === goal.id;
              const isWorking = workingGoalId === goal.id;
              const percent = goalProgressPercent(goal);
              const envelopeName =
                envelopeNameById.get(goal.envelope_id) ?? 'Unknown envelope';

              return (
                <div key={goal.id} style={styles.item}>
                  {isEditing ? (
                    <div style={styles.editPanel}>
                      <div style={styles.formRow}>
                        <input
                          value={editGoalName}
                          onChange={(event) => setEditGoalName(event.target.value)}
                          placeholder="Goal name"
                          style={styles.input}
                        />
                        <input
                          value={editGoalTargetAmount}
                          onChange={(event) =>
                            setEditGoalTargetAmount(event.target.value)
                          }
                          placeholder="Target amount (0.00)"
                          inputMode="decimal"
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.formRow}>
                        <input
                          value={editGoalCompletedAmount}
                          onChange={(event) =>
                            setEditGoalCompletedAmount(event.target.value)
                          }
                          placeholder="Completed amount (0.00)"
                          inputMode="decimal"
                          style={styles.input}
                        />
                        <input
                          type="date"
                          value={editGoalTargetDate}
                          onChange={(event) => setEditGoalTargetDate(event.target.value)}
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.formRow}>
                        <button
                          onClick={() => void handleSaveGoalEdit()}
                          disabled={isWorking}
                          style={{
                            ...styles.button,
                            ...(isWorking ? styles.buttonDisabled : {}),
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={clearGoalEdit}
                          disabled={isWorking}
                          style={styles.ghostButton}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={styles.itemLeft}>
                        <span style={styles.itemIcon}>{goal.is_completed ? '✅' : '🎯'}</span>
                        <div>
                          <p style={styles.itemTitle}>{goal.name}</p>
                          <p style={styles.itemMeta}>
                            {envelopeName}
                            {goal.target_date ? ` • Due ${goal.target_date}` : ' • No due date'}
                          </p>
                          <p style={styles.itemMeta}>
                            {formatCurrency(goal.completed_amount)} of{' '}
                            {formatCurrency(goal.target_amount)} ({percent}%)
                          </p>
                          <div style={styles.progressTrack}>
                            <div
                              style={{
                                ...styles.progressFill,
                                width: `${percent}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <div style={styles.itemRight}>
                        <p style={styles.itemValue}>
                          {goal.is_completed ? 'Complete' : 'In Progress'}
                        </p>
                        <div style={styles.itemActions}>
                          <button
                            onClick={() => beginGoalEdit(goal)}
                            disabled={isWorking}
                            style={styles.actionButton}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => void handleGoalCompletionToggle(goal)}
                            disabled={isWorking}
                            style={styles.actionButton}
                          >
                            {goal.is_completed ? 'Reopen' : 'Complete'}
                          </button>
                          <button
                            onClick={() => void handleDeleteGoal(goal)}
                            disabled={isWorking}
                            style={{ ...styles.actionButton, ...styles.deleteButton }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <p style={styles.kicker}>Transactions</p>
        </div>
        <div style={styles.formRow}>
          <select
            value={txFilterDirection}
            onChange={(event) =>
              setTxFilterDirection(event.target.value as 'all' | TransactionDirection)
            }
            style={styles.select}
          >
            <option value="all">All Directions</option>
            {TRANSACTION_DIRECTIONS.map((direction) => (
              <option key={direction} value={direction}>
                {titleCase(direction)}
              </option>
            ))}
          </select>
          <select
            value={txFilterAccountId}
            onChange={(event) => setTxFilterAccountId(event.target.value)}
            style={styles.select}
          >
            <option value="all">All Accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <select
            value={txFilterEnvelopeId}
            onChange={(event) => setTxFilterEnvelopeId(event.target.value)}
            style={styles.select}
          >
            <option value="all">All Envelopes</option>
            {envelopes.map((envelope) => (
              <option key={envelope.id} value={envelope.id}>
                {envelope.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p style={styles.meta}>Loading transactions...</p>
        ) : filteredTransactions.length === 0 ? (
          <p style={styles.meta}>No transactions yet.</p>
        ) : (
          <div style={styles.list}>
            {filteredTransactions.map((tx) => {
              const isEditing = editingTransactionId === tx.id;
              const isWorking = workingTransactionId === tx.id;
              const amountColor =
                tx.direction === 'outflow'
                  ? 'var(--danger)'
                  : tx.direction === 'inflow'
                    ? 'var(--success)'
                    : 'var(--text)';
              const accountName = tx.account_id
                ? (accountNameById.get(tx.account_id) ?? 'Unknown account')
                : 'No account';
              const envelopeName = tx.envelope_id
                ? (envelopeNameById.get(tx.envelope_id) ?? 'Unknown envelope')
                : 'No envelope';

              return (
                <div key={tx.id} style={styles.item}>
                  {isEditing ? (
                    <div style={styles.editPanel}>
                      <div style={styles.formRow}>
                        <input
                          value={editTxAmount}
                          onChange={(event) => setEditTxAmount(event.target.value)}
                          placeholder="0.00"
                          inputMode="decimal"
                          style={styles.input}
                        />
                        <select
                          value={editTxDirection}
                          onChange={(event) =>
                            setEditTxDirection(
                              event.target.value as TransactionDirection,
                            )
                          }
                          style={styles.select}
                        >
                          {TRANSACTION_DIRECTIONS.map((direction) => (
                            <option key={direction} value={direction}>
                              {titleCase(direction)}
                            </option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={editTxOccurredOn}
                          onChange={(event) => setEditTxOccurredOn(event.target.value)}
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.formRow}>
                        <input
                          value={editTxMerchant}
                          onChange={(event) => setEditTxMerchant(event.target.value)}
                          placeholder="Merchant (optional)"
                          style={styles.input}
                        />
                        <select
                          value={editTxAccountId}
                          onChange={(event) => setEditTxAccountId(event.target.value)}
                          style={styles.select}
                        >
                          <option value="">No account</option>
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={editTxEnvelopeId}
                          onChange={(event) => setEditTxEnvelopeId(event.target.value)}
                          style={styles.select}
                        >
                          <option value="">No envelope</option>
                          {envelopes.map((envelope) => (
                            <option key={envelope.id} value={envelope.id}>
                              {envelope.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={styles.formRow}>
                        <input
                          value={editTxNote}
                          onChange={(event) => setEditTxNote(event.target.value)}
                          placeholder="Note (optional)"
                          style={styles.input}
                        />
                        <button
                          onClick={() => void handleSaveTransactionEdit()}
                          disabled={isWorking}
                          style={{
                            ...styles.button,
                            ...(isWorking ? styles.buttonDisabled : {}),
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={clearTransactionEdit}
                          disabled={isWorking}
                          style={styles.ghostButton}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={styles.itemLeft}>
                        <span style={styles.itemIcon}>
                          {tx.direction === 'outflow'
                            ? '↘'
                            : tx.direction === 'inflow'
                              ? '↗'
                              : '↔'}
                        </span>
                        <div>
                          <p style={styles.itemTitle}>{tx.merchant ?? 'Transaction'}</p>
                          <p style={styles.itemMeta}>
                            {tx.occurred_on} • {titleCase(tx.direction)} • {accountName} • {envelopeName}
                          </p>
                          {tx.note ? <p style={styles.itemMeta}>{tx.note}</p> : null}
                        </div>
                      </div>
                      <div style={styles.itemRight}>
                        <p style={{ ...styles.itemValue, color: amountColor }}>
                          {formatTransactionAmount(tx)}
                        </p>
                        <div style={styles.itemActions}>
                          <button
                            onClick={() => beginTransactionEdit(tx)}
                            disabled={isWorking}
                            style={styles.actionButton}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => void handleDeleteTransaction(tx)}
                            disabled={isWorking}
                            style={{ ...styles.actionButton, ...styles.deleteButton }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    marginBottom: '16px',
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--text)',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '12px',
  },
  errorBanner: {
    margin: '0 0 12px',
    color: 'var(--danger)',
    fontSize: '13px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px',
    marginBottom: '12px',
  },
  formsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '12px',
    marginBottom: '12px',
  },
  card: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '16px',
    marginBottom: '12px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  kicker: {
    margin: 0,
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    color: 'var(--text-tertiary)',
  },
  total: {
    margin: '8px 0 4px',
    fontSize: '32px',
    fontWeight: 700,
    color: 'var(--accent-budget)',
  },
  meta: {
    margin: 0,
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  formRow: {
    display: 'flex',
    gap: '8px',
    marginTop: '10px',
  },
  input: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface-elevated)',
    color: 'var(--text)',
    fontSize: '14px',
    outline: 'none',
  },
  select: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface-elevated)',
    color: 'var(--text)',
    fontSize: '14px',
    outline: 'none',
  },
  button: {
    border: '1px solid var(--accent-budget)',
    backgroundColor: 'var(--accent-budget)',
    color: '#0E0C09',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    fontWeight: 700,
    padding: '10px 14px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  buttonDisabled: {
    opacity: 0.55,
    cursor: 'not-allowed',
  },
  ghostButton: {
    border: '1px solid var(--border)',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '12px',
    fontWeight: 600,
    padding: '6px 10px',
    cursor: 'pointer',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    padding: '10px 12px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--surface-elevated)',
  },
  archivedItem: {
    opacity: 0.72,
  },
  itemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
    minWidth: 0,
  },
  itemRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '6px',
  },
  itemIcon: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    backgroundColor: 'rgba(34, 197, 94, 0.14)',
    flexShrink: 0,
  },
  itemTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text)',
  },
  itemMeta: {
    margin: '2px 0 0',
    fontSize: '12px',
    color: 'var(--text-tertiary)',
  },
  progressTrack: {
    width: '180px',
    maxWidth: '100%',
    height: '8px',
    borderRadius: '999px',
    backgroundColor: 'var(--border)',
    marginTop: '6px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '999px',
    backgroundColor: 'var(--accent-budget)',
  },
  itemValue: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--accent-budget)',
  },
  itemActions: {
    display: 'flex',
    gap: '6px',
  },
  actionButton: {
    border: '1px solid var(--border)',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '12px',
    fontWeight: 600,
    padding: '4px 8px',
    cursor: 'pointer',
  },
  deleteButton: {
    color: 'var(--danger)',
  },
  editPanel: {
    width: '100%',
  },
};
