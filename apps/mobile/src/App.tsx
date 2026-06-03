import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, useFocusEffect, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';

import { clearSessionAccessToken, getKuliAccessToken, kuliApi, setSessionAccessToken } from './lib/api';
import { supabase } from './lib/supabase';
import { runtimeConfig, runtimeReadiness } from './config/runtime';
import { colors, radii, spacing } from './theme';
import { BottomTabIcon } from './components/navigation/BottomTabIcon';
import { ActionSheetCard } from './components/ui/ActionSheetCard';
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
import { MetricCard } from './components/visual/MetricCard';
import { RoutePill } from './components/visual/RoutePill';

declare const __DEV__: boolean;

type Role = 'client' | 'truck_owner' | 'assistant' | 'admin';
type AccountStatus = 'active' | 'pending_verification' | 'suspended' | 'banned' | 'deleted';
type AuthMode = 'login' | 'register' | 'forgot';
type ResetPasswordStep = 'request' | 'verify';
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
  photo?: VehiclePhoto;
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
  photo?: VehiclePhoto;
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
type VehiclePhoto = {
  fileId?: string;
  originalFileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  previewUrl?: string;
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

const accountStatusLabels: Record<AccountStatus, string> = {
  active: 'Active',
  pending_verification: 'Pending',
  suspended: 'Suspended',
  banned: 'Blocked',
  deleted: 'Closed'
};

const paymentStatusLabels: Record<PaymentRecord['status'], string> = {
  pending: 'Payment pending',
  confirmed_by_owner: 'Payment confirmed',
  disputed: 'In review',
  resolved: 'Resolved',
  cancelled: 'Cancelled'
};

const vehicleVerificationLabels: Record<Vehicle['verificationStatus'], string> = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected'
};

const vehicleAvailabilityLabels: Record<Vehicle['availabilityStatus'], string> = {
  offline: 'Offline',
  online_available: 'Online',
  busy_on_job: 'Busy',
  under_maintenance: 'Maintenance',
  suspended: 'Paused'
};

const offerStatusLabels: Record<TripOffer['status'], string> = {
  sent: 'New',
  viewed: 'Viewed',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
  cancelled: 'Cancelled'
};

const isBlockedStatus = (status: AccountStatus) => ['suspended', 'banned', 'deleted'].includes(status);
const AUTH_ONBOARDING_COMPLETED_KEY = 'kuli.authOnboardingCompleted';
const AUTH_PROFILE_DRAFT_PREFIX = 'kuli.profileDraft.';
const VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const publicRoles: PublicRole[] = ['client', 'truck_owner'];
const isPublicRole = (value: unknown): value is PublicRole => typeof value === 'string' && publicRoles.includes(value as PublicRole);

const passwordRules = [
  { id: 'length', label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { id: 'lowercase', label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { id: 'number', label: 'One number', test: (value: string) => /\d/.test(value) }
];

const getPasswordChecks = (value: string) => passwordRules.map((rule) => ({ ...rule, met: rule.test(value) }));
const isStrongPassword = (value: string) => getPasswordChecks(value).every((check) => check.met);

const validateEthiopianPhone = (value: string) => {
  const raw = value.trim();
  const compact = raw.replace(/[\s().-]/g, '');
  let normalized = '';

  if (!compact) {
    return {
      valid: false,
      normalized,
      message: 'Use an Ethiopian mobile number, for example +251911000000.'
    };
  }

  if (/^0[79]\d{8}$/.test(compact)) {
    normalized = `+251${compact.slice(1)}`;
  } else if (/^251[79]\d{8}$/.test(compact)) {
    normalized = `+${compact}`;
  } else if (/^\+251[79]\d{8}$/.test(compact)) {
    normalized = compact;
  }

  if (!normalized) {
    return {
      valid: false,
      normalized: raw,
      message: 'Enter a valid Ethiopian mobile number, such as +251911000000 or 0911000000.'
    };
  }

  return {
    valid: true,
    normalized,
    message: `Looks good: ${normalized}`
  };
};

const readStringMetadata = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const isStaffSession = (session: Session) => ['admin', 'assistant'].includes(readStringMetadata(session.user.user_metadata?.role));

const draftFromSessionMetadata = (session: Session): VerificationDraft | null => {
  const metadata = session.user.user_metadata ?? {};
  const role = metadata.role;
  const email = session.user.email?.trim().toLowerCase() ?? '';
  const fullName = readStringMetadata(metadata.full_name) || readStringMetadata(metadata.fullName);
  const phone = readStringMetadata(metadata.phone);
  const phoneValidation = validateEthiopianPhone(phone);

  if (!email || !fullName || !isPublicRole(role)) {
    return null;
  }

  return {
    email,
    role,
    fullName,
    phone: phoneValidation.valid ? phoneValidation.normalized : phone
  };
};

const normalizeProfileDraft = (value: unknown): VerificationDraft | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as Record<string, unknown>;
  const email = readStringMetadata(source.email).toLowerCase();
  const role = source.role;
  const fullName = readStringMetadata(source.fullName);
  const phone = readStringMetadata(source.phone);
  const phoneValidation = validateEthiopianPhone(phone);

  if (!email || !isValidEmail(email) || !fullName || !isPublicRole(role)) {
    return null;
  }

  return {
    email,
    role,
    fullName,
    phone: phoneValidation.valid ? phoneValidation.normalized : phone
  };
};

const profileDraftStorageKey = (email: string) => `${AUTH_PROFILE_DRAFT_PREFIX}${email.trim().toLowerCase()}`;

const saveStoredProfileDraft = async (draft: VerificationDraft) => {
  const normalizedDraft = normalizeProfileDraft(draft);

  if (!normalizedDraft) {
    return;
  }

  await AsyncStorage.setItem(profileDraftStorageKey(normalizedDraft.email), JSON.stringify(normalizedDraft)).catch(() => undefined);
};

const loadStoredProfileDraft = async (email?: string | null) => {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    return null;
  }

  const draftJson = await AsyncStorage.getItem(profileDraftStorageKey(normalizedEmail)).catch(() => null);

  if (!draftJson) {
    return null;
  }

  try {
    const draft = normalizeProfileDraft(JSON.parse(draftJson));

    if (!draft) {
      await AsyncStorage.removeItem(profileDraftStorageKey(normalizedEmail)).catch(() => undefined);
    }

    return draft;
  } catch {
    await AsyncStorage.removeItem(profileDraftStorageKey(normalizedEmail)).catch(() => undefined);
    return null;
  }
};

const clearStoredProfileDraft = async (email?: string | null) => {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    return;
  }

  await AsyncStorage.removeItem(profileDraftStorageKey(normalizedEmail)).catch(() => undefined);
};

const syncProfileFromDraft = async (session: Session, draft: VerificationDraft) => {
  const normalizedDraft = normalizeProfileDraft(draft);

  if (!normalizedDraft) {
    return null;
  }

  setSessionAccessToken(session.access_token);

  const result = (await kuliApi.syncProfile({
    role: normalizedDraft.role,
    fullName: normalizedDraft.fullName,
    phone: normalizedDraft.phone || undefined,
    email: normalizedDraft.email
  })) as ApiEnvelope<ProfileSyncResult>;

  await clearStoredProfileDraft(normalizedDraft.email);

  return result.data.user;
};

const syncPublicProfileFromSession = async (session: Session) => {
  const draft = draftFromSessionMetadata(session);

  if (!draft) {
    return null;
  }

  return syncProfileFromDraft(session, draft);
};

const syncStoredProfileFromSession = async (session: Session) => {
  const draft = await loadStoredProfileDraft(session.user.email);

  if (!draft) {
    return null;
  }

  return syncProfileFromDraft(session, draft);
};

const fetchProfileForSession = async (session: Session) => {
  setSessionAccessToken(session.access_token);

  try {
    const result = (await kuliApi.me()) as ApiEnvelope<UserProfile>;
    return result.data;
  } catch (error) {
    if ((error as { status?: number }).status !== 401) {
      throw error;
    }

    const { data } = await supabase.auth.getSession();
    const refreshedSession = data.session;

    if (!refreshedSession?.access_token) {
      throw error;
    }

    setSessionAccessToken(refreshedSession.access_token);
    const retry = (await kuliApi.me()) as ApiEnvelope<UserProfile>;
    return retry.data;
  }
};

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

const authDebug = (...messages: unknown[]) => {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log('[KULI auth]', ...messages);
  }
};

const readAuthUrlParams = (url: string) => {
  const params = new URLSearchParams();
  const appendParams = (value?: string) => {
    if (!value) {
      return;
    }

    new URLSearchParams(value).forEach((paramValue, key) => {
      params.set(key, paramValue);
    });
  };

  const queryStart = url.indexOf('?');
  const hashStart = url.indexOf('#');

  if (queryStart >= 0) {
    appendParams(url.slice(queryStart + 1, hashStart >= 0 ? hashStart : undefined));
  }

  if (hashStart >= 0) {
    appendParams(url.slice(hashStart + 1));
  }

  return params;
};

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
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const isPassword = Boolean(secureTextEntry);

  return (
    <View style={[styles.field, containerStyle]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputShell}>
        <TextInput
          accessibilityLabel={label}
          autoCapitalize="none"
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#829197"
          secureTextEntry={isPassword && !passwordVisible}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            isPassword && styles.inputWithIcon,
            focused && { borderColor: colors.primary, backgroundColor: '#FFFFFF' }
          ]}
          value={value}
        />
        {isPassword ? (
          <Pressable
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={styles.inputEyeButton}
          >
            <MaterialCommunityIcons color={colors.textSecondary} name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={22} />
          </Pressable>
        ) : null}
      </View>
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
  const icon = role === 'client' ? 'home-city-outline' : 'truck-fast-outline';

  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.roleOption, selected && styles.roleOptionSelected]}>
      <View style={[styles.roleOptionIcon, selected && styles.roleOptionIconSelected]}>
        <MaterialCommunityIcons color={selected ? colors.black : colors.textPrimary} name={icon} size={24} />
      </View>
      <View style={styles.roleOptionBody}>
        <Text style={[styles.roleOptionTitle, selected && styles.roleOptionTitleSelected]}>
          {role === 'client' ? 'Request trucks' : 'Earn with your truck'}
        </Text>
        <Text style={[styles.roleOptionText, selected && styles.roleOptionTextSelected]}>
          {role === 'client' ? 'Book verified trucks for moves and deliveries.' : 'Register a vehicle and receive nearby requests.'}
        </Text>
      </View>
      {selected ? <MaterialCommunityIcons color={colors.card} name="check-circle" size={22} /> : null}
    </Pressable>
  );
}

function AuthBrandPanel({ mode }: { mode: AuthMode }) {
  const title = mode === 'register' ? 'Join KULI.' : mode === 'forgot' ? 'Recover your account.' : 'Welcome back.';
  const copy =
    mode === 'register'
      ? 'Create a client or truck-owner account for verified logistics in Addis Ababa.'
      : mode === 'forgot'
        ? 'Enter your email and we will send a secure password reset code.'
        : 'Sign in to request trucks, manage offers, and follow every move with your KULI account.';

  return (
    <View style={styles.authHero}>
      <View style={styles.authHeroTop}>
        <View style={styles.authLogoMark}>
          <Text style={styles.authLogoText}>KULI</Text>
        </View>
        <Text style={styles.authCityLabel}>Addis Ababa</Text>
      </View>
      <View style={styles.authHeroCenter}>
        <MaterialCommunityIcons color={colors.card} name="truck-delivery-outline" size={42} />
        <Text style={styles.authHeroTitle}>{title}</Text>
        <Text style={styles.authHeroCopy}>{copy}</Text>
      </View>
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

function PasswordChecklist({
  password,
  confirmPassword = '',
  includeMatch = false
}: {
  password: string;
  confirmPassword?: string;
  includeMatch?: boolean;
}) {
  const checks = [
    ...getPasswordChecks(password),
    ...(includeMatch
      ? [
          {
            id: 'match',
            label: 'Passwords match',
            met: Boolean(password && confirmPassword && password === confirmPassword)
          }
        ]
      : [])
  ];

  return (
    <View style={styles.validationCard}>
      {checks.map((check) => (
        <View key={check.id} style={styles.validationRow}>
          <MaterialCommunityIcons
            color={check.met ? colors.success : colors.textSecondary}
            name={check.met ? 'check-circle' : 'circle-outline'}
            size={18}
          />
          <Text style={[styles.validationText, check.met && styles.validationTextMet]}>{check.label}</Text>
        </View>
      ))}
    </View>
  );
}

function PhoneValidationHint({ value }: { value: string }) {
  const validation = validateEthiopianPhone(value);
  const touched = Boolean(value.trim());

  return (
    <View style={[styles.validationHint, touched && (validation.valid ? styles.validationHintSuccess : styles.validationHintError)]}>
      <MaterialCommunityIcons
        color={!touched ? colors.textSecondary : validation.valid ? colors.success : colors.error}
        name={!touched ? 'cellphone' : validation.valid ? 'check-circle' : 'alert-circle'}
        size={17}
      />
      <Text style={[styles.validationHintText, touched && (validation.valid ? styles.validationHintTextSuccess : styles.validationHintTextError)]}>
        {validation.message}
      </Text>
    </View>
  );
}

function SplashScreen({ compact = false }: { compact?: boolean }) {
  const dot1 = useRef(new Animated.Value(0.25)).current;
  const dot2 = useRef(new Animated.Value(0.25)).current;
  const dot3 = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const pulseDot = (val: Animated.Value, delay: number) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.timing(val, { toValue: 1.0, duration: 300, useNativeDriver: true }),
        Animated.timing(val, { toValue: 0.25, duration: 400, useNativeDriver: true }),
        Animated.delay(500)
      ]);
    };

    const anim = Animated.loop(
      Animated.parallel([
        pulseDot(dot1, 0),
        pulseDot(dot2, 200),
        pulseDot(dot3, 400)
      ])
    );

    anim.start();

    return () => {
      anim.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <SafeAreaView style={styles.splashScreen}>
      <View style={styles.splashGrain} />
      <View style={styles.splashContent}>
        <View style={styles.splashLogoBox}>
          <Text style={styles.splashLogoText}>KULI</Text>
        </View>
        <View style={styles.splashDots} accessibilityElementsHidden>
          <Animated.View style={[styles.splashDot, { opacity: dot1 }]} />
          <Animated.View style={[styles.splashDot, { opacity: dot2 }]} />
          <Animated.View style={[styles.splashDot, { opacity: dot3 }]} />
        </View>
      </View>
      <View style={styles.splashFooter}>
        <Text style={styles.splashTitle}>{compact ? 'Opening your workspace.' : 'Your logistics partner in Addis.'}</Text>
        <Text style={styles.splashCopy}>Verified trucks. Clear prices. Accountable moves.</Text>
      </View>
    </SafeAreaView>
  );
}

