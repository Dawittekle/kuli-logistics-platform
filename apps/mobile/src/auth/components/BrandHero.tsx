import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { authLightColors, authRadii, authSpacing } from '../theme/auth-theme';

export interface BrandHeroProps {
  title?: string;
  subtitle?: string;
  mode?: 'login' | 'signup' | 'otp' | 'recovery' | 'complete' | 'change-password';
  isDriver?: boolean;
  colors?: typeof authLightColors;
}

export const BrandHero: React.FC<BrandHeroProps> = ({
  title,
  subtitle,
  mode = 'login',
  isDriver = false,
  colors = authLightColors
}) => {
  const defaultTitle =
    mode === 'login'
      ? isDriver ? 'Driver Partner Login' : 'Welcome to KULI'
      : mode === 'signup'
      ? isDriver ? 'Become a KULI Driver' : 'Create Your Account'
      : mode === 'otp'
      ? 'Verify Your Phone'
      : mode === 'recovery'
      ? 'Account Recovery'
      : mode === 'change-password'
      ? 'Update Password'
      : 'Account Activated';

  const defaultSubtitle =
    mode === 'login'
      ? 'Sign in with your phone number to access your logistics workspace.'
      : mode === 'signup'
      ? 'Join verified cargo & household moving in Addis Ababa and East Africa.'
      : mode === 'otp'
      ? 'Enter the 6-digit confirmation code sent via SMS.'
      : mode === 'recovery'
      ? 'Choose a secure new password for your KULI account.'
      : mode === 'change-password'
      ? 'Ensure your account stays protected with a strong password.'
      : 'Your profile is ready. Start moving goods across Addis Ababa.';

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceSubtle }]}>
      {/* Visual Illustration Badge */}
      <View style={[styles.illustrationCard, { backgroundColor: colors.navyDark }]}>
        <View style={styles.truckIllustration}>
          <MaterialCommunityIcons
            name={isDriver ? 'truck-fast' : 'truck-delivery'}
            size={48}
            color={colors.orange}
          />
          <View style={[styles.parcelBadge, { backgroundColor: colors.skyBlue }]}>
            <MaterialCommunityIcons name="package-variant-closed" size={18} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.brandRow}>
          <Text style={[styles.brandLetterK, { color: colors.orange }]}>K</Text>
          <Text style={[styles.brandWordmark, { color: colors.textInverse }]}>ULLI</Text>
          {isDriver ? (
            <View style={[styles.driverBadge, { backgroundColor: colors.orange }]}>
              <Text style={styles.driverBadgeText}>DRIVER</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.cityLabel, { color: colors.powderBlue }]}>
          Addis Ababa • On-Demand Trucking
        </Text>
      </View>

      {/* Screen Title & Subtitle */}
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.textPrimary }]} accessibilityRole="header">
          {title ?? defaultTitle}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {subtitle ?? defaultSubtitle}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: authSpacing.md,
    paddingBottom: authSpacing.md,
    paddingHorizontal: authSpacing.md,
    borderBottomLeftRadius: authRadii.card,
    borderBottomRightRadius: authRadii.card,
    marginBottom: authSpacing.md
  },
  illustrationCard: {
    borderRadius: authRadii.card,
    paddingVertical: authSpacing.lg,
    paddingHorizontal: authSpacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4
  },
  truckIllustration: {
    position: 'relative',
    marginBottom: authSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center'
  },
  parcelBadge: {
    position: 'absolute',
    top: -4,
    right: -12,
    borderRadius: 8,
    padding: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF'
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  brandLetterK: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2
  },
  brandWordmark: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 4
  },
  driverBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: authRadii.pill
  },
  driverBadgeText: {
    color: '#142553',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1
  },
  cityLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.5
  },
  textContainer: {
    marginTop: authSpacing.md,
    paddingHorizontal: authSpacing.xs
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20
  }
});
