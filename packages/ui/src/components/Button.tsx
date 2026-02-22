import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  ActivityIndicator,
} from 'react-native';
import { colors, radii, spacing, typography } from '../tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  variant?: ButtonVariant;
  label: string;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  label,
  loading,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        pressed && !isDisabled && pressedStyles[variant],
        isDisabled && styles.disabled,
        typeof style === 'function' ? style({ pressed }) : style,
      ]}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.background : colors.teal}
        />
      ) : (
        <Text
          style={[styles.label, labelStyles[variant], isDisabled && styles.labelDisabled]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  labelDisabled: {
    opacity: 0.7,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.teal,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.teal,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
});

const pressedStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.tealPressed,
  },
  secondary: {
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
  },
  ghost: {
    backgroundColor: 'rgba(78, 205, 196, 0.08)',
  },
});

const labelStyles = StyleSheet.create({
  primary: {
    color: colors.background,
  },
  secondary: {
    color: colors.teal,
  },
  ghost: {
    color: colors.teal,
  },
});
