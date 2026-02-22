import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, colors, spacing, typography } from '@mybudget/ui';
import type { Transaction } from '@mybudget/shared';
import { formatCents } from '@mybudget/shared';

export interface TransactionRowProps {
  transaction: Transaction;
  categoryName?: string;
  onPress?: (id: string) => void;
}

export function TransactionRow({ transaction, categoryName, onPress }: TransactionRowProps) {
  const isInflow = transaction.amount > 0;
  const isTransfer = transaction.is_transfer;

  return (
    <Pressable
      onPress={() => onPress?.(transaction.id)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.left}>
        <Text variant="body" numberOfLines={1} style={styles.payee}>
          {transaction.payee}
        </Text>
        <View style={styles.meta}>
          {categoryName ? (
            <Text variant="caption" numberOfLines={1}>{categoryName}</Text>
          ) : null}
          {isTransfer ? (
            <Text variant="caption" style={styles.transfer}>Transfer</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        <Text
          variant="currency"
          style={[
            styles.amount,
            isInflow ? styles.inflow : styles.outflow,
          ]}
        >
          {isInflow ? '+' : ''}{formatCents(transaction.amount)}
        </Text>
        <Text variant="caption" style={styles.date}>
          {formatDate(transaction.date)}
        </Text>
      </View>

      {!transaction.is_cleared && <View style={styles.unclearedDot} />}
    </Pressable>
  );
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 56,
  },
  pressed: {
    backgroundColor: 'rgba(78, 205, 196, 0.06)',
  },
  left: {
    flex: 1,
    marginRight: spacing.md,
  },
  payee: {
    fontWeight: typography.fontWeight.medium,
  },
  meta: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 2,
  },
  transfer: {
    color: colors.teal,
    fontStyle: 'italic',
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: typography.fontSize.md,
  },
  inflow: {
    color: colors.income,
  },
  outflow: {
    color: colors.textPrimary,
  },
  date: {
    marginTop: 2,
  },
  unclearedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.amber,
    marginLeft: spacing.sm,
  },
});
