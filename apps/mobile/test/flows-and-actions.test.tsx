import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Alert } from 'react-native';

const router = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
}));

const localSearchParams = vi.hoisted(() => ({ id: 'sub-1' }));

const createTransactionMock = vi.hoisted(() => vi.fn());
const createSubscriptionMock = vi.hoisted(() => vi.fn());
const pauseSubscriptionMock = vi.hoisted(() => vi.fn());
const cancelSubscriptionMock = vi.hoisted(() => vi.fn());
const createAccountMock = vi.hoisted(() => vi.fn());
const createGroupMock = vi.hoisted(() => vi.fn(() => ({ id: 'grp-new' })));
const createCategoryMock = vi.hoisted(() => vi.fn());
const initializeDatabaseMock = vi.hoisted(() => vi.fn());
const seedDatabaseMock = vi.hoisted(() => vi.fn());

const databaseState = vi.hoisted(() => ({
  db: {
    execute: vi.fn(),
  },
  invalidate: vi.fn(),
}));

const mockSubscriptions = vi.hoisted(() => [
  {
    id: 'sub-1',
    name: 'Netflix',
    price: 1599,
    currency: 'USD',
    billing_cycle: 'monthly',
    status: 'active',
    start_date: '2024-01-15',
    next_renewal: '2026-03-15',
    cancelled_date: null,
    icon: '🎬',
    color: null,
    notify_days: 1,
    category_id: null,
    catalog_id: 'netflix',
    notes: null,
    custom_days: null,
    sort_order: 0,
    created_at: '2026-02-10',
    updated_at: '2026-02-10',
  },
]);

const mockPriceHistory = vi.hoisted(() => [
  {
    id: 'ph-1',
    subscription_id: 'sub-1',
    old_price: 1499,
    new_price: 1599,
    change_date: '2026-01-01',
    effective_date: '2026-01-01',
    price: 1499,
    reason: null,
    created_at: '2026-01-01',
  },
]);

vi.mock('expo-router', () => ({
  useRouter: () => router,
  useLocalSearchParams: () => localSearchParams,
}));

