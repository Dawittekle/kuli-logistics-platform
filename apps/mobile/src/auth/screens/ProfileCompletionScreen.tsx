import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BrandHero } from '../components/BrandHero';
import { formatPhoneForDisplay } from '../utils/phone-validator';
import { authLightColors, authRadii, authSpacing } from '../theme/auth-theme';

export interface ProfileCompletionScreenProps {
  role: 'client' | 'truck_owner';
  fullName: string;
  phone: string;
  email: string;
  onCompleteCustomerOnboarding: () => void;
  onProceedToVehicleVerification: () => void;
  colors?: typeof authLightColors;
}

export const ProfileCompletionScreen: React.FC<ProfileCompletionScreenProps> = ({
  role,
  fullName,
  phone,
  email,
  onCompleteCustomerOnboarding,
  onProceedToVehicleVerification,
  colors = authLightColors
}) => {
  const isDriver = role === 'truck_owner';

  return (
    <View style={styles.container}>
      <BrandHero
        mode="complete"
        isDriver={isDriver}
        title={isDriver ? 'Driver Account Activated!' : 'Welcome to KULI!'}
        subtitle={
          isDriver
            ? 'Your driver profile is ready. Register your truck to start receiving delivery offers.'
            : 'Your phone number is verified. You can now request vetted trucks across Addis Ababa.'
        }
        colors={colors}
      />

      <View style={styles.contentContainer}>
        {/* Profile Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.navyDark }]}>
              <Text style={[styles.avatarText, { color: colors.orange }]}>
                {fullName.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.fullName, { color: colors.textPrimary }]}>{fullName}</Text>
              <Text style={[styles.roleBadgeText, { color: colors.primary }]}>
                {isDriver ? 'Truck Owner / Driver' : 'Customer Account'}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="cellphone-check" size={18} color={colors.success} />
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Phone:</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
              {formatPhoneForDisplay(phone)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="email-check-outline" size={18} color={colors.success} />
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Email:</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{email}</Text>
          </View>
        </View>

        {/* Divergent Onboarding Steps */}
        {isDriver ? (
          <View style={[styles.driverGuideCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
            <Text style={[styles.guideTitle, { color: colors.textPrimary }]}>
              Verification Checklist Before Going Online:
            </Text>

            <View style={styles.stepItem}>
              <View style={[styles.stepNumberBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepHeading, { color: colors.textPrimary }]}>Vehicle Details</Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                  Specify your truck class (Pickup, Isuzu, FSR, Trailer), plate number, and load capacity.
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={[styles.stepNumberBadge, { backgroundColor: colors.orange }]}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepHeading, { color: colors.textPrimary }]}>Document Upload</Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                  Upload Driver's License, Commercial Vehicle Registration (Libre), and Insurance.
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={[styles.stepNumberBadge, { backgroundColor: colors.navyDark }]}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepHeading, { color: colors.textPrimary }]}>Fast Admin Approval</Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                  Our operations team reviews submissions within 24 hours to approve your truck for live jobs.
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Proceed to vehicle registration"
              onPress={onProceedToVehicleVerification}
              style={[styles.primaryButton, { backgroundColor: colors.orange }]}
            >
              <Text style={styles.primaryButtonText}>Register Your Vehicle Now</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </Pressable>
          </View>
        ) : (
          <View style={[styles.customerWelcomeCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
            <View style={styles.instantBookingBanner}>
              <MaterialCommunityIcons name="lightning-bolt" size={24} color={colors.orange} />
              <Text style={[styles.instantBookingText, { color: colors.textPrimary }]}>
                You are ready to book transport immediately!
              </Text>
            </View>
            <Text style={[styles.instantBookingDesc, { color: colors.textSecondary }]}>
              Enter your pickup and destination in Addis Ababa to get instant pricing and matched with vetted nearby drivers.
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start booking trucks now"
              onPress={onCompleteCustomerOnboarding}
              style={[styles.primaryButton, { backgroundColor: colors.orange }]}
            >
              <Text style={styles.primaryButtonText}>Start Booking Trucks</Text>
              <MaterialCommunityIcons name="truck-fast" size={20} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  contentContainer: {
    paddingHorizontal: authSpacing.md,
    paddingBottom: authSpacing.xxl
  },
  card: {
    padding: authSpacing.md,
    borderRadius: authRadii.card,
    borderWidth: 1.5,
    marginBottom: authSpacing.md
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: authSpacing.md
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800'
  },
  profileInfo: {
    flex: 1
  },
  fullName: {
    fontSize: 18,
    fontWeight: '700'
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2
  },
  divider: {
    height: 1,
    marginVertical: authSpacing.md
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8
  },
  detailLabel: {
    fontSize: 13,
    marginLeft: 6,
    marginRight: 4
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600'
  },
  driverGuideCard: {
    padding: authSpacing.md,
    borderRadius: authRadii.card,
    borderWidth: 1.5
  },
  guideTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: authSpacing.md
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: authSpacing.md
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: authSpacing.sm,
    marginTop: 2
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  },
  stepContent: {
    flex: 1
  },
  stepHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2
  },
  stepDesc: {
    fontSize: 12,
    lineHeight: 16
  },
  customerWelcomeCard: {
    padding: authSpacing.lg,
    borderRadius: authRadii.card,
    borderWidth: 1.5
  },
  instantBookingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: authSpacing.sm
  },
  instantBookingText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    flex: 1
  },
  instantBookingDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: authSpacing.lg
  },
  primaryButton: {
    height: 52,
    borderRadius: authRadii.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: authSpacing.sm,
    shadowColor: '#FFAD61',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  }
});
