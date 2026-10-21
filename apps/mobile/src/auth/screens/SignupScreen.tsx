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
import { PasswordRequirements, evaluatePassword } from '../components/PasswordRequirements';
import { validatePhone } from '../utils/phone-validator';
import { BrandHero } from '../components/BrandHero';
import { authLightColors, authRadii, authSpacing } from '../theme/auth-theme';

export interface SignupData {
  role: 'client' | 'truck_owner';
  fullName: string;
  phone: string;
  email: string;
  password: string;
}

export interface SignupScreenProps {
  onSignup: (data: SignupData) => Promise<void>;
  onNavigateToLogin: () => void;
  defaultRole?: 'client' | 'truck_owner';
  colors?: typeof authLightColors;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({
  onSignup,
  onNavigateToLogin,
  defaultRole = 'client',
  colors = authLightColors
}) => {
  const [role, setRole] = useState<'client' | 'truck_owner'>(defaultRole);
  const [fullName, setFullName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(defaultCountry);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const phoneValidation = validatePhone(phoneDigits, selectedCountry.dialCode);
  const passwordEval = evaluatePassword(password);
  const passwordsMatch = Boolean(password && confirmPassword && password === confirmPassword);
  const isValidEmail = Boolean(email.trim().includes('@') && email.trim().includes('.'));

  const canSubmit =
    Boolean(fullName.trim()) &&
    phoneValidation.valid &&
    isValidEmail &&
    passwordEval.isStrong &&
    passwordsMatch &&
    agreedToTerms;

  const handleSignup = async () => {
    if (!canSubmit || loading) return;

    setErrorMessage('');
    setLoading(true);

    try {
      await onSignup({
        role,
        fullName: fullName.trim(),
        phone: phoneValidation.normalized,
        email: email.trim().toLowerCase(),
        password
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Registration failed. Please check your information and retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <BrandHero
        mode="signup"
        isDriver={role === 'truck_owner'}
        title={role === 'truck_owner' ? 'Register as a Truck Driver' : 'Create Customer Account'}
        subtitle={
          role === 'truck_owner'
            ? 'Monetize your truck with guaranteed logistics jobs across Addis Ababa.'
            : 'Access vetted trucks, upfront pricing, and seamless household moves.'
        }
        colors={colors}
      />

      <View style={styles.formContainer}>
        {/* Role Selection Cards */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Choose Account Type</Text>
        <View style={styles.roleGrid}>
          {/* Customer Option */}
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: role === 'client' }}
            onPress={() => setRole('client')}
            style={[
              styles.roleCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              role === 'client' && [styles.roleCardSelected, { borderColor: colors.orange, backgroundColor: colors.orangeSubtle }]
            ]}
          >
            <View style={styles.roleHeader}>
              <MaterialCommunityIcons
                name="account-arrow-right"
                size={24}
                color={role === 'client' ? colors.orange : colors.textMuted}
              />
              {role === 'client' ? (
                <MaterialCommunityIcons name="check-circle" size={18} color={colors.orange} />
              ) : null}
            </View>
            <Text style={[styles.roleTitle, { color: colors.textPrimary }]}>Customer / Shipper</Text>
            <Text style={[styles.roleDesc, { color: colors.textSecondary }]}>
              Book trucks for home moves, furniture, commercial freight.
            </Text>
          </Pressable>

          {/* Truck Owner / Driver Option */}
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: role === 'truck_owner' }}
            onPress={() => setRole('truck_owner')}
            style={[
              styles.roleCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              role === 'truck_owner' && [styles.roleCardSelected, { borderColor: colors.primary, backgroundColor: colors.surfaceSubtle }]
            ]}
          >
            <View style={styles.roleHeader}>
              <MaterialCommunityIcons
                name="truck-cargo-container"
                size={24}
                color={role === 'truck_owner' ? colors.primary : colors.textMuted}
              />
              {role === 'truck_owner' ? (
                <MaterialCommunityIcons name="check-circle" size={18} color={colors.primary} />
              ) : null}
            </View>
            <Text style={[styles.roleTitle, { color: colors.textPrimary }]}>Truck Owner / Driver</Text>
            <Text style={[styles.roleDesc, { color: colors.textSecondary }]}>
              Register your truck, accept high-paying trips, earn daily cash.
            </Text>
          </Pressable>
        </View>

        {/* Full Name */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Full Legal Name</Text>
          <TextInput
            accessibilityLabel="Full Legal Name"
            style={[
              styles.textInput,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.textPrimary
              }
            ]}
            placeholder="e.g. Abebe Bekele"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            editable={!loading}
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        {/* Mandatory Phone Input with Searchable Country Code */}
        <PhoneInput
          label="Mobile Phone (Mandatory for SMS OTP)"
          value={phoneDigits}
          onChangeText={setPhoneDigits}
          selectedCountry={selectedCountry}
          onSelectCountry={setSelectedCountry}
          disabled={loading}
          colors={colors}
        />

        {/* Email Address */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Email Address</Text>
          <TextInput
            accessibilityLabel="Email Address"
            style={[
              styles.textInput,
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
        </View>

        {/* Password */}
        <PasswordInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Create a strong password"
          disabled={loading}
          autoComplete="password-new"
          colors={colors}
        />

        {/* Confirm Password */}
        <PasswordInput
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repeat your password"
          disabled={loading}
          autoComplete="password-new"
          colors={colors}
        />

        {/* Live Security Requirements Checklist */}
        <PasswordRequirements
          password={password}
          confirmPassword={confirmPassword}
          checkMatch={true}
          colors={colors}
        />

        {/* Terms and Privacy Checkbox */}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreedToTerms }}
          onPress={() => setAgreedToTerms(!agreedToTerms)}
          style={styles.termsRow}
        >
          <MaterialCommunityIcons
            name={agreedToTerms ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={22}
            color={agreedToTerms ? colors.orange : colors.textMuted}
            style={styles.termsCheckbox}
          />
          <Text style={[styles.termsText, { color: colors.textPrimary }]}>
            I agree to the <Text style={[styles.termsLink, { color: colors.primary }]}>Terms of Service</Text> and{' '}
            <Text style={[styles.termsLink, { color: colors.primary }]}>Privacy Policy</Text>.
          </Text>
        </Pressable>

        {/* Error Alert */}
        {errorMessage ? (
          <View style={[styles.alertBox, { backgroundColor: colors.errorBg, borderColor: colors.errorBorder }]}>
            <MaterialCommunityIcons name="alert-circle" size={18} color={colors.error} />
            <Text style={[styles.alertText, { color: colors.errorText }]}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Submit Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create your KULI account"
          accessibilityState={{ disabled: !canSubmit || loading }}
          disabled={!canSubmit || loading}
          onPress={handleSignup}
          style={[
            styles.submitButton,
            { backgroundColor: colors.orange },
            (!canSubmit || loading) && { opacity: 0.5 }
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>
              {role === 'truck_owner' ? 'Continue to Vehicle Setup' : 'Create Customer Account'}
            </Text>
          )}
        </Pressable>

        {/* Back to Login Link */}
        <View style={styles.loginRow}>
          <Text style={[styles.loginPrompt, { color: colors.textSecondary }]}>
            Already have an account?{' '}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in to existing account"
            onPress={onNavigateToLogin}
          >
            <Text style={[styles.loginLink, { color: colors.orange }]}>Log in</Text>
          </Pressable>
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: authSpacing.sm
  },
  roleGrid: {
    flexDirection: 'row',
    gap: authSpacing.sm,
    marginBottom: authSpacing.md
  },
  roleCard: {
    flex: 1,
    padding: authSpacing.md,
    borderRadius: authRadii.card,
    borderWidth: 1.5
  },
  roleCardSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: authSpacing.xs
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4
  },
  roleDesc: {
    fontSize: 11,
    lineHeight: 15
  },
  inputGroup: {
    marginBottom: authSpacing.md
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: authSpacing.xs
  },
  textInput: {
    height: 52,
    borderRadius: authRadii.input,
    borderWidth: 1.5,
    paddingHorizontal: authSpacing.md,
    fontSize: 16
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: authSpacing.md
  },
  termsCheckbox: {
    marginRight: authSpacing.sm,
    marginTop: 1
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18
  },
  termsLink: {
    fontWeight: '600',
    textDecorationLine: 'underline'
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
  submitButton: {
    height: 52,
    borderRadius: authRadii.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: authSpacing.lg,
    shadowColor: '#FFAD61',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loginPrompt: {
    fontSize: 14
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700'
  }
});
