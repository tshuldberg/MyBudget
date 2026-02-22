import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../tokens';

export interface ProgressBarProps extends ViewProps {
  /** Fill percentage, 0-100+ (can exceed 100 for overspent) */
  progress: number;
  /** Height in pixels, defaults to 8 */
  height?: number;
}

function getProgressColor(progress: number): string {
  if (progress > 100) return colors.progressCoral;
  if (progress >= 75) return colors.progressAmber;
  return colors.progressGreen;
}

export function ProgressBar({
  progress,
  height = 8,
  style,
  ...props
}: ProgressBarProps) {
  const clampedWidth = Math.min(Math.max(progress, 0), 100);
  const fillColor = getProgressColor(progress);

  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2 }, style]}
      {...props}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${clampedWidth}%`,
            backgroundColor: fillColor,
            height,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.border,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
