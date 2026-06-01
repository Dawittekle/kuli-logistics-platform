import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';

type RoutePillProps = {
  pickup: string;
  destination: string;
};

export function RoutePill({ pickup, destination }: RoutePillProps) {
  return (
    <View style={styles.pill}>
      <View style={styles.markerColumn}>
        <View style={styles.pickupDot} />
        <View style={styles.routeLine} />
        <View style={styles.destinationDot} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>Pickup</Text>
        <Text style={styles.value} numberOfLines={1}>{pickup}</Text>
        <Text style={styles.label}>Drop-off</Text>
        <Text style={styles.value} numberOfLines={1}>{destination}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'stretch',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md
  },
  markerColumn: {
    alignItems: 'center',
    paddingVertical: 3,
    width: 18
  },
  pickupDot: {
    backgroundColor: colors.black,
    borderRadius: 6,
    height: 12,
    width: 12
  },
  routeLine: {
    backgroundColor: colors.border,
    flex: 1,
    marginVertical: 4,
    width: 2
  },
  destinationDot: {
    backgroundColor: colors.success,
    borderRadius: 6,
    height: 12,
    width: 12
  },
  copy: {
    flex: 1,
    gap: 2
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  value: {
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    fontWeight: '800',
    lineHeight: typography.body.lineHeight
  }
});
