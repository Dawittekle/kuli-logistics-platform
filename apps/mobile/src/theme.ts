export const colors = {
  black: '#000000',
  nearBlack: '#111111',
  darkSurface: '#181818',
  background: '#F6F6F3',
  card: '#FFFFFF',
  border: '#E6E6E6',
  textPrimary: '#111111',
  textSecondary: '#6B7280',
  muted: '#9CA3AF',
  success: '#16833A',
  warning: '#B86B12',
  error: '#D32F2F',
  successTint: '#E8F4EC',
  warningTint: '#FFF3E0',
  errorTint: '#FDECEC',
  subtle: '#F2F2EF',

  // Backward-compatible aliases used by the existing large App.tsx.
  ink: '#111111',
  canvas: '#F6F6F3',
  panel: '#FFFFFF',
  line: '#E6E6E6',
  primary: '#000000',
  primaryDeep: '#111111',
  accent: '#B86B12',
  green: '#16833A',
  red: '#D32F2F',
  amber: '#B86B12'
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
