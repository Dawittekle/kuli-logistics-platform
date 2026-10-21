import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { runtimeConfig } from '../config/runtime';
import { LoginScreen } from './screens/LoginScreen';
import { SignupScreen, SignupData } from './screens/SignupScreen';
import { OtpVerificationScreen } from './screens/OtpVerificationScreen';
import { ProfileCompletionScreen } from './screens/ProfileCompletionScreen';
import { PasswordRecoveryScreen } from './screens/PasswordRecoveryScreen';
import { authLightColors } from './theme/auth-theme';

export interface UserProfile {
  id: string;
  role: 'client' | 'truck_owner' | 'assistant' | 'admin';
  accountStatus: 'active' | 'pending_verification' | 'suspended' | 'banned' | 'deleted';
  fullName?: string;
  email?: string;
  phone?: string;
}

export interface AuthFlowContainerProps {
  initialNotice?: string;
  isDriver?: boolean;
  onAuthenticated: (profile: UserProfile, session: Session) => void;
  onPasswordRecoveryVerified?: (session: Session) => void;
  onProceedToVehicleVerification?: () => void;
  colors?: typeof authLightColors;
}

type AuthViewMode =
  | 'login'
  | 'signup'
  | 'otp_verify'
  | 'profile_complete'
  | 'forgot_password';

const DRAFT_STORAGE_KEY = 'kuli_mobile_registration_draft';
const ATTEMPT_LIMIT = 5;

