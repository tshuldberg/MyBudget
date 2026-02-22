// Utilities — currency formatting, date helpers

/**
 * Format cents as currency string.
 * Uses integer cents to avoid floating-point issues.
 */
export function formatCents(cents: number, currency = 'USD'): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(dollars);
}

/**
 * Get the current month in YYYY-MM format.
 */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Parse a YYYY-MM month string into year and month components.
 */
export function parseMonth(month: string): { year: number; month: number } {
  const [y, m] = month.split('-').map(Number);
  return { year: y, month: m };
}
