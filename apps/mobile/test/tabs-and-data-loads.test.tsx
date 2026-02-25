import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const router = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
}));

const hookState = vi.hoisted(() => ({
  budget: {
    readyToAssign: 125000,
    groups: [
      {
        groupId: 'grp-1',
        name: 'Essentials',
        available: 80000,
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
        account_id: 'acc-1',
        date: '2026-02-22',
        payee: 'Whole Foods',
        memo: null,
        amount: -8523,
        is_cleared: true,
        is_transfer: false,
        transfer_id: null,
      },
      splits: [{ category_id: 'cat-groceries' }],
    },
    {
      transaction: {
        id: 'tx-2',
        account_id: 'acc-1',
        date: '2026-02-22',
        payee: 'Acme Corp',
        memo: 'Paycheck',
        amount: 325000,
        is_cleared: true,
        is_transfer: false,
        transfer_id: null,
      },
      splits: [],
    },
  ],
  categoryMap: new Map([
    [
      'cat-groceries',
      {
        id: 'cat-groceries',
        name: 'Groceries',
      },
    ],
  ]),
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
    { id: 'acc-1', name: 'Checking', type: 'checking', balance: 352480 },
    { id: 'acc-2', name: 'Credit Card', type: 'credit_card', balance: -48523 },
  ],
  totalBalance: 303957,
}));

vi.mock('expo-router', () => ({
  useRouter: () => router,
}));

vi.mock('../hooks', () => ({
  useBudget: () => hookState.budget,
  useTransactions: () => ({ transactions: hookState.transactions }),
  useCategories: () => ({ categoryMap: hookState.categoryMap }),
  useSubscriptions: () => ({
    subscriptions: hookState.subscriptions,
    summary: hookState.subscriptionSummary,
  }),
  useReports: () => hookState.reports,
  useAccounts: () => ({
    accounts: hookState.accounts,
    totalBalance: hookState.totalBalance,
  }),
}));

import BudgetScreen from '../app/(tabs)/budget';
import TransactionsScreen from '../app/(tabs)/transactions';
import SubscriptionsScreen from '../app/(tabs)/subscriptions';
import ReportsScreen from '../app/(tabs)/reports';
import AccountsScreen from '../app/(tabs)/accounts';

describe('MyBudget tabs: interface actions and data loads', () => {
  beforeEach(() => {
    router.push.mockReset();
    router.back.mockReset();
    router.replace.mockReset();
  });

  it('loads budget data and changes month when month controls are pressed', () => {
    render(<BudgetScreen />);

    expect(screen.getByText('Essentials')).toBeInTheDocument();
    expect(screen.getByText('Rent')).toBeInTheDocument();
    expect(screen.getByText('$1,250.00')).toBeInTheDocument();

    const before = screen.getByText(/^[A-Za-z]+\s\d{4}$/).textContent;
    fireEvent.click(screen.getByRole('button', { name: '›' }));

    const after = screen.getByText(/^[A-Za-z]+\s\d{4}$/).textContent;
    expect(after).not.toBe(before);
  });

  it('loads transactions and routes to add transaction when FAB is pressed', () => {
    render(<TransactionsScreen />);

    expect(screen.getByText('Whole Foods')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Income')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '+' }));
    expect(router.push).toHaveBeenCalledWith('/add-transaction');
  });

  it('loads subscription summary/list data and routes to add subscription', () => {
    render(<SubscriptionsScreen />);

    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('1 active of 1 total')).toBeInTheDocument();
    expect(screen.getAllByText('$15.99').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '+' }));
    expect(router.push).toHaveBeenCalledWith('/add-subscription');
  });

  it('loads reports data and allows period toggles to be pressed', () => {
    render(<ReportsScreen />);

    expect(screen.getByText('$3,250.00')).toBeInTheDocument();
    expect(screen.getByText('$2,500.00')).toBeInTheDocument();
    expect(screen.getByText('Rent')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Quarter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Year' }));
    expect(screen.getByText('SUBSCRIPTION COSTS')).toBeInTheDocument();
  });

  it('loads account data and renders account interface controls', () => {
    render(<AccountsScreen />);

    expect(screen.getByText('Checking')).toBeInTheDocument();
    expect(screen.getByText('Credit Card')).toBeInTheDocument();
    expect(screen.getByText('Net Worth')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add Account' })).toBeInTheDocument();
  });
});
