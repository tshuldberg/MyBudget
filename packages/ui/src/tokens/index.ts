// Design tokens — populated by ui-dev
export const colors = {
  // Core palette
  background: '#1A1A2E',
  surface: '#242440',
  surfaceElevated: '#2E2E4A',

  // Accent colors
  amber: '#F5A623',
  coral: '#FF6B6B',
  teal: '#4ECDC4',
  lavender: '#A0A0C8',

  // Semantic
  income: '#F5A623',
  expense: '#FF6B6B',
  savings: '#4ECDC4',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0C8',
  textMuted: '#6B6B8A',
  border: '#3A3A5C',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const;

export const typography = {
  fontFamily: {
    body: 'Inter',
    mono: 'SF Mono',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    hero: 48,
  },
} as const;
