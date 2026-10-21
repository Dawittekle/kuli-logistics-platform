import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CountryCode, defaultCountry } from '../data/country-codes';
import { PhoneInput } from '../components/PhoneInput';
import { PasswordInput } from '../components/PasswordInput';
import { BrandHero } from '../components/BrandHero';
import { authLightColors, authRadii, authSpacing } from '../theme/auth-theme';

export interface LoginScreenProps {
  onLoginWithPhone: (fullPhone: string, password: string) => Promise<void>;
  onLoginWithEmail: (email: string, password: string) => Promise<void>;
  onLoginWithGoogle?: () => Promise<void>;
  onNavigateToSignup: () => void;
  onNavigateToForgotPassword: () => void;
  isDriver?: boolean;
  initialNotice?: string;
  colors?: typeof authLightColors;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginWithPhone,
  onLoginWithEmail,
  onLoginWithGoogle,
  onNavigateToSignup,
  onNavigateToForgotPassword,
  isDriver = false,
  initialNotice = '',
  colors = authLightColors
}) => {
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(defaultCountry);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState(initialNotice);

  const isPhone = loginMethod === 'phone';

  const canSubmit = isPhone
    ? phoneDigits.trim().length >= 8 && password.length >= 1
    : email.trim().length >= 3 && password.length >= 1;

  const handleLogin = async () => {
    if (!canSubmit || loading) return;

    setErrorMessage('');
    setNoticeMessage('');
    setLoading(true);

    try {
      if (isPhone) {
        // Construct canonical phone
        let cleaned = phoneDigits.replace(/\D/g, '');
        while (cleaned.startsWith('0')) {
          cleaned = cleaned.slice(1);
        }
        const fullPhone = `${selectedCountry.dialCode}${cleaned}`;
        await onLoginWithPhone(fullPhone, password);
      } else {
        await onLoginWithEmail(email.trim().toLowerCase(), password);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!onLoginWithGoogle || googleLoading) return;
    setErrorMessage('');
    setGoogleLoading(true);
    try {
      await onLoginWithGoogle();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Google sign-in could not be completed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <BrandHero
        mode="login"
        isDriver={isDriver}
        title={isDriver ? 'Driver Partner Login' : 'Log In to KULI'}
        subtitle={
          isDriver
            ? 'Sign in to access your truck orders, route assignments, and payouts.'
            : 'Sign in to book household moves, furniture delivery, and bulky cargo.'
        }
        colors={colors}
      />

      <View style={styles.formContainer}>
        {/* Method Switcher: Phone vs Email */}
        <View style={[styles.methodSelector, { backgroundColor: colors.surfaceSubtle }]}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isPhone }}
            onPress={() => {
              setLoginMethod('phone');
              setErrorMessage('');
            }}
            style={[styles.methodTab, isPhone && [styles.methodTabActive, { backgroundColor: colors.surface }]]}
          >
            <MaterialCommunityIcons
              name="cellphone"
              size={18}
              color={isPhone ? colors.orange : colors.textMuted}
            />
            <Text style={[styles.methodTabText, { color: isPhone ? colors.textPrimary : colors.textMuted }]}>
              Mobile Number
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: !isPhone }}
            onPress={() => {
              setLoginMethod('email');
              setErrorMessage('');
            }}
            style={[styles.methodTab, !isPhone && [styles.methodTabActive, { backgroundColor: colors.surface }]]}
          >
            <MaterialCommunityIcons
              name="email-outline"
              size={18}
              color={!isPhone ? colors.orange : colors.textMuted}
            />
            <Text style={[styles.methodTabText, { color: !isPhone ? colors.textPrimary : colors.textMuted }]}>
              Email Address
            </Text>
          </Pressable>
        </View>

        {/* Input: Phone or Email */}
        {isPhone ? (
          <PhoneInput
            value={phoneDigits}
            onChangeText={setPhoneDigits}
            selectedCountry={selectedCountry}
            onSelectCountry={setSelectedCountry}
            disabled={loading}
            colors={colors}
          />
        ) : (
          <View style={styles.emailContainer}>
            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Email Address</Text>
            <TextInput
              accessibilityLabel="Email Address"
              style={[
                styles.emailInput,
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
              autoCorrect={false}
              editable={!loading}
              value={email}
              onChangeText={setEmail}
            />
          </View>
        )}

        {/* Password */}
        <PasswordInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your account password"
          disabled={loading}
          colors={colors}
        />

        {/* Forgot Password Link */}
        <View style={styles.forgotRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Forgot your password? Tap to recover."
            onPress={onNavigateToForgotPassword}
            style={styles.forgotButton}
          >
            <Text style={[styles.forgotText, { color: colors.orange }]}>Forgot password?</Text>
          </Pressable>
        </View>

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

        {/* Primary Action Button: Log In (Lalamove Vibrant Orange) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log in to your account"
          accessibilityState={{ disabled: !canSubmit || loading }}
          disabled={!canSubmit || loading}
          onPress={handleLogin}
          style={[
            styles.primaryButton,
            { backgroundColor: colors.orange },
            (!canSubmit || loading) && { opacity: 0.5 }
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Log in</Text>
          )}
        </Pressable>

        {/* Secondary Action Button: Register (Lalamove Outline Style) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Register new account"
          disabled={loading}
          onPress={onNavigateToSignup}
          style={[styles.secondaryButton, { borderColor: colors.orange, backgroundColor: colors.surface }]}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.orange }]}>
            {isDriver ? 'Register as Driver' : 'Register / Create Account'}
          </Text>
        </Pressable>

        {/* Social Login Divider */}
        {onLoginWithGoogle ? (
          <>
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>or continue with</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              disabled={loading || googleLoading}
              onPress={handleGoogleSignIn}
              style={[styles.socialButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              {googleLoading ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="google" size={20} color="#EA4335" style={styles.socialIcon} />
                  <Text style={[styles.socialButtonText, { color: colors.textPrimary }]}>
                    Continue with Google
                  </Text>
                </>
              )}
            </Pressable>
          </>
        ) : null}

        {/* Footer Legal Terms */}
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            By continuing, you agree to KULI's{' '}
          </Text>
          <View style={styles.legalLinks}>
            <Text style={[styles.legalLink, { color: colors.primary }]}>Terms & Conditions</Text>
            <Text style={[styles.footerText, { color: colors.textMuted }]}> • </Text>
            <Text style={[styles.legalLink, { color: colors.primary }]}>Privacy Policy</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  formContainer: {
    paddingHorizontal: authSpacing.md,
    paddingBottom: authSpacing.xxl
  },
  methodSelector: {
    flexDirection: 'row',
    borderRadius: authRadii.pill,
    padding: 3,
    marginBottom: authSpacing.md
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: authRadii.pill
  },
  methodTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  methodTabText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6
  },
  emailContainer: {
    marginBottom: authSpacing.md
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: authSpacing.xs
  },
  emailInput: {
    height: 52,
    borderRadius: authRadii.input,
    borderWidth: 1.5,
    paddingHorizontal: authSpacing.md,
    fontSize: 16
  },
  forgotRow: {
    alignItems: 'flex-start',
    marginBottom: authSpacing.md
  },
  forgotButton: {
    minHeight: 36,
    justifyContent: 'center'
  },
  forgotText: {
    fontSize: 14,
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
  primaryButton: {
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
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  secondaryButton: {
    height: 52,
    borderRadius: authRadii.button,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: authSpacing.lg
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700'
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: authSpacing.md
  },
  dividerLine: {
    flex: 1,
    height: 1
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '500',
    marginHorizontal: authSpacing.md,
    textTransform: 'uppercase'
  },
  socialButton: {
    flexDirection: 'row',
    height: 50,
    borderRadius: authRadii.button,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: authSpacing.xl
  },
  socialIcon: {
    marginRight: 8
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '600'
  },
  footerRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: authSpacing.sm
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center'
  },
  legalLinks: {
    flexDirection: 'row',
    marginTop: 2
  },
  legalLink: {
    fontSize: 12,
    fontWeight: '600'
  }
});
