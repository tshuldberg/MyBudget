import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, Card, colors, spacing } from '@mybudget/ui';
import type { GroupBudgetState } from '@mybudget/shared';
import { formatCents } from '@mybudget/shared';
import { CategoryRow } from './CategoryRow';

export interface CategoryGroupSectionProps {
  group: GroupBudgetState;
  onCategoryPress?: (categoryId: string) => void;
  onCategoryLongPress?: (categoryId: string) => void;
}

export function CategoryGroupSection({ group, onCategoryPress, onCategoryLongPress }: CategoryGroupSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={() => setCollapsed(!collapsed)}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <Text variant="body" style={styles.chevron}>
            {collapsed ? '›' : '⌄'}
          </Text>
          <Text variant="body" style={styles.groupName}>
            {group.name}
          </Text>
        </View>
        <Text variant="caption" style={styles.groupAvailable}>
          {formatCents(group.available)}
        </Text>
      </Pressable>

      {!collapsed && group.categories.map((cat, index) => (
        <View key={cat.categoryId}>
          {index > 0 && <View style={styles.divider} />}
          <CategoryRow category={cat} onPress={onCategoryPress} onLongPress={onCategoryLongPress} />
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chevron: {
    color: colors.textMuted,
    marginRight: spacing.sm,
    fontSize: 16,
    width: 16,
    textAlign: 'center',
  },
  groupName: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  groupAvailable: {
    fontFamily: 'SF Mono',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md,
  },
});