function VerificationRequiredScreen({
  draft,
  code,
  cooldown,
  pending,
  notice,
  error,
  onCodeChange,
  onVerifyCode,
  onRefresh,
  onResend,
  onBack
}: {
  draft: VerificationDraft;
  code: string;
  cooldown: number;
  pending: boolean;
  notice: string;
  error: string;
  onCodeChange: (value: string) => void;
  onVerifyCode: () => void;
  onRefresh: () => void;
  onResend: () => void;
  onBack: () => void;
}) {
  const canResend = cooldown <= 0 && !pending;

  return (
    <UiCard style={styles.authCard}>
      <View style={styles.verificationIcon}>
        <MaterialCommunityIcons color={colors.black} name="email-check-outline" size={30} />
      </View>
      <SectionHeader
        eyebrow="Email confirmation"
        title="Check your email"
        description="Open the confirmation link or enter the code Supabase sent. KULI will not resend automatically."
      />
      <View style={styles.verificationEmailBox}>
        <Text style={styles.fieldLabel}>{draft.email}</Text>
        <Text style={styles.muted}>Resending too often may be rate-limited. Use the resend button only when needed.</Text>
      </View>
      <Field label="Confirmation code" value={code} onChangeText={onCodeChange} placeholder="6-digit code" keyboardType="numeric" />
      {error ? <AuthMessage tone="error" message={error} /> : null}
      {notice ? <AuthMessage tone="notice" message={notice} /> : null}
      <PrimaryButton disabled={!code.trim() || pending} label={pending ? 'Checking...' : 'Verify code'} loading={pending} onPress={onVerifyCode} />
      <SecondaryButton disabled={pending} label="I verified my email" loading={pending} onPress={onRefresh} />
      <View style={styles.actionRow}>
        <SecondaryButton
          disabled={!canResend}
          label={cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
          onPress={onResend}
          style={styles.actionButton}
        />
        <SecondaryButton disabled={pending} label="Use another email" onPress={onBack} style={styles.actionButton} />
      </View>
    </UiCard>
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
  const [sheetOpen, setSheetOpen] = useState(false);

  const pickFile = async (source: PickedFile['source']) => {
    setSheetOpen(false);
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
          ? await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.85 })
          : await ImagePicker.launchImageLibraryAsync({ allowsEditing: false, mediaTypes: ['images'], quality: 0.85 });

      if (result.canceled || !result.assets[0]) return;

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
      <View style={styles.filePickerRow}>
        <Pressable accessibilityRole="button" onPress={() => setSheetOpen(true)} style={styles.filePickerAttachBtn}>
          <MaterialCommunityIcons name="paperclip" color={colors.textPrimary} size={18} />
          <Text style={styles.filePickerAttachText}>{value ? 'Change photo' : 'Attach photo'}</Text>
        </Pressable>
        {value ? (
          <Pressable accessibilityRole="button" onPress={() => onChange(null)} style={styles.filePickerRemoveBtn}>
            <MaterialCommunityIcons name="close" color={colors.error} size={18} />
          </Pressable>
        ) : null}
      </View>
      <Modal animationType="slide" transparent visible={sheetOpen} onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheetOpen(false)}>
          <View style={styles.sheetPanel}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Attach photo</Text>
            <Pressable accessibilityRole="button" onPress={() => pickFile('library')} style={styles.sheetOption}>
              <MaterialCommunityIcons name="image-outline" color={colors.textPrimary} size={22} />
              <Text style={styles.sheetOptionText}>{uploadLabel}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => pickFile('camera')} style={styles.sheetOption}>
              <MaterialCommunityIcons name="camera-outline" color={colors.textPrimary} size={22} />
              <Text style={styles.sheetOptionText}>{takeLabel}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setSheetOpen(false)} style={[styles.sheetOption, styles.sheetCancel]}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function AuthScreen({
  initialNotice = '',
  onAuthenticated,
  onPasswordRecoveryVerified
}: {
  initialNotice?: string;
  onAuthenticated: (profile: UserProfile, session: Session) => void;
  onPasswordRecoveryVerified: (session: Session) => void;
}) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [role, setRole] = useState<PublicRole>('client');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [verificationDraft, setVerificationDraft] = useState<VerificationDraft | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resetStep, setResetStep] = useState<ResetPasswordStep>('request');
  const [resetCode, setResetCode] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCooldown, setResetCooldown] = useState(0);
  const [resetPending, setResetPending] = useState(false);
  const [notice, setNotice] = useState(initialNotice);
  const [error, setError] = useState('');

  const isLogin = mode === 'login';
  const isRegister = mode === 'register';
  const normalizedEmail = email.trim().toLowerCase();
  const phoneValidation = validateEthiopianPhone(phone);
  const normalizedPhone = phoneValidation.valid ? phoneValidation.normalized : phone.trim();
  const passwordsMatch = Boolean(password && confirmPassword && password === confirmPassword);
  const canSubmit =
    Boolean(normalizedEmail) &&
    (isLogin
      ? password.length >= 1
      : Boolean(fullName.trim()) && phoneValidation.valid && isStrongPassword(password) && passwordsMatch);
  const canResetPassword = !resetPending;

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
    setNotice('');

    if (nextMode !== 'forgot') {
      setResetStep('request');
      setResetCode('');
      setResetEmail('');
      setResetCooldown(0);
      setResetPending(false);
    }

    if (nextMode !== 'register') {
      setConfirmPassword('');
    }
  };

  useEffect(() => {
    setNotice(initialNotice);
  }, [initialNotice]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = setTimeout(() => setResendCooldown((value) => Math.max(0, value - 1)), 1000);

    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (resetCooldown <= 0) {
      return;
    }

    const timer = setTimeout(() => setResetCooldown((value) => Math.max(0, value - 1)), 1000);

    return () => clearTimeout(timer);
  }, [resetCooldown]);

  const loadProfile = async (session: Session) => {
    try {
      const profile = await fetchProfileForSession(session);
      onAuthenticated(profile, session);
    } catch (profileError) {
      if ((profileError as { code?: string }).code === 'PROFILE_NOT_FOUND') {
        const syncedProfile = (await syncPublicProfileFromSession(session)) ?? (await syncStoredProfileFromSession(session));

        if (syncedProfile) {
          onAuthenticated(syncedProfile, session);
          return;
        }
      }

      throw profileError;
    }
  };

  const syncDraftProfile = async (session: Session, draft: VerificationDraft) => {
    const syncedProfile = (await syncProfileFromDraft(session, draft)) ?? (await syncPublicProfileFromSession(session)) ?? (await syncStoredProfileFromSession(session));

    if (!syncedProfile) {
      throw new Error('Your email is confirmed, but KULI could not find the registration details for this account. Sign out and register again with the same email.');
    }

    onAuthenticated(syncedProfile, session);
  };

  const sendPasswordReset = async () => {
    if (resetPending || resetCooldown > 0) {
      return;
    }

    setError('');
    setNotice('');

    if (!normalizedEmail) {
      setError('Enter the email address for your KULI account.');
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    if (!runtimeReadiness.hasSupabaseUrl || !runtimeReadiness.hasSupabaseAnonKey) {
      setError('Supabase is not configured for password recovery in this environment.');
      return;
    }

    setResetPending(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: runtimeConfig.passwordResetRedirectUrl
      });

      if (resetError) {
        throw resetError;
      }

      setResetEmail(normalizedEmail);
      setResetCode('');
      setResetStep('verify');
      setResetCooldown(VERIFICATION_RESEND_COOLDOWN_SECONDS);
      setNotice('Password reset code sent. Enter the code from your email to choose a new password in KULI.');
    } catch (resetError) {
      setError(getErrorMessage(resetError));
    } finally {
      setResetPending(false);
    }
  };

  const verifyPasswordResetCode = async () => {
    const targetEmail = (resetEmail || normalizedEmail).trim().toLowerCase();

    if (resetPending) {
      return;
    }

    setError('');
    setNotice('');

    if (!isValidEmail(targetEmail)) {
      setError('Enter a valid email address before verifying the code.');
      setResetStep('request');
      return;
    }

    if (!resetCode.trim()) {
      setError('Enter the reset code from your email.');
      return;
    }

    setResetPending(true);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: targetEmail,
        token: resetCode.trim(),
        type: 'recovery'
      });

      if (verifyError) {
        throw verifyError;
      }

      const recoverySession = data.session ?? (await supabase.auth.getSession()).data.session;

      if (!recoverySession) {
        setError('The code was accepted, but KULI could not open a recovery session. Request a new code and try again.');
        return;
      }

      setSessionAccessToken(recoverySession.access_token);
      onPasswordRecoveryVerified(recoverySession);
    } catch (verifyError) {
      setError(getErrorMessage(verifyError));
    } finally {
      setResetPending(false);
    }
  };

  const resendConfirmation = async (targetEmail = verificationDraft?.email) => {
    if (!targetEmail || verificationPending || resendCooldown > 0) {
      return;
    }

    setVerificationPending(true);
    setError('');
    setNotice('');
    setResendCooldown(VERIFICATION_RESEND_COOLDOWN_SECONDS);

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

  const refreshVerification = async () => {
    if (!verificationDraft || verificationPending) {
      return;
    }

    setVerificationPending(true);
    setError('');
    setNotice('');

    try {
      const { data: currentData } = await supabase.auth.getSession();
      let nextSession = currentData.session;

      if (nextSession?.user.email?.toLowerCase() !== verificationDraft.email) {
        nextSession = null;
      }

      if (!nextSession && password.length >= 6) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: verificationDraft.email,
          password
        });

        if (signInError) {
          throw signInError;
        }

        nextSession = data.session;
      }

      if (!nextSession) {
        setNotice('If you opened a confirmation link, sign in with your email and password to continue.');
        return;
      }

      await syncDraftProfile(nextSession, verificationDraft);
    } catch (refreshError) {
      if (isEmailNotConfirmedError(refreshError)) {
        setNotice('Email is still waiting for confirmation. Check your inbox or resend after the cooldown.');
        return;
      }

      setError(getErrorMessage(refreshError));
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

      let nextSession = data.session ?? (await supabase.auth.getSession()).data.session;

      if (!nextSession && password.length >= 6) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: verificationDraft.email,
          password
        });

        if (signInError) {
          throw signInError;
        }

        nextSession = signInData.session;
      }

      if (!nextSession) {
        setNotice('Email confirmed. Sign in with your password to continue.');
        return;
      }

      await syncDraftProfile(nextSession, verificationDraft);
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

    setPending(true);
    setError('');
    setNotice('');

    try {
      if (verificationDraft && verificationDraft.email !== normalizedEmail) {
        setVerificationDraft(null);
        setVerificationCode('');
      }

      if (mode === 'login') {
        if (!isValidEmail(normalizedEmail)) {
          setError('Enter a valid email address.');
          return;
        }

        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password
        });

        if (authError) {
          throw authError;
        }

        if (!data.session) {
          setNotice('Check your email if Supabase asks for confirmation. KULI will not resend automatically.');
          return;
        }

        await loadProfile(data.session);
        return;
      }

      if (!isValidEmail(normalizedEmail)) {
        setError('Enter a valid email address.');
        return;
      }

      if (!phoneValidation.valid) {
        setError(phoneValidation.message);
        return;
      }

      if (!isStrongPassword(password)) {
        setError('Use a stronger password before creating the account.');
        return;
      }

      if (!passwordsMatch) {
        setError('Confirm password must match your password.');
        return;
      }

      const registrationDraft: VerificationDraft = {
        email: normalizedEmail,
        role,
        fullName: fullName.trim(),
        phone: normalizedPhone
      };

      const { data, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: runtimeConfig.authRedirectUrl,
          data: {
            full_name: fullName.trim(),
            phone: normalizedPhone,
            role
          }
        }
      });

      if (authError) {
        throw authError;
      }

      await saveStoredProfileDraft(registrationDraft);

      if (!data.session) {
        setVerificationDraft(registrationDraft);
        setVerificationCode('');
        setResendCooldown(VERIFICATION_RESEND_COOLDOWN_SECONDS);
        setNotice('Account created. Check your email for a confirmation code or link. We will not resend unless you press Resend.');
        setMode('login');
        return;
      }

      const syncedProfile = await syncProfileFromDraft(data.session, registrationDraft);

      if (!syncedProfile) {
        throw new Error('KULI could not finish creating your mobile profile. Try signing in again.');
      }

      onAuthenticated(syncedProfile, data.session);
    } catch (submitError) {
      if (mode === 'login' && isEmailNotConfirmedError(submitError)) {
        const loginEmail = email.trim().toLowerCase();
        const storedDraft = await loadStoredProfileDraft(loginEmail);
        setVerificationDraft(
          storedDraft ?? {
            email: loginEmail,
            role,
            fullName: fullName.trim(),
            phone: phoneValidation.valid ? phoneValidation.normalized : phone.trim()
          }
        );
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

          {mode !== 'forgot' && !verificationDraft ? <AuthModeTabs mode={mode} onChange={changeMode} /> : null}

          {verificationDraft ? (
            <VerificationRequiredScreen
              draft={verificationDraft}
              code={verificationCode}
              cooldown={resendCooldown}
              pending={verificationPending}
              notice={notice}
              error={error}
              onCodeChange={setVerificationCode}
              onVerifyCode={verifyEmailCode}
              onRefresh={refreshVerification}
              onResend={() => resendConfirmation()}
              onBack={() => {
                setVerificationDraft(null);
                setVerificationCode('');
                setError('');
                setNotice('');
                setMode('login');
              }}
            />
          ) : mode === 'forgot' ? (
            <UiCard style={styles.authCard}>
              <AppHeader
                eyebrow="Account recovery"
                title={resetStep === 'request' ? 'Reset your password.' : 'Enter your reset code.'}
                subtitle={
                  resetStep === 'request'
                    ? 'We will email a one-time reset code. You can finish the password change inside KULI.'
                    : `Use the code sent to ${resetEmail || normalizedEmail}.`
                }
              />
              {resetStep === 'request' ? (
                <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
              ) : (
                <>
                  <View style={styles.verificationEmailBox}>
                    <Text style={styles.fieldLabel}>{resetEmail || normalizedEmail}</Text>
                    <Text style={styles.muted}>Reset codes can expire. Request a new one if this code no longer works.</Text>
                  </View>
                  <Field label="Reset code" value={resetCode} onChangeText={setResetCode} placeholder="6-digit code" keyboardType="numeric" />
                </>
              )}
              {error ? <AuthMessage tone="error" message={error} /> : null}
              {notice ? <AuthMessage tone="notice" message={notice} /> : null}
              {resetStep === 'request' ? (
                <PrimaryButton disabled={!canResetPassword} label={resetPending ? 'Sending...' : 'Send reset code'} loading={resetPending} onPress={sendPasswordReset} />
              ) : (
                <>
                  <PrimaryButton disabled={resetPending || !resetCode.trim()} label={resetPending ? 'Checking...' : 'Verify code'} loading={resetPending} onPress={verifyPasswordResetCode} />
                  <SecondaryButton
                    disabled={resetPending || resetCooldown > 0}
                    label={resetCooldown > 0 ? `Send a new code in ${resetCooldown}s` : 'Send a new code'}
                    onPress={sendPasswordReset}
                  />
                </>
              )}
              <SecondaryButton
                label="Back to login"
                onPress={() => {
                  setResetStep('request');
                  setResetCode('');
                  setResetEmail('');
                  setResetCooldown(0);
                  changeMode('login');
                }}
              />
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
                  eyebrow={mode === 'login' ? 'Secure sign in' : 'Create account'}
                  title={mode === 'login' ? 'Use your KULI account.' : 'Tell us who is moving.'}
                  description={
                    mode === 'login'
                      ? 'Sign in to continue to your KULI workspace.'
                      : 'Create a customer or truck-owner account for the KULI marketplace.'
                  }
                />
                {mode === 'register' ? <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Abebe Bekele" /> : null}
                <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
                {mode === 'register' ? (
                  <>
                    <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="+251911000000" keyboardType="phone-pad" />
                    <PhoneValidationHint value={phone} />
                  </>
                ) : null}
                <Field label="Password" value={password} onChangeText={setPassword} placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'} secureTextEntry />
                {mode === 'register' ? (
                  <>
                    <Field label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat your password" secureTextEntry />
                    <PasswordChecklist password={password} confirmPassword={confirmPassword} includeMatch />
                  </>
                ) : null}
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

            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SessionLoadingScreen() {
  return <SplashScreen compact />;
}

function ForbiddenScreen({ profile, onSignOut }: { profile: UserProfile; onSignOut: () => void }) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Role mismatch</Text>
        <Text style={styles.title}>Use the right workspace.</Text>
        <ShellCard title="Mobile access blocked">
          <Text style={styles.copy}>This account belongs in the web dashboard. Sign out here and continue from the staff workspace.</Text>
          <Pressable accessibilityRole="button" onPress={onSignOut} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Sign out</Text>
          </Pressable>
        </ShellCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function StaffMobileBlockedScreen({ onSignOut }: { onSignOut: () => void }) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Staff workspace</Text>
        <Text style={styles.title}>Use the web dashboard.</Text>
        <ShellCard title="Mobile access blocked">
          <Text style={styles.copy}>Admin and assistant accounts are provisioned for the KULI web dashboard, not the customer mobile app.</Text>
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
        <ShellCard title="Account paused">
          <View style={styles.cardHeader}>
            <Text style={styles.copy}>{profile.fullName || profile.email}</Text>
            <StatusPill tone="blocked">{accountStatusLabels[profile.accountStatus]}</StatusPill>
          </View>
          <Text style={styles.muted}>You can sign in, but KULI actions are paused until support reviews the account.</Text>
          <Pressable accessibilityRole="button" onPress={onSignOut} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Sign out</Text>
          </Pressable>
        </ShellCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function ResetPasswordScreen({ onComplete, onSignOut }: { onComplete: () => Promise<void>; onSignOut: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const passwordsMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);
  const canSubmit = isStrongPassword(newPassword) && passwordsMatch;

  const submit = async () => {
    if (pending) {
      return;
    }

    setError('');
    setNotice('');

    if (!isStrongPassword(newPassword)) {
      setError('Use a stronger password before saving it.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('The password confirmation does not match.');
      return;
    }

    setPending(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

      if (updateError) {
        throw updateError;
      }

      setNotice('Password updated. You can now sign in with your new password.');
      await onComplete();
    } catch (resetError) {
      setError(getErrorMessage(resetError));
    } finally {
      setPending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.authContent}>
          <AuthBrandPanel mode="forgot" />
          <UiCard style={styles.authCard}>
            <AppHeader
              eyebrow="Account recovery"
              title="Choose a new password."
              subtitle="Enter a new password for your KULI account. After it is saved, you will sign in again."
            />
            <Field label="New password" value={newPassword} onChangeText={setNewPassword} placeholder="At least 8 characters" secureTextEntry />
            <Field label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat new password" secureTextEntry />
            <PasswordChecklist password={newPassword} confirmPassword={confirmPassword} includeMatch />
            {error ? <AuthMessage tone="error" message={error} /> : null}
            {notice ? <AuthMessage tone="notice" message={notice} /> : null}
            <PrimaryButton disabled={pending || !canSubmit} label={pending ? 'Saving...' : 'Update password'} loading={pending} onPress={submit} />
            <SecondaryButton disabled={pending} label="Back to login" onPress={onSignOut} />
          </UiCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ProfileLoadErrorScreen({ message, onRetry, onSignOut }: { message: string; onRetry: () => void; onSignOut: () => void }) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Account check</Text>
        <Text style={styles.title}>We could not open your workspace.</Text>
        <ShellCard title="Profile check failed">
          <Text style={styles.copy}>{message}</Text>
          <View style={styles.actionRow}>
            <Pressable accessibilityRole="button" onPress={onRetry} style={[styles.primaryButton, styles.actionButton]}>
              <Text style={styles.primaryButtonText}>Try again</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onSignOut} style={[styles.secondaryButton, styles.actionButton]}>
              <Text style={styles.secondaryButtonText}>Sign out</Text>
            </Pressable>
          </View>
        </ShellCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function HomeOverview({ profile, onSignOut }: { profile: UserProfile; onSignOut: () => void }) {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [availabilityPendingId, setAvailabilityPendingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', 'mine'],
    queryFn: async () => ((await kuliApi.request('/vehicles/mine')) as ApiEnvelope<Vehicle[]>).data
  });

  const ownerRequestsQuery = useQuery({
    queryKey: ['kuli-requests', 'mine', 'owner'],
    queryFn: async () => ((await kuliApi.request('/kuli-requests/mine')) as ApiEnvelope<KuliRequest[]>).data,
    refetchInterval: 15000
  });

  const offersQuery = useQuery({
    queryKey: ['owner-offers'],
    queryFn: async () => ((await kuliApi.request('/owner/offers')) as ApiEnvelope<TripOffer[]>).data,
    refetchInterval: 15000
  });

  const ratingsQuery = useQuery({
    queryKey: ['owners', profile.id, 'ratings'],
    queryFn: async () => ((await kuliApi.request(`/owners/${profile.id}/ratings`)) as ApiEnvelope<RatingRecord[]>).data
  });

  const vehicles = vehiclesQuery.data ?? [];
  const requests = ownerRequestsQuery.data ?? [];
  const offers = offersQuery.data ?? [];
  const ratings = ratingsQuery.data ?? [];
  const approvedVehicles = vehicles.filter((vehicle) => vehicle.verificationStatus === 'approved');
  const pendingVehicles = vehicles.filter((vehicle) => vehicle.verificationStatus === 'pending' || vehicle.verificationStatus === 'draft');
  const rejectedVehicles = vehicles.filter((vehicle) => vehicle.verificationStatus === 'rejected');
  const onlineVehicle = approvedVehicles.find((vehicle) => vehicle.availabilityStatus === 'online_available');
  const activeVehicle = onlineVehicle ?? approvedVehicles[0] ?? vehicles[0];
  const activeJobs = requests.filter((request) => activeRequestStatuses.includes(request.status) || isPaymentSettlingRequest(request));
  const completedJobs = requests.filter((request) => request.status === 'completed');
  const totalEarnings = completedJobs.reduce((sum, request) => sum + Number(request.quoteSnapshot?.totalEstimate ?? request.payment?.amountConfirmed ?? 0), 0);
  const averageRating = ratings.length ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length : 0;
  const firstName = (profile.fullName || profile.email || 'there').split(' ')[0];
  const isOnline = Boolean(onlineVehicle);
  const readyVehicle = onlineVehicle ?? approvedVehicles[0];
  const primaryJob = activeJobs[0];

  const readiness = (() => {
    if (isOnline && onlineVehicle) {
      return {
        title: 'You are online',
        detail: `${onlineVehicle.licensePlate} is visible to nearby requests.`,
        tone: 'success' as const,
        icon: 'access-point',
        action: 'Go offline'
      };
    }

    if (approvedVehicles.length > 0 && readyVehicle) {
      return {
        title: 'Ready for requests?',
        detail: `${readyVehicle.licensePlate} is approved and can start receiving offers.`,
        tone: 'dark' as const,
        icon: 'truck-check-outline',
        action: 'Go online'
      };
    }

    if (pendingVehicles.length > 0) {
      return {
        title: 'Verification in progress',
        detail: 'KULI reviews your documents before your truck can receive offers.',
        tone: 'warning' as const,
        icon: 'shield-clock-outline',
        action: 'Open vehicles'
      };
    }

    if (rejectedVehicles.length > 0) {
      return {
        title: 'Vehicle needs attention',
        detail: rejectedVehicles[0]?.rejectionReason || 'Update rejected documents before going online.',
        tone: 'error' as const,
        icon: 'shield-alert-outline',
        action: 'Fix documents'
      };
    }

    return {
      title: 'Add your first truck',
      detail: 'Register a vehicle and upload documents to start receiving KULI requests.',
      tone: 'warning' as const,
      icon: 'truck-plus-outline',
      action: 'Register vehicle'
    };
  })();

  const toggleAvailability = async () => {
    if (!readyVehicle || readyVehicle.verificationStatus !== 'approved') {
      navigation.navigate('Vehicles');
      return;
    }

    const nextStatus = readyVehicle.availabilityStatus === 'online_available' ? 'offline' : 'online_available';
    setAvailabilityPendingId(readyVehicle.id);
    setError('');
    setMessage('');

    try {
      await kuliApi.request(`/vehicles/${readyVehicle.id}/availability`, {
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
      setMessage(nextStatus === 'online_available' ? 'You are online and ready for offers.' : 'You are offline. New offers are paused.');
    } catch (availabilityError) {
      setError(getErrorMessage(availabilityError));
    } finally {
      setAvailabilityPendingId('');
    }
  };

  return (
    <Screen contentStyle={styles.ownerHomeContent}>
      <View style={styles.ownerHomeHeader}>
        <View style={styles.ownerAvatar}>
          <Text style={styles.ownerAvatarText}>{(profile.fullName || profile.email || 'K').slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.ownerHeaderKicker}>KULI Driver</Text>
          <Text style={styles.ownerHeaderTitle}>Ready to drive, <Text style={styles.ownerHeaderNameAccent}>{firstName}</Text>?</Text>
          <Text style={styles.ownerHeaderCopy}>Addis Ababa requests appear when an approved vehicle is online.</Text>
        </View>
      </View>

      <View style={[styles.ownerReadinessCard, readiness.tone === 'success' && styles.ownerReadinessSuccess, readiness.tone === 'warning' && styles.ownerReadinessWarning, readiness.tone === 'error' && styles.ownerReadinessError]}>
        <View style={styles.ownerReadinessTop}>
          <View style={[styles.ownerReadinessIcon, readiness.tone === 'success' && styles.ownerReadinessIconSuccess, readiness.tone === 'warning' && styles.ownerReadinessIconWarning, readiness.tone === 'error' && styles.ownerReadinessIconError]}>
            <MaterialCommunityIcons name={readiness.icon as never} color={readiness.tone === 'dark' ? colors.card : readiness.tone === 'success' ? colors.success : readiness.tone === 'error' ? colors.error : colors.warning} size={30} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.ownerReadinessTitle, readiness.tone === 'dark' && styles.ownerTextOnDark]}>{readiness.title}</Text>
            <Text style={[styles.ownerReadinessCopy, readiness.tone === 'dark' && styles.ownerMutedOnDark]}>{readiness.detail}</Text>
          </View>
          <StatusBadge tone={isOnline ? 'success' : approvedVehicles.length ? 'neutral' : readiness.tone === 'error' ? 'error' : 'warning'}>
            {isOnline ? 'Online' : approvedVehicles.length ? 'Offline' : pendingVehicles.length ? 'Pending' : 'Setup'}
          </StatusBadge>
        </View>
        {activeVehicle ? (
          <View style={[styles.ownerActiveVehicleStrip, readiness.tone === 'dark' && styles.ownerActiveVehicleStripDark]}>
            <MaterialCommunityIcons name="truck-outline" color={readiness.tone === 'dark' ? colors.card : colors.black} size={22} />
            <View style={styles.flex}>
              <Text style={[styles.ownerVehicleStripTitle, readiness.tone === 'dark' && styles.ownerTextOnDark]}>{activeVehicle.licensePlate}</Text>
              <Text style={[styles.ownerVehicleStripCopy, readiness.tone === 'dark' && styles.ownerMutedOnDark]}>{activeVehicle.vehicleClassSnapshot?.name || 'Registered truck'} / {activeVehicle.capacityKg ?? 0}kg</Text>
            </View>
          </View>
        ) : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {message ? <Text style={readiness.tone === 'dark' ? styles.ownerSuccessOnDark : styles.noticeText}>{message}</Text> : null}
        {readyVehicle && readyVehicle.verificationStatus === 'approved' ? (
          readiness.tone === 'dark' ? (
            <SecondaryButton
              disabled={Boolean(availabilityPendingId)}
              label={availabilityPendingId ? 'Updating...' : readiness.action}
              loading={Boolean(availabilityPendingId)}
              onPress={toggleAvailability}
              style={styles.ownerDarkPrimaryButton}
            />
          ) : (
            <PrimaryButton
              disabled={Boolean(availabilityPendingId)}
              label={availabilityPendingId ? 'Updating...' : readiness.action}
              loading={Boolean(availabilityPendingId)}
              onPress={toggleAvailability}
            />
          )
        ) : (
          <PrimaryButton label={readiness.action} onPress={() => navigation.navigate('Vehicles')} />
        )}
      </View>

      <View style={styles.ownerMetricGrid}>
        <MetricCard label="Completed jobs" value={String(completedJobs.length)} detail="All completed trips" style={styles.ownerMetricCard} />
        <MetricCard label="Earnings" value={`ETB ${totalEarnings.toFixed(0)}`} detail="Confirmed and estimated" tone="dark" style={styles.ownerMetricCard} />
        <MetricCard label="Rating" value={averageRating ? averageRating.toFixed(1) : '-'} detail={`${ratings.length} review${ratings.length === 1 ? '' : 's'}`} style={styles.ownerMetricCard} />
        <MetricCard label="Open offers" value={String(offers.length)} detail="Waiting in inbox" tone={offers.length ? 'warning' : 'default'} style={styles.ownerMetricCard} />
      </View>

      <View style={styles.ownerSectionHeader}>
        <View style={styles.flex}>
          <Text style={styles.ownerSectionTitle}>Active job</Text>
          <Text style={styles.ownerSectionCopy}>{primaryJob ? 'Continue the current request from your offer workspace.' : 'Accepted requests and cash-pending trips appear here.'}</Text>
        </View>
        <SecondaryButton label="Offers" onPress={() => navigation.navigate('Offers')} style={styles.ownerSmallButton} />
      </View>

      {ownerRequestsQuery.isLoading ? <LoadingState title="Loading jobs" message="Checking your active requests." /> : null}
      {ownerRequestsQuery.isError ? <ErrorState title="Jobs could not load" message={getErrorMessage(ownerRequestsQuery.error)} /> : null}
      {primaryJob ? (
        <View style={styles.ownerJobCard}>
          <View style={styles.ownerJobTop}>
            <View style={styles.flex}>
              <Text style={styles.ownerJobCode}>{primaryJob.requestCode}</Text>
              <Text style={styles.ownerJobRoute}>{primaryJob.pickupLocation?.addressText} to {primaryJob.destinationLocation?.addressText}</Text>
            </View>
            <StatusBadge tone={primaryJob.status === 'completed' ? 'warning' : 'success'}>{statusLabels[primaryJob.status]}</StatusBadge>
          </View>
          <RoutePill pickup={primaryJob.pickupLocation?.addressText ?? 'Pickup'} destination={primaryJob.destinationLocation?.addressText ?? 'Destination'} />
          <Text style={styles.ownerJobNext}>Next: open the job to update status, message the customer, or confirm payment when complete.</Text>
          <PrimaryButton label="Open job" onPress={() => navigation.navigate('Offers')} />
        </View>
      ) : (
        <View style={styles.ownerEmptyCard}>
          <MaterialCommunityIcons name={vehicles.length ? (approvedVehicles.length ? 'radar' : 'shield-search') : 'truck-plus-outline'} color={colors.black} size={42} />
          <Text style={styles.ownerEmptyTitle}>
            {vehicles.length === 0 ? 'Register your first vehicle' : approvedVehicles.length ? 'No active job right now' : 'Verification comes first'}
          </Text>
          <Text style={styles.ownerEmptyCopy}>
            {vehicles.length === 0
              ? 'Add truck details and documents so KULI can verify your vehicle.'
              : approvedVehicles.length
                ? 'Stay online to receive first-accept-wins offers from nearby customers.'
                : 'Upload the required documents. Approved vehicles can then go online.'}
          </Text>
          <SecondaryButton label={vehicles.length === 0 || !approvedVehicles.length ? 'Open vehicles' : 'View offers'} onPress={() => navigation.navigate(vehicles.length === 0 || !approvedVehicles.length ? 'Vehicles' : 'Offers')} />
        </View>
      )}

      <View style={styles.ownerAccountCard}>
        <View style={styles.flex}>
          <Text style={styles.ownerAccountTitle}>Account</Text>
          <Text style={styles.ownerAccountCopy}>{profile.fullName || profile.email}</Text>
          {profile.email ? <Text style={styles.ownerAccountMuted}>{profile.email}</Text> : null}
        </View>
        <StatusBadge tone={profile.accountStatus === 'active' ? 'success' : 'warning'}>{accountStatusLabels[profile.accountStatus]}</StatusBadge>
      </View>
      <SecondaryButton label="Sign out" onPress={onSignOut} />
    </Screen>
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
    <View style={styles.ownerClassGrid}>
      {vehicleClasses.map((vehicleClass) => {
        const selected = vehicleClass.id === selectedVehicleClassId;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={vehicleClass.id}
            onPress={() => onSelect(vehicleClass.id)}
            style={[styles.ownerClassCard, selected && styles.ownerClassCardSelected]}
          >
            <View style={[styles.ownerClassIcon, selected && styles.ownerClassIconSelected]}>
              <MaterialCommunityIcons name="truck-cargo-container" color={selected ? colors.card : colors.black} size={26} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.ownerClassTitle, selected && styles.ownerTextOnDark]}>{vehicleClass.name}</Text>
              <Text style={[styles.ownerClassCopy, selected && styles.ownerMutedOnDark]}>{vehicleClass.description || 'Truck class for matching and pricing.'}</Text>
              <View style={styles.ownerClassMetaRow}>
                <Text style={[styles.ownerClassMeta, selected && styles.ownerMutedOnDark]}>{vehicleClass.capacityKg ? `${vehicleClass.capacityKg}kg` : 'Capacity'}</Text>
                {vehicleClass.capacityCubicMeters ? <Text style={[styles.ownerClassMeta, selected && styles.ownerMutedOnDark]}>{vehicleClass.capacityCubicMeters}m3</Text> : null}
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function VehicleCard({
  vehicle,
  selected,
  previewUri,
  onSelect,
  onToggleAvailability
}: {
  vehicle: Vehicle;
  selected: boolean;
  previewUri?: string;
  onSelect: (vehicle: Vehicle) => void;
  onToggleAvailability: (vehicle: Vehicle) => void;
}) {
  const canGoOnline = vehicle.verificationStatus === 'approved' && ['offline', 'online_available'].includes(vehicle.availabilityStatus);
  const nextLabel = vehicle.availabilityStatus === 'online_available' ? 'Go offline' : 'Go online';
  const online = vehicle.availabilityStatus === 'online_available';
  const blockedReason =
    vehicle.verificationStatus === 'approved'
      ? vehicle.availabilityStatus === 'busy_on_job'
        ? 'This vehicle is assigned to an active job.'
        : vehicle.availabilityStatus === 'under_maintenance'
          ? 'Maintenance vehicles cannot receive requests.'
          : vehicle.availabilityStatus === 'suspended'
            ? 'Support paused availability for this vehicle.'
            : ''
      : vehicle.verificationStatus === 'rejected'
        ? vehicle.rejectionReason || 'Update rejected documents before this truck can go online.'
        : 'KULI approval is required before this truck can receive requests.';

  return (
    <View style={[styles.ownerVehicleCard, selected && styles.ownerVehicleCardSelected]}>
      <View style={styles.ownerVehicleTop}>
        <VehicleImageFrame photo={vehicle.photo} previewUri={previewUri} selected={selected} online={online} />
        <View style={styles.flex}>
          <Text style={styles.ownerVehicleTitle}>{vehicle.licensePlate}</Text>
          <Text style={styles.ownerVehicleType}>{vehicle.vehicleClassSnapshot?.name || vehicle.vehicleClassId}</Text>
        </View>
        <StatusBadge tone={vehicle.verificationStatus === 'approved' ? 'success' : vehicle.verificationStatus === 'rejected' ? 'error' : 'warning'}>
          {vehicleVerificationLabels[vehicle.verificationStatus]}
        </StatusBadge>
      </View>
      <View style={styles.ownerVehicleMetricRow}>
        <View style={styles.ownerVehicleMetric}>
          <Text style={styles.ownerVehicleMetricValue}>{vehicle.capacityKg ?? 0}kg</Text>
          <Text style={styles.ownerVehicleMetricLabel}>Capacity</Text>
        </View>
        <View style={styles.ownerVehicleMetric}>
          <Text style={styles.ownerVehicleMetricValue}>{vehicle.capacityCubicMeters ?? 0}m3</Text>
          <Text style={styles.ownerVehicleMetricLabel}>Volume</Text>
        </View>
        <View style={styles.ownerVehicleMetric}>
          <Text style={styles.ownerVehicleMetricValue}>{online ? 'Online' : 'Offline'}</Text>
          <Text style={styles.ownerVehicleMetricLabel}>Status</Text>
        </View>
      </View>
      <Text style={styles.ownerVehicleDescription}>{vehicle.description || 'Add a short description so customers understand what this truck is best for.'}</Text>
      {blockedReason ? (
        <View style={styles.ownerVehicleBlockReason}>
          <MaterialCommunityIcons name="information-outline" color={vehicle.verificationStatus === 'rejected' ? colors.error : colors.warning} size={18} />
          <Text style={[styles.ownerVehicleBlockText, vehicle.verificationStatus === 'rejected' && styles.ownerVehicleBlockTextError]}>{blockedReason}</Text>
        </View>
      ) : null}
      <View style={styles.ownerVehicleActions}>
        <SecondaryButton label={selected ? 'Selected' : 'Use this truck'} onPress={() => onSelect(vehicle)} style={styles.ownerVehicleActionButton} />
        <PrimaryButton
          disabled={!canGoOnline}
          label={vehicle.verificationStatus === 'approved' ? nextLabel : 'Approval required'}
          onPress={() => onToggleAvailability(vehicle)}
          style={styles.ownerVehicleActionButton}
        />
      </View>
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

    const uploadedFile = await uploadVehicleFile(vehicle.id, documentType, file);

    await kuliApi.request(`/vehicles/${vehicle.id}/documents`, {
      method: 'POST',
      body: {
        type: documentType,
        fileId: uploadedFile.id
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
      setMessage(`${label} attached for KULI review.`);
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

      setMessage(`${readyTypes.length} document${readyTypes.length === 1 ? '' : 's'} attached for KULI review.`);
      onUploaded();
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setPending(false);
      setPendingType('');
    }
  };

  return (
    <View style={styles.ownerVerificationCard}>
      <View style={styles.ownerVerificationHeader}>
        <View style={styles.flex}>
          <Text style={styles.ownerSectionTitle}>Verification checklist</Text>
          <Text style={styles.ownerSectionCopy}>Attach clear document photos from your library or camera. KULI stores upload details for review.</Text>
        </View>
        <StatusBadge tone={completedRequiredCount === requiredTypes.length ? 'success' : 'warning'}>
          {`${completedRequiredCount}/${requiredTypes.length}`}
        </StatusBadge>
      </View>
      <View style={styles.documentProgressTrack}>
        <View style={[styles.documentProgressFill, { width: `${Math.round((completedRequiredCount / requiredTypes.length) * 100)}%` }]} />
      </View>
      <View style={styles.ownerDocumentList}>
        {documentTypes.map((doc) => {
          const draft = drafts[doc.type];
          const existingDocument = latestDocumentByType[doc.type];
          const uploaded = Boolean(existingDocument);
          const ready = Boolean(draft);
          const pendingThis = pending && (pendingType === doc.type || pendingType === 'all');
          const rejected = existingDocument?.status === 'rejected';
          const approved = existingDocument?.status === 'approved';
          const statusLabel = rejected ? 'Rejected' : approved ? 'Approved' : uploaded ? 'Pending review' : ready ? 'Ready to attach' : doc.required ? 'Missing' : 'Optional';
          const statusTone = rejected ? 'error' : approved || ready ? 'success' : uploaded || doc.required ? 'warning' : 'neutral';

          return (
            <View key={doc.type} style={[styles.ownerDocumentCard, uploaded && styles.ownerDocumentCardUploaded, ready && styles.ownerDocumentCardReady, rejected && styles.ownerDocumentCardRejected]}>
              <View style={styles.ownerDocumentTop}>
                <View style={[styles.ownerDocumentIcon, approved && styles.ownerDocumentIconApproved, rejected && styles.ownerDocumentIconRejected]}>
                  <MaterialCommunityIcons
                    name={(doc.type === 'identity' ? 'card-account-details-outline' : doc.type === 'driver_license' ? 'card-account-details-star-outline' : doc.type === 'vehicle_registration' ? 'file-document-outline' : doc.type === 'ownership_proof' ? 'shield-key-outline' : 'shield-check-outline') as never}
                    color={approved ? colors.success : rejected ? colors.error : colors.black}
                    size={24}
                  />
                </View>
                <View style={styles.flex}>
                  <View style={styles.docTitleRow}>
                    <Text style={styles.ownerDocumentTitle}>{doc.label}</Text>
                    <StatusPill tone={doc.required ? 'blocked' : 'warn'}>{doc.required ? 'Required' : 'Optional'}</StatusPill>
                  </View>
                  <Text style={styles.ownerDocumentCopy}>{doc.detail}</Text>
                </View>
                <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
              </View>
              <View style={styles.ownerDocumentTips}>
                {doc.tips.map((tip) => (
                  <View key={tip} style={styles.ownerDocumentTip}>
                    <MaterialCommunityIcons name="check-circle-outline" color={colors.textSecondary} size={15} />
                    <Text style={styles.ownerDocumentTipText}>{tip}</Text>
                  </View>
                ))}
              </View>
              {existingDocument ? (
                <View style={[styles.fileSummary, rejected && styles.ownerDocumentRejectedSummary]}>
                  <Text style={styles.fieldLabel}>Latest upload</Text>
                  <Text style={styles.muted}>{existingDocument.status} / file {existingDocument.fileId.slice(-8)}</Text>
                  {rejected ? <Text style={styles.errorText}>Upload a clearer replacement for review.</Text> : null}
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
                emptyText={doc.required ? 'Required for KULI verification. Use a clear, original document image.' : 'Optional, but useful where an insurance policy is available.'}
                emptyTone={doc.required ? 'blocked' : 'warn'}
                uploadLabel="Upload"
                takeLabel="Camera"
              />
            </View>
          );
        })}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {message ? <Text style={styles.noticeText}>{message}</Text> : null}
      <PrimaryButton
        disabled={pending || readyDraftCount === 0}
        label={pendingType === 'all' ? 'Submitting...' : `Submit ready documents (${readyDraftCount})`}
        loading={pendingType === 'all'}
        onPress={submitReadyDocuments}
      />
    </View>
  );
}

function OwnerVehiclesScreen() {
  const queryClient = useQueryClient();
  const [vehicleClassId, setVehicleClassId] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [capacityKg, setCapacityKg] = useState('1200');
  const [capacityCubicMeters, setCapacityCubicMeters] = useState('10');
  const [description, setDescription] = useState('');
  const [vehicleImage, setVehicleImage] = useState<PickedFile | null>(null);
  const [vehiclePhotoPreviews, setVehiclePhotoPreviews] = useState<Record<string, string>>({});
  const [showAddVehicleForm, setShowAddVehicleForm] = useState(false);
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
  const shouldShowAddVehicleForm = showAddVehicleForm || vehicles.length === 0;
  const approvedCount = vehicles.filter((vehicle) => vehicle.verificationStatus === 'approved').length;
  const onlineCount = vehicles.filter((vehicle) => vehicle.availabilityStatus === 'online_available').length;
  const pendingCount = vehicles.filter((vehicle) => vehicle.verificationStatus === 'pending' || vehicle.verificationStatus === 'draft').length;
  const selectedClass = vehicleClasses.find((vehicleClass) => vehicleClass.id === vehicleClassId);

  useEffect(() => {
    if (!vehicleClassId && vehicleClasses[0]) {
      setVehicleClassId(vehicleClasses[0].id);
      setCapacityKg(String(vehicleClasses[0].capacityKg ?? 1200));
      setCapacityCubicMeters(String(vehicleClasses[0].capacityCubicMeters ?? 10));
    }
  }, [vehicleClassId, vehicleClasses]);

  const selectVehicleClass = (nextVehicleClassId: string) => {
    const nextClass = vehicleClasses.find((vehicleClass) => vehicleClass.id === nextVehicleClassId);
    setVehicleClassId(nextVehicleClassId);

    if (nextClass?.capacityKg) {
      setCapacityKg(String(nextClass.capacityKg));
    }

    if (nextClass?.capacityCubicMeters) {
      setCapacityCubicMeters(String(nextClass.capacityCubicMeters));
    }
  };

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
      if (vehicleImage) {
        const uploadedPhoto = await uploadVehicleFile(result.data.id, 'vehicle_photo', vehicleImage);
        await kuliApi.request(`/vehicles/${result.data.id}`, {
          method: 'PATCH',
          body: {
            photo: {
              fileId: uploadedPhoto.id,
              previewUrl: vehicleImage.uri
            }
          }
        });

        if (vehicleImage.uri) {
          setVehiclePhotoPreviews((current) => ({
            ...current,
            [result.data.id]: vehicleImage.uri ?? ''
          }));
        }
      }

      await kuliApi.request('/owners/me/active-vehicle', {
        method: 'PATCH',
        body: {
          activeVehicleId: result.data.id
        }
      });
      setNotice('Vehicle submitted for KULI verification.');
      setLicensePlate('');
      setDescription('');
      setVehicleImage(null);
      setShowAddVehicleForm(false);
      await queryClient.invalidateQueries({ queryKey: ['vehicles', 'mine'] });
      await vehiclesQuery.refetch();
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
      setNotice('Active vehicle updated.');
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
    <Screen contentStyle={styles.ownerVehiclesContent}>
      <View style={styles.ownerVehiclesHero}>
        <View style={styles.flex}>
          <Text style={styles.ownerHeaderKicker}>Fleet readiness</Text>
          <Text style={styles.ownerVehiclesTitle}>Vehicles</Text>
          <Text style={styles.ownerVehiclesCopy}>Approved vehicles can go online. Pending or rejected vehicles stay out of matching until review is complete.</Text>
        </View>
        <View style={styles.ownerVehiclesHeroIcon}>
          <MaterialCommunityIcons name="truck-delivery-outline" color={colors.card} size={34} />
        </View>
      </View>

      <View style={styles.ownerMetricGrid}>
        <MetricCard label="Fleet" value={String(vehicles.length)} detail="Registered trucks" tone="dark" style={styles.ownerMetricCard} />
        <MetricCard label="Approved" value={String(approvedCount)} detail="Can receive offers" tone={approvedCount ? 'success' : 'default'} style={styles.ownerMetricCard} />
        <MetricCard label="Online" value={String(onlineCount)} detail="Visible now" tone={onlineCount ? 'success' : 'default'} style={styles.ownerMetricCard} />
        <MetricCard label="In review" value={String(pendingCount)} detail="Waiting approval" tone={pendingCount ? 'warning' : 'default'} style={styles.ownerMetricCard} />
      </View>

      {shouldShowAddVehicleForm ? (
        <View style={styles.ownerVehiclePanel}>
          <View style={styles.ownerSectionHeader}>
            <View style={styles.flex}>
              <Text style={styles.ownerSectionTitle}>Add a vehicle</Text>
              <Text style={styles.ownerSectionCopy}>Step 1: choose a class. Step 2: add details and photo. Step 3: complete verification.</Text>
            </View>
            {selectedClass ? <StatusBadge tone="neutral">{selectedClass.name}</StatusBadge> : null}
          </View>
          {vehicleClassesQuery.isLoading ? <LoadingState title="Loading vehicle classes" message="Preparing truck options." /> : null}
          {vehicleClassesQuery.isError ? <ErrorState title="Vehicle classes unavailable" message={getErrorMessage(vehicleClassesQuery.error)} /> : null}
          <VehicleClassPicker vehicleClasses={vehicleClasses} selectedVehicleClassId={vehicleClassId} onSelect={selectVehicleClass} />
          <View style={styles.ownerFormCard}>
            <Field label="License plate" value={licensePlate} onChangeText={setLicensePlate} placeholder="AA-12345" />
            <View style={styles.ownerFormTwoColumn}>
              <View style={styles.flex}>
                <Field label="Capacity kg" value={capacityKg} onChangeText={setCapacityKg} placeholder="1200" keyboardType="phone-pad" />
              </View>
              <View style={styles.flex}>
                <Field label="Volume m3" value={capacityCubicMeters} onChangeText={setCapacityCubicMeters} placeholder="10" keyboardType="phone-pad" />
              </View>
            </View>
            <Field label="Vehicle notes" value={description} onChangeText={setDescription} placeholder="Clean covered truck, good for furniture" />
            <View style={styles.vehiclePhotoPickerCard}>
              <VehicleImageFrame previewUri={vehicleImage?.uri} size="large" />
              <View style={styles.flex}>
                <Text style={styles.ownerSectionTitle}>Vehicle photo</Text>
                <Text style={styles.ownerSectionCopy}>Add a clear side or front photo so customers recognize the truck. Existing vehicles use a default image until a photo is added.</Text>
              </View>
            </View>
            <FilePickerField
              label="Vehicle image"
              value={vehicleImage}
              onChange={setVehicleImage}
              emptyText="Optional for now, recommended before demo."
              emptyTone="warn"
              uploadLabel="Upload"
              takeLabel="Camera"
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
            <PrimaryButton disabled={pending} loading={pending} label={pending ? 'Submitting...' : 'Submit for verification'} onPress={createVehicle} />
          </View>
        </View>
      ) : (
        <View style={styles.ownerVehiclePanel}>
          <View style={styles.ownerSectionHeader}>
            <View style={styles.flex}>
              <Text style={styles.ownerSectionTitle}>Vehicle verification</Text>
              <Text style={styles.ownerSectionCopy}>Your selected vehicle is ready for document upload. Add another truck only when you need a separate vehicle profile.</Text>
            </View>
            <SecondaryButton label="Add another" onPress={() => setShowAddVehicleForm(true)} style={styles.ownerSmallButton} />
          </View>
        </View>
      )}

      {activeVehicle ? (
        <DocumentUploadField
          vehicle={activeVehicle}
          onUploaded={() => {
            queryClient.invalidateQueries({ queryKey: ['vehicles', 'mine'] });
          }}
        />
      ) : null}

      <View style={styles.ownerVehiclePanel}>
        <View style={styles.ownerSectionHeader}>
          <View style={styles.flex}>
            <Text style={styles.ownerSectionTitle}>My vehicles</Text>
            <Text style={styles.ownerSectionCopy}>Choose a truck to manage documents or availability.</Text>
          </View>
          <SecondaryButton label="Refresh" onPress={() => vehiclesQuery.refetch()} style={styles.ownerSmallButton} />
        </View>
        {vehiclesQuery.isLoading ? <LoadingState title="Loading vehicles" message="Checking fleet records." /> : null}
        {vehiclesQuery.isError ? <ErrorState title="Vehicles could not load" message={getErrorMessage(vehiclesQuery.error)} /> : null}
        {!vehiclesQuery.isLoading && vehicles.length === 0 ? (
          <View style={styles.ownerEmptyCard}>
            <MaterialCommunityIcons name="truck-plus-outline" color={colors.black} size={44} />
            <Text style={styles.ownerEmptyTitle}>No vehicles yet</Text>
            <Text style={styles.ownerEmptyCopy}>Submit your first truck above, then attach identity, license, registration, ownership, and insurance documents.</Text>
          </View>
        ) : null}
        <View style={styles.ownerVehicleList}>
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              previewUri={vehiclePhotoPreviews[vehicle.id]}
              selected={activeVehicle?.id === vehicle.id}
              onSelect={(nextVehicle) => selectActiveVehicle(nextVehicle.id)}
              onToggleAvailability={toggleAvailability}
            />
          ))}
        </View>
      </View>

    </Screen>
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
  pending: 'Pending',
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

const canPreviewVehiclePhoto = (uri?: string) => Boolean(uri && /^(https?:|file:|blob:|data:)/.test(uri));

async function uploadVehicleFile(vehicleId: string, type: string, file: PickedFile) {
  if (!file.uri) {
    throw new Error(`Could not read ${file.name} for upload. Choose the file again.`);
  }

  // Fetch the blob first so we know the real byte size before creating the intent.
  const fileResponse = await fetch(file.uri);
  const fileBlob = await fileResponse.blob();
  const actualSizeBytes = fileBlob.size > 0 ? fileBlob.size : file.sizeBytes;

  if (!actualSizeBytes || actualSizeBytes <= 0) {
    throw new Error(`Could not determine the file size of ${file.name}. Try picking the file again.`);
  }

  const intent = (await kuliApi.request('/files/upload-intent', {
    method: 'POST',
    body: {
      vehicleId,
      type,
      originalFileName: file.name,
      mimeType: file.mimeType,
      sizeBytes: actualSizeBytes
    }
  })) as ApiEnvelope<{ file: { id: string; originalFileName?: string; mimeType?: string; sizeBytes?: number }; upload: { url: string; method?: string } }>;

  const uploadUrl = intent.data.upload.url.startsWith('http')
    ? intent.data.upload.url
    : `${kuliApi.baseUrl}${intent.data.upload.url.startsWith('/') ? intent.data.upload.url : `/${intent.data.upload.url}`}`;
  const accessToken = await getKuliAccessToken();
  const uploadResponse = await fetch(uploadUrl, {
    method: intent.data.upload.method ?? 'POST',
    headers: {
      'content-type': file.mimeType,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    body: fileBlob
  });

  if (!uploadResponse.ok) {
    let message = `KULI could not upload ${file.name}. Check that the backend is running and try again.`;

    try {
      const payload = await uploadResponse.json();
      message = payload?.error?.message ?? message;
    } catch {
      // Keep the generic message when the upload endpoint returns a non-JSON body.
    }

    throw new Error(message);
  }

  return intent.data.file;
}

function VehicleImageFrame({
  photo,
  previewUri,
  selected = false,
  online = false,
  size = 'regular'
}: {
  photo?: VehiclePhoto;
  previewUri?: string;
  selected?: boolean;
  online?: boolean;
  size?: 'regular' | 'large';
}) {
  const uri = previewUri ?? photo?.previewUrl;
  const showImage = canPreviewVehiclePhoto(uri);

  return (
    <View style={[styles.vehicleImageFrame, size === 'large' && styles.vehicleImageFrameLarge, selected && styles.vehicleImageFrameSelected, online && styles.vehicleImageFrameOnline]}>
      {showImage ? (
        <Image source={{ uri }} style={styles.vehicleImage} resizeMode="cover" />
      ) : (
        <View style={styles.vehicleDefaultArt}>
          <MaterialCommunityIcons name="truck-outline" color={selected ? colors.card : colors.black} size={size === 'large' ? 38 : 28} />
        </View>
      )}
    </View>
  );
}

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
        <VehicleImageFrame photo={candidate.photo} />
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
  const [searchText, setSearchText] = useState('');
  const selected = getLocationOption(selectedKey);

  const filteredOptions = useMemo(() => {
    if (!searchText) return addisLocationOptions;
    const query = searchText.toLowerCase();
    return addisLocationOptions.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.area.toLowerCase().includes(query) ||
        option.detail.toLowerCase().includes(query)
    );
  }, [searchText]);

  const displayVal = open ? searchText : selected.label;

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.locationSelectButton}>
        <TextInput
          accessibilityRole="text"
          style={{ flex: 1, fontSize: 16, color: colors.textPrimary, paddingVertical: 4, paddingHorizontal: 0 }}
          placeholder="Type to search location..."
          placeholderTextColor={colors.muted}
          value={displayVal}
          onChangeText={(text) => {
            setSearchText(text);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setSearchText('');
          }}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (open) {
              setOpen(false);
              setSearchText('');
            } else {
              setOpen(true);
              setSearchText('');
            }
          }}
        >
          <Text style={styles.locationChevron}>{open ? 'Close' : 'Change'}</Text>
        </Pressable>
      </View>
      {open ? (
        <ScrollView style={styles.locationMenu} contentContainerStyle={styles.locationMenuContent} keyboardShouldPersistTaps="handled">
          {filteredOptions.map((option) => {
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
                  setSearchText('');
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
          {filteredOptions.length === 0 ? (
            <View style={{ padding: spacing.md, alignItems: 'center' }}>
              <Text style={styles.muted}>No matching areas in Addis Ababa</Text>
            </View>
          ) : null}
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
  statusLabel,
  style,
  onMapTouch
}: {
  pickup: MapLocationInput;
  destination: MapLocationInput;
  truck?: QuoteLocation;
  statusLabel?: string;
  style?: StyleProp<ViewStyle>;
  onMapTouch?: (location: { lat: string; lon: string; type: 'pickup' | 'destination' }) => void;
}) {
  const [zoom, setZoom] = useState(12);
  const [expanded, setExpanded] = useState(false);
  const [routePoints, setRoutePoints] = useState<{ lon: number; lat: number }[]>([]);
  const [layoutWidth, setLayoutWidth] = useState(360);
  const [layoutHeight, setLayoutHeight] = useState(190);
  const [activeMode, setActiveMode] = useState<'pickup' | 'destination'>('pickup');

  const pickupPoint = normalizeMapLocation(pickup, 'Pickup');
  const destinationPoint = normalizeMapLocation(destination, 'Drop-off');
  const truckPoint = truck ? normalizeMapLocation(truck, 'Truck') : undefined;

  useEffect(() => {
    let active = true;
    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${pickupPoint.lon},${pickupPoint.lat};${destinationPoint.lon},${destinationPoint.lat}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('OSRM request failed');
        const data = await response.json();
        if (active && data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map(([lon, lat]: [number, number]) => ({ lon, lat }));
          setRoutePoints(coords);
        }
      } catch (err) {
        console.warn('OSRM routing failed, falling back to straight line:', err);
        if (active) {
          setRoutePoints([pickupPoint, destinationPoint]);
        }
      }
    };

    fetchRoute();
    return () => {
      active = false;
    };
  }, [pickupPoint.lon, pickupPoint.lat, destinationPoint.lon, destinationPoint.lat]);

  const coordsPath = useMemo(() => {
    if (!routePoints.length) return '';
    const step = Math.max(1, Math.round(routePoints.length / 25));
    const decimated = routePoints.filter((_, idx) => idx % step === 0 || idx === routePoints.length - 1);
    return decimated.map(p => `${p.lon},${p.lat}`).join(',');
  }, [routePoints]);

  const googlePath = useMemo(() => {
    if (!routePoints.length) return '';
    const step = Math.max(1, Math.round(routePoints.length / 25));
    const decimated = routePoints.filter((_, idx) => idx % step === 0 || idx === routePoints.length - 1);
    return decimated.map(p => `${p.lat},${p.lon}`).join('%7C');
  }, [routePoints]);

  const mapCenter = useMemo(() => {
    if (pickupPoint.lat && destinationPoint.lat) {
      return {
        lat: (pickupPoint.lat + destinationPoint.lat) / 2,
        lon: (pickupPoint.lon + destinationPoint.lon) / 2
      };
    }
    return {
      lat: pickupPoint.lat || 8.9806,
      lon: pickupPoint.lon || 38.7892
    };
  }, [pickupPoint, destinationPoint]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0) setLayoutWidth(width);
    if (height > 0) setLayoutHeight(height);
  };

  const handlePress = (event: GestureResponderEvent) => {
    if (!onMapTouch) return;
    const { locationX, locationY } = event.nativeEvent;
    
    const centerLat = mapCenter.lat;
    const centerLon = mapCenter.lon;
    const latRad = centerLat * Math.PI / 180;
    
    const metersPerPixel = (156543.03 * Math.cos(latRad)) / Math.pow(2, zoom);
    
    const dxPixels = locationX - layoutWidth / 2;
    const dyPixels = layoutHeight / 2 - locationY;
    
    const dxMeters = dxPixels * metersPerPixel;
    const dyMeters = dyPixels * metersPerPixel;
    
    const dLat = dyMeters / 111320;
    const dLon = dxMeters / (111320 * Math.cos(latRad));
    
    const touchedLat = centerLat + dLat;
    const touchedLon = centerLon + dLon;
    
    onMapTouch({
      lat: String(touchedLat.toFixed(6)),
      lon: String(touchedLon.toFixed(6)),
      type: activeMode
    });
  };

  const mapProviderLabel = runtimeConfig.googleMapsApiKey ? 'Google map (road path)' : 'OpenStreetMap (road path)';

  const staticMapUrl = useMemo(() => {
    if (runtimeConfig.googleMapsApiKey) {
      const markers = [
        `markers=color:green%7Clabel:P%7C${pickupPoint.lat},${pickupPoint.lon}`,
        `markers=color:orange%7Clabel:D%7C${destinationPoint.lat},${destinationPoint.lon}`,
        truckPoint ? `markers=color:blue%7Clabel:T%7C${truckPoint.lat},${truckPoint.lon}` : ''
      ].filter(Boolean);
      const pathParam = googlePath ? `path=color:0x0000ffff%7Cweight:5%7C${googlePath}` : `path=color:0x0000ffff%7Cweight:5%7C${pickupPoint.lat},${pickupPoint.lon}%7C${destinationPoint.lat},${destinationPoint.lon}`;
      return `https://maps.googleapis.com/maps/api/staticmap?center=${mapCenter.lat},${mapCenter.lon}&zoom=${zoom}&size=640x320&scale=2&maptype=roadmap&${markers.join('&')}&${pathParam}&key=${encodeURIComponent(runtimeConfig.googleMapsApiKey)}`;
    }

    const ptParam = [
      `${pickupPoint.lon},${pickupPoint.lat},pm2gnm`,
      `${destinationPoint.lon},${destinationPoint.lat},pm2rdm`,
      truckPoint ? `${truckPoint.lon},${truckPoint.lat},pm2blm` : ''
    ].filter(Boolean).join('~');

    const plParam = coordsPath ? `&pl=c:0000FFf0,w:5,${coordsPath}` : `&pl=c:0000FFf0,w:5,${pickupPoint.lon},${pickupPoint.lat},${destinationPoint.lon},${destinationPoint.lat}`;

    return `https://static-maps.yandex.ru/1.x/?l=map&size=600,300&ll=${mapCenter.lon},${mapCenter.lat}&z=${zoom}&pt=${ptParam}${plParam}`;
  }, [pickupPoint, destinationPoint, truckPoint, mapCenter, zoom, coordsPath, googlePath]);

  const zoomMap = (direction: 'in' | 'out') => setZoom((current) => Math.max(10, Math.min(15, direction === 'in' ? current + 1 : current - 1)));

  const renderMap = (fullScreen = false) => (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      onLayout={onLayout}
      style={[styles.mapPreview, !fullScreen && style, fullScreen && styles.mapPreviewFullScreen]}
    >
      <Image source={{ uri: staticMapUrl }} resizeMode="cover" style={styles.mapTile} />
      <View style={styles.mapScrim} />
      <View style={styles.mapGridLineVertical} />
      <View style={styles.mapGridLineHorizontal} />
      <View style={styles.mapRoute} />
      
      {onMapTouch ? (
        <View style={styles.mapActiveModeRow}>
          <Pressable
            accessibilityRole="button"
            onPress={(e) => {
              e.stopPropagation();
              setActiveMode('pickup');
            }}
            style={[styles.mapModeButton, activeMode === 'pickup' && styles.mapModeButtonActive]}
          >
            <Text style={[styles.mapModeText, activeMode === 'pickup' && styles.mapModeTextActive]}>📍 Pickup</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={(e) => {
              e.stopPropagation();
              setActiveMode('destination');
            }}
            style={[styles.mapModeButton, activeMode === 'destination' && styles.mapModeButtonActive]}
          >
            <Text style={[styles.mapModeText, activeMode === 'destination' && styles.mapModeTextActive]}>🏁 Drop-off</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.mapControls}>
        <Pressable
          accessibilityRole="button"
          onPress={(e) => {
            e.stopPropagation();
            zoomMap('in');
          }}
          style={styles.mapControlButton}
        >
          <Text style={styles.mapControlText}>+</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={(e) => {
            e.stopPropagation();
            zoomMap('out');
          }}
          style={styles.mapControlButton}
        >
          <Text style={styles.mapControlText}>-</Text>
        </Pressable>
        {!fullScreen ? (
          <Pressable
            accessibilityLabel="Open map full screen"
            accessibilityRole="button"
            onPress={(e) => {
              e.stopPropagation();
              setExpanded(true);
            }}
            style={styles.mapExpandButton}
          >
            <MaterialCommunityIcons name="fullscreen" color={colors.black} size={18} />
            <Text style={styles.mapExpandText}>Full map</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.mapLegend}>
        <Text style={styles.mapLegendText}>{mapProviderLabel}</Text>
        <Text style={styles.mapLegendText}>📍 Pickup: {pickupPoint.label} {pickupPoint.key === 'custom' ? `(${Number(pickupPoint.lon).toFixed(4)}, ${Number(pickupPoint.lat).toFixed(4)})` : ''}</Text>
        <Text style={styles.mapLegendText}>🏁 Drop-off: {destinationPoint.label} {destinationPoint.key === 'custom' ? `(${Number(destinationPoint.lon).toFixed(4)}, ${Number(destinationPoint.lat).toFixed(4)})` : ''}</Text>
        {truckPoint ? <Text style={styles.mapLegendText}>Truck: {truckPoint.label}{statusLabel ? ` / ${statusLabel}` : ''}</Text> : null}
      </View>
    </Pressable>
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

type RequestFlowStep = 'route' | 'load' | 'quote' | 'sent';

const requestFlowSteps: Array<{ key: RequestFlowStep; label: string }> = [
  { key: 'route', label: 'Route' },
  { key: 'load', label: 'Truck' },
  { key: 'quote', label: 'Quote' },
  { key: 'sent', label: 'Sent' }
];

const truckIconForClass = (vehicleClass: VehicleClass) => {
  const source = `${vehicleClass.slug ?? ''} ${vehicleClass.name}`.toLowerCase();

  if (source.includes('large') || source.includes('heavy') || source.includes('cargo')) {
    return 'truck-cargo-container';
  }

  if (source.includes('medium') || source.includes('box')) {
    return 'truck';
  }

  if (source.includes('pickup') || source.includes('small')) {
    return 'truck-pickup';
  }

  return 'truck-outline';
};

const loadIconForType = (key: string) => {
  if (key.includes('household')) {
    return 'home-city-outline';
  }

  if (key.includes('furniture')) {
    return 'sofa-outline';
  }

  if (key.includes('appliance')) {
    return 'fridge-outline';
  }

  return 'storefront-outline';
};

function RequestStepIndicator({ currentStep }: { currentStep: RequestFlowStep }) {
  const currentIndex = requestFlowSteps.findIndex((step) => step.key === currentStep);

  return (
    <View style={styles.requestStepRail}>
      {requestFlowSteps.map((step, index) => {
        const active = step.key === currentStep;
        const complete = index < currentIndex;

        return (
          <View key={step.key} style={styles.requestStepItem}>
            <View style={[styles.requestStepDot, complete && styles.requestStepDotComplete, active && styles.requestStepDotActive]}>
              <Text style={[styles.requestStepDotText, (active || complete) && styles.requestStepDotTextActive]}>{index + 1}</Text>
            </View>
            <Text style={[styles.requestStepLabel, active && styles.requestStepLabelActive]}>{step.label}</Text>
          </View>
        );
      })}
    </View>
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
            <View style={[styles.requestTruckIcon, selected && styles.requestTruckIconSelected]}>
              <MaterialCommunityIcons name={truckIconForClass(vehicleClass) as never} color={selected ? colors.card : colors.black} size={30} />
            </View>
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
        <VehicleImageFrame photo={candidate.photo} selected={selected} size="large" />
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
  const navigation = useNavigation();
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
  const [requestStep, setRequestStep] = useState<RequestFlowStep>('route');

  const vehicleClassesQuery = useQuery({
    queryKey: ['vehicle-classes'],
    queryFn: async () => ((await kuliApi.vehicleClasses()) as ApiEnvelope<VehicleClass[]>).data
  });

  const vehicleClasses = vehicleClassesQuery.data ?? [];
  const selectedVehicleClass = vehicleClasses.find((vehicleClass) => vehicleClass.id === vehicleClassId);
  const selectedCapacityLabel = selectedVehicleClass?.capacityKg ? `${selectedVehicleClass.capacityKg}kg` : 'class';
  const pickupOption = useMemo(() => {
    if (pickupLocationKey === 'custom') {
      return {
        key: 'custom',
        label: 'Custom pin',
        lon: pickupLon,
        lat: pickupLat
      };
    }
    return getLocationOption(pickupLocationKey);
  }, [pickupLocationKey, pickupLon, pickupLat]);

  const destinationOption = useMemo(() => {
    if (destinationLocationKey === 'custom') {
      return {
        key: 'custom',
        label: 'Custom pin',
        lon: destinationLon,
        lat: destinationLat
      };
    }
    return getLocationOption(destinationLocationKey);
  }, [destinationLocationKey, destinationLon, destinationLat]);

  const handleMapTouch = useCallback(({ lat, lon, type }: { lat: string; lon: string; type: 'pickup' | 'destination' }) => {
    if (type === 'pickup') {
      setPickupLon(lon);
      setPickupLat(lat);
      setPickupLocationKey('custom');
    } else {
      setDestinationLon(lon);
      setDestinationLat(lat);
      setDestinationLocationKey('custom');
    }
  }, []);

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
      setRequestStep('quote');
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
      setRequestStep('sent');
      await queryClient.invalidateQueries({ queryKey: ['kuli-requests', 'mine'] });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setRequestPending(false);
    }
  };

  const snapshot = quote?.quoteSnapshot;
  const routeSummaryPickup = formatLocationAddress(pickupOption);
  const routeSummaryDestination = formatLocationAddress(destinationOption);

  const setStep = (step: RequestFlowStep) => {
    setError('');
    setRequestStep(step);
  };

  const continueToTruckAndLoad = () => {
    if (pickupLocationKey === destinationLocationKey) {
      setError('Choose different pickup and drop-off areas.');
      return;
    }

    setStep('load');
  };

  const goToHome = () => {
    (navigation as { navigate: (screen: string) => void }).navigate('Home');
  };

  return (
    <Screen padded={false} contentStyle={styles.requestFlowContent}>
      <View style={styles.requestMapStage}>
        <RouteMapPreview pickup={pickupOption} destination={destinationOption} style={styles.requestHeroMap} onMapTouch={handleMapTouch} />
        <View style={styles.requestFloatingHeader}>
          <AppHeader
            eyebrow="KULI Request"
            title="Plan your move."
            subtitle="Static route preview with Addis Ababa area selection."
            dark
            boxed
            trailing={<StatusBadge tone="warning">{formatPickupWindow(pickupDateKey, pickupTime)}</StatusBadge>}
          />
        </View>
      </View>

      <ActionSheetCard style={styles.requestFlowSheet}>
        <RequestStepIndicator currentStep={requestStep} />
        {error ? <ErrorState title="Request needs attention" message={error} /> : null}

        {requestStep === 'route' ? (
          <>
            <SectionHeader
              eyebrow="Step 1"
              title="Set your route."
              description="Choose pickup and drop-off areas or tap/touch the map directly to place custom pins."
              action={<StatusBadge tone="dark">Addis Ababa</StatusBadge>}
            />
            <RoutePill pickup={routeSummaryPickup} destination={routeSummaryDestination} />
            <View style={styles.requestSuggestionRow}>
              {addisLocationOptions.slice(0, 6).map((option) => (
                <Pressable
                  accessibilityRole="button"
                  key={option.key}
                  onPress={() => {
                    setPickupLocationKey(option.key);
                    setPickupLon(option.lon);
                    setPickupLat(option.lat);
                  }}
                  style={[styles.requestSuggestionChip, pickupLocationKey === option.key && styles.requestSuggestionChipActive]}
                >
                  <Text style={[styles.requestSuggestionText, pickupLocationKey === option.key && styles.requestSuggestionTextActive]}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
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
            <PrimaryButton label="Continue" onPress={continueToTruckAndLoad} />
          </>
        ) : null}

        {requestStep === 'load' ? (
          <>
            <SectionHeader
              eyebrow="Step 2"
              title="Truck and load."
              description="Pick a truck class, describe the load, then get your quote."
            />
            {vehicleClassesQuery.isLoading ? (
              <LoadingState title="Loading truck types" message="Checking approved KULI vehicle classes." />
            ) : vehicleClassesQuery.isError ? (
              <ErrorState title="Could not load truck types" message={getErrorMessage(vehicleClassesQuery.error)} />
            ) : vehicleClasses.length === 0 ? (
              <EmptyState title="No truck types available" message="KULI needs at least one active truck type before requests can be priced." />
            ) : (
              <RequestTruckTypeCards vehicleClasses={vehicleClasses} selectedVehicleClassId={vehicleClassId} onSelect={setVehicleClassId} />
            )}
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
                    <View style={[styles.requestLoadIcon, selected && styles.requestLoadIconSelected]}>
                      <MaterialCommunityIcons name={loadIconForType(option.key) as never} color={selected ? colors.card : colors.black} size={24} />
                    </View>
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
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: loadingAssistanceRequested }}
              onPress={() => setLoadingAssistanceRequested((value) => !value)}
              style={[styles.requestSwitchRow, loadingAssistanceRequested && styles.requestSwitchRowActive]}
            >
              <View style={styles.flex}>
                <Text style={[styles.requestSwitchText, loadingAssistanceRequested && styles.requestSwitchTextActive]}>Loading help</Text>
                <Text style={styles.muted}>Add loading or unloading help to this request.</Text>
              </View>
              <StatusBadge tone={loadingAssistanceRequested ? 'success' : 'warning'}>{loadingAssistanceRequested ? 'Yes' : 'No'}</StatusBadge>
            </Pressable>
            <Field label="Handling notes" value={specialHandlingInstructions} onChangeText={setSpecialHandlingInstructions} placeholder="Fragile wardrobe, narrow stairs" />
            <Field label="Tip ETB" value={tip} onChangeText={setTip} placeholder="0" keyboardType="numeric" />
            <View style={styles.actionRow}>
              <SecondaryButton label="Back" onPress={() => setStep('route')} style={styles.actionButton} />
              <PrimaryButton label="Get quote" loading={pending} disabled={vehicleClasses.length === 0} onPress={submitQuote} style={styles.actionButton} />
            </View>
            {pending ? <LoadingState title="Calculating quote" message="Checking route distance, pricing, and nearby approved trucks." /> : null}
          </>
        ) : null}

        {requestStep === 'quote' && quote && snapshot ? (
          <>
            <SectionHeader
              eyebrow="Step 3"
              title="Confirm your quote."
              description="Review ETB pricing, route, and nearby candidates before dispatch."
              action={<StatusBadge tone={quote.search.noResults ? 'warning' : 'success'}>{`${quote.search.radiusKmUsed}km radius`}</StatusBadge>}
            />
            <View style={styles.requestCheckoutHero}>
              <Text style={styles.requestQuoteLabel}>Total estimate</Text>
              <Text style={styles.requestQuoteTotal}>{snapshot.currency} {snapshot.totalEstimate.toFixed(2)}</Text>
              <Text style={styles.requestQuoteMeta}>{quote.route.distanceKm.toFixed(2)}km / about {Math.round(quote.route.etaMinutes)} min / {selectedVehicleClass?.name ?? quote.requestedVehicleClass.name}</Text>
            </View>
            <RoutePill pickup={routeSummaryPickup} destination={routeSummaryDestination} />
            <View style={styles.requestMetricGrid}>
              <MetricCard label="truck type" value={selectedVehicleClass?.name ?? quote.requestedVehicleClass.name} />
              <MetricCard label="payment" value="Cash" detail="Pay after delivery" tone="warning" />
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
            <SectionHeader title="Nearby verified trucks" description="Select one or more. The first truck to accept gets the trip." />
            {quote.candidates.length === 0 ? (
              <EmptyState
                title="No nearby approved trucks yet"
                message="Try a smaller load, another truck type, or a different pickup area when more trucks are online."
                action={<SecondaryButton label="Adjust request" onPress={() => setStep('load')} />}
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
                <Text style={styles.muted}>{selectedVehicleIds.length} selected. KULI will send the request to those trucks.</Text>
              </>
            )}
            <View style={styles.actionRow}>
              <SecondaryButton label="Edit" onPress={() => setStep('load')} style={styles.actionButton} />
              <PrimaryButton label="Send request" loading={requestPending} disabled={selectedVehicleIds.length === 0} onPress={createRequest} style={styles.actionButton} />
            </View>
          </>
        ) : null}

        {requestStep === 'quote' && !quote ? (
          <EmptyState title="No quote yet" message="Add truck and load details, then generate a quote before dispatch." action={<PrimaryButton label="Build quote" onPress={() => setStep('load')} />} />
        ) : null}

        {requestStep === 'sent' && requestResult ? (
          <>
            <DispatchSearchPanel request={requestResult.request} />
            <View style={styles.requestWaitingPanel}>
              <View style={styles.flex}>
                <Text style={styles.fieldLabel}>Offer expiry</Text>
                <Text style={styles.muted}>
                  {requestResult.waitingState?.expiresAt ? new Date(requestResult.waitingState.expiresAt).toLocaleTimeString() : 'Soon'}
                </Text>
              </View>
              <StatusBadge tone="warning">Pending</StatusBadge>
            </View>
            <View style={styles.actionRow}>
              <SecondaryButton label="Review quote" onPress={() => setStep('quote')} style={styles.actionButton} />
              <PrimaryButton label="Go to Home" onPress={goToHome} style={styles.actionButton} />
            </View>
          </>
        ) : null}
      </ActionSheetCard>
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
      {request.status === 'pending' ? <Text style={styles.noticeText}>Waiting for a truck to accept. The first accepted truck gets the trip, and all other open offers close automatically.</Text> : null}
      {request.status === 'accepted' ? <Text style={styles.noticeText}>Your truck accepted. Other offers are closed, the truck is assigned, and messages stay attached to this request.</Text> : null}
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
      {events.length === 0 && !eventsQuery.isLoading ? <EmptyState title="No status updates yet" message="Updates appear after a truck accepts the request." /> : null}
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
      <Text style={styles.muted}>Trip messaging is archived after cancellation or timeout. Use Activity or support actions for any follow-up.</Text>
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
  const nextStatusActionLabel = ownerNextStatusLabel(request.status);

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
    <View style={styles.ownerControlPanel}>
      <View style={styles.ownerControlHeader}>
        <View style={styles.ownerControlIcon}>
          <MaterialCommunityIcons name="steering" color={colors.card} size={24} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.ownerControlTitle}>Job controls</Text>
          <Text style={styles.ownerControlCopy}>{ownerNextStepCopy(request.status)}</Text>
        </View>
      </View>
      {error ? <ErrorState title="Status update failed" message={error} /> : null}
      <PrimaryButton
        disabled={!canAdvance || Boolean(pendingStatus)}
        label={pendingStatus ? 'Updating...' : nextStatusActionLabel}
        loading={Boolean(pendingStatus)}
        onPress={() => {
          if (nextStatus) {
            updateStatus(nextStatus);
          }
        }}
      />
      <SecondaryButton
        disabled={terminalRequestStatuses.includes(request.status) || Boolean(pendingStatus)}
        label="Cancel job"
        onPress={() => updateStatus('cancelled', 'owner_cancelled')}
        tone="danger"
      />
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
      <ActiveTripSummary request={request} ownerView={ownerControls} />
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
  { key: 'house_move', title: 'House move', detail: 'Apartments and room moves', icon: 'home-city-outline' },
  { key: 'furniture_delivery', title: 'Furniture delivery', detail: 'Sofas, beds, office sets', icon: 'sofa-outline' },
  { key: 'appliance_transport', title: 'Appliance transport', detail: 'Fridges, washers, cookers', icon: 'fridge-outline' },
  { key: 'business_goods', title: 'Business goods', detail: 'Shop stock and packages', icon: 'package-variant-closed' }
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

const shortAreaLabel = (address?: string) => {
  if (!address) {
    return 'Addis Ababa';
  }

  return address.split('/')[0]?.split(',')[0]?.trim() || address;
};

const offerExpiryLabel = (expiresAt?: string) => {
  if (!expiresAt) {
    return 'Expires soon';
  }

  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - Date.now();

  if (Number.isNaN(expiry.getTime())) {
    return 'Expires soon';
  }

  if (diffMs <= 0) {
    return 'Expiring now';
  }

  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.max(0, Math.floor((diffMs % 60000) / 1000));

  if (minutes <= 0) {
    return `${seconds}s left`;
  }

  return `${minutes}m ${seconds}s left`;
};

const loadSummaryLabel = (request?: KuliRequest) => {
  const load = request?.loadDetails;

  if (!load) {
    return 'General load';
  }

  return [
    load.itemType?.replace(/_/g, ' ') || 'General load',
    load.estimatedWeightKg ? `${load.estimatedWeightKg}kg` : '',
    load.estimatedVolumeCubicMeters ? `${load.estimatedVolumeCubicMeters}m3` : ''
  ].filter(Boolean).join(' / ');
};

const ownerNextStatusLabel = (status: KuliStatus) => {
  const nextStatus = status === 'accepted' ? 'en_route_to_pickup' : ownerForwardStatuses[ownerForwardStatuses.indexOf(status) + 1];

  const labels: Partial<Record<KuliStatus, string>> = {
    en_route_to_pickup: 'Start heading to pickup',
    arrived_at_pickup: 'I have arrived',
    loading: 'Start loading',
    in_transit: 'Start trip',
    unloading: 'Start unloading',
    completed: 'Complete job'
  };

  return nextStatus ? labels[nextStatus] ?? statusLabels[nextStatus] : 'No next step';
};

const ownerNextStepCopy = (status: KuliStatus) => {
  const copy: Record<KuliStatus, string> = {
    pending: 'This request is waiting for an owner to accept.',
    accepted: 'Head to the pickup when you are ready.',
    en_route_to_pickup: 'Mark arrival when you reach the pickup point.',
    arrived_at_pickup: 'Coordinate loading details with the customer in chat.',
    loading: 'Start the trip once the load is secured.',
    in_transit: 'Keep status updates moving as the delivery progresses.',
    unloading: 'Complete the job after unloading is finished.',
    completed: 'Confirm cash payment from Earnings when the customer has paid.',
    cancelled: 'This job is cancelled and archived.',
    timed_out: 'This request expired before acceptance.'
  };

  return copy[status];
};

const activeTrackingStatuses: KuliStatus[] = ['accepted', 'en_route_to_pickup', 'arrived_at_pickup', 'loading', 'in_transit', 'unloading', 'completed'];

const nextStepForRequest = (status: KuliStatus) => {
  const nextStepByStatus: Record<KuliStatus, string> = {
    pending: 'Waiting for a verified truck to accept.',
    accepted: 'Your truck accepted. Watch status updates and coordinate pickup details in chat.',
    en_route_to_pickup: 'Truck is marked en route to pickup. Live GPS is not shown.',
    arrived_at_pickup: 'Truck is marked arrived. Confirm gate, floor, or loading details in chat.',
    loading: 'Loading is in progress. Keep fragile or access notes in chat.',
    in_transit: 'Items are marked in transit. Follow status updates until arrival.',
    unloading: 'Unloading is in progress. Confirm final delivery details before payment.',
    completed: 'Trip is complete. Payment and trust actions are available from Activity.',
    cancelled: 'This request was cancelled and archived.',
    timed_out: 'No truck accepted in time. Start a new request when you are ready.'
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

function ClientServiceTile({ title, detail, icon, onPress }: { title: string; detail: string; icon: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.serviceTile}>
      <View style={styles.serviceIcon}>
        <MaterialCommunityIcons name={icon as never} color={colors.black} size={26} />
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
    { key: 'notified', label: 'Trucks notified', detail: `${offerCount} offer${offerCount === 1 ? '' : 's'} open` },
    { key: 'waiting', label: 'Waiting for acceptance', detail: 'First accepted truck wins the trip' }
  ];

  return (
    <View style={styles.dispatchPanel}>
      <View style={styles.dispatchPulse}>
        <Text style={styles.dispatchPulseText}>...</Text>
      </View>
      <Text style={styles.dispatchTitle}>Finding nearby verified trucks</Text>
      <Text style={styles.dispatchCopy}>KULI sent this request to the selected trucks. Tracking begins after one accepts.</Text>
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
      <Text style={styles.noticeText}>You can cancel while this request is waiting. If no truck accepts, create a new request with adjusted details.</Text>
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

function ActiveTripSummary({ request, ownerView = false }: { request: KuliRequest; ownerView?: boolean }) {
  return (
    <View style={[styles.activeTripSheet, ownerView && styles.ownerActiveJobSheet]}>
      {ownerView ? <View style={styles.ownerJobHandle} /> : null}
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <Text style={styles.ownerActiveJobEyebrow}>{ownerView ? 'Active job' : 'Active move'}</Text>
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
          <Text style={styles.dashboardMetricValue}>{ownerView ? 'Cash' : request.selectedVehicleId ? request.selectedVehicleId.slice(-6).toUpperCase() : 'Pending'}</Text>
          <Text style={styles.dashboardMetricLabel}>{ownerView ? 'payment' : 'vehicle'}</Text>
        </View>
      </View>
      {ownerView ? (
        <View style={styles.ownerJobContactCard}>
          <View style={styles.ownerJobContactIcon}>
            <MaterialCommunityIcons name="account-outline" color={colors.black} size={24} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.ownerJobContactTitle}>KULI customer</Text>
            <Text style={styles.ownerJobContactCopy}>Use trip chat for pickup, loading, and delivery details.</Text>
          </View>
        </View>
      ) : null}
      <View style={styles.activeNextStep}>
        <Text style={styles.fieldLabel}>{ownerView ? 'Next driver action' : 'Next expected step'}</Text>
        <Text style={styles.muted}>{ownerView ? ownerNextStepCopy(request.status) : nextStepForRequest(request.status)}</Text>
      </View>
      {request.selectedVehicleLocationUpdatedAt ? (
        <Text style={styles.muted}>Last truck status location update: {new Date(request.selectedVehicleLocationUpdatedAt).toLocaleString()}</Text>
      ) : (
        <Text style={styles.muted}>KULI v1 uses confirmed status updates and static map previews. Live GPS movement is not shown.</Text>
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
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <View style={styles.clientHomeHeroStack}>
      <View style={styles.clientTopBar}>
        <View style={styles.flex}>
          <Text style={styles.clientGreeting}>{greetingForNow()}, <Text style={styles.clientGreetingName}>{displayName}</Text></Text>
          <View style={styles.clientLocationRow}>
            <MaterialCommunityIcons name="map-marker" color={colors.textSecondary} size={18} />
            <Text style={styles.clientLocation}>Addis Ababa</Text>
          </View>
        </View>
        <View style={styles.clientAvatar}>
          <Text style={styles.clientAvatarText}>{initial}</Text>
        </View>
      </View>
      <View style={styles.clientCtaPanel}>
        <View style={styles.clientHeroTruckMark}>
          <MaterialCommunityIcons name="truck-fast-outline" color={colors.card} size={104} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.clientCtaTitle}>Move something today?</Text>
          <Text style={styles.clientCtaCopy}>Get an upfront quote, compare verified trucks, and send your request when you are ready.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onRequest} style={styles.clientCtaButton}>
          <Text style={styles.clientCtaButtonText}>Request a truck</Text>
          <MaterialCommunityIcons name="arrow-right" color={colors.black} size={20} />
        </Pressable>
      </View>
      <View style={styles.clientHeroMeta}>
        <StatusBadge tone={profile.accountStatus === 'active' ? 'success' : 'warning'}>{profile.accountStatus}</StatusBadge>
        <Text style={styles.clientHeroMetaText}>{activeCount ? `${activeCount} active move${activeCount === 1 ? '' : 's'}` : 'Ready for your next move'}</Text>
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
  const vehicleLabel = request.selectedVehicleId ? request.selectedVehicleId.slice(-6).toUpperCase() : request.offers?.length ? `${request.offers.length} offer${request.offers.length === 1 ? '' : 's'}` : 'Matching';

  return (
    <View style={styles.clientActiveCard}>
      <View style={styles.clientActiveCardTop}>
        <View style={styles.flex}>
          <Text style={styles.clientActiveEyebrow}>Active move</Text>
          <Text style={styles.clientActiveCode}>{request.requestCode}</Text>
        </View>
        <StatusBadge tone={badgeToneForStatus(request.status)}>{statusLabels[request.status]}</StatusBadge>
      </View>
      <View style={styles.clientRouteCard}>
        <View style={styles.clientRouteRail}>
          <View style={styles.clientRouteDotStart} />
          <View style={styles.clientRouteLine} />
          <View style={styles.clientRouteDotEnd} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.clientRouteLabel}>{request.pickupLocation.addressText}</Text>
          <Text style={styles.clientRouteTo}>to</Text>
          <Text style={styles.clientRouteLabel}>{request.destinationLocation.addressText}</Text>
        </View>
      </View>
      <View style={styles.clientActiveMetaRow}>
        <View style={styles.clientActiveMetaItem}>
          <Text style={styles.clientActiveMetaValue}>{requestEstimateLabel(request)}</Text>
          <Text style={styles.clientActiveMetaLabel}>estimate</Text>
        </View>
        <View style={styles.clientActiveMetaItem}>
          <Text style={styles.clientActiveMetaValue}>{vehicleLabel}</Text>
          <Text style={styles.clientActiveMetaLabel}>{request.selectedVehicleId ? 'vehicle' : 'dispatch'}</Text>
        </View>
        <View style={styles.clientActiveMetaItem}>
          <Text style={styles.clientActiveMetaValue}>{request.status === 'pending' ? 'Open' : 'Status'}</Text>
          <Text style={styles.clientActiveMetaLabel}>tracking</Text>
        </View>
      </View>
      <View style={styles.clientActiveSchedule}>
        <MaterialCommunityIcons name="calendar-clock" color={colors.textSecondary} size={18} />
        <Text style={styles.dashboardSubcopy}>{formatRequestSchedule(request)}</Text>
      </View>
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
      {expanded ? <View style={styles.clientExpandedDetails}>{children || <Text style={styles.muted}>Request details are up to date. Tracking starts after a truck accepts.</Text>}</View> : null}
    </View>
  );
}

function ClientRecentTripCard({ request, onRequest }: { request: KuliRequest; onRequest?: () => void }) {
  const noAcceptance = request.status === 'timed_out';

  return (
    <View style={styles.recentTripCard}>
      <View style={styles.recentTripIcon}>
        <MaterialCommunityIcons name={(request.status === 'completed' ? 'check-circle-outline' : request.status === 'cancelled' ? 'close-circle-outline' : 'truck-outline') as never} color={colors.black} size={24} />
      </View>
      <View style={styles.recentTripBody}>
        <View style={styles.flex}>
          <Text style={styles.recentTripTitle}>{requestRouteLabel(request)}</Text>
          <Text style={styles.recentTripMeta}>{formatRequestSchedule(request)}</Text>
        </View>
        <View style={styles.recentTripFooter}>
          <StatusBadge tone={badgeToneForStatus(request.status)}>{statusLabels[request.status]}</StatusBadge>
          <Text style={styles.recentTripPrice}>{requestEstimateLabel(request)}</Text>
        </View>
        <Text style={styles.recentTripCode}>{request.requestCode}</Text>
        {noAcceptance ? (
          <View style={styles.timeoutPanel}>
            <Text style={styles.fieldLabel}>No truck accepted in time</Text>
            <Text style={styles.muted}>Try again with a different truck type, load size, or pickup area.</Text>
            {onRequest ? <SecondaryButton label="Start new request" onPress={onRequest} /> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ClientHomeEmptyMove({ onRequest }: { onRequest: () => void }) {
  return (
    <View style={styles.clientEmptyMove}>
      <View style={styles.clientEmptyIllustration}>
        <MaterialCommunityIcons name="map-search-outline" color={colors.textSecondary} size={54} />
        <View style={styles.clientEmptyTruckBadge}>
          <MaterialCommunityIcons name="truck-fast-outline" color={colors.card} size={22} />
        </View>
      </View>
      <View style={styles.flex}>
        <Text style={styles.clientEmptyTitle}>No active move yet</Text>
        <Text style={styles.clientEmptyCopy}>Request a quote when you are ready. Responses, messages, and trip tracking will appear here.</Text>
      </View>
      <PrimaryButton label="Request a truck" onPress={onRequest} />
    </View>
  );
}

function ClientHomeRecentEmpty() {
  return (
    <View style={styles.clientRecentEmpty}>
      <MaterialCommunityIcons name="history" color={colors.textSecondary} size={24} />
      <View style={styles.flex}>
        <Text style={styles.clientRecentEmptyTitle}>Your completed moves will appear here.</Text>
        <Text style={styles.muted}>Finished, cancelled, and timed-out requests stay compact for follow-up.</Text>
      </View>
    </View>
  );
}

function ClientHomeScreen({ profile, onSignOut }: { profile: UserProfile; onSignOut: () => void }) {
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const [actionError, setActionError] = useState('');
  const [pendingCancelId, setPendingCancelId] = useState('');
  const [cancelTarget, setCancelTarget] = useState<KuliRequest | null>(null);
  const [expandedRequestIds, setExpandedRequestIds] = useState<string[]>([]);
  const [dismissedRatingRequestIds, setDismissedRatingRequestIds] = useState<string[]>([]);

  const requestsQuery = useQuery({
    queryKey: ['kuli-requests', 'mine'],
    queryFn: async () => ((await kuliApi.request('/kuli-requests/mine')) as ApiEnvelope<KuliRequest[]>).data,
    refetchInterval: 15000
  });

  const requests = requestsQuery.data ?? [];
  const activeRequests = requests.filter((request) => activeRequestStatuses.includes(request.status) || isPaymentSettlingRequest(request));
  const recentRequests = requests.filter((request) => !activeRequestStatuses.includes(request.status) && !isPaymentSettlingRequest(request)).slice(0, 3);
  const ratingPromptRequest = requests.find(
    (request) =>
      request.status === 'completed' &&
      request.selectedOwnerId &&
      request.payment?.status === 'confirmed_by_owner' &&
      !dismissedRatingRequestIds.includes(request.id)
  );
  const dismissRatingPrompt = (requestId: string) => {
    setDismissedRatingRequestIds((current) => [...new Set([...current, requestId])]);
  };
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
    <>
      <Screen contentStyle={styles.clientHomeContent}>
        <ClientDashboardHero profile={profile} activeCount={activeRequests.length} onRequest={goToRequest} />

        <View style={styles.dashboardSection}>
          <View style={styles.clientSectionHead}>
            <View>
              <Text style={styles.clientSectionTitle}>Quick services</Text>
              <Text style={styles.clientSectionSubtitle}>Choose a starting point. You can edit details next.</Text>
            </View>
          </View>
          <View style={styles.serviceGrid}>
            {clientServiceOptions.map((service) => (
              <ClientServiceTile key={service.key} title={service.title} detail={service.detail} icon={service.icon} onPress={goToRequest} />
            ))}
          </View>
        </View>

        <View style={styles.dashboardSection}>
          <View style={styles.clientSectionHead}>
            <View>
              <Text style={styles.clientSectionTitle}>Active move</Text>
              <Text style={styles.clientSectionSubtitle}>{activeRequests.length ? 'Follow the latest confirmed trip status.' : 'Start with a quote, then send to verified trucks.'}</Text>
            </View>
            {activeRequests.length ? <StatusBadge tone="success">{`${activeRequests.length} live`}</StatusBadge> : null}
          </View>
          {requestsQuery.isError ? <ErrorState message={getErrorMessage(requestsQuery.error)} title="Could not load requests" /> : null}
          {actionError ? <ErrorState message={actionError} title="Action failed" /> : null}
          {requestsQuery.isLoading ? <LoadingState message="Loading active and recent KULI requests." title="Loading requests" /> : null}
          {activeRequests.length === 0 && !requestsQuery.isLoading && !requestsQuery.isError ? <ClientHomeEmptyMove onRequest={goToRequest} /> : null}
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
          <View style={styles.clientSectionHead}>
            <View>
              <Text style={styles.clientSectionTitle}>Recent trips</Text>
              <Text style={styles.clientSectionSubtitle}>Completed, cancelled, and timed-out moves.</Text>
            </View>
          </View>
          {recentRequests.length ? (
            <View style={styles.recentTripList}>
              {recentRequests.map((request) => (
                <ClientRecentTripCard key={request.id} request={request} onRequest={goToRequest} />
              ))}
            </View>
          ) : (
            <ClientHomeRecentEmpty />
          )}
        </View>

        <SecondaryButton label="Sign out" onPress={onSignOut} />
      </Screen>
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
      <Modal animationType="fade" transparent visible={Boolean(ratingPromptRequest)} onRequestClose={() => ratingPromptRequest && dismissRatingPrompt(ratingPromptRequest.id)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerDialog}>
            <View style={styles.ratingModalHeader}>
              <View style={styles.flex}>
                <Text style={styles.pickerEyebrow}>Payment confirmed!</Text>
                <Text style={styles.pickerTitle}>Rate your KULI move</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss rating"
                onPress={() => ratingPromptRequest && dismissRatingPrompt(ratingPromptRequest.id)}
                style={styles.ratingModalClose}
              >
                <MaterialCommunityIcons name="close" color={colors.textSecondary} size={22} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              {ratingPromptRequest ? (
                <>
                  <Text style={styles.muted}>{ratingPromptRequest.requestCode} / {ratingPromptRequest.pickupLocation?.addressText} to {ratingPromptRequest.destinationLocation?.addressText}</Text>
                  <RatingReportPanel request={ratingPromptRequest} onRatingSaved={() => dismissRatingPrompt(ratingPromptRequest.id)} onDismiss={() => dismissRatingPrompt(ratingPromptRequest.id)} />
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
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
  const request = offer.request;
  const loadDetails = request?.loadDetails;
  const quoteSnapshot = request?.quoteSnapshot;
  const pickup = shortAreaLabel(request?.pickupLocation?.addressText);
  const destination = shortAreaLabel(request?.destinationLocation?.addressText);
  const estimate = quoteSnapshot ? `${quoteSnapshot.currency} ${Number(quoteSnapshot.totalEstimate ?? 0).toFixed(0)}` : 'Estimate pending';

  return (
    <View style={styles.ownerOfferCard}>
      <View style={styles.ownerOfferTimerBar}>
        <View style={styles.ownerOfferTimerFill} />
      </View>
      <View style={styles.ownerOfferHeader}>
        <View style={styles.flex}>
          <Text style={styles.ownerOfferEyebrow}>Estimated earnings</Text>
          <Text style={styles.ownerOfferPrice}>{estimate}</Text>
        </View>
        <View style={styles.ownerOfferHeaderBadges}>
          <StatusBadge tone={badgeToneForStatus(offer.status)}>{offerStatusLabels[offer.status]}</StatusBadge>
          <View style={styles.ownerOfferExpiry}>
            <MaterialCommunityIcons name="timer-outline" color={colors.warning} size={18} />
            <Text style={styles.ownerOfferExpiryText}>{offerExpiryLabel(offer.expiresAt)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.ownerOfferRouteBox}>
        <View style={styles.ownerOfferRouteRail}>
          <View style={styles.ownerOfferRouteDotStart} />
          <View style={styles.ownerOfferRouteLine} />
          <View style={styles.ownerOfferRouteDotEnd} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.ownerOfferRouteLabel}>Pickup</Text>
          <Text style={styles.ownerOfferRouteValue}>{pickup}</Text>
          <Text style={styles.ownerOfferRouteLabel}>Drop-off</Text>
          <Text style={styles.ownerOfferRouteValue}>{destination}</Text>
        </View>
        <View style={styles.ownerOfferDistanceBox}>
          <Text style={styles.ownerOfferDistanceValue}>{Number(offer.distanceKmAtOffer ?? 0).toFixed(1)}km</Text>
          <Text style={styles.ownerOfferDistanceLabel}>to pickup</Text>
        </View>
      </View>
      <View style={styles.ownerOfferInfoGrid}>
        <View style={styles.ownerOfferInfoCard}>
          <MaterialCommunityIcons name="truck-outline" color={colors.textSecondary} size={20} />
          <View style={styles.flex}>
            <Text style={styles.ownerOfferInfoLabel}>Truck type</Text>
            <Text style={styles.ownerOfferInfoValue}>{request?.requestedVehicleClassId?.slice(-6).toUpperCase() || 'Matched'}</Text>
          </View>
        </View>
        <View style={styles.ownerOfferInfoCard}>
          <MaterialCommunityIcons name="package-variant-closed" color={colors.textSecondary} size={20} />
          <View style={styles.flex}>
            <Text style={styles.ownerOfferInfoLabel}>Load</Text>
            <Text style={styles.ownerOfferInfoValue}>{loadSummaryLabel(request)}</Text>
          </View>
        </View>
        <View style={styles.ownerOfferInfoCard}>
          <MaterialCommunityIcons name="map-marker-distance" color={colors.textSecondary} size={20} />
          <View style={styles.flex}>
            <Text style={styles.ownerOfferInfoLabel}>Route</Text>
            <Text style={styles.ownerOfferInfoValue}>{offer.etaMinutesAtOffer ? `${Math.round(offer.etaMinutesAtOffer)} min estimate` : 'Review route'}</Text>
          </View>
        </View>
        <View style={styles.ownerOfferInfoCard}>
          <MaterialCommunityIcons name="flash-outline" color={colors.textSecondary} size={20} />
          <View style={styles.flex}>
            <Text style={styles.ownerOfferInfoLabel}>Rule</Text>
            <Text style={styles.ownerOfferInfoValue}>Fastest confirmed owner gets the job.</Text>
          </View>
        </View>
      </View>
      {expanded && request ? (
        <View style={styles.ownerOfferDetailPanel}>
          <RouteMapPreview pickup={request.pickupLocation} destination={request.destinationLocation} statusLabel="Offer route" />
          <RoutePill pickup={request.pickupLocation?.addressText ?? 'Pickup'} destination={request.destinationLocation?.addressText ?? 'Drop-off'} />
          <View style={styles.ownerOfferDetailGrid}>
            <View style={styles.ownerOfferDetailItem}>
              <Text style={styles.fieldLabel}>Load details</Text>
              <Text style={styles.muted}>{loadSummaryLabel(request)}</Text>
            </View>
            <View style={styles.ownerOfferDetailItem}>
              <Text style={styles.fieldLabel}>Handling</Text>
              <Text style={styles.muted}>{loadDetails?.loadingAssistanceRequested ? 'Loading help requested' : 'No loading help requested'}</Text>
            </View>
          </View>
          {loadDetails?.specialHandlingInstructions ? (
            <Text style={styles.noticeText}>{loadDetails.specialHandlingInstructions}</Text>
          ) : null}
          <Text style={styles.muted}>Accepting assigns this job to your active vehicle. Other owners lose access after the first confirmed accept.</Text>
        </View>
      ) : null}
      <View style={styles.ownerOfferActions}>
        <PrimaryButton label={isPending ? 'Working...' : 'Accept'} loading={isPending} disabled={isPending} onPress={() => onAccept(offer)} style={styles.ownerOfferPrimaryAction} />
        <SecondaryButton label={expanded ? 'Hide' : 'Details'} disabled={isPending} onPress={() => onToggleExpanded(offer)} style={styles.ownerOfferSecondaryAction} />
        <SecondaryButton label="Decline" disabled={isPending} onPress={() => onDecline(offer)} tone="danger" style={styles.ownerOfferSecondaryAction} />
      </View>
    </View>
  );
}

function OwnerOffersScreen({ profile }: { profile: UserProfile }) {
  const queryClient = useQueryClient();
  const markingViewedRef = useRef(false);
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

  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', 'mine'],
    queryFn: async () => ((await kuliApi.request('/vehicles/mine')) as ApiEnvelope<Vehicle[]>).data
  });

  const offers = offersQuery.data ?? [];
  const acceptedTrips = (ownerRequestsQuery.data ?? []).filter((request) => activeRequestStatuses.includes(request.status) || isPaymentSettlingRequest(request));
  const vehicles = vehiclesQuery.data ?? [];
  const onlineVehicle = vehicles.find((vehicle) => vehicle.availabilityStatus === 'online_available' && vehicle.verificationStatus === 'approved');
  const approvedVehicleCount = vehicles.filter((vehicle) => vehicle.verificationStatus === 'approved').length;
  const acceptedRequest = acceptedResult?.request;
  const showAcceptedResult = Boolean(acceptedRequest && (activeRequestStatuses.includes(acceptedRequest.status) || isPaymentSettlingRequest(acceptedRequest)));

  useFocusEffect(
    useCallback(() => {
      const sentOffers = offers.filter((offer) => offer.status === 'sent');
      if (sentOffers.length === 0 || markingViewedRef.current) {
        return;
      }

      markingViewedRef.current = true;
      Promise.allSettled(
        sentOffers.map((offer) =>
          kuliApi.request(`/offers/${offer.id}/viewed`, {
            method: 'POST'
          })
        )
      )
        .then(() => queryClient.invalidateQueries({ queryKey: ['owner-offers'] }))
        .catch(() => undefined)
        .finally(() => {
          markingViewedRef.current = false;
        });
    }, [offers, queryClient])
  );

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
    <Screen contentStyle={styles.ownerOffersContent}>
      <View style={styles.ownerOffersHero}>
        <View style={styles.flex}>
          <Text style={styles.ownerOffersEyebrow}>Driver inbox</Text>
          <Text style={styles.ownerOffersTitle}>Offers</Text>
          <Text style={styles.ownerOffersSubtitle}>Accept nearby requests before they expire.</Text>
        </View>
        <StatusBadge tone={onlineVehicle ? 'success' : approvedVehicleCount ? 'warning' : 'error'}>
          {onlineVehicle ? 'Online' : approvedVehicleCount ? 'Offline' : 'Vehicle needed'}
        </StatusBadge>
      </View>

      <View style={styles.ownerOfferStrategy}>
        <MaterialCommunityIcons name="flash-outline" color={colors.card} size={24} />
        <View style={styles.flex}>
          <Text style={styles.ownerOfferStrategyTitle}>Fastest confirmed owner gets the job.</Text>
          <Text style={styles.ownerOfferStrategyCopy}>Accept only when your active vehicle is ready to start the pickup.</Text>
        </View>
      </View>

      <View style={styles.ownerOfferReadiness}>
        <View style={styles.ownerOfferReadinessIcon}>
          <MaterialCommunityIcons name={onlineVehicle ? 'truck-check-outline' : 'truck-alert-outline'} color={onlineVehicle ? colors.success : colors.warning} size={24} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.ownerOfferReadinessTitle}>{onlineVehicle ? `${onlineVehicle.licensePlate} is receiving offers` : approvedVehicleCount ? 'Go online from Home or Vehicles' : 'Complete vehicle verification'}</Text>
          <Text style={styles.ownerOfferReadinessCopy}>{onlineVehicle ? `${onlineVehicle.vehicleClassSnapshot?.name || 'Approved vehicle'} / ${onlineVehicle.capacityKg ?? 0}kg` : 'Keep an approved truck online to receive nearby requests.'}</Text>
        </View>
      </View>

      {offersQuery.isError ? <ErrorState title="Offers could not load" message={getErrorMessage(offersQuery.error)} action={<SecondaryButton label="Retry" onPress={() => offersQuery.refetch()} />} /> : null}
      {ownerRequestsQuery.isError ? <ErrorState title="Active jobs could not load" message={getErrorMessage(ownerRequestsQuery.error)} /> : null}
      {error ? <ErrorState title="Offer action failed" message={error} /> : null}
      {message ? <Text style={styles.noticeText}>{message}</Text> : null}

      <View style={styles.ownerSectionHeader}>
        <View style={styles.flex}>
          <Text style={styles.ownerSectionTitle}>Available requests</Text>
          <Text style={styles.ownerSectionCopy}>{offers.length ? `${offers.length} open offer${offers.length === 1 ? '' : 's'} waiting.` : 'New nearby requests appear here.'}</Text>
        </View>
        <SecondaryButton label="Refresh" onPress={() => offersQuery.refetch()} style={styles.ownerSmallButton} />
      </View>

      {offersQuery.isLoading ? (
        <View style={styles.ownerOfferList}>
          {[0, 1].map((item) => (
            <View key={item} style={styles.ownerOfferSkeleton}>
              <View style={styles.notificationSkeletonLineWide} />
              <View style={styles.notificationSkeletonLine} />
              <View style={styles.notificationSkeletonLineShort} />
            </View>
          ))}
        </View>
      ) : null}

      {offers.length === 0 && !offersQuery.isLoading && !offersQuery.isError ? (
        <View style={styles.ownerEmptyCard}>
          <MaterialCommunityIcons name="radar" color={colors.black} size={46} />
          <Text style={styles.ownerEmptyTitle}>No requests yet</Text>
          <Text style={styles.ownerEmptyCopy}>Keep an approved vehicle online to receive nearby requests. KULI will notify you when a matching customer sends one.</Text>
        </View>
      ) : null}

      <View style={styles.ownerOfferList}>
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

      {showAcceptedResult && acceptedRequest ? (
        <View style={styles.ownerActiveJobCard}>
          <View style={styles.ownerSectionHeader}>
            <View style={styles.flex}>
              <Text style={styles.ownerSectionTitle}>Accepted job</Text>
              <Text style={styles.ownerSectionCopy}>Use the controls below to move the job forward.</Text>
            </View>
            <StatusBadge tone={badgeToneForStatus(acceptedRequest.status)}>{statusLabels[acceptedRequest.status]}</StatusBadge>
          </View>
          <ActiveTripWorkspace
            request={acceptedRequest}
            profile={profile}
            ownerControls
            onRequestUpdated={(request) => {
              setAcceptedResult((current) => (current ? { ...current, request } : current));
            }}
          />
        </View>
      ) : null}

      {acceptedTrips.length ? (
        <View style={styles.ownerActiveJobsSection}>
          <View style={styles.ownerSectionHeader}>
            <View style={styles.flex}>
              <Text style={styles.ownerSectionTitle}>Active jobs</Text>
              <Text style={styles.ownerSectionCopy}>Accepted and cash-pending work stays here until closed.</Text>
            </View>
            <StatusBadge tone="success">{`${acceptedTrips.length}`}</StatusBadge>
          </View>
          <View style={styles.ownerActiveJobList}>
            {acceptedTrips.map((request) => (
              <View key={request.id} style={styles.ownerActiveJobCard}>
                <ActiveTripWorkspace request={request} profile={profile} ownerControls />
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

type NotificationFilter = 'all' | 'trips' | 'offers' | 'payments' | 'system';

const notificationFilters: Array<{ key: NotificationFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'trips', label: 'Trips' },
  { key: 'offers', label: 'Offers' },
  { key: 'payments', label: 'Payments' },
  { key: 'system', label: 'System' }
];

const notificationCategoryForType = (type: string): NotificationFilter => {
  const normalized = type.toLowerCase();

  if (normalized.includes('offer')) {
    return 'offers';
  }

  if (normalized.includes('payment') || normalized.includes('earning') || normalized.includes('payout')) {
    return 'payments';
  }

  if (normalized.includes('message') || normalized.includes('trip') || normalized.includes('request') || normalized.includes('status') || normalized.includes('cancel')) {
    return 'trips';
  }

  return 'system';
};

const notificationVisual = (notification: NotificationRecord): {
  icon: string;
  accent: string;
  background: string;
  foreground: string;
  label: string;
} => {
  const type = notification.type.toLowerCase();

  if (type.includes('offer')) {
    return {
      icon: 'truck-fast-outline',
      accent: colors.warning,
      background: colors.warningTint,
      foreground: colors.warning,
      label: 'Offer'
    };
  }

  if (type.includes('payment') || type.includes('earning') || type.includes('payout')) {
    return {
      icon: 'cash-multiple',
      accent: colors.success,
      background: colors.successTint,
      foreground: colors.success,
      label: 'Payment'
    };
  }

  if (type.includes('cancel') || type.includes('failed') || type.includes('dispute') || notification.deliveryStatus === 'failed') {
    return {
      icon: 'alert-circle-outline',
      accent: colors.error,
      background: colors.errorTint,
      foreground: colors.error,
      label: type.includes('dispute') ? 'Review' : 'Alert'
    };
  }

  if (type.includes('message')) {
    return {
      icon: 'message-text-outline',
      accent: colors.black,
      background: colors.subtle,
      foreground: colors.black,
      label: 'Message'
    };
  }

  if (type.includes('status') || type.includes('trip') || type.includes('request')) {
    return {
      icon: 'map-marker-path',
      accent: colors.success,
      background: colors.successTint,
      foreground: colors.success,
      label: 'Trip'
    };
  }

  return {
    icon: 'bell-outline',
    accent: colors.black,
    background: colors.subtle,
    foreground: colors.black,
    label: 'System'
  };
};

const formatNotificationTime = (createdAt?: string) => {
  if (!createdAt) {
    return 'Just now';
  }

  const created = new Date(createdAt);
  const timestamp = created.getTime();

  if (Number.isNaN(timestamp)) {
    return 'Just now';
  }

  const diffMs = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return 'Just now';
  }

  if (diffMs < hour) {
    return `${Math.max(1, Math.floor(diffMs / minute))}m ago`;
  }

  if (diffMs < day) {
    return `${Math.floor(diffMs / hour)}h ago`;
  }

  if (diffMs < 7 * day) {
    return `${Math.floor(diffMs / day)}d ago`;
  }

  return created.toLocaleDateString();
};

function PreferenceToggle({
  label,
  detail,
  enabled,
  onPress,
  disabled = false
}: {
  label: string;
  detail: string;
  enabled: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.notificationPreferenceRow, enabled && styles.notificationPreferenceRowActive, disabled && styles.notificationPreferenceRowDisabled]}
    >
      <View style={styles.flex}>
        <Text style={styles.notificationPreferenceTitle}>{label}</Text>
        <Text style={styles.notificationPreferenceDetail}>{detail}</Text>
      </View>
      <View style={[styles.notificationToggleTrack, enabled && styles.notificationToggleTrackActive, disabled && styles.notificationToggleTrackDisabled]}>
        <View style={[styles.notificationToggleKnob, enabled && styles.notificationToggleKnobActive]} />
      </View>
    </Pressable>
  );
}

function NotificationCard({
  notification,
  pending,
  profile,
  onMarkRead,
  onOpenDetail
}: {
  notification: NotificationRecord;
  pending: boolean;
  profile: UserProfile;
  onMarkRead: (notification: NotificationRecord) => void;
  onOpenDetail: (notification: NotificationRecord) => void;
}) {
  const unread = notification.deliveryStatus !== 'read';
  const visual = notificationVisual(notification);
  const canOpen = Boolean(notification.data?.requestId);

  return (
    <View style={[styles.notificationCard, unread && styles.notificationCardUnread]}>
      <View style={[styles.notificationAccent, { backgroundColor: visual.accent }]} />
      <View style={[styles.notificationIconWrap, { backgroundColor: visual.background }]}>
        <MaterialCommunityIcons name={visual.icon as never} color={visual.foreground} size={24} />
      </View>
      <View style={styles.notificationCardBody}>
        <View style={styles.notificationCardHeader}>
          <Text style={styles.notificationCardLabel}>{visual.label}</Text>
          <View style={styles.notificationMetaRow}>
            <Text style={styles.notificationTime}>{formatNotificationTime(notification.createdAt)}</Text>
            {unread ? <View style={styles.notificationUnreadDot} /> : null}
          </View>
        </View>
        <Text style={styles.notificationTitle}>{notification.title}</Text>
        <Text style={styles.notificationBody}>{notification.body}</Text>
        {profile.role === 'truck_owner' && notification.type === 'offer.sent' ? (
          <Text style={styles.notificationHint}>Review the route, load, and estimate before accepting.</Text>
        ) : null}
        <View style={styles.notificationActionRow}>
          {canOpen ? (
            <Pressable accessibilityRole="button" disabled={pending} onPress={() => onOpenDetail(notification)} style={[styles.notificationPrimaryAction, pending && styles.buttonDisabled]}>
              <Text style={styles.notificationPrimaryActionText}>{profile.role === 'truck_owner' && notification.type === 'offer.sent' ? 'View offer' : 'View details'}</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={!unread || pending}
            onPress={() => onMarkRead(notification)}
            style={[styles.notificationSecondaryAction, (!unread || pending) && styles.notificationSecondaryActionDisabled]}
          >
            <Text style={[styles.notificationSecondaryActionText, (!unread || pending) && styles.notificationSecondaryActionTextDisabled]}>{unread ? 'Mark read' : 'Read'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function NotificationLoadingList() {
  return (
    <View style={styles.notificationList}>
      {[0, 1, 2].map((item) => (
        <View key={item} style={styles.notificationSkeletonCard}>
          <View style={styles.notificationSkeletonIcon} />
          <View style={styles.flex}>
            <View style={styles.notificationSkeletonLineWide} />
            <View style={styles.notificationSkeletonLine} />
            <View style={styles.notificationSkeletonLineShort} />
          </View>
        </View>
      ))}
    </View>
  );
}

function NotificationEmptyState({ profile }: { profile: UserProfile }) {
  return (
    <View style={styles.notificationEmptyCard}>
      <View style={styles.notificationEmptyIcon}>
        <MaterialCommunityIcons name="bell-sleep-outline" color={colors.black} size={42} />
      </View>
      <Text style={styles.notificationEmptyTitle}>No updates yet</Text>
      <Text style={styles.notificationEmptyCopy}>
        {profile.role === 'truck_owner'
          ? 'Offer alerts, vehicle decisions, trip changes, and payment updates will appear here.'
          : 'Trip updates, messages, payment notes, and account alerts will appear here.'}
      </Text>
    </View>
  );
}

function NotificationCenterScreen({ profile }: { profile: UserProfile }) {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const markingReadRef = useRef(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
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
  const availableFilters = notificationFilters.filter((filter) => filter.key === 'all' || notifications.some((notification) => notificationCategoryForType(notification.type) === filter.key));
  const filteredNotifications = activeFilter === 'all' ? notifications : notifications.filter((notification) => notificationCategoryForType(notification.type) === activeFilter);
  const unreadLabel = unreadCount === 1 ? '1 unread' : `${unreadCount} unread`;

  useFocusEffect(
    useCallback(() => {
      const unreadNotifications = notifications.filter((notification) => notification.deliveryStatus !== 'read');
      if (unreadNotifications.length === 0 || markingReadRef.current) {
        return;
      }

      markingReadRef.current = true;
      Promise.allSettled(
        unreadNotifications.map((notification) =>
          kuliApi.request(`/notifications/${notification.id}/read`, {
            method: 'PATCH'
          })
        )
      )
        .then(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }))
        .catch(() => undefined)
        .finally(() => {
          markingReadRef.current = false;
        });
    }, [notifications, queryClient])
  );

  const markRead = async (notification: NotificationRecord) => {
    setPendingId(notification.id);
    setError('');
    setMessage('');

    try {
      await kuliApi.request(`/notifications/${notification.id}/read`, {
        method: 'PATCH'
      });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setMessage('Marked as read.');
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
        navigation.navigate(notification.data?.requestId ? 'Home' : 'Notifications');
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
    <Screen contentStyle={styles.notificationsContent}>
      <View style={styles.notificationsHeader}>
        <View style={styles.notificationsHeaderTop}>
          <View style={styles.flex}>
            <Text style={styles.notificationsEyebrow}>{profile.role === 'truck_owner' ? 'Owner updates' : 'Your updates'}</Text>
            <Text style={styles.notificationsTitle}>Notifications</Text>
          </View>
          <StatusBadge tone={unreadCount ? 'warning' : 'success'}>{unreadLabel}</StatusBadge>
        </View>
        <Text style={styles.notificationsSubtitle}>
          {profile.role === 'truck_owner'
            ? 'Offer, trip, vehicle, and payment alerts stay organized here.'
            : 'Trip progress, messages, payments, and account updates stay organized here.'}
        </Text>
      </View>

      <View style={styles.notificationPreferencesCard}>
        <View style={styles.notificationSectionHeader}>
          <View style={styles.flex}>
            <Text style={styles.notificationSectionTitle}>Alert preferences</Text>
            <Text style={styles.notificationSectionCopy}>Important in-app updates stay on. Choose extra channels when you want them.</Text>
          </View>
          <View style={styles.notificationInAppPill}>
            <MaterialCommunityIcons name="check" color={colors.success} size={15} />
            <Text style={styles.notificationInAppPillText}>In-app on</Text>
          </View>
        </View>
        <PreferenceToggle label="Push" detail="Instant alerts on this device." enabled={pushEnabled} onPress={() => setPushEnabled((value) => !value)} />
        <PreferenceToggle label="SMS" detail="Optional text updates when provider is configured." enabled={smsEnabled} onPress={() => setSmsEnabled((value) => !value)} />
        <PreferenceToggle label="Email" detail="Receipts and important account updates." enabled={emailEnabled} onPress={() => setEmailEnabled((value) => !value)} />
        {error ? <ErrorState title="Could not update notifications" message={error} /> : null}
        {message ? <Text style={styles.notificationSuccessText}>{message}</Text> : null}
        <PrimaryButton disabled={preferencesPending} label={preferencesPending ? 'Saving...' : 'Save preferences'} loading={preferencesPending} onPress={savePreferences} />
      </View>

      <View style={styles.notificationFilterRow}>
        {availableFilters.map((filter) => {
          const selected = activeFilter === filter.key;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={filter.key}
              onPress={() => setActiveFilter(filter.key)}
              style={[styles.notificationFilterChip, selected && styles.notificationFilterChipActive]}
            >
              <Text style={[styles.notificationFilterText, selected && styles.notificationFilterTextActive]}>{filter.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.notificationListHeader}>
        <Text style={styles.notificationSectionTitle}>{activeFilter === 'all' ? 'Latest updates' : `${notificationFilters.find((filter) => filter.key === activeFilter)?.label ?? 'Updates'} updates`}</Text>
        <SecondaryButton label="Refresh" onPress={() => notificationsQuery.refetch()} style={styles.notificationRefreshButton} />
      </View>

      {notificationsQuery.isLoading ? <NotificationLoadingList /> : null}

      {notificationsQuery.isError ? (
        <ErrorState
          title="Updates could not load"
          message={getErrorMessage(notificationsQuery.error)}
          action={<SecondaryButton label="Try again" onPress={() => notificationsQuery.refetch()} />}
        />
      ) : null}

      {!notificationsQuery.isLoading && !notificationsQuery.isError && notifications.length === 0 ? <NotificationEmptyState profile={profile} /> : null}

      {!notificationsQuery.isLoading && !notificationsQuery.isError && notifications.length > 0 && filteredNotifications.length === 0 ? (
        <View style={styles.notificationEmptyCard}>
          <View style={styles.notificationEmptyIcon}>
            <MaterialCommunityIcons name="filter-variant-remove" color={colors.black} size={38} />
          </View>
          <Text style={styles.notificationEmptyTitle}>Nothing in this category</Text>
          <Text style={styles.notificationEmptyCopy}>Try All to see every update.</Text>
        </View>
      ) : null}

      {!notificationsQuery.isLoading && !notificationsQuery.isError && filteredNotifications.length > 0 ? (
        <View style={styles.notificationList}>
          {filteredNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              pending={pendingId === notification.id}
              profile={profile}
              onMarkRead={markRead}
              onOpenDetail={openNotificationDetail}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const ratingTags = ['On time', 'Careful handling', 'Fair price', 'Good communication', 'Professional'];
const trustIssueOptions = [
  { key: 'damage', label: 'Item damaged', icon: 'package-variant-remove' },
  { key: 'no_show', label: 'Delayed pickup', icon: 'clock-alert-outline' },
  { key: 'overcharge', label: 'Price dispute', icon: 'cash-alert' },
  { key: 'misconduct', label: 'Driver/client behavior', icon: 'account-alert-outline' },
  { key: 'other', label: 'Other', icon: 'dots-horizontal-circle-outline' }
];

function RatingReportPanel({ request, onRatingSaved, onDismiss }: { request: KuliRequest; onRatingSaved?: () => void; onDismiss?: () => void }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState('5');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [reviewText, setReviewText] = useState('');
  const [mode, setMode] = useState<'review' | 'issue' | 'payment'>('review');
  const [category, setCategory] = useState('damage');
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
          reviewText: [selectedTags.join(', '), reviewText.trim()].filter(Boolean).join(' - ') || undefined
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

  const toggleRatingTag = (tag: string) => {
    setSelectedTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  };

  return (
    <View style={styles.trustPanel}>
      <View style={styles.trustHero}>
        <View style={styles.trustHeroIcon}>
          <MaterialCommunityIcons name="shield-check-outline" color={colors.card} size={30} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.trustHeroTitle}>{mode === 'review' ? 'Rate your KULI move' : mode === 'issue' ? 'Report an issue' : 'Cash payment review'}</Text>
          <Text style={styles.trustHeroCopy}>{request.requestCode} / {shortAreaLabel(request.pickupLocation?.addressText)} to {shortAreaLabel(request.destinationLocation?.addressText)}</Text>
        </View>
        <StatusBadge tone={terminal ? 'success' : 'warning'}>{terminal ? 'Ready' : 'Trip active'}</StatusBadge>
      </View>
      <View style={styles.trustModeTabs}>
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
            style={[styles.trustModeTab, mode === option.key && styles.trustModeTabActive]}
          >
            <Text style={[styles.trustModeTabText, mode === option.key && styles.trustModeTabTextActive]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      {mode === 'review' ? (
        <View style={styles.trustSection}>
          <View style={styles.ratingOwnerCard}>
            <View style={styles.ratingOwnerAvatar}>
              <MaterialCommunityIcons name="truck-check-outline" color={colors.black} size={26} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.ratingOwnerTitle}>{request.selectedVehicleId ? `Vehicle ${request.selectedVehicleId.slice(-6).toUpperCase()}` : 'KULI truck owner'}</Text>
              <Text style={styles.ratingOwnerCopy}>Your public review helps future customers choose verified trucks.</Text>
            </View>
          </View>
          <View style={styles.trustStars}>
            {[1, 2, 3, 4, 5].map((star) => {
              const selected = Number(rating) >= star;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={star}
                  onPress={() => setRating(String(star))}
                  style={styles.trustStarButton}
                >
                  <MaterialCommunityIcons name={selected ? 'star' : 'star-outline'} color={selected ? colors.warning : colors.border} size={42} />
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.trustRatingSummary}>{rating}/5 selected</Text>
          <View style={styles.trustTagGrid}>
            {ratingTags.map((tag) => {
              const selected = selectedTags.includes(tag);

              return (
                <Pressable key={tag} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => toggleRatingTag(tag)} style={[styles.trustTag, selected && styles.trustTagSelected]}>
                  <Text style={[styles.trustTagText, selected && styles.trustTagTextSelected]}>{tag}</Text>
                </Pressable>
              );
            })}
          </View>
          <Field label="Review note" value={reviewText} onChangeText={setReviewText} placeholder="Optional: what went well?" />
        </View>
      ) : null}

      {mode === 'issue' ? (
        <View style={styles.trustSection}>
          <Text style={styles.trustSectionCopy}>Choose the closest category. Evidence is optional, but useful for damage or price questions.</Text>
          <View style={styles.issueTileGrid}>
            {trustIssueOptions.map((option) => {
              const selected = category === option.key;

              return (
                <Pressable accessibilityRole="button" accessibilityState={{ selected }} key={option.key} onPress={() => setCategory(option.key)} style={[styles.issueTile, selected && styles.issueTileSelected]}>
                  <MaterialCommunityIcons name={option.icon as never} color={selected ? colors.card : colors.black} size={25} />
                  <Text style={[styles.issueTileText, selected && styles.issueTileTextSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Field label="What happened?" value={description} onChangeText={setDescription} placeholder="Add a short, clear description" />
          <View style={styles.evidenceCard}>
            <MaterialCommunityIcons name={evidenceFile ? 'file-check-outline' : 'camera-plus-outline'} color={evidenceFile ? colors.success : colors.textSecondary} size={28} />
            <View style={styles.flex}>
              <Text style={styles.evidenceTitle}>{evidenceFile ? 'Evidence attached' : 'Add evidence'}</Text>
              <Text style={styles.evidenceCopy}>{evidenceFile ? evidenceFile.name : 'Upload a photo or take a new picture when it helps.'}</Text>
            </View>
          </View>
          <FilePickerField label="Evidence photo" value={evidenceFile} onChange={setEvidenceFile} emptyText="Optional. Add a clear image when it supports the issue." uploadLabel="Upload" takeLabel="Camera" />
        </View>
      ) : null}

      {mode === 'payment' ? (
        <View style={styles.trustSection}>
          <View style={styles.paymentDisputeCard}>
            <Text style={styles.ownerPaymentEyebrow}>Manual cash estimate</Text>
            <Text style={styles.ownerPaymentAmount}>{requestEstimateLabel(request)}</Text>
            <StatusBadge tone={request.payment?.status === 'disputed' ? 'warning' : request.payment?.status === 'confirmed_by_owner' ? 'success' : 'warning'}>
              {request.payment ? paymentStatusLabels[request.payment.status] : 'Payment pending'}
            </StatusBadge>
          </View>
          <Text style={styles.trustSectionCopy}>Use this only for pay-after-delivery cash amount or payment status issues.</Text>
          <Field label="Payment issue" value={description} onChangeText={setDescription} placeholder="Describe the payment problem" />
        </View>
      ) : null}

      {error ? <ErrorState title="Action failed" message={error} /> : null}
      {message ? <Text style={styles.trustSuccessText}>{message}</Text> : null}
      {mode === 'review' ? (
        <>
          <PrimaryButton disabled={!canRate || Boolean(pendingAction)} loading={pendingAction === 'rating'} label={pendingAction === 'rating' ? 'Saving...' : 'Submit review'} onPress={submitRating} />
          {onDismiss ? <SecondaryButton label="Not now" onPress={onDismiss} /> : null}
        </>
      ) : null}
      {mode === 'issue' ? (
        <PrimaryButton disabled={Boolean(pendingAction)} loading={pendingAction === 'report'} label={pendingAction === 'report' ? 'Submitting...' : 'Submit issue'} onPress={createReport} />
      ) : null}
      {mode === 'payment' ? (
        <PrimaryButton disabled={!canDisputePayment || Boolean(pendingAction)} loading={pendingAction === 'dispute'} label={pendingAction === 'dispute' ? 'Submitting...' : 'Submit payment dispute'} onPress={disputePayment} />
      ) : null}
    </View>
  );
}

type ClientHistoryFilter = 'all' | 'completed' | 'cancelled' | 'issues' | 'payment';

const clientHistoryFilters: Array<{ key: ClientHistoryFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'issues', label: 'Issues' },
  { key: 'payment', label: 'Payment' }
];

const historyFilterMatches = (request: KuliRequest, filter: ClientHistoryFilter) => {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'completed') {
    return request.status === 'completed';
  }

  if (filter === 'cancelled') {
    return request.status === 'cancelled' || request.status === 'timed_out';
  }

  if (filter === 'issues') {
    return request.status === 'cancelled' || request.payment?.status === 'disputed';
  }

  return Boolean(request.payment) || request.status === 'completed';
};

function ClientHistoryTripCard({
  request,
  expanded,
  onToggle
}: {
  request: KuliRequest;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.activityTripCard}>
      <View style={styles.activityTripHeader}>
        <View style={styles.flex}>
          <Text style={styles.activityTripCode}>{request.requestCode}</Text>
          <Text style={styles.activityTripDate}>{formatRequestSchedule(request)}</Text>
        </View>
        <StatusBadge tone={badgeToneForStatus(request.status)}>{statusLabels[request.status]}</StatusBadge>
      </View>
      <View style={styles.activityRouteRow}>
        <View style={styles.activityRouteRail}>
          <View style={styles.activityRouteDotStart} />
          <View style={styles.activityRouteLine} />
          <View style={styles.activityRouteDotEnd} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.activityRouteText}>{request.pickupLocation?.addressText}</Text>
          <Text style={styles.activityRouteText}>{request.destinationLocation?.addressText}</Text>
        </View>
      </View>
      <View style={styles.activityTripFooter}>
        <View>
          <Text style={styles.activityTripAmount}>{requestEstimateLabel(request)}</Text>
          <Text style={styles.activityTripMeta}>{request.requestedVehicleClassId ? `Truck ${request.requestedVehicleClassId.slice(-6).toUpperCase()}` : 'KULI truck'}</Text>
        </View>
        <SecondaryButton label={expanded ? 'Hide' : 'Details'} onPress={onToggle} style={styles.ownerSmallButton} />
      </View>
      {expanded ? (
        <View style={styles.activityDetailPanel}>
          <RoutePill pickup={request.pickupLocation?.addressText ?? 'Pickup'} destination={request.destinationLocation?.addressText ?? 'Destination'} />
          <View style={styles.activityDetailGrid}>
            <MetricCard label="Payment" value={request.payment ? paymentStatusLabels[request.payment.status] : 'Pending'} tone={request.payment?.status === 'disputed' ? 'warning' : request.payment?.status === 'confirmed_by_owner' ? 'success' : 'default'} />
            <MetricCard label="Rating" value={request.selectedOwnerId ? 'Available' : 'Unavailable'} detail="After completed owner-linked trip" />
          </View>
          <TripTimeline requestId={request.id} />
          <RatingReportPanel request={request} />
        </View>
      ) : null}
    </View>
  );
}

function ClientHistoryScreen({ profile }: { profile: UserProfile }) {
  const navigation = useNavigation<any>();
  const [expandedRequestId, setExpandedRequestId] = useState('');
  const [activeFilter, setActiveFilter] = useState<ClientHistoryFilter>('all');
  const [dismissedRatingRequestIds, setDismissedRatingRequestIds] = useState<string[]>([]);
  const requestsQuery = useQuery({
    queryKey: ['kuli-requests', 'mine', 'history'],
    queryFn: async () => ((await kuliApi.request('/kuli-requests/mine')) as ApiEnvelope<KuliRequest[]>).data
  });

  const requests = requestsQuery.data ?? [];
  const terminalRequests = requests.filter((request) => terminalRequestStatuses.includes(request.status));
  const filteredRequests = terminalRequests.filter((request) => historyFilterMatches(request, activeFilter));
  const ratingPromptRequest = terminalRequests.find(
    (request) =>
      request.status === 'completed' &&
      request.selectedOwnerId &&
      request.payment?.status === 'confirmed_by_owner' &&
      !dismissedRatingRequestIds.includes(request.id)
  );

  const dismissRatingPrompt = (requestId: string) => {
    setDismissedRatingRequestIds((current) => [...new Set([...current, requestId])]);
  };

  return (
    <>
      <Screen contentStyle={styles.activityContent}>
        <View style={styles.activityHero}>
          <View style={styles.flex}>
            <Text style={styles.activityEyebrow}>KULI Activity</Text>
            <Text style={styles.activityTitle}>Trip history</Text>
            <Text style={styles.activitySubtitle}>Reviews, reports, and manual payment questions stay attached to each trip.</Text>
          </View>
          <StatusBadge tone="dark">{`${terminalRequests.length} trips`}</StatusBadge>
        </View>

        <View style={styles.activityFilterRow}>
          {clientHistoryFilters.map((filter) => {
            const selected = activeFilter === filter.key;

            return (
              <Pressable key={filter.key} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setActiveFilter(filter.key)} style={[styles.activityFilterChip, selected && styles.activityFilterChipActive]}>
                <Text style={[styles.activityFilterText, selected && styles.activityFilterTextActive]}>{filter.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {requestsQuery.isLoading ? <LoadingState title="Loading activity" message="Checking your completed and cancelled moves." /> : null}
        {requestsQuery.isError ? <ErrorState title="Activity could not load" message={getErrorMessage(requestsQuery.error)} /> : null}
        {!requestsQuery.isLoading && terminalRequests.length === 0 ? (
          <View style={styles.ownerEmptyCard}>
            <MaterialCommunityIcons name="history" color={colors.black} size={44} />
            <Text style={styles.ownerEmptyTitle}>No trips yet</Text>
            <Text style={styles.ownerEmptyCopy}>Completed and cancelled KULI moves will appear here.</Text>
            <PrimaryButton label="Request a truck" onPress={() => navigation.navigate('Request')} />
          </View>
        ) : null}
        {!requestsQuery.isLoading && terminalRequests.length > 0 && filteredRequests.length === 0 ? (
          <EmptyState title="Nothing in this filter" message="Try All to see every completed, cancelled, or payment-related trip." />
        ) : null}
        <View style={styles.activityTripList}>
          {filteredRequests.map((request) => (
            <ClientHistoryTripCard
              key={request.id}
              request={request}
              expanded={expandedRequestId === request.id}
              onToggle={() => setExpandedRequestId((current) => (current === request.id ? '' : request.id))}
            />
          ))}
        </View>
        <Text style={styles.muted}>Signed in as {profile.fullName || profile.email}.</Text>
      </Screen>
      <Modal animationType="fade" transparent visible={Boolean(ratingPromptRequest)} onRequestClose={() => ratingPromptRequest && dismissRatingPrompt(ratingPromptRequest.id)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerDialog}>
            <View style={styles.ratingModalHeader}>
              <View style={styles.flex}>
                <Text style={styles.pickerEyebrow}>Trip complete</Text>
                <Text style={styles.pickerTitle}>Rate your KULI move</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss rating"
                onPress={() => ratingPromptRequest && dismissRatingPrompt(ratingPromptRequest.id)}
                style={styles.ratingModalClose}
              >
                <MaterialCommunityIcons name="close" color={colors.textSecondary} size={22} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              {ratingPromptRequest ? (
                <>
                  <Text style={styles.muted}>{ratingPromptRequest.requestCode} / {ratingPromptRequest.pickupLocation?.addressText} to {ratingPromptRequest.destinationLocation?.addressText}</Text>
                  <RatingReportPanel request={ratingPromptRequest} onRatingSaved={() => dismissRatingPrompt(ratingPromptRequest.id)} onDismiss={() => dismissRatingPrompt(ratingPromptRequest.id)} />
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function OwnerEarningsScreen({ profile }: { profile: UserProfile }) {
  const queryClient = useQueryClient();
  const [pendingRequestId, setPendingRequestId] = useState('');
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

  const allOwnerRequests = requestsQuery.data ?? [];
  const allCompletedRequests = allOwnerRequests.filter((request) => request.status === 'completed');
  const completedRequests = allCompletedRequests.filter((request) => !isPaymentClosedRequest(request));
  const ratings = ratingsQuery.data ?? [];
  const averageRating = ratings.length ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length : 0;
  const totalEarnings = allCompletedRequests.reduce((sum, request) => sum + Number(request.payment?.amountConfirmed ?? request.quoteSnapshot?.totalEstimate ?? 0), 0);
  const cashCollected = allCompletedRequests
    .filter((request) => request.payment?.status === 'confirmed_by_owner' || request.payment?.status === 'resolved')
    .reduce((sum, request) => sum + Number(request.payment?.amountConfirmed ?? request.quoteSnapshot?.totalEstimate ?? 0), 0);
  const pendingConfirmations = allCompletedRequests.filter((request) => !isPaymentClosedRequest(request)).length;

  const confirmPayment = async (request: KuliRequest) => {
    setPendingRequestId(request.id);
    setError('');
    setMessage('');

    try {
      const amount = Number(request.quoteSnapshot?.totalEstimate || 0);
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
    <Screen contentStyle={styles.earningsContent}>
      <View style={styles.earningsHero}>
        <Text style={styles.earningsHeroLabel}>Total completed earnings</Text>
        <Text style={styles.earningsHeroAmount}>ETB {totalEarnings.toFixed(2)}</Text>
        <Text style={styles.earningsHeroCopy}>Manual cash/pay-after-delivery records confirmed by KULI trips.</Text>
      </View>

      <View style={styles.ownerMetricGrid}>
        <MetricCard label="Completed jobs" value={String(allCompletedRequests.length)} tone="dark" />
        <MetricCard label="Cash collected" value={`ETB ${cashCollected.toFixed(0)}`} tone="success" />
        <MetricCard label="Pending confirmations" value={String(pendingConfirmations)} tone={pendingConfirmations ? 'warning' : 'default'} />
        <MetricCard label="Average rating" value={averageRating ? averageRating.toFixed(1) : '-'} detail={`${ratings.length} review${ratings.length === 1 ? '' : 's'}`} />
      </View>

      {requestsQuery.isLoading ? <LoadingState title="Loading earnings" message="Checking completed jobs and cash confirmations." /> : null}
      {requestsQuery.isError ? <ErrorState title="Earnings could not load" message={getErrorMessage(requestsQuery.error)} /> : null}
      {error ? <ErrorState title="Payment action failed" message={error} /> : null}
      {message ? <Text style={styles.trustSuccessText}>{message}</Text> : null}

      <View style={styles.earningsSection}>
        <View style={styles.ownerSectionHeader}>
          <View style={styles.flex}>
            <Text style={styles.ownerSectionTitle}>Cash confirmations</Text>
            <Text style={styles.ownerSectionCopy}>Confirm only after receiving manual cash from the customer.</Text>
          </View>
          <StatusBadge tone={pendingConfirmations ? 'warning' : 'success'}>{`${pendingConfirmations} pending`}</StatusBadge>
        </View>
        {allCompletedRequests.length === 0 ? (
          <View style={styles.ownerEmptyCard}>
            <MaterialCommunityIcons name="cash-clock" color={colors.black} size={44} />
            <Text style={styles.ownerEmptyTitle}>No earnings yet</Text>
            <Text style={styles.ownerEmptyCopy}>Complete trips and confirm cash payments to build your earnings history.</Text>
          </View>
        ) : null}
        {completedRequests.length === 0 && allCompletedRequests.length > 0 ? <EmptyState title="No pending cash confirmations" message="Completed payments are already confirmed, resolved, or closed." /> : null}
        <View style={styles.ownerPaymentList}>
          {completedRequests.map((request) => (
            <View key={request.id} style={styles.ownerPaymentCard}>
              <View style={styles.ownerPaymentHeader}>
                <View style={styles.flex}>
                  <Text style={styles.ownerPaymentEyebrow}>Cash payment</Text>
                  <Text style={styles.ownerPaymentAmount}>{request.quoteSnapshot?.currency ?? 'ETB'} {Number(request.quoteSnapshot?.totalEstimate ?? 0).toFixed(2)}</Text>
                  <Text style={styles.ownerPaymentRoute}>{request.pickupLocation?.addressText} to {request.destinationLocation?.addressText}</Text>
                </View>
                <StatusBadge tone={request.payment?.status === 'disputed' ? 'warning' : request.payment?.status === 'confirmed_by_owner' ? 'success' : 'warning'}>
                  {request.payment ? paymentStatusLabels[request.payment.status] : 'Payment pending'}
                </StatusBadge>
              </View>
              <View style={styles.ownerPaymentMethodRow}>
                <View style={styles.ownerPaymentMethodIcon}>
                  <MaterialCommunityIcons name="cash" color={colors.black} size={24} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.ownerPaymentMethodTitle}>Cash after delivery</Text>
                  <Text style={styles.ownerPaymentMethodCopy}>Confirm only after you have received the cash amount.</Text>
                </View>
              </View>
              <PrimaryButton
                disabled={pendingRequestId === request.id}
                label={pendingRequestId === request.id ? 'Confirming...' : 'Confirm cash received'}
                loading={pendingRequestId === request.id}
                onPress={() => confirmPayment(request)}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.earningsSection}>
        <View style={styles.ownerSectionHeader}>
          <View style={styles.flex}>
            <Text style={styles.ownerSectionTitle}>Rating summary</Text>
            <Text style={styles.ownerSectionCopy}>Recent customer feedback from completed KULI trips.</Text>
          </View>
          <View style={styles.earningsRatingBadge}>
            <MaterialCommunityIcons name="star" color={colors.warning} size={18} />
            <Text style={styles.earningsRatingText}>{averageRating ? averageRating.toFixed(1) : '-'}</Text>
          </View>
        </View>
        {ratingsQuery.isError ? <ErrorState title="Ratings could not load" message={getErrorMessage(ratingsQuery.error)} /> : null}
        {ratings.length === 0 && !ratingsQuery.isLoading ? <EmptyState title="No reviews yet" message="Customer reviews appear here after completed trips." /> : null}
        <View style={styles.earningsReviewList}>
          {ratings.slice(0, 4).map((ratingRecord) => (
            <View key={ratingRecord.id} style={styles.earningsReviewCard}>
              <StarRating value={ratingRecord.rating} compact />
              <Text style={styles.earningsReviewText}>{ratingRecord.reviewText || 'No written review.'}</Text>
              {ratingRecord.createdAt ? <Text style={styles.muted}>{new Date(ratingRecord.createdAt).toLocaleDateString()}</Text> : null}
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

function ClientTabs({ profile, onSignOut }: { profile: UserProfile; onSignOut: () => void }) {
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => ((await kuliApi.request('/notifications')) as ApiEnvelope<NotificationRecord[]>).data,
    refetchInterval: 20000
  });
  const unreadNotifications = (notificationsQuery.data ?? []).filter((notification) => notification.deliveryStatus !== 'read').length;

  return (
    <Tab.Navigator screenOptions={createTabScreenOptions(clientTabIcons)}>
      <Tab.Screen name="Home">{() => <ClientHomeScreen profile={profile} onSignOut={onSignOut} />}</Tab.Screen>
      <Tab.Screen name="Request" component={ClientQuoteScreen} />
      <Tab.Screen name="Activity">{() => <ClientHistoryScreen profile={profile} />}</Tab.Screen>
      <Tab.Screen name="Notifications" options={tabBadgeOptions(unreadNotifications)}>{() => <NotificationCenterScreen profile={profile} />}</Tab.Screen>
    </Tab.Navigator>
  );
}

function OwnerTabs({ profile, onSignOut }: { profile: UserProfile; onSignOut: () => void }) {
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => ((await kuliApi.request('/notifications')) as ApiEnvelope<NotificationRecord[]>).data,
    refetchInterval: 20000
  });
  const offersQuery = useQuery({
    queryKey: ['owner-offers'],
    queryFn: async () => ((await kuliApi.request('/owner/offers')) as ApiEnvelope<TripOffer[]>).data,
    refetchInterval: 15000
  });
  const unreadNotifications = (notificationsQuery.data ?? []).filter((notification) => notification.deliveryStatus !== 'read').length;
  const unreadOffers = (offersQuery.data ?? []).filter((offer) => offer.status === 'sent').length;

  return (
    <Tab.Navigator screenOptions={createTabScreenOptions(ownerTabIcons)}>
      <Tab.Screen name="Home">{() => <HomeOverview profile={profile} onSignOut={onSignOut} />}</Tab.Screen>
      <Tab.Screen name="Vehicles" component={OwnerVehiclesScreen} />
      <Tab.Screen name="Offers" options={tabBadgeOptions(unreadOffers)}>{() => <OwnerOffersScreen profile={profile} />}</Tab.Screen>
      <Tab.Screen name="Notifications" options={tabBadgeOptions(unreadNotifications)}>{() => <NotificationCenterScreen profile={profile} />}</Tab.Screen>
      <Tab.Screen name="Earnings">{() => <OwnerEarningsScreen profile={profile} />}</Tab.Screen>
    </Tab.Navigator>
  );
}

/**
 * Core Application Controller that orchestrates authentication session status (via Supabase),
 * remote user profile sync status, loading screens, and conditional screen/navigator routing.
 */
function AppContent() {
  const query = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileMissing, setProfileMissing] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [passwordRecoverySession, setPasswordRecoverySession] = useState<Session | null>(null);
  const [splashReady, setSplashReady] = useState(false);
  const [splashSeen, setSplashSeen] = useState(true);
  const activeSessionUserIdRef = useRef<string | null>(null);
  const recoveryInProgressRef = useRef(false);

  const loadCurrentProfile = useCallback(async (nextSession: Session | null) => {
    const nextUserId = nextSession?.user.id ?? null;
    const sameUser = Boolean(nextUserId && activeSessionUserIdRef.current === nextUserId);

    setSession(nextSession);
    setProfileMissing(false);
    setProfileError('');

    if (!nextSession) {
      setSessionAccessToken(null);
      activeSessionUserIdRef.current = null;
      setProfile(null);
      setLoading(false);
      return;
    }

    setSessionAccessToken(nextSession.access_token);

    if (!sameUser) {
      setProfile(null);
      setLoading(true);
    }

    try {
      authDebug('loading profile', {
        hasSession: true,
        email: nextSession.user.email,
        userId: nextSession.user.id
      });

      const profile = await fetchProfileForSession(nextSession);
      activeSessionUserIdRef.current = nextUserId;
      setProfile(profile);
      setProfileMissing(false);
      setProfileError('');
      authDebug('profile loaded', {
        role: profile.role,
        accountStatus: profile.accountStatus,
        route: profile.role === 'client' ? 'mobile-client' : profile.role === 'truck_owner' ? 'mobile-owner' : 'mobile-forbidden'
      });
    } catch (error) {
      authDebug('profile load failed', {
        code: (error as { code?: string }).code,
        message: getErrorMessage(error),
        hasSession: Boolean(nextSession)
      });

      if ((error as { code?: string }).code === 'PROFILE_NOT_FOUND') {
        try {
          const syncedProfile = (await syncPublicProfileFromSession(nextSession)) ?? (await syncStoredProfileFromSession(nextSession));

          if (syncedProfile) {
            activeSessionUserIdRef.current = nextUserId;
            setProfile(syncedProfile);
            setProfileMissing(false);
            setProfileError('');
            authDebug('missing public profile synced', {
              role: syncedProfile.role,
              route: syncedProfile.role === 'client' ? 'mobile-client' : 'mobile-owner'
            });
            return;
          }
        } catch (syncError) {
          authDebug('missing profile sync failed', {
            code: (syncError as { code?: string }).code,
            message: getErrorMessage(syncError)
          });
          setProfileError(getErrorMessage(syncError));
        }

        activeSessionUserIdRef.current = nextUserId;
        if (!sameUser) {
          setProfile(null);
        }
        setProfileMissing(true);
        setProfileError('This signed-in Supabase account does not have a KULI mobile profile. Register with KULI using the same email, or contact support to link the account.');
      } else if (!sameUser) {
        setProfile(null);
        setProfileError(getErrorMessage(error));
      } else {
        setProfileError(getErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAuthUrl = useCallback(async (url: string | null) => {
    if (!url || (!url.includes('auth/callback') && !url.includes('auth/reset-password') && !url.includes('access_token=') && !url.includes('code='))) {
      return;
    }

    const params = readAuthUrlParams(url);
    const type = params.get('type');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const code = params.get('code');
    const isRecovery = type === 'recovery' || url.includes('reset-password');

    authDebug('auth callback opened', { type, hasAccessToken: Boolean(accessToken), hasRefreshToken: Boolean(refreshToken), hasCode: Boolean(code), isRecovery });

    try {
      let nextSession: Session | null = null;

      if (code) {
        const { data: codeData, error: codeError } = await supabase.auth.exchangeCodeForSession(code);

        if (codeError) {
          throw codeError;
        }

        nextSession = codeData.session;
      } else if (accessToken && refreshToken) {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (sessionError) {
          throw sessionError;
        }

        nextSession = sessionData.session;
      } else {
        nextSession = (await supabase.auth.getSession()).data.session;
      }

      if (!nextSession) {
        setAuthNotice('The email link opened, but no active session was created. Try signing in again.');
        return;
      }

      if (isRecovery) {
        setSessionAccessToken(nextSession.access_token);
        recoveryInProgressRef.current = true;
        setPasswordRecoverySession(nextSession);
        setSession(nextSession);
        setLoading(false);
        return;
      }

      await loadCurrentProfile(nextSession);
    } catch (callbackError) {
      authDebug('auth callback failed', callbackError);
      setAuthNotice(getErrorMessage(callbackError));
      setLoading(false);
    }
  }, [loadCurrentProfile]);

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(AUTH_ONBOARDING_COMPLETED_KEY)
      .then((value) => {
        if (!mounted) {
          return;
        }

        const alreadySeen = value === 'true';
        setSplashSeen(alreadySeen);

        if (alreadySeen) {
          setSplashReady(true);
          return;
        }

        setTimeout(() => {
          AsyncStorage.setItem(AUTH_ONBOARDING_COMPLETED_KEY, 'true').catch(() => undefined);

          if (mounted) {
            setSplashReady(true);
          }
        }, 900);
      })
      .catch(() => {
        if (mounted) {
          setSplashReady(true);
        }
      });

    Linking.getInitialURL()
      .then((url) => {
        if (mounted) {
          handleAuthUrl(url);
        }
      })
      .catch((linkError) => authDebug('initial link failed', linkError));

    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      handleAuthUrl(url);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        loadCurrentProfile(data.session);
      }
    });

    const { data: subscriptionData } = supabase.auth.onAuthStateChange((event, nextSession) => {
      authDebug('auth state changed', { event, hasSession: Boolean(nextSession), userId: nextSession?.user.id });

      if (event === 'PASSWORD_RECOVERY' && nextSession) {
        setSessionAccessToken(nextSession.access_token);
        recoveryInProgressRef.current = true;
        setPasswordRecoverySession(nextSession);
        setSession(nextSession);
        setLoading(false);
        return;
      }

      if (recoveryInProgressRef.current) {
        setSessionAccessToken(nextSession?.access_token);
        setSession(nextSession);
        setLoading(false);
        return;
      }

      loadCurrentProfile(nextSession);
    });

    return () => {
      mounted = false;
      linkSubscription.remove();
      subscriptionData.subscription.unsubscribe();
    };
  }, [handleAuthUrl, loadCurrentProfile]);

  const handleAuthenticated = (nextProfile: UserProfile, nextSession: Session) => {
    AsyncStorage.setItem(AUTH_ONBOARDING_COMPLETED_KEY, 'true').catch(() => undefined);
    clearStoredProfileDraft(nextProfile.email ?? nextSession.user.email).catch(() => undefined);
    setSessionAccessToken(nextSession.access_token);
    activeSessionUserIdRef.current = nextSession.user.id ?? null;
    setSession(nextSession);
    setProfile(nextProfile);
    setProfileMissing(false);
    setProfileError('');
    setAuthNotice('');
    setLoading(false);
  };

  const handlePasswordRecoveryVerified = (nextSession: Session) => {
    recoveryInProgressRef.current = true;
    activeSessionUserIdRef.current = null;
    setSessionAccessToken(nextSession.access_token);
    setPasswordRecoverySession(nextSession);
    setSession(nextSession);
    setProfile(null);
    setProfileMissing(false);
    setProfileError('');
    setAuthNotice('');
    setLoading(false);
  };

  const handleSignOut = async () => {
    clearSessionAccessToken();
    recoveryInProgressRef.current = false;
    setPasswordRecoverySession(null);
    await supabase.auth.signOut();
    query.clear();
    activeSessionUserIdRef.current = null;
    setSession(null);
    setProfile(null);
    setProfileMissing(false);
    setProfileError('');
  };

  const handleResetComplete = async () => {
    recoveryInProgressRef.current = false;
    setPasswordRecoverySession(null);
    setAuthNotice('Password updated. Sign in with your new password.');
    setSessionAccessToken(null);
    await supabase.auth.signOut();
    query.clear();
    activeSessionUserIdRef.current = null;
    setSession(null);
    setProfile(null);
    setProfileMissing(false);
    setProfileError('');
  };

  const retryProfileLoad = () => {
    setLoading(true);
    supabase.auth.getSession().then(({ data }) => loadCurrentProfile(data.session));
  };

  if (loading || !splashReady) {
    return <SplashScreen compact={splashSeen} />;
  }

  if (passwordRecoverySession) {
    return <ResetPasswordScreen onComplete={handleResetComplete} onSignOut={handleSignOut} />;
  }

  if (!session) {
    return <AuthScreen initialNotice={authNotice} onAuthenticated={handleAuthenticated} onPasswordRecoveryVerified={handlePasswordRecoveryVerified} />;
  }

  if (profileMissing) {
    if (session && isStaffSession(session)) {
      return <StaffMobileBlockedScreen onSignOut={handleSignOut} />;
    }

    return (
      <ProfileLoadErrorScreen
        message={profileError || 'This signed-in account does not have a KULI mobile profile. Register with KULI using the same email, or contact support to link the account.'}
        onRetry={retryProfileLoad}
        onSignOut={handleSignOut}
      />
    );
  }

  if (!profile) {
    return <ProfileLoadErrorScreen message={profileError || 'Your Supabase session is active, but KULI could not load the matching profile.'} onRetry={retryProfileLoad} onSignOut={handleSignOut} />;
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

/**
 * Root Entrypoint of the KULI Mobile Client App.
 * Wraps the app in global context providers:
 * - SafeAreaProvider: Cross-platform iOS/Android safe area layout bounds.
 * - QueryClientProvider: React Query context for data-fetching, caching, and cache invalidation.
 */
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
  Activity: { name: 'receipt-outline', label: 'Activity' },
  Notifications: { name: 'notifications-outline', label: 'Notifications' }
};

const ownerTabIcons: TabIconConfig = {
  Home: { name: 'home-outline', label: 'Home' },
  Vehicles: { name: 'truck-outline', label: 'Vehicles', iconSet: 'material' },
  Offers: { name: 'clipboard-list-outline', label: 'Offers', iconSet: 'material' },
  Notifications: { name: 'notifications-outline', label: 'Notifications' },
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

const tabBadgeOptions = (count: number) =>
  count > 0
    ? {
        tabBarBadge: count > 99 ? '99+' : count,
        tabBarBadgeStyle: styles.tabBarBadge
      }
    : undefined;

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
  tabBarBadge: {
    backgroundColor: colors.error,
    borderColor: colors.card,
    borderWidth: 2,
    color: colors.card,
    fontSize: 11,
    fontWeight: '900',
    minWidth: 20
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
  splashScreen: {
    backgroundColor: colors.black,
    flex: 1,
    overflow: 'hidden'
  },
  splashGrain: {
    backgroundColor: '#0A0A0A',
    bottom: 0,
    left: 0,
    opacity: 0.65,
    position: 'absolute',
    right: 0,
    top: 0
  },
  splashContent: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xl,
    justifyContent: 'center',
    padding: spacing.xl
  },
  splashLogoBox: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    justifyContent: 'center',
    minHeight: 118,
    minWidth: 214,
    shadowColor: colors.card,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 46
  },
  splashLogoText: {
    color: colors.black,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 0
  },
  splashDots: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  splashDot: {
    backgroundColor: colors.card,
    borderRadius: 4,
    height: 7,
    opacity: 0.75,
    width: 7
  },
  splashDotMuted: {
    opacity: 0.25
  },
  splashFooter: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    paddingBottom: spacing.xxl
  },
  splashTitle: {
    color: colors.card,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
    textAlign: 'center'
  },
  splashCopy: {
    color: '#AEB4B8',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center'
  },
  requestFlowContent: {
    backgroundColor: colors.background,
    gap: 0,
    paddingBottom: 128
  },
  requestMapStage: {
    backgroundColor: colors.black,
    minHeight: 430,
    position: 'relative'
  },
  requestHeroMap: {
    borderRadius: 0,
    borderWidth: 0,
    height: 430
  },
  requestFloatingHeader: {
    left: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
    top: spacing.lg
  },
  requestFlowSheet: {
    marginTop: -spacing.xl,
    paddingBottom: spacing.xl
  },
  requestStepRail: {
    backgroundColor: colors.subtle,
    borderRadius: radii.xl,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs
  },
  requestStepItem: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs
  },
  requestStepDot: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 34
  },
  requestStepDotActive: {
    backgroundColor: colors.black
  },
  requestStepDotComplete: {
    backgroundColor: colors.success
  },
  requestStepDotText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '900'
  },
  requestStepDotTextActive: {
    color: colors.card
  },
  requestStepLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800'
  },
  requestStepLabelActive: {
    color: colors.textPrimary
  },
  requestSuggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  requestSuggestionChip: {
    backgroundColor: colors.subtle,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.md
  },
  requestSuggestionChipActive: {
    backgroundColor: colors.black,
    borderColor: colors.black
  },
  requestSuggestionText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '900'
  },
  requestSuggestionTextActive: {
    color: colors.card
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
  requestTruckIcon: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderRadius: radii.lg,
    height: 56,
    justifyContent: 'center',
    width: 56
  },
  requestTruckIconSelected: {
    backgroundColor: colors.darkSurface
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
  requestLoadIcon: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  requestLoadIconSelected: {
    backgroundColor: colors.darkSurface
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
  requestCheckoutHero: {
    backgroundColor: colors.black,
    borderRadius: radii.xl,
    gap: spacing.xs,
    padding: spacing.xl
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
  requestMetricGrid: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  vehicleImageFrame: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 56
  },
  vehicleImageFrameLarge: {
    height: 72,
    width: 72
  },
  vehicleImageFrameSelected: {
    backgroundColor: colors.darkSurface,
    borderColor: colors.darkSurface
  },
  vehicleImageFrameOnline: {
    borderColor: colors.success
  },
  vehicleImage: {
    height: '100%',
    width: '100%'
  },
  vehicleDefaultArt: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center'
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
  clientHomeHeroStack: {
    gap: spacing.lg
  },
  clientTopBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg
  },
  clientGreeting: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36
  },
  clientGreetingName: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -0.5
  },
  clientLocationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs
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
    borderRadius: radii.xl,
    gap: spacing.xl,
    minHeight: 226,
    overflow: 'hidden',
    padding: spacing.xl,
    position: 'relative'
  },
  clientHeroTruckMark: {
    bottom: -22,
    opacity: 0.16,
    position: 'absolute',
    right: -10,
    transform: [{ rotate: '-8deg' }]
  },
  clientCtaTitle: {
    color: colors.card,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
    maxWidth: 260
  },
  clientCtaCopy: {
    color: '#D1D5DB',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 260
  },
  clientCtaButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.sm,
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
  clientSectionHead: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between'
  },
  clientSectionTitle: {
    color: colors.textPrimary,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 28
  },
  clientSectionSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2
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
    gap: spacing.md,
    minHeight: 150,
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
  clientActiveCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg
  },
  clientActiveCardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between'
  },
  clientActiveEyebrow: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase'
  },
  clientActiveCode: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28
  },
  clientRouteCard: {
    backgroundColor: colors.subtle,
    borderRadius: radii.lg,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg
  },
  clientRouteRail: {
    alignItems: 'center',
    paddingVertical: 2,
    width: 18
  },
  clientRouteDotStart: {
    backgroundColor: colors.success,
    borderRadius: 5,
    height: 10,
    width: 10
  },
  clientRouteLine: {
    backgroundColor: colors.border,
    flex: 1,
    minHeight: 26,
    width: 2
  },
  clientRouteDotEnd: {
    backgroundColor: colors.black,
    borderRadius: 5,
    height: 10,
    width: 10
  },
  clientRouteLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21
  },
  clientRouteTo: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    textTransform: 'uppercase'
  },
  clientActiveMetaRow: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  clientActiveMetaItem: {
    backgroundColor: colors.black,
    borderRadius: radii.md,
    flex: 1,
    gap: 2,
    minHeight: 72,
    justifyContent: 'center',
    padding: spacing.md
  },
  clientActiveMetaValue: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '900'
  },
  clientActiveMetaLabel: {
    color: '#D1D5DB',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  clientActiveSchedule: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm
  },
  clientEmptyMove: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xl
  },
  clientEmptyIllustration: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderRadius: 54,
    height: 108,
    justifyContent: 'center',
    position: 'relative',
    width: 108
  },
  clientEmptyTruckBadge: {
    alignItems: 'center',
    backgroundColor: colors.black,
    borderColor: colors.card,
    borderRadius: 22,
    borderWidth: 3,
    bottom: 0,
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: -4,
    width: 44
  },
  clientEmptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center'
  },
  clientEmptyCopy: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
    textAlign: 'center'
  },
  clientRecentEmpty: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg
  },
  clientRecentEmptyTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20
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
  recentTripList: {
    gap: spacing.md
  },
  recentTripCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg
  },
  recentTripIcon: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  recentTripBody: {
    flex: 1,
    gap: spacing.sm
  },
  recentTripTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 21
  },
  recentTripMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2
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
  recentTripCode: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  authHero: {
    backgroundColor: colors.black,
    borderRadius: radii.xl,
    gap: spacing.xl,
    minHeight: 292,
    justifyContent: 'space-between',
    padding: spacing.xl
  },
  authHeroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  authCityLabel: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase'
  },
  authHeroCenter: {
    gap: spacing.md
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
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 39
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
  verificationIcon: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderRadius: 22,
    height: 56,
    justifyContent: 'center',
    width: 56
  },
  verificationEmailBox: {
    backgroundColor: colors.subtle,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
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
  validationCard: {
    backgroundColor: colors.subtle,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  validationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm
  },
  validationText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 13,
    fontWeight: '700'
  },
  validationTextMet: {
    color: colors.success
  },
  validationHint: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: -spacing.sm,
    paddingHorizontal: spacing.xs
  },
  validationHintSuccess: {
    borderColor: colors.success
  },
  validationHintError: {
    borderColor: colors.error
  },
  validationHintText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18
  },
  validationHintTextSuccess: {
    color: colors.success
  },
  validationHintTextError: {
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
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 104,
    padding: spacing.lg
  },
  roleOptionSelected: {
    backgroundColor: colors.black,
    borderColor: colors.black
  },
  roleOptionIcon: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    height: 52,
    justifyContent: 'center',
    width: 52
  },
  roleOptionIconSelected: {
    backgroundColor: colors.card
  },
  roleOptionBody: {
    flex: 1,
    gap: spacing.xs
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
  ownerHomeContent: {
    gap: spacing.lg,
    paddingBottom: 128
  },
  ownerHomeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md
  },
  ownerAvatar: {
    alignItems: 'center',
    backgroundColor: colors.black,
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    width: 52
  },
  ownerAvatarText: {
    color: colors.card,
    fontSize: 20,
    fontWeight: '900'
  },
  ownerHeaderKicker: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '900'
  },
  ownerHeaderTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34
  },
  ownerHeaderNameAccent: {
    color: colors.primary,
    fontSize: 30,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -0.5
  },
  ownerHeaderCopy: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs
  },
  ownerReadinessCard: {
    backgroundColor: colors.black,
    borderColor: colors.black,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg
  },
  ownerReadinessSuccess: {
    backgroundColor: colors.card,
    borderColor: colors.success
  },
  ownerReadinessWarning: {
    backgroundColor: colors.card,
    borderColor: colors.warning
  },
  ownerReadinessError: {
    backgroundColor: colors.card,
    borderColor: colors.error
  },
  ownerReadinessTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md
  },
  ownerReadinessIcon: {
    alignItems: 'center',
    backgroundColor: colors.nearBlack,
    borderRadius: radii.lg,
    height: 58,
    justifyContent: 'center',
    width: 58
  },
  ownerReadinessIconSuccess: {
    backgroundColor: colors.successTint
  },
  ownerReadinessIconWarning: {
    backgroundColor: colors.warningTint
  },
  ownerReadinessIconError: {
    backgroundColor: colors.errorTint
  },
  ownerReadinessTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28
  },
  ownerReadinessCopy: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.xs
  },
  ownerTextOnDark: {
    color: colors.card
  },
  ownerMutedOnDark: {
    color: '#D1D5DB'
  },
  ownerActiveVehicleStrip: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderRadius: radii.lg,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md
  },
  ownerActiveVehicleStripDark: {
    backgroundColor: colors.darkSurface
  },
  ownerVehicleStripTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900'
  },
  ownerVehicleStripCopy: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18
  },
  ownerDarkPrimaryButton: {
    backgroundColor: colors.card
  },
  ownerSuccessOnDark: {
    color: '#BBF7D0',
    fontSize: 14,
    fontWeight: '800'
  },
  ownerMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  ownerMetricCard: {
    flexBasis: '48%',
    flexGrow: 1
  },
  ownerSectionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between'
  },
  ownerSectionTitle: {
    color: colors.textPrimary,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 27
  },
  ownerSectionCopy: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs
  },
  ownerSmallButton: {
    minHeight: 42,
    paddingHorizontal: spacing.md
  },
  ownerJobCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  ownerJobTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between'
  },
  ownerJobCode: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900'
  },
  ownerJobRoute: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs
  },
  ownerJobNext: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20
  },
  ownerEmptyCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl
  },
  ownerEmptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center'
  },
  ownerEmptyCopy: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center'
  },
  ownerAccountCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.lg
  },
  ownerAccountTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900'
  },
  ownerAccountCopy: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginTop: spacing.xs
  },
  ownerAccountMuted: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2
  },
  ownerVehiclesContent: {
    gap: spacing.lg,
    paddingBottom: 128
  },
  ownerVehiclesHero: {
    alignItems: 'center',
    backgroundColor: colors.black,
    borderRadius: radii.xl,
    flexDirection: 'row',
    gap: spacing.lg,
    padding: spacing.xl
  },
  ownerVehiclesTitle: {
    color: colors.card,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 39
  },
  ownerVehiclesCopy: {
    color: '#E5E7EB',
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm
  },
  ownerVehiclesHeroIcon: {
    alignItems: 'center',
    backgroundColor: colors.darkSurface,
    borderRadius: radii.lg,
    height: 62,
    justifyContent: 'center',
    width: 62
  },
  ownerVehiclePanel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg
  },
  ownerClassGrid: {
    gap: spacing.md
  },
  ownerClassCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.subtle,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md
  },
  ownerClassCardSelected: {
    backgroundColor: colors.black,
    borderColor: colors.black
  },
  ownerClassIcon: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    height: 48,
    justifyContent: 'center',
    width: 48
  },
  ownerClassIconSelected: {
    backgroundColor: colors.darkSurface
  },
  ownerClassTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900'
  },
  ownerClassCopy: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2
  },
  ownerClassMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  ownerClassMeta: {
    color: colors.black,
    fontSize: 12,
    fontWeight: '900'
  },
  ownerFormCard: {
    backgroundColor: colors.subtle,
    borderRadius: radii.lg,
    gap: spacing.md,
    padding: spacing.md
  },
  ownerFormTwoColumn: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  vehiclePhotoPickerCard: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md
  },
  ownerVehicleList: {
    gap: spacing.md
  },
  ownerVehicleCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  ownerVehicleCardSelected: {
    borderColor: colors.black,
    borderWidth: 2
  },
  ownerVehicleTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md
  },
  ownerVehicleIcon: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    height: 52,
    justifyContent: 'center',
    width: 52
  },
  ownerVehicleIconOnline: {
    backgroundColor: colors.successTint
  },
  ownerVehicleTitle: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '900'
  },
  ownerVehicleType: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 2
  },
  ownerVehicleMetricRow: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  ownerVehicleMetric: {
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    flex: 1,
    minHeight: 66,
    justifyContent: 'center',
    padding: spacing.sm
  },
  ownerVehicleMetricValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900'
  },
  ownerVehicleMetricLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2
  },
  ownerVehicleDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  ownerVehicleBlockReason: {
    alignItems: 'flex-start',
    backgroundColor: colors.warningTint,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md
  },
  ownerVehicleBlockText: {
    color: colors.warning,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18
  },
  ownerVehicleBlockTextError: {
    color: colors.error
  },
  ownerVehicleActions: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  ownerVehicleActionButton: {
    flex: 1
  },
  ownerVerificationCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg
  },
  ownerVerificationHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between'
  },
  ownerDocumentList: {
    gap: spacing.md
  },
  ownerDocumentCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  ownerDocumentCardUploaded: {
    borderColor: colors.warning
  },
  ownerDocumentCardReady: {
    borderColor: colors.success
  },
  ownerDocumentCardRejected: {
    borderColor: colors.error
  },
  ownerDocumentTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md
  },
  ownerDocumentIcon: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    height: 48,
    justifyContent: 'center',
    width: 48
  },
  ownerDocumentIconApproved: {
    backgroundColor: colors.successTint
  },
  ownerDocumentIconRejected: {
    backgroundColor: colors.errorTint
  },
  ownerDocumentTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900'
  },
  ownerDocumentCopy: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2
  },
  ownerDocumentTips: {
    gap: spacing.xs
  },
  ownerDocumentTip: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs
  },
  ownerDocumentTipText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 12,
    lineHeight: 17
  },
  ownerDocumentRejectedSummary: {
    backgroundColor: colors.errorTint,
    borderColor: colors.error
  },
  ownerOffersContent: {
    gap: spacing.lg,
    paddingBottom: 128
  },
  ownerOffersHero: {
    alignItems: 'flex-start',
    backgroundColor: colors.black,
    borderRadius: radii.xl,
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'space-between',
    padding: spacing.xl
  },
  ownerOffersEyebrow: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '900'
  },
  ownerOffersTitle: {
    color: colors.card,
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 40
  },
  ownerOffersSubtitle: {
    color: '#E5E7EB',
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm
  },
  ownerOfferStrategy: {
    alignItems: 'center',
    backgroundColor: colors.black,
    borderRadius: radii.lg,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg
  },
  ownerOfferStrategyTitle: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '900'
  },
  ownerOfferStrategyCopy: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2
  },
  ownerOfferReadiness: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg
  },
  ownerOfferReadinessIcon: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    height: 48,
    justifyContent: 'center',
    width: 48
  },
  ownerOfferReadinessTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900'
  },
  ownerOfferReadinessCopy: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2
  },
  ownerOfferList: {
    gap: spacing.md
  },
  ownerOfferSkeleton: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    minHeight: 180,
    padding: spacing.lg
  },
  ownerOfferCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    overflow: 'hidden',
    padding: spacing.lg,
    paddingTop: spacing.xl
  },
  ownerOfferTimerBar: {
    backgroundColor: colors.subtle,
    height: 6,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0
  },
  ownerOfferTimerFill: {
    backgroundColor: colors.warning,
    height: '100%',
    width: '72%'
  },
  ownerOfferHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between'
  },
  ownerOfferHeaderBadges: {
    alignItems: 'flex-end',
    gap: spacing.xs
  },
  ownerOfferEyebrow: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '900'
  },
  ownerOfferPrice: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 36
  },
  ownerOfferExpiry: {
    alignItems: 'center',
    backgroundColor: colors.warningTint,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 38,
    paddingHorizontal: spacing.md
  },
  ownerOfferExpiryText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '900'
  },
  ownerOfferRouteBox: {
    alignItems: 'stretch',
    backgroundColor: colors.subtle,
    borderRadius: radii.lg,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md
  },
  ownerOfferRouteRail: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    width: 18
  },
  ownerOfferRouteDotStart: {
    backgroundColor: colors.black,
    borderRadius: 6,
    height: 12,
    width: 12
  },
  ownerOfferRouteLine: {
    backgroundColor: colors.border,
    flex: 1,
    marginVertical: spacing.xs,
    width: 2
  },
  ownerOfferRouteDotEnd: {
    backgroundColor: colors.success,
    borderRadius: 6,
    height: 12,
    width: 12
  },
  ownerOfferRouteLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '900'
  },
  ownerOfferRouteValue: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: spacing.sm
  },
  ownerOfferDistanceBox: {
    alignItems: 'flex-end',
    justifyContent: 'center'
  },
  ownerOfferDistanceValue: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900'
  },
  ownerOfferDistanceLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '900'
  },
  ownerOfferInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  ownerOfferInfoCard: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: '48%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: spacing.sm,
    minHeight: 66,
    padding: spacing.sm
  },
  ownerOfferInfoLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '900'
  },
  ownerOfferInfoValue: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    marginTop: 2
  },
  ownerOfferDetailPanel: {
    backgroundColor: colors.subtle,
    borderRadius: radii.lg,
    gap: spacing.md,
    padding: spacing.md
  },
  ownerOfferDetailGrid: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  ownerOfferDetailItem: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  ownerOfferActions: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  ownerOfferPrimaryAction: {
    flex: 1.4
  },
  ownerOfferSecondaryAction: {
    flex: 1
  },
  ownerActiveJobsSection: {
    gap: spacing.md
  },
  ownerActiveJobList: {
    gap: spacing.lg
  },
  ownerActiveJobCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  ownerActiveJobSheet: {
    marginTop: -spacing.lg
  },
  ownerJobHandle: {
    alignSelf: 'center',
    backgroundColor: colors.border,
    borderRadius: 2,
    height: 4,
    width: 44
  },
  ownerActiveJobEyebrow: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '900'
  },
  ownerJobContactCard: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md
  },
  ownerJobContactIcon: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    height: 46,
    justifyContent: 'center',
    width: 46
  },
  ownerJobContactTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900'
  },
  ownerJobContactCopy: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2
  },
  ownerControlPanel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  ownerControlHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md
  },
  ownerControlIcon: {
    alignItems: 'center',
    backgroundColor: colors.black,
    borderRadius: radii.md,
    height: 48,
    justifyContent: 'center',
    width: 48
  },
  ownerControlTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900'
  },
  ownerControlCopy: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2
  },
  activityContent: {
    gap: spacing.lg,
    paddingBottom: 128
  },
  activityHero: {
    backgroundColor: colors.black,
    borderRadius: radii.xl,
    gap: spacing.md,
    padding: spacing.xl
  },
  activityEyebrow: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '900'
  },
  activityTitle: {
    color: colors.card,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 39
  },
  activitySubtitle: {
    color: '#E5E7EB',
    fontSize: 15,
    lineHeight: 22
  },
  activityFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  activityFilterChip: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: spacing.lg
  },
  activityFilterChipActive: {
    backgroundColor: colors.black,
    borderColor: colors.black
  },
  activityFilterText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '900'
  },
  activityFilterTextActive: {
    color: colors.card
  },
  activityTripList: {
    gap: spacing.md
  },
  activityTripCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  activityTripHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between'
  },
  activityTripCode: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900'
  },
  activityTripDate: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2
  },
  activityRouteRow: {
    alignItems: 'stretch',
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md
  },
  activityRouteRail: {
    alignItems: 'center',
    paddingVertical: 3,
    width: 16
  },
  activityRouteDotStart: {
    backgroundColor: colors.black,
    borderRadius: 6,
    height: 12,
    width: 12
  },
  activityRouteLine: {
    backgroundColor: colors.border,
    flex: 1,
    marginVertical: spacing.xs,
    width: 2
  },
  activityRouteDotEnd: {
    backgroundColor: colors.success,
    borderRadius: 6,
    height: 12,
    width: 12
  },
  activityRouteText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
    marginBottom: spacing.sm
  },
  activityTripFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between'
  },
  activityTripAmount: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900'
  },
  activityTripMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800'
  },
  activityDetailPanel: {
    backgroundColor: colors.subtle,
    borderRadius: radii.lg,
    gap: spacing.md,
    padding: spacing.md
  },
  activityDetailGrid: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  trustPanel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  trustHero: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md
  },
  trustHeroIcon: {
    alignItems: 'center',
    backgroundColor: colors.black,
    borderRadius: radii.md,
    height: 52,
    justifyContent: 'center',
    width: 52
  },
  trustHeroTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26
  },
  trustHeroCopy: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2
  },
  trustModeTabs: {
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs
  },
  trustModeTab: {
    alignItems: 'center',
    borderRadius: radii.sm,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44
  },
  trustModeTabActive: {
    backgroundColor: colors.black
  },
  trustModeTabText: {
    color: colors.black,
    fontSize: 13,
    fontWeight: '900'
  },
  trustModeTabTextActive: {
    color: colors.card
  },
  ratingOwnerCard: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md
  },
  ratingOwnerAvatar: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    height: 48,
    justifyContent: 'center',
    width: 48
  },
  ratingOwnerTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900'
  },
  ratingOwnerCopy: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2
  },
  trustStars: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  trustStarButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    minWidth: 52
  },
  trustRatingSummary: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center'
  },
  trustTagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  trustTag: {
    backgroundColor: colors.subtle,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.md
  },
  trustTagSelected: {
    backgroundColor: colors.black,
    borderColor: colors.black
  },
  trustTagText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '900'
  },
  trustTagTextSelected: {
    color: colors.card
  },
  trustSectionCopy: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  issueTileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  issueTile: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 104,
    padding: spacing.md
  },
  issueTileSelected: {
    backgroundColor: colors.black,
    borderColor: colors.black
  },
  issueTileText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center'
  },
  issueTileTextSelected: {
    color: colors.card
  },
  evidenceCard: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md
  },
  evidenceTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900'
  },
  evidenceCopy: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2
  },
  paymentDisputeCard: {
    backgroundColor: colors.warningTint,
    borderColor: colors.warning,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  trustSuccessText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20
  },
  earningsContent: {
    gap: spacing.lg,
    paddingBottom: 128
  },
  earningsHero: {
    backgroundColor: colors.black,
    borderRadius: radii.xl,
    gap: spacing.sm,
    padding: spacing.xl
  },
  earningsHeroLabel: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '900'
  },
  earningsHeroAmount: {
    color: colors.card,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40
  },
  earningsHeroCopy: {
    color: '#E5E7EB',
    fontSize: 14,
    lineHeight: 20
  },
  earningsSection: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  earningsRatingBadge: {
    alignItems: 'center',
    backgroundColor: colors.warningTint,
    borderRadius: radii.xl,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md
  },
  earningsRatingText: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '900'
  },
  earningsReviewList: {
    gap: spacing.sm
  },
  earningsReviewCard: {
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    gap: spacing.sm,
    padding: spacing.md
  },
  earningsReviewText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20
  },
  ownerPaymentList: {
    gap: spacing.md
  },
  ownerPaymentCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  ownerPaymentHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between'
  },
  ownerPaymentEyebrow: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '900'
  },
  ownerPaymentAmount: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34
  },
  ownerPaymentRoute: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19
  },
  ownerPaymentMethodRow: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md
  },
  ownerPaymentMethodIcon: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    height: 46,
    justifyContent: 'center',
    width: 46
  },
  ownerPaymentMethodTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900'
  },
  ownerPaymentMethodCopy: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2
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
  // File picker single-button + action sheet styles
  filePickerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm
  },
  filePickerAttachBtn: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  filePickerAttachText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700'
  },
  filePickerRemoveBtn: {
    alignItems: 'center',
    backgroundColor: colors.errorTint,
    borderColor: colors.error,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48
  },
  sheetBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    flex: 1,
    justifyContent: 'flex-end'
  },
  sheetPanel: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    gap: spacing.xs,
    paddingBottom: 40,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: colors.border,
    borderRadius: 3,
    height: 4,
    marginBottom: spacing.md,
    width: 40
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: spacing.sm
  },
  sheetOption: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.md,
    marginVertical: spacing.xs,
    minHeight: 56,
    paddingHorizontal: spacing.lg
  },
  sheetOptionText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700'
  },
  sheetCancel: {
    backgroundColor: colors.errorTint,
    justifyContent: 'center',
    marginTop: spacing.sm
  },
  sheetCancelText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center'
  },
  // Rating modal header with X button
  ratingModalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg
  },
  ratingModalClose: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderRadius: radii.sm,
    height: 36,
    justifyContent: 'center',
    width: 36
  },
  // Document card title row with required/optional pill
  docTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs
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
  inputShell: {
    position: 'relative'
  },
  inputWithIcon: {
    paddingRight: 56
  },
  inputEyeButton: {
    alignItems: 'center',
    borderRadius: radii.md,
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: 6,
    top: 4,
    width: 44
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
  mapActiveModeRow: {
    flexDirection: 'row',
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: radii.sm,
    padding: 3,
    gap: spacing.xs,
    zIndex: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  mapModeButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm
  },
  mapModeButtonActive: {
    backgroundColor: colors.primary
  },
  mapModeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text
  },
  mapModeTextActive: {
    color: colors.white
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
    flexDirection: 'row',
    gap: 4,
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
  notificationsContent: {
    gap: spacing.lg,
    paddingBottom: 128
  },
  notificationsHeader: {
    backgroundColor: colors.black,
    borderRadius: radii.xl,
    gap: spacing.md,
    padding: spacing.xl
  },
  notificationsHeaderTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between'
  },
  notificationsEyebrow: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: spacing.xs
  },
  notificationsTitle: {
    color: colors.card,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 39
  },
  notificationsSubtitle: {
    color: '#E5E7EB',
    fontSize: 15,
    lineHeight: 22
  },
  notificationPreferencesCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  notificationSectionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between'
  },
  notificationSectionTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26
  },
  notificationSectionCopy: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs
  },
  notificationInAppPill: {
    alignItems: 'center',
    backgroundColor: colors.successTint,
    borderRadius: radii.xl,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 34,
    paddingHorizontal: spacing.md
  },
  notificationInAppPillText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '900'
  },
  notificationPreferenceRow: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  notificationPreferenceRowActive: {
    backgroundColor: colors.card,
    borderColor: colors.black
  },
  notificationPreferenceRowDisabled: {
    opacity: 0.55
  },
  notificationPreferenceTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900'
  },
  notificationPreferenceDetail: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2
  },
  notificationToggleTrack: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 3,
    width: 54
  },
  notificationToggleTrackActive: {
    backgroundColor: colors.black
  },
  notificationToggleTrackDisabled: {
    backgroundColor: colors.muted
  },
  notificationToggleKnob: {
    backgroundColor: colors.card,
    borderRadius: 13,
    height: 26,
    width: 26
  },
  notificationToggleKnobActive: {
    alignSelf: 'flex-end'
  },
  notificationSuccessText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '800'
  },
  notificationFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  notificationFilterChip: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg
  },
  notificationFilterChipActive: {
    backgroundColor: colors.black,
    borderColor: colors.black
  },
  notificationFilterText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '900'
  },
  notificationFilterTextActive: {
    color: colors.card
  },
  notificationListHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between'
  },
  notificationRefreshButton: {
    minHeight: 42,
    paddingHorizontal: spacing.md
  },
  notificationList: {
    gap: spacing.md
  },
  notificationCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    overflow: 'hidden',
    padding: spacing.md,
    paddingLeft: spacing.lg
  },
  notificationCardUnread: {
    borderColor: colors.warning
  },
  notificationAccent: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 5
  },
  notificationIconWrap: {
    alignItems: 'center',
    borderRadius: radii.md,
    height: 48,
    justifyContent: 'center',
    width: 48
  },
  notificationCardBody: {
    flex: 1,
    gap: spacing.xs
  },
  notificationCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between'
  },
  notificationCardLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '900'
  },
  notificationMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs
  },
  notificationTime: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800'
  },
  notificationUnreadDot: {
    backgroundColor: colors.warning,
    borderRadius: 5,
    height: 10,
    width: 10
  },
  notificationTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23
  },
  notificationBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  notificationHint: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18
  },
  notificationActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  notificationPrimaryAction: {
    alignItems: 'center',
    backgroundColor: colors.black,
    borderRadius: radii.md,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg
  },
  notificationPrimaryActionText: {
    color: colors.card,
    fontSize: 14,
    fontWeight: '900'
  },
  notificationSecondaryAction: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg
  },
  notificationSecondaryActionDisabled: {
    backgroundColor: colors.subtle
  },
  notificationSecondaryActionText: {
    color: colors.black,
    fontSize: 14,
    fontWeight: '900'
  },
  notificationSecondaryActionTextDisabled: {
    color: colors.textSecondary
  },
  notificationSkeletonCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 104,
    padding: spacing.md
  },
  notificationSkeletonIcon: {
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    height: 48,
    width: 48
  },
  notificationSkeletonLineWide: {
    backgroundColor: colors.subtle,
    borderRadius: 999,
    height: 16,
    width: '75%'
  },
  notificationSkeletonLine: {
    backgroundColor: colors.subtle,
    borderRadius: 999,
    height: 12,
    marginTop: spacing.sm,
    width: '95%'
  },
  notificationSkeletonLineShort: {
    backgroundColor: colors.subtle,
    borderRadius: 999,
    height: 12,
    marginTop: spacing.sm,
    width: '45%'
  },
  notificationEmptyCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl
  },
  notificationEmptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.subtle,
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    width: 64
  },
  notificationEmptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center'
  },
  notificationEmptyCopy: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center'
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
