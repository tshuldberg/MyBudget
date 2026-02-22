import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { colors, radii, spacing, typography } from '../tokens';

export interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function Input({ label, error, value, onFocus, onBlur, style, ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  const hasValue = !!value && value.length > 0;
  const isFloating = isFocused || hasValue;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isFloating ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isFloating, animatedValue]);

  const labelTop = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 4],
  });

  const labelSize = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [typography.fontSize.md, typography.fontSize.xs],
  });

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      style={[
        styles.container,
        isFocused && styles.focused,
        error && styles.error,
        style,
      ]}
    >
      <Animated.Text
        style={[
          styles.label,
          {
            top: labelTop,
            fontSize: labelSize,
            color: error ? colors.coral : isFocused ? colors.teal : colors.textMuted,
          },
        ]}
      >
        {label}
      </Animated.Text>
      <TextInput
        ref={inputRef}
        value={value}
        style={styles.input}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.teal}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      {error ? (
        <Animated.Text style={styles.errorText}>{error}</Animated.Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    minHeight: 56,
  },
  focused: {
    borderColor: colors.teal,
  },
  error: {
    borderColor: colors.coral,
  },
  label: {
    position: 'absolute',
    left: spacing.md,
    fontFamily: typography.fontFamily.body,
    fontWeight: typography.fontWeight.regular,
  },
  input: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
    padding: 0,
    margin: 0,
  },
  errorText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.coral,
    marginTop: spacing.xs,
  },
});
