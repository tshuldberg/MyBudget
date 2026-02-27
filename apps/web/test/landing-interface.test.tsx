import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../app/actions', () => ({
  fetchEnvelopes: vi.fn().mockResolvedValue([]),
  fetchAccounts: vi.fn().mockResolvedValue([]),
  fetchTransactions: vi.fn().mockResolvedValue([]),
  fetchGoals: vi.fn().mockResolvedValue([]),
  doCreateEnvelope: vi.fn(),
  doUpdateEnvelope: vi.fn(),
  doArchiveEnvelope: vi.fn(),
  doRestoreEnvelope: vi.fn(),
  doDeleteEnvelope: vi.fn(),
  doCreateAccount: vi.fn(),
  doUpdateAccount: vi.fn(),
  doArchiveAccount: vi.fn(),
  doRestoreAccount: vi.fn(),
  doDeleteAccount: vi.fn(),
  doCreateTransaction: vi.fn(),
  doUpdateTransaction: vi.fn(),
  doDeleteTransaction: vi.fn(),
  doCreateGoal: vi.fn(),
  doUpdateGoal: vi.fn(),
  doDeleteGoal: vi.fn(),
}));

import Home from '../app/page';
import {
  fetchAccounts,
  fetchEnvelopes,
  fetchGoals,
  fetchTransactions,
} from '../app/actions';

describe('MyBudget web rich interface', () => {
  it('renders the budget workspace and loads dashboard data', async () => {
    render(<Home />);

    await waitFor(() => {
      expect(fetchEnvelopes).toHaveBeenCalled();
      expect(fetchAccounts).toHaveBeenCalled();
      expect(fetchTransactions).toHaveBeenCalled();
      expect(fetchGoals).toHaveBeenCalled();
    });

    expect(screen.getByRole('heading', { name: 'Budget' })).toBeInTheDocument();
    expect(
      screen.getByText('Manage envelopes, accounts, transactions, and savings goals.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });
});
