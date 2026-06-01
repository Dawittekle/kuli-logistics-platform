import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GestureResponderEvent, StyleProp, ViewStyle } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';

type ServiceTileProps = {
  title: string;
  detail?: string;
  icon?: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ServiceTile({ title, detail, icon, onPress, selected = false, style }: ServiceTileProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.tile, selected && styles.selected, style]}>
      <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>{icon}</View>
      <Text style={[styles.title, selected && styles.selectedText]}>{title}</Text>
      {detail ? <Text style={[styles.detail, selected && styles.selectedMuted]}>{detail}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    minHeight: 132,
    padding: spacing.lg
  },
  selected: {
    backgroundColor: colors.black,
    borderColor: colors.black
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  iconWrapSelected: {
    backgroundColor: colors.darkSurface
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.cardTitle.fontSize,
    fontWeight: '900',
    lineHeight: typography.cardTitle.lineHeight
  },
  detail: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight
  },
  selectedText: {
    color: colors.card
  },
  selectedMuted: {
    color: '#D1D5DB'
  }
});
