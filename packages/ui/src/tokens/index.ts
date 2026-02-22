// Design tokens — @mybudget/ui

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

  // Interactive states
  tealPressed: '#3BADA6',
  tealDisabled: '#2A7A75',
  overlay: 'rgba(0, 0, 0, 0.6)',

  // Progress bar semantic
  progressGreen: '#4ECDC4',
  progressAmber: '#F5A623',
  progressCoral: '#FF6B6B',
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
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
