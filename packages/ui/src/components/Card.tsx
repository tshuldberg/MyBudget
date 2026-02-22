import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { colors, radii, spacing, shadows } from '../tokens';

export interface CardProps extends ViewProps {
  elevated?: boolean;
}

export function Card({ style, elevated, children, ...props }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
    ...shadows.md,
  },
});
