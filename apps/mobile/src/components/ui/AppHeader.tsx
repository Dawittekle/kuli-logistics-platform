import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, spacing, typography } from '../../theme';

type AppHeaderProps = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function AppHeader({ title, eyebrow, subtitle, leading, trailing, style }: AppHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      {leading}
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between'
  },
  copy: {
    flex: 1,
    gap: spacing.xs
  },
  eyebrow: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: typography.caption.lineHeight,
    textTransform: 'uppercase'
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.pageTitle.fontSize,
    fontWeight: typography.pageTitle.fontWeight,
    lineHeight: typography.pageTitle.lineHeight
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight
  }
});