export const AuthFlowContainer: React.FC<AuthFlowContainerProps> = ({
  initialNotice = '',
  isDriver = false,
  onAuthenticated,
  onPasswordRecoveryVerified,
  onProceedToVehicleVerification,
  colors = authLightColors
}) => {
  const [mode, setMode] = useState<AuthViewMode>('login');
  const [draft, setDraft] = useState<SignupData | null>(null);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
  const [notice, setNotice] = useState(initialNotice);
  const failedAttemptsRef = useRef(0);

  // Restore draft if user was interrupted during OTP verification
  useEffect(() => {
    async function loadSavedDraft() {
      try {
        const saved = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.phone) {
            setDraft(parsed);
          }
        }
      } catch {
        // Ignore storage errors
      }
    }
    loadSavedDraft();
  }, []);

  const saveDraft = async (data: SignupData) => {
    setDraft(data);
    try {
      await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore
    }
  };

  const clearDraft = async () => {
    setDraft(null);
    try {
      await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  // 1. Phone / Email Login
  const handleLoginWithPhone = async (fullPhone: string, password: string) => {
    // Supabase signIn with phone & password
    const { data, error } = await supabase.auth.signInWithPassword({
      phone: fullPhone,
      password
    });

    if (error) {
      // Fallback: If Supabase project is configured with email as primary identity,
      // allow fallback error message or check
      throw new Error(error.message);
    }

    if (!data.session) {
      throw new Error('Could not open session. Please verify your phone number first.');
    }

    await syncAndFinalizeAuth(data.session);
  };

  const handleLoginWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.session) {
      throw new Error('Please confirm your email address or check your inbox.');
    }

    await syncAndFinalizeAuth(data.session);
  };

  // 2. Signup & Phone OTP Dispatch
  const handleSignup = async (data: SignupData) => {
    await saveDraft(data);
    failedAttemptsRef.current = 0;

    // Use Supabase signUp with phone or email with phone metadata
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      phone: data.phone,
      options: {
        emailRedirectTo: runtimeConfig.authRedirectUrl,
        data: {
          full_name: data.fullName,
          phone: data.phone,
          role: data.role
        }
      }
    });

    if (error) {
      // If user already exists
      if (error.message.toLowerCase().includes('already registered')) {
        throw new Error('An account with this phone or email already exists. Please log in.');
      }
      throw new Error(error.message);
    }

    // Transition to OTP verification screen
    setMode('otp_verify');
  };

  // 3. OTP Verification
  const handleVerifyOtp = async (code: string) => {
    if (!draft) {
      throw new Error('Registration details not found. Please restart registration.');
    }

    // Rate-limit check
    if (failedAttemptsRef.current >= ATTEMPT_LIMIT) {
      throw new Error('Too many failed attempts. Please wait 60 seconds before trying again.');
    }

    // Verify OTP through Supabase
    let verifyResult = await supabase.auth.verifyOtp({
      phone: draft.phone,
      token: code,
      type: 'sms'
    });

    // Fallback: If phone OTP provider is not configured, try email verification
    if (verifyResult.error && draft.email) {
      const emailResult = await supabase.auth.verifyOtp({
        email: draft.email,
        token: code,
        type: 'signup'
      });
      if (!emailResult.error) {
        verifyResult = emailResult;
      }
    }

    if (verifyResult.error) {
      failedAttemptsRef.current += 1;
      throw new Error(verifyResult.error.message);
    }

    let nextSession = verifyResult.data.session;

    if (!nextSession && draft.password) {
      // Sign in with the credentials now that OTP is confirmed
      const signInResult = await supabase.auth.signInWithPassword({
        email: draft.email,
        password: draft.password
      });
      nextSession = signInResult.data.session;
    }

    if (!nextSession) {
      throw new Error('Verification succeeded. Please log in with your password to continue.');
    }

    // Sync profile to backend
    const profile = await syncBackendProfile(nextSession, draft);
    setActiveSession(nextSession);
    setActiveProfile(profile);
    await clearDraft();

    // Transition to Profile Completion screen
    setMode('profile_complete');
  };

  // 4. Resend OTP
  const handleResendOtp = async () => {
    if (!draft) {
      throw new Error('Registration draft missing.');
    }

    failedAttemptsRef.current = 0;

    const { error } = await supabase.auth.resend({
      type: 'sms',
      phone: draft.phone
    });

    if (error && draft.email) {
      await supabase.auth.resend({
        type: 'signup',
        email: draft.email
      });
    }
  };

  // 5. Backend Profile Sync
  const syncBackendProfile = async (session: Session, draftData?: SignupData): Promise<UserProfile> => {
    const payload = {
      role: draftData?.role || (session.user.user_metadata?.role as any) || 'client',
      fullName: draftData?.fullName || (session.user.user_metadata?.full_name as string) || '',
      email: draftData?.email || session.user.email || '',
      phone: draftData?.phone || (session.user.user_metadata?.phone as string) || session.user.phone || ''
    };

    try {
      const res = await fetch(`${runtimeConfig.apiBaseUrl}/auth/sync-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const body = await res.json();
        return body.data?.user || body.data;
      }
    } catch {
      // Fallback local representation if offline
    }

    return {
      id: session.user.id,
      role: payload.role,
      accountStatus: 'active',
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone
    };
  };

  const syncAndFinalizeAuth = async (session: Session) => {
    const profile = await syncBackendProfile(session);
    setActiveSession(session);
    setActiveProfile(profile);
    onAuthenticated(profile, session);
  };

  // 6. Password Recovery
  const handleRequestRecoveryCode = async (targetEmail: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: runtimeConfig.passwordResetRedirectUrl
    });
    if (error) throw new Error(error.message);
  };

  const handleVerifyRecoveryCode = async (targetEmail: string, recoveryCode: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email: targetEmail,
      token: recoveryCode,
      type: 'recovery'
    });
    if (error) throw new Error(error.message);
    if (data.session && onPasswordRecoveryVerified) {
      onPasswordRecoveryVerified(data.session);
    }
  };

  const handleResetPassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw new Error(error.message);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {mode === 'login' ? (
            <LoginScreen
              onLoginWithPhone={handleLoginWithPhone}
              onLoginWithEmail={handleLoginWithEmail}
              onNavigateToSignup={() => setMode('signup')}
              onNavigateToForgotPassword={() => setMode('forgot_password')}
              isDriver={isDriver}
              initialNotice={notice}
              colors={colors}
            />
          ) : mode === 'signup' ? (
            <SignupScreen
              onSignup={handleSignup}
              onNavigateToLogin={() => setMode('login')}
              defaultRole={isDriver ? 'truck_owner' : 'client'}
              colors={colors}
            />
          ) : mode === 'otp_verify' && draft ? (
            <OtpVerificationScreen
              phone={draft.phone}
              onVerifyOtp={handleVerifyOtp}
              onResendOtp={handleResendOtp}
              onChangePhone={() => setMode('signup')}
              isDriver={draft.role === 'truck_owner'}
              colors={colors}
            />
          ) : mode === 'profile_complete' && activeProfile && activeSession ? (
            <ProfileCompletionScreen
              role={activeProfile.role as 'client' | 'truck_owner'}
              fullName={activeProfile.fullName || 'User'}
              phone={activeProfile.phone || ''}
              email={activeProfile.email || ''}
              onCompleteCustomerOnboarding={() => {
                onAuthenticated(activeProfile, activeSession);
              }}
              onProceedToVehicleVerification={() => {
                if (onProceedToVehicleVerification) {
                  onProceedToVehicleVerification();
                } else {
                  onAuthenticated(activeProfile, activeSession);
                }
              }}
              colors={colors}
            />
          ) : mode === 'forgot_password' ? (
            <PasswordRecoveryScreen
              onRequestCode={handleRequestRecoveryCode}
              onVerifyCode={handleVerifyRecoveryCode}
              onResetPassword={handleResetPassword}
              onBackToLogin={() => setMode('login')}
              colors={colors}
            />
          ) : (
            <LoginScreen
              onLoginWithPhone={handleLoginWithPhone}
              onLoginWithEmail={handleLoginWithEmail}
              onNavigateToSignup={() => setMode('signup')}
              onNavigateToForgotPassword={() => setMode('forgot_password')}
              isDriver={isDriver}
              colors={colors}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  keyboardContainer: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1
  }
});
