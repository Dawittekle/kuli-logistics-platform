import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, Animated } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';

type LoadingStateProps = {
  title?: string;
  message?: string;
  style?: StyleProp<ViewStyle>;
};

export function LoadingState({ title = 'Loading', message = 'Preparing the latest KULI details.', style }: LoadingStateProps) {
  const pulse = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.02,
          duration: 1200,
          useNativeDriver: true
        }),
        Animated.timing(pulse, {
          toValue: 0.96,
          duration: 1200,
          useNativeDriver: true
        })
      ])
    ).start();
  }, [pulse]);

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulse }] }, style]}>
      <ActivityIndicator color={colors.primary} size="small" />
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 72,
    padding: spacing.lg
  },
  copy: {
    flex: 1,
    gap: spacing.xs
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.cardTitle.fontSize,
    fontWeight: typography.cardTitle.fontWeight,
    lineHeight: typography.cardTitle.lineHeight
  },
  message: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight
  }
});
