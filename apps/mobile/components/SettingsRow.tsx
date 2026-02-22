import React from 'react';
import { Pressable, View, Switch, StyleSheet } from 'react-native';
import { Text, colors, spacing } from '@mybudget/ui';

export interface SettingsRowProps {
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  toggle?: boolean;
  onToggle?: (value: boolean) => void;
}

export function SettingsRow({
  label,
  value,
  onPress,
  destructive,
  toggle,
  onToggle,
}: SettingsRowProps) {
  const isToggle = toggle !== undefined;

  return (
    <Pressable
      onPress={isToggle ? undefined : onPress}
      disabled={isToggle || !onPress}
      style={({ pressed }) => [styles.row, pressed && !isToggle && styles.pressed]}
    >
      <Text
        variant="body"
        style={destructive ? styles.destructiveLabel : undefined}
      >
        {label}
      </Text>
      <View style={styles.right}>
        {isToggle ? (
          <Switch
            value={toggle}
            onValueChange={onToggle}
            trackColor={{ false: colors.border, true: colors.teal }}
            thumbColor={colors.textPrimary}
          />
        ) : (
          <>
            {value ? (
              <Text variant="caption">{value}</Text>
            ) : null}
            {onPress ? (
              <Text variant="caption" style={styles.chevron}>›</Text>
            ) : null}
          </>
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  pressed: {
    backgroundColor: 'rgba(78, 205, 196, 0.06)',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chevron: {
    fontSize: 20,
    color: colors.textMuted,
  },
  destructiveLabel: {
    color: colors.coral,
  },
});
