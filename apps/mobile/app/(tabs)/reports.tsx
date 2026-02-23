import React, { useState } from 'react';
import { ScrollView, View, Pressable, StyleSheet } from 'react-native';
import { Text, Card, ProgressBar, colors, spacing, typography } from '@mybudget/ui';
import { formatCents, currentMonth } from '@mybudget/shared';
import { useReports } from '../../hooks';

type TimePeriod = 'month' | 'quarter' | 'year';

function PeriodToggle({
  period,
  onChange,
}: {
  period: TimePeriod;
  onChange: (p: TimePeriod) => void;
}) {
  const options: { value: TimePeriod; label: string }[] = [
    { value: 'month', label: 'Month' },
    { value: 'quarter', label: 'Quarter' },
    { value: 'year', label: 'Year' },
  ];

  return (
    <View style={styles.toggle}>
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => onChange(opt.value)}
          style={[styles.toggleBtn, period === opt.value && styles.toggleBtnActive]}
        >
          <Text
            variant="caption"
            style={[
              styles.toggleText,
              period === opt.value && styles.toggleTextActive,
            ]}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function ReportsScreen() {
  const [period, setPeriod] = useState<TimePeriod>('month');
  const month = currentMonth();
  const reportData = useReports(month);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <PeriodToggle period={period} onChange={setPeriod} />

      {/* Income vs Spending overview */}
      <Card style={styles.overviewCard}>
        <View style={styles.overviewRow}>
          <View style={styles.overviewItem}>
            <Text variant="caption">Income</Text>
            <Text variant="currency" style={styles.incomeAmount}>
              {formatCents(reportData.totalIncome)}
            </Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewItem}>
            <Text variant="caption">Spending</Text>
            <Text variant="currency" style={styles.spendingAmount}>
              {formatCents(reportData.totalSpending)}
            </Text>
          </View>
        </View>
        <View style={styles.savingsRow}>
          <Text variant="body">Net Savings</Text>
          <Text
            variant="currency"
            style={[
              styles.savingsAmount,
              reportData.netSavings >= 0 ? styles.positive : styles.negative,
            ]}
          >
            {reportData.netSavings >= 0 ? '+' : ''}{formatCents(reportData.netSavings)}
          </Text>
        </View>
      </Card>

      {/* Spending by category */}
      <Text variant="caption" style={styles.sectionHeader}>SPENDING BY CATEGORY</Text>
      <Card style={styles.categoryCard}>
        {reportData.spendingByCategory.map((cat, index) => (
          <View key={cat.name}>
            {index > 0 && <View style={styles.divider} />}
            <View style={styles.categoryRow}>
              <View style={styles.categoryLeft}>
                <Text variant="body" style={styles.emoji}>{cat.emoji}</Text>
                <Text variant="body" numberOfLines={1} style={styles.categoryName}>
                  {cat.name}
                </Text>
              </View>
              <View style={styles.categoryRight}>
                <Text variant="currency" style={styles.categoryAmount}>
                  {formatCents(cat.amount)}
                </Text>
                <Text variant="caption">{cat.percent}%</Text>
              </View>
            </View>
            <ProgressBar
              progress={cat.percent}
              height={3}
              style={styles.categoryBar}
            />
          </View>
        ))}
      </Card>

      {/* Subscription cost summary */}
      <Text variant="caption" style={styles.sectionHeader}>SUBSCRIPTION COSTS</Text>
      <Card>
        <View style={styles.subRow}>
          <Text variant="body">Monthly</Text>
          <Text variant="currency">{formatCents(reportData.subscriptionMonthly)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.subRow}>
          <Text variant="body">Annual Projection</Text>
          <Text variant="currency">{formatCents(reportData.subscriptionAnnual)}</Text>
        </View>
      </Card>
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
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 2,
    marginBottom: spacing.md,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: colors.teal,
  },
  toggleText: {
    color: colors.textMuted,
  },
  toggleTextActive: {
    color: colors.background,
    fontWeight: typography.fontWeight.semibold,
  },
  overviewCard: {
    marginBottom: spacing.md,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  overviewItem: {
    alignItems: 'center',
  },
  overviewDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  incomeAmount: {
    color: colors.income,
    fontSize: typography.fontSize.lg,
  },
  spendingAmount: {
    color: colors.textPrimary,
    fontSize: typography.fontSize.lg,
  },
  savingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  savingsAmount: {
    fontSize: typography.fontSize.lg,
  },
  positive: {
    color: colors.income,
  },
  negative: {
    color: colors.coral,
  },
  sectionHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    letterSpacing: 1,
  },
  categoryCard: {
    padding: 0,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.md,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    marginRight: spacing.sm,
  },
  categoryName: {
    flex: 1,
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: typography.fontSize.sm,
  },
  categoryBar: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm + spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md,
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
});
