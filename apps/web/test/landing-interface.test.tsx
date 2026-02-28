import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock the new modular actions
vi.mock('../app/actions/accounts', () => ({
  getNetWorth: vi.fn().mockResolvedValue({ assets: 0, liabilities: 0, netWorth: 0 }),
  fetchAccounts: vi.fn().mockResolvedValue([]),
}));

vi.mock('../app/actions/budget', () => ({
  fetchBudgetForMonth: vi.fn().mockResolvedValue({
    month: '2026-02',
    totalIncome: 0,
    totalAllocated: 0,
    totalActivity: 0,
    totalOverspent: 0,
    readyToAssign: 0,
    groups: [],
  }),
}));

vi.mock('../app/actions/transactions', () => ({
  fetchRecentTransactions: vi.fn().mockResolvedValue([]),
}));

vi.mock('../app/actions/subscriptions', () => ({
  fetchUpcomingRenewals: vi.fn().mockResolvedValue([]),
  fetchSubscriptionSummary: vi.fn().mockResolvedValue({ monthlyTotal: 0, annualTotal: 0, activeCount: 0 }),
}));

vi.mock('../app/actions/reports', () => ({
  fetchMonthlySpending: vi.fn().mockResolvedValue([]),
}));

vi.mock('../app/actions/categories', () => ({
  seedDefaultCategories: vi.fn().mockResolvedValue(undefined),
}));

// Mock recharts to avoid SSR issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AreaChart: () => <div data-testid="area-chart" />,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

import Home from '../app/page';

describe('MyBudget web dashboard', () => {
  it('renders the dashboard and loads data', async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});
