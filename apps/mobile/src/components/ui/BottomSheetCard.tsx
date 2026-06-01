import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, radii, shadows, spacing } from '../../theme';

type BottomSheetCardProps = {
  children: ReactNode;
  showHandle?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function BottomSheetCard({ children, showHandle = true, style }: BottomSheetCardProps) {
  return (
    <View style={[styles.sheet, style]}>
      {showHandle ? <View style={styles.handle} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
    ...shadows.sheet
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.border,
    borderRadius: radii.xl,
    height: 4,
    width: 42
  }
});

