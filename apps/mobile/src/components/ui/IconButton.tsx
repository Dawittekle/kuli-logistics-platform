import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { GestureResponderEvent, PressableProps, StyleProp, ViewStyle } from 'react-native';

import { colors, radii, spacing } from '../../theme';

type IconButtonProps = Omit<PressableProps, 'children' | 'onPress' | 'style'> & {
  accessibilityLabel: string;
  icon?: ReactNode;
  label?: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({ accessibilityLabel, icon, label, onPress, disabled = false, selected = false, style, ...props }: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, selected && styles.selected, disabled && styles.disabled, style]}
      {...props}
    >
      {icon ?? <Text style={[styles.fallbackIcon, selected && styles.fallbackIconSelected]}>{label?.slice(0, 1) ?? '•'}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    padding: spacing.sm,
    width: 48
  },
  selected: {
    backgroundColor: colors.black,
    borderColor: colors.black
  },
  disabled: {
    opacity: 0.55
  },
  fallbackIcon: {
    color: colors.black,
    fontSize: 18,
    fontWeight: '900'
  },
  fallbackIconSelected: {
    color: colors.card
  }
});

