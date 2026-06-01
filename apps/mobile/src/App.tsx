import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';

import { clearDemoAccessToken, kuliApi, setDemoAccessToken } from './lib/api';
import { supabase } from './lib/supabase';
import { runtimeConfig, runtimeReadiness } from './config/runtime';
import { colors, radii, spacing } from './theme';
import { BottomTabIcon } from './components/navigation/BottomTabIcon';
import { AppHeader } from './components/ui/AppHeader';
import { Card as UiCard } from './components/ui/Card';
import { EmptyState } from './components/ui/EmptyState';
import { ErrorState } from './components/ui/ErrorState';
import { LoadingState } from './components/ui/LoadingState';
import { PrimaryButton } from './components/ui/PrimaryButton';
import { Screen } from './components/ui/Screen';
import { SecondaryButton } from './components/ui/SecondaryButton';
import { SectionHeader } from './components/ui/SectionHeader';
import { StatusBadge } from './components/ui/StatusBadge';

type Role = 'client' | 'truck_owner' | 'assistant' | 'admin';
type AccountStatus = 'active' | 'pending_verification' | 'suspended' | 'banned' | 'deleted';
type AuthMode = 'login' | 'register' | 'forgot';
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
  request?: KuliRequest;
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
  payment?: PaymentRecord;
  selectedVehicleLocation?: QuoteLocation;
  selectedVehicleLocationUpdatedAt?: string;
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
  senderDisplayName?: string;
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
type PickedFile = {
  uri?: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  source: 'camera' | 'library';
};

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

