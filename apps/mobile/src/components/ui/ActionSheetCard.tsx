import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, radii, shadows, spacing } from '../../theme';

type ActionSheetCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  handle?: boolean;
};

export function ActionSheetCard({ children, style, handle = true }: ActionSheetCardProps) {
  return (
    <View style={[styles.sheet, style]}>
      {handle ? <View style={styles.handle} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    gap: spacing.lg,
    padding: spacing.lg,
    ...shadows.sheet
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.border,
    borderRadius: radii.xl,
    height: 4,
    width: 44
  }
});
