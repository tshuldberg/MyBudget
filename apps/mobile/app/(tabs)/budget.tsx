import React, { useState, useMemo } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, colors, spacing } from '@mybudget/ui';
import type { MonthBudgetState, MonthBudgetInput } from '@mybudget/shared';
import { calculateMonthBudget, currentMonth, formatCents, parseMonth } from '@mybudget/shared';
import { BudgetHeader } from '../../components/BudgetHeader';
import { CategoryGroupSection } from '../../components/CategoryGroupSection';

/**
 * Placeholder data for development.
 * Will be replaced with real SQLite queries once the data layer is wired.
 */
function useMockBudgetData(month: string): MonthBudgetState {
  return useMemo(() => {
    const input: MonthBudgetInput = {
      month,
      groups: [
        {
          groupId: 'g1',
          name: 'Essentials',
          categories: [
            { categoryId: 'c1', name: 'Rent', emoji: '🏠', targetAmount: 200000, targetType: 'monthly' },
            { categoryId: 'c2', name: 'Groceries', emoji: '🛒', targetAmount: 60000, targetType: 'monthly' },
            { categoryId: 'c3', name: 'Utilities', emoji: '⚡', targetAmount: 15000, targetType: 'monthly' },
          ],
        },
        {
          groupId: 'g2',
          name: 'Lifestyle',
          categories: [
            { categoryId: 'c4', name: 'Dining Out', emoji: '🍕', targetAmount: 30000, targetType: 'monthly' },
            { categoryId: 'c5', name: 'Entertainment', emoji: '🎮', targetAmount: 20000, targetType: 'monthly' },
            { categoryId: 'c6', name: 'Shopping', emoji: '🛍️', targetAmount: null, targetType: null },
          ],
        },
        {
          groupId: 'g3',
          name: 'Savings Goals',
          categories: [
            { categoryId: 'c7', name: 'Emergency Fund', emoji: '🛟', targetAmount: 1000000, targetType: 'savings_goal' },
            { categoryId: 'c8', name: 'Vacation', emoji: '✈️', targetAmount: 300000, targetType: 'savings_goal' },
          ],
        },
      ],
      allocations: new Map([
        ['c1', 200000],
        ['c2', 55000],
        ['c3', 15000],
        ['c4', 25000],
        ['c5', 20000],
        ['c6', 10000],
        ['c7', 50000],
        ['c8', 25000],
      ]),
      activity: new Map([
        ['c1', -200000],
        ['c2', -42500],
        ['c3', -11200],
        ['c4', -28500],
        ['c5', -15000],
        ['c6', -7500],
      ]),
      carryForwards: new Map([
        ['c7', 450000],
        ['c8', 125000],
      ]),
      totalIncome: 450000,
      overspentLastMonth: 0,
    };

    return calculateMonthBudget(input);
  }, [month]);
}

function stepMonth(month: string, delta: number): string {
  const { year, month: m } = parseMonth(month);
  const date = new Date(year, m - 1 + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function BudgetScreen() {
  const [month, setMonth] = useState(currentMonth);
  const budgetState = useMockBudgetData(month);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <BudgetHeader
        month={month}
        readyToAssign={budgetState.readyToAssign}
        onPrevMonth={() => setMonth(stepMonth(month, -1))}
        onNextMonth={() => setMonth(stepMonth(month, +1))}
      />

      {budgetState.groups.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="body" style={styles.emptyText}>
            No categories yet
          </Text>
          <Text variant="caption">
            Add category groups in Settings to start budgeting
          </Text>
        </View>
      ) : (
        budgetState.groups.map((group) => (
          <CategoryGroupSection
            key={group.groupId}
            group={group}
            onCategoryPress={() => {}}
            onCategoryLongPress={() => {}}
          />
        ))
      )}

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text variant="caption">Total Budgeted</Text>
          <Text variant="caption" style={styles.summaryValue}>
            {formatCents(budgetState.totalAllocated)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text variant="caption">Total Activity</Text>
          <Text variant="caption" style={styles.summaryValue}>
            {formatCents(budgetState.totalActivity)}
          </Text>
        </View>
        {budgetState.totalOverspent > 0 && (
          <View style={styles.summaryRow}>
            <Text variant="caption">Overspent</Text>
            <Text variant="caption" style={styles.overspentValue}>
              {formatCents(budgetState.totalOverspent)}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  summary: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryValue: {
    fontFamily: 'SF Mono',
  },
  overspentValue: {
    fontFamily: 'SF Mono',
    color: colors.coral,
  },
});
