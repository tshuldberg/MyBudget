import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, Badge, colors, spacing, typography } from '@mybudget/ui';
import type { Subscription } from '@mybudget/shared';
import { formatCents, normalizeToMonthly } from '@mybudget/shared';

export interface SubscriptionRowProps {
  subscription: Subscription;
  onPress?: (id: string) => void;
}

function formatRenewal(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  const diffMs = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `in ${diffDays} days`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function SubscriptionRow({ subscription, onPress }: SubscriptionRowProps) {
  const monthly = normalizeToMonthly(
    subscription.price,
    subscription.billing_cycle,
    subscription.custom_days,
  );
  const isActive = subscription.status === 'active' || subscription.status === 'trial';

  return (
    <Pressable
      onPress={() => onPress?.(subscription.id)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.left}>
        <View style={styles.nameRow}>
          {subscription.icon ? (
            <Text variant="body" style={styles.icon}>{subscription.icon}</Text>
          ) : null}
          <Text variant="body" numberOfLines={1} style={styles.name}>
            {subscription.name}
          </Text>
          <Badge status={subscription.status} />
        </View>
        {isActive && (
          <Text variant="caption" style={styles.renewal}>
            Renews {formatRenewal(subscription.next_renewal)}
          </Text>
        )}
      </View>

      <View style={styles.right}>
        <Text variant="currency" style={styles.price}>
          {formatCents(subscription.price)}
        </Text>
        <Text variant="caption">
          {formatCents(monthly)}/mo
        </Text>
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
    minHeight: 64,
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
    gap: spacing.sm,
  },
  icon: {
    fontSize: typography.fontSize.lg,
  },
  name: {
    flex: 1,
    fontWeight: typography.fontWeight.medium,
  },
  renewal: {
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: typography.fontSize.md,
  },
});
