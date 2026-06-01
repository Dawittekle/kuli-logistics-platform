import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../../theme';

type IconSet = 'ion' | 'material';

type BottomTabIconProps = {
  focused: boolean;
  label: string;
  name: string;
  iconSet?: IconSet;
};

export function BottomTabIcon({ focused, label, name, iconSet = 'ion' }: BottomTabIconProps) {
  const Icon = iconSet === 'material' ? MaterialCommunityIcons : Ionicons;

  return (
    <View style={styles.item}>
      <View style={[styles.container, focused && styles.containerFocused]}>
        <Icon name={name as never} color={focused ? colors.card : colors.textSecondary} size={focused ? 23 : 22} />
        {focused ? <Text style={styles.label} numberOfLines={1}>{label}</Text> : null}
      </View>
      {!focused ? <Text style={styles.inactiveLabel} numberOfLines={1}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    alignItems: 'center',
    gap: 3,
    justifyContent: 'center',
    minWidth: 58
  },
  container: {
    alignItems: 'center',
    borderRadius: radii.xl,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing.sm
  },
  containerFocused: {
    backgroundColor: colors.black,
    minWidth: 92
  },
  label: {
    color: colors.card,
    fontSize: 12,
    fontWeight: '900'
  },
  inactiveLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800'
  }
});
