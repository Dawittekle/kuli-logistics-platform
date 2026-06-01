import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';

type StatusTone = 'success' | 'warning' | 'error' | 'neutral' | 'dark';

type StatusBadgeProps = {
  children: string;
  tone?: StatusTone;
  style?: StyleProp<ViewStyle>;
};

const toneStyles = {
  success: {
    container: { backgroundColor: colors.successTint },
    text: { color: colors.success }
  },
  warning: {
    container: { backgroundColor: colors.warningTint },
    text: { color: colors.warning }
  },
  error: {
    container: { backgroundColor: colors.errorTint },
    text: { color: colors.error }
  },
  neutral: {
    container: { backgroundColor: colors.subtle },
    text: { color: colors.textSecondary }
  },
  dark: {
    container: { backgroundColor: colors.black },
    text: { color: colors.card }
  }
};

export function StatusBadge({ children, tone = 'neutral', style }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, toneStyles[tone].container, style]}>
      <Text style={[styles.text, toneStyles[tone].text]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.xl,
    justifyContent: 'center',
    minHeight: 30,
    paddingHorizontal: spacing.md
  },
  text: {
    fontSize: typography.caption.fontSize,
    fontWeight: '800',
    lineHeight: typography.caption.lineHeight
  }
});

