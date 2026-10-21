export interface AuthThemeColors {
  primary: string;
  primaryHover: string;
  navyDark: string;
  navyLight: string;
  orange: string;
  orangeHover: string;
  orangeSubtle: string;
  skyBlue: string;
  powderBlue: string;

  background: string;
  surface: string;
  surfaceSubtle: string;
  border: string;
  borderFocus: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  success: string;
  successBg: string;
  successBorder: string;
  successText: string;

  error: string;
  errorBg: string;
  errorBorder: string;
  errorText: string;

  warning: string;
  warningBg: string;
  warningBorder: string;
  warningText: string;
}

export const authLightColors: AuthThemeColors = {
  // Brand
  primary: '#1F3B87',        // Royal Navy Blue
  primaryHover: '#142553',   // Midnight Navy
  navyDark: '#142553',
  navyLight: '#2A4EA2',
  orange: '#FFAD61',         // Warm Amber Orange
  orangeHover: '#FFA24B',    // Active orange
  orangeSubtle: '#FFF3E8',   // Orange tint background
  skyBlue: '#77ACF1',        // Courier / Cargo Blue
  powderBlue: '#B0E0E6',

  // Surfaces & Canvas
  background: '#FBFAF9',     // Warm daylight off-white
  surface: '#FFFFFF',        // Pure white card
  surfaceSubtle: '#F7FAFC',
  border: '#E2E8F0',
  borderFocus: '#1F3B87',

  // Text
  textPrimary: '#191818',    // Charcoal dark
  textSecondary: '#4A5568',  // Slate secondary
  textMuted: '#718096',
  textInverse: '#FFFFFF',

  // Status
  success: '#10B981',
  successBg: '#ECFDF5',
  successBorder: '#A7F3D0',
  successText: '#065F46',

  error: '#EF4444',
  errorBg: '#FEF2F2',
  errorBorder: '#FECACA',
  errorText: '#991B1B',

  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  warningText: '#92400E'
};

export const authDarkColors: AuthThemeColors = {
  // Brand
  primary: '#3B82F6',        // Accessible blue on dark
  primaryHover: '#60A5FA',
  navyDark: '#0B132B',
  navyLight: '#1C2541',
  orange: '#FFAD61',
  orangeHover: '#FFA24B',
  orangeSubtle: '#2A1F16',
  skyBlue: '#77ACF1',
  powderBlue: '#1E3A5F',

  // Surfaces & Canvas
  background: '#0B0F19',     // Deep space dark
  surface: '#151D2F',        // Elevated dark card
  surfaceSubtle: '#1E293B',
  border: '#2D3748',
  borderFocus: '#60A5FA',

  // Text
  textPrimary: '#F8FAFC',    // Pure bright white
  textSecondary: '#CBD5E0',  // Light slate
  textMuted: '#94A3B8',
  textInverse: '#0F172A',

  // Status
  success: '#34D399',
  successBg: '#064E3B',
  successBorder: '#059669',
  successText: '#A7F3D0',

  error: '#F87171',
  errorBg: '#7F1D1D',
  errorBorder: '#DC2626',
  errorText: '#FECACA',

  warning: '#FBBF24',
  warningBg: '#78350F',
  warningBorder: '#D97706',
  warningText: '#FDE68A'
};

export const authRadii = {
  xs: 4,
  sm: 8,
  card: 16,
  button: 28,  // Pill radius
  input: 24,   // Friendly rounded input
  pill: 9999
};

export const authSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
};

export const authTypography = {
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySm: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 }
};
