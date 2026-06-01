import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';

type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
  tone?: 'default' | 'dark' | 'success' | 'warning' | 'error';
  style?: StyleProp<ViewStyle>;
};

export function MetricCard({ label, value, detail, tone = 'default', style }: MetricCardProps) {
  const dark = tone === 'dark';

  return (
    <View style={[styles.card, tone === 'dark' && styles.dark, tone === 'success' && styles.success, tone === 'warning' && styles.warning, tone === 'error' && styles.error, style]}>
      <Text style={[styles.value, dark && styles.onDark]}>{value}</Text>
      <Text style={[styles.label, dark && styles.onDarkMuted]}>{label}</Text>
      {detail ? <Text style={[styles.detail, dark && styles.onDarkMuted]}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.xs,
    minHeight: 86,
    padding: spacing.lg
  },
  dark: {
    backgroundColor: colors.black,
    borderColor: colors.black
  },
  success: {
    backgroundColor: colors.successTint,
    borderColor: colors.success
  },
  warning: {
    backgroundColor: colors.warningTint,
    borderColor: colors.warning
  },
  error: {
    backgroundColor: colors.errorTint,
    borderColor: colors.error
  },
  value: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  detail: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight
  },
  onDark: {
    color: colors.card
  },
  onDarkMuted: {
    color: '#D1D5DB'
  }
});
