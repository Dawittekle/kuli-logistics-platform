import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';

type ErrorStateProps = {
  title?: string;
  message: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ErrorState({ title = 'Something needs attention', message, action, style }: ErrorStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.errorTint,
    borderColor: colors.error,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  copy: {
    gap: spacing.xs
  },
  title: {
    color: colors.error,
    fontSize: typography.cardTitle.fontSize,
    fontWeight: typography.cardTitle.fontWeight,
    lineHeight: typography.cardTitle.lineHeight
  },
  message: {
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight
  }
});

