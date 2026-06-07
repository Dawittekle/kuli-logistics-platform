import { useRef } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, Animated } from 'react-native';
import type { GestureResponderEvent, PressableProps, StyleProp, ViewStyle } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type SecondaryButtonProps = Omit<PressableProps, 'children' | 'onPress' | 'style'> & {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  left?: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'danger';
};

export function SecondaryButton({ label, onPress, disabled = false, loading = false, left, style, tone = 'default', ...props }: SecondaryButtonProps) {
  const blocked = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (blocked) return;
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true
    }).start();
  };

  const handlePressOut = () => {
    if (blocked) return;
    Animated.spring(scale, {
      toValue: 1,
      tension: 100,
      friction: 6,
      useNativeDriver: true
    }).start();
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.button,
        tone === 'danger' && styles.danger,
        blocked && styles.disabled,
        { transform: [{ scale }] },
        style
      ]}
      {...props}
    >
      {loading ? <ActivityIndicator color={tone === 'danger' ? colors.error : colors.black} size="small" /> : left}
      <Text style={[styles.label, tone === 'danger' && styles.dangerLabel]}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  danger: {
    backgroundColor: colors.errorTint
  },
  disabled: {
    opacity: 0.55
  },
  label: {
    color: colors.black,
    fontSize: typography.body.fontSize,
    fontWeight: '800',
    lineHeight: typography.body.lineHeight
  },
  dangerLabel: {
    color: colors.error
  }
});
