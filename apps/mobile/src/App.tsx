import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';

import { clearDemoAccessToken, kuliApi, setDemoAccessToken } from './lib/api';
import { supabase } from './lib/supabase';
import { runtimeConfig, runtimeReadiness } from './config/runtime';
import { colors, radii, spacing } from './theme';

type Role = 'client' | 'truck_owner' | 'assistant' | 'admin';
type AccountStatus = 'active' | 'pending_verification' | 'suspended' | 'banned' | 'deleted';
type AuthMode = 'login' | 'register';
type PublicRole = Extract<Role, 'client' | 'truck_owner'>;
type VerificationDraft = {
  email: string;
  role: PublicRole;
  fullName: string;
  phone: string;
};

type UserProfile = {
  id: string;
  role: Role;
  accountStatus: AccountStatus;
  fullName?: string;
  email?: string;
  phone?: string;
};

type ApiEnvelope<T> = {
  data: T;
};

type ProfileSyncResult = {
  user: UserProfile;
  created: boolean;
};

type VehicleClass = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  capacityKg?: number;
  capacityCubicMeters?: number;
};

type QuoteLocation = {
  addressText: string;
  point: {
    type: 'Point';
    coordinates: [number, number];
  };
  source: 'manual_pin';
};

type QuoteCandidate = {
  vehicleId: string;
  ownerId: string;
  vehicleClassSnapshot?: {
    name: string;
    slug: string;
  };
  licensePlate: string;
  distanceKm: number;
  rating: number;
  rankingScore: number;
};

type QuoteInput = {
  pickupLocation: QuoteLocation;
  destinationLocation: QuoteLocation;
  requestedVehicleClassId: string;
  requestedPickupTime?: string;
  loadDetails: {
    itemType: string;
    estimatedWeightKg: number;
    estimatedVolumeCubicMeters: number;
    loadingAssistanceRequested: boolean;
    specialHandlingInstructions?: string;
  };
  tip: number;
};

type QuoteResult = {
  quoteId: string;
  route: {
    distanceKm: number;
    etaMinutes: number;
  };
  requestedVehicleClass: {
    id: string;
    slug?: string;
    name: string;
  };
  quoteSnapshot: {
    pricingRuleVersion: number;
    currency: string;
    baseFare: number;
    distanceCharge: number;
    durationCharge: number;
    loadAdjustment: number;
    fuelSurcharge: number;
    tip: number;
    minimumFare: number;
    totalEstimate: number;
  };
  search: {
    radiusKmUsed: number;
    expanded: boolean;
    noResults: boolean;
  };
  candidates: QuoteCandidate[];
};

type TripOffer = {
  id: string;
  requestId: string;
  ownerId: string;
  vehicleId: string;
  status: 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  distanceKmAtOffer?: number;
  etaMinutesAtOffer?: number;
  expiresAt?: string;
  declineReason?: string;
};

type KuliRequest = {
  id: string;
  requestCode: string;
  clientId: string;
  status: 'pending' | 'accepted' | 'en_route_to_pickup' | 'arrived_at_pickup' | 'loading' | 'in_transit' | 'unloading' | 'completed' | 'cancelled' | 'timed_out';
  pickupLocation: QuoteLocation;
  destinationLocation: QuoteLocation;
  requestedPickupTime?: string;
  loadDetails?: QuoteInput['loadDetails'];
  requestedVehicleClassId?: string;
  quoteSnapshot?: QuoteResult['quoteSnapshot'];
  selectedOwnerId?: string;
  selectedVehicleId?: string;
  acceptedOfferId?: string;
  offers?: TripOffer[];
};

type KuliStatus = KuliRequest['status'];

type StatusEvent = {
  id: string;
  requestId: string;
  fromStatus?: KuliStatus;
  toStatus: KuliStatus;
  actorUserId?: string;
  actorRole?: Role | 'system';
  reason?: string;
  createdAt?: string;
};

type TripMessage = {
  id: string;
  requestId: string;
  senderId: string;
  senderRole: Role;
  body: string;
  clientGeneratedId?: string;
  createdAt?: string;
};

type NotificationRecord = {
  id: string;
  type: string;
  title: string;
  body: string;
  deliveryStatus: 'pending' | 'sent' | 'read' | 'failed';
  data?: {
    requestId?: string;
    [key: string]: unknown;
  };
  createdAt?: string;
};

type RatingRecord = {
  id: string;
  requestId: string;
  raterId: string;
  targetOwnerId: string;
  rating: number;
  reviewText?: string;
  createdAt?: string;
};

type PaymentRecord = {
  id: string;
  requestId: string;
  status: 'pending' | 'confirmed_by_owner' | 'disputed' | 'resolved' | 'cancelled';
  currency: string;
  amountExpected: number;
  amountConfirmed?: number;
  disputeReason?: string;
};

type ReportRecord = {
  id: string;
  reportCode: string;
  requestId?: string;
  category: string;
  description: string;
  evidenceFileIds?: string[];
  status: 'open' | 'under_review' | 'awaiting_response' | 'resolved' | 'rejected';
};

type RequestCreateResult = {
  request: KuliRequest;
  offers: TripOffer[];
  waitingState?: {
    status: string;
    offerCount: number;
    expiresAt: string;
  };
  idempotentReplay?: boolean;
};

type OfferActionResult = {
  request: KuliRequest;
  offer: TripOffer;
  idempotentReplay?: boolean;
};

type VehicleDocument = {
  id: string;
  type: VehicleDocumentType;
  fileId: string;
  status: string;
};

type Vehicle = {
  id: string;
  licensePlate: string;
  vehicleClassId: string;
  vehicleClassSnapshot?: {
    name: string;
    slug: string;
  };
  capacityKg?: number;
  capacityCubicMeters?: number;
  description?: string;
  verificationStatus: 'draft' | 'pending' | 'approved' | 'rejected';
  availabilityStatus: 'offline' | 'online_available' | 'busy_on_job' | 'under_maintenance' | 'suspended';
  rejectionReason?: string;
  documents?: VehicleDocument[];
};

type VehicleDocumentType = 'identity' | 'driver_license' | 'vehicle_registration' | 'ownership_proof' | 'insurance';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000
    }
  }
});

const Tab = createBottomTabNavigator();

const roleLabels: Record<Role, string> = {
  client: 'Client',
  truck_owner: 'Truck owner',
  assistant: 'Assistant',
  admin: 'Admin'
};

const isBlockedStatus = (status: AccountStatus) => ['suspended', 'banned', 'deleted'].includes(status);

const documentTypes: Array<{ type: VehicleDocumentType; label: string; detail: string }> = [
  { type: 'identity', label: 'Identity', detail: 'Owner identification document.' },
  { type: 'driver_license', label: 'Driver license', detail: 'Valid license for the driver/owner.' },
  { type: 'vehicle_registration', label: 'Registration certificate', detail: 'Vehicle registration document.' },
  { type: 'ownership_proof', label: 'Ownership proof', detail: 'Proof that the owner can operate this truck.' },
  { type: 'insurance', label: 'Insurance', detail: 'Insurance where available.' }
];

const statusTone = (status: string): 'ready' | 'warn' | 'blocked' => {
  if (['accepted', 'approved', 'completed', 'online_available', 'active'].includes(status)) {
    return 'ready';
  }

  if (['declined', 'expired', 'rejected', 'suspended', 'cancelled', 'timed_out', 'banned', 'deleted'].includes(status)) {
    return 'blocked';
  }

  return 'warn';
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
};

const isEmailNotConfirmedError = (error: unknown) =>
  error instanceof Error && error.message.toLowerCase().includes('email not confirmed');

const createDemoSession = ({ accessToken, email }: { accessToken: string; email?: string }) =>
  ({
    access_token: accessToken,
    refresh_token: 'local-demo-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: accessToken.replace(/^dev:/, ''),
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email
    }
  }) as Session;

function StatusPill({ tone, children }: { tone: 'ready' | 'warn' | 'blocked'; children: string }) {
  return (
    <View style={[styles.pill, tone === 'ready' && styles.pillReady, tone === 'warn' && styles.pillWarn, tone === 'blocked' && styles.pillBlocked]}>
      <Text style={styles.pillText}>{children}</Text>
    </View>
  );
}

function ShellCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function HealthCard() {
  const [state, setState] = useState<'idle' | 'checking' | 'ready' | 'blocked'>('idle');
  const [message, setMessage] = useState(runtimeConfig.apiBaseUrl);

  const checkHealth = async () => {
    setState('checking');

    try {
      await kuliApi.health();
      setState('ready');
      setMessage('Backend health check succeeded.');
    } catch (error) {
      setState('blocked');
      setMessage(getErrorMessage(error));
    }
  };

  return (
    <ShellCard title="API connection">
      <View style={styles.cardHeader}>
        <Text style={styles.muted}>{message}</Text>
        <StatusPill tone={state === 'ready' ? 'ready' : state === 'blocked' ? 'blocked' : 'warn'}>
          {state === 'ready' ? 'Ready' : state === 'blocked' ? 'Check API' : state === 'checking' ? 'Checking' : 'Idle'}
        </StatusPill>
      </View>
      <Pressable accessibilityRole="button" onPress={checkHealth} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Check health</Text>
      </Pressable>
    </ShellCard>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  containerStyle
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric' | 'decimal-pad';
  containerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.field, containerStyle]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#829197"
        secureTextEntry={secureTextEntry}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function RoleOption({
  role,
  selected,
  onPress
}: {
  role: PublicRole;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.roleOption, selected && styles.roleOptionSelected]}>
      <Text style={[styles.roleOptionTitle, selected && styles.roleOptionTitleSelected]}>{roleLabels[role]}</Text>
      <Text style={[styles.roleOptionText, selected && styles.roleOptionTextSelected]}>
        {role === 'client' ? 'Book verified trucks and follow your move.' : 'Register vehicles and receive verified requests.'}
      </Text>
    </Pressable>
  );
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (profile: UserProfile, session: Session) => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [role, setRole] = useState<PublicRole>('client');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [verificationDraft, setVerificationDraft] = useState<VerificationDraft | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const canSubmit = runtimeConfig.demoAuthEnabled
    ? Boolean(email.trim()) && (mode === 'login' || Boolean(fullName.trim()))
    : Boolean(email.trim()) && password.length >= 6 && (mode === 'login' || Boolean(fullName.trim()));

  const loadProfile = async (session: Session) => {
    const profile = (await kuliApi.me()) as ApiEnvelope<UserProfile>;
    onAuthenticated(profile.data, session);
  };

  const startDemoProfile = async (demoRole: PublicRole) => {
    if (!runtimeConfig.demoAuthEnabled || pending) {
      return;
    }

    setPending(true);
    setError('');
    setNotice('');

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const suffix = normalizedEmail
        ? normalizedEmail.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 42)
        : Date.now().toString(36);
      const result = (await kuliApi.request('/dev/demo-profile', {
        method: 'POST',
        body: {
          role: demoRole,
          suffix,
          fullName: fullName.trim() || (demoRole === 'client' ? `Demo Client ${suffix}` : `Demo Owner ${suffix}`),
          email: normalizedEmail || `${demoRole}-${suffix}@demo.kuli.local`,
          phone: phone.trim() || undefined
        }
      })) as ApiEnvelope<{ user: UserProfile; accessToken: string }>;

      setDemoAccessToken(result.data.accessToken);
      onAuthenticated(result.data.user, createDemoSession({
        accessToken: result.data.accessToken,
        email: result.data.user.email
      }));
    } catch (demoError) {
      setError(getErrorMessage(demoError));
    } finally {
      setPending(false);
    }
  };

  const resendConfirmation = async (targetEmail = verificationDraft?.email) => {
    if (!targetEmail || verificationPending) {
      return;
    }

    setVerificationPending(true);
    setError('');
    setNotice('');

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail
      });

      if (resendError) {
        throw resendError;
      }

      setNotice('Confirmation sent. Check your email for a code or confirmation link.');
    } catch (resendError) {
      setError(getErrorMessage(resendError));
    } finally {
      setVerificationPending(false);
    }
  };

  const verifyEmailCode = async () => {
    if (!verificationDraft || !verificationCode.trim() || verificationPending) {
      return;
    }

    setVerificationPending(true);
    setError('');
    setNotice('');

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: verificationDraft.email,
        token: verificationCode.trim(),
        type: 'signup'
      });

      if (verifyError) {
        throw verifyError;
      }

      if (!data.session) {
        setNotice('Email confirmed. Sign in with your password to continue.');
        setVerificationDraft(null);
        setVerificationCode('');
        setMode('login');
        return;
      }

      if (verificationDraft.fullName) {
        const result = (await kuliApi.syncProfile({
          role: verificationDraft.role,
          fullName: verificationDraft.fullName,
          phone: verificationDraft.phone || undefined,
          email: verificationDraft.email
        })) as ApiEnvelope<ProfileSyncResult>;

        onAuthenticated(result.data.user, data.session);
        return;
      }

      await loadProfile(data.session);
    } catch (verifyError) {
      setError(getErrorMessage(verifyError));
    } finally {
      setVerificationPending(false);
    }
  };

  const submit = async () => {
    if (!canSubmit || pending) {
      return;
    }

    if (runtimeConfig.demoAuthEnabled) {
      await startDemoProfile(mode === 'register' ? role : 'client');
      return;
    }

    setPending(true);
    setError('');
    setNotice('');

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (verificationDraft && verificationDraft.email !== normalizedEmail) {
        setVerificationDraft(null);
        setVerificationCode('');
      }

      if (mode === 'login') {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password
        });

        if (authError) {
          throw authError;
        }

        if (!data.session) {
          setNotice('Check your email to finish sign in.');
          return;
        }

        await loadProfile(data.session);
        return;
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone,
            role
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (!data.session) {
        setVerificationDraft({
          email: normalizedEmail,
          role,
          fullName: fullName.trim(),
          phone: phone.trim()
        });
        setVerificationCode('');
        setNotice('Account created. Check your email for a confirmation code or link, then finish verification here.');
        setMode('login');
        return;
      }

      const result = (await kuliApi.syncProfile({
        role,
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        email: normalizedEmail
      })) as ApiEnvelope<ProfileSyncResult>;

      onAuthenticated(result.data.user, data.session);
    } catch (submitError) {
      if (mode === 'login' && isEmailNotConfirmedError(submitError)) {
        const normalizedEmail = email.trim().toLowerCase();
        setVerificationDraft({
          email: normalizedEmail,
          role,
          fullName: fullName.trim(),
          phone: phone.trim()
        });
        setVerificationCode('');
        setError('');
        setNotice('Email not confirmed. Use the code or link already sent to your email, or press Resend after the rate-limit window clears.');
        return;
      }

      setError(getErrorMessage(submitError));
    } finally {
      setPending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>KULI mobile</Text>
          <Text style={styles.title}>{mode === 'login' ? 'Sign in to your route.' : 'Create your logistics profile.'}</Text>
          <Text style={styles.copy}>
            Public registration is only for clients and truck owners. Staff accounts are provisioned by an admin and must use the web dashboard.
          </Text>

          <View style={styles.segmented}>
            <Pressable accessibilityRole="button" onPress={() => setMode('login')} style={[styles.segmentButton, mode === 'login' && styles.segmentButtonActive]}>
              <Text style={[styles.segmentText, mode === 'login' && styles.segmentTextActive]}>Login</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setMode('register')} style={[styles.segmentButton, mode === 'register' && styles.segmentButtonActive]}>
              <Text style={[styles.segmentText, mode === 'register' && styles.segmentTextActive]}>Register</Text>
            </Pressable>
          </View>

          {mode === 'register' ? (
            <View style={styles.roleGrid}>
              <RoleOption role="client" selected={role === 'client'} onPress={() => setRole('client')} />
              <RoleOption role="truck_owner" selected={role === 'truck_owner'} onPress={() => setRole('truck_owner')} />
            </View>
          ) : null}

          <ShellCard title={mode === 'login' ? 'Account credentials' : 'Public account details'}>
            {mode === 'register' ? <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Abebe Bekele" /> : null}
            <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
            {mode === 'register' ? <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="+251911000000" keyboardType="phone-pad" /> : null}
            <Field label="Password" value={password} onChangeText={setPassword} placeholder="Minimum 6 characters" secureTextEntry />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
            <Pressable
              accessibilityRole="button"
              disabled={!canSubmit || pending}
              onPress={submit}
              style={[styles.primaryButton, (!canSubmit || pending) && styles.buttonDisabled]}
            >
              <Text style={styles.primaryButtonText}>{pending ? 'Working...' : mode === 'login' ? 'Login' : 'Create account'}</Text>
            </Pressable>
          </ShellCard>

          {verificationDraft ? (
            <ShellCard title="Confirm email">
              <Text style={styles.muted}>{verificationDraft.email}</Text>
              <Text style={styles.copy}>Enter the confirmation code from your email. If Supabase sent a link instead, open that link, then return and sign in.</Text>
              <Field label="Confirmation code" value={verificationCode} onChangeText={setVerificationCode} placeholder="6-digit code" keyboardType="numeric" />
              <View style={styles.actionRow}>
                <Pressable
                  accessibilityRole="button"
                  disabled={!verificationCode.trim() || verificationPending}
                  onPress={verifyEmailCode}
                  style={[styles.primaryButton, styles.actionButton, (!verificationCode.trim() || verificationPending) && styles.buttonDisabled]}
                >
                  <Text style={styles.primaryButtonText}>{verificationPending ? 'Checking...' : 'Verify'}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={verificationPending}
                  onPress={() => resendConfirmation()}
                  style={[styles.secondaryButton, styles.actionButton, verificationPending && styles.buttonDisabled]}
                >
                  <Text style={styles.secondaryButtonText}>Resend</Text>
                </Pressable>
              </View>
            </ShellCard>
          ) : null}

          {runtimeConfig.demoAuthEnabled ? (
            <ShellCard title="Local demo access">
              <Text style={styles.copy}>Explore KULI without Supabase email verification. Demo profiles use local dev tokens and are only for this development environment.</Text>
              <View style={styles.actionRow}>
                <Pressable accessibilityRole="button" disabled={pending} onPress={() => startDemoProfile('client')} style={[styles.secondaryButton, styles.actionButton, pending && styles.buttonDisabled]}>
                  <Text style={styles.secondaryButtonText}>Demo client</Text>
                </Pressable>
                <Pressable accessibilityRole="button" disabled={pending} onPress={() => startDemoProfile('truck_owner')} style={[styles.primaryButton, styles.actionButton, pending && styles.buttonDisabled]}>
                  <Text style={styles.primaryButtonText}>Demo owner</Text>
                </Pressable>
              </View>
            </ShellCard>
          ) : null}

          <HealthCard />
          <RuntimeReadiness />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SessionLoadingScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.cardTitle}>Checking your KULI session</Text>
        <Text style={styles.muted}>Supabase session first, backend profile second.</Text>
      </View>
    </SafeAreaView>
  );
}

