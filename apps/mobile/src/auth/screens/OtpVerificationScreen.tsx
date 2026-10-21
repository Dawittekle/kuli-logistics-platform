import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { OtpInput } from '../components/OtpInput';
import { formatPhoneForDisplay } from '../utils/phone-validator';
import { BrandHero } from '../components/BrandHero';
import { authLightColors, authRadii, authSpacing } from '../theme/auth-theme';

export interface OtpVerificationScreenProps {
  phone: string;
  onVerifyOtp: (code: string) => Promise<void>;
  onResendOtp: () => Promise<void>;
  onChangePhone: () => void;
  cooldownSeconds?: number;
  isDriver?: boolean;
  colors?: typeof authLightColors;
}

export type OtpErrorType = 'none' | 'incorrect' | 'expired' | 'network' | 'rate_limit';

export const OtpVerificationScreen: React.FC<OtpVerificationScreenProps> = ({
  phone,
  onVerifyOtp,
  onResendOtp,
  onChangePhone,
  cooldownSeconds = 60,
  isDriver = false,
  colors = authLightColors
}) => {
  const [code, setCode] = useState('');
  const [timer, setTimer] = useState(cooldownSeconds);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorType, setErrorType] = useState<OtpErrorType>('none');
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const canSubmit = code.length === 6 && !loading && !success;
  const canResend = timer === 0 && !resending && !loading;

  const handleVerify = async () => {
    if (!canSubmit) return;

    setErrorType('none');
    setErrorMessage('');
    setLoading(true);

    try {
      await onVerifyOtp(code);
      setSuccess(true);
    } catch (err: any) {
      const msg = String(err?.message ?? '').toLowerCase();
      if (msg.includes('expired') || msg.includes('timeout')) {
        setErrorType('expired');
        setErrorMessage('This verification code has expired. Please request a new code.');
      } else if (msg.includes('network') || msg.includes('connection') || msg.includes('offline') || msg.includes('fetch')) {
        setErrorType('network');
        setErrorMessage('Network connection failure. Please check your internet and retry.');
      } else if (msg.includes('rate') || msg.includes('too many') || msg.includes('limit')) {
        setErrorType('rate_limit');
        setErrorMessage('Too many verification attempts. Please wait a few moments before retrying.');
      } else {
        setErrorType('incorrect');
        setErrorMessage('Incorrect verification code. Please check your SMS message and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setErrorType('none');
    setErrorMessage('');
    setResending(true);

    try {
      await onResendOtp();
      setTimer(cooldownSeconds);
      setCode('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not resend SMS. Please check your network or try later.');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <BrandHero
        mode="otp"
        isDriver={isDriver}
        title="Verify Your Phone"
        subtitle={`We sent a 6-digit confirmation code to ${formatPhoneForDisplay(phone)}`}
        colors={colors}
      />

      <View style={styles.contentContainer}>
        {/* Verification Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Target Phone Badge */}
          <View style={[styles.phoneBadge, { backgroundColor: colors.surfaceSubtle }]}>
            <MaterialCommunityIcons name="cellphone-message" size={20} color={colors.primary} />
            <Text style={[styles.phoneText, { color: colors.textPrimary }]}>
              {formatPhoneForDisplay(phone)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change phone number"
              onPress={onChangePhone}
              style={styles.changePhoneBtn}
            >
              <Text style={[styles.changePhoneText, { color: colors.orange }]}>Edit</Text>
            </Pressable>
          </View>

          {/* 6-Digit OTP Input */}
          <OtpInput
            value={code}
            onChangeText={(newCode) => {
              setCode(newCode);
              if (errorType !== 'none') {
                setErrorType('none');
                setErrorMessage('');
              }
            }}
            disabled={loading || success}
            hasError={errorType !== 'none'}
            colors={colors}
          />

          {/* Status Banners */}
          {success ? (
            <View style={[styles.statusBanner, { backgroundColor: colors.successBg, borderColor: colors.successBorder }]}>
              <MaterialCommunityIcons name="check-circle" size={22} color={colors.success} />
              <View style={styles.statusTextContainer}>
                <Text style={[styles.statusTitle, { color: colors.successText }]}>
                  Phone Verified Successfully!
                </Text>
                <Text style={[styles.statusSub, { color: colors.successText }]}>
                  Activating your KULI account...
                </Text>
              </View>
            </View>
          ) : null}

          {errorType !== 'none' && errorMessage ? (
            <View style={[styles.statusBanner, { backgroundColor: colors.errorBg, borderColor: colors.errorBorder }]}>
              <MaterialCommunityIcons
                name={
                  errorType === 'expired'
                    ? 'clock-alert-outline'
                    : errorType === 'network'
                    ? 'wifi-alert'
                    : 'alert-circle'
                }
                size={22}
                color={colors.error}
              />
              <View style={styles.statusTextContainer}>
                <Text style={[styles.statusTitle, { color: colors.errorText }]}>
                  {errorType === 'expired'
                    ? 'Code Expired'
                    : errorType === 'network'
                    ? 'Connection Error'
                    : errorType === 'rate_limit'
                    ? 'Attempt Limit Reached'
                    : 'Incorrect Code'}
                </Text>
                <Text style={[styles.statusSub, { color: colors.errorText }]}>{errorMessage}</Text>
              </View>
            </View>
          ) : null}

          {/* Verify Action Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Verify 6-digit code"
            accessibilityState={{ disabled: !canSubmit }}
            disabled={!canSubmit}
            onPress={handleVerify}
            style={[
              styles.verifyButton,
              { backgroundColor: colors.orange },
              !canSubmit && { opacity: 0.5 }
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify Code & Activate</Text>
            )}
          </Pressable>

          {/* Resend Countdown & Action */}
          <View style={styles.resendContainer}>
            {timer > 0 ? (
              <View style={styles.timerRow}>
                <MaterialCommunityIcons name="timer-sand" size={16} color={colors.textMuted} />
                <Text style={[styles.timerText, { color: colors.textMuted }]}>
                  Resend code in <Text style={[styles.countdownBold, { color: colors.primary }]}>{timer}s</Text>
                </Text>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Resend verification code via SMS"
                disabled={!canResend}
                onPress={handleResend}
                style={styles.resendBtn}
              >
                {resending ? (
                  <ActivityIndicator size="small" color={colors.orange} />
                ) : (
                  <Text style={[styles.resendBtnText, { color: colors.orange }]}>
                    Resend SMS Code
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        </View>

        {/* Change Phone Option */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to edit registration details"
          onPress={onChangePhone}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={18} color={colors.primary} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>
            Change phone number or email
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
    marginBottom: authSpacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: authSpacing.sm,
    borderRadius: authRadii.pill,
    marginBottom: authSpacing.sm
  },
  phoneText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8
  },
  changePhoneBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  changePhoneText: {
    fontSize: 13,
    fontWeight: '700'
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: authSpacing.md,
    borderRadius: authRadii.sm,
    borderWidth: 1,
    marginBottom: authSpacing.md
  },
  statusTextContainer: {
    flex: 1,
    marginLeft: 8
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2
  },
  statusSub: {
    fontSize: 12,
    lineHeight: 16
  },
  verifyButton: {
    height: 52,
    borderRadius: authRadii.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: authSpacing.md,
    shadowColor: '#FFAD61',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  resendContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  timerText: {
    fontSize: 13,
    marginLeft: 6
  },
  countdownBold: {
    fontWeight: '700'
  },
  resendBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12
  },
  resendBtnText: {
    fontSize: 14,
    fontWeight: '700'
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
