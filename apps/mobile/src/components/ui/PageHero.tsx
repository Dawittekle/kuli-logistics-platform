import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';

type PageHeroProps = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  action?: ReactNode;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PageHero({ title, eyebrow, subtitle, action, dark = false, style }: PageHeroProps) {
  return (
    <View style={[styles.hero, dark && styles.darkHero, style]}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={[styles.eyebrow, dark && styles.darkMuted]}>{eyebrow}</Text> : null}
        <Text style={[styles.title, dark && styles.darkText]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, dark && styles.darkMuted]}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xl
  },
  darkHero: {
    backgroundColor: colors.black,
    borderColor: colors.black
  },
  copy: {
    gap: spacing.sm
  },
  eyebrow: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.pageTitle.fontSize,
    fontWeight: '900',
    lineHeight: typography.pageTitle.lineHeight
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight
  },
  darkText: {
    color: colors.card
  },
  darkMuted: {
    color: '#D1D5DB'
  }
});
