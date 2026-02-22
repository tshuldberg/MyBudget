import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, ProgressBar, colors, spacing, typography } from '@mybudget/ui';
import type { CategoryBudgetState } from '@mybudget/shared';
import { formatCents } from '@mybudget/shared';

export interface CategoryRowProps {
  category: CategoryBudgetState;
  onPress?: (categoryId: string) => void;
  onLongPress?: (categoryId: string) => void;
}

export function CategoryRow({ category, onPress, onLongPress }: CategoryRowProps) {
  const isOverspent = category.available < 0;
  const hasTarget = category.targetProgress !== null;
  const spent = Math.abs(category.activity);

  return (
    <Pressable
      onPress={() => onPress?.(category.categoryId)}
      onLongPress={() => onLongPress?.(category.categoryId)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.left}>
        <View style={styles.nameRow}>
          {category.emoji ? (
            <Text variant="body" style={styles.emoji}>{category.emoji}</Text>
          ) : null}
          <Text variant="body" numberOfLines={1} style={styles.name}>
            {category.name}
          </Text>
        </View>
        {hasTarget ? (
          <View style={styles.progressRow}>
            <ProgressBar
              progress={category.targetProgress!}
              height={4}
              style={styles.progressBar}
            />
            <Text variant="caption" style={styles.spentOfTarget}>
              {formatCents(spent)}/{formatCents(category.allocated)}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.right}>
        <Text
          variant="currency"
          style={[
            styles.available,
            isOverspent && styles.overspent,
          ]}
        >
          {formatCents(category.available)}
        </Text>
        {!hasTarget && (
          <Text variant="caption" style={styles.allocated}>
            {formatCents(category.allocated)} budgeted
          </Text>
        )}
      </View>
    </Pressable>
  );
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    marginRight: spacing.sm,
    fontSize: typography.fontSize.md,
  },
  name: {
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
  },
  spentOfTarget: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.mono,
  },
  right: {
    alignItems: 'flex-end',
  },
  available: {
    fontSize: typography.fontSize.md,
  },
  overspent: {
    color: colors.coral,
  },
  allocated: {
    marginTop: 2,
  },
});
