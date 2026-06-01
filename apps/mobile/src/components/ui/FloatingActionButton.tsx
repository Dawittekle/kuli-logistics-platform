import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { GestureResponderEvent, StyleProp, ViewStyle } from 'react-native';

import { colors, radii, shadows, spacing, typography } from '../../theme';

type FloatingActionButtonProps = {
  label?: string;
  icon?: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function FloatingActionButton({ label, icon, onPress, style, disabled = false }: FloatingActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled, style]}
    >
      {icon}
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.black,
    borderRadius: radii.xl,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    ...shadows.sheet
  },
  disabled: {
    opacity: 0.55
  },
  label: {
    color: colors.card,
    fontSize: typography.body.fontSize,
    fontWeight: '900'
  }
});
