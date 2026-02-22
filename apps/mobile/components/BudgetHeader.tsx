import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, Card, colors, spacing } from '@mybudget/ui';
import { formatCents } from '@mybudget/shared';

export interface BudgetHeaderProps {
  month: string; // YYYY-MM
  readyToAssign: number; // cents
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(year, m - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function BudgetHeader({
  month,
  readyToAssign,
  onPrevMonth,
  onNextMonth,
}: BudgetHeaderProps) {
  const isNegative = readyToAssign < 0;
  const isZero = readyToAssign === 0;

  return (
    <Card
      style={[
        styles.card,
        isNegative && styles.cardNegative,
      ]}
    >
      <View style={styles.monthNav}>
        <Pressable onPress={onPrevMonth} hitSlop={12}>
          <Text variant="body" style={styles.arrow}>‹</Text>
        </Pressable>
        <Text variant="body" style={styles.monthLabel}>
          {formatMonthLabel(month)}
        </Text>
        <Pressable onPress={onNextMonth} hitSlop={12}>
          <Text variant="body" style={styles.arrow}>›</Text>
        </Pressable>
      </View>

      <Text
        variant="currency"
        style={[
          styles.amount,
          isNegative && styles.amountNegative,
          isZero && styles.amountZero,
          !isNegative && !isZero && styles.amountPositive,
        ]}
      >
        {formatCents(readyToAssign)}
      </Text>
      <Text variant="caption" style={styles.label}>
        Ready to Assign
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardNegative: {
    borderColor: colors.coral,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  arrow: {
    fontSize: 24,
    color: colors.teal,
  },
  monthLabel: {
    color: colors.textSecondary,
  },
  amount: {
    fontSize: 32,
    lineHeight: 38,
    marginBottom: spacing.xs,
  },
  amountPositive: {
    color: colors.income,
  },
  amountNegative: {
    color: colors.coral,
  },
  amountZero: {
    color: colors.textMuted,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
