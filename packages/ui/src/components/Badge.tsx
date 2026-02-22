import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, radii, spacing, typography } from '../tokens';

export type BadgeStatus = 'active' | 'paused' | 'cancelled' | 'trial';

export interface BadgeProps extends ViewProps {
  status: BadgeStatus;
  label?: string;
}

const statusColors: Record<BadgeStatus, string> = {
  active: colors.teal,
  paused: colors.amber,
  cancelled: colors.coral,
  trial: colors.lavender,
};

const defaultLabels: Record<BadgeStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  cancelled: 'Cancelled',
  trial: 'Trial',
};

export function Badge({ status, label, style, ...props }: BadgeProps) {
  const color = statusColors[status];

  return (
    <View
      style={[styles.badge, { backgroundColor: `${color}1A` }, style]}
      {...props}
    >
      <Text
        variant="caption"
        style={[styles.label, { color }]}
      >
        {label ?? defaultLabels[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.fontSize.xs * typography.lineHeight.normal,
  },
});
