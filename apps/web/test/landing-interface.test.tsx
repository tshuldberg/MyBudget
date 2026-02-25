import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '../app/page';

describe('MyBudget web placeholder interface', () => {
  it('loads the web landing interface content', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { name: 'MyBudget' })).toBeInTheDocument();
    expect(
      screen.getByText('Privacy-first envelope budgeting with subscription tracking'),
    ).toBeInTheDocument();
    expect(screen.getByText('Web app coming soon. Mobile app in development.')).toBeInTheDocument();
  });
});
