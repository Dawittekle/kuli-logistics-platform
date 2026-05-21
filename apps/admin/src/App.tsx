import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Gauge,
  LockKeyhole,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Truck,
  UsersRound
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { runtimeConfig, runtimeReadiness } from './config/runtime';
import { kuliApi } from './lib/api';
import { supabase } from './lib/supabase';

type Role = 'client' | 'truck_owner' | 'assistant' | 'admin';
type AccountStatus = 'active' | 'pending_verification' | 'suspended' | 'banned' | 'deleted';

type UserProfile = {
  id: string;
  role: Role;
  accountStatus: AccountStatus;
  fullName?: string;
  email?: string;
  phone?: string;
  createdAt?: string;
};

type VehicleDocument = {
  id: string;
  type: string;
  fileId: string;
  status: string;
};

type Vehicle = {
  id: string;
  ownerId: string;
  licensePlate: string;
  vehicleClassSnapshot?: {
    name: string;
    slug: string;
  };
  capacityKg?: number;
  capacityCubicMeters?: number;
  description?: string;
  verificationStatus: 'draft' | 'pending' | 'approved' | 'rejected';
  availabilityStatus: string;
  rejectionReason?: string;
  documents?: VehicleDocument[];
};

type VehicleClass = {
  id: string;
  name: string;
  slug?: string;
  defaultPricing?: {
    baseFare?: number;
    perKmRate?: number;
    minimumFare?: number;
    includedMinutes?: number;
    perExtraMinuteRate?: number;
  };
};

type PricingRule = {
  id: string;
  version: number;
  status: 'draft' | 'active' | 'retired';
  currency: string;
  vehicleClassRules: Array<{
    vehicleClassId: string;
    baseFare: number;
    perKmRate: number;
    minimumFare: number;
    includedMinutes?: number;
    perExtraMinuteRate?: number;
  }>;
  loadAdjustments: Array<{
    itemType: string;
    flatFee?: number;
    multiplier?: number;
  }>;
  fuelSurchargePercent: number;
  effectiveFrom: string;
  effectiveTo?: string;
};

type PricingDraft = Record<string, {
  baseFare: string;
  perKmRate: string;
  minimumFare: string;
  includedMinutes: string;
  perExtraMinuteRate: string;
}>;

type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'pending_client' | 'closed' | 'cancelled';
type TicketSource = 'incoming_call' | 'missed_call' | 'manual';

type HotlineTicket = {
  id: string;
  ticketCode: string;
  status: TicketStatus;
  callerPhone?: string;
  clientId?: string;
  source: TicketSource;
  callSummary?: string;
  followUpAt?: string;
  assignedAssistantId?: string;
  requestId?: string;
  cancellationReason?: string;
  createdAt?: string;
};

type GeoLocationInput = {
  addressText: string;
  source: 'assistant_entry';
  point: {
    type: 'Point';
    coordinates: [number, number];
  };
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

type AssistedQuoteResult = {
  quoteId: string;
  route: {
    distanceKm: number;
    etaMinutes: number;
  };
  quoteSnapshot: {
    currency: string;
    totalEstimate: number;
    pricingRuleVersion: number;
  };
  search: {
    radiusKmUsed: number;
    expanded: boolean;
    noResults: boolean;
  };
  candidates: QuoteCandidate[];
};

type AssistedBookingResult = {
  request: {
    id: string;
    requestCode: string;
    status: string;
    createdByAssistantId?: string;
  };
  offers: Array<{
    id: string;
    requestId: string;
  }>;
  ticket: HotlineTicket;
  confirmationIntent: {
    id: string;
    channel: string;
    targetPhone?: string;
    status?: string;
  };
};

type ApiEnvelope<T> = {
  data: T;
};

type RouteItem = {
  path: string;
  label: string;
  icon: typeof Gauge;
  detail: string;
};

const roleLabels: Record<Role, string> = {
  client: 'Client',
  truck_owner: 'Truck owner',
  assistant: 'Assistant',
  admin: 'Admin'
};

const adminRoutes: RouteItem[] = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: Gauge, detail: 'Operational metrics and release readiness.' },
  { path: '/admin/users', label: 'Users', icon: UsersRound, detail: 'Role, status, and account controls.' },
  { path: '/admin/vehicles/pending', label: 'Verification', icon: Truck, detail: 'Document review and approve/reject decisions.' },
  { path: '/admin/pricing', label: 'Pricing', icon: ClipboardList, detail: 'Versioned pricing rules and audit-backed edits.' },
  { path: '/admin/audit-logs', label: 'Audit', icon: ShieldCheck, detail: 'Privileged action trail and filters.' }
];

const assistantRoutes: RouteItem[] = [
  { path: '/assistant/tickets', label: 'Tickets', icon: ClipboardList, detail: 'Claim, update, and close hotline tickets.' },
  { path: '/assistant/bookings/new', label: 'Assisted Booking', icon: Truck, detail: 'Create KULI requests during live calls.' },
  { path: '/assistant/clients', label: 'Client Lookup', icon: UsersRound, detail: 'Find clients by phone for assisted requests.' }
];

const isBlockedStatus = (status: AccountStatus) => ['suspended', 'banned', 'deleted'].includes(status);

const createIdempotencyKey = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
};

