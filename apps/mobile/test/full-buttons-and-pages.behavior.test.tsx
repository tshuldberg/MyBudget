import React from 'react';
import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const router = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
}));

const createTransactionMock = vi.hoisted(() => vi.fn());
const createAccountMock = vi.hoisted(() => vi.fn());
const createGroupMock = vi.hoisted(() => vi.fn(() => ({ id: 'group-new' })));
const createCategoryMock = vi.hoisted(() => vi.fn());
const initializeDatabaseMock = vi.hoisted(() => vi.fn());
const seedDatabaseMock = vi.hoisted(() => vi.fn());

const databaseState = vi.hoisted(() => ({
  db: {
    execute: vi.fn(),
  },
  invalidate: vi.fn(),
}));

const hookState = vi.hoisted(() => ({
  budget: {
    readyToAssign: 125000,
    groups: [
      {
        groupId: 'group-1',
        name: 'Essentials',
        available: 82000,
        categories: [
          {
            categoryId: 'cat-rent',
            name: 'Rent',
            emoji: '🏠',
            targetAmount: 200000,
            targetType: 'monthly',
            allocated: 200000,
            activity: -200000,
            available: 0,
            targetProgress: 100,
          },
        ],
      },
    ],
    totalAllocated: 200000,
    totalActivity: -200000,
    totalOverspent: 0,
  },
  transactions: [
    {
      transaction: {
        id: 'tx-1',
        account_id: 'acc-checking',
        date: '2026-02-22',
        payee: 'Whole Foods',
        memo: null,
        amount: -8523,
        is_cleared: true,
        is_transfer: false,
        transfer_id: null,
      },
      splits: [{ category_id: 'cat-food' }],
    },
  ],
  categoryMap: new Map([
    ['cat-food', { id: 'cat-food', name: 'Groceries' }],
  ]),
  categories: [
    { id: 'cat-food', name: 'Groceries', emoji: '🛒' },
    { id: 'cat-rent', name: 'Rent', emoji: '🏠' },
  ],
  subscriptions: [
    {
      id: 'sub-1',
      name: 'Netflix',
      price: 1599,
      billing_cycle: 'monthly',
      status: 'active',
      next_renewal: '2026-03-15',
      start_date: '2024-01-15',
      icon: '🎬',
      custom_days: null,
    },
  ],
  subscriptionSummary: {
    monthlyTotal: 1599,
    annualTotal: 19188,
    activeCount: 1,
    totalCount: 1,
  },
  reports: {
    totalIncome: 325000,
    totalSpending: 250000,
    netSavings: 75000,
    spendingByCategory: [
      { name: 'Rent', emoji: '🏠', amount: 200000, percent: 80 },
      { name: 'Groceries', emoji: '🛒', amount: 50000, percent: 20 },
    ],
    subscriptionMonthly: 1599,
    subscriptionAnnual: 19188,
  },
  accounts: [
    { id: 'acc-checking', name: 'Checking', type: 'checking', balance: 352480 },
    { id: 'acc-savings', name: 'Savings', type: 'savings', balance: 1250000 },
    { id: 'acc-card', name: 'Credit Card', type: 'credit_card', balance: -48523 },
  ],
  totalBalance: 1553957,
}));

vi.mock('expo-router', () => ({
  useRouter: () => router,
}));

vi.mock('../hooks', () => ({
  useBudget: () => hookState.budget,
  useTransactions: () => ({
    transactions: hookState.transactions,
    createTransaction: createTransactionMock,
  }),
  useCategories: () => ({
    categories: hookState.categories,
    categoryMap: hookState.categoryMap,
    createGroup: createGroupMock,
    createCategory: createCategoryMock,
  }),
  useSubscriptions: (filters?: { status?: string }) => {
    const subscriptions = filters?.status
      ? hookState.subscriptions.filter((sub) => sub.status === filters.status)
      : hookState.subscriptions;

    return {
      subscriptions,
      summary: {
        ...hookState.subscriptionSummary,
        activeCount: subscriptions.filter((sub) => sub.status === 'active').length,
        totalCount: subscriptions.length,
      },
      createSubscription: vi.fn(),
      pause: vi.fn(),
      cancel: vi.fn(),
      resume: vi.fn(),
    };
  },
  useReports: () => hookState.reports,
  useAccounts: () => ({
    accounts: hookState.accounts,
    totalBalance: hookState.totalBalance,
    createAccount: createAccountMock,
  }),
}));