vi.mock('../hooks', () => ({
  useGoals: () => ({ goals: [], goalsWithProgress: [], createGoal: vi.fn(), updateGoal: vi.fn(), deleteGoal: vi.fn(), allocateToGoal: vi.fn() }),
  useAccounts: () => ({
    accounts: [
      { id: 'acc-checking', name: 'Checking', type: 'checking', balance: 352480 },
      { id: 'acc-savings', name: 'Savings', type: 'savings', balance: 1250000 },
    ],
    createAccount: createAccountMock,
  }),
  useCategories: () => ({
    categories: [
      { id: 'cat-groceries', name: 'Groceries', emoji: '🛒' },
      { id: 'cat-rent', name: 'Rent', emoji: '🏠' },
    ],
    createGroup: createGroupMock,
    createCategory: createCategoryMock,
  }),
  useTransactions: () => ({
    createTransaction: createTransactionMock,
  }),
  useSubscriptions: (filters?: { status?: string }) => {
    const subscriptions = filters?.status
      ? mockSubscriptions.filter((sub) => sub.status === filters.status)
      : mockSubscriptions;
    return {
      subscriptions,
      summary: {
        monthlyTotal: 1599,
        annualTotal: 19188,
        activeCount: subscriptions.length,
        totalCount: subscriptions.length,
      },
      createSubscription: createSubscriptionMock,
      pause: pauseSubscriptionMock,
      cancel: cancelSubscriptionMock,
      resume: vi.fn(),
    };
  },
  useSubscriptionDetail: () => ({
    subscription: mockSubscriptions[0],
    priceHistory: mockPriceHistory,
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

import AddTransactionScreen from '../app/add-transaction';
import AddSubscriptionScreen from '../app/add-subscription';
import ImportCSVScreen from '../app/import-csv';
import OnboardingScreen from '../app/onboarding';
import SettingsScreen from '../app/settings';
import SubscriptionDetailScreen from '../app/subscription-detail';
import RenewalCalendarScreen from '../app/renewal-calendar';

describe('MyBudget flows: button actions and expected side effects', () => {
  beforeEach(() => {
    router.push.mockReset();
    router.back.mockReset();
    router.replace.mockReset();
    createTransactionMock.mockReset();
    createSubscriptionMock.mockReset();
    pauseSubscriptionMock.mockReset();
    cancelSubscriptionMock.mockReset();
    createAccountMock.mockReset();
    createGroupMock.mockReset();
    createCategoryMock.mockReset();
    initializeDatabaseMock.mockReset();
    seedDatabaseMock.mockReset();
    databaseState.db.execute.mockReset();
    databaseState.invalidate.mockReset();
    (Alert.alert as unknown as ReturnType<typeof vi.fn>).mockClear();
  });

  it('creates an outflow transaction and returns when saving', () => {
    render(<AddTransactionScreen />);

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '12.34' } });
    fireEvent.change(screen.getByLabelText('Payee'), { target: { value: 'Trader Joes' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save Transaction' }));

    expect(createTransactionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        account_id: 'acc-checking',
        payee: 'Trader Joes',
        amount: -1234,
      }),
      null,
    );
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('creates an inflow transaction with selected account/category', () => {
    render(<AddTransactionScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Inflow' }));
    fireEvent.click(screen.getByRole('button', { name: 'Savings' }));
    fireEvent.click(screen.getByRole('button', { name: '🛒 Groceries' }));

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '25.00' } });
    fireEvent.change(screen.getByLabelText('Payee'), { target: { value: 'Refund' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Transaction' }));

    expect(createTransactionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        account_id: 'acc-savings',
        payee: 'Refund',
        amount: 2500,
      }),
      'cat-groceries',
    );
  });

  it('creates a custom subscription and returns', () => {
    render(<AddSubscriptionScreen />);

    fireEvent.click(screen.getByRole('button', { name: '+ Add custom subscription' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Design Tools' } });
    fireEvent.change(screen.getByLabelText('Price'), { target: { value: '19.99' } });
    fireEvent.click(screen.getByRole('button', { name: 'Annual' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Subscription' }));

    expect(createSubscriptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Design Tools',
        price: 1999,
        billing_cycle: 'annual',
      }),
    );
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('imports only included CSV rows in confirm step', () => {
    render(<ImportCSVScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose File' }));
    fireEvent.click(screen.getByText('Whole Foods').closest('button')!);
    fireEvent.click(screen.getByRole('button', { name: 'Import 5 Transactions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Import' }));

    expect(createTransactionMock).toHaveBeenCalledTimes(5);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('completes onboarding and persists first account/categories', () => {
    render(<OnboardingScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Get Started' }));
    fireEvent.change(screen.getByLabelText('Current Balance'), { target: { value: '100.00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start Budgeting' }));

    expect(createAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Checking',
        balance: 10000,
      }),
    );
    expect(createGroupMock).toHaveBeenCalledWith({ name: 'My Budget' });
    expect(createCategoryMock).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/budget');
  });

  it('runs reset flow from settings confirmation action', () => {
    render(<SettingsScreen />);

    fireEvent.click(screen.getByText('Reset All Data').closest('button')!);

    expect(Alert.alert).toHaveBeenCalledTimes(1);
    const alertArgs = (Alert.alert as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const destructiveAction = alertArgs[2][1];
    destructiveAction.onPress();

    expect(databaseState.db.execute).toHaveBeenCalled();
    expect(initializeDatabaseMock).toHaveBeenCalledWith(databaseState.db);
    expect(seedDatabaseMock).toHaveBeenCalledWith(databaseState.db);
    expect(databaseState.invalidate).toHaveBeenCalledTimes(1);
  });

  it('shows renewal calendar data loaded from subscriptions', () => {
    render(<RenewalCalendarScreen />);

    expect(screen.getByText('Due in next 30 days')).toBeInTheDocument();
    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('pauses and cancels subscription from detail actions', () => {
    render(<SubscriptionDetailScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Pause Subscription' }));
    let alertArgs = (Alert.alert as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    alertArgs[2][1].onPress();
    expect(pauseSubscriptionMock).toHaveBeenCalledWith('sub-1');
    expect(router.back).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel Subscription' }));
    alertArgs = (Alert.alert as unknown as ReturnType<typeof vi.fn>).mock.calls[1];
    alertArgs[2][1].onPress();
    expect(cancelSubscriptionMock).toHaveBeenCalledWith('sub-1');
  });
});
