export const colors = {
  black: '#0F172A',
  nearBlack: '#1E293B',
  darkSurface: '#334155',
  background: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  muted: '#94A3B8',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  successTint: '#ECFDF5',
  warningTint: '#FEF3C7',
  errorTint: '#FEF2F2',
  subtle: '#F1F5F9',

  // Backward-compatible aliases used by the existing large App.tsx.
  ink: '#0F172A',
  canvas: '#F8FAFC',
  panel: '#FFFFFF',
  line: '#E2E8F0',
  primary: '#4F46E5',
  primaryDeep: '#3730A3',
  accent: '#6366F1',
  green: '#10B981',
  red: '#EF4444',
  amber: '#F59E0B'
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24
};

export const typography = {
  pageTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    lineHeight: 38
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 28
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    lineHeight: 24
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22
  },
  label: {
    fontSize: 13,
    fontWeight: '700' as const,
    lineHeight: 18
  },
  caption: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16
  }
};

export const shadows = {
  sheet: {
    elevation: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24
  },
  soft: {
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12
  }
};
