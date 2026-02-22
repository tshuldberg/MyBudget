import { describe, it, expect } from 'vitest';
import { calculateNextDate, generateOccurrences } from '../schedule';

describe('calculateNextDate', () => {
  describe('weekly', () => {
    it('generates every 7 days', () => {
      expect(calculateNextDate('2026-01-01', 'weekly')).toBe('2026-01-08');
      expect(calculateNextDate('2026-01-08', 'weekly')).toBe('2026-01-15');
    });

    it('crosses month boundary', () => {
      expect(calculateNextDate('2026-01-29', 'weekly')).toBe('2026-02-05');
    });

    it('crosses year boundary', () => {
      expect(calculateNextDate('2025-12-29', 'weekly')).toBe('2026-01-05');
    });
  });

  describe('biweekly', () => {
    it('generates every 14 days', () => {
      expect(calculateNextDate('2026-01-01', 'biweekly')).toBe('2026-01-15');
      expect(calculateNextDate('2026-01-15', 'biweekly')).toBe('2026-01-29');
    });

    it('crosses month boundary', () => {
      expect(calculateNextDate('2026-01-20', 'biweekly')).toBe('2026-02-03');
    });
  });

  describe('monthly', () => {
    it('generates on same day each month', () => {
      expect(calculateNextDate('2026-01-15', 'monthly')).toBe('2026-02-15');
      expect(calculateNextDate('2026-02-15', 'monthly')).toBe('2026-03-15');
    });

    it('handles month-end clamping: 31st to Feb 28', () => {
      expect(calculateNextDate('2026-01-31', 'monthly', 31)).toBe('2026-02-28');
    });

    it('restores original day after short month', () => {
      // From Feb 28 (originally the 31st) -> Mar 31
      expect(calculateNextDate('2026-02-28', 'monthly', 31)).toBe('2026-03-31');
    });

    it('handles leap year February', () => {
      expect(calculateNextDate('2028-01-31', 'monthly', 31)).toBe('2028-02-29');
    });

    it('crosses year boundary', () => {
      expect(calculateNextDate('2025-12-15', 'monthly')).toBe('2026-01-15');
    });
  });

  describe('quarterly', () => {
    it('generates every 3 months', () => {
      expect(calculateNextDate('2026-01-15', 'quarterly')).toBe('2026-04-15');
      expect(calculateNextDate('2026-04-15', 'quarterly')).toBe('2026-07-15');
    });

    it('handles month-end clamping', () => {
      expect(calculateNextDate('2026-01-31', 'quarterly', 31)).toBe('2026-04-30');
    });

    it('crosses year boundary', () => {
      expect(calculateNextDate('2025-11-15', 'quarterly')).toBe('2026-02-15');
    });
  });

  describe('annually', () => {
    it('generates yearly', () => {
      expect(calculateNextDate('2026-03-15', 'annually')).toBe('2027-03-15');
    });

    it('handles leap day: Feb 29 -> Feb 28 in non-leap year', () => {
      expect(calculateNextDate('2028-02-29', 'annually', 29)).toBe('2029-02-28');
    });

    it('restores leap day in next leap year', () => {
      expect(calculateNextDate('2029-02-28', 'annually', 29)).toBe('2030-02-28');
    });
  });
});

describe('generateOccurrences', () => {
  it('generates weekly occurrences in range', () => {
    const dates = generateOccurrences('2026-01-01', '2026-01-22', 'weekly');
    expect(dates).toEqual([
      '2026-01-01',
      '2026-01-08',
      '2026-01-15',
      '2026-01-22',
    ]);
  });

  it('generates monthly occurrences in range', () => {
    const dates = generateOccurrences('2026-01-15', '2026-04-15', 'monthly');
    expect(dates).toEqual([
      '2026-01-15',
      '2026-02-15',
      '2026-03-15',
      '2026-04-15',
    ]);
  });

  it('generates multiple pending if 3 occurrences are due', () => {
    const dates = generateOccurrences('2026-01-01', '2026-01-15', 'weekly');
    expect(dates).toHaveLength(3); // Jan 1, 8, 15
  });

  it('excludes dates after endDate', () => {
    const dates = generateOccurrences('2026-01-01', '2026-01-10', 'weekly');
    expect(dates).toEqual(['2026-01-01', '2026-01-08']);
  });

  it('returns only start date if endDate equals startDate', () => {
    const dates = generateOccurrences('2026-01-01', '2026-01-01', 'monthly');
    expect(dates).toEqual(['2026-01-01']);
  });

  it('returns empty if endDate is before startDate', () => {
    const dates = generateOccurrences('2026-02-01', '2026-01-01', 'monthly');
    expect(dates).toEqual([]);
  });

  it('handles month-end clamping across months', () => {
    const dates = generateOccurrences('2026-01-31', '2026-04-30', 'monthly');
    expect(dates).toEqual([
      '2026-01-31',
      '2026-02-28', // clamped
      '2026-03-31', // restored
      '2026-04-30', // clamped (April has 30 days)
    ]);
  });

  it('generates quarterly occurrences', () => {
    const dates = generateOccurrences('2026-01-01', '2026-12-31', 'quarterly');
    expect(dates).toEqual([
      '2026-01-01',
      '2026-04-01',
      '2026-07-01',
      '2026-10-01',
    ]);
  });

  it('generates annual occurrences', () => {
    const dates = generateOccurrences('2026-06-15', '2029-06-15', 'annually');
    expect(dates).toEqual([
      '2026-06-15',
      '2027-06-15',
      '2028-06-15',
      '2029-06-15',
    ]);
  });
});
