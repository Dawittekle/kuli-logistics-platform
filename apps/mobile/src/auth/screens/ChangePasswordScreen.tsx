import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PasswordInput } from '../components/PasswordInput';
import { PasswordRequirements, evaluatePassword } from '../components/PasswordRequirements';
import { BrandHero } from '../components/BrandHero';
import { authLightColors, authRadii, authSpacing } from '../theme/auth-theme';

export interface ChangePasswordScreenProps {
  onUpdatePassword: (newPassword: string) => Promise<void>;
  onBack: () => void;
  colors?: typeof authLightColors;
}

export const ChangePasswordScreen: React.FC<ChangePasswordScreenProps> = ({
  onUpdatePassword,
  onBack,
  colors = authLightColors
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const passwordEval = evaluatePassword(newPassword);
  const passwordsMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);

  const canSubmit = passwordEval.isStrong && passwordsMatch && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      await onUpdatePassword(newPassword);
      setSuccessMessage('Your password has been securely updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not update password. Please verify requirements and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <BrandHero
        mode="change-password"
        title="Change Password"
        subtitle="Keep your KULI account safe by updating your password periodically."
        colors={colors}
      />

      <View style={styles.contentContainer}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Optional Current Password */}
          <PasswordInput
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter your existing password"
            disabled={loading}
            colors={colors}
          />

          {/* New Password */}
          <PasswordInput
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="At least 8 characters"
            disabled={loading}
            autoComplete="password-new"
            colors={colors}
          />

          {/* Confirm New Password */}
          <PasswordInput
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter your new password"
            disabled={loading}
            autoComplete="password-new"
            colors={colors}
          />

          {/* Security Checklist */}
          <PasswordRequirements
            password={newPassword}
            confirmPassword={confirmPassword}
            checkMatch={true}
            colors={colors}
          />

          {/* Success Banner */}
          {successMessage ? (
            <View style={[styles.alertBox, { backgroundColor: colors.successBg, borderColor: colors.successBorder }]}>
              <MaterialCommunityIcons name="check-circle" size={18} color={colors.success} />
              <Text style={[styles.alertText, { color: colors.successText }]}>{successMessage}</Text>
            </View>
          ) : null}

          {/* Error Banner */}
          {errorMessage ? (
            <View style={[styles.alertBox, { backgroundColor: colors.errorBg, borderColor: colors.errorBorder }]}>
              <MaterialCommunityIcons name="alert-circle" size={18} color={colors.error} />
              <Text style={[styles.alertText, { color: colors.errorText }]}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Submit Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save new password"
            accessibilityState={{ disabled: !canSubmit }}
            disabled={!canSubmit}
            onPress={handleSubmit}
            style={[
              styles.primaryButton,
              { backgroundColor: colors.orange },
              !canSubmit && { opacity: 0.5 }
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Save New Password</Text>
            )}
          </Pressable>
        </View>

        {/* Back Link */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to profile settings"
          onPress={onBack}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={18} color={colors.primary} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>
            Back to Profile
          </Text>
        </Pressable>
      </View>
    </ScrollView>
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
    marginBottom: authSpacing.lg
  },
  primaryButton: {
    height: 52,
    borderRadius: authRadii.button,
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
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: authSpacing.md,
    borderRadius: authRadii.sm,
    borderWidth: 1,
    marginBottom: authSpacing.md
  },
  alertText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: authSpacing.md
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6
  }
});