function ForbiddenScreen({ profile, onSignOut }: { profile: UserProfile; onSignOut: () => void }) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Role mismatch</Text>
        <Text style={styles.title}>Use the right workspace.</Text>
        <ShellCard title="Mobile access blocked">
          <Text style={styles.copy}>
            {roleLabels[profile.role]} accounts are not mobile marketplace accounts. Use the admin web dashboard for staff workflows.
          </Text>
          <Pressable accessibilityRole="button" onPress={onSignOut} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Sign out</Text>
          </Pressable>
        </ShellCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function AccountBlockedScreen({ profile, onSignOut }: { profile: UserProfile; onSignOut: () => void }) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Account status</Text>
        <Text style={styles.title}>Your account needs support.</Text>
        <ShellCard title="Commands are blocked">
          <View style={styles.cardHeader}>
            <Text style={styles.copy}>{profile.fullName || profile.email}</Text>
            <StatusPill tone="blocked">{profile.accountStatus}</StatusPill>
          </View>
          <Text style={styles.muted}>Authentication can succeed, but KULI blocks business actions for suspended, banned, or deleted accounts.</Text>
          <Pressable accessibilityRole="button" onPress={onSignOut} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Sign out</Text>
          </Pressable>
        </ShellCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileRequiredScreen({ session, onAuthenticated, onSignOut }: { session: Session; onAuthenticated: (profile: UserProfile, session: Session) => void; onSignOut: () => void }) {
  const [role, setRole] = useState<PublicRole>('client');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const email = session.user.email ?? '';

  const submit = async () => {
    if (!fullName.trim() || pending) {
      return;
    }

    setPending(true);
    setError('');

    try {
      const result = (await kuliApi.syncProfile({
        role,
        fullName: fullName.trim(),
        email,
        phone: phone.trim() || undefined
      })) as ApiEnvelope<ProfileSyncResult>;

      onAuthenticated(result.data.user, session);
    } catch (syncError) {
      setError(getErrorMessage(syncError));
    } finally {
      setPending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Profile required</Text>
        <Text style={styles.title}>Finish your public profile.</Text>
        <Text style={styles.copy}>Supabase authenticated you, but KULI still needs a MongoDB application profile before routing.</Text>
        <View style={styles.roleGrid}>
          <RoleOption role="client" selected={role === 'client'} onPress={() => setRole('client')} />
          <RoleOption role="truck_owner" selected={role === 'truck_owner'} onPress={() => setRole('truck_owner')} />
        </View>
        <ShellCard title="Profile details">
          <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Abebe Bekele" />
          <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="+251911000000" keyboardType="phone-pad" />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable accessibilityRole="button" disabled={!fullName.trim() || pending} onPress={submit} style={[styles.primaryButton, (!fullName.trim() || pending) && styles.buttonDisabled]}>
            <Text style={styles.primaryButtonText}>{pending ? 'Saving...' : 'Create profile'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onSignOut} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Sign out</Text>
          </Pressable>
        </ShellCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function HomeOverview({ profile, onSignOut }: { profile: UserProfile; onSignOut: () => void }) {
  const isClient = profile.role === 'client';

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.cardHeader}>
          <View style={styles.flex}>
            <Text style={styles.eyebrow}>{isClient ? '/client/home' : '/owner/home'}</Text>
            <Text style={styles.title}>{isClient ? 'Ready to book with confidence.' : 'Keep your truck ready for work.'}</Text>
          </View>
          <StatusPill tone={profile.accountStatus === 'active' ? 'ready' : 'warn'}>{profile.accountStatus}</StatusPill>
        </View>
        <ShellCard title="Authenticated profile">
          <Text style={styles.copy}>{profile.fullName || profile.email}</Text>
          <Text style={styles.muted}>{roleLabels[profile.role]} routed from backend `/me`.</Text>
          <Text style={styles.muted}>{profile.email}</Text>
          {profile.phone ? <Text style={styles.muted}>{profile.phone}</Text> : null}
        </ShellCard>
        <ShellCard title={isClient ? 'Next client workflow' : 'Next owner workflow'}>
          <Text style={styles.copy}>
            {isClient
              ? 'Phase 2 and 3 will add quote creation, nearby candidates, and active request visibility here.'
              : 'Phase 2 will add vehicle registration, document upload, verification status, and availability prompts here.'}
          </Text>
        </ShellCard>
        <Pressable accessibilityRole="button" onPress={onSignOut} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function VehicleClassPicker({
  vehicleClasses,
  selectedVehicleClassId,
  onSelect
}: {
  vehicleClasses: VehicleClass[];
  selectedVehicleClassId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.roleGrid}>
      {vehicleClasses.map((vehicleClass) => {
        const selected = vehicleClass.id === selectedVehicleClassId;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={vehicleClass.id}
            onPress={() => onSelect(vehicleClass.id)}
            style={[styles.roleOption, selected && styles.roleOptionSelected]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.roleOptionTitle, selected && styles.roleOptionTitleSelected]}>{vehicleClass.name}</Text>
              <StatusPill tone={selected ? 'ready' : 'warn'}>{vehicleClass.capacityKg ? `${vehicleClass.capacityKg}kg` : 'Class'}</StatusPill>
            </View>
            <Text style={[styles.roleOptionText, selected && styles.roleOptionTextSelected]}>{vehicleClass.description || 'Truck class for matching and pricing.'}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function VehicleCard({
  vehicle,
  onToggleAvailability
}: {
  vehicle: Vehicle;
  onToggleAvailability: (vehicle: Vehicle) => void;
}) {
  const canGoOnline = vehicle.verificationStatus === 'approved' && ['offline', 'online_available'].includes(vehicle.availabilityStatus);
  const nextLabel = vehicle.availabilityStatus === 'online_available' ? 'Go offline' : 'Go online';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{vehicle.licensePlate}</Text>
          <Text style={styles.muted}>{vehicle.vehicleClassSnapshot?.name || vehicle.vehicleClassId}</Text>
        </View>
        <StatusPill tone={statusTone(vehicle.verificationStatus)}>{vehicle.verificationStatus}</StatusPill>
      </View>
      <View style={styles.cardHeader}>
        <Text style={styles.muted}>{vehicle.capacityKg ?? 0}kg / {vehicle.capacityCubicMeters ?? 0}m3</Text>
        <StatusPill tone={statusTone(vehicle.availabilityStatus)}>{vehicle.availabilityStatus}</StatusPill>
      </View>
      {vehicle.rejectionReason ? <Text style={styles.errorText}>{vehicle.rejectionReason}</Text> : null}
      <Text style={styles.muted}>{vehicle.description || 'No description yet.'}</Text>
      <Pressable
        accessibilityRole="button"
        disabled={!canGoOnline}
        onPress={() => onToggleAvailability(vehicle)}
        style={[styles.secondaryButton, !canGoOnline && styles.buttonDisabled]}
      >
        <Text style={styles.secondaryButtonText}>{vehicle.verificationStatus === 'approved' ? nextLabel : 'Approval required'}</Text>
      </Pressable>
    </View>
  );
}

function DocumentUploadField({
  vehicleId,
  onUploaded
}: {
  vehicleId: string;
  onUploaded: () => void;
}) {
  const [type, setType] = useState<VehicleDocumentType>('identity');
  const [fileName, setFileName] = useState('identity.pdf');
  const [mimeType, setMimeType] = useState('application/pdf');
  const [sizeBytes, setSizeBytes] = useState('320000');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    const parsedSize = Number(sizeBytes);

    if (!fileName.trim() || !mimeType.trim() || !Number.isFinite(parsedSize) || parsedSize <= 0) {
      setError('File name, MIME type, and positive size are required.');
      return;
    }

    setPending(true);
    setError('');
    setMessage('');

    try {
      const intent = (await kuliApi.request('/files/upload-intent', {
        method: 'POST',
        body: {
          vehicleId,
          type,
          originalFileName: fileName.trim(),
          mimeType: mimeType.trim(),
          sizeBytes: parsedSize
        }
      })) as ApiEnvelope<{ file: { id: string }; upload: { url: string } }>;

      await kuliApi.request(`/files/${intent.data.file.id}/complete`, {
        method: 'POST',
        body: {
          uploadedSizeBytes: parsedSize
        }
      });

      await kuliApi.request(`/vehicles/${vehicleId}/documents`, {
        method: 'POST',
        body: {
          type,
          fileId: intent.data.file.id
        }
      });

      setMessage('Document metadata attached and marked uploaded. Local-dev upload URL was reserved by the backend.');
      onUploaded();
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setPending(false);
    }
  };

  return (
    <ShellCard title="Document upload metadata">
      <Text style={styles.muted}>Phase 2 uses backend upload intents and file metadata. Real binary upload waits for object storage configuration.</Text>
      <View style={styles.roleGrid}>
        {documentTypes.map((doc) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: type === doc.type }}
            key={doc.type}
            onPress={() => setType(doc.type)}
            style={[styles.documentOption, type === doc.type && styles.documentOptionSelected]}
          >
            <Text style={[styles.fieldLabel, type === doc.type && styles.documentOptionSelectedText]}>{doc.label}</Text>
            <Text style={[styles.muted, type === doc.type && styles.documentOptionSelectedText]}>{doc.detail}</Text>
          </Pressable>
        ))}
      </View>
      <Field label="File name" value={fileName} onChangeText={setFileName} placeholder="insurance.pdf" />
      <Field label="MIME type" value={mimeType} onChangeText={setMimeType} placeholder="application/pdf" />
      <Field label="Size bytes" value={sizeBytes} onChangeText={setSizeBytes} placeholder="320000" keyboardType="phone-pad" />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {message ? <Text style={styles.noticeText}>{message}</Text> : null}
      <Pressable accessibilityRole="button" disabled={pending} onPress={submit} style={[styles.primaryButton, pending && styles.buttonDisabled]}>
        <Text style={styles.primaryButtonText}>{pending ? 'Attaching...' : 'Attach document'}</Text>
      </Pressable>
    </ShellCard>
  );
}

function OwnerVehiclesScreen() {
  const queryClient = useQueryClient();
  const [vehicleClassId, setVehicleClassId] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [capacityKg, setCapacityKg] = useState('1200');
  const [capacityCubicMeters, setCapacityCubicMeters] = useState('10');
  const [description, setDescription] = useState('');
  const [activeVehicleId, setActiveVehicleId] = useState('');
  const [activeVehiclePendingId, setActiveVehiclePendingId] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const vehicleClassesQuery = useQuery({
    queryKey: ['vehicle-classes'],
    queryFn: async () => ((await kuliApi.vehicleClasses()) as ApiEnvelope<VehicleClass[]>).data
  });
  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', 'mine'],
    queryFn: async () => ((await kuliApi.request('/vehicles/mine')) as ApiEnvelope<Vehicle[]>).data
  });

  const vehicleClasses = vehicleClassesQuery.data ?? [];
  const vehicles = vehiclesQuery.data ?? [];
  const activeVehicle = vehicles.find((vehicle) => vehicle.id === activeVehicleId) ?? vehicles[0];

  useEffect(() => {
    if (!vehicleClassId && vehicleClasses[0]) {
      setVehicleClassId(vehicleClasses[0].id);
      setCapacityKg(String(vehicleClasses[0].capacityKg ?? 1200));
      setCapacityCubicMeters(String(vehicleClasses[0].capacityCubicMeters ?? 10));
    }
  }, [vehicleClassId, vehicleClasses]);

  const createVehicle = async () => {
    const parsedKg = Number(capacityKg);
    const parsedVolume = Number(capacityCubicMeters);

    if (!vehicleClassId || !licensePlate.trim()) {
      setError('Vehicle class and license plate are required.');
      return;
    }

    if (!Number.isFinite(parsedKg) || parsedKg <= 0 || !Number.isFinite(parsedVolume) || parsedVolume <= 0) {
      setError('Capacity values must be positive numbers.');
      return;
    }

    setPending(true);
    setError('');
    setNotice('');

    try {
      const result = (await kuliApi.request('/vehicles', {
        method: 'POST',
        body: {
          vehicleClassId,
          licensePlate: licensePlate.trim(),
          capacityKg: parsedKg,
          capacityCubicMeters: parsedVolume,
          description: description.trim() || undefined,
          currentLocation: {
            addressText: 'Manual standby point, Addis Ababa',
            source: 'manual_pin',
            point: { type: 'Point', coordinates: [38.746, 9.0128] }
          }
        }
      })) as ApiEnvelope<Vehicle>;

      setActiveVehicleId(result.data.id);
      await kuliApi.request('/owners/me/active-vehicle', {
        method: 'PATCH',
        body: {
          activeVehicleId: result.data.id
        }
      });
      setNotice('Vehicle submitted for admin verification.');
      setLicensePlate('');
      setDescription('');
      await queryClient.invalidateQueries({ queryKey: ['vehicles', 'mine'] });
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setPending(false);
    }
  };

  const selectActiveVehicle = async (vehicleId: string) => {
    setActiveVehiclePendingId(vehicleId);
    setError('');
    setNotice('');

    try {
      await kuliApi.request('/owners/me/active-vehicle', {
        method: 'PATCH',
        body: {
          activeVehicleId: vehicleId
        }
      });
      setActiveVehicleId(vehicleId);
      setNotice('Active vehicle updated for owner workflows.');
    } catch (activeVehicleError) {
      setError(getErrorMessage(activeVehicleError));
    } finally {
      setActiveVehiclePendingId('');
    }
  };

  const toggleAvailability = async (vehicle: Vehicle) => {
    const nextStatus = vehicle.availabilityStatus === 'online_available' ? 'offline' : 'online_available';

    try {
      await kuliApi.request(`/vehicles/${vehicle.id}/availability`, {
        method: 'PATCH',
        body: {
          availabilityStatus: nextStatus,
          currentLocation:
            nextStatus === 'online_available'
              ? {
                  addressText: 'Manual standby point, Addis Ababa',
                  source: 'manual_pin',
                  point: { type: 'Point', coordinates: [38.746, 9.0128] }
                }
              : undefined
        }
      });
      await queryClient.invalidateQueries({ queryKey: ['vehicles', 'mine'] });
    } catch (availabilityError) {
      setError(getErrorMessage(availabilityError));
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>/owner/vehicles</Text>
        <Text style={styles.title}>Register, document, and verify your truck.</Text>
        <Text style={styles.copy}>Approved vehicles can go online. Pending or rejected vehicles stay out of matching.</Text>

        <ShellCard title="Vehicle registration">
          {vehicleClassesQuery.isError ? <Text style={styles.errorText}>{getErrorMessage(vehicleClassesQuery.error)}</Text> : null}
          <VehicleClassPicker vehicleClasses={vehicleClasses} selectedVehicleClassId={vehicleClassId} onSelect={setVehicleClassId} />
          <Field label="License plate" value={licensePlate} onChangeText={setLicensePlate} placeholder="AA-12345" />
          <Field label="Capacity kg" value={capacityKg} onChangeText={setCapacityKg} placeholder="1200" keyboardType="phone-pad" />
          <Field label="Volume m3" value={capacityCubicMeters} onChangeText={setCapacityCubicMeters} placeholder="10" keyboardType="phone-pad" />
          <Field label="Vehicle notes" value={description} onChangeText={setDescription} placeholder="Clean covered truck, good for furniture" />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
          <Pressable accessibilityRole="button" disabled={pending} onPress={createVehicle} style={[styles.primaryButton, pending && styles.buttonDisabled]}>
            <Text style={styles.primaryButtonText}>{pending ? 'Submitting...' : 'Submit vehicle'}</Text>
          </Pressable>
        </ShellCard>

        {activeVehicle ? (
          <DocumentUploadField
            vehicleId={activeVehicle.id}
            onUploaded={() => {
              queryClient.invalidateQueries({ queryKey: ['vehicles', 'mine'] });
            }}
          />
        ) : null}

        <ShellCard title="My vehicles">
          {vehiclesQuery.isError ? <Text style={styles.errorText}>{getErrorMessage(vehiclesQuery.error)}</Text> : null}
          {vehicles.length === 0 ? <Text style={styles.muted}>No vehicles submitted yet.</Text> : null}
          <View style={styles.roleGrid}>
            {vehicles.map((vehicle) => (
              <Pressable accessibilityRole="button" disabled={activeVehiclePendingId === vehicle.id} key={vehicle.id} onPress={() => selectActiveVehicle(vehicle.id)}>
                <VehicleCard vehicle={vehicle} onToggleAvailability={toggleAvailability} />
              </Pressable>
            ))}
          </View>
        </ShellCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const loadTypeOptions = [
  { key: 'household_move', label: 'Household', detail: 'Full move with mixed items.' },
  { key: 'furniture', label: 'Furniture', detail: 'Sofas, beds, tables, cabinets.' },
  { key: 'appliance', label: 'Appliance', detail: 'Fridge, washer, oven, electronics.' },
  { key: 'business_delivery', label: 'Business', detail: 'Shop stock or repeat delivery.' }
];

const parsePositiveNumber = (value: string, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const createIdempotencyKey = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const activeRequestStatuses = ['pending', 'accepted', 'en_route_to_pickup', 'arrived_at_pickup', 'loading', 'in_transit', 'unloading'];
const terminalRequestStatuses = ['completed', 'cancelled', 'timed_out'];
const ownerForwardStatuses: KuliStatus[] = ['en_route_to_pickup', 'arrived_at_pickup', 'loading', 'in_transit', 'unloading', 'completed'];
const reportCategories = ['overcharge', 'no_show', 'misconduct', 'damage', 'safety', 'platform_issue', 'other'];
const statusLabels: Record<KuliStatus, string> = {
  pending: 'Waiting',
  accepted: 'Accepted',
  en_route_to_pickup: 'En route',
  arrived_at_pickup: 'Arrived',
  loading: 'Loading',
  in_transit: 'In transit',
  unloading: 'Unloading',
  completed: 'Completed',
  cancelled: 'Cancelled',
  timed_out: 'Timed out'
};

const buildManualLocation = ({ addressText, lon, lat }: { addressText: string; lon: string; lat: string }): QuoteLocation => ({
  addressText: addressText.trim(),
  source: 'manual_pin',
  point: {
    type: 'Point',
    coordinates: [Number(lon), Number(lat)]
  }
});

function PriceLine({ label, value, currency }: { label: string; value: number; currency: string }) {
  return (
    <View style={styles.priceLine}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.priceValue}>{currency} {value.toFixed(2)}</Text>
    </View>
  );
}

function CandidateCard({ candidate, capacityLabel }: { candidate: QuoteCandidate; capacityLabel: string }) {
  return (
    <View style={styles.candidateCard}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{candidate.licensePlate}</Text>
          <Text style={styles.muted}>{candidate.vehicleClassSnapshot?.name || 'Available vehicle'}</Text>
        </View>
        <StatusPill tone="ready">{candidate.distanceKm}km</StatusPill>
      </View>
      <View style={styles.metricGrid}>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>{candidate.rating.toFixed(1)}</Text>
          <Text style={styles.metricLabel}>rating</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>{candidate.rankingScore.toFixed(1)}</Text>
          <Text style={styles.metricLabel}>match score</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>{capacityLabel}</Text>
          <Text style={styles.metricLabel}>class capacity</Text>
        </View>
      </View>
    </View>
  );
}

function ClientQuoteScreen() {
  const queryClient = useQueryClient();
  const [vehicleClassId, setVehicleClassId] = useState('');
  const [pickupAddress, setPickupAddress] = useState('Bole, Addis Ababa');
  const [pickupLon, setPickupLon] = useState('38.7903');
  const [pickupLat, setPickupLat] = useState('8.9806');
  const [destinationAddress, setDestinationAddress] = useState('Piassa, Addis Ababa');
  const [destinationLon, setDestinationLon] = useState('38.7578');
  const [destinationLat, setDestinationLat] = useState('9.0350');
  const [pickupWindow, setPickupWindow] = useState('Today, flexible');
  const [itemType, setItemType] = useState('household_move');
  const [estimatedWeightKg, setEstimatedWeightKg] = useState('800');
  const [estimatedVolumeCubicMeters, setEstimatedVolumeCubicMeters] = useState('8');
  const [loadingAssistanceRequested, setLoadingAssistanceRequested] = useState(true);
  const [specialHandlingInstructions, setSpecialHandlingInstructions] = useState('');
  const [tip, setTip] = useState('0');
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoteInput, setQuoteInput] = useState<QuoteInput | null>(null);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [requestResult, setRequestResult] = useState<RequestCreateResult | null>(null);
  const [pending, setPending] = useState(false);
  const [requestPending, setRequestPending] = useState(false);
  const [error, setError] = useState('');

  const vehicleClassesQuery = useQuery({
    queryKey: ['vehicle-classes'],
    queryFn: async () => ((await kuliApi.vehicleClasses()) as ApiEnvelope<VehicleClass[]>).data
  });

  const vehicleClasses = vehicleClassesQuery.data ?? [];
  const selectedVehicleClass = vehicleClasses.find((vehicleClass) => vehicleClass.id === vehicleClassId);
  const selectedCapacityLabel = selectedVehicleClass?.capacityKg ? `${selectedVehicleClass.capacityKg}kg` : 'class';

  useEffect(() => {
    if (!vehicleClassId && vehicleClasses[0]) {
      setVehicleClassId(vehicleClasses[0].id);
    }
  }, [vehicleClassId, vehicleClasses]);

  const buildQuoteInput = (): QuoteInput => {
    const pickupLocation = buildManualLocation({ addressText: pickupAddress, lon: pickupLon, lat: pickupLat });
    const destinationLocation = buildManualLocation({ addressText: destinationAddress, lon: destinationLon, lat: destinationLat });

    return {
      pickupLocation,
      destinationLocation,
      requestedVehicleClassId: vehicleClassId,
      requestedPickupTime: pickupWindow.trim() || undefined,
      loadDetails: {
        itemType,
        estimatedWeightKg: parsePositiveNumber(estimatedWeightKg),
        estimatedVolumeCubicMeters: parsePositiveNumber(estimatedVolumeCubicMeters),
        loadingAssistanceRequested,
        specialHandlingInstructions: specialHandlingInstructions.trim() || undefined
      },
      tip: parsePositiveNumber(tip)
    };
  };

  const submitQuote = async () => {
    const nextQuoteInput = buildQuoteInput();
    const coordinates = [...nextQuoteInput.pickupLocation.point.coordinates, ...nextQuoteInput.destinationLocation.point.coordinates];

    if (!vehicleClassId || !nextQuoteInput.pickupLocation.addressText || !nextQuoteInput.destinationLocation.addressText) {
      setError('Pickup, destination, and vehicle class are required.');
      return;
    }

    if (coordinates.some((coordinate) => !Number.isFinite(coordinate))) {
      setError('Manual coordinates must be valid longitude and latitude numbers.');
      return;
    }

    setPending(true);
    setError('');
    setRequestResult(null);

    try {
      const result = (await kuliApi.request('/quotes', {
        method: 'POST',
        body: nextQuoteInput
      })) as ApiEnvelope<QuoteResult>;

      setQuote(result.data);
      setQuoteInput(nextQuoteInput);
      setSelectedVehicleIds(result.data.candidates.slice(0, 3).map((candidate) => candidate.vehicleId));
    } catch (quoteError) {
      setError(getErrorMessage(quoteError));
    } finally {
      setPending(false);
    }
  };

  const toggleCandidateSelection = (vehicleId: string) => {
    setSelectedVehicleIds((current) => (current.includes(vehicleId) ? current.filter((id) => id !== vehicleId) : [...current, vehicleId]));
  };

  const createRequest = async () => {
    if (!quoteInput || selectedVehicleIds.length === 0) {
      setError('Select at least one available truck before sending the request.');
      return;
    }

    setRequestPending(true);
    setError('');

    try {
      const result = (await kuliApi.request('/kuli-requests', {
        method: 'POST',
        idempotencyKey: createIdempotencyKey('client-request'),
        body: {
          ...quoteInput,
          selectedVehicleIds
        }
      })) as ApiEnvelope<RequestCreateResult>;

      setRequestResult(result.data);
      await queryClient.invalidateQueries({ queryKey: ['kuli-requests', 'mine'] });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setRequestPending(false);
    }
  };

  const snapshot = quote?.quoteSnapshot;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>/client/request/new</Text>
        <Text style={styles.title}>Price the move before you send it.</Text>
        <Text style={styles.copy}>Manual coordinates keep this phase deterministic while the backend handles route estimate, pricing, and nearby approved trucks.</Text>

        <ShellCard title="Route and load">
          {vehicleClassesQuery.isError ? <Text style={styles.errorText}>{getErrorMessage(vehicleClassesQuery.error)}</Text> : null}
          <VehicleClassPicker vehicleClasses={vehicleClasses} selectedVehicleClassId={vehicleClassId} onSelect={setVehicleClassId} />
          <Field label="Pickup address" value={pickupAddress} onChangeText={setPickupAddress} placeholder="Bole, Addis Ababa" />
          <View style={styles.inlineFields}>
            <Field containerStyle={styles.inlineField} label="Pickup lon" value={pickupLon} onChangeText={setPickupLon} placeholder="38.7903" keyboardType="decimal-pad" />
            <Field containerStyle={styles.inlineField} label="Pickup lat" value={pickupLat} onChangeText={setPickupLat} placeholder="8.9806" keyboardType="decimal-pad" />
          </View>
          <Field label="Destination address" value={destinationAddress} onChangeText={setDestinationAddress} placeholder="Piassa, Addis Ababa" />
          <View style={styles.inlineFields}>
            <Field containerStyle={styles.inlineField} label="Destination lon" value={destinationLon} onChangeText={setDestinationLon} placeholder="38.7578" keyboardType="decimal-pad" />
            <Field containerStyle={styles.inlineField} label="Destination lat" value={destinationLat} onChangeText={setDestinationLat} placeholder="9.0350" keyboardType="decimal-pad" />
          </View>
          <Field label="Pickup window" value={pickupWindow} onChangeText={setPickupWindow} placeholder="Today, 2-5 PM" />
          <View style={styles.roleGrid}>
            {loadTypeOptions.map((option) => {
              const selected = itemType === option.key;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={option.key}
                  onPress={() => setItemType(option.key)}
                  style={[styles.documentOption, selected && styles.documentOptionSelected]}
                >
                  <Text style={[styles.fieldLabel, selected && styles.documentOptionSelectedText]}>{option.label}</Text>
                  <Text style={[styles.muted, selected && styles.documentOptionSelectedText]}>{option.detail}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.inlineFields}>
            <Field containerStyle={styles.inlineField} label="Weight kg" value={estimatedWeightKg} onChangeText={setEstimatedWeightKg} placeholder="800" keyboardType="numeric" />
            <Field containerStyle={styles.inlineField} label="Volume m3" value={estimatedVolumeCubicMeters} onChangeText={setEstimatedVolumeCubicMeters} placeholder="8" keyboardType="decimal-pad" />
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: loadingAssistanceRequested }}
            onPress={() => setLoadingAssistanceRequested((value) => !value)}
            style={[styles.switchRow, loadingAssistanceRequested && styles.switchRowActive]}
          >
            <Text style={[styles.switchText, loadingAssistanceRequested && styles.switchTextActive]}>Loading help</Text>
            <StatusPill tone={loadingAssistanceRequested ? 'ready' : 'warn'}>{loadingAssistanceRequested ? 'Yes' : 'No'}</StatusPill>
          </Pressable>
          <Field label="Special handling" value={specialHandlingInstructions} onChangeText={setSpecialHandlingInstructions} placeholder="Fragile wardrobe, narrow stairs" />
          <Field label="Tip ETB" value={tip} onChangeText={setTip} placeholder="0" keyboardType="numeric" />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable accessibilityRole="button" disabled={pending || vehicleClasses.length === 0} onPress={submitQuote} style={[styles.primaryButton, (pending || vehicleClasses.length === 0) && styles.buttonDisabled]}>
            <Text style={styles.primaryButtonText}>{pending ? 'Calculating...' : 'Get quote'}</Text>
          </Pressable>
        </ShellCard>

        {quote && snapshot ? (
          <ShellCard title="Quote result">
            <View style={styles.cardHeader}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{snapshot.currency} {snapshot.totalEstimate.toFixed(2)}</Text>
                <Text style={styles.muted}>{quote.route.distanceKm.toFixed(2)}km / {Math.round(quote.route.etaMinutes)} min / rule v{snapshot.pricingRuleVersion}</Text>
              </View>
              <StatusPill tone={quote.search.noResults ? 'warn' : 'ready'}>{quote.search.radiusKmUsed}km radius</StatusPill>
            </View>
            {quote.search.expanded ? <Text style={styles.noticeText}>Search expanded because the first radius did not return approved available trucks.</Text> : null}
            <View style={styles.priceBox}>
              <PriceLine label="Base fare" value={snapshot.baseFare} currency={snapshot.currency} />
              <PriceLine label="Distance" value={snapshot.distanceCharge} currency={snapshot.currency} />
              <PriceLine label="Time" value={snapshot.durationCharge} currency={snapshot.currency} />
              <PriceLine label="Load adjustment" value={snapshot.loadAdjustment} currency={snapshot.currency} />
              <PriceLine label="Fuel surcharge" value={snapshot.fuelSurcharge} currency={snapshot.currency} />
              <PriceLine label="Tip" value={snapshot.tip} currency={snapshot.currency} />
            </View>
            {quote.candidates.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.cardTitle}>No nearby approved trucks yet.</Text>
                <Text style={styles.muted}>Try a smaller load, another vehicle class, or a wider pickup area after more owners come online.</Text>
              </View>
            ) : (
              <View style={styles.roleGrid}>
                {quote.candidates.map((candidate) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedVehicleIds.includes(candidate.vehicleId) }}
                    key={candidate.vehicleId}
                    onPress={() => toggleCandidateSelection(candidate.vehicleId)}
                    style={[styles.selectableSurface, selectedVehicleIds.includes(candidate.vehicleId) && styles.selectableSurfaceActive]}
                  >
                    <CandidateCard candidate={candidate} capacityLabel={selectedCapacityLabel} />
                  </Pressable>
                ))}
              </View>
            )}
            {quote.candidates.length > 0 ? (
              <>
                <Text style={styles.muted}>{selectedVehicleIds.length} selected for dispatch. Owners receive first-accept-wins offers.</Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={requestPending || selectedVehicleIds.length === 0}
                  onPress={createRequest}
                  style={[styles.primaryButton, (requestPending || selectedVehicleIds.length === 0) && styles.buttonDisabled]}
                >
                  <Text style={styles.primaryButtonText}>{requestPending ? 'Sending...' : 'Send KULI request'}</Text>
                </Pressable>
              </>
            ) : null}
          </ShellCard>
        ) : null}

        {requestResult ? (
          <ShellCard title="Waiting for owner">
            <View style={styles.cardHeader}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{requestResult.request.requestCode}</Text>
                <Text style={styles.muted}>{requestResult.offers.length} offer{requestResult.offers.length === 1 ? '' : 's'} sent</Text>
              </View>
              <StatusPill tone={statusTone(requestResult.request.status)}>{requestResult.request.status}</StatusPill>
            </View>
            <Text style={styles.muted}>
              Offers expire {requestResult.waitingState?.expiresAt ? new Date(requestResult.waitingState.expiresAt).toLocaleTimeString() : 'soon'} if no owner accepts.
            </Text>
            <Text style={styles.noticeText}>You can follow or cancel this request from Home while it is still cancellable.</Text>
          </ShellCard>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function RequestSummaryCard({
  request,
  onCancel,
  children
}: {
  request: KuliRequest;
  onCancel: (request: KuliRequest) => void;
  children?: ReactNode;
}) {
  const isCancellable = ['pending', 'accepted', 'en_route_to_pickup'].includes(request.status);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{request.requestCode}</Text>
          <Text style={styles.muted}>{request.pickupLocation?.addressText} to {request.destinationLocation?.addressText}</Text>
        </View>
        <StatusPill tone={statusTone(request.status)}>{statusLabels[request.status]}</StatusPill>
      </View>
      <View style={styles.metricGrid}>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>{request.quoteSnapshot?.currency ?? 'ETB'} {Number(request.quoteSnapshot?.totalEstimate ?? 0).toFixed(0)}</Text>
          <Text style={styles.metricLabel}>estimate</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>{request.offers?.length ?? 0}</Text>
          <Text style={styles.metricLabel}>offers</Text>
        </View>
      </View>
      {request.status === 'pending' ? <Text style={styles.noticeText}>Waiting for an owner to accept. Open offers can still expire or be cancelled.</Text> : null}
      {request.status === 'accepted' ? <Text style={styles.noticeText}>A truck owner accepted. Watch the manual timeline and send request-scoped messages here.</Text> : null}
      {children}
      <Pressable
        accessibilityRole="button"
        disabled={!isCancellable}
        onPress={() => onCancel(request)}
        style={[styles.secondaryButton, !isCancellable && styles.buttonDisabled]}
      >
        <Text style={styles.secondaryButtonText}>{isCancellable ? 'Cancel request' : 'Terminal request'}</Text>
      </Pressable>
    </View>
  );
}

function TimelineEventRow({ event }: { event: StatusEvent }) {
  const label = statusLabels[event.toStatus] ?? event.toStatus;

  return (
    <View style={styles.timelineRow}>
      <StatusPill tone={statusTone(event.toStatus)}>{label}</StatusPill>
      <View style={styles.flex}>
        <Text style={styles.fieldLabel}>{event.fromStatus ? `${statusLabels[event.fromStatus]} to ${label}` : label}</Text>
        <Text style={styles.muted}>{event.reason || 'Status event recorded'} / {event.actorRole || 'system'}</Text>
        {event.createdAt ? <Text style={styles.muted}>{new Date(event.createdAt).toLocaleString()}</Text> : null}
      </View>
    </View>
  );
}

function TripTimeline({ requestId }: { requestId: string }) {
  const eventsQuery = useQuery({
    queryKey: ['kuli-requests', requestId, 'events'],
    queryFn: async () => ((await kuliApi.request(`/kuli-requests/${requestId}/events`)) as ApiEnvelope<StatusEvent[]>).data
  });

  const events = eventsQuery.data ?? [];

  return (
    <View style={styles.subsection}>
      <View style={styles.cardHeader}>
        <Text style={styles.fieldLabel}>Trip timeline</Text>
        <Pressable accessibilityRole="button" onPress={() => eventsQuery.refetch()} style={styles.compactButton}>
          <Text style={styles.compactButtonText}>Refresh</Text>
        </Pressable>
      </View>
      {eventsQuery.isError ? <Text style={styles.errorText}>{getErrorMessage(eventsQuery.error)}</Text> : null}
      {events.length === 0 ? <Text style={styles.muted}>No status events yet. The acceptance event appears after the owner accepts.</Text> : null}
      <View style={styles.roleGrid}>
        {events.map((event) => (
          <TimelineEventRow event={event} key={event.id} />
        ))}
      </View>
    </View>
  );
}

function MessageThread({ requestId, currentUserId }: { requestId: string; currentUserId: string }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [retryBody, setRetryBody] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const messagesQuery = useQuery({
    queryKey: ['kuli-requests', requestId, 'messages'],
    queryFn: async () => ((await kuliApi.request(`/kuli-requests/${requestId}/messages`)) as ApiEnvelope<TripMessage[]>).data
  });

  const sendMessage = async (nextBody = body) => {
    const trimmed = nextBody.trim();

    if (!trimmed || pending) {
      return;
    }

    setPending(true);
    setError('');

    try {
      await kuliApi.request(`/kuli-requests/${requestId}/messages`, {
        method: 'POST',
        idempotencyKey: createIdempotencyKey('msg'),
        body: {
          body: trimmed,
          clientGeneratedId: createIdempotencyKey('message')
        }
      });
      setBody('');
      setRetryBody('');
      await queryClient.invalidateQueries({ queryKey: ['kuli-requests', requestId, 'messages'] });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (sendError) {
      setRetryBody(trimmed);
      setError(getErrorMessage(sendError));
    } finally {
      setPending(false);
    }
  };

  const messages = messagesQuery.data ?? [];

  return (
    <View style={styles.subsection}>
      <View style={styles.cardHeader}>
        <Text style={styles.fieldLabel}>Messages</Text>
        <StatusPill tone={messagesQuery.isError ? 'blocked' : 'ready'}>{messages.length}</StatusPill>
      </View>
      {messagesQuery.isError ? <Text style={styles.errorText}>Connection issue loading messages. Pull this panel by refreshing after the network returns.</Text> : null}
      <View style={styles.messageList}>
        {messages.length === 0 ? <Text style={styles.muted}>No messages yet. Keep coordination inside the request for accountability.</Text> : null}
        {messages.map((message) => {
          const mine = message.senderId === currentUserId;

          return (
            <View key={message.id} style={[styles.messageBubble, mine && styles.messageBubbleMine]}>
              <Text style={[styles.messageBody, mine && styles.messageBodyMine]}>{message.body}</Text>
              <Text style={[styles.messageMeta, mine && styles.messageBodyMine]}>{mine ? 'You' : roleLabels[message.senderRole]} {message.createdAt ? `/ ${new Date(message.createdAt).toLocaleTimeString()}` : ''}</Text>
            </View>
          );
        })}
      </View>
      {error ? (
        <View style={styles.emptyState}>
          <Text style={styles.errorText}>{error}</Text>
          {retryBody ? (
            <Pressable accessibilityRole="button" disabled={pending} onPress={() => sendMessage(retryBody)} style={[styles.secondaryButton, pending && styles.buttonDisabled]}>
              <Text style={styles.secondaryButtonText}>{pending ? 'Retrying...' : 'Retry message'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <Field label="Message" value={body} onChangeText={setBody} placeholder="Share arrival detail or loading instruction" />
      <Pressable accessibilityRole="button" disabled={!body.trim() || pending} onPress={() => sendMessage()} style={[styles.primaryButton, (!body.trim() || pending) && styles.buttonDisabled]}>
        <Text style={styles.primaryButtonText}>{pending ? 'Sending...' : 'Send message'}</Text>
      </Pressable>
    </View>
  );
}

function OwnerStatusControls({ request }: { request: KuliRequest }) {
  const queryClient = useQueryClient();
  const [pendingStatus, setPendingStatus] = useState<KuliStatus | ''>('');
  const [error, setError] = useState('');
  const nextStatus = request.status === 'accepted' ? 'en_route_to_pickup' : ownerForwardStatuses[ownerForwardStatuses.indexOf(request.status) + 1];
  const canAdvance = Boolean(nextStatus) && !terminalRequestStatuses.includes(request.status);

  const updateStatus = async (status: KuliStatus, reason = `owner_${status}`) => {
    setPendingStatus(status);
    setError('');

    try {
      await kuliApi.request(`/kuli-requests/${request.id}/status`, {
        method: 'PATCH',
        body: {
          status,
          reason
        }
      });
      await queryClient.invalidateQueries({ queryKey: ['kuli-requests', 'mine', 'owner'] });
      await queryClient.invalidateQueries({ queryKey: ['kuli-requests', request.id, 'events'] });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (statusError) {
      setError(getErrorMessage(statusError));
    } finally {
      setPendingStatus('');
    }
  };

  return (
    <View style={styles.subsection}>
      <Text style={styles.fieldLabel}>Owner trip controls</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          disabled={!canAdvance || Boolean(pendingStatus)}
          onPress={() => {
            if (nextStatus) {
              updateStatus(nextStatus);
            }
          }}
          style={[styles.primaryButton, styles.actionButton, (!canAdvance || Boolean(pendingStatus)) && styles.buttonDisabled]}
        >
          <Text style={styles.primaryButtonText}>{pendingStatus ? 'Updating...' : nextStatus ? statusLabels[nextStatus] : 'No next step'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={terminalRequestStatuses.includes(request.status) || Boolean(pendingStatus)}
          onPress={() => updateStatus('cancelled', 'owner_cancelled')}
          style={[styles.secondaryButton, styles.actionButton, (terminalRequestStatuses.includes(request.status) || Boolean(pendingStatus)) && styles.buttonDisabled]}
        >
          <Text style={styles.secondaryButtonText}>Cancel trip</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ActiveTripWorkspace({
  request,
  profile,
  ownerControls = false
}: {
  request: KuliRequest;
  profile: UserProfile;
  ownerControls?: boolean;
}) {
  return (
    <View style={styles.tripWorkspace}>
      {ownerControls ? <OwnerStatusControls request={request} /> : null}
      <TripTimeline requestId={request.id} />
      <MessageThread requestId={request.id} currentUserId={profile.id} />
    </View>
  );
}

function ClientHomeScreen({ profile, onSignOut }: { profile: UserProfile; onSignOut: () => void }) {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState('');
  const [pendingCancelId, setPendingCancelId] = useState('');

  const requestsQuery = useQuery({
    queryKey: ['kuli-requests', 'mine'],
    queryFn: async () => ((await kuliApi.request('/kuli-requests/mine')) as ApiEnvelope<KuliRequest[]>).data
  });

  const requests = requestsQuery.data ?? [];
  const activeRequests = requests.filter((request) => activeRequestStatuses.includes(request.status));
  const recentRequests = requests.filter((request) => !activeRequestStatuses.includes(request.status)).slice(0, 3);

  const cancelRequest = async (request: KuliRequest) => {
    setPendingCancelId(request.id);
    setActionError('');

    try {
      await kuliApi.request(`/kuli-requests/${request.id}/cancel`, {
        method: 'POST',
        body: {
          reason: 'client_cancelled'
        }
      });
      await queryClient.invalidateQueries({ queryKey: ['kuli-requests', 'mine'] });
    } catch (cancelError) {
      setActionError(getErrorMessage(cancelError));
    } finally {
      setPendingCancelId('');
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.cardHeader}>
          <View style={styles.flex}>
            <Text style={styles.eyebrow}>/client/home</Text>
            <Text style={styles.title}>Track the request after dispatch.</Text>
          </View>
          <StatusPill tone={profile.accountStatus === 'active' ? 'ready' : 'warn'}>{profile.accountStatus}</StatusPill>
        </View>
        <ShellCard title="Authenticated profile">
          <Text style={styles.copy}>{profile.fullName || profile.email}</Text>
          <Text style={styles.muted}>{roleLabels[profile.role]} routed from backend `/me`.</Text>
          <Text style={styles.muted}>{profile.email}</Text>
        </ShellCard>
        <ShellCard title="Active requests">
          {requestsQuery.isError ? <Text style={styles.errorText}>{getErrorMessage(requestsQuery.error)}</Text> : null}
          {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}
          {requestsQuery.isLoading ? <Text style={styles.muted}>Loading your requests...</Text> : null}
          {activeRequests.length === 0 && !requestsQuery.isLoading ? <Text style={styles.muted}>No active request yet. Use Request to price and send one.</Text> : null}
          <View style={styles.roleGrid}>
            {activeRequests.map((request) => (
              <RequestSummaryCard
                key={request.id}
                request={request}
                onCancel={(nextRequest) => {
                  if (!pendingCancelId) {
                    cancelRequest(nextRequest);
                  }
                }}
              >
                {request.status !== 'pending' ? <ActiveTripWorkspace request={request} profile={profile} /> : null}
              </RequestSummaryCard>
            ))}
          </View>
        </ShellCard>
        {recentRequests.length ? (
          <ShellCard title="Recent outcomes">
            <View style={styles.roleGrid}>
              {recentRequests.map((request) => (
                <View key={request.id} style={styles.requestRow}>
                  <View style={styles.flex}>
                    <Text style={styles.fieldLabel}>{request.requestCode}</Text>
                    <Text style={styles.muted}>{request.pickupLocation?.addressText}</Text>
                  </View>
                  <StatusPill tone={statusTone(request.status)}>{request.status}</StatusPill>
                </View>
              ))}
            </View>
          </ShellCard>
        ) : null}
        <Pressable accessibilityRole="button" onPress={onSignOut} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function OwnerOfferCard({
  offer,
  onViewed,
  onDecline,
  onAccept,
  pendingOfferId
}: {
  offer: TripOffer;
  onViewed: (offer: TripOffer) => void;
  onDecline: (offer: TripOffer) => void;
  onAccept: (offer: TripOffer) => void;
  pendingOfferId: string;
}) {
  const isPending = pendingOfferId === offer.id;
  const expiresAt = offer.expiresAt ? new Date(offer.expiresAt).toLocaleTimeString() : 'soon';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>Offer {offer.id.slice(-6).toUpperCase()}</Text>
          <Text style={styles.muted}>Request {offer.requestId}</Text>
        </View>
        <StatusPill tone={statusTone(offer.status)}>{offer.status}</StatusPill>
      </View>
      <View style={styles.metricGrid}>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>{Number(offer.distanceKmAtOffer ?? 0).toFixed(1)}km</Text>
          <Text style={styles.metricLabel}>pickup distance</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>{Math.round(offer.etaMinutesAtOffer ?? 0)}</Text>
          <Text style={styles.metricLabel}>route minutes</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>{expiresAt}</Text>
          <Text style={styles.metricLabel}>expires</Text>
        </View>
      </View>
      <View style={styles.actionRow}>
        <Pressable accessibilityRole="button" disabled={isPending || offer.status !== 'sent'} onPress={() => onViewed(offer)} style={[styles.secondaryButton, styles.actionButton, (isPending || offer.status !== 'sent') && styles.buttonDisabled]}>
          <Text style={styles.secondaryButtonText}>Viewed</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={isPending} onPress={() => onDecline(offer)} style={[styles.secondaryButton, styles.actionButton, isPending && styles.buttonDisabled]}>
          <Text style={styles.secondaryButtonText}>Decline</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={isPending} onPress={() => onAccept(offer)} style={[styles.primaryButton, styles.actionButton, isPending && styles.buttonDisabled]}>
          <Text style={styles.primaryButtonText}>{isPending ? 'Working...' : 'Accept'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function OwnerOffersScreen({ profile }: { profile: UserProfile }) {
  const queryClient = useQueryClient();
  const [pendingOfferId, setPendingOfferId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [acceptedResult, setAcceptedResult] = useState<OfferActionResult | null>(null);

  const offersQuery = useQuery({
    queryKey: ['owner-offers'],
    queryFn: async () => ((await kuliApi.request('/owner/offers')) as ApiEnvelope<TripOffer[]>).data
  });

  const ownerRequestsQuery = useQuery({
    queryKey: ['kuli-requests', 'mine', 'owner'],
    queryFn: async () => ((await kuliApi.request('/kuli-requests/mine')) as ApiEnvelope<KuliRequest[]>).data
  });

  const offers = offersQuery.data ?? [];
  const acceptedTrips = (ownerRequestsQuery.data ?? []).filter((request) => activeRequestStatuses.includes(request.status));

  const runOfferAction = async (offer: TripOffer, action: 'viewed' | 'decline' | 'accept') => {
    setPendingOfferId(offer.id);
    setError('');
    setMessage('');

    try {
      if (action === 'viewed') {
        await kuliApi.request(`/offers/${offer.id}/viewed`, {
          method: 'POST'
        });
        setMessage('Offer marked viewed.');
      }

      if (action === 'decline') {
        await kuliApi.request(`/offers/${offer.id}/decline`, {
          method: 'POST',
          body: {
            declineReason: 'owner_declined_from_mobile'
          }
        });
        setMessage('Offer declined and removed from the active inbox.');
      }

      if (action === 'accept') {
        const result = (await kuliApi.request(`/offers/${offer.id}/accept`, {
          method: 'POST',
          idempotencyKey: createIdempotencyKey('offer-accept')
        })) as ApiEnvelope<OfferActionResult>;
        setAcceptedResult(result.data);
        setMessage('Offer accepted. Competing offers will expire for this request.');
      }

      await queryClient.invalidateQueries({ queryKey: ['owner-offers'] });
      await queryClient.invalidateQueries({ queryKey: ['kuli-requests', 'mine', 'owner'] });
    } catch (offerError) {
      const errorCode = (offerError as { code?: string }).code;
      setError(errorCode === 'REQUEST_ALREADY_ACCEPTED' ? 'Another owner already accepted this request. Refreshing your inbox will remove it.' : getErrorMessage(offerError));
    } finally {
      setPendingOfferId('');
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>/owner/offers</Text>
        <Text style={styles.title}>Accept fast, with confidence.</Text>
        <Text style={styles.copy}>Open offers are first-accept-wins. Accepted requests become active trips and make the vehicle busy.</Text>

        <ShellCard title="Offer inbox">
          {offersQuery.isError ? <Text style={styles.errorText}>{getErrorMessage(offersQuery.error)}</Text> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {message ? <Text style={styles.noticeText}>{message}</Text> : null}
          {offersQuery.isLoading ? <Text style={styles.muted}>Loading offers...</Text> : null}
          {offers.length === 0 && !offersQuery.isLoading ? <Text style={styles.muted}>No open offers. Keep an approved vehicle online to receive requests.</Text> : null}
          <View style={styles.roleGrid}>
            {offers.map((offer) => (
              <OwnerOfferCard
                key={offer.id}
                offer={offer}
                pendingOfferId={pendingOfferId}
                onAccept={(nextOffer) => runOfferAction(nextOffer, 'accept')}
                onDecline={(nextOffer) => runOfferAction(nextOffer, 'decline')}
                onViewed={(nextOffer) => runOfferAction(nextOffer, 'viewed')}
              />
            ))}
          </View>
        </ShellCard>

        {acceptedResult ? (
          <ShellCard title="Accepted trip">
            <View style={styles.cardHeader}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{acceptedResult.request.requestCode}</Text>
                <Text style={styles.muted}>{acceptedResult.request.pickupLocation?.addressText} to {acceptedResult.request.destinationLocation?.addressText}</Text>
              </View>
              <StatusPill tone="ready">{acceptedResult.request.status}</StatusPill>
            </View>
            <ActiveTripWorkspace request={acceptedResult.request} profile={profile} ownerControls />
          </ShellCard>
        ) : null}

        {acceptedTrips.length ? (
          <ShellCard title="Active trip detail">
            <View style={styles.roleGrid}>
              {acceptedTrips.map((request) => (
                <View key={request.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.flex}>
                      <Text style={styles.cardTitle}>{request.requestCode}</Text>
                      <Text style={styles.muted}>{request.pickupLocation?.addressText} to {request.destinationLocation?.addressText}</Text>
                    </View>
                    <StatusPill tone={statusTone(request.status)}>{statusLabels[request.status]}</StatusPill>
                  </View>
                  <ActiveTripWorkspace request={request} profile={profile} ownerControls />
                </View>
              ))}
            </View>
          </ShellCard>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationCenterScreen({ profile }: { profile: UserProfile }) {
  const queryClient = useQueryClient();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState('');
  const [preferencesPending, setPreferencesPending] = useState(false);

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => ((await kuliApi.request('/notifications')) as ApiEnvelope<NotificationRecord[]>).data
  });

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((notification) => notification.deliveryStatus !== 'read').length;

  const markRead = async (notification: NotificationRecord) => {
    setPendingId(notification.id);
    setError('');
    setMessage('');

    try {
      await kuliApi.request(`/notifications/${notification.id}/read`, {
        method: 'PATCH'
      });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setMessage('Notification marked read.');
    } catch (readError) {
      setError(getErrorMessage(readError));
    } finally {
      setPendingId('');
    }
  };

  const savePreferences = async () => {
    setPreferencesPending(true);
    setError('');
    setMessage('');

    try {
      await kuliApi.request('/me/notification-preferences', {
        method: 'PATCH',
        body: {
          pushEnabled,
          smsEnabled,
          emailEnabled,
          inAppEnabled: true,
          transactionalRequired: true
        }
      });
      setMessage('Notification preferences saved.');
    } catch (preferencesError) {
      setError(getErrorMessage(preferencesError));
    } finally {
      setPreferencesPending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.cardHeader}>
          <View style={styles.flex}>
            <Text style={styles.eyebrow}>{profile.role === 'client' ? '/client/notifications' : '/owner/notifications'}</Text>
            <Text style={styles.title}>Updates stay inside KULI.</Text>
          </View>
          <StatusPill tone={unreadCount ? 'warn' : 'ready'}>{unreadCount} unread</StatusPill>
        </View>

        <ShellCard title="Delivery preferences">
          <Text style={styles.muted}>In-app transactional alerts stay on. External channels can be toggled once providers are configured.</Text>
          {[
            { label: 'Push', value: pushEnabled, onPress: () => setPushEnabled((value) => !value) },
            { label: 'SMS', value: smsEnabled, onPress: () => setSmsEnabled((value) => !value) },
            { label: 'Email', value: emailEnabled, onPress: () => setEmailEnabled((value) => !value) }
          ].map((option) => (
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: option.value }}
              key={option.label}
              onPress={option.onPress}
              style={[styles.switchRow, option.value && styles.switchRowActive]}
            >
              <Text style={[styles.switchText, option.value && styles.switchTextActive]}>{option.label}</Text>
              <StatusPill tone={option.value ? 'ready' : 'warn'}>{option.value ? 'On' : 'Off'}</StatusPill>
            </Pressable>
          ))}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {message ? <Text style={styles.noticeText}>{message}</Text> : null}
          <Pressable accessibilityRole="button" disabled={preferencesPending} onPress={savePreferences} style={[styles.primaryButton, preferencesPending && styles.buttonDisabled]}>
            <Text style={styles.primaryButtonText}>{preferencesPending ? 'Saving...' : 'Save preferences'}</Text>
          </Pressable>
        </ShellCard>

        <ShellCard title="Notification center">
          {notificationsQuery.isError ? <Text style={styles.errorText}>{getErrorMessage(notificationsQuery.error)}</Text> : null}
          <Pressable accessibilityRole="button" onPress={() => notificationsQuery.refetch()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Refresh notifications</Text>
          </Pressable>
          {notifications.length === 0 ? <Text style={styles.muted}>No notifications yet. Offer, message, and status updates will appear here.</Text> : null}
          <View style={styles.roleGrid}>
            {notifications.map((notification) => (
              <View key={notification.id} style={styles.notificationRow}>
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{notification.title}</Text>
                  <Text style={styles.muted}>{notification.body}</Text>
                  <Text style={styles.muted}>{notification.type}{notification.createdAt ? ` / ${new Date(notification.createdAt).toLocaleString()}` : ''}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={notification.deliveryStatus === 'read' || pendingId === notification.id}
                  onPress={() => markRead(notification)}
                  style={[styles.compactButton, (notification.deliveryStatus === 'read' || pendingId === notification.id) && styles.buttonDisabled]}
                >
                  <Text style={styles.compactButtonText}>{notification.deliveryStatus === 'read' ? 'Read' : 'Mark read'}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </ShellCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function RatingReportPanel({ request }: { request: KuliRequest }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState('5');
  const [reviewText, setReviewText] = useState('');
  const [category, setCategory] = useState('damage');
  const [description, setDescription] = useState('');
  const [evidenceFileName, setEvidenceFileName] = useState('report-photo.jpg');
  const [evidenceMimeType, setEvidenceMimeType] = useState('image/jpeg');
  const [evidenceSizeBytes, setEvidenceSizeBytes] = useState('250000');
  const [pendingAction, setPendingAction] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const terminal = terminalRequestStatuses.includes(request.status);
  const canRate = ['completed', 'cancelled'].includes(request.status) && Boolean(request.selectedOwnerId);
  const canDisputePayment = ['completed', 'cancelled'].includes(request.status);

  const submitRating = async () => {
    const parsedRating = Number(rating);

    if (!canRate) {
      setError('Rating opens after a completed or owner-linked cancelled trip.');
      return;
    }

    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      setError('Choose a whole-number rating from 1 to 5.');
      return;
    }

    setPendingAction('rating');
    setError('');
    setMessage('');

    try {
      const result = (await kuliApi.request(`/kuli-requests/${request.id}/rating`, {
        method: 'POST',
        body: {
          rating: parsedRating,
          reviewText: reviewText.trim() || undefined
        }
      })) as ApiEnvelope<RatingRecord>;

      setMessage(`Rating saved: ${result.data.rating}/5.`);
      await queryClient.invalidateQueries({ queryKey: ['kuli-requests', 'mine'] });
    } catch (ratingError) {
      setError(getErrorMessage(ratingError));
    } finally {
      setPendingAction('');
    }
  };

  const disputePayment = async () => {
    if (!canDisputePayment) {
      setError('Payment disputes open after completion or cancellation.');
      return;
    }

    if (!description.trim()) {
      setError('Describe the payment issue before disputing.');
      return;
    }

    setPendingAction('dispute');
    setError('');
    setMessage('');

    try {
      const result = (await kuliApi.request(`/kuli-requests/${request.id}/payment/dispute`, {
        method: 'POST',
        body: {
          disputeReason: description.trim()
        }
      })) as ApiEnvelope<{ payment: PaymentRecord }>;

      setMessage(`Payment dispute recorded: ${result.data.payment.status}.`);
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (disputeError) {
      setError(getErrorMessage(disputeError));
    } finally {
      setPendingAction('');
    }
  };

  const createReport = async () => {
    if (!description.trim()) {
      setError('Report description is required.');
      return;
    }

    setPendingAction('report');
    setError('');
    setMessage('');

    try {
      const reportResult = (await kuliApi.request('/reports', {
        method: 'POST',
        body: {
          requestId: request.id,
          category,
          description: description.trim()
        }
      })) as ApiEnvelope<ReportRecord>;

      const parsedSize = Number(evidenceSizeBytes);
      let evidenceMessage = '';

      if (evidenceFileName.trim() && Number.isFinite(parsedSize) && parsedSize > 0) {
        try {
          const intent = (await kuliApi.request(`/reports/${reportResult.data.id}/evidence/upload-intent`, {
            method: 'POST',
            body: {
              originalFileName: evidenceFileName.trim(),
              mimeType: evidenceMimeType.trim(),
              sizeBytes: parsedSize
            }
          })) as ApiEnvelope<{ file: { id: string } }>;

          await kuliApi.request(`/reports/${reportResult.data.id}/evidence`, {
            method: 'POST',
            body: {
              fileId: intent.data.file.id
            }
          });
          evidenceMessage = ' Evidence attached.';
        } catch (evidenceError) {
          evidenceMessage = ` Evidence can be retried later: ${getErrorMessage(evidenceError)}`;
        }
      }

      setMessage(`Report ${reportResult.data.reportCode} created.${evidenceMessage}`);
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (reportError) {
      setError(getErrorMessage(reportError));
    } finally {
      setPendingAction('');
    }
  };

  return (
    <View style={styles.subsection}>
      <View style={styles.cardHeader}>
        <Text style={styles.fieldLabel}>Trust and payment</Text>
        <StatusPill tone={terminal ? 'ready' : 'warn'}>{terminal ? 'Terminal' : 'Trip active'}</StatusPill>
      </View>
      <Text style={styles.muted}>Ratings require a completed or owner-linked cancelled trip; cash disputes are accepted after completion or cancellation. Reports stay linked to this request.</Text>
      <View style={styles.inlineFields}>
        <Field containerStyle={styles.inlineField} label="Rating" value={rating} onChangeText={setRating} placeholder="1-5" keyboardType="numeric" />
        <Field containerStyle={styles.inlineField} label="Evidence size" value={evidenceSizeBytes} onChangeText={setEvidenceSizeBytes} placeholder="250000" keyboardType="numeric" />
      </View>
      <Field label="Review" value={reviewText} onChangeText={setReviewText} placeholder="Short public review after completion" />
      <View style={styles.roleGrid}>
        {reportCategories.map((option) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: category === option }}
            key={option}
            onPress={() => setCategory(option)}
            style={[styles.documentOption, category === option && styles.documentOptionSelected]}
          >
            <Text style={[styles.fieldLabel, category === option && styles.documentOptionSelectedText]}>{option.replaceAll('_', ' ')}</Text>
          </Pressable>
        ))}
      </View>
      <Field label="Report or dispute description" value={description} onChangeText={setDescription} placeholder="What happened?" />
      <View style={styles.inlineFields}>
        <Field containerStyle={styles.inlineField} label="Evidence file" value={evidenceFileName} onChangeText={setEvidenceFileName} placeholder="photo.jpg" />
        <Field containerStyle={styles.inlineField} label="MIME" value={evidenceMimeType} onChangeText={setEvidenceMimeType} placeholder="image/jpeg" />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {message ? <Text style={styles.noticeText}>{message}</Text> : null}
      <View style={styles.actionRow}>
        <Pressable accessibilityRole="button" disabled={!canRate || Boolean(pendingAction)} onPress={submitRating} style={[styles.primaryButton, styles.actionButton, (!canRate || Boolean(pendingAction)) && styles.buttonDisabled]}>
          <Text style={styles.primaryButtonText}>{pendingAction === 'rating' ? 'Saving...' : 'Rate'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={!canDisputePayment || Boolean(pendingAction)} onPress={disputePayment} style={[styles.secondaryButton, styles.actionButton, (!canDisputePayment || Boolean(pendingAction)) && styles.buttonDisabled]}>
          <Text style={styles.secondaryButtonText}>Dispute</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={Boolean(pendingAction)} onPress={createReport} style={[styles.secondaryButton, styles.actionButton, Boolean(pendingAction) && styles.buttonDisabled]}>
          <Text style={styles.secondaryButtonText}>{pendingAction === 'report' ? 'Reporting...' : 'Report'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ClientHistoryScreen({ profile }: { profile: UserProfile }) {
  const requestsQuery = useQuery({
    queryKey: ['kuli-requests', 'mine', 'history'],
    queryFn: async () => ((await kuliApi.request('/kuli-requests/mine')) as ApiEnvelope<KuliRequest[]>).data
  });

  const requests = requestsQuery.data ?? [];
  const terminalRequests = requests.filter((request) => terminalRequestStatuses.includes(request.status));

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>/client/history</Text>
        <Text style={styles.title}>Close the trust loop.</Text>
        <Text style={styles.copy}>Payment disputes, ratings, and reports stay attached to terminal KULI requests.</Text>
        <ShellCard title="Completed and cancelled requests">
          {requestsQuery.isError ? <Text style={styles.errorText}>{getErrorMessage(requestsQuery.error)}</Text> : null}
          {terminalRequests.length === 0 ? <Text style={styles.muted}>No terminal trips yet. Complete or cancel an accepted trip before rating or disputing payment.</Text> : null}
          <View style={styles.roleGrid}>
            {terminalRequests.map((request) => (
              <View key={request.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.flex}>
                    <Text style={styles.cardTitle}>{request.requestCode}</Text>
                    <Text style={styles.muted}>{request.pickupLocation?.addressText} to {request.destinationLocation?.addressText}</Text>
                  </View>
                  <StatusPill tone={statusTone(request.status)}>{statusLabels[request.status]}</StatusPill>
                </View>
                <Text style={styles.muted}>{request.quoteSnapshot?.currency ?? 'ETB'} {Number(request.quoteSnapshot?.totalEstimate ?? 0).toFixed(2)} / owner {request.selectedOwnerId || 'not assigned'}</Text>
                <RatingReportPanel request={request} />
              </View>
            ))}
          </View>
        </ShellCard>
        <Text style={styles.muted}>Signed in as {profile.fullName || profile.email}.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function OwnerEarningsScreen({ profile }: { profile: UserProfile }) {
  const queryClient = useQueryClient();
  const [pendingRequestId, setPendingRequestId] = useState('');
  const [amountConfirmed, setAmountConfirmed] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const requestsQuery = useQuery({
    queryKey: ['kuli-requests', 'mine', 'owner-earnings'],
    queryFn: async () => ((await kuliApi.request('/kuli-requests/mine')) as ApiEnvelope<KuliRequest[]>).data
  });

  const ratingsQuery = useQuery({
    queryKey: ['owners', profile.id, 'ratings'],
    queryFn: async () => ((await kuliApi.request(`/owners/${profile.id}/ratings`)) as ApiEnvelope<RatingRecord[]>).data
  });

  const completedRequests = (requestsQuery.data ?? []).filter((request) => request.status === 'completed');
  const ratings = ratingsQuery.data ?? [];
  const averageRating = ratings.length ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length : 0;

  const confirmPayment = async (request: KuliRequest) => {
    setPendingRequestId(request.id);
    setError('');
    setMessage('');

    try {
      const amount = Number(amountConfirmed || request.quoteSnapshot?.totalEstimate || 0);
      const result = (await kuliApi.request(`/kuli-requests/${request.id}/payment/confirm`, {
        method: 'POST',
        body: {
          amountConfirmed: Number.isFinite(amount) ? amount : undefined
        }
      })) as ApiEnvelope<{ payment: PaymentRecord; idempotentReplay?: boolean }>;

      setMessage(`Payment ${result.data.payment.status}: ${result.data.payment.currency} ${Number(result.data.payment.amountConfirmed ?? result.data.payment.amountExpected).toFixed(2)}.`);
      await queryClient.invalidateQueries({ queryKey: ['kuli-requests', 'mine', 'owner-earnings'] });
    } catch (paymentError) {
      setError(getErrorMessage(paymentError));
    } finally {
      setPendingRequestId('');
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>/owner/earnings</Text>
        <Text style={styles.title}>Confirm cash and watch trust.</Text>
        <ShellCard title="Rating summary">
          <View style={styles.metricGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{averageRating.toFixed(1)}</Text>
              <Text style={styles.metricLabel}>average</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{ratings.length}</Text>
              <Text style={styles.metricLabel}>ratings</Text>
            </View>
          </View>
          {ratingsQuery.isError ? <Text style={styles.errorText}>{getErrorMessage(ratingsQuery.error)}</Text> : null}
          {ratings.slice(0, 3).map((rating) => (
            <View key={rating.id} style={styles.requestRow}>
              <View style={styles.flex}>
                <Text style={styles.fieldLabel}>{rating.rating}/5</Text>
                <Text style={styles.muted}>{rating.reviewText || 'No written review.'}</Text>
              </View>
            </View>
          ))}
        </ShellCard>
        <ShellCard title="Cash confirmations">
          {requestsQuery.isError ? <Text style={styles.errorText}>{getErrorMessage(requestsQuery.error)}</Text> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {message ? <Text style={styles.noticeText}>{message}</Text> : null}
          <Field label="Override amount ETB" value={amountConfirmed} onChangeText={setAmountConfirmed} placeholder="Leave blank for estimate" keyboardType="numeric" />
          {completedRequests.length === 0 ? <Text style={styles.muted}>No completed trips yet. Payment confirmation is blocked until completion.</Text> : null}
          <View style={styles.roleGrid}>
            {completedRequests.map((request) => (
              <View key={request.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.flex}>
                    <Text style={styles.cardTitle}>{request.requestCode}</Text>
                    <Text style={styles.muted}>{request.quoteSnapshot?.currency ?? 'ETB'} {Number(request.quoteSnapshot?.totalEstimate ?? 0).toFixed(2)}</Text>
                  </View>
                  <StatusPill tone="ready">Completed</StatusPill>
                </View>
                <Pressable accessibilityRole="button" disabled={pendingRequestId === request.id} onPress={() => confirmPayment(request)} style={[styles.primaryButton, pendingRequestId === request.id && styles.buttonDisabled]}>
                  <Text style={styles.primaryButtonText}>{pendingRequestId === request.id ? 'Confirming...' : 'Confirm cash payment'}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </ShellCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function ClientTabs({ profile, onSignOut }: { profile: UserProfile; onSignOut: () => void }) {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home">{() => <ClientHomeScreen profile={profile} onSignOut={onSignOut} />}</Tab.Screen>
      <Tab.Screen name="Request" component={ClientQuoteScreen} />
      <Tab.Screen name="History">{() => <ClientHistoryScreen profile={profile} />}</Tab.Screen>
      <Tab.Screen name="Alerts">{() => <NotificationCenterScreen profile={profile} />}</Tab.Screen>
    </Tab.Navigator>
  );
}

function OwnerTabs({ profile, onSignOut }: { profile: UserProfile; onSignOut: () => void }) {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home">{() => <HomeOverview profile={profile} onSignOut={onSignOut} />}</Tab.Screen>
      <Tab.Screen name="Vehicles" component={OwnerVehiclesScreen} />
      <Tab.Screen name="Offers">{() => <OwnerOffersScreen profile={profile} />}</Tab.Screen>
      <Tab.Screen name="Alerts">{() => <NotificationCenterScreen profile={profile} />}</Tab.Screen>
      <Tab.Screen name="Earnings">{() => <OwnerEarningsScreen profile={profile} />}</Tab.Screen>
    </Tab.Navigator>
  );
}

function RuntimeReadiness() {
  const readinessItems = useMemo(
    () => [
      { label: 'API base URL', ready: runtimeReadiness.hasApiBaseUrl },
      { label: 'Supabase URL', ready: runtimeReadiness.hasSupabaseUrl },
      { label: 'Supabase anon key', ready: runtimeReadiness.hasSupabaseAnonKey },
      { label: 'Local demo auth', ready: runtimeReadiness.demoAuthEnabled }
    ],
    []
  );

  return (
    <ShellCard title="Runtime readiness">
      {readinessItems.map((item) => (
        <View key={item.label} style={styles.readinessRow}>
          <Text style={styles.readinessText}>{item.label}</Text>
          <StatusPill tone={item.ready ? 'ready' : 'blocked'}>{item.ready ? 'Set' : 'Missing'}</StatusPill>
        </View>
      ))}
    </ShellCard>
  );
}

function AppContent() {
  const query = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileMissing, setProfileMissing] = useState(false);

  const loadCurrentProfile = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setProfile(null);
    setProfileMissing(false);

    if (!nextSession) {
      setLoading(false);
      return;
    }

    try {
      const result = (await kuliApi.me()) as ApiEnvelope<UserProfile>;
      setProfile(result.data);
    } catch (error) {
      if ((error as { code?: string }).code === 'PROFILE_NOT_FOUND') {
        setProfileMissing(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        loadCurrentProfile(data.session);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      loadCurrentProfile(nextSession);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [loadCurrentProfile]);

  const handleAuthenticated = (nextProfile: UserProfile, nextSession: Session) => {
    setSession(nextSession);
    setProfile(nextProfile);
    setProfileMissing(false);
    setLoading(false);
  };

  const handleSignOut = async () => {
    clearDemoAccessToken();
    await supabase.auth.signOut();
    query.clear();
    setSession(null);
    setProfile(null);
    setProfileMissing(false);
  };

  if (loading) {
    return <SessionLoadingScreen />;
  }

  if (!session) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  if (profileMissing) {
    return <ProfileRequiredScreen session={session} onAuthenticated={handleAuthenticated} onSignOut={handleSignOut} />;
  }

  if (!profile) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  if (isBlockedStatus(profile.accountStatus)) {
    return <AccountBlockedScreen profile={profile} onSignOut={handleSignOut} />;
  }

  if (!['client', 'truck_owner'].includes(profile.role)) {
    return <ForbiddenScreen profile={profile} onSignOut={handleSignOut} />;
  }

  return (
    <NavigationContainer>
      {profile.role === 'client' ? <ClientTabs profile={profile} onSignOut={handleSignOut} /> : <OwnerTabs profile={profile} onSignOut={handleSignOut} />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const tabScreenOptions = {
  headerStyle: { backgroundColor: colors.primaryDeep },
  headerTintColor: '#fffaf0',
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.muted,
  tabBarStyle: {
    minHeight: 62,
    paddingTop: 6,
    paddingBottom: 8,
    borderTopColor: colors.line
  }
};

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  screen: {
    flex: 1,
    backgroundColor: colors.canvas
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.lg
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase'
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38
  },
  copy: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24
  },
  segmented: {
    backgroundColor: '#e7ddcf',
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: radii.sm,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46
  },
  segmentButtonActive: {
    backgroundColor: colors.primaryDeep
  },
  segmentText: {
    color: colors.primaryDeep,
    fontSize: 15,
    fontWeight: '800'
  },
  segmentTextActive: {
    color: '#fffaf0'
  },
  roleGrid: {
    gap: spacing.sm
  },
  roleOption: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    minHeight: 86,
    padding: spacing.md
  },
  roleOptionSelected: {
    backgroundColor: colors.primaryDeep,
    borderColor: colors.primaryDeep
  },
  roleOptionTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900'
  },
  roleOptionTitleSelected: {
    color: '#fffaf0'
  },
  roleOptionText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  roleOptionTextSelected: {
    color: '#f0dcc0'
  },
  documentOption: {
    backgroundColor: '#fffdf7',
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.sm
  },
  documentOptionSelected: {
    backgroundColor: colors.primaryDeep,
    borderColor: colors.primaryDeep
  },
  documentOptionSelectedText: {
    color: '#fffaf0'
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  primaryButtonText: {
    color: '#fffaf0',
    fontSize: 15,
    fontWeight: '800'
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800'
  },
  buttonDisabled: {
    opacity: 0.55
  },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '800'
  },
  muted: {
    color: colors.muted,
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20
  },
  errorText: {
    color: colors.red,
    fontSize: 14,
    fontWeight: '700'
  },
  noticeText: {
    color: colors.primaryDeep,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20
  },
  field: {
    gap: spacing.xs
  },
  fieldLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800'
  },
  input: {
    backgroundColor: '#fffdf7',
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  inlineFields: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  inlineField: {
    flex: 1
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: spacing.xs
  },
  switchRow: {
    alignItems: 'center',
    backgroundColor: '#fffdf7',
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  switchRowActive: {
    borderColor: colors.primary,
    backgroundColor: '#eef5ef'
  },
  switchText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800'
  },
  switchTextActive: {
    color: colors.primaryDeep
  },
  priceBox: {
    backgroundColor: '#fffdf7',
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.sm
  },
  priceLine: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  priceValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800'
  },
  candidateCard: {
    backgroundColor: '#fffdf7',
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.sm
  },
  selectableSurface: {
    borderColor: 'transparent',
    borderRadius: radii.sm,
    borderWidth: 2
  },
  selectableSurfaceActive: {
    borderColor: colors.primary
  },
  requestRow: {
    alignItems: 'center',
    backgroundColor: '#fffdf7',
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 62,
    padding: spacing.sm
  },
  subsection: {
    backgroundColor: '#fffdf7',
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.sm
  },
  tripWorkspace: {
    gap: spacing.sm
  },
  timelineRow: {
    alignItems: 'flex-start',
    backgroundColor: '#f1eadf',
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm
  },
  compactButton: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: radii.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: spacing.sm
  },
  compactButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800'
  },
  messageList: {
    gap: spacing.xs
  },
  messageBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1eadf',
    borderRadius: radii.sm,
    maxWidth: '92%',
    padding: spacing.sm
  },
  messageBubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primaryDeep
  },
  messageBody: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20
  },
  messageBodyMine: {
    color: '#fffaf0'
  },
  messageMeta: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4
  },
  notificationRow: {
    alignItems: 'center',
    backgroundColor: '#fffdf7',
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 76,
    padding: spacing.sm
  },
  metricGrid: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  metricBox: {
    backgroundColor: '#f1eadf',
    borderRadius: radii.sm,
    flex: 1,
    minHeight: 62,
    justifyContent: 'center',
    padding: spacing.sm
  },
  metricValue: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900'
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  emptyState: {
    backgroundColor: '#fffdf7',
    borderColor: colors.amber,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  pill: {
    borderRadius: radii.sm,
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm
  },
  pillReady: {
    backgroundColor: colors.green
  },
  pillWarn: {
    backgroundColor: colors.amber
  },
  pillBlocked: {
    backgroundColor: colors.red
  },
  pillText: {
    color: '#fffaf0',
    fontSize: 12,
    fontWeight: '800'
  },
  readinessRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  readinessText: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: '700'
  }
});
