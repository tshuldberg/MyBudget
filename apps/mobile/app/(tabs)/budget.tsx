import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, colors, spacing } from '@mybudget/ui';
import { currentMonth, formatCents, parseMonth } from '@mybudget/shared';
import { BudgetHeader } from '../../components/BudgetHeader';
import { CategoryGroupSection } from '../../components/CategoryGroupSection';
import { useBudget } from '../../hooks';

function stepMonth(month: string, delta: number): string {
  const { year, month: m } = parseMonth(month);
  const date = new Date(year, m - 1 + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function BudgetScreen() {
  const [month, setMonth] = useState(currentMonth);
  const budgetState = useBudget(month);

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
