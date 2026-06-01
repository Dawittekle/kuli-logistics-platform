import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, radii, spacing } from '../../theme';

type MapPreviewCardProps = {
  children?: ReactNode;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

export function MapPreviewCard({ children, label = 'Map preview', style }: MapPreviewCardProps) {
  return (
    <View style={[styles.card, style]}>
      {children || (
        <View style={styles.placeholder}>
          <View style={styles.route} />
          <View style={[styles.pin, styles.pickupPin]}><Text style={styles.pinText}>P</Text></View>
          <View style={[styles.pin, styles.destinationPin]}><Text style={styles.pinText}>D</Text></View>
        </View>
      )}
      <View style={styles.label}>
        <Text style={styles.labelText}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ECECEA',
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    height: 220,
    overflow: 'hidden',
    position: 'relative'
  },
  placeholder: {
    flex: 1
  },
  route: {
    backgroundColor: colors.warning,
    borderRadius: radii.sm,
    height: 6,
    left: '20%',
    position: 'absolute',
    top: '50%',
    width: '60%'
  },
  pin: {
    alignItems: 'center',
    borderColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    height: 32,
    justifyContent: 'center',
    position: 'absolute',
    width: 32
  },
  pickupPin: {
    backgroundColor: colors.black,
    left: '18%',
    top: '40%'
  },
  destinationPin: {
    backgroundColor: colors.success,
    right: '18%',
    top: '54%'
  },
  pinText: {
    color: colors.card,
    fontSize: 12,
    fontWeight: '900'
  },
  label: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radii.md,
    bottom: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: 'absolute'
  },
  labelText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '900'
  }
});
