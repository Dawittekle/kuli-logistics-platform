import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, spacing, typography } from '../../theme';

type SectionHeaderProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function SectionHeader({ title, eyebrow, description, action, style }: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: 44
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
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
    lineHeight: typography.sectionTitle.lineHeight
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight
  }
});
