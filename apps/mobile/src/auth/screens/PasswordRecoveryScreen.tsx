import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PasswordInput } from '../components/PasswordInput';
import { PasswordRequirements, evaluatePassword } from '../components/PasswordRequirements';
import { OtpInput } from '../components/OtpInput';
import { BrandHero } from '../components/BrandHero';
import { authLightColors, authRadii, authSpacing } from '../theme/auth-theme';

export interface PasswordRecoveryScreenProps {
  onRequestCode: (email: string) => Promise<void>;
  onVerifyCode: (email: string, code: string) => Promise<void>;
  onResetPassword: (newPassword: string) => Promise<void>;
  onBackToLogin: () => void;
  colors?: typeof authLightColors;
}

export type RecoveryStep = 'request' | 'verify' | 'set_new_password' | 'completed';

export const PasswordRecoveryScreen: React.FC<PasswordRecoveryScreenProps> = ({
  onRequestCode,
  onVerifyCode,
  onResetPassword,
  onBackToLogin,
  colors = authLightColors
}) => {
  const [step, setStep] = useState<RecoveryStep>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');

  // Countdown timer for resend
  useEffect(() => {
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const isValidEmail = Boolean(email.trim().includes('@') && email.trim().includes('.'));
  const passwordEval = evaluatePassword(newPassword);
  const passwordsMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);

  const handleRequestCode = async () => {
    if (!isValidEmail || loading) return;

    setErrorMessage('');
    setNoticeMessage('');
    setLoading(true);

    try {
      await onRequestCode(email.trim().toLowerCase());
      setStep('verify');
      setTimer(60);
      setNoticeMessage('A one-time recovery code was sent to your email.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not send recovery code. Check your email address.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6 || loading) return;

    setErrorMessage('');
    setNoticeMessage('');
    setLoading(true);

    try {
      await onVerifyCode(email.trim().toLowerCase(), code.trim());
      setStep('set_new_password');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Invalid or expired recovery code. Check your code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordEval.isStrong || !passwordsMatch || loading) return;

    setErrorMessage('');
    setNoticeMessage('');
    setLoading(true);

    try {
      await onResetPassword(newPassword);
      setStep('completed');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <BrandHero
        mode="recovery"
        title="Reset Password"
        subtitle={
          step === 'request'
            ? 'Enter your account email to receive a secure recovery code.'
            : step === 'verify'
            ? `Enter the 6-digit code sent to ${email.trim()}`
            : step === 'set_new_password'
            ? 'Choose a secure new password for your KULI account.'
            : 'Your password has been successfully updated.'
        }
        colors={colors}
      />

      <View style={styles.contentContainer}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Step 1: Request Recovery Code */}
          {step === 'request' ? (
            <View>
              <Text style={[styles.stepLabel, { color: colors.textPrimary }]}>
                Account Email Address
              </Text>
              <TextInput
                accessibilityLabel="Account Email Address"
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary
                  }
                ]}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
                value={email}
                onChangeText={setEmail}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send recovery code"
                accessibilityState={{ disabled: !isValidEmail || loading }}
                disabled={!isValidEmail || loading}
                onPress={handleRequestCode}
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.orange },
                  (!isValidEmail || loading) && { opacity: 0.5 }
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send Recovery Code</Text>
                )}
              </Pressable>
            </View>
          ) : null}

          {/* Step 2: Verify Code */}
          {step === 'verify' ? (
            <View>
              <Text style={[styles.stepLabel, { color: colors.textPrimary }]}>
                Enter 6-Digit Recovery Code
              </Text>
              <OtpInput
                value={code}
                onChangeText={(val) => {
                  setCode(val);
                  setErrorMessage('');
                }}
                disabled={loading}
                colors={colors}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Verify recovery code"
                accessibilityState={{ disabled: code.length !== 6 || loading }}
                disabled={code.length !== 6 || loading}
                onPress={handleVerifyCode}
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.orange },
                  (code.length !== 6 || loading) && { opacity: 0.5 }
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify Recovery Code</Text>
                )}
              </Pressable>

              {timer > 0 ? (
                <Text style={[styles.resendHint, { color: colors.textMuted }]}>
                  Resend code in {timer}s
                </Text>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Resend password recovery code"
                  onPress={handleRequestCode}
                  style={styles.resendBtn}
                >
                  <Text style={[styles.resendBtnText, { color: colors.orange }]}>
                    Resend Recovery Code
                  </Text>
                </Pressable>
              )}
            </View>
          ) : null}

          {/* Step 3: Choose New Password */}
          {step === 'set_new_password' ? (
            <View>
              <PasswordInput
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="At least 8 characters"
                disabled={loading}
                autoComplete="password-new"
                colors={colors}
              />

              <PasswordInput
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat new password"
                disabled={loading}
                autoComplete="password-new"
                colors={colors}
              />

              <PasswordRequirements
                password={newPassword}
                confirmPassword={confirmPassword}
                checkMatch={true}
                colors={colors}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Update account password"
                accessibilityState={{ disabled: !passwordEval.isStrong || !passwordsMatch || loading }}
                disabled={!passwordEval.isStrong || !passwordsMatch || loading}
                onPress={handleResetPassword}
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.orange },
                  (!passwordEval.isStrong || !passwordsMatch || loading) && { opacity: 0.5 }
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Update Password & Sign In</Text>
                )}
              </Pressable>
            </View>
          ) : null}

          {/* Step 4: Completed */}
          {step === 'completed' ? (
            <View style={styles.completedContainer}>
              <MaterialCommunityIcons name="check-decagram" size={48} color={colors.success} />
              <Text style={[styles.completedTitle, { color: colors.textPrimary }]}>
                Password Reset Successfully!
              </Text>
              <Text style={[styles.completedDesc, { color: colors.textSecondary }]}>
                You can now log in with your updated credentials.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Return to login screen"
                onPress={onBackToLogin}
                style={[styles.primaryButton, { backgroundColor: colors.orange, width: '100%' }]}
              >
                <Text style={styles.primaryButtonText}>Go to Login</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Alerts */}
          {errorMessage ? (
            <View style={[styles.alertBox, { backgroundColor: colors.errorBg, borderColor: colors.errorBorder }]}>
              <MaterialCommunityIcons name="alert-circle" size={18} color={colors.error} />
              <Text style={[styles.alertText, { color: colors.errorText }]}>{errorMessage}</Text>
            </View>
          ) : null}

          {noticeMessage ? (
            <View style={[styles.alertBox, { backgroundColor: colors.successBg, borderColor: colors.successBorder }]}>
              <MaterialCommunityIcons name="information" size={18} color={colors.success} />
              <Text style={[styles.alertText, { color: colors.successText }]}>{noticeMessage}</Text>
            </View>
          ) : null}
        </View>

        {/* Back Link */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to login"
          onPress={onBackToLogin}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={18} color={colors.primary} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>
            Back to Login
          </Text>
        </Pressable>
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
    marginBottom: authSpacing.lg
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: authSpacing.xs
  },
  input: {
    height: 52,
    borderRadius: authRadii.input,
    borderWidth: 1.5,
    paddingHorizontal: authSpacing.md,
    fontSize: 16,
    marginBottom: authSpacing.md
  },
  primaryButton: {
    height: 52,
    borderRadius: authRadii.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: authSpacing.sm,
    marginBottom: authSpacing.sm,
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
  resendHint: {
    fontSize: 13,
    textAlign: 'center',
    marginVertical: authSpacing.xs
  },
  resendBtn: {
    paddingVertical: 6,
    alignItems: 'center'
  },
  resendBtnText: {
    fontSize: 14,
    fontWeight: '700'
  },
  completedContainer: {
    alignItems: 'center',
    paddingVertical: authSpacing.md
  },
  completedTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: authSpacing.sm,
    marginBottom: 4
  },
  completedDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: authSpacing.lg
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: authSpacing.md,
    borderRadius: authRadii.sm,
    borderWidth: 1,
    marginTop: authSpacing.sm
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