const documentTypes: Array<{ type: VehicleDocumentType; label: string; detail: string; required: boolean; tips: string[] }> = [
  {
    type: 'identity',
    label: 'Identity',
    detail: 'Owner identification document.',
    required: true,
    tips: ['Full name and ID number visible', 'No cropped edges']
  },
  {
    type: 'driver_license',
    label: 'Driver license',
    detail: 'Valid license for the driver/owner.',
    required: true,
    tips: ['License number and expiry visible', 'Upload the current valid card']
  },
  {
    type: 'vehicle_registration',
    label: 'Registration certificate',
    detail: 'Vehicle registration document.',
    required: true,
    tips: ['Plate number must match this vehicle', 'All registration fields readable']
  },
  {
    type: 'ownership_proof',
    label: 'Ownership proof',
    detail: 'Proof that the owner can operate this truck.',
    required: true,
    tips: ['Owner/operator name visible', 'Attach authorization if not the registered owner']
  },
  {
    type: 'insurance',
    label: 'Insurance',
    detail: 'Insurance where available.',
    required: false,
    tips: ['Policy must be current', 'Plate or vehicle details should match']
  }
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

function StatusPill({ tone, children }: { tone: 'ready' | 'warn' | 'blocked'; children: ReactNode }) {
  return (
    <View style={[styles.pill, tone === 'ready' && styles.pillReady, tone === 'warn' && styles.pillWarn, tone === 'blocked' && styles.pillBlocked]}>
      <Text style={[styles.pillText, tone === 'ready' && styles.pillTextReady, tone === 'warn' && styles.pillTextWarn, tone === 'blocked' && styles.pillTextBlocked]}>{children}</Text>
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
    <UiCard style={styles.authCard}>
      <View style={styles.cardHeader}>
        <SectionHeader eyebrow="Diagnostics" title="API connection" description={message} style={styles.flex} />
        <StatusBadge tone={state === 'ready' ? 'success' : state === 'blocked' ? 'error' : 'warning'}>
          {state === 'ready' ? 'Ready' : state === 'blocked' ? 'Check API' : state === 'checking' ? 'Checking' : 'Idle'}
        </StatusBadge>
      </View>
      <SecondaryButton label="Check health" onPress={checkHealth} />
    </UiCard>
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

function AuthBrandPanel({ mode }: { mode: AuthMode }) {
  return (
    <View style={styles.authHero}>
      <View style={styles.authLogoMark}>
        <Text style={styles.authLogoText}>KULI</Text>
      </View>
      <Text style={styles.authHeroTitle}>
        {mode === 'register' ? 'Create your KULI account.' : mode === 'forgot' ? 'Recover access securely.' : 'Move with verified trucks.'}
      </Text>
      <Text style={styles.authHeroCopy}>
        {mode === 'forgot'
          ? 'Enter your email and Supabase will send a secure password reset link.'
          : 'Book, verify, accept, and track logistics work with backend-confirmed KULI profiles.'}
      </Text>
      {runtimeConfig.demoAuthEnabled ? <StatusBadge tone="warning">Local demo mode</StatusBadge> : null}
    </View>
  );
}

function AuthModeTabs({ mode, onChange }: { mode: AuthMode; onChange: (mode: AuthMode) => void }) {
  return (
    <View style={styles.authTabs}>
      <Pressable accessibilityRole="button" onPress={() => onChange('login')} style={[styles.authTab, mode === 'login' && styles.authTabActive]}>
        <Text style={[styles.authTabText, mode === 'login' && styles.authTabTextActive]}>Login</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => onChange('register')} style={[styles.authTab, mode === 'register' && styles.authTabActive]}>
        <Text style={[styles.authTabText, mode === 'register' && styles.authTabTextActive]}>Register</Text>
      </Pressable>
    </View>
  );
}

function AuthMessage({ tone, message }: { tone: 'notice' | 'error'; message: string }) {
  return (
    <View style={[styles.authMessage, tone === 'error' ? styles.authMessageError : styles.authMessageNotice]}>
      <Text style={[styles.authMessageText, tone === 'error' ? styles.authMessageTextError : styles.authMessageTextNotice]}>{message}</Text>
    </View>
  );
}

function FilePickerField({
  label,
  value,
  onChange,
  emptyText = 'Attach a clear photo when it helps support review the issue.',
  emptyTone = 'warn',
  uploadLabel = 'Upload photo',
  takeLabel = 'Take picture'
}: {
  label: string;
  value: PickedFile | null;
  onChange: (file: PickedFile | null) => void;
  emptyText?: string;
  emptyTone?: 'ready' | 'warn' | 'blocked';
  uploadLabel?: string;
  takeLabel?: string;
}) {
  const [error, setError] = useState('');

  const pickFile = async (source: PickedFile['source']) => {
    setError('');

    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setError(source === 'camera' ? 'Camera permission is needed to take a picture.' : 'Photo library permission is needed to upload an image.');
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              allowsEditing: false,
              quality: 0.85
            })
          : await ImagePicker.launchImageLibraryAsync({
              allowsEditing: false,
              mediaTypes: ['images'],
              quality: 0.85
            });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      onChange(normalizePickedAsset(result.assets[0], source));
    } catch (pickError) {
      setError(getErrorMessage(pickError));
    }
  };

  return (
    <View style={styles.subsection}>
      <View style={styles.cardHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {value ? <StatusPill tone="ready">{value.source === 'camera' ? 'Camera' : 'Upload'}</StatusPill> : <StatusPill tone={emptyTone}>Pending</StatusPill>}
      </View>
      {value ? (
        <View style={styles.fileSummary}>
          <Text style={styles.fieldLabel}>{value.name}</Text>
          <Text style={styles.muted}>{value.mimeType} / {Math.max(1, Math.round(value.sizeBytes / 1024))} KB</Text>
        </View>
      ) : (
        <Text style={styles.muted}>{emptyText}</Text>
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.actionRow}>
        <Pressable accessibilityRole="button" onPress={() => pickFile('library')} style={[styles.secondaryButton, styles.actionButton]}>
          <Text style={styles.secondaryButtonText}>{uploadLabel}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => pickFile('camera')} style={[styles.secondaryButton, styles.actionButton]}>
          <Text style={styles.secondaryButtonText}>{takeLabel}</Text>
        </Pressable>
        {value ? (
          <Pressable accessibilityRole="button" onPress={() => onChange(null)} style={[styles.secondaryButton, styles.actionButton]}>
            <Text style={styles.secondaryButtonText}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
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
  const [resetPending, setResetPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const isLogin = mode === 'login';
  const isRegister = mode === 'register';
  const normalizedEmail = email.trim().toLowerCase();
  const canSubmit = runtimeConfig.demoAuthEnabled
    ? Boolean(normalizedEmail) && (isLogin || (isRegister && Boolean(fullName.trim())))
    : Boolean(normalizedEmail) && password.length >= 6 && (isLogin || (isRegister && Boolean(fullName.trim())));
  const canResetPassword = !resetPending;

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
    setNotice('');
  };

  const loadProfile = async (session: Session) => {
    const profile = (await kuliApi.me()) as ApiEnvelope<UserProfile>;
    onAuthenticated(profile.data, session);
  };

  const sendPasswordReset = async () => {
    if (resetPending) {
      return;
    }

    setError('');
    setNotice('');

    if (!normalizedEmail) {
      setError('Enter the email address for your KULI account.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    if (!runtimeReadiness.hasSupabaseUrl || !runtimeReadiness.hasSupabaseAnonKey) {
      setError('Supabase is not configured for password recovery in this environment.');
      return;
    }

    setResetPending(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail);

      if (resetError) {
        throw resetError;
      }

      setNotice('Password reset email sent. Open the Supabase link from your inbox, then return to sign in.');
    } catch (resetError) {
      setError(getErrorMessage(resetError));
    } finally {
      setResetPending(false);
    }
  };

  const startDemoProfile = async (demoRole: PublicRole, options: { preserveExistingRole?: boolean } = {}) => {
    if (!runtimeConfig.demoAuthEnabled || pending) {
      return;
    }

    setPending(true);
    setError('');
    setNotice('');

    try {
      const suffix = normalizedEmail
        ? normalizedEmail.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 42)
        : Date.now().toString(36);
      const result = (await kuliApi.request('/dev/demo-profile', {
        method: 'POST',
        body: {
          role: demoRole,
          suffix,
          fullName: fullName.trim() || (options.preserveExistingRole ? undefined : demoRole === 'client' ? `Demo Client ${suffix}` : `Demo Owner ${suffix}`),
          email: normalizedEmail || `${demoRole}-${suffix}@demo.kuli.local`,
          phone: phone.trim() || undefined,
          preserveExistingRole: Boolean(options.preserveExistingRole)
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
      await startDemoProfile(mode === 'register' ? role : 'client', {
        preserveExistingRole: mode === 'login'
      });
      return;
    }

    setPending(true);
    setError('');
    setNotice('');

    try {
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
        <ScrollView contentContainerStyle={styles.authContent}>
          <AuthBrandPanel mode={mode} />

          {mode !== 'forgot' ? <AuthModeTabs mode={mode} onChange={changeMode} /> : null}

          {mode === 'forgot' ? (
            <UiCard style={styles.authCard}>
              <AppHeader
                eyebrow="Account recovery"
                title="Reset your password."
                subtitle="We will send a secure reset link to the email on your KULI account."
              />
              <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
              {error ? <AuthMessage tone="error" message={error} /> : null}
              {notice ? <AuthMessage tone="notice" message={notice} /> : null}
              <PrimaryButton disabled={!canResetPassword} label={resetPending ? 'Sending...' : 'Send reset email'} loading={resetPending} onPress={sendPasswordReset} />
              <SecondaryButton label="Back to login" onPress={() => changeMode('login')} />
            </UiCard>
          ) : (
            <>
              {mode === 'register' ? (
                <View style={styles.roleGrid}>
                  <RoleOption role="client" selected={role === 'client'} onPress={() => setRole('client')} />
                  <RoleOption role="truck_owner" selected={role === 'truck_owner'} onPress={() => setRole('truck_owner')} />
                </View>
              ) : null}

              <UiCard style={styles.authCard}>
                <SectionHeader
                  eyebrow={mode === 'login' ? 'Secure sign in' : 'Public registration'}
                  title={mode === 'login' ? 'Use your KULI account.' : 'Tell us who is moving.'}
                  description={
                    mode === 'login'
                      ? 'Your role and dashboard are loaded from the backend profile after authentication.'
                      : 'Clients and truck owners can self-register. Staff accounts stay on the admin dashboard.'
                  }
                />
                {mode === 'register' ? <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Abebe Bekele" /> : null}
                <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
                {mode === 'register' ? <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="+251911000000" keyboardType="phone-pad" /> : null}
                <Field label="Password" value={password} onChangeText={setPassword} placeholder="Minimum 6 characters" secureTextEntry />
                {mode === 'login' ? (
                  <Pressable accessibilityRole="button" onPress={() => changeMode('forgot')} style={styles.authInlineLink}>
                    <Text style={styles.authInlineLinkText}>Forgot password?</Text>
                  </Pressable>
                ) : null}
                {error ? <AuthMessage tone="error" message={error} /> : null}
                {notice ? <AuthMessage tone="notice" message={notice} /> : null}
                <PrimaryButton
                  disabled={!canSubmit || pending}
                  label={pending ? 'Working...' : mode === 'login' ? 'Login' : 'Create account'}
                  loading={pending}
                  onPress={submit}
                />
              </UiCard>

              {verificationDraft ? (
                <UiCard style={styles.authCard}>
                  <SectionHeader
                    eyebrow="Email confirmation"
                    title="Confirm your email."
                    description="Enter the confirmation code from your email. If Supabase sent a link instead, open that link, then return and sign in."
                  />
                  <Text style={styles.muted}>{verificationDraft.email}</Text>
                  <Field label="Confirmation code" value={verificationCode} onChangeText={setVerificationCode} placeholder="6-digit code" keyboardType="numeric" />
                  <View style={styles.actionRow}>
                    <PrimaryButton
                      disabled={!verificationCode.trim() || verificationPending}
                      label={verificationPending ? 'Checking...' : 'Verify'}
                      loading={verificationPending}
                      onPress={verifyEmailCode}
                      style={styles.actionButton}
                    />
                    <SecondaryButton disabled={verificationPending} label="Resend" onPress={() => resendConfirmation()} style={styles.actionButton} />
                  </View>
                </UiCard>
              ) : null}

              {runtimeConfig.demoAuthEnabled ? (
                <UiCard style={styles.authCard}>
                  <SectionHeader
                    eyebrow="Development only"
                    title="Local demo access"
                    description="Explore KULI without Supabase email verification. Demo profiles use local dev tokens."
                  />
                  <View style={styles.actionRow}>
                    <SecondaryButton disabled={pending} label="Demo client" onPress={() => startDemoProfile('client')} style={styles.actionButton} />
                    <PrimaryButton disabled={pending} label="Demo owner" onPress={() => startDemoProfile('truck_owner')} style={styles.actionButton} />
                  </View>
                </UiCard>
              ) : null}
            </>
          )}

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

const emptyDocumentDrafts = () =>
  Object.fromEntries(documentTypes.map((documentType) => [documentType.type, null])) as Record<VehicleDocumentType, PickedFile | null>;

function DocumentUploadField({
  vehicle,
  onUploaded
}: {
  vehicle: Vehicle;
  onUploaded: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<VehicleDocumentType, PickedFile | null>>(emptyDocumentDrafts);
  const [pendingType, setPendingType] = useState<VehicleDocumentType | 'all' | ''>('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const documents = vehicle.documents ?? [];
  const latestDocumentByType = useMemo(
    () =>
      documentTypes.reduce(
        (accumulator, documentType) => ({
          ...accumulator,
          [documentType.type]: documents.find((document) => document.type === documentType.type)
        }),
        {} as Partial<Record<VehicleDocumentType, VehicleDocument>>
      ),
    [documents]
  );
  const requiredTypes = documentTypes.filter((documentType) => documentType.required).map((documentType) => documentType.type);
  const completedRequiredCount = requiredTypes.filter((documentType) => latestDocumentByType[documentType] || drafts[documentType]).length;
  const readyDraftCount = documentTypes.filter((documentType) => drafts[documentType.type]).length;

  const setDraft = (documentType: VehicleDocumentType, file: PickedFile | null) => {
    setDrafts((current) => ({
      ...current,
      [documentType]: file
    }));
    setError('');
    setMessage('');
  };

  const uploadDocument = async (documentType: VehicleDocumentType) => {
    const file = drafts[documentType];

    if (!file) {
      throw new Error(`Choose a clear ${documentTypes.find((entry) => entry.type === documentType)?.label ?? 'document'} photo first.`);
    }

    const intent = (await kuliApi.request('/files/upload-intent', {
      method: 'POST',
      body: {
        vehicleId: vehicle.id,
        type: documentType,
        originalFileName: file.name,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes
      }
    })) as ApiEnvelope<{ file: { id: string }; upload: { url: string; method?: string } }>;

    if (intent.data.upload.url.startsWith('http')) {
      if (!file.uri) {
        throw new Error(`Could not read ${file.name} for upload. Choose the file again.`);
      }

      const fileResponse = await fetch(file.uri);
      const fileBlob = await fileResponse.blob();
      const uploadResponse = await fetch(intent.data.upload.url, {
        method: intent.data.upload.method ?? 'PUT',
        headers: {
          'content-type': file.mimeType
        },
        body: fileBlob
      });

      if (!uploadResponse.ok) {
        throw new Error(`Storage upload failed for ${file.name}.`);
      }
    }

    await kuliApi.request(`/files/${intent.data.file.id}/complete`, {
      method: 'POST',
      body: {
        uploadedSizeBytes: file.sizeBytes
      }
    });

    await kuliApi.request(`/vehicles/${vehicle.id}/documents`, {
      method: 'POST',
      body: {
        type: documentType,
        fileId: intent.data.file.id
      }
    });

    setDraft(documentType, null);
  };

  const submitOne = async (documentType: VehicleDocumentType) => {
    setPending(true);
    setPendingType(documentType);
    setError('');
    setMessage('');

    try {
      await uploadDocument(documentType);
      const label = documentTypes.find((entry) => entry.type === documentType)?.label ?? 'Document';
      setMessage(`${label} attached for admin review.`);
      onUploaded();
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setPending(false);
      setPendingType('');
    }
  };

  const submitReadyDocuments = async () => {
    const missingRequiredTypes = requiredTypes.filter((documentType) => !latestDocumentByType[documentType] && !drafts[documentType]);
    const readyTypes = documentTypes.map((documentType) => documentType.type).filter((documentType) => drafts[documentType]);

    if (missingRequiredTypes.length > 0) {
      setError(`Add ${missingRequiredTypes.map((documentType) => documentTypes.find((entry) => entry.type === documentType)?.label).join(', ')} before submitting for review.`);
      return;
    }

    if (readyTypes.length === 0) {
      setMessage('All required documents already have an uploaded record.');
      return;
    }

    setPending(true);
    setPendingType('all');
    setError('');
    setMessage('');

    try {
      for (const documentType of readyTypes) {
        await uploadDocument(documentType);
      }

      setMessage(`${readyTypes.length} document${readyTypes.length === 1 ? '' : 's'} attached for admin review.`);
      onUploaded();
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setPending(false);
      setPendingType('');
    }
  };

  return (
    <ShellCard title="Document upload">
      <View style={styles.documentUploadHeader}>
        <View style={styles.flex}>
          <Text style={styles.muted}>Attach every required vehicle document with a clear image from your library or camera. KULI uses the selected file's real name, MIME type, and size for review metadata.</Text>
          <Text style={styles.noticeText}>{completedRequiredCount}/{requiredTypes.length} required documents ready</Text>
        </View>
        <StatusPill tone={completedRequiredCount === requiredTypes.length ? 'ready' : 'warn'}>
          {completedRequiredCount === requiredTypes.length ? 'Ready' : 'Missing'}
        </StatusPill>
      </View>
      <View style={styles.documentProgressTrack}>
        <View style={[styles.documentProgressFill, { width: `${Math.round((completedRequiredCount / requiredTypes.length) * 100)}%` }]} />
      </View>
      <View style={styles.roleGrid}>
        {documentTypes.map((doc) => {
          const draft = drafts[doc.type];
          const existingDocument = latestDocumentByType[doc.type];
          const uploaded = Boolean(existingDocument);
          const ready = Boolean(draft);
          const pendingThis = pending && (pendingType === doc.type || pendingType === 'all');

          return (
            <View key={doc.type} style={[styles.documentUploadCard, uploaded && styles.documentUploadCardUploaded, ready && styles.documentUploadCardReady]}>
              <View style={styles.cardHeader}>
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{doc.label}</Text>
                  <Text style={styles.muted}>{doc.detail}</Text>
                </View>
                <StatusPill tone={uploaded || ready ? 'ready' : doc.required ? 'blocked' : 'warn'}>
                  {uploaded ? 'Uploaded' : ready ? 'Ready' : doc.required ? 'Required' : 'Optional'}
                </StatusPill>
              </View>
              <View style={styles.documentGuidelineGrid}>
                {doc.tips.map((tip) => (
                  <Text key={tip} style={styles.documentGuideline}>- {tip}</Text>
                ))}
              </View>
              {existingDocument ? (
                <View style={styles.fileSummary}>
                  <Text style={styles.fieldLabel}>Latest upload</Text>
                  <Text style={styles.muted}>{existingDocument.status} / file {existingDocument.fileId.slice(-8)}</Text>
                </View>
              ) : null}
              {draft ? (
                <View style={styles.fileSummary}>
                  <Text style={styles.fieldLabel}>{draft.name}</Text>
                  <Text style={styles.muted}>{draft.mimeType} / {Math.max(1, Math.round(draft.sizeBytes / 1024))} KB / {draft.source === 'camera' ? 'Camera' : 'Library'}</Text>
                </View>
              ) : null}
              <FilePickerField
                label={`${doc.label} file`}
                value={draft}
                onChange={(file) => setDraft(doc.type, file)}
                emptyText={doc.required ? 'Required for admin verification. Use a clear, original document image.' : 'Optional, but useful where an insurance policy is available.'}
                emptyTone={doc.required ? 'blocked' : 'warn'}
                uploadLabel="Upload"
                takeLabel="Camera"
              />
              <Pressable
                accessibilityRole="button"
                disabled={!draft || pendingThis}
                onPress={() => submitOne(doc.type)}
                style={[styles.primaryButton, (!draft || pendingThis) && styles.buttonDisabled]}
              >
                <Text style={styles.primaryButtonText}>{pendingThis ? 'Attaching...' : uploaded ? 'Replace document' : 'Attach document'}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {message ? <Text style={styles.noticeText}>{message}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={pending || readyDraftCount === 0}
        onPress={submitReadyDocuments}
        style={[styles.primaryButton, (pending || readyDraftCount === 0) && styles.buttonDisabled]}
      >
        <Text style={styles.primaryButtonText}>{pendingType === 'all' ? 'Submitting...' : `Submit ready documents (${readyDraftCount})`}</Text>
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
            vehicle={activeVehicle}
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

type AddisLocationOption = {
  key: string;
  label: string;
  area: string;
  detail: string;
  lon: string;
  lat: string;
};

const addisLocationOptions: AddisLocationOption[] = [
  { key: 'bole-medhanialem', label: 'Bole Medhanialem', area: 'Bole', detail: 'Airport, hotels, offices', lon: '38.7903', lat: '8.9806' },
  { key: 'bole-atlas', label: 'Atlas', area: 'Bole', detail: 'Restaurants and apartments', lon: '38.7848', lat: '9.0002' },
  { key: 'piassa', label: 'Piassa', area: 'Arada', detail: 'Central market streets', lon: '38.7578', lat: '9.0350' },
  { key: 'merkato', label: 'Merkato', area: 'Addis Ketema', detail: 'Bulk goods and retail', lon: '38.7352', lat: '9.0347' },
  { key: 'mexico-square', label: 'Mexico Square', area: 'Kirkos', detail: 'Offices and main roads', lon: '38.7468', lat: '9.0109' },
  { key: 'kazanchis', label: 'Kazanchis', area: 'Kirkos', detail: 'Hotels and apartments', lon: '38.7670', lat: '9.0182' },
  { key: 'megenagna', label: 'Megenagna', area: 'Yeka', detail: 'Transit and business area', lon: '38.8025', lat: '9.0247' },
  { key: 'cmc', label: 'CMC', area: 'Yeka', detail: 'Residential compounds', lon: '38.8401', lat: '9.0188' },
  { key: 'saris', label: 'Saris', area: 'Akaky Kaliti', detail: 'Industrial and warehouses', lon: '38.7689', lat: '8.9408' },
  { key: 'kality', label: 'Kality', area: 'Akaky Kaliti', detail: 'Warehouses and logistics', lon: '38.7824', lat: '8.8945' },
  { key: 'lafto', label: 'Lafto', area: 'Nifas Silk-Lafto', detail: 'Residential moves', lon: '38.7205', lat: '8.9671' },
  { key: 'jemo', label: 'Jemo', area: 'Nifas Silk-Lafto', detail: 'Condos and homes', lon: '38.6867', lat: '8.9417' },
  { key: 'kolfe', label: 'Kolfe', area: 'Kolfe Keranio', detail: 'West-side neighborhoods', lon: '38.6907', lat: '9.0288' },
  { key: 'ayat', label: 'Ayat', area: 'Bole', detail: 'East-side homes', lon: '38.8842', lat: '9.0165' },
  { key: 'goro', label: 'Goro', area: 'Bole', detail: 'Residential and airport side', lon: '38.8211', lat: '8.9644' }
];

const getLocationOption = (key: string) => addisLocationOptions.find((option) => option.key === key) ?? addisLocationOptions[0];

const formatLocationAddress = (option: AddisLocationOption) => `${option.label}, ${option.area}, Addis Ababa`;

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fromDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDateLabel = (dateKey: string) =>
  fromDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

const formatTimeLabel = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  });
};

const pickupTimeSlots = Array.from({ length: 57 }, (_, index) => {
  const totalMinutes = 5 * 60 + index * 15;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

const formatPickupWindow = (dateKey: string, time: string) => `${formatDateLabel(dateKey)} at ${formatTimeLabel(time)}`;

const parsePositiveNumber = (value: string, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const createIdempotencyKey = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const activeRequestStatuses = ['pending', 'accepted', 'en_route_to_pickup', 'arrived_at_pickup', 'loading', 'in_transit', 'unloading'];
const terminalRequestStatuses = ['completed', 'cancelled', 'timed_out'];
const paymentSettlingStatuses = ['pending', 'disputed'];
const paymentClosedStatuses = ['confirmed_by_owner', 'resolved', 'cancelled'];
const ownerForwardStatuses: KuliStatus[] = ['en_route_to_pickup', 'arrived_at_pickup', 'loading', 'in_transit', 'unloading', 'completed'];
const reportCategories = ['overcharge', 'no_show', 'misconduct', 'damage', 'safety', 'platform_issue', 'other'];
const reportCategoryLabels: Record<string, string> = {
  overcharge: 'Price or cash issue',
  no_show: 'No-show',
  misconduct: 'Conduct issue',
  damage: 'Damage',
  safety: 'Safety concern',
  platform_issue: 'App or booking issue',
  other: 'Something else'
};
const cancellationReasons = [
  { key: 'plans_changed', label: 'Plans changed', detail: 'I no longer need this move.' },
  { key: 'wrong_location_or_time', label: 'Wrong pickup or time', detail: 'The request details need correction.' },
  { key: 'owner_taking_too_long', label: 'Truck is taking too long', detail: 'The accepted truck is delayed.' },
  { key: 'made_other_arrangement', label: 'Found another option', detail: 'I arranged the move another way.' },
  { key: 'safety_or_contact_issue', label: 'Safety or contact issue', detail: 'Something feels wrong or I cannot reach the owner.' }
];
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

const isPaymentSettlingRequest = (request: KuliRequest) =>
  request.status === 'completed' && (!request.payment || paymentSettlingStatuses.includes(request.payment.status));

const isPaymentClosedRequest = (request: KuliRequest) =>
  request.status === 'completed' && Boolean(request.payment && paymentClosedStatuses.includes(request.payment.status));

const normalizePickedAsset = (asset: ImagePicker.ImagePickerAsset, source: PickedFile['source']): PickedFile => {
  const extension = asset.uri?.split('.').pop()?.split('?')[0];
  const fallbackName = `${source}-evidence-${Date.now()}${extension ? `.${extension}` : '.jpg'}`;

  return {
    uri: asset.uri,
    name: asset.fileName || fallbackName,
    mimeType: asset.mimeType || 'image/jpeg',
    sizeBytes: asset.fileSize && asset.fileSize > 0 ? asset.fileSize : 250000,
    source
  };
};

function PriceLine({ label, value, currency }: { label: string; value: number; currency: string }) {
  return (
    <View style={styles.priceLine}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.priceValue}>{currency} {value.toFixed(2)}</Text>
    </View>
  );
}

function StarRating({ value, compact = false }: { value: number; compact?: boolean }) {
  const normalized = Math.max(0, Math.min(5, value));

  return (
    <View style={styles.candidateStarRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Text key={star} style={[styles.candidateStar, compact && styles.candidateStarCompact, normalized >= star && styles.candidateStarFilled]}>
          {normalized >= star ? '★' : '☆'}
        </Text>
      ))}
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
          <StarRating value={candidate.rating} compact />
        </View>
        <StatusPill tone="ready">{candidate.distanceKm}km</StatusPill>
      </View>
      <View style={styles.metricGrid}>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>{candidate.rating.toFixed(1)}</Text>
          <Text style={styles.metricLabel}>owner rating</Text>
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

function LocationDropdown({
  label,
  selectedKey,
  onSelect,
  avoidKey
}: {
  label: string;
  selectedKey: string;
  onSelect: (option: AddisLocationOption) => void;
  avoidKey?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = getLocationOption(selectedKey);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable accessibilityRole="button" onPress={() => setOpen((value) => !value)} style={styles.locationSelectButton}>
        <View style={styles.flex}>
          <Text style={styles.locationSelectTitle}>{selected.label}</Text>
          <Text style={styles.muted}>{selected.area} / {selected.detail}</Text>
        </View>
        <Text style={styles.locationChevron}>{open ? 'Close' : 'Change'}</Text>
      </Pressable>
      {open ? (
        <ScrollView style={styles.locationMenu} contentContainerStyle={styles.locationMenuContent}>
          {addisLocationOptions.map((option) => {
            const selectedOption = option.key === selectedKey;
            const sameAsOtherPoint = option.key === avoidKey;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: selectedOption, disabled: sameAsOtherPoint }}
                disabled={sameAsOtherPoint}
                key={option.key}
                onPress={() => {
                  onSelect(option);
                  setOpen(false);
                }}
                style={[styles.locationOption, selectedOption && styles.locationOptionSelected, sameAsOtherPoint && styles.buttonDisabled]}
              >
                <View style={styles.flex}>
                  <Text style={[styles.fieldLabel, selectedOption && styles.documentOptionSelectedText]}>{option.label}</Text>
                  <Text style={[styles.muted, selectedOption && styles.documentOptionSelectedText]}>{option.area} / {option.detail}</Text>
                </View>
                <Text style={[styles.locationCoords, selectedOption && styles.documentOptionSelectedText]}>{option.lat}, {option.lon}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

function PickupSchedulePicker({
  dateKey,
  time,
  onChange
}: {
  dateKey: string;
  time: string;
  onChange: (next: { dateKey?: string; time?: string }) => void;
}) {
  const [picker, setPicker] = useState<'date' | 'time' | ''>('');
  const dateOptions = useMemo(() => Array.from({ length: 14 }, (_, index) => addDays(new Date(), index)), []);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>Pickup time</Text>
      <View style={styles.actionRow}>
        <Pressable accessibilityRole="button" onPress={() => setPicker('date')} style={[styles.secondaryButton, styles.actionButton]}>
          <Text style={styles.secondaryButtonText}>{formatDateLabel(dateKey)}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setPicker('time')} style={[styles.secondaryButton, styles.actionButton]}>
          <Text style={styles.secondaryButtonText}>{formatTimeLabel(time)}</Text>
        </Pressable>
      </View>
      <Text style={styles.muted}>Selected pickup: {formatPickupWindow(dateKey, time)}</Text>
      <Modal animationType="fade" transparent visible={Boolean(picker)} onRequestClose={() => setPicker('')}>
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerDialog}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerEyebrow, styles.pickerHeaderText]}>{picker === 'date' ? fromDateKey(dateKey).getFullYear() : 'Pickup'}</Text>
              <Text style={[styles.pickerTitle, styles.pickerHeaderTitle]}>{picker === 'date' ? formatDateLabel(dateKey) : 'Select time'}</Text>
            </View>
            {picker === 'date' ? (
              <View style={styles.calendarGrid}>
                {dateOptions.map((date) => {
                  const nextKey = toDateKey(date);
                  const selected = nextKey === dateKey;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={nextKey}
                      onPress={() => onChange({ dateKey: nextKey })}
                      style={[styles.dateCell, selected && styles.dateCellSelected]}
                    >
                      <Text style={[styles.dateCellWeekday, selected && styles.documentOptionSelectedText]}>
                        {date.toLocaleDateString(undefined, { weekday: 'short' })}
                      </Text>
                      <Text style={[styles.dateCellDay, selected && styles.documentOptionSelectedText]}>{date.getDate()}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <ScrollView style={styles.timeList}>
                {pickupTimeSlots.map((slot) => {
                  const selected = slot === time;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={slot}
                      onPress={() => onChange({ time: slot })}
                      style={[styles.timeOption, selected && styles.dateCellSelected]}
                    >
                      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                        {selected ? <View style={styles.radioInner} /> : null}
                      </View>
                      <Text style={[styles.timeOptionText, selected && styles.documentOptionSelectedText]}>{formatTimeLabel(slot)}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            <View style={styles.pickerActions}>
              <Pressable accessibilityRole="button" onPress={() => setPicker('')} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setPicker('')} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type MapLocationInput = AddisLocationOption | QuoteLocation;

const normalizeMapLocation = (location: MapLocationInput, fallbackLabel: string) => {
  if ('lon' in location) {
    return {
      label: location.label,
      subtitle: location.area,
      lon: Number(location.lon),
      lat: Number(location.lat)
    };
  }

  return {
    label: location.addressText || fallbackLabel,
    subtitle: location.source.replaceAll('_', ' '),
    lon: Number(location.point.coordinates[0]),
    lat: Number(location.point.coordinates[1])
  };
};

const lonLatToTile = ({ lon, lat, zoom }: { lon: number; lat: number; zoom: number }) => {
  const latRad = (lat * Math.PI) / 180;
  const scale = 2 ** zoom;

  return {
    x: Math.floor(((lon + 180) / 360) * scale),
    y: Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale)
  };
};

const buildGoogleStaticMapUrl = (points: {
  pickup: ReturnType<typeof normalizeMapLocation>;
  destination: ReturnType<typeof normalizeMapLocation>;
  truck?: ReturnType<typeof normalizeMapLocation>;
  zoom: number;
}) => {
  if (!runtimeConfig.googleMapsApiKey) {
    return '';
  }

  const markers = [
    `markers=color:green%7Clabel:P%7C${points.pickup.lat},${points.pickup.lon}`,
    `markers=color:orange%7Clabel:D%7C${points.destination.lat},${points.destination.lon}`,
    points.truck ? `markers=color:blue%7Clabel:T%7C${points.truck.lat},${points.truck.lon}` : ''
  ].filter(Boolean);
  const path = `path=color:0x000000ff%7Cweight:5%7C${points.pickup.lat},${points.pickup.lon}%7C${points.destination.lat},${points.destination.lon}`;

  return `https://maps.googleapis.com/maps/api/staticmap?center=${points.pickup.lat},${points.pickup.lon}&zoom=${points.zoom}&size=640x320&scale=2&maptype=roadmap&${markers.join('&')}&${path}&key=${encodeURIComponent(runtimeConfig.googleMapsApiKey)}`;
};

const buildOpenStreetMapTileUrl = (pickup: ReturnType<typeof normalizeMapLocation>, destination: ReturnType<typeof normalizeMapLocation>, zoom: number) => {
  const center = {
    lon: (pickup.lon + destination.lon) / 2,
    lat: (pickup.lat + destination.lat) / 2
  };
  const tile = lonLatToTile({ ...center, zoom });

  return `https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`;
};

function RouteMapPreview({
  pickup,
  destination,
  truck,
  statusLabel
}: {
  pickup: MapLocationInput;
  destination: MapLocationInput;
  truck?: QuoteLocation;
  statusLabel?: string;
}) {
  const [zoom, setZoom] = useState(12);
  const [expanded, setExpanded] = useState(false);
  const pickupPoint = normalizeMapLocation(pickup, 'Pickup');
  const destinationPoint = normalizeMapLocation(destination, 'Drop-off');
  const truckPoint = truck ? normalizeMapLocation(truck, 'Truck') : undefined;
  const googleMapUrl = buildGoogleStaticMapUrl({ pickup: pickupPoint, destination: destinationPoint, truck: truckPoint, zoom });
  const fallbackTileUrl = buildOpenStreetMapTileUrl(pickupPoint, destinationPoint, zoom);
  const mapProviderLabel = googleMapUrl ? 'Google map' : 'OpenStreetMap preview';
  const zoomMap = (direction: 'in' | 'out') => setZoom((current) => Math.max(10, Math.min(15, direction === 'in' ? current + 1 : current - 1)));
  const toPointStyle = (location: { lon: number; lat: number }) => {
    const lon = Number(location.lon);
    const lat = Number(location.lat);
    const left = Math.max(6, Math.min(88, ((lon - 38.65) / (38.91 - 38.65)) * 100));
    const top = Math.max(8, Math.min(84, (1 - (lat - 8.88) / (9.08 - 8.88)) * 100));
    return {
      left: `${left}%` as ViewStyle['left'],
      top: `${top}%` as ViewStyle['top']
    };
  };

  const renderMap = (fullScreen = false) => (
    <View style={[styles.mapPreview, fullScreen && styles.mapPreviewFullScreen]}>
      <Image source={{ uri: googleMapUrl || fallbackTileUrl }} resizeMode="cover" style={styles.mapTile} />
      <View style={styles.mapScrim} />
      <View style={styles.mapGridLineVertical} />
      <View style={styles.mapGridLineHorizontal} />
      <View style={styles.mapRoute} />
      <View style={[styles.mapPin, styles.mapPinPickup, toPointStyle(pickupPoint)]}>
        <Text style={styles.mapPinText}>P</Text>
      </View>
      <View style={[styles.mapPin, styles.mapPinDestination, toPointStyle(destinationPoint)]}>
        <Text style={styles.mapPinText}>D</Text>
      </View>
      {truckPoint ? (
        <View style={[styles.mapPin, styles.mapPinTruck, toPointStyle(truckPoint)]}>
          <Text style={styles.mapPinText}>T</Text>
        </View>
      ) : null}
      <View style={styles.mapControls}>
        <Pressable accessibilityRole="button" onPress={() => zoomMap('in')} style={styles.mapControlButton}>
          <Text style={styles.mapControlText}>+</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => zoomMap('out')} style={styles.mapControlButton}>
          <Text style={styles.mapControlText}>-</Text>
        </Pressable>
        {!fullScreen ? (
          <Pressable accessibilityRole="button" onPress={() => setExpanded(true)} style={styles.mapExpandButton}>
            <Text style={styles.mapExpandText}>Expand</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.mapLegend}>
        <Text style={styles.mapLegendText}>{mapProviderLabel} / Pickup: {pickupPoint.label}</Text>
        <Text style={styles.mapLegendText}>Drop-off: {destinationPoint.label}</Text>
        {truckPoint ? <Text style={styles.mapLegendText}>Truck: {truckPoint.label}{statusLabel ? ` / ${statusLabel}` : ''}</Text> : null}
      </View>
    </View>
  );

  return (
    <>
      {renderMap()}
      <Modal animationType="slide" visible={expanded} onRequestClose={() => setExpanded(false)}>
        <SafeAreaView style={styles.fullscreenMapShell}>
          <View style={styles.fullscreenMapHeader}>
            <View style={styles.flex}>
              <Text style={styles.eyebrow}>Route map</Text>
              <Text style={styles.cardTitle}>{pickupPoint.label} to {destinationPoint.label}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => setExpanded(false)} style={styles.compactButton}>
              <Text style={styles.compactButtonText}>Close</Text>
            </Pressable>
          </View>
          {renderMap(true)}
        </SafeAreaView>
      </Modal>
    </>
  );
}

function RequestTruckTypeCards({
  vehicleClasses,
  selectedVehicleClassId,
  onSelect
}: {
  vehicleClasses: VehicleClass[];
  selectedVehicleClassId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.requestTruckGrid}>
      {vehicleClasses.map((vehicleClass) => {
        const selected = vehicleClass.id === selectedVehicleClassId;
        const capacity = vehicleClass.capacityKg ? `${vehicleClass.capacityKg}kg` : 'Class';
        const volume = vehicleClass.capacityCubicMeters ? `${vehicleClass.capacityCubicMeters}m3` : 'Flexible volume';

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={vehicleClass.id}
            onPress={() => onSelect(vehicleClass.id)}
            style={[styles.requestTruckCard, selected && styles.requestTruckCardSelected]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.flex}>
                <Text style={[styles.requestTruckTitle, selected && styles.requestTextOnDark]}>{vehicleClass.name}</Text>
                <Text style={[styles.requestTruckDetail, selected && styles.requestMutedOnDark]}>{vehicleClass.description || 'Reliable truck class for your move.'}</Text>
              </View>
              <StatusBadge tone={selected ? 'neutral' : 'dark'} style={selected && styles.requestBadgeOnDark}>
                {selected ? 'Selected' : capacity}
              </StatusBadge>
            </View>
            <View style={styles.requestTruckMetaRow}>
              <View style={[styles.requestTruckMeta, selected && styles.requestTruckMetaSelected]}>
                <Text style={[styles.requestTruckMetaValue, selected && styles.requestTextOnDark]}>{capacity}</Text>
                <Text style={[styles.requestTruckMetaLabel, selected && styles.requestMutedOnDark]}>capacity</Text>
              </View>
              <View style={[styles.requestTruckMeta, selected && styles.requestTruckMetaSelected]}>
                <Text style={[styles.requestTruckMetaValue, selected && styles.requestTextOnDark]}>{volume}</Text>
                <Text style={[styles.requestTruckMetaLabel, selected && styles.requestMutedOnDark]}>volume</Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function RequestCandidateOption({
  candidate,
  capacityLabel,
  selected,
  onPress
}: {
  candidate: QuoteCandidate;
  capacityLabel: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.requestCandidateCard, selected && styles.requestCandidateCardSelected]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <Text style={[styles.requestCandidateTitle, selected && styles.requestTextOnDark]}>{candidate.licensePlate}</Text>
          <Text style={[styles.requestCandidateSubtitle, selected && styles.requestMutedOnDark]}>{candidate.vehicleClassSnapshot?.name || 'Available vehicle'}</Text>
          <StarRating value={candidate.rating} compact />
        </View>
        <StatusBadge tone={selected ? 'neutral' : 'success'} style={selected && styles.requestBadgeOnDark}>
          {selected ? 'Selected' : `${candidate.distanceKm}km`}
        </StatusBadge>
      </View>
      <View style={styles.requestCandidateMetricRow}>
        <View style={[styles.requestCandidateMetric, selected && styles.requestCandidateMetricSelected]}>
          <Text style={[styles.requestCandidateMetricValue, selected && styles.requestTextOnDark]}>{candidate.rating.toFixed(1)}</Text>
          <Text style={[styles.requestCandidateMetricLabel, selected && styles.requestMutedOnDark]}>rating</Text>
        </View>
        <View style={[styles.requestCandidateMetric, selected && styles.requestCandidateMetricSelected]}>
          <Text style={[styles.requestCandidateMetricValue, selected && styles.requestTextOnDark]}>{candidate.rankingScore.toFixed(1)}</Text>
          <Text style={[styles.requestCandidateMetricLabel, selected && styles.requestMutedOnDark]}>match</Text>
        </View>
        <View style={[styles.requestCandidateMetric, selected && styles.requestCandidateMetricSelected]}>
          <Text style={[styles.requestCandidateMetricValue, selected && styles.requestTextOnDark]}>{capacityLabel}</Text>
          <Text style={[styles.requestCandidateMetricLabel, selected && styles.requestMutedOnDark]}>capacity</Text>
        </View>
      </View>
    </Pressable>
  );
}

function ClientQuoteScreen() {
  const queryClient = useQueryClient();
  const [vehicleClassId, setVehicleClassId] = useState('');
  const [pickupLocationKey, setPickupLocationKey] = useState('bole-medhanialem');
  const [pickupAddressNote, setPickupAddressNote] = useState('');
  const [pickupLon, setPickupLon] = useState(getLocationOption('bole-medhanialem').lon);
  const [pickupLat, setPickupLat] = useState(getLocationOption('bole-medhanialem').lat);
  const [destinationLocationKey, setDestinationLocationKey] = useState('piassa');
  const [destinationAddressNote, setDestinationAddressNote] = useState('');
  const [destinationLon, setDestinationLon] = useState(getLocationOption('piassa').lon);
  const [destinationLat, setDestinationLat] = useState(getLocationOption('piassa').lat);
  const [pickupDateKey, setPickupDateKey] = useState(toDateKey(new Date()));
  const [pickupTime, setPickupTime] = useState('09:00');
  const [showManualCoordinates, setShowManualCoordinates] = useState(false);
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
  const pickupOption = getLocationOption(pickupLocationKey);
  const destinationOption = getLocationOption(destinationLocationKey);

  useEffect(() => {
    if (!vehicleClassId && vehicleClasses[0]) {
      setVehicleClassId(vehicleClasses[0].id);
    }
  }, [vehicleClassId, vehicleClasses]);

  const buildQuoteInput = (): QuoteInput => {
    const pickupLocation = buildManualLocation({
      addressText: [formatLocationAddress(pickupOption), pickupAddressNote.trim()].filter(Boolean).join(' / '),
      lon: pickupLon,
      lat: pickupLat
    });
    const destinationLocation = buildManualLocation({
      addressText: [formatLocationAddress(destinationOption), destinationAddressNote.trim()].filter(Boolean).join(' / '),
      lon: destinationLon,
      lat: destinationLat
    });

    return {
      pickupLocation,
      destinationLocation,
      requestedVehicleClassId: vehicleClassId,
      requestedPickupTime: formatPickupWindow(pickupDateKey, pickupTime),
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

    if (pickupLocationKey === destinationLocationKey) {
      setError('Choose different pickup and drop-off areas.');
      return;
    }

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
    <Screen contentStyle={styles.requestContent}>
      <AppHeader
        eyebrow="Request"
        title="Book a truck."
        subtitle="Choose a route, load, truck type, and quote before owners receive the request."
      />

      <UiCard style={styles.requestSection}>
        <SectionHeader
          eyebrow="Route"
          title="Where should the truck go?"
          description="Pick familiar Addis Ababa areas and add building or landmark notes for the owner."
          action={<StatusBadge tone="dark">Addis Ababa</StatusBadge>}
        />
        <RouteMapPreview pickup={pickupOption} destination={destinationOption} />
        <View style={styles.requestLocationStack}>
          <LocationDropdown
            label="Pickup area"
            selectedKey={pickupLocationKey}
            avoidKey={destinationLocationKey}
            onSelect={(option) => {
              setPickupLocationKey(option.key);
              setPickupLon(option.lon);
              setPickupLat(option.lat);
            }}
          />
          <Field label="Pickup note" value={pickupAddressNote} onChangeText={setPickupAddressNote} placeholder="Building, gate, floor, or nearby landmark" />
          <LocationDropdown
            label="Drop-off area"
            selectedKey={destinationLocationKey}
            avoidKey={pickupLocationKey}
            onSelect={(option) => {
              setDestinationLocationKey(option.key);
              setDestinationLon(option.lon);
              setDestinationLat(option.lat);
            }}
          />
          <Field label="Drop-off note" value={destinationAddressNote} onChangeText={setDestinationAddressNote} placeholder="Building, gate, floor, or nearby landmark" />
        </View>
        <SecondaryButton
          label={showManualCoordinates ? 'Hide pin details' : 'Adjust map pin'}
          onPress={() => setShowManualCoordinates((value) => !value)}
        />
        {showManualCoordinates ? (
          <View style={styles.requestManualPanel}>
            <Text style={styles.muted}>Fine tune generated coordinates only when the selected area is not close enough.</Text>
            <View style={styles.inlineFields}>
              <Field containerStyle={styles.inlineField} label="Pickup lon" value={pickupLon} onChangeText={setPickupLon} placeholder="38.7903" keyboardType="decimal-pad" />
              <Field containerStyle={styles.inlineField} label="Pickup lat" value={pickupLat} onChangeText={setPickupLat} placeholder="8.9806" keyboardType="decimal-pad" />
            </View>
            <View style={styles.inlineFields}>
              <Field containerStyle={styles.inlineField} label="Drop-off lon" value={destinationLon} onChangeText={setDestinationLon} placeholder="38.7578" keyboardType="decimal-pad" />
              <Field containerStyle={styles.inlineField} label="Drop-off lat" value={destinationLat} onChangeText={setDestinationLat} placeholder="9.0350" keyboardType="decimal-pad" />
            </View>
          </View>
        ) : null}
      </UiCard>

      <UiCard style={styles.requestSection}>
        <SectionHeader
          eyebrow="Truck type"
          title="Choose the right size."
          description="Vehicle classes come from the backend, so pricing and matching stay consistent."
        />
        {vehicleClassesQuery.isLoading ? (
          <LoadingState title="Loading truck types" message="Checking approved KULI vehicle classes." />
        ) : vehicleClassesQuery.isError ? (
          <ErrorState title="Could not load truck types" message={getErrorMessage(vehicleClassesQuery.error)} />
        ) : vehicleClasses.length === 0 ? (
          <EmptyState title="No truck types available" message="Ask an administrator to create vehicle classes before requesting a truck." />
        ) : (
          <RequestTruckTypeCards vehicleClasses={vehicleClasses} selectedVehicleClassId={vehicleClassId} onSelect={setVehicleClassId} />
        )}
      </UiCard>

      <UiCard style={styles.requestSection}>
        <SectionHeader
          eyebrow="Load details"
          title="What are you moving?"
          description="These details help KULI calculate a fair quote and rank nearby trucks."
        />
        <View style={styles.requestLoadGrid}>
          {loadTypeOptions.map((option) => {
            const selected = itemType === option.key;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={option.key}
                onPress={() => setItemType(option.key)}
                style={[styles.requestLoadOption, selected && styles.requestLoadOptionSelected]}
              >
                <Text style={[styles.requestLoadTitle, selected && styles.requestTextOnDark]}>{option.label}</Text>
                <Text style={[styles.requestLoadDetail, selected && styles.requestMutedOnDark]}>{option.detail}</Text>
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
          style={[styles.requestSwitchRow, loadingAssistanceRequested && styles.requestSwitchRowActive]}
        >
          <View style={styles.flex}>
            <Text style={[styles.requestSwitchText, loadingAssistanceRequested && styles.requestSwitchTextActive]}>Loading help</Text>
            <Text style={styles.muted}>Owner should expect help loading or unloading.</Text>
          </View>
          <StatusBadge tone={loadingAssistanceRequested ? 'success' : 'warning'}>{loadingAssistanceRequested ? 'Yes' : 'No'}</StatusBadge>
        </Pressable>
        <Field label="Special handling" value={specialHandlingInstructions} onChangeText={setSpecialHandlingInstructions} placeholder="Fragile wardrobe, narrow stairs" />
        <Field label="Tip ETB" value={tip} onChangeText={setTip} placeholder="0" keyboardType="numeric" />
      </UiCard>

      <UiCard style={styles.requestSection}>
        <SectionHeader
          eyebrow="Schedule"
          title="When should pickup happen?"
          description="Choose a pickup window owners can plan around."
          action={<StatusBadge tone="warning">{formatPickupWindow(pickupDateKey, pickupTime)}</StatusBadge>}
        />
        <PickupSchedulePicker
          dateKey={pickupDateKey}
          time={pickupTime}
          onChange={(next) => {
            if (next.dateKey) {
              setPickupDateKey(next.dateKey);
            }

            if (next.time) {
              setPickupTime(next.time);
            }
          }}
        />
      </UiCard>

      {error ? <ErrorState title="Request needs attention" message={error} /> : null}
      <PrimaryButton label="Get quote" loading={pending} disabled={vehicleClasses.length === 0} onPress={submitQuote} />
      {pending ? <LoadingState title="Calculating quote" message="Checking route distance, pricing, and nearby approved trucks." /> : null}

      {quote && snapshot ? (
        <UiCard style={styles.requestSection}>
          <SectionHeader
            eyebrow="Quote"
            title="Review your estimate."
            description="Confirm the estimate before selected owners receive the request."
            action={<StatusBadge tone={quote.search.noResults ? 'warning' : 'success'}>{`${quote.search.radiusKmUsed}km radius`}</StatusBadge>}
          />
          <View style={styles.requestQuoteHero}>
            <Text style={styles.requestQuoteLabel}>Total estimate</Text>
            <Text style={styles.requestQuoteTotal}>{snapshot.currency} {snapshot.totalEstimate.toFixed(2)}</Text>
            <Text style={styles.requestQuoteMeta}>{quote.route.distanceKm.toFixed(2)}km / about {Math.round(quote.route.etaMinutes)} min / pricing v{snapshot.pricingRuleVersion}</Text>
          </View>
          {quote.search.expanded ? <StatusBadge tone="warning">Search expanded</StatusBadge> : null}
          <View style={styles.priceBox}>
            <PriceLine label="Base fare" value={snapshot.baseFare} currency={snapshot.currency} />
            <PriceLine label="Distance" value={snapshot.distanceCharge} currency={snapshot.currency} />
            <PriceLine label="Time" value={snapshot.durationCharge} currency={snapshot.currency} />
            <PriceLine label="Load adjustment" value={snapshot.loadAdjustment} currency={snapshot.currency} />
            <PriceLine label="Fuel surcharge" value={snapshot.fuelSurcharge} currency={snapshot.currency} />
            <PriceLine label="Tip" value={snapshot.tip} currency={snapshot.currency} />
          </View>
          <View style={styles.requestPaymentNote}>
            <Text style={styles.noticeText}>Payment is handled after delivery in the current KULI flow. Keep final payment coordination inside the trip chat.</Text>
          </View>
        </UiCard>
      ) : null}

      {quote && snapshot ? (
        <UiCard style={styles.requestSection}>
          <SectionHeader
            eyebrow="Dispatch"
            title="Nearby candidates."
            description="Select one or more trucks. The first owner to accept gets the trip and other offers close automatically."
          />
          {quote.candidates.length === 0 ? (
            <EmptyState
              title="No nearby approved trucks yet"
              message="Try a smaller load, another truck type, or a different pickup area after more owners come online."
              action={<SecondaryButton label="Adjust request" onPress={() => setQuote(null)} />}
            />
          ) : (
            <>
              <View style={styles.requestCandidateList}>
                {quote.candidates.map((candidate) => (
                  <RequestCandidateOption
                    key={candidate.vehicleId}
                    candidate={candidate}
                    capacityLabel={selectedCapacityLabel}
                    selected={selectedVehicleIds.includes(candidate.vehicleId)}
                    onPress={() => toggleCandidateSelection(candidate.vehicleId)}
                  />
                ))}
              </View>
              <Text style={styles.muted}>{selectedVehicleIds.length} selected for dispatch. Owners receive first-accept-wins offers.</Text>
              <PrimaryButton
                label="Send KULI request"
                loading={requestPending}
                disabled={selectedVehicleIds.length === 0}
                onPress={createRequest}
              />
            </>
          )}
        </UiCard>
      ) : null}

      {requestResult ? (
        <UiCard style={styles.requestSection}>
          <SectionHeader
            eyebrow="Waiting for owner"
            title={requestResult.request.requestCode}
            description={`${requestResult.offers.length} offer${requestResult.offers.length === 1 ? '' : 's'} sent`}
            action={<StatusBadge tone={statusTone(requestResult.request.status) === 'ready' ? 'success' : statusTone(requestResult.request.status) === 'blocked' ? 'error' : 'warning'}>{requestResult.request.status}</StatusBadge>}
          />
          <View style={styles.requestWaitingPanel}>
            <View style={styles.flex}>
              <Text style={styles.fieldLabel}>Offer expiry</Text>
              <Text style={styles.muted}>
                {requestResult.waitingState?.expiresAt ? new Date(requestResult.waitingState.expiresAt).toLocaleTimeString() : 'Soon'}
              </Text>
            </View>
            <StatusBadge tone="warning">Pending</StatusBadge>
          </View>
          <Text style={styles.noticeText}>Follow or cancel this request from Home while it is still cancellable. Once a truck accepts, other offers are released automatically.</Text>
        </UiCard>
      ) : null}
    </Screen>
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
  const cancelLabel = request.status === 'pending' ? 'Cancel request' : 'Cancel trip';

  return (
    <View style={styles.requestSummaryPanel}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <Text style={styles.activeTripTitle}>{request.requestCode}</Text>
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
      {request.status === 'pending' ? <Text style={styles.noticeText}>Waiting for an owner to accept. The first accepted truck gets the trip, and all other open offers close automatically.</Text> : null}
      {request.status === 'accepted' ? <Text style={styles.noticeText}>A truck owner accepted. Other offers are closed, the truck is assigned, and messages stay attached to this request.</Text> : null}
      {isPaymentSettlingRequest(request) ? <Text style={styles.noticeText}>Payment is still open. Keep any final cash/payment coordination in chat until it is confirmed.</Text> : null}
      {children}
      <Pressable
        accessibilityRole="button"
        disabled={!isCancellable}
        onPress={() => onCancel(request)}
        style={[styles.secondaryButton, isCancellable && styles.dangerOutlineButton, !isCancellable && styles.buttonDisabled]}
      >
        <Text style={[styles.secondaryButtonText, isCancellable && styles.dangerOutlineText]}>{isCancellable ? cancelLabel : 'Cancellation closed'}</Text>
      </Pressable>
    </View>
  );
}

function TimelineEventRow({ event, isLast = false }: { event: StatusEvent; isLast?: boolean }) {
  const label = statusLabels[event.toStatus] ?? event.toStatus;
  const tone = statusTone(event.toStatus);

  return (
    <View style={styles.timelineEventRow}>
      <View style={styles.timelineMarkerColumn}>
        <View style={[styles.timelineDot, tone === 'ready' && styles.timelineDotReady, tone === 'warn' && styles.timelineDotWarn, tone === 'blocked' && styles.timelineDotBlocked]} />
        {!isLast ? <View style={styles.timelineConnector} /> : null}
      </View>
      <View style={styles.flex}>
        <View style={styles.timelineEventCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.fieldLabel}>{event.fromStatus ? `${statusLabels[event.fromStatus]} to ${label}` : label}</Text>
            <StatusBadge tone={badgeToneForStatus(event.toStatus)}>{label}</StatusBadge>
          </View>
          <Text style={styles.muted}>{event.reason || 'Status event recorded'} / {event.actorRole || 'system'}</Text>
          {event.createdAt ? <Text style={styles.timelineTime}>{new Date(event.createdAt).toLocaleString()}</Text> : null}
        </View>
      </View>
    </View>
  );
}

function TripTimeline({ requestId }: { requestId: string }) {
  const eventsQuery = useQuery({
    queryKey: ['kuli-requests', requestId, 'events'],
    queryFn: async () => ((await kuliApi.request(`/kuli-requests/${requestId}/events`)) as ApiEnvelope<StatusEvent[]>).data,
    refetchInterval: 15000
  });

  const events = eventsQuery.data ?? [];

  return (
    <View style={styles.trackingPanel}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <Text style={styles.trackingPanelTitle}>Trip timeline</Text>
          <Text style={styles.muted}>Server-confirmed status events. Refresh or wait for polling.</Text>
        </View>
        <SecondaryButton label="Refresh" onPress={() => eventsQuery.refetch()} style={styles.timelineRefreshButton} />
      </View>
      {eventsQuery.isLoading ? <LoadingState title="Loading timeline" message="Checking the latest trip status events." /> : null}
      {eventsQuery.isError ? <ErrorState title="Could not refresh timeline" message={getErrorMessage(eventsQuery.error)} /> : null}
      {events.length === 0 && !eventsQuery.isLoading ? <EmptyState title="No status events yet" message="The acceptance event appears after the owner accepts." /> : null}
      <View style={styles.timelineList}>
        {events.map((event, index) => (
          <TimelineEventRow event={event} isLast={index === events.length - 1} key={event.id} />
        ))}
      </View>
    </View>
  );
}

function ArchivedMessagePanel({ request }: { request: KuliRequest }) {
  return (
    <View style={styles.trackingPanel}>
      <View style={styles.cardHeader}>
        <Text style={styles.trackingPanelTitle}>Messages archived</Text>
        <StatusBadge tone="error">{statusLabels[request.status]}</StatusBadge>
      </View>
      <Text style={styles.muted}>Trip messaging is archived after cancellation or timeout. Use History or support actions for any follow-up.</Text>
    </View>
  );
}

function MessageThread({
  requestId,
  profile,
  closed = false,
  closedReason = 'This request thread is closed.'
}: {
  requestId: string;
  profile: UserProfile;
  closed?: boolean;
  closedReason?: string;
}) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [retryBody, setRetryBody] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const messagesQuery = useQuery({
    queryKey: ['kuli-requests', requestId, 'messages'],
    queryFn: async () => ((await kuliApi.request(`/kuli-requests/${requestId}/messages`)) as ApiEnvelope<TripMessage[]>).data,
    refetchInterval: closed ? false : 15000
  });

  const sendMessage = async (nextBody = body) => {
    const trimmed = nextBody.trim();

    if (!trimmed || pending || closed) {
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
  const quickReplies = ["I'm outside", 'Please call me', 'Coming now'];

  return (
    <View style={styles.chatPanel}>
      <View style={styles.chatHeader}>
        <View style={styles.flex}>
          <Text style={styles.trackingPanelTitle}>Trip chat</Text>
          <Text style={styles.muted}>Coordinate pickup and delivery details inside this request.</Text>
        </View>
        <StatusBadge tone={messagesQuery.isError ? 'error' : 'success'}>{`${messages.length}`}</StatusBadge>
      </View>
      {messagesQuery.isLoading ? <LoadingState title="Loading messages" message="Fetching the latest request chat." /> : null}
      {messagesQuery.isError ? <ErrorState title="Messages could not refresh" message="Connection issue loading messages. Try again after the network returns." /> : null}
      {closed ? <Text style={styles.noticeText}>{closedReason}</Text> : null}
      <View style={styles.messageList}>
        {messages.length === 0 && !messagesQuery.isLoading ? <EmptyState title="No messages yet" message="Keep coordination inside the request for accountability." /> : null}
        {messages.map((message) => {
          const mine = message.senderId === profile.id;
          const profileName = profile.fullName || profile.email || 'You';
          const senderName = mine
            ? `${profileName} (you)`
            : message.senderDisplayName || (message.senderRole === 'truck_owner' ? 'Truck owner' : 'Trip partner');

          return (
            <View key={message.id} style={[styles.messageBubble, mine && styles.messageBubbleMine]}>
              <Text style={[styles.messageBody, mine && styles.messageBodyMine]}>{message.body}</Text>
              <Text style={[styles.messageMeta, mine && styles.messageBodyMine]}>{senderName} {message.createdAt ? `/ ${new Date(message.createdAt).toLocaleTimeString()}` : ''}</Text>
            </View>
          );
        })}
      </View>
      {error ? (
        <View style={styles.emptyState}>
          <Text style={styles.errorText}>{error}</Text>
          {retryBody ? (
            <SecondaryButton disabled={pending} label={pending ? 'Retrying...' : 'Retry message'} onPress={() => sendMessage(retryBody)} />
          ) : null}
        </View>
      ) : null}
      {!closed ? (
        <View style={styles.quickReplyRow}>
          {quickReplies.map((reply) => (
            <Pressable accessibilityRole="button" disabled={pending} key={reply} onPress={() => sendMessage(reply)} style={[styles.quickReplyChip, pending && styles.buttonDisabled]}>
              <Text style={styles.quickReplyText}>{reply}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Field label="Message" value={body} onChangeText={setBody} placeholder={closed ? 'Messages reopen only if support reopens the payment record' : 'Share arrival detail or loading instruction'} />
      <PrimaryButton disabled={!body.trim() || closed} label={closed ? 'Chat closed' : 'Send message'} loading={pending} onPress={() => sendMessage()} />
    </View>
  );
}

function OwnerStatusControls({
  request,
  onRequestUpdated
}: {
  request: KuliRequest;
  onRequestUpdated?: (request: KuliRequest) => void;
}) {
  const queryClient = useQueryClient();
  const [pendingStatus, setPendingStatus] = useState<KuliStatus | ''>('');
  const [error, setError] = useState('');
  const nextStatus = request.status === 'accepted' ? 'en_route_to_pickup' : ownerForwardStatuses[ownerForwardStatuses.indexOf(request.status) + 1];
  const canAdvance = Boolean(nextStatus) && !terminalRequestStatuses.includes(request.status);
  const nextStatusActionLabel = request.status === 'accepted' ? 'Start moving' : nextStatus ? statusLabels[nextStatus] : 'No next step';

  const updateStatus = async (status: KuliStatus, reason = `owner_${status}`) => {
    setPendingStatus(status);
    setError('');

    try {
      const result = (await kuliApi.request(`/kuli-requests/${request.id}/status`, {
        method: 'PATCH',
        body: {
          status,
          reason
        }
      })) as ApiEnvelope<{ request: KuliRequest; event: StatusEvent }>;
      onRequestUpdated?.(result.data.request);
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
          <Text style={styles.primaryButtonText}>{pendingStatus ? 'Updating...' : nextStatusActionLabel}</Text>
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
  ownerControls = false,
  onRequestUpdated
}: {
  request: KuliRequest;
  profile: UserProfile;
  ownerControls?: boolean;
  onRequestUpdated?: (request: KuliRequest) => void;
}) {
  const paymentSettling = isPaymentSettlingRequest(request);
  const paymentClosed = isPaymentClosedRequest(request);
  const terminalWithoutSettlement = terminalRequestStatuses.includes(request.status);

  return (
    <View style={styles.tripWorkspace}>
      <View style={styles.activeMapStage}>
        <RouteMapPreview
          pickup={request.pickupLocation}
          destination={request.destinationLocation}
          truck={request.selectedVehicleLocation}
          statusLabel={request.status === 'completed' ? request.payment?.status ?? 'payment pending' : statusLabels[request.status]}
        />
      </View>
      <ActiveTripSummary request={request} />
      {paymentSettling ? (
        <View style={styles.requestPaymentNote}>
          <Text style={styles.noticeText}>Trip is complete, but this chat stays open until the cash/manual payment is confirmed or resolved.</Text>
        </View>
      ) : null}
      {ownerControls && !terminalWithoutSettlement ? <OwnerStatusControls request={request} onRequestUpdated={onRequestUpdated} /> : null}
      <TripTimeline requestId={request.id} />
      {terminalWithoutSettlement ? (
        <ArchivedMessagePanel request={request} />
      ) : (
        <MessageThread
          requestId={request.id}
          profile={profile}
          closed={paymentClosed}
          closedReason="Payment is confirmed or resolved, so the trip chat is now closed."
        />
      )}
    </View>
  );
}

function ClientCancelDialog({
  request,
  pending,
  onClose,
  onConfirm
}: {
  request: KuliRequest | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState(cancellationReasons[0].key);
  const acceptedOrMoving = Boolean(request && request.status !== 'pending');

  useEffect(() => {
    if (request) {
      setReason(cancellationReasons[0].key);
    }
  }, [request?.id]);

  return (
    <Modal animationType="fade" transparent visible={Boolean(request)} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.pickerDialog}>
          <Text style={styles.pickerEyebrow}>{acceptedOrMoving ? 'Cancel trip' : 'Cancel request'}</Text>
          <Text style={styles.pickerTitle}>{request?.requestCode}</Text>
          <Text style={styles.muted}>
            {acceptedOrMoving
              ? 'The owner will be notified immediately. If the truck has already started moving, support may still review payment or dispute records.'
              : 'This removes open offers before an owner accepts. You can create a new request with corrected details anytime.'}
          </Text>
          <View style={styles.roleGrid}>
            {cancellationReasons.map((option) => {
              const selected = option.key === reason;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={option.key}
                  onPress={() => setReason(option.key)}
                  style={[styles.reasonOption, selected && styles.reasonOptionSelected]}
                >
                  <Text style={[styles.fieldLabel, selected && styles.documentOptionSelectedText]}>{option.label}</Text>
                  <Text style={[styles.muted, selected && styles.documentOptionSelectedText]}>{option.detail}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.actionRow}>
            <Pressable accessibilityRole="button" disabled={pending} onPress={onClose} style={[styles.secondaryButton, styles.actionButton, pending && styles.buttonDisabled]}>
              <Text style={styles.secondaryButtonText}>Keep trip</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={pending} onPress={() => onConfirm(reason)} style={[styles.primaryButton, styles.dangerButton, styles.actionButton, pending && styles.buttonDisabled]}>
              <Text style={styles.primaryButtonText}>{pending ? 'Cancelling...' : acceptedOrMoving ? 'Cancel trip' : 'Cancel request'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

type BadgeTone = 'success' | 'warning' | 'error' | 'neutral' | 'dark';

const clientServiceOptions = [
  { key: 'house_move', title: 'House move', detail: 'Full relocation support', symbol: 'H' },
  { key: 'furniture_delivery', title: 'Furniture delivery', detail: 'Sofas, beds, tables', symbol: 'F' },
  { key: 'appliance_transport', title: 'Appliance transport', detail: 'Large item handling', symbol: 'A' },
  { key: 'business_goods', title: 'Business goods', detail: 'Commercial logistics', symbol: 'B' }
];

const badgeToneForStatus = (status: string): BadgeTone => {
  const tone = statusTone(status);

  if (tone === 'ready') {
    return 'success';
  }

  if (tone === 'blocked') {
    return 'error';
  }

  return 'warning';
};

const requestEstimateLabel = (request: KuliRequest) =>
  `${request.quoteSnapshot?.currency ?? 'ETB'} ${Number(request.quoteSnapshot?.totalEstimate ?? 0).toFixed(0)}`;

const requestRouteLabel = (request: KuliRequest) =>
  `${request.pickupLocation?.addressText ?? 'Pickup'} to ${request.destinationLocation?.addressText ?? 'Destination'}`;

const formatRequestSchedule = (request: KuliRequest) => request.requestedPickupTime || 'Pickup time pending';

const activeTrackingStatuses: KuliStatus[] = ['accepted', 'en_route_to_pickup', 'arrived_at_pickup', 'loading', 'in_transit', 'unloading', 'completed'];

const nextStepForRequest = (status: KuliStatus) => {
  const nextStepByStatus: Record<KuliStatus, string> = {
    pending: 'Waiting for a verified truck owner to accept.',
    accepted: 'Owner accepted. Watch status updates and coordinate pickup details in chat.',
    en_route_to_pickup: 'Truck is marked en route to pickup. This is status-based tracking, not live GPS.',
    arrived_at_pickup: 'Truck is marked arrived. Confirm gate, floor, or loading details in chat.',
    loading: 'Loading is in progress. Keep fragile or access notes in chat.',
    in_transit: 'Items are marked in transit. Follow status updates until arrival.',
    unloading: 'Unloading is in progress. Confirm final delivery details before payment.',
    completed: 'Trip is complete. Payment and trust actions are available from History.',
    cancelled: 'This request was cancelled and archived.',
    timed_out: 'No owner accepted in time. Start a new request when you are ready.'
  };

  return nextStepByStatus[status];
};

const statusProgressTone = (status: KuliStatus, currentStatus: KuliStatus) => {
  if (status === currentStatus) {
    return 'current';
  }

  const statusIndex = activeTrackingStatuses.indexOf(status);
  const currentIndex = activeTrackingStatuses.indexOf(currentStatus);

  if (currentIndex >= 0 && statusIndex >= 0 && statusIndex < currentIndex) {
    return 'done';
  }

  if (terminalRequestStatuses.includes(currentStatus) && status === currentStatus) {
    return 'current';
  }

  return 'pending';
};

const greetingForNow = () => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 18) {
    return 'Good afternoon';
  }

  return 'Good evening';
};

function ClientServiceTile({ title, detail, symbol, onPress }: { title: string; detail: string; symbol: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.serviceTile}>
      <View style={styles.serviceIcon}>
        <Text style={styles.serviceIconText}>{symbol}</Text>
      </View>
      <Text style={styles.serviceTitle}>{title}</Text>
      <Text style={styles.serviceDetail}>{detail}</Text>
    </Pressable>
  );
}

function DispatchSearchPanel({ request }: { request: KuliRequest }) {
  const offerCount = request.offers?.length ?? 0;
  const steps = [
    { key: 'sent', label: 'Request sent', detail: request.requestCode },
    { key: 'notified', label: 'Owners notified', detail: `${offerCount} offer${offerCount === 1 ? '' : 's'} open` },
    { key: 'waiting', label: 'Waiting for acceptance', detail: 'First accepted truck wins the trip' }
  ];

  return (
    <View style={styles.dispatchPanel}>
      <View style={styles.dispatchPulse}>
        <Text style={styles.dispatchPulseText}>...</Text>
      </View>
      <Text style={styles.dispatchTitle}>Finding nearby verified trucks</Text>
      <Text style={styles.dispatchCopy}>KULI sent this request to selected owners. Tracking begins after backend-confirmed acceptance.</Text>
      <View style={styles.dispatchSummaryRow}>
        <View style={styles.dispatchSummaryItem}>
          <Text style={styles.dispatchSummaryValue}>{requestEstimateLabel(request)}</Text>
          <Text style={styles.dispatchSummaryLabel}>estimate</Text>
        </View>
        <View style={styles.dispatchSummaryItem}>
          <Text style={styles.dispatchSummaryValue}>{offerCount}</Text>
          <Text style={styles.dispatchSummaryLabel}>offers</Text>
        </View>
      </View>
      <View style={styles.dispatchStepList}>
        {steps.map((step, index) => (
          <View key={step.key} style={styles.dispatchStepRow}>
            <View style={[styles.dispatchStepDot, index < 2 && styles.dispatchStepDotDone, index === 2 && styles.dispatchStepDotCurrent]}>
              <Text style={styles.dispatchStepDotText}>{index + 1}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.dispatchStepTitle}>{step.label}</Text>
              <Text style={styles.muted}>{step.detail}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.noticeText}>You can cancel while this request is waiting. If no owner accepts, create a new request with adjusted details.</Text>
    </View>
  );
}

function TrackingStatusStrip({ status }: { status: KuliStatus }) {
  const visibleStatuses = activeTrackingStatuses.slice(0, -1);

  return (
    <View style={styles.trackingStatusStrip}>
      {visibleStatuses.map((entry) => {
        const tone = statusProgressTone(entry, status);

        return (
          <View key={entry} style={styles.trackingStatusItem}>
            <View style={[styles.trackingStatusDot, tone === 'done' && styles.trackingStatusDotDone, tone === 'current' && styles.trackingStatusDotCurrent]} />
            <Text style={[styles.trackingStatusLabel, tone === 'current' && styles.trackingStatusLabelCurrent]} numberOfLines={1}>
              {statusLabels[entry]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ActiveTripSummary({ request }: { request: KuliRequest }) {
  return (
    <View style={styles.activeTripSheet}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <Text style={styles.activeTripTitle}>{request.requestCode}</Text>
          <Text style={styles.dashboardRoute}>{requestRouteLabel(request)}</Text>
        </View>
        <StatusBadge tone={badgeToneForStatus(request.status)}>{statusLabels[request.status]}</StatusBadge>
      </View>
      <TrackingStatusStrip status={request.status} />
      <View style={styles.dashboardMetricRow}>
        <View style={styles.dashboardMetric}>
          <Text style={styles.dashboardMetricValue}>{requestEstimateLabel(request)}</Text>
          <Text style={styles.dashboardMetricLabel}>estimate</Text>
        </View>
        <View style={styles.dashboardMetric}>
          <Text style={styles.dashboardMetricValue}>{request.selectedVehicleId ? request.selectedVehicleId.slice(-6).toUpperCase() : 'Pending'}</Text>
          <Text style={styles.dashboardMetricLabel}>vehicle</Text>
        </View>
      </View>
      <View style={styles.activeNextStep}>
        <Text style={styles.fieldLabel}>Next expected step</Text>
        <Text style={styles.muted}>{nextStepForRequest(request.status)}</Text>
      </View>
      {request.selectedVehicleLocationUpdatedAt ? (
        <Text style={styles.muted}>Last truck status location update: {new Date(request.selectedVehicleLocationUpdatedAt).toLocaleString()}</Text>
      ) : (
        <Text style={styles.muted}>KULI v1 uses status-based tracking and static map previews. Live GPS movement is not shown.</Text>
      )}
    </View>
  );
}

function ClientDashboardHero({
  profile,
  activeCount,
  onRequest
}: {
  profile: UserProfile;
  activeCount: number;
  onRequest: () => void;
}) {
  const displayName = profile.fullName?.split(' ')[0] || profile.fullName || profile.email?.split('@')[0] || 'there';

  return (
    <View style={styles.clientHero}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <Text style={styles.clientGreeting}>{greetingForNow()}, {displayName}</Text>
          <Text style={styles.clientLocation}>Addis Ababa</Text>
        </View>
        <View style={styles.clientAvatar}>
          <Text style={styles.clientAvatarText}>{displayName.slice(0, 1).toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.clientCtaPanel}>
        <View style={styles.flex}>
          <Text style={styles.clientCtaTitle}>Move something today?</Text>
          <Text style={styles.clientCtaCopy}>Get a quote, compare verified trucks, and send a KULI request when you are ready.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onRequest} style={styles.clientCtaButton}>
          <Text style={styles.clientCtaButtonText}>Request a truck</Text>
        </Pressable>
      </View>
      <View style={styles.clientHeroMeta}>
        <StatusBadge tone={profile.accountStatus === 'active' ? 'success' : 'warning'}>{profile.accountStatus}</StatusBadge>
        <Text style={styles.clientHeroMetaText}>{activeCount ? `${activeCount} active request${activeCount === 1 ? '' : 's'}` : 'No active request'}</Text>
      </View>
    </View>
  );
}

function ClientActiveRequestCard({
  request,
  expanded,
  onToggleDetails,
  onCancel,
  children
}: {
  request: KuliRequest;
  expanded: boolean;
  onToggleDetails: () => void;
  onCancel: (request: KuliRequest) => void;
  children?: ReactNode;
}) {
  const isCancellable = ['pending', 'accepted', 'en_route_to_pickup'].includes(request.status);
  const cancelLabel = request.status === 'pending' ? 'Cancel request' : 'Cancel trip';
  const detailsLabel = expanded ? 'Hide details' : request.status === 'pending' ? 'View details' : 'Track request';
  const isWaiting = request.status === 'pending';

  return (
    <UiCard style={styles.dashboardCard}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{request.requestCode}</Text>
          <Text style={styles.dashboardRoute}>{requestRouteLabel(request)}</Text>
        </View>
        <StatusBadge tone={badgeToneForStatus(request.status)}>{statusLabels[request.status]}</StatusBadge>
      </View>
      <View style={styles.dashboardMetricRow}>
        <View style={styles.dashboardMetric}>
          <Text style={styles.dashboardMetricValue}>{requestEstimateLabel(request)}</Text>
          <Text style={styles.dashboardMetricLabel}>estimate</Text>
        </View>
        <View style={styles.dashboardMetric}>
          <Text style={styles.dashboardMetricValue}>{request.offers?.length ?? 0}</Text>
          <Text style={styles.dashboardMetricLabel}>offers</Text>
        </View>
        <View style={styles.dashboardMetric}>
          <Text style={styles.dashboardMetricValue}>{request.status === 'pending' ? 'Open' : 'Live'}</Text>
          <Text style={styles.dashboardMetricLabel}>tracking</Text>
        </View>
      </View>
      <Text style={styles.dashboardSubcopy}>{formatRequestSchedule(request)}</Text>
      {isWaiting ? <DispatchSearchPanel request={request} /> : <Text style={styles.noticeText}>{nextStepForRequest(request.status)}</Text>}
      <View style={styles.actionRow}>
        <PrimaryButton label={detailsLabel} onPress={onToggleDetails} style={styles.actionButton} />
        <SecondaryButton
          disabled={!isCancellable}
          label={isCancellable ? cancelLabel : 'Cancellation closed'}
          onPress={() => onCancel(request)}
          style={styles.actionButton}
          tone={isCancellable ? 'danger' : 'default'}
        />
      </View>
      {expanded ? <View style={styles.clientExpandedDetails}>{children || <Text style={styles.muted}>Request details are up to date. Status-based tracking starts after an owner accepts.</Text>}</View> : null}
    </UiCard>
  );
}

function ClientRecentTripCard({ request, onRequest }: { request: KuliRequest; onRequest?: () => void }) {
  const noAcceptance = request.status === 'timed_out';

  return (
    <UiCard compact style={styles.recentTripCard}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <Text style={styles.fieldLabel}>{request.requestCode}</Text>
          <Text style={styles.dashboardRoute}>{requestRouteLabel(request)}</Text>
        </View>
        <StatusBadge tone={badgeToneForStatus(request.status)}>{statusLabels[request.status]}</StatusBadge>
      </View>
      <View style={styles.recentTripFooter}>
        <Text style={styles.muted}>{formatRequestSchedule(request)}</Text>
        <Text style={styles.recentTripPrice}>{requestEstimateLabel(request)}</Text>
      </View>
      {noAcceptance ? (
        <View style={styles.timeoutPanel}>
          <Text style={styles.fieldLabel}>No truck accepted in time</Text>
          <Text style={styles.muted}>You can try again with a different truck type, load size, or pickup area.</Text>
          {onRequest ? <SecondaryButton label="Start new request" onPress={onRequest} /> : null}
        </View>
      ) : null}
    </UiCard>
  );
}

function ClientHomeScreen({ profile, onSignOut }: { profile: UserProfile; onSignOut: () => void }) {
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const [actionError, setActionError] = useState('');
  const [pendingCancelId, setPendingCancelId] = useState('');
  const [cancelTarget, setCancelTarget] = useState<KuliRequest | null>(null);
  const [expandedRequestIds, setExpandedRequestIds] = useState<string[]>([]);

  const requestsQuery = useQuery({
    queryKey: ['kuli-requests', 'mine'],
    queryFn: async () => ((await kuliApi.request('/kuli-requests/mine')) as ApiEnvelope<KuliRequest[]>).data,
    refetchInterval: 15000
  });

  const requests = requestsQuery.data ?? [];
  const activeRequests = requests.filter((request) => activeRequestStatuses.includes(request.status) || isPaymentSettlingRequest(request));
  const recentRequests = requests.filter((request) => !activeRequestStatuses.includes(request.status) && !isPaymentSettlingRequest(request)).slice(0, 3);
  const goToRequest = () => {
    (navigation as { navigate: (screen: string) => void }).navigate('Request');
  };
  const toggleRequestDetails = (requestId: string) => {
    setExpandedRequestIds((current) =>
      current.includes(requestId) ? current.filter((id) => id !== requestId) : [...current, requestId]
    );
  };

  const cancelRequest = async (request: KuliRequest, reason: string) => {
    setPendingCancelId(request.id);
    setActionError('');

    try {
      await kuliApi.request(`/kuli-requests/${request.id}/cancel`, {
        method: 'POST',
        body: {
          reason
        }
      });
      await queryClient.invalidateQueries({ queryKey: ['kuli-requests', 'mine'] });
      setCancelTarget(null);
    } catch (cancelError) {
      setActionError(getErrorMessage(cancelError));
    } finally {
      setPendingCancelId('');
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.clientHomeContent}>
        <ClientDashboardHero profile={profile} activeCount={activeRequests.length} onRequest={goToRequest} />

        <View style={styles.dashboardSection}>
          <SectionHeader title="Quick services" description="Choose a starting point. Details stay editable in the request flow." />
          <View style={styles.serviceGrid}>
            {clientServiceOptions.map((service) => (
              <ClientServiceTile key={service.key} title={service.title} detail={service.detail} symbol={service.symbol} onPress={goToRequest} />
            ))}
          </View>
        </View>

        <View style={styles.dashboardSection}>
          <SectionHeader
            title="Active requests"
            description={activeRequests.length ? 'Track current KULI work from request to completion.' : 'Start with a quote, then send a request to verified truck owners.'}
          />
          {requestsQuery.isError ? <ErrorState message={getErrorMessage(requestsQuery.error)} title="Could not load requests" /> : null}
          {actionError ? <ErrorState message={actionError} title="Action failed" /> : null}
          {requestsQuery.isLoading ? <LoadingState message="Loading active and recent KULI requests." title="Loading requests" /> : null}
          {activeRequests.length === 0 && !requestsQuery.isLoading && !requestsQuery.isError ? (
            <EmptyState
              title="No active move yet"
              message="When you send a KULI request, owner responses, tracking, and messages will appear here."
              action={<PrimaryButton label="Request a truck" onPress={goToRequest} />}
            />
          ) : null}
          {activeRequests.map((request) => {
            const detailsOpen = expandedRequestIds.includes(request.id);

            return (
              <ClientActiveRequestCard
                expanded={detailsOpen}
                key={request.id}
                request={request}
                onCancel={(nextRequest) => {
                  if (!pendingCancelId) {
                    setCancelTarget(nextRequest);
                  }
                }}
                onToggleDetails={() => toggleRequestDetails(request.id)}
              >
                {request.status !== 'pending' ? <ActiveTripWorkspace request={request} profile={profile} /> : null}
              </ClientActiveRequestCard>
            );
          })}
        </View>

        <View style={styles.dashboardSection}>
          <SectionHeader title="Recent trips" description="Completed, cancelled, and timed-out requests stay here for follow-up." />
          {recentRequests.length ? (
            <View style={styles.roleGrid}>
              {recentRequests.map((request) => (
                <ClientRecentTripCard key={request.id} request={request} onRequest={goToRequest} />
              ))}
            </View>
          ) : (
            <EmptyState title="No recent trips" message="Completed or cancelled trips will appear here after your first request." />
          )}
        </View>

        <SecondaryButton label="Sign out" onPress={onSignOut} />
      </ScrollView>
      <ClientCancelDialog
        request={cancelTarget}
        pending={Boolean(pendingCancelId)}
        onClose={() => {
          if (!pendingCancelId) {
            setCancelTarget(null);
          }
        }}
        onConfirm={(reason) => {
          if (cancelTarget) {
            cancelRequest(cancelTarget, reason);
          }
        }}
      />
    </SafeAreaView>
  );
}

function OwnerOfferCard({
  offer,
  onDecline,
  onAccept,
  pendingOfferId,
  expanded,
  onToggleExpanded
}: {
  offer: TripOffer;
  onDecline: (offer: TripOffer) => void;
  onAccept: (offer: TripOffer) => void;
  pendingOfferId: string;
  expanded: boolean;
  onToggleExpanded: (offer: TripOffer) => void;
}) {
  const isPending = pendingOfferId === offer.id;
  const expiresAt = offer.expiresAt ? new Date(offer.expiresAt).toLocaleTimeString() : 'soon';
  const request = offer.request;
  const loadDetails = request?.loadDetails;
  const quoteSnapshot = request?.quoteSnapshot;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{request?.requestCode ?? `Offer ${offer.id.slice(-6).toUpperCase()}`}</Text>
          <Text style={styles.muted}>{request ? `${request.pickupLocation?.addressText} to ${request.destinationLocation?.addressText}` : `Request ${offer.requestId}`}</Text>
        </View>
        <StatusPill tone={statusTone(offer.status)}>{offer.status}</StatusPill>
      </View>
      <View style={styles.metricGrid}>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>{Number(offer.distanceKmAtOffer ?? 0).toFixed(1)}km</Text>
          <Text style={styles.metricLabel}>pickup distance</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>{quoteSnapshot ? `${quoteSnapshot.currency} ${Number(quoteSnapshot.totalEstimate ?? 0).toFixed(0)}` : Math.round(offer.etaMinutesAtOffer ?? 0)}</Text>
          <Text style={styles.metricLabel}>{quoteSnapshot ? 'estimate' : 'route minutes'}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>{expiresAt}</Text>
          <Text style={styles.metricLabel}>expires</Text>
        </View>
      </View>
      {expanded && request ? (
        <View style={styles.detailPanel}>
          <RouteMapPreview pickup={request.pickupLocation} destination={request.destinationLocation} statusLabel="Offer route" />
          <View style={styles.requestRow}>
            <View style={styles.flex}>
              <Text style={styles.fieldLabel}>Pickup</Text>
              <Text style={styles.muted}>{request.pickupLocation?.addressText}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.fieldLabel}>Destination</Text>
              <Text style={styles.muted}>{request.destinationLocation?.addressText}</Text>
            </View>
          </View>
          <View style={styles.requestRow}>
            <View style={styles.flex}>
              <Text style={styles.fieldLabel}>Load</Text>
              <Text style={styles.muted}>{loadDetails?.itemType ?? 'General load'}{loadDetails?.estimatedWeightKg ? ` / ${loadDetails.estimatedWeightKg}kg` : ''}{loadDetails?.estimatedVolumeCubicMeters ? ` / ${loadDetails.estimatedVolumeCubicMeters}m3` : ''}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.fieldLabel}>Handling</Text>
              <Text style={styles.muted}>{loadDetails?.loadingAssistanceRequested ? 'Loading help requested' : 'No loading help requested'}</Text>
            </View>
          </View>
          {loadDetails?.specialHandlingInstructions ? (
            <Text style={styles.noticeText}>{loadDetails.specialHandlingInstructions}</Text>
          ) : null}
          <Text style={styles.muted}>Accepting this request assigns the trip to your vehicle and makes competing offers expire.</Text>
        </View>
      ) : null}
      <View style={styles.actionRow}>
        <Pressable accessibilityRole="button" disabled={isPending} onPress={() => onToggleExpanded(offer)} style={[styles.secondaryButton, styles.actionButton, isPending && styles.buttonDisabled]}>
          <Text style={styles.secondaryButtonText}>{expanded ? 'Hide details' : 'View details'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={isPending} onPress={() => onDecline(offer)} style={[styles.secondaryButton, styles.actionButton, isPending && styles.buttonDisabled]}>
          <Text style={styles.secondaryButtonText}>Decline</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={isPending} onPress={() => onAccept(offer)} style={[styles.primaryButton, styles.actionButton, isPending && styles.buttonDisabled]}>
          <Text style={styles.primaryButtonText}>{isPending ? 'Working...' : 'Accept request'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function OwnerOffersScreen({ profile }: { profile: UserProfile }) {
  const queryClient = useQueryClient();
  const [pendingOfferId, setPendingOfferId] = useState('');
  const [expandedOfferId, setExpandedOfferId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [acceptedResult, setAcceptedResult] = useState<OfferActionResult | null>(null);

  const offersQuery = useQuery({
    queryKey: ['owner-offers'],
    queryFn: async () => ((await kuliApi.request('/owner/offers')) as ApiEnvelope<TripOffer[]>).data,
    refetchInterval: 15000
  });

  const ownerRequestsQuery = useQuery({
    queryKey: ['kuli-requests', 'mine', 'owner'],
    queryFn: async () => ((await kuliApi.request('/kuli-requests/mine')) as ApiEnvelope<KuliRequest[]>).data,
    refetchInterval: 15000
  });

  const offers = offersQuery.data ?? [];
  const acceptedTrips = (ownerRequestsQuery.data ?? []).filter((request) => activeRequestStatuses.includes(request.status) || isPaymentSettlingRequest(request));
  const acceptedRequest = acceptedResult?.request;
  const showAcceptedResult = Boolean(acceptedRequest && (activeRequestStatuses.includes(acceptedRequest.status) || isPaymentSettlingRequest(acceptedRequest)));

  const toggleOfferDetails = async (offer: TripOffer) => {
    const nextExpanded = expandedOfferId === offer.id ? '' : offer.id;
    setExpandedOfferId(nextExpanded);

    if (nextExpanded && offer.status === 'sent') {
      await runOfferAction(offer, 'viewed');
    }
  };

  const runOfferAction = async (offer: TripOffer, action: 'viewed' | 'decline' | 'accept') => {
    setPendingOfferId(offer.id);
    setError('');
    setMessage('');

    try {
      if (action === 'viewed') {
        await kuliApi.request(`/offers/${offer.id}/viewed`, {
          method: 'POST'
        });
        setMessage('Offer details opened. Review the route and load before accepting.');
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
                expanded={expandedOfferId === offer.id}
                onToggleExpanded={toggleOfferDetails}
              />
            ))}
          </View>
        </ShellCard>

        {showAcceptedResult && acceptedRequest ? (
          <ShellCard title="Accepted trip">
            <View style={styles.cardHeader}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{acceptedRequest.requestCode}</Text>
                <Text style={styles.muted}>{acceptedRequest.pickupLocation?.addressText} to {acceptedRequest.destinationLocation?.addressText}</Text>
              </View>
              <StatusPill tone={statusTone(acceptedRequest.status)}>{statusLabels[acceptedRequest.status]}</StatusPill>
            </View>
            <ActiveTripWorkspace
              request={acceptedRequest}
              profile={profile}
              ownerControls
              onRequestUpdated={(request) => {
                setAcceptedResult((current) => (current ? { ...current, request } : current));
              }}
            />
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
  const navigation = useNavigation<any>();
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
    queryFn: async () => ((await kuliApi.request('/notifications')) as ApiEnvelope<NotificationRecord[]>).data,
    refetchInterval: 20000
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

  const openNotificationDetail = async (notification: NotificationRecord) => {
    setPendingId(notification.id);
    setError('');
    setMessage('');

    try {
      if (notification.deliveryStatus !== 'read') {
        await kuliApi.request(`/notifications/${notification.id}/read`, {
          method: 'PATCH'
        });
        await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }

      if (profile.role === 'truck_owner') {
        navigation.navigate(notification.type === 'offer.sent' ? 'Offers' : notification.data?.requestId ? 'Offers' : 'Home');
      } else {
        navigation.navigate(notification.data?.requestId ? 'Home' : 'Alerts');
      }
    } catch (detailError) {
      setError(getErrorMessage(detailError));
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
                  {profile.role === 'truck_owner' && notification.type === 'offer.sent' ? (
                    <Text style={styles.noticeText}>Open Offers to review pickup, destination, load, estimate, then accept or decline.</Text>
                  ) : null}
                </View>
                <View style={styles.notificationActions}>
                  {notification.data?.requestId ? (
                    <Pressable accessibilityRole="button" disabled={pendingId === notification.id} onPress={() => openNotificationDetail(notification)} style={[styles.compactButton, pendingId === notification.id && styles.buttonDisabled]}>
                      <Text style={styles.compactButtonText}>{profile.role === 'truck_owner' && notification.type === 'offer.sent' ? 'View offer' : 'View detail'}</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    disabled={notification.deliveryStatus === 'read' || pendingId === notification.id}
                    onPress={() => markRead(notification)}
                    style={[styles.compactButton, (notification.deliveryStatus === 'read' || pendingId === notification.id) && styles.buttonDisabled]}
                  >
                    <Text style={styles.compactButtonText}>{notification.deliveryStatus === 'read' ? 'Read' : 'Mark read'}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </ShellCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function RatingReportPanel({ request, onRatingSaved }: { request: KuliRequest; onRatingSaved?: () => void }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState('5');
  const [reviewText, setReviewText] = useState('');
  const [mode, setMode] = useState<'review' | 'issue' | 'payment'>('review');
  const [category, setCategory] = useState('damage');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<PickedFile | null>(null);
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
      setError('Choose a rating from 1 to 5.');
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

      setMessage(`Review saved: ${result.data.rating}/5.`);
      onRatingSaved?.();
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
      setError('Add a short description before submitting.');
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

      let evidenceMessage = '';

      if (evidenceFile) {
        try {
          const intent = (await kuliApi.request(`/reports/${reportResult.data.id}/evidence/upload-intent`, {
            method: 'POST',
            body: {
              originalFileName: evidenceFile.name,
              mimeType: evidenceFile.mimeType,
              sizeBytes: evidenceFile.sizeBytes
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

      setMessage(`Issue ${reportResult.data.reportCode} submitted.${evidenceMessage}`);
      setEvidenceFile(null);
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
        <Text style={styles.fieldLabel}>After-trip actions</Text>
        <StatusPill tone={terminal ? 'ready' : 'warn'}>{terminal ? 'Ready' : 'Trip active'}</StatusPill>
      </View>
      <View style={styles.segmentedCompact}>
        {[
          { key: 'review', label: 'Review' },
          { key: 'issue', label: 'Issue' },
          { key: 'payment', label: 'Payment' }
        ].map((option) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: mode === option.key }}
            key={option.key}
            onPress={() => setMode(option.key as 'review' | 'issue' | 'payment')}
            style={[styles.segmentButton, mode === option.key && styles.segmentButtonActive]}
          >
            <Text style={[styles.segmentText, mode === option.key && styles.segmentTextActive]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      {mode === 'review' ? (
        <View style={styles.trustSection}>
          <Text style={styles.muted}>Rate the completed move. Five stars means everything went smoothly.</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((star) => {
              const selected = Number(rating) >= star;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={star}
                  onPress={() => setRating(String(star))}
                  style={styles.starButton}
                >
                  <Text style={[styles.starText, selected && styles.starTextSelected]}>{selected ? '★' : '☆'}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.ratingSummary}>{rating}/5 selected</Text>
          <Field label="Review note" value={reviewText} onChangeText={setReviewText} placeholder="Optional: what went well?" />
        </View>
      ) : null}

      {mode === 'issue' ? (
        <View style={styles.trustSection}>
          <Text style={styles.muted}>Report safety, damage, no-show, or app issues. Add a photo when it helps explain what happened.</Text>
          <Pressable accessibilityRole="button" onPress={() => setCategoryOpen((value) => !value)} style={styles.locationSelectButton}>
            <View style={styles.flex}>
              <Text style={styles.locationSelectTitle}>{reportCategoryLabels[category]}</Text>
              <Text style={styles.muted}>Issue category</Text>
            </View>
            <Text style={styles.locationChevron}>{categoryOpen ? 'Close' : 'Change'}</Text>
          </Pressable>
          {categoryOpen ? (
            <View style={styles.locationMenuContent}>
              {reportCategories.map((option) => {
                const selected = category === option;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={option}
                    onPress={() => {
                      setCategory(option);
                      setCategoryOpen(false);
                    }}
                    style={[styles.locationOption, selected && styles.locationOptionSelected]}
                  >
                    <Text style={[styles.fieldLabel, selected && styles.documentOptionSelectedText]}>{reportCategoryLabels[option]}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <Field label="What happened?" value={description} onChangeText={setDescription} placeholder="Add a short, clear description" />
          <FilePickerField label="Evidence photo" value={evidenceFile} onChange={setEvidenceFile} />
        </View>
      ) : null}

      {mode === 'payment' ? (
        <View style={styles.trustSection}>
          <Text style={styles.muted}>Use this only if the cash/manual payment amount or status needs review.</Text>
          <Field label="Payment issue" value={description} onChangeText={setDescription} placeholder="Describe the payment problem" />
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {message ? <Text style={styles.noticeText}>{message}</Text> : null}
      {mode === 'review' ? (
        <Pressable accessibilityRole="button" disabled={!canRate || Boolean(pendingAction)} onPress={submitRating} style={[styles.primaryButton, (!canRate || Boolean(pendingAction)) && styles.buttonDisabled]}>
          <Text style={styles.primaryButtonText}>{pendingAction === 'rating' ? 'Saving...' : 'Submit review'}</Text>
        </Pressable>
      ) : null}
      {mode === 'issue' ? (
        <Pressable accessibilityRole="button" disabled={Boolean(pendingAction)} onPress={createReport} style={[styles.primaryButton, Boolean(pendingAction) && styles.buttonDisabled]}>
          <Text style={styles.primaryButtonText}>{pendingAction === 'report' ? 'Submitting...' : 'Submit issue'}</Text>
        </Pressable>
      ) : null}
      {mode === 'payment' ? (
        <Pressable accessibilityRole="button" disabled={!canDisputePayment || Boolean(pendingAction)} onPress={disputePayment} style={[styles.primaryButton, (!canDisputePayment || Boolean(pendingAction)) && styles.buttonDisabled]}>
          <Text style={styles.primaryButtonText}>{pendingAction === 'dispute' ? 'Submitting...' : 'Dispute payment'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ClientHistoryScreen({ profile }: { profile: UserProfile }) {
  const [expandedRequestId, setExpandedRequestId] = useState('');
  const [dismissedRatingRequestIds, setDismissedRatingRequestIds] = useState<string[]>([]);
  const requestsQuery = useQuery({
    queryKey: ['kuli-requests', 'mine', 'history'],
    queryFn: async () => ((await kuliApi.request('/kuli-requests/mine')) as ApiEnvelope<KuliRequest[]>).data
  });

  const requests = requestsQuery.data ?? [];
  const terminalRequests = requests.filter((request) => terminalRequestStatuses.includes(request.status));
  const ratingPromptRequest = terminalRequests.find((request) => request.status === 'completed' && request.selectedOwnerId && !dismissedRatingRequestIds.includes(request.id));

  const dismissRatingPrompt = (requestId: string) => {
    setDismissedRatingRequestIds((current) => [...new Set([...current, requestId])]);
  };

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
              <View key={request.id} style={styles.requestRowStack}>
                <View style={styles.cardHeader}>
                  <View style={styles.flex}>
                    <Text style={styles.cardTitle}>{request.requestCode}</Text>
                    <Text style={styles.muted}>{request.pickupLocation?.addressText} to {request.destinationLocation?.addressText}</Text>
                  </View>
                  <StatusPill tone={statusTone(request.status)}>{statusLabels[request.status]}</StatusPill>
                </View>
                <View style={styles.cardHeader}>
                  <Text style={styles.muted}>{request.quoteSnapshot?.currency ?? 'ETB'} {Number(request.quoteSnapshot?.totalEstimate ?? 0).toFixed(2)}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setExpandedRequestId((current) => (current === request.id ? '' : request.id))}
                    style={styles.compactButton}
                  >
                    <Text style={styles.compactButtonText}>{expandedRequestId === request.id ? 'Hide' : 'Details'}</Text>
                  </Pressable>
                </View>
                {expandedRequestId === request.id ? <RatingReportPanel request={request} /> : null}
              </View>
            ))}
          </View>
        </ShellCard>
        <Text style={styles.muted}>Signed in as {profile.fullName || profile.email}.</Text>
      </ScrollView>
      <Modal animationType="fade" transparent visible={Boolean(ratingPromptRequest)} onRequestClose={() => ratingPromptRequest && dismissRatingPrompt(ratingPromptRequest.id)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerDialog}>
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              <Text style={styles.pickerEyebrow}>Trip complete</Text>
              <Text style={styles.pickerTitle}>Rate your KULI move</Text>
              {ratingPromptRequest ? (
                <>
                  <Text style={styles.muted}>{ratingPromptRequest.requestCode} / {ratingPromptRequest.pickupLocation?.addressText} to {ratingPromptRequest.destinationLocation?.addressText}</Text>
                  <RatingReportPanel request={ratingPromptRequest} onRatingSaved={() => dismissRatingPrompt(ratingPromptRequest.id)} />
                  <Pressable accessibilityRole="button" onPress={() => dismissRatingPrompt(ratingPromptRequest.id)} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Not now</Text>
                  </Pressable>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
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

  const completedRequests = (requestsQuery.data ?? []).filter((request) => request.status === 'completed' && !isPaymentClosedRequest(request));
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
      await queryClient.invalidateQueries({ queryKey: ['kuli-requests', 'mine', 'owner'] });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
          {completedRequests.length === 0 ? <Text style={styles.muted}>No completed trips waiting for cash confirmation. Payment confirmation is blocked until completion.</Text> : null}
          <View style={styles.roleGrid}>
            {completedRequests.map((request) => (
              <View key={request.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.flex}>
                    <Text style={styles.cardTitle}>{request.requestCode}</Text>
                    <Text style={styles.muted}>{request.quoteSnapshot?.currency ?? 'ETB'} {Number(request.quoteSnapshot?.totalEstimate ?? 0).toFixed(2)}</Text>
                  </View>
                  <StatusPill tone={request.payment?.status === 'disputed' ? 'warn' : 'ready'}>{request.payment?.status ?? 'Payment pending'}</StatusPill>
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
    <Tab.Navigator screenOptions={createTabScreenOptions(clientTabIcons)}>
      <Tab.Screen name="Home">{() => <ClientHomeScreen profile={profile} onSignOut={onSignOut} />}</Tab.Screen>
      <Tab.Screen name="Request" component={ClientQuoteScreen} />
      <Tab.Screen name="History">{() => <ClientHistoryScreen profile={profile} />}</Tab.Screen>
      <Tab.Screen name="Alerts">{() => <NotificationCenterScreen profile={profile} />}</Tab.Screen>
    </Tab.Navigator>
  );
}

function OwnerTabs({ profile, onSignOut }: { profile: UserProfile; onSignOut: () => void }) {
  return (
    <Tab.Navigator screenOptions={createTabScreenOptions(ownerTabIcons)}>
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
    <UiCard style={styles.authCard}>
      <SectionHeader
        eyebrow="Development readiness"
        title="Runtime configuration"
        description="These values help verify local mobile web and Expo builds before testing auth flows."
      />
      {readinessItems.map((item) => (
        <View key={item.label} style={styles.readinessRow}>
          <Text style={styles.readinessText}>{item.label}</Text>
          <StatusBadge tone={item.ready ? 'success' : 'error'}>{item.ready ? 'Set' : 'Missing'}</StatusBadge>
        </View>
      ))}
    </UiCard>
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

type TabIconConfig = Record<string, { name: string; label: string; iconSet?: 'ion' | 'material' }>;
type TabBarIconProps = { focused: boolean; color: string; size: number };

const clientTabIcons: TabIconConfig = {
  Home: { name: 'home-outline', label: 'Home' },
  Request: { name: 'map-marker-path', label: 'Request', iconSet: 'material' },
  History: { name: 'receipt-outline', label: 'History' },
  Alerts: { name: 'notifications-outline', label: 'Alerts' }
};

const ownerTabIcons: TabIconConfig = {
  Home: { name: 'speedometer-outline', label: 'Home', iconSet: 'material' },
  Vehicles: { name: 'truck-outline', label: 'Vehicles', iconSet: 'material' },
  Offers: { name: 'clipboard-list-outline', label: 'Offers', iconSet: 'material' },
  Alerts: { name: 'notifications-outline', label: 'Alerts' },
  Earnings: { name: 'cash-multiple', label: 'Earnings', iconSet: 'material' }
};

const createTabScreenOptions = (icons: TabIconConfig) => ({ route }: { route: { name: string } }) => {
  const icon = icons[route.name] ?? { name: 'ellipse-outline', label: route.name };

  return {
    headerShown: false,
    tabBarHideOnKeyboard: true,
    tabBarShowLabel: false,
    tabBarStyle: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: radii.xl,
      borderTopWidth: 1,
      borderWidth: 1,
      elevation: 16,
      height: 82,
      left: spacing.md,
      paddingBottom: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.sm,
      position: 'absolute' as const,
      right: spacing.md,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 24
    },
    tabBarItemStyle: {
      borderRadius: radii.xl,
      minHeight: 58,
      paddingVertical: 0
    },
    tabBarIcon: ({ focused }: TabBarIconProps) => (
      <BottomTabIcon focused={focused} iconSet={icon.iconSet} label={icon.label} name={icon.name} />
    )
  };
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
    padding: spacing.xl
  },
  content: {
    gap: spacing.lg,
    padding: spacing.xl,
    paddingBottom: 128
  },
  authContent: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl
  },
  requestContent: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: 128
  },
  requestSection: {
    gap: spacing.lg
  },
  requestLocationStack: {
    gap: spacing.md
  },
  requestManualPanel: {
    backgroundColor: colors.subtle,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  requestTruckGrid: {
    gap: spacing.md
  },
  requestTruckCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    minHeight: 132,
    padding: spacing.lg
  },
  requestTruckCardSelected: {
    backgroundColor: colors.black,
    borderColor: colors.black
  },
  requestTruckTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24
  },
  requestTruckDetail: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  requestTruckMetaRow: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  requestTruckMeta: {
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    flex: 1,
    gap: 2,
    minHeight: 58,
    justifyContent: 'center',
    padding: spacing.md
  },
  requestTruckMetaSelected: {
    backgroundColor: colors.darkSurface
  },
  requestTruckMetaValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900'
  },
  requestTruckMetaLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  requestBadgeOnDark: {
    backgroundColor: colors.card
  },
  requestTextOnDark: {
    color: colors.card
  },
  requestMutedOnDark: {
    color: '#D1D5DB'
  },
  requestLoadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  },
  requestLoadOption: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    minHeight: 106,
    padding: spacing.md,
    width: '47.8%'
  },
  requestLoadOptionSelected: {
    backgroundColor: colors.black,
    borderColor: colors.black
  },
  requestLoadTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20
  },
  requestLoadDetail: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17
  },
  requestSwitchRow: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: 72,
    padding: spacing.md
  },
  requestSwitchRowActive: {
    backgroundColor: colors.successTint,
    borderColor: colors.success
  },
  requestSwitchText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900'
  },
  requestSwitchTextActive: {
    color: colors.success
  },
  requestQuoteHero: {
    backgroundColor: colors.black,
    borderRadius: radii.lg,
    gap: spacing.xs,
    padding: spacing.lg
  },
  requestQuoteLabel: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  requestQuoteTotal: {
    color: colors.card,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36
  },
  requestQuoteMeta: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19
  },
  requestPaymentNote: {
    backgroundColor: colors.warningTint,
    borderColor: colors.warning,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md
  },
  requestCandidateList: {
    gap: spacing.md
  },
  requestCandidateCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  requestCandidateCardSelected: {
    backgroundColor: colors.black,
    borderColor: colors.black
  },
  requestCandidateTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 23
  },
  requestCandidateSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  requestCandidateMetricRow: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  requestCandidateMetric: {
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    flex: 1,
    gap: 2,
    minHeight: 62,
    justifyContent: 'center',
    padding: spacing.sm
  },
  requestCandidateMetricSelected: {
    backgroundColor: colors.darkSurface
  },
  requestCandidateMetricValue: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900'
  },
  requestCandidateMetricLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  requestWaitingPanel: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md
  },
  dispatchPanel: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  dispatchPulse: {
    alignItems: 'center',
    backgroundColor: colors.black,
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    width: 64
  },
  dispatchPulseText: {
    color: colors.card,
    fontSize: 24,
    fontWeight: '900',
    marginTop: -8
  },
  dispatchTitle: {
    color: colors.textPrimary,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 27,
    textAlign: 'center'
  },
  dispatchCopy: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center'
  },
  dispatchSummaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%'
  },
  dispatchSummaryItem: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    minHeight: 66,
    justifyContent: 'center',
    padding: spacing.md
  },
  dispatchSummaryValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900'
  },
  dispatchSummaryLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  dispatchStepList: {
    gap: spacing.md,
    width: '100%'
  },
  dispatchStepRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md
  },
  dispatchStepDot: {
    alignItems: 'center',
    backgroundColor: colors.muted,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32
  },
  dispatchStepDotDone: {
    backgroundColor: colors.success
  },
  dispatchStepDotCurrent: {
    backgroundColor: colors.warning
  },
  dispatchStepDotText: {
    color: colors.card,
    fontSize: 12,
    fontWeight: '900'
  },
  dispatchStepTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900'
  },
  timeoutPanel: {
    backgroundColor: colors.warningTint,
    borderColor: colors.warning,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  requestSummaryPanel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  clientHomeContent: {
    gap: spacing.xl,
    padding: spacing.lg,
    paddingBottom: 128
  },
  clientHero: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg
  },
  clientGreeting: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34
  },
  clientLocation: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22
  },
  clientAvatar: {
    alignItems: 'center',
    backgroundColor: colors.black,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  clientAvatarText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '900'
  },
  clientCtaPanel: {
    backgroundColor: colors.black,
    borderRadius: radii.lg,
    gap: spacing.lg,
    padding: spacing.lg
  },
  clientCtaTitle: {
    color: colors.card,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30
  },
  clientCtaCopy: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 21
  },
  clientCtaButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.xl
  },
  clientCtaButtonText: {
    color: colors.black,
    fontSize: 15,
    fontWeight: '900'
  },
  clientHeroMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm
  },
  clientHeroMetaText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 13,
    fontWeight: '700'
  },
  dashboardSection: {
    gap: spacing.md
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  },
  serviceTile: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    minHeight: 136,
    padding: spacing.lg,
    width: '47.8%'
  },
  serviceIcon: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  serviceIconText: {
    color: colors.black,
    fontSize: 20,
    fontWeight: '900'
  },
  serviceTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20
  },
  serviceDetail: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17
  },
  dashboardCard: {
    gap: spacing.lg
  },
  dashboardRoute: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  dashboardMetricRow: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  dashboardMetric: {
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    flex: 1,
    gap: 2,
    minHeight: 66,
    justifyContent: 'center',
    padding: spacing.md
  },
  dashboardMetricValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900'
  },
  dashboardMetricLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  dashboardSubcopy: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700'
  },
  clientExpandedDetails: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: spacing.lg
  },
  recentTripCard: {
    gap: spacing.md
  },
  recentTripFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between'
  },
  recentTripPrice: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '900'
  },
  authHero: {
    backgroundColor: colors.black,
    borderRadius: radii.xl,
    gap: spacing.md,
    minHeight: 220,
    justifyContent: 'flex-end',
    padding: spacing.xl
  },
  authLogoMark: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    justifyContent: 'center',
    minHeight: 58,
    minWidth: 112,
    paddingHorizontal: spacing.lg
  },
  authLogoText: {
    color: colors.black,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0
  },
  authHeroTitle: {
    color: colors.card,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36
  },
  authHeroCopy: {
    color: '#D1D5DB',
    fontSize: 15,
    lineHeight: 22
  },
  authTabs: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm
  },
  authTab: {
    alignItems: 'center',
    borderRadius: radii.md,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48
  },
  authTabActive: {
    backgroundColor: colors.black
  },
  authTabText: {
    color: colors.black,
    fontSize: 15,
    fontWeight: '800'
  },
  authTabTextActive: {
    color: colors.card
  },
  authCard: {
    gap: spacing.lg
  },
  authInlineLink: {
    alignSelf: 'flex-end',
    minHeight: 36,
    justifyContent: 'center'
  },
  authInlineLinkText: {
    color: colors.black,
    fontSize: 14,
    fontWeight: '800'
  },
  authMessage: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md
  },
  authMessageNotice: {
    backgroundColor: colors.successTint,
    borderColor: colors.success
  },
  authMessageError: {
    backgroundColor: colors.errorTint,
    borderColor: colors.error
  },
  authMessageText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20
  },
  authMessageTextNotice: {
    color: colors.success
  },
  authMessageTextError: {
    color: colors.error
  },
  eyebrow: {
    color: colors.textSecondary,
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
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs
  },
  segmentedCompact: {
    backgroundColor: colors.subtle,
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
    minHeight: 50
  },
  segmentButtonActive: {
    backgroundColor: colors.black
  },
  segmentText: {
    color: colors.black,
    fontSize: 15,
    fontWeight: '800'
  },
  segmentTextActive: {
    color: colors.card
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
    minHeight: 92,
    padding: spacing.lg
  },
  roleOptionSelected: {
    backgroundColor: colors.black,
    borderColor: colors.black
  },
  roleOptionTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900'
  },
  roleOptionTitleSelected: {
    color: colors.card
  },
  roleOptionText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  roleOptionTextSelected: {
    color: '#E5E7EB'
  },
  documentOption: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.sm
  },
  documentOptionSelected: {
    backgroundColor: colors.black,
    borderColor: colors.black
  },
  documentOptionSelectedText: {
    color: colors.card
  },
  documentUploadHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm
  },
  documentProgressTrack: {
    backgroundColor: colors.subtle,
    borderRadius: radii.sm,
    height: 8,
    overflow: 'hidden'
  },
  documentProgressFill: {
    backgroundColor: colors.black,
    height: '100%'
  },
  documentUploadCard: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.sm
  },
  documentUploadCardUploaded: {
    borderColor: colors.success,
    backgroundColor: colors.successTint
  },
  documentUploadCardReady: {
    borderColor: colors.warning
  },
  documentGuidelineGrid: {
    gap: 2
  },
  documentGuideline: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17
  },
  reasonOption: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.sm
  },
  reasonOptionSelected: {
    backgroundColor: colors.red,
    borderColor: colors.red
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.black,
    borderRadius: radii.md,
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  primaryButtonText: {
    color: colors.card,
    fontSize: 15,
    fontWeight: '800'
  },
  dangerButton: {
    backgroundColor: colors.red
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderColor: colors.subtle,
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  secondaryButtonText: {
    color: colors.black,
    fontSize: 15,
    fontWeight: '800'
  },
  dangerOutlineButton: {
    borderColor: colors.red
  },
  dangerOutlineText: {
    color: colors.red
  },
  buttonDisabled: {
    opacity: 0.55
  },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  detailPanel: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.sm
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
    fontWeight: '700'
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
    color: colors.nearBlack,
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
    backgroundColor: colors.subtle,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: spacing.lg
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
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    minWidth: 118,
    paddingHorizontal: spacing.xs
  },
  switchRow: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: spacing.md
  },
  switchRowActive: {
    borderColor: colors.success,
    backgroundColor: colors.successTint
  },
  switchText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800'
  },
  switchTextActive: {
    color: colors.success
  },
  priceBox: {
    backgroundColor: colors.card,
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
    backgroundColor: colors.card,
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
    borderColor: colors.black
  },
  requestRow: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 62,
    padding: spacing.sm
  },
  requestRowStack: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.sm
  },
  locationSelectButton: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 60,
    padding: spacing.sm
  },
  locationSelectTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900'
  },
  locationChevron: {
    color: colors.black,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  locationMenu: {
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    maxHeight: 360
  },
  locationMenuContent: {
    gap: spacing.xs,
    padding: spacing.xs
  },
  locationOption: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 54,
    padding: spacing.sm
  },
  locationOptionSelected: {
    backgroundColor: colors.black
  },
  locationCoords: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800'
  },
  mapPreview: {
    backgroundColor: '#ECECEA',
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 190,
    overflow: 'hidden',
    position: 'relative'
  },
  mapPreviewFullScreen: {
    borderRadius: 0,
    flex: 1,
    height: 'auto'
  },
  fullscreenMapShell: {
    backgroundColor: colors.background,
    flex: 1
  },
  fullscreenMapHeader: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md
  },
  mapTile: {
    height: '100%',
    left: 0,
    opacity: 0.82,
    position: 'absolute',
    top: 0,
    width: '100%'
  },
  mapScrim: {
    backgroundColor: 'rgba(255, 250, 240, 0.18)',
    height: '100%',
    left: 0,
    position: 'absolute',
    top: 0,
    width: '100%'
  },
  mapGridLineVertical: {
    backgroundColor: '#cdded6',
    height: '100%',
    left: '50%',
    position: 'absolute',
    top: 0,
    width: 1
  },
  mapGridLineHorizontal: {
    backgroundColor: '#cdded6',
    height: 1,
    left: 0,
    position: 'absolute',
    top: '50%',
    width: '100%'
  },
  mapRoute: {
    backgroundColor: colors.warning,
    borderRadius: radii.sm,
    height: 6,
    left: '18%',
    opacity: 0.75,
    position: 'absolute',
    top: '48%',
    width: '64%'
  },
  mapPin: {
    alignItems: 'center',
    borderColor: colors.card,
    borderRadius: 14,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    marginLeft: -14,
    marginTop: -14,
    position: 'absolute',
    width: 28
  },
  mapPinPickup: {
    backgroundColor: colors.black
  },
  mapPinDestination: {
    backgroundColor: colors.warning
  },
  mapPinTruck: {
    backgroundColor: colors.nearBlack
  },
  mapControls: {
    gap: spacing.xs,
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm
  },
  mapControlButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34
  },
  mapControlText: {
    color: colors.black,
    fontSize: 20,
    fontWeight: '900'
  },
  mapExpandButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm
  },
  mapExpandText: {
    color: colors.black,
    fontSize: 12,
    fontWeight: '900'
  },
  mapPinText: {
    color: colors.card,
    fontSize: 12,
    fontWeight: '900'
  },
  mapLegend: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: radii.sm,
    bottom: spacing.sm,
    gap: 2,
    left: spacing.sm,
    padding: spacing.sm,
    position: 'absolute',
    right: spacing.sm
  },
  mapLegendText: {
    color: colors.nearBlack,
    fontSize: 12,
    fontWeight: '800'
  },
  subsection: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.sm
  },
  trustSection: {
    gap: spacing.sm
  },
  starRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  starButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44
  },
  starText: {
    color: colors.line,
    fontSize: 34,
    fontWeight: '900'
  },
  starTextSelected: {
    color: colors.warning
  },
  ratingSummary: {
    color: colors.nearBlack,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center'
  },
  candidateStarRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    marginTop: 2
  },
  candidateStar: {
    color: colors.line,
    fontSize: 18,
    fontWeight: '900'
  },
  candidateStarCompact: {
    fontSize: 14
  },
  candidateStarFilled: {
    color: colors.warning
  },
  fileSummary: {
    backgroundColor: colors.subtle,
    borderRadius: radii.sm,
    gap: spacing.xs,
    padding: spacing.sm
  },
  tripWorkspace: {
    gap: spacing.md
  },
  activeMapStage: {
    borderRadius: radii.lg,
    overflow: 'hidden'
  },
  activeTripSheet: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    marginTop: -spacing.xl,
    padding: spacing.lg
  },
  activeTripTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26
  },
  activeNextStep: {
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    gap: spacing.xs,
    padding: spacing.md
  },
  trackingStatusStrip: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between'
  },
  trackingStatusItem: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs
  },
  trackingStatusDot: {
    backgroundColor: colors.border,
    borderRadius: 7,
    height: 14,
    width: 14
  },
  trackingStatusDotDone: {
    backgroundColor: colors.success
  },
  trackingStatusDotCurrent: {
    backgroundColor: colors.warning
  },
  trackingStatusLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center'
  },
  trackingStatusLabelCurrent: {
    color: colors.textPrimary
  },
  trackingPanel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  trackingPanelTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23
  },
  timelineRefreshButton: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  timelineList: {
    gap: 0
  },
  timelineEventRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: spacing.md
  },
  timelineMarkerColumn: {
    alignItems: 'center',
    width: 22
  },
  timelineDot: {
    backgroundColor: colors.muted,
    borderColor: colors.card,
    borderRadius: 10,
    borderWidth: 3,
    height: 20,
    width: 20
  },
  timelineDotReady: {
    backgroundColor: colors.success
  },
  timelineDotWarn: {
    backgroundColor: colors.warning
  },
  timelineDotBlocked: {
    backgroundColor: colors.error
  },
  timelineConnector: {
    backgroundColor: colors.border,
    flex: 1,
    minHeight: 48,
    width: 2
  },
  timelineEventCard: {
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  timelineTime: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800'
  },
  timelineRow: {
    alignItems: 'flex-start',
    backgroundColor: colors.subtle,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm
  },
  compactButton: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderColor: colors.subtle,
    borderRadius: radii.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: spacing.sm
  },
  compactButtonText: {
    color: colors.black,
    fontSize: 12,
    fontWeight: '800'
  },
  messageList: {
    gap: spacing.md
  },
  messageBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.subtle,
    borderRadius: radii.lg,
    maxWidth: '88%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  messageBubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.black
  },
  messageBody: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20
  },
  messageBodyMine: {
    color: colors.card
  },
  messageMeta: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4
  },
  chatPanel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  chatHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between'
  },
  quickReplyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  quickReplyChip: {
    backgroundColor: colors.subtle,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md
  },
  quickReplyText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800'
  },
  notificationRow: {
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 76,
    padding: spacing.sm
  },
  notificationActions: {
    gap: spacing.xs,
    minWidth: 92
  },
  metricGrid: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  metricBox: {
    backgroundColor: colors.subtle,
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
    backgroundColor: colors.card,
    borderColor: colors.warning,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg
  },
  pickerDialog: {
    backgroundColor: colors.panel,
    borderRadius: radii.md,
    gap: spacing.md,
    maxHeight: '88%',
    padding: spacing.lg,
    width: '100%'
  },
  modalScrollContent: {
    gap: spacing.md
  },
  pickerHeader: {
    backgroundColor: colors.black,
    borderRadius: radii.sm,
    gap: spacing.xs,
    margin: -spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.lg
  },
  pickerEyebrow: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  pickerTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30
  },
  pickerHeaderText: {
    color: '#E5E7EB'
  },
  pickerHeaderTitle: {
    color: colors.card
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs
  },
  dateCell: {
    alignItems: 'center',
    borderRadius: radii.sm,
    minHeight: 58,
    justifyContent: 'center',
    width: '22.8%'
  },
  dateCellSelected: {
    backgroundColor: colors.black
  },
  dateCellWeekday: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  dateCellDay: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900'
  },
  timeList: {
    maxHeight: 260
  },
  timeOption: {
    alignItems: 'center',
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.sm
  },
  timeOptionText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700'
  },
  radioOuter: {
    alignItems: 'center',
    borderColor: colors.muted,
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    width: 20
  },
  radioOuterSelected: {
    borderColor: colors.black
  },
  radioInner: {
    backgroundColor: colors.black,
    borderRadius: 5,
    height: 10,
    width: 10
  },
  pickerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end'
  },
  pill: {
    borderRadius: radii.xl,
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: spacing.md
  },
  pillReady: {
    backgroundColor: colors.successTint
  },
  pillWarn: {
    backgroundColor: colors.warningTint
  },
  pillBlocked: {
    backgroundColor: colors.errorTint
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800'
  },
  pillTextReady: {
    color: colors.success
  },
  pillTextWarn: {
    color: colors.warning
  },
  pillTextBlocked: {
    color: colors.error
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