vi.mock('../lib/DatabaseProvider', () => ({
  useDatabase: () => databaseState,
}));

vi.mock('../lib/seed', () => ({
  seedDatabase: seedDatabaseMock,
}));

vi.mock('@mybudget/shared', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@mybudget/shared');
  return {
    ...actual,
    initializeDatabase: initializeDatabaseMock,
  };
});

import BudgetScreen from '../app/(tabs)/budget';
import TransactionsScreen from '../app/(tabs)/transactions';
import SubscriptionsScreen from '../app/(tabs)/subscriptions';
import AccountsScreen from '../app/(tabs)/accounts';
import SettingsScreen from '../app/settings';
import ImportCSVScreen from '../app/import-csv';
import OnboardingScreen from '../app/onboarding';

describe('MyBudget full button/page behavior coverage', () => {
  beforeEach(() => {
    router.push.mockReset();
    router.back.mockReset();
    router.replace.mockReset();
    createTransactionMock.mockReset();
    createAccountMock.mockReset();
    createGroupMock.mockReset();
    createCategoryMock.mockReset();
    initializeDatabaseMock.mockReset();
    seedDatabaseMock.mockReset();
    databaseState.db.execute.mockReset();
    databaseState.invalidate.mockReset();

    hookState.budget.groups = [
      {
        groupId: 'group-1',
        name: 'Essentials',
        available: 82000,
        categories: [
          {
            categoryId: 'cat-rent',
            name: 'Rent',
            emoji: '🏠',
            targetAmount: 200000,
            targetType: 'monthly',
            allocated: 200000,
            activity: -200000,
            available: 0,
            targetProgress: 100,
          },
        ],
      },
    ];
    hookState.transactions = [
      {
        transaction: {
          id: 'tx-1',
          account_id: 'acc-checking',
          date: '2026-02-22',
          payee: 'Whole Foods',
          memo: null,
          amount: -8523,
          is_cleared: true,
          is_transfer: false,
          transfer_id: null,
        },
        splits: [{ category_id: 'cat-food' }],
      },
    ];
    hookState.subscriptions = [
      {
        id: 'sub-1',
        name: 'Netflix',
        price: 1599,
        billing_cycle: 'monthly',
        status: 'active',
        next_renewal: '2026-03-15',
        start_date: '2024-01-15',
        icon: '🎬',
        custom_days: null,
      },
    ];

    (Alert.alert as unknown as ReturnType<typeof vi.fn>).mockClear();
  });

  it('opens budget category tap and long-press actions', () => {
    render(<BudgetScreen />);

    const rentRow = screen.getByText('Rent').closest('button');
    expect(rentRow).toBeTruthy();

    fireEvent.click(rentRow!);
    fireEvent.contextMenu(rentRow!);

    const alertCalls = (Alert.alert as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(alertCalls[0][0]).toBe('Category Details');
    expect(alertCalls[1][0]).toBe('Quick Action');
  });

  it('shows budget empty state when no categories are configured', () => {
    hookState.budget.groups = [];

    render(<BudgetScreen />);

    expect(screen.getByText('No categories yet')).toBeInTheDocument();
    expect(screen.getByText('Add category groups in Settings to start budgeting')).toBeInTheDocument();
  });

  it('opens transaction details and routes to add transaction', () => {
    render(<TransactionsScreen />);

    fireEvent.click(screen.getByText('Whole Foods').closest('button')!);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Transaction Details',
      expect.stringContaining('tx-1'),
    );

    fireEvent.click(screen.getByRole('button', { name: '+' }));
    expect(router.push).toHaveBeenCalledWith('/add-transaction');
  });

  it('shows transactions empty state copy when list has no rows', () => {
    hookState.transactions = [];

    render(<TransactionsScreen />);

    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
    expect(screen.getByText('Tap + to add your first transaction')).toBeInTheDocument();
  });

  it('routes subscription row to detail and supports add button', () => {
    render(<SubscriptionsScreen />);

    fireEvent.click(screen.getByText('Netflix').closest('button')!);
    expect(router.push).toHaveBeenCalledWith('/subscription-detail?id=sub-1');

    fireEvent.click(screen.getByRole('button', { name: '+' }));
    expect(router.push).toHaveBeenCalledWith('/add-subscription');
  });

  it('shows subscriptions empty state when none are available', () => {
    hookState.subscriptions = [];

    render(<SubscriptionsScreen />);

    expect(screen.getByText('No subscriptions yet')).toBeInTheDocument();
    expect(screen.getByText('Tap + to track your first subscription')).toBeInTheDocument();
  });

  it('opens account details and add-account actions', () => {
    render(<AccountsScreen />);

    fireEvent.click(screen.getByText('Checking').closest('button')!);
    fireEvent.click(screen.getByRole('button', { name: '+ Add Account' }));

    const alertCalls = (Alert.alert as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(alertCalls[0][0]).toBe('Checking');
    expect(alertCalls[1][0]).toBe('Add Account');
  });

  it('executes settings buttons for preference/data/about/danger-zone actions', () => {
    render(<SettingsScreen />);

    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);
    expect((toggle as HTMLInputElement).checked).toBe(true);

    fireEvent.click(screen.getByText('Currency Format').closest('button')!);
    fireEvent.click(screen.getByText('First Day of Week').closest('button')!);
    fireEvent.click(screen.getByText('CSV Import Profiles').closest('button')!);
    fireEvent.click(screen.getByText('Export Data').closest('button')!);
    fireEvent.click(screen.getByText('Licenses').closest('button')!);
    fireEvent.click(screen.getByText('Privacy Statement').closest('button')!);

    expect(router.push).toHaveBeenCalledWith('/import-csv');

    fireEvent.click(screen.getByText('Reset All Data').closest('button')!);
    const resetCall = (Alert.alert as unknown as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) => call[0] === 'Reset All Data',
    );
    expect(resetCall).toBeTruthy();

    const actions = resetCall?.[2] as Array<{ onPress?: () => void }>;
    actions[1]?.onPress?.();

    expect(databaseState.db.execute).toHaveBeenCalled();
    expect(initializeDatabaseMock).toHaveBeenCalledWith(databaseState.db);
    expect(seedDatabaseMock).toHaveBeenCalledWith(databaseState.db);
    expect(databaseState.invalidate).toHaveBeenCalledTimes(1);
  });

  it('supports import review back-navigation from confirm to preview', () => {
    render(<ImportCSVScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose File' }));
    fireEvent.click(screen.getByRole('button', { name: 'Import 6 Transactions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to Preview' }));

    expect(screen.getByText('6 transactions found')).toBeInTheDocument();
  });

  it('enforces onboarding category selection before allowing final step', () => {
    render(<OnboardingScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Get Started' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    fireEvent.click(screen.getByText('Rent / Mortgage').closest('button')!);
    fireEvent.click(screen.getByText('Groceries').closest('button')!);
    fireEvent.click(screen.getByText('Utilities').closest('button')!);
    fireEvent.click(screen.getByText('Dining Out').closest('button')!);
    fireEvent.click(screen.getByText('Emergency Fund').closest('button')!);

    const nextButton = screen.getByRole('button', { name: 'Next' });
    expect(nextButton).toBeDisabled();

    fireEvent.click(screen.getByText('Vacation').closest('button')!);
    expect(nextButton).not.toBeDisabled();
  });
});
