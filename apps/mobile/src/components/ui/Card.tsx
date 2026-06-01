import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, radii, spacing } from '../../theme';

type CardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  selected?: boolean;
};

export function Card({ children, style, compact = false, selected = false }: CardProps) {
  return <View style={[styles.card, compact && styles.compact, selected && styles.selected, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  compact: {
    borderRadius: radii.md,
    gap: spacing.sm,
    padding: spacing.md
  },
  selected: {
    borderColor: colors.black,
    borderWidth: 2
  }
});

