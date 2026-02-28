/**
 * Recharts theme config matching the dark design tokens.
 */

export const chartColors = {
  teal: '#4ECDC4',
  amber: '#F5A623',
  coral: '#FF6B6B',
  lavender: '#A0A0C8',
  surface: '#242440',
  background: '#1A1A2E',
  border: '#3A3A5C',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0C8',
  textMuted: '#6B6B8A',
};

export const CHART_PALETTE = [
  chartColors.teal,
  chartColors.amber,
  chartColors.coral,
  chartColors.lavender,
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
];

export const axisStyle = {
  fontSize: 12,
  fontFamily: 'Inter, sans-serif',
  fill: chartColors.textSecondary,
};

export const gridStyle = {
  stroke: chartColors.border,
  strokeDasharray: '3 3',
};

export const tooltipStyle = {
  contentStyle: {
    background: chartColors.surface,
    border: `1px solid ${chartColors.border}`,
    borderRadius: 8,
    color: chartColors.textPrimary,
    fontSize: 13,
  },
  labelStyle: {
    color: chartColors.textSecondary,
    fontWeight: 600,
  },
};