function StatusBadge({ tone, children }: { tone: 'ready' | 'warn' | 'blocked' | 'muted'; children: ReactNode }) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>;
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function LoginScreen({ onAuthenticated }: { onAuthenticated: (profile: UserProfile, session: Session) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const canSubmit = email.trim() && password.length >= 6;

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (!canSubmit || pending) {
      return;
    }

    setPending(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (authError) {
        throw authError;
      }

      if (!data.session) {
        throw new Error('No staff session was returned. Check Supabase email confirmation settings.');
      }

      const profile = (await kuliApi.me()) as ApiEnvelope<UserProfile>;
      onAuthenticated(profile.data, data.session);
    } catch (loginError) {
      setError(getErrorMessage(loginError));
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-brand" aria-label="KULI staff login context">
        <p className="eyebrow">KULI operations</p>
        <h1>Staff access for verified logistics work.</h1>
        <p>Admins and assistants sign in here. Public client and truck-owner registration belongs in the mobile app.</p>
      </section>
      <form className="login-panel" onSubmit={submit}>
        <div>
          <p className="eyebrow">Secure staff login</p>
          <h2>Use your provisioned Supabase account.</h2>
        </div>
        <label>
          Email
          <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder="admin@kuli.local" type="email" value={email} />
        </label>
        <label>
          Password
          <input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 6 characters" type="password" value={password} />
        </label>
        {error ? <p className="field-error" role="alert">{error}</p> : null}
        <button className="icon-button" disabled={!canSubmit || pending} type="submit">
          <LockKeyhole aria-hidden="true" size={18} />
          {pending ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="muted">There is intentionally no staff self-registration path.</p>
      </form>
    </main>
  );
}

function RuntimePanel() {
  const rows = useMemo(
    () => [
      { label: 'API base URL', ready: runtimeReadiness.hasApiBaseUrl },
      { label: 'Supabase URL', ready: runtimeReadiness.hasSupabaseUrl },
      { label: 'Supabase anon key', ready: runtimeReadiness.hasSupabaseAnonKey }
    ],
    []
  );

  return (
    <Panel title="Environment readiness" eyebrow="Runtime">
      <div className="runtime-list">
        {rows.map((row) => (
          <div className="runtime-row" key={row.label}>
            <span>{row.label}</span>
            <StatusBadge tone={row.ready ? 'ready' : 'blocked'}>{row.ready ? 'Set' : 'Missing'}</StatusBadge>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ApiHealthPanel() {
  const healthQuery = useQuery({
    queryKey: ['api-health'],
    queryFn: () => kuliApi.health()
  });

  return (
    <Panel title="Backend health" eyebrow="Connection">
      <div className="health-line">
        <p className="muted">{runtimeConfig.apiBaseUrl}</p>
        <StatusBadge tone={healthQuery.isSuccess ? 'ready' : healthQuery.isError ? 'blocked' : 'warn'}>
          {healthQuery.isSuccess ? 'Ready' : healthQuery.isError ? 'Needs API' : 'Checking'}
        </StatusBadge>
      </div>
      {healthQuery.isError ? <p className="field-error">The admin app cannot reach the API from this browser runtime yet.</p> : null}
      <button className="icon-button" type="button" onClick={() => healthQuery.refetch()}>
        <RefreshCw aria-hidden="true" size={18} />
        Check again
      </button>
    </Panel>
  );
}

function RouteTable({ title, routes }: { title: string; routes: RouteItem[] }) {
  return (
    <section className="panel panel--wide">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Guarded routes</p>
          <h2>{title}</h2>
        </div>
        <StatusBadge tone="ready">Backend role</StatusBadge>
      </div>
      <div className="route-table" role="table" aria-label={`${title} routes`}>
        {routes.map((route) => {
          const Icon = route.icon;

          return (
            <button className="route-row" key={route.path} type="button">
              <Icon aria-hidden="true" size={20} />
              <span>
                <strong>{route.label}</strong>
                <small>{route.path}</small>
              </span>
              <em>{route.detail}</em>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function AdminUsersPanel({ enabled }: { enabled: boolean }) {
  const usersQuery = useQuery({
    enabled,
    queryKey: ['admin-users'],
    queryFn: async () => {
      const result = (await kuliApi.request('/admin/users')) as ApiEnvelope<UserProfile[]>;
      return result.data;
    }
  });

  if (!enabled) {
    return (
      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Permissions</p>
            <h2>Assistant view</h2>
          </div>
          <StatusBadge tone="muted">Hidden</StatusBadge>
        </div>
        <p className="muted">Admin-only user management is hidden for assistants. The backend still enforces the final authorization.</p>
      </section>
    );
  }

  return (
    <section className="panel panel--wide">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Admin users</p>
          <h2>User table</h2>
        </div>
        <StatusBadge tone={usersQuery.isSuccess ? 'ready' : usersQuery.isError ? 'blocked' : 'warn'}>
          {usersQuery.isSuccess ? `${usersQuery.data.length} records` : usersQuery.isError ? 'Needs token' : 'Loading'}
        </StatusBadge>
      </div>
      {usersQuery.isError ? <p className="field-error">{getErrorMessage(usersQuery.error)}</p> : null}
      <div className="data-table" role="table" aria-label="Admin users">
        <div className="data-row data-row--head" role="row">
          <span>Name</span>
          <span>Role</span>
          <span>Status</span>
          <span>Contact</span>
        </div>
        {(usersQuery.data ?? []).map((user) => (
          <div className="data-row" key={user.id} role="row">
            <strong>{user.fullName || 'Unnamed profile'}</strong>
            <span>{roleLabels[user.role]}</span>
            <StatusBadge tone={user.accountStatus === 'active' ? 'ready' : isBlockedStatus(user.accountStatus) ? 'blocked' : 'warn'}>{user.accountStatus}</StatusBadge>
            <span>{user.email || user.phone || 'No contact'}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdminVerificationPanel({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [signedUrlMessage, setSignedUrlMessage] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const [pendingDecision, setPendingDecision] = useState(false);

  const pendingVehiclesQuery = useQuery({
    enabled,
    queryKey: ['admin-vehicles', 'pending'],
    queryFn: async () => ((await kuliApi.request('/admin/vehicles/pending')) as ApiEnvelope<Vehicle[]>).data
  });

  const selectedVehicle = selectedVehicleId || pendingVehiclesQuery.data?.[0]?.id || '';

  const vehicleDetailQuery = useQuery({
    enabled: enabled && Boolean(selectedVehicle),
    queryKey: ['admin-vehicles', selectedVehicle],
    queryFn: async () => ((await kuliApi.request(`/admin/vehicles/${selectedVehicle}`)) as ApiEnvelope<Vehicle>).data
  });

  if (!enabled) {
    return null;
  }

  const decide = async (verificationStatus: 'approved' | 'rejected') => {
    if (verificationStatus === 'rejected' && !decisionReason.trim()) {
      setDecisionError('Rejection requires a reason.');
      return;
    }

    if (!selectedVehicle) {
      setDecisionError('Select a vehicle first.');
      return;
    }

    setPendingDecision(true);
    setDecisionError('');

    try {
      await kuliApi.request(`/admin/vehicles/${selectedVehicle}/verification`, {
        method: 'PATCH',
        body: {
          verificationStatus,
          reason: decisionReason.trim() || undefined
        }
      });
      setDecisionReason('');
      await queryClient.invalidateQueries({ queryKey: ['admin-vehicles'] });
    } catch (error) {
      setDecisionError(getErrorMessage(error));
    } finally {
      setPendingDecision(false);
    }
  };

  const previewDocument = async (fileId: string) => {
    setSignedUrlMessage('');

    try {
      const result = (await kuliApi.request(`/files/${fileId}/signed-url`)) as ApiEnvelope<{ url: string; expiresInSeconds: number }>;
      setSignedUrlMessage(`${result.data.url} (${result.data.expiresInSeconds}s)`);
    } catch (error) {
      setSignedUrlMessage(getErrorMessage(error));
    }
  };

  const detail = vehicleDetailQuery.data;
  const pendingVehicles = pendingVehiclesQuery.data ?? [];

  return (
    <section className="panel panel--wide">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Verification queue</p>
          <h2>Pending vehicles</h2>
        </div>
        <StatusBadge tone={pendingVehiclesQuery.isError ? 'blocked' : pendingVehicles.length ? 'warn' : 'ready'}>
          {pendingVehiclesQuery.isError ? 'Needs token' : `${pendingVehicles.length} pending`}
        </StatusBadge>
      </div>
      {pendingVehiclesQuery.isError ? <p className="field-error">{getErrorMessage(pendingVehiclesQuery.error)}</p> : null}
      <div className="split-panel">
        <div className="queue-list" aria-label="Pending vehicle queue">
          {pendingVehicles.length === 0 ? <p className="muted">No pending vehicles.</p> : null}
          {pendingVehicles.map((vehicle) => (
            <button
              className={`queue-item ${selectedVehicle === vehicle.id ? 'is-selected' : ''}`}
              key={vehicle.id}
              onClick={() => {
                setSelectedVehicleId(vehicle.id);
                setDecisionError('');
                setSignedUrlMessage('');
              }}
              type="button"
            >
              <strong>{vehicle.licensePlate}</strong>
              <span>{vehicle.vehicleClassSnapshot?.name || 'Vehicle class'}</span>
              <StatusBadge tone="warn">{vehicle.verificationStatus}</StatusBadge>
            </button>
          ))}
        </div>

        <div className="decision-panel">
          {detail ? (
            <>
              <div className="detail-heading">
                <div>
                  <h3>{detail.licensePlate}</h3>
                  <p className="muted">{detail.vehicleClassSnapshot?.name} / {detail.capacityKg ?? 0}kg / {detail.capacityCubicMeters ?? 0}m3</p>
                </div>
                <StatusBadge tone={detail.verificationStatus === 'pending' ? 'warn' : detail.verificationStatus === 'approved' ? 'ready' : 'blocked'}>
                  {detail.verificationStatus}
                </StatusBadge>
              </div>
              <p className="muted">{detail.description || 'No owner notes submitted.'}</p>
              <div className="document-list">
                {(detail.documents ?? []).length === 0 ? <p className="muted">No documents attached yet.</p> : null}
                {(detail.documents ?? []).map((doc) => (
                  <button className="document-row" key={doc.id} onClick={() => previewDocument(doc.fileId)} type="button">
                    <span>
                      <strong>{doc.type}</strong>
                      <small>{doc.status}</small>
                    </span>
                    <em>Preview signed URL</em>
                  </button>
                ))}
              </div>
              {signedUrlMessage ? <p className="muted">{signedUrlMessage}</p> : null}
              <label className="decision-label">
                Decision reason
                <textarea
                  onChange={(event) => setDecisionReason(event.target.value)}
                  placeholder="Required for rejection; useful for approval notes."
                  value={decisionReason}
                />
              </label>
              {decisionError ? <p className="field-error" role="alert">{decisionError}</p> : null}
              <div className="decision-actions">
                <button className="icon-button" disabled={pendingDecision} onClick={() => decide('approved')} type="button">
                  Approve
                </button>
                <button className="danger-button" disabled={pendingDecision} onClick={() => decide('rejected')} type="button">
                  Reject
                </button>
              </div>
            </>
          ) : (
            <p className="muted">Select a pending vehicle to inspect documents and record a decision.</p>
          )}
        </div>
      </div>
    </section>
  );
}

const pricingLoadAdjustments = [
  { itemType: 'household_move', flatFee: 300 },
  { itemType: 'furniture', flatFee: 150 },
  { itemType: 'appliance', flatFee: 120 },
  { itemType: 'business_delivery', multiplier: 1.1 }
];

const parseRate = (value: string, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const createDraftFromClasses = (vehicleClasses: VehicleClass[]): PricingDraft =>
  vehicleClasses.reduce<PricingDraft>((draft, vehicleClass) => {
    const defaults = vehicleClass.defaultPricing ?? {};

    draft[vehicleClass.id] = {
      baseFare: String(defaults.baseFare ?? 1200),
      perKmRate: String(defaults.perKmRate ?? 75),
      minimumFare: String(defaults.minimumFare ?? 1800),
      includedMinutes: String(defaults.includedMinutes ?? 30),
      perExtraMinuteRate: String(defaults.perExtraMinuteRate ?? 10)
    };

    return draft;
  }, {});

function AdminPricingPanel({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<PricingDraft>({});
  const [fuelSurchargePercent, setFuelSurchargePercent] = useState('5');
  const [createActive, setCreateActive] = useState(false);
  const [pendingCreate, setPendingCreate] = useState(false);
  const [pendingActivationId, setPendingActivationId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const pricingRulesQuery = useQuery({
    enabled,
    queryKey: ['admin-pricing-rules'],
    queryFn: async () => ((await kuliApi.request('/admin/pricing-rules')) as ApiEnvelope<PricingRule[]>).data
  });

  const vehicleClassesQuery = useQuery({
    enabled,
    queryKey: ['vehicle-classes'],
    queryFn: async () => ((await kuliApi.vehicleClasses()) as ApiEnvelope<VehicleClass[]>).data
  });

  const vehicleClasses = vehicleClassesQuery.data ?? [];
  const pricingRules = pricingRulesQuery.data ?? [];
  const activeRule = pricingRules.find((rule) => rule.status === 'active');

  useEffect(() => {
    if (vehicleClasses.length && Object.keys(draft).length === 0) {
      setDraft(createDraftFromClasses(vehicleClasses));
    }
  }, [draft, vehicleClasses]);

  if (!enabled) {
    return null;
  }

  const updateDraft = (vehicleClassId: string, key: keyof PricingDraft[string], value: string) => {
    setDraft((current) => ({
      ...current,
      [vehicleClassId]: {
        ...current[vehicleClassId],
        [key]: value
      }
    }));
  };

  const createRule = async () => {
    if (vehicleClasses.length === 0) {
      setError('Create at least one active vehicle class before adding a pricing rule.');
      return;
    }

    setPendingCreate(true);
    setError('');
    setMessage('');

    try {
      await kuliApi.request('/admin/pricing-rules', {
        method: 'POST',
        body: {
          status: createActive ? 'active' : 'draft',
          vehicleClassRules: vehicleClasses.map((vehicleClass) => {
            const rates = draft[vehicleClass.id];

            return {
              vehicleClassId: vehicleClass.id,
              baseFare: parseRate(rates?.baseFare ?? '0'),
              perKmRate: parseRate(rates?.perKmRate ?? '0'),
              minimumFare: parseRate(rates?.minimumFare ?? '0'),
              includedMinutes: parseRate(rates?.includedMinutes ?? '0'),
              perExtraMinuteRate: parseRate(rates?.perExtraMinuteRate ?? '0')
            };
          }),
          loadAdjustments: pricingLoadAdjustments,
          fuelSurchargePercent: parseRate(fuelSurchargePercent)
        }
      });

      setMessage(createActive ? 'Active pricing rule created and previous active rule retired.' : 'Draft pricing rule created.');
      await queryClient.invalidateQueries({ queryKey: ['admin-pricing-rules'] });
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setPendingCreate(false);
    }
  };

  const activateRule = async (pricingRuleId: string) => {
    setPendingActivationId(pricingRuleId);
    setError('');
    setMessage('');

    try {
      await kuliApi.request(`/admin/pricing-rules/${pricingRuleId}/activate`, {
        method: 'PATCH'
      });
      setMessage('Pricing rule activated.');
      await queryClient.invalidateQueries({ queryKey: ['admin-pricing-rules'] });
    } catch (activationError) {
      setError(getErrorMessage(activationError));
    } finally {
      setPendingActivationId('');
    }
  };

  return (
    <section className="panel panel--wide">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Pricing rules</p>
          <h2>Quote configuration</h2>
        </div>
        <StatusBadge tone={pricingRulesQuery.isError ? 'blocked' : activeRule ? 'ready' : 'warn'}>
          {pricingRulesQuery.isError ? 'Needs token' : activeRule ? `Active v${activeRule.version}` : 'No active rule'}
        </StatusBadge>
      </div>
      {pricingRulesQuery.isError ? <p className="field-error">{getErrorMessage(pricingRulesQuery.error)}</p> : null}
      {vehicleClassesQuery.isError ? <p className="field-error">{getErrorMessage(vehicleClassesQuery.error)}</p> : null}
      <div className="pricing-layout">
        <div className="pricing-editor">
          <div className="detail-heading">
            <div>
              <h3>New rule draft</h3>
              <p className="muted">Rules are versioned. Activating a new rule retires the previous active version.</p>
            </div>
            <button className={`status-toggle ${createActive ? 'is-active' : ''}`} type="button" onClick={() => setCreateActive((value) => !value)}>
              {createActive ? 'Create active' : 'Create draft'}
            </button>
          </div>
          <label className="rate-label">
            Fuel surcharge %
            <input onChange={(event) => setFuelSurchargePercent(event.target.value)} type="number" value={fuelSurchargePercent} />
          </label>
          <div className="pricing-class-list">
            {vehicleClasses.length === 0 ? <p className="muted">No active vehicle classes available.</p> : null}
            {vehicleClasses.map((vehicleClass) => {
              const rates = draft[vehicleClass.id] ?? createDraftFromClasses([vehicleClass])[vehicleClass.id];

              return (
                <div className="pricing-class-row" key={vehicleClass.id}>
                  <strong>{vehicleClass.name}</strong>
                  <label>
                    Base
                    <input onChange={(event) => updateDraft(vehicleClass.id, 'baseFare', event.target.value)} type="number" value={rates.baseFare} />
                  </label>
                  <label>
                    Per km
                    <input onChange={(event) => updateDraft(vehicleClass.id, 'perKmRate', event.target.value)} type="number" value={rates.perKmRate} />
                  </label>
                  <label>
                    Minimum
                    <input onChange={(event) => updateDraft(vehicleClass.id, 'minimumFare', event.target.value)} type="number" value={rates.minimumFare} />
                  </label>
                  <label>
                    Included min
                    <input onChange={(event) => updateDraft(vehicleClass.id, 'includedMinutes', event.target.value)} type="number" value={rates.includedMinutes} />
                  </label>
                  <label>
                    Extra min
                    <input onChange={(event) => updateDraft(vehicleClass.id, 'perExtraMinuteRate', event.target.value)} type="number" value={rates.perExtraMinuteRate} />
                  </label>
                </div>
              );
            })}
          </div>
          {error ? <p className="field-error" role="alert">{error}</p> : null}
          {message ? <p className="muted">{message}</p> : null}
          <button className="icon-button" disabled={pendingCreate} onClick={createRule} type="button">
            {pendingCreate ? 'Saving...' : 'Save pricing rule'}
          </button>
        </div>

        <div className="pricing-history">
          {pricingRules.length === 0 ? <p className="muted">No pricing rules yet.</p> : null}
          {pricingRules.map((rule) => (
            <div className="pricing-rule-card" key={rule.id}>
              <div className="detail-heading">
                <div>
                  <h3>Version {rule.version}</h3>
                  <p className="muted">{rule.currency} / fuel {rule.fuelSurchargePercent}% / {rule.vehicleClassRules.length} classes</p>
                </div>
                <StatusBadge tone={rule.status === 'active' ? 'ready' : rule.status === 'draft' ? 'warn' : 'muted'}>{rule.status}</StatusBadge>
              </div>
              <p className="muted">Effective {new Date(rule.effectiveFrom).toLocaleString()}</p>
              {rule.status !== 'active' ? (
                <button className="icon-button" disabled={pendingActivationId === rule.id} onClick={() => activateRule(rule.id)} type="button">
                  {pendingActivationId === rule.id ? 'Activating...' : 'Activate'}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const ticketStatusLabels: Record<TicketStatus, string> = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In progress',
  pending_client: 'Pending client',
  closed: 'Closed',
  cancelled: 'Cancelled'
};

const ticketSources: Array<{ value: TicketSource; label: string }> = [
  { value: 'incoming_call', label: 'Incoming' },
  { value: 'missed_call', label: 'Missed' },
  { value: 'manual', label: 'Manual' }
];

const loadTypeOptions = ['household_move', 'furniture', 'appliance', 'business_delivery'];

const ticketTone = (status: TicketStatus): 'ready' | 'warn' | 'blocked' | 'muted' => {
  if (status === 'closed') {
    return 'ready';
  }

  if (status === 'cancelled') {
    return 'blocked';
  }

  return status === 'open' || status === 'pending_client' ? 'warn' : 'muted';
};

const nextTicketStatuses = (ticket?: HotlineTicket): TicketStatus[] => {
  if (!ticket) {
    return [];
  }

  const transitions: Record<TicketStatus, TicketStatus[]> = {
    open: ['assigned', 'cancelled'],
    assigned: ['in_progress', 'cancelled'],
    in_progress: ['pending_client', 'closed', 'cancelled'],
    pending_client: ['in_progress', 'closed', 'cancelled'],
    closed: [],
    cancelled: []
  };

  return transitions[ticket.status] ?? [];
};

const buildAssistantLocation = ({ address, lon, lat }: { address: string; lon: string; lat: string }): GeoLocationInput => ({
  addressText: address.trim(),
  source: 'assistant_entry',
  point: {
    type: 'Point',
    coordinates: [Number(lon), Number(lat)]
  }
});

function AssistantSupportPanel({ enabled, profile }: { enabled: boolean; profile: UserProfile }) {
  const queryClient = useQueryClient();
  const [ticketFilter, setTicketFilter] = useState<TicketStatus | ''>('');
  const [callerFilter, setCallerFilter] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [source, setSource] = useState<TicketSource>('incoming_call');
  const [callerPhone, setCallerPhone] = useState('+251911111111');
  const [callSummary, setCallSummary] = useState('');
  const [followUpAt, setFollowUpAt] = useState('');
  const [pendingTicketAction, setPendingTicketAction] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketError, setTicketError] = useState('');
  const [clientSearchPhone, setClientSearchPhone] = useState('+251911111111');
  const [clientResults, setClientResults] = useState<UserProfile[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientLookupPending, setClientLookupPending] = useState(false);
  const [vehicleClassId, setVehicleClassId] = useState('');
  const [pickupAddress, setPickupAddress] = useState('Bole, Addis Ababa');
  const [pickupLon, setPickupLon] = useState('38.7903');
  const [pickupLat, setPickupLat] = useState('8.9806');
  const [destinationAddress, setDestinationAddress] = useState('Piassa, Addis Ababa');
  const [destinationLon, setDestinationLon] = useState('38.7578');
  const [destinationLat, setDestinationLat] = useState('9.0350');
  const [pickupTime, setPickupTime] = useState('Today, flexible');
  const [itemType, setItemType] = useState('household_move');
  const [estimatedWeightKg, setEstimatedWeightKg] = useState('800');
  const [estimatedVolumeCubicMeters, setEstimatedVolumeCubicMeters] = useState('8');
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [quote, setQuote] = useState<AssistedQuoteResult | null>(null);
  const [quotePending, setQuotePending] = useState(false);
  const [bookingPending, setBookingPending] = useState(false);
  const [bookingResult, setBookingResult] = useState<AssistedBookingResult | null>(null);

  const ticketsQuery = useQuery({
    enabled,
    queryKey: ['assistant-tickets', ticketFilter, callerFilter],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (ticketFilter) {
        params.set('status', ticketFilter);
      }

      if (callerFilter.trim()) {
        params.set('callerPhone', callerFilter.trim());
      }

      const suffix = params.toString() ? `?${params.toString()}` : '';
      return ((await kuliApi.request(`/assistant/tickets${suffix}`)) as ApiEnvelope<HotlineTicket[]>).data;
    }
  });

  const vehicleClassesQuery = useQuery({
    enabled,
    queryKey: ['vehicle-classes'],
    queryFn: async () => ((await kuliApi.vehicleClasses()) as ApiEnvelope<VehicleClass[]>).data
  });

  const tickets = ticketsQuery.data ?? [];
  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) ?? tickets[0];
  const vehicleClasses = vehicleClassesQuery.data ?? [];
  const canEditTicket = selectedTicket && !['closed', 'cancelled'].includes(selectedTicket.status);
  const canBook = selectedTicket && ['assigned', 'in_progress', 'pending_client'].includes(selectedTicket.status);

  useEffect(() => {
    if (!selectedTicketId && tickets[0]) {
      setSelectedTicketId(tickets[0].id);
      setCallSummary(tickets[0].callSummary ?? '');
      setFollowUpAt(tickets[0].followUpAt ?? '');
      setClientSearchPhone(tickets[0].callerPhone ?? clientSearchPhone);
    }
  }, [clientSearchPhone, selectedTicketId, tickets]);

  useEffect(() => {
    if (!vehicleClassId && vehicleClasses[0]) {
      setVehicleClassId(vehicleClasses[0].id);
    }
  }, [vehicleClassId, vehicleClasses]);

  if (!enabled) {
    return null;
  }

  const createTicket = async () => {
    if (!callerPhone.trim()) {
      setTicketError('Caller phone is required.');
      return;
    }

    setPendingTicketAction('create');
    setTicketError('');
    setTicketMessage('');

    try {
      const result = (await kuliApi.request('/assistant/tickets', {
        method: 'POST',
        body: {
          source,
          callerPhone: callerPhone.trim(),
          callSummary: callSummary.trim() || undefined,
          followUpAt: followUpAt.trim() || undefined
        }
      })) as ApiEnvelope<HotlineTicket>;

      setSelectedTicketId(result.data.id);
      setClientSearchPhone(result.data.callerPhone ?? callerPhone);
      setTicketMessage('Ticket created.');
      await queryClient.invalidateQueries({ queryKey: ['assistant-tickets'] });
    } catch (error) {
      setTicketError(getErrorMessage(error));
    } finally {
      setPendingTicketAction('');
    }
  };

  const transitionTicket = async (status: TicketStatus) => {
    if (!selectedTicket || !canEditTicket) {
      return;
    }

    setPendingTicketAction(status);
    setTicketError('');
    setTicketMessage('');

    try {
      const result = (await kuliApi.request(`/assistant/tickets/${selectedTicket.id}/status`, {
        method: 'PATCH',
        body: {
          status,
          callSummary: callSummary.trim() || undefined,
          followUpAt: followUpAt.trim() || undefined,
          cancellationReason: status === 'cancelled' ? 'cancelled_by_staff' : undefined
        }
      })) as ApiEnvelope<HotlineTicket>;

      setSelectedTicketId(result.data.id);
      setTicketMessage(`Ticket moved to ${ticketStatusLabels[status]}.`);
      await queryClient.invalidateQueries({ queryKey: ['assistant-tickets'] });
    } catch (error) {
      setTicketError(getErrorMessage(error));
    } finally {
      setPendingTicketAction('');
    }
  };

  const searchClients = async () => {
    setClientLookupPending(true);
    setTicketError('');

    try {
      const result = (await kuliApi.request(`/assistant/clients/search?phone=${encodeURIComponent(clientSearchPhone.trim())}`)) as ApiEnvelope<UserProfile[]>;
      setClientResults(result.data);
      setSelectedClientId(result.data[0]?.id ?? '');
    } catch (error) {
      setTicketError(getErrorMessage(error));
    } finally {
      setClientLookupPending(false);
    }
  };

  const quoteInput = () => ({
    pickupLocation: buildAssistantLocation({ address: pickupAddress, lon: pickupLon, lat: pickupLat }),
    destinationLocation: buildAssistantLocation({ address: destinationAddress, lon: destinationLon, lat: destinationLat }),
    requestedVehicleClassId: vehicleClassId,
    requestedPickupTime: pickupTime.trim() || undefined,
    loadDetails: {
      itemType,
      estimatedWeightKg: parseRate(estimatedWeightKg),
      estimatedVolumeCubicMeters: parseRate(estimatedVolumeCubicMeters),
      loadingAssistanceRequested: true,
      specialHandlingInstructions: callSummary.trim() || undefined
    }
  });

  const createQuote = async () => {
    const input = quoteInput();
    const coordinates = [...input.pickupLocation.point.coordinates, ...input.destinationLocation.point.coordinates];

    if (!vehicleClassId || !input.pickupLocation.addressText || !input.destinationLocation.addressText) {
      setTicketError('Vehicle class, pickup, and destination are required before quoting.');
      return;
    }

    if (coordinates.some((coordinate) => !Number.isFinite(coordinate))) {
      setTicketError('Pickup and destination coordinates must be valid numbers.');
      return;
    }

    setQuotePending(true);
    setTicketError('');
    setBookingResult(null);

    try {
      const result = (await kuliApi.request('/quotes', {
        method: 'POST',
        body: input
      })) as ApiEnvelope<AssistedQuoteResult>;

      setQuote(result.data);
      setSelectedVehicleIds(result.data.candidates.slice(0, 3).map((candidate) => candidate.vehicleId));
    } catch (error) {
      setTicketError(getErrorMessage(error));
    } finally {
      setQuotePending(false);
    }
  };

  const createBooking = async () => {
    if (!selectedTicket || !canBook) {
      setTicketError('Assign or start the ticket before creating a booking.');
      return;
    }

    if (selectedVehicleIds.length === 0) {
      setTicketError('Select at least one candidate vehicle before creating the assisted booking.');
      return;
    }

    setBookingPending(true);
    setTicketError('');
    setTicketMessage('');

    try {
      const result = (await kuliApi.request('/assistant/bookings', {
        method: 'POST',
        idempotencyKey: createIdempotencyKey('assisted-booking'),
        body: {
          ...quoteInput(),
          ticketId: selectedTicket.id,
          clientId: selectedClientId || undefined,
          clientContactSnapshot: {
            phone: clientSearchPhone.trim() || selectedTicket.callerPhone
          },
          selectedVehicleIds
        }
      })) as ApiEnvelope<AssistedBookingResult>;

      setBookingResult(result.data);
      setTicketMessage('Assisted booking created and SMS confirmation intent recorded.');
      await queryClient.invalidateQueries({ queryKey: ['assistant-tickets'] });
    } catch (error) {
      setTicketError(getErrorMessage(error));
    } finally {
      setBookingPending(false);
    }
  };

  const toggleCandidate = (vehicleId: string) => {
    setSelectedVehicleIds((current) => (current.includes(vehicleId) ? current.filter((id) => id !== vehicleId) : [...current, vehicleId]));
  };

  return (
    <section className="panel panel--wide">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Hotline console</p>
          <h2>Assisted booking workflow</h2>
        </div>
        <StatusBadge tone={ticketsQuery.isError ? 'blocked' : 'ready'}>{tickets.length} tickets</StatusBadge>
      </div>
      {ticketError ? <p className="field-error" role="alert">{ticketError}</p> : null}
      {ticketMessage ? <p className="muted">{ticketMessage}</p> : null}
      <div className="support-layout">
        <div className="support-column">
          <div className="support-toolbar">
            <label>
              Status
              <select onChange={(event) => setTicketFilter(event.target.value as TicketStatus | '')} value={ticketFilter}>
                <option value="">All</option>
                {Object.entries(ticketStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              Caller
              <input onChange={(event) => setCallerFilter(event.target.value)} placeholder="+251..." value={callerFilter} />
            </label>
          </div>
          <div className="queue-list">
            {ticketsQuery.isLoading ? <p className="muted">Loading tickets...</p> : null}
            {tickets.length === 0 && !ticketsQuery.isLoading ? <p className="muted">No hotline tickets match the filter.</p> : null}
            {tickets.map((ticket) => (
              <button
                className={`queue-item ${selectedTicket?.id === ticket.id ? 'is-selected' : ''}`}
                key={ticket.id}
                onClick={() => {
                  setSelectedTicketId(ticket.id);
                  setCallSummary(ticket.callSummary ?? '');
                  setFollowUpAt(ticket.followUpAt ?? '');
                  setClientSearchPhone(ticket.callerPhone ?? '');
                  setBookingResult(null);
                  setQuote(null);
                  setSelectedVehicleIds([]);
                }}
                type="button"
              >
                <strong>{ticket.ticketCode}</strong>
                <span>{ticket.callerPhone || 'No caller phone'}</span>
                <StatusBadge tone={ticketTone(ticket.status)}>{ticketStatusLabels[ticket.status]}</StatusBadge>
              </button>
            ))}
          </div>
          <div className="support-card">
            <h3>Create ticket</h3>
            <div className="source-picker">
              {ticketSources.map((option) => (
                <button className={source === option.value ? 'is-active' : ''} key={option.value} onClick={() => setSource(option.value)} type="button">
                  {option.label}
                </button>
              ))}
            </div>
            <label>
              Caller phone
              <input onChange={(event) => setCallerPhone(event.target.value)} value={callerPhone} />
            </label>
            <label>
              Follow up
              <input onChange={(event) => setFollowUpAt(event.target.value)} placeholder="2026-05-21T12:00:00.000Z" value={followUpAt} />
            </label>
            <button className="icon-button" disabled={pendingTicketAction === 'create'} onClick={createTicket} type="button">
              {pendingTicketAction === 'create' ? 'Creating...' : 'Create ticket'}
            </button>
          </div>
        </div>

        <div className="support-column support-column--wide">
          <div className="detail-heading">
            <div>
              <h3>{selectedTicket?.ticketCode ?? 'Select a ticket'}</h3>
              <p className="muted">{selectedTicket?.callerPhone ?? 'Choose or create a ticket to begin assisted booking.'}</p>
            </div>
            {selectedTicket ? <StatusBadge tone={ticketTone(selectedTicket.status)}>{ticketStatusLabels[selectedTicket.status]}</StatusBadge> : null}
          </div>
          <label className="decision-label">
            Call notes
            <textarea disabled={!canEditTicket} onChange={(event) => setCallSummary(event.target.value)} placeholder="Caller context, building access, load notes, confirmation details." value={callSummary} />
          </label>
          {selectedTicket ? (
            <div className="decision-actions">
              {nextTicketStatuses(selectedTicket).map((status) => (
                <button
                  className={status === 'cancelled' ? 'danger-button' : 'icon-button'}
                  disabled={Boolean(pendingTicketAction)}
                  key={status}
                  onClick={() => transitionTicket(status)}
                  type="button"
                >
                  {pendingTicketAction === status ? 'Working...' : ticketStatusLabels[status]}
                </button>
              ))}
            </div>
          ) : null}

          <div className="support-card">
            <div className="detail-heading">
              <div>
                <h3>Client lookup</h3>
                <p className="muted">Search existing clients by phone; assisted bookings can still use a caller snapshot when no app profile exists.</p>
              </div>
              <button className="icon-button" disabled={clientLookupPending} onClick={searchClients} type="button">
                {clientLookupPending ? 'Searching...' : 'Search'}
              </button>
            </div>
            <label>
              Phone
              <input onChange={(event) => setClientSearchPhone(event.target.value)} value={clientSearchPhone} />
            </label>
            <div className="client-result-list">
              {clientResults.length === 0 ? <p className="muted">No linked client selected. The request will keep caller contact snapshot.</p> : null}
              {clientResults.map((client) => (
                <button className={selectedClientId === client.id ? 'client-result is-selected' : 'client-result'} key={client.id} onClick={() => setSelectedClientId(client.id)} type="button">
                  <strong>{client.fullName || client.email || client.phone}</strong>
                  <span>{client.phone || client.email || client.id}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="support-card">
            <div className="detail-heading">
              <div>
                <h3>Assisted quote</h3>
                <p className="muted">Use manual coordinates while maps stay provider-backed on the API.</p>
              </div>
              <button className="icon-button" disabled={quotePending || !canBook} onClick={createQuote} type="button">
                {quotePending ? 'Quoting...' : 'Quote'}
              </button>
            </div>
            <div className="support-form-grid">
              <label>
                Pickup
                <input onChange={(event) => setPickupAddress(event.target.value)} value={pickupAddress} />
              </label>
              <label>
                Pickup lon
                <input onChange={(event) => setPickupLon(event.target.value)} value={pickupLon} />
              </label>
              <label>
                Pickup lat
                <input onChange={(event) => setPickupLat(event.target.value)} value={pickupLat} />
              </label>
              <label>
                Destination
                <input onChange={(event) => setDestinationAddress(event.target.value)} value={destinationAddress} />
              </label>
              <label>
                Destination lon
                <input onChange={(event) => setDestinationLon(event.target.value)} value={destinationLon} />
              </label>
              <label>
                Destination lat
                <input onChange={(event) => setDestinationLat(event.target.value)} value={destinationLat} />
              </label>
              <label>
                Pickup time
                <input onChange={(event) => setPickupTime(event.target.value)} value={pickupTime} />
              </label>
              <label>
                Vehicle class
                <select onChange={(event) => setVehicleClassId(event.target.value)} value={vehicleClassId}>
                  {vehicleClasses.map((vehicleClass) => (
                    <option key={vehicleClass.id} value={vehicleClass.id}>{vehicleClass.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Load type
                <select onChange={(event) => setItemType(event.target.value)} value={itemType}>
                  {loadTypeOptions.map((option) => (
                    <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>
                  ))}
                </select>
              </label>
              <label>
                Weight kg
                <input onChange={(event) => setEstimatedWeightKg(event.target.value)} value={estimatedWeightKg} />
              </label>
              <label>
                Volume m3
                <input onChange={(event) => setEstimatedVolumeCubicMeters(event.target.value)} value={estimatedVolumeCubicMeters} />
              </label>
            </div>
          </div>

          {quote ? (
            <div className="support-card">
              <div className="detail-heading">
                <div>
                  <h3>{quote.quoteSnapshot.currency} {quote.quoteSnapshot.totalEstimate.toFixed(2)}</h3>
                  <p className="muted">{quote.route.distanceKm.toFixed(2)}km / {Math.round(quote.route.etaMinutes)} min / radius {quote.search.radiusKmUsed}km</p>
                </div>
                <StatusBadge tone={quote.search.noResults ? 'warn' : 'ready'}>{quote.candidates.length} candidates</StatusBadge>
              </div>
              <div className="candidate-grid">
                {quote.candidates.length === 0 ? <p className="muted">No nearby approved trucks. Move ticket to pending client or adjust class/location.</p> : null}
                {quote.candidates.map((candidate) => (
                  <button
                    className={`candidate-card ${selectedVehicleIds.includes(candidate.vehicleId) ? 'is-selected' : ''}`}
                    key={candidate.vehicleId}
                    onClick={() => toggleCandidate(candidate.vehicleId)}
                    type="button"
                  >
                    <strong>{candidate.licensePlate}</strong>
                    <span>{candidate.vehicleClassSnapshot?.name || 'Vehicle'} / {candidate.distanceKm}km / rating {candidate.rating.toFixed(1)}</span>
                    <em>score {candidate.rankingScore.toFixed(1)}</em>
                  </button>
                ))}
              </div>
              <button className="icon-button" disabled={bookingPending || selectedVehicleIds.length === 0 || !canBook} onClick={createBooking} type="button">
                {bookingPending ? 'Creating...' : `Create request (${selectedVehicleIds.length} selected)`}
              </button>
            </div>
          ) : null}

          {bookingResult ? (
            <div className="support-card support-card--success">
              <div className="detail-heading">
                <div>
                  <h3>{bookingResult.request.requestCode}</h3>
                  <p className="muted">{bookingResult.offers.length} offers dispatched / ticket linked to {bookingResult.ticket.ticketCode}</p>
                </div>
                <StatusBadge tone="ready">{bookingResult.request.status}</StatusBadge>
              </div>
              <p className="muted">SMS intent: {bookingResult.confirmationIntent.channel} to {bookingResult.confirmationIntent.targetPhone || 'caller'} ({bookingResult.confirmationIntent.status || 'pending'}).</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function BlockedAccount({ profile, onSignOut }: { profile: UserProfile; onSignOut: () => void }) {
  return (
    <main className="login-shell">
      <section className="login-panel">
        <p className="eyebrow">Account status</p>
        <h1>Staff commands are blocked.</h1>
        <p className="muted">{profile.fullName || profile.email} is currently marked `{profile.accountStatus}`.</p>
        <button className="icon-button" type="button" onClick={onSignOut}>
          <LogOut aria-hidden="true" size={18} />
          Sign out
        </button>
      </section>
    </main>
  );
}

function ForbiddenWorkspace({ profile, onSignOut }: { profile: UserProfile; onSignOut: () => void }) {
  return (
    <main className="login-shell">
      <section className="login-panel">
        <p className="eyebrow">Role mismatch</p>
        <h1>Use the mobile app.</h1>
        <p className="muted">{roleLabels[profile.role]} accounts are not allowed inside the staff dashboard.</p>
        <button className="icon-button" type="button" onClick={onSignOut}>
          <LogOut aria-hidden="true" size={18} />
          Sign out
        </button>
      </section>
    </main>
  );
}

function StaffWorkspace({ profile, onSignOut }: { profile: UserProfile; onSignOut: () => void }) {
  const workspace = profile.role === 'admin' ? 'admin' : 'assistant';
  const routes = workspace === 'admin' ? adminRoutes : assistantRoutes;

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Workspace navigation">
        <div>
          <p className="eyebrow">KULI operations</p>
          <h1>{workspace === 'admin' ? 'Control room for verified truck logistics.' : 'Fast console for live caller support.'}</h1>
        </div>
        <div className="identity-card">
          <strong>{profile.fullName || profile.email}</strong>
          <span>{roleLabels[profile.role]}</span>
          <StatusBadge tone={profile.accountStatus === 'active' ? 'ready' : 'warn'}>{profile.accountStatus}</StatusBadge>
        </div>
        <div className="notice">
          <AlertTriangle aria-hidden="true" size={18} />
          <p>Route visibility follows backend `/me`. Hidden controls are UX help, not security.</p>
        </div>
        <button className="sidebar-button" type="button" onClick={onSignOut}>
          <LogOut aria-hidden="true" size={18} />
          Sign out
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Frontend Phase 6</p>
            <h2>{workspace === 'admin' ? 'Admin dashboard' : 'Assistant console'}</h2>
          </div>
          <StatusBadge tone="ready">
            <CheckCircle2 aria-hidden="true" size={14} /> Authenticated
          </StatusBadge>
        </header>

        <div className="panel-grid">
          <ApiHealthPanel />
          <RuntimePanel />
          <RouteTable title={workspace === 'admin' ? 'Admin routes' : 'Assistant routes'} routes={routes} />
          <AssistantSupportPanel enabled={profile.role === 'assistant'} profile={profile} />
          <AdminVerificationPanel enabled={profile.role === 'admin'} />
          <AdminPricingPanel enabled={profile.role === 'admin'} />
          <AdminUsersPanel enabled={profile.role === 'admin'} />
        </div>
      </section>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="login-shell">
      <section className="login-panel">
        <p className="eyebrow">KULI operations</p>
        <h1>Checking staff session.</h1>
        <p className="muted">Supabase session first, backend profile second.</p>
      </section>
    </main>
  );
}

function ProfileMissingScreen({ onSignOut }: { onSignOut: () => void }) {
  return (
    <main className="login-shell">
      <section className="login-panel">
        <p className="eyebrow">Provisioning required</p>
        <h1>No staff profile found.</h1>
        <p className="muted">This Supabase identity must be provisioned by an admin before it can use the staff dashboard.</p>
        <button className="icon-button" type="button" onClick={onSignOut}>
          <LogOut aria-hidden="true" size={18} />
          Sign out
        </button>
      </section>
    </main>
  );
}

export default function App() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
    queryClient.clear();
    setSession(null);
    setProfile(null);
    setProfileMissing(false);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <LoginScreen onAuthenticated={handleAuthenticated} />;
  }

  if (profileMissing) {
    return <ProfileMissingScreen onSignOut={handleSignOut} />;
  }

  if (!profile) {
    return <LoginScreen onAuthenticated={handleAuthenticated} />;
  }

  if (isBlockedStatus(profile.accountStatus)) {
    return <BlockedAccount profile={profile} onSignOut={handleSignOut} />;
  }

  if (!['admin', 'assistant'].includes(profile.role)) {
    return <ForbiddenWorkspace profile={profile} onSignOut={handleSignOut} />;
  }

  return <StaffWorkspace profile={profile} onSignOut={handleSignOut} />;
}
