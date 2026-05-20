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
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';

import { kuliApi } from './lib/api';
import { supabase } from './lib/supabase';
import { runtimeConfig, runtimeReadiness } from './config/runtime';
import { colors, radii, spacing } from './theme';

type Role = 'client' | 'truck_owner' | 'assistant' | 'admin';
type AccountStatus = 'active' | 'pending_verification' | 'suspended' | 'banned' | 'deleted';
type AuthMode = 'login' | 'register';
type PublicRole = Extract<Role, 'client' | 'truck_owner'>;

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
  description?: string;
  capacityKg?: number;
  capacityCubicMeters?: number;
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

type TabRoute = {
  key: string;
  label: string;
  route: string;
  detail: string;
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

const clientTabs: TabRoute[] = [
  { key: 'client-home', label: 'Home', route: '/client/home', detail: 'Active request card before new booking.' },
  { key: 'client-request', label: 'Request', route: '/client/request/new', detail: 'Quote, location, load, and candidate flow.' },
  { key: 'client-history', label: 'History', route: '/client/history', detail: 'Completed trips, ratings, reports, and receipts.' },
  { key: 'client-notifications', label: 'Alerts', route: '/client/notifications', detail: 'In-app updates and read states.' }
];

const ownerTabs: TabRoute[] = [
  { key: 'owner-home', label: 'Home', route: '/owner/home', detail: 'Vehicle status and availability prompt.' },
  { key: 'owner-vehicles', label: 'Vehicles', route: '/owner/vehicles', detail: 'Registration, documents, and verification status.' },
  { key: 'owner-offers', label: 'Offers', route: '/owner/offers', detail: 'First-accept-wins offer inbox.' },
  { key: 'owner-earnings', label: 'Earnings', route: '/owner/earnings', detail: 'Cash confirmation and rating summary.' }
];

const isBlockedStatus = (status: AccountStatus) => ['suspended', 'banned', 'deleted'].includes(status);

const documentTypes: Array<{ type: VehicleDocumentType; label: string; detail: string }> = [
  { type: 'identity', label: 'Identity', detail: 'Owner identification document.' },
  { type: 'driver_license', label: 'Driver license', detail: 'Valid license for the driver/owner.' },
  { type: 'vehicle_registration', label: 'Registration certificate', detail: 'Vehicle registration document.' },
  { type: 'ownership_proof', label: 'Ownership proof', detail: 'Proof that the owner can operate this truck.' },
  { type: 'insurance', label: 'Insurance', detail: 'Insurance where available.' }
];

const statusTone = (status: string): 'ready' | 'warn' | 'blocked' => {
  if (['approved', 'completed', 'online_available', 'active'].includes(status)) {
    return 'ready';
  }

  if (['rejected', 'suspended', 'cancelled', 'banned', 'deleted'].includes(status)) {
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
  keyboardType = 'default'
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  return (
    <View style={styles.field}>
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
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const canSubmit = email.trim() && password.length >= 6 && (mode === 'login' || fullName.trim());

  const loadProfile = async (session: Session) => {
    const profile = (await kuliApi.me()) as ApiEnvelope<UserProfile>;
    onAuthenticated(profile.data, session);
  };

  const submit = async () => {
    if (!canSubmit || pending) {
      return;
    }

    setPending(true);
    setError('');
    setNotice('');

    try {
      if (mode === 'login') {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
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
        email: email.trim().toLowerCase(),
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
        setNotice('Account created. Confirm your email, then sign in to complete your KULI profile.');
        setMode('login');
        return;
      }

      const result = (await kuliApi.syncProfile({
        role,
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim().toLowerCase()
      })) as ApiEnvelope<ProfileSyncResult>;

      onAuthenticated(result.data.user, data.session);
    } catch (submitError) {
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

      await kuliApi.request(`/vehicles/${vehicleId}/documents`, {
        method: 'POST',
        body: {
          type,
          fileId: intent.data.file.id
        }
      });

      setMessage('Document metadata attached. Local-dev upload URL was reserved by the backend.');
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
              <Pressable accessibilityRole="button" key={vehicle.id} onPress={() => setActiveVehicleId(vehicle.id)}>
                <VehicleCard vehicle={vehicle} onToggleAvailability={toggleAvailability} />
              </Pressable>
            ))}
          </View>
        </ShellCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function FoundationScreen({ title, route, detail }: { title: string; route: string; detail: string }) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>{route}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.copy}>{detail}</Text>
        <ShellCard title="Phase route contract">
          <Text style={styles.muted}>This route is guarded by the authenticated backend role and ready for its feature body.</Text>
        </ShellCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function ClientTabs({ profile, onSignOut }: { profile: UserProfile; onSignOut: () => void }) {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home">{() => <HomeOverview profile={profile} onSignOut={onSignOut} />}</Tab.Screen>
      {clientTabs.slice(1).map((tab) => (
        <Tab.Screen key={tab.key} name={tab.label}>
          {() => <FoundationScreen title={`Client ${tab.label}`} route={tab.route} detail={tab.detail} />}
        </Tab.Screen>
      ))}
    </Tab.Navigator>
  );
}

function OwnerTabs({ profile, onSignOut }: { profile: UserProfile; onSignOut: () => void }) {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home">{() => <HomeOverview profile={profile} onSignOut={onSignOut} />}</Tab.Screen>
      <Tab.Screen name="Vehicles" component={OwnerVehiclesScreen} />
      {ownerTabs.slice(2).map((tab) => (
        <Tab.Screen key={tab.key} name={tab.label}>
          {() => <FoundationScreen title={`Owner ${tab.label}`} route={tab.route} detail={tab.detail} />}
        </Tab.Screen>
      ))}
    </Tab.Navigator>
  );
}

function RuntimeReadiness() {
  const readinessItems = useMemo(
    () => [
      { label: 'API base URL', ready: runtimeReadiness.hasApiBaseUrl },
      { label: 'Supabase URL', ready: runtimeReadiness.hasSupabaseUrl },
      { label: 'Supabase anon key', ready: runtimeReadiness.hasSupabaseAnonKey }
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
