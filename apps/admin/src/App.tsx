import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileWarning,
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
import { clearDemoAccessToken, kuliApi, setDemoAccessToken } from './lib/api';
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
  description?: string;
  capacityKg?: number;
  capacityCubicMeters?: number;
  active?: boolean;
  displayOrder?: number;
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

type PaymentRecord = {
  id: string;
  requestId: string;
  payerClientId?: string;
  payeeOwnerId?: string;
  status: 'pending' | 'confirmed_by_owner' | 'disputed' | 'resolved' | 'cancelled' | 'not_required';
  flow?: string;
  method?: string;
  currency?: string;
  amountExpected?: number;
  amountConfirmed?: number;
  disputeReason?: string;
  resolutionNote?: string;
  createdAt?: string;
};

type ReportRecord = {
  id: string;
  reportCode: string;
  requestId?: string;
  reporterId: string;
  reportedUserId?: string;
  reportedVehicleId?: string;
  category: string;
  description: string;
  evidenceFileIds?: string[];
  status: 'open' | 'under_review' | 'awaiting_response' | 'resolved' | 'rejected';
  resolution?: {
    outcome?: string;
    note?: string;
  };
  createdAt?: string;
};

type DashboardMetrics = {
  usersTotal: number;
  activeRequests: number;
  pendingVehicles: number;
  openReports: number;
  disputedPayments: number;
  openTickets: number;
  unreadNotifications: number;
};

type ReadinessCheck = {
  id: string;
  ok: boolean;
  severity: 'error' | 'warning';
  message: string;
};

type ReleaseReadiness = {
  runtime: {
    ok: boolean;
    checks: ReadinessCheck[];
  };
  checks: Record<string, boolean>;
};

type AuditLogRecord = {
  id: string;
  actorUserId?: string;
  actorRole?: Role | 'system';
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
};

type KuliRequest = {
  id: string;
  requestCode: string;
  clientId: string;
  status: 'pending' | 'accepted' | 'en_route_to_pickup' | 'arrived_at_pickup' | 'loading' | 'in_transit' | 'unloading' | 'completed' | 'cancelled' | 'timed_out';
  pickupLocation?: {
    addressText?: string;
  };
  destinationLocation?: {
    addressText?: string;
  };
  selectedOwnerId?: string;
  selectedVehicleId?: string;
  quoteSnapshot?: {
    currency?: string;
    totalEstimate?: number;
  };
  createdAt?: string;
  updatedAt?: string;
};

type StatusEvent = {
  id: string;
  requestId: string;
  fromStatus?: KuliRequest['status'];
  toStatus: KuliRequest['status'];
  actorUserId?: string;
  actorRole?: Role | 'system';
  reason?: string;
  createdAt?: string;
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

const accountStatusOptions: AccountStatus[] = ['active', 'pending_verification', 'suspended', 'banned', 'deleted'];
const requestStatusOptions: KuliRequest['status'][] = ['pending', 'accepted', 'en_route_to_pickup', 'arrived_at_pickup', 'loading', 'in_transit', 'unloading', 'completed', 'cancelled', 'timed_out'];

const adminRoutes: RouteItem[] = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: Gauge, detail: 'Operational metrics and release readiness.' },
  { path: '/admin/users', label: 'Users', icon: UsersRound, detail: 'Role, status, and account controls.' },
  { path: '/admin/vehicles/pending', label: 'Verification', icon: Truck, detail: 'Document review and approve/reject decisions.' },
  { path: '/admin/vehicle-classes', label: 'Vehicle Classes', icon: Truck, detail: 'Capacity bands used by onboarding, pricing, and matching.' },
  { path: '/admin/pricing', label: 'Pricing', icon: ClipboardList, detail: 'Versioned pricing rules and audit-backed edits.' },
  { path: '/admin/reports', label: 'Reports', icon: FileWarning, detail: 'Trip reports, evidence links, and admin outcomes.' },
  { path: '/admin/payments', label: 'Payments', icon: CreditCard, detail: 'Cash confirmations, disputes, and resolution notes.' },
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

  const startDemoProfile = async (role: Extract<Role, 'admin' | 'assistant'>) => {
    if (!runtimeConfig.demoAuthEnabled || pending) {
      return;
    }

    setPending(true);
    setError('');

    try {
      const suffix = Date.now().toString(36);
      const result = (await kuliApi.request('/dev/demo-profile', {
        method: 'POST',
        body: {
          role,
          suffix,
          fullName: role === 'admin' ? `Demo Admin ${suffix}` : `Demo Assistant ${suffix}`,
          email: `${role}-${suffix}@demo.kuli.local`,
          phone: role === 'admin' ? '+251900300001' : '+251900400001'
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
        {runtimeConfig.demoAuthEnabled ? (
          <div className="button-row">
            <button className="secondary-action" disabled={pending} onClick={() => startDemoProfile('admin')} type="button">Demo admin</button>
            <button className="secondary-action" disabled={pending} onClick={() => startDemoProfile('assistant')} type="button">Demo assistant</button>
          </div>
        ) : null}
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
      { label: 'Supabase anon key', ready: runtimeReadiness.hasSupabaseAnonKey },
      { label: 'Local demo auth', ready: runtimeReadiness.demoAuthEnabled }
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

function AdminDashboardPanel({ enabled }: { enabled: boolean }) {
  const metricsQuery = useQuery({
    enabled,
    queryKey: ['admin-dashboard'],
    queryFn: async () => ((await kuliApi.request('/admin/dashboard')) as ApiEnvelope<DashboardMetrics>).data
  });

  const readinessQuery = useQuery({
    enabled,
    queryKey: ['admin-release-readiness'],
    queryFn: async () => ((await kuliApi.request('/admin/release-readiness')) as ApiEnvelope<ReleaseReadiness>).data
  });

  if (!enabled) {
    return null;
  }

  const metrics = metricsQuery.data;
  const metricRows = [
    { label: 'Users', value: metrics?.usersTotal ?? 0, tone: 'ready' as const },
    { label: 'Active trips', value: metrics?.activeRequests ?? 0, tone: metrics?.activeRequests ? 'warn' as const : 'ready' as const },
    { label: 'Pending vehicles', value: metrics?.pendingVehicles ?? 0, tone: metrics?.pendingVehicles ? 'warn' as const : 'ready' as const },
    { label: 'Open reports', value: metrics?.openReports ?? 0, tone: metrics?.openReports ? 'blocked' as const : 'ready' as const },
    { label: 'Disputed payments', value: metrics?.disputedPayments ?? 0, tone: metrics?.disputedPayments ? 'blocked' as const : 'ready' as const },
    { label: 'Open tickets', value: metrics?.openTickets ?? 0, tone: metrics?.openTickets ? 'warn' as const : 'ready' as const },
    { label: 'Unread alerts', value: metrics?.unreadNotifications ?? 0, tone: metrics?.unreadNotifications ? 'warn' as const : 'ready' as const }
  ];
  const readiness = readinessQuery.data;
  const hardeningChecks = readiness ? Object.entries(readiness.checks) : [];

  return (
    <section className="panel panel--wide">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Operations dashboard</p>
          <h2>Release signals and live queues</h2>
        </div>
        <button className="icon-button" type="button" onClick={() => {
          metricsQuery.refetch();
          readinessQuery.refetch();
        }}>
          <RefreshCw aria-hidden="true" size={18} />
          Refresh
        </button>
      </div>
      {metricsQuery.isError ? <p className="field-error">{getErrorMessage(metricsQuery.error)}</p> : null}
      {readinessQuery.isError ? <p className="field-error">{getErrorMessage(readinessQuery.error)}</p> : null}
      <div className="metric-board" aria-label="Admin dashboard metrics">
        {metricRows.map((metric) => (
          <div className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <StatusBadge tone={metric.tone}>{metric.tone === 'ready' ? 'Clear' : metric.tone === 'blocked' ? 'Review' : 'Watch'}</StatusBadge>
          </div>
        ))}
      </div>
      <div className="readiness-grid">
        <div className="support-card">
          <div className="detail-heading">
            <div>
              <h3>Runtime config</h3>
              <p className="muted">Production-blocking checks stay visible beside warning-only setup gaps.</p>
            </div>
            <StatusBadge tone={readiness?.runtime.ok ? 'ready' : 'blocked'}>{readiness?.runtime.ok ? 'Ready' : 'Review'}</StatusBadge>
          </div>
          <div className="runtime-list">
            {(readiness?.runtime.checks ?? []).map((check) => (
              <div className="runtime-row" key={check.id}>
                <span>{check.message}</span>
                <StatusBadge tone={check.ok ? 'ready' : check.severity === 'error' ? 'blocked' : 'warn'}>{check.ok ? 'Pass' : check.severity}</StatusBadge>
              </div>
            ))}
          </div>
        </div>
        <div className="support-card">
          <div className="detail-heading">
            <div>
              <h3>Hardening</h3>
              <p className="muted">These map to the backend release-readiness contract and smoke checklist.</p>
            </div>
          </div>
          <div className="runtime-list">
            {hardeningChecks.map(([key, ok]) => (
              <div className="runtime-row" key={key}>
                <span>{key.replaceAll(/([A-Z])/g, ' $1').toLowerCase()}</span>
                <StatusBadge tone={ok ? 'ready' : 'blocked'}>{ok ? 'Pass' : 'Fail'}</StatusBadge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminUsersPanel({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [statusFilter, setStatusFilter] = useState<AccountStatus | ''>('');
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [nextStatus, setNextStatus] = useState<AccountStatus>('active');
  const [pendingStatus, setPendingStatus] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const usersQuery = useQuery({
    enabled,
    queryKey: ['admin-users'],
    queryFn: async () => {
      const result = (await kuliApi.request('/admin/users')) as ApiEnvelope<UserProfile[]>;
      return result.data;
    }
  });

  const users = usersQuery.data ?? [];
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? users[0];
  const detailQuery = useQuery({
    enabled: enabled && Boolean(selectedUser?.id),
    queryKey: ['admin-users', selectedUser?.id],
    queryFn: async () => ((await kuliApi.request(`/admin/users/${selectedUser?.id}`)) as ApiEnvelope<UserProfile>).data
  });
  const filteredUsers = users.filter((user) => {
    const haystack = `${user.fullName ?? ''} ${user.email ?? ''} ${user.phone ?? ''} ${user.id}`.toLowerCase();
    return (!roleFilter || user.role === roleFilter) && (!statusFilter || user.accountStatus === statusFilter) && (!search.trim() || haystack.includes(search.trim().toLowerCase()));
  });

  useEffect(() => {
    if (!selectedUserId && users[0]) {
      setSelectedUserId(users[0].id);
      setNextStatus(users[0].accountStatus);
    }
  }, [selectedUserId, users]);

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

  const updateStatus = async () => {
    if (!selectedUser) {
      setError('Select a user first.');
      return;
    }

    setPendingStatus(true);
    setError('');
    setMessage('');

    try {
      const result = (await kuliApi.request(`/admin/users/${selectedUser.id}/status`, {
        method: 'PATCH',
        body: {
          accountStatus: nextStatus
        }
      })) as ApiEnvelope<UserProfile>;

      setMessage(`${result.data.fullName || result.data.email || result.data.id} moved to ${result.data.accountStatus}.`);
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (statusError) {
      setError(getErrorMessage(statusError));
    } finally {
      setPendingStatus(false);
    }
  };

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
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      {message ? <p className="muted">{message}</p> : null}
      <div className="support-toolbar support-toolbar--triple">
        <label>
          Role
          <select onChange={(event) => setRoleFilter(event.target.value as Role | '')} value={roleFilter}>
            <option value="">All</option>
            {Object.entries(roleLabels).map(([role, label]) => (
              <option key={role} value={role}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select onChange={(event) => setStatusFilter(event.target.value as AccountStatus | '')} value={statusFilter}>
            <option value="">All</option>
            {accountStatusOptions.map((status) => (
              <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
            ))}
          </select>
        </label>
        <label>
          Search
          <input onChange={(event) => setSearch(event.target.value)} placeholder="Name, email, phone, id" value={search} />
        </label>
      </div>
      <div className="data-table" role="table" aria-label="Admin users">
        <div className="data-row data-row--head" role="row">
          <span>Name</span>
          <span>Role</span>
          <span>Status</span>
          <span>Contact</span>
        </div>
        {filteredUsers.map((user) => (
          <button
            className={`data-row data-row--button ${selectedUser?.id === user.id ? 'is-selected' : ''}`}
            key={user.id}
            onClick={() => {
              setSelectedUserId(user.id);
              setNextStatus(user.accountStatus);
              setError('');
              setMessage('');
            }}
            role="row"
            type="button"
          >
            <strong>{user.fullName || 'Unnamed profile'}</strong>
            <span>{roleLabels[user.role]}</span>
            <StatusBadge tone={user.accountStatus === 'active' ? 'ready' : isBlockedStatus(user.accountStatus) ? 'blocked' : 'warn'}>{user.accountStatus}</StatusBadge>
            <span>{user.email || user.phone || 'No contact'}</span>
          </button>
        ))}
      </div>
      <div className="decision-panel">
        <div className="detail-heading">
          <div>
            <h3>{detailQuery.data?.fullName || selectedUser?.fullName || 'Select a user'}</h3>
            <p className="muted">{detailQuery.data?.email || detailQuery.data?.phone || selectedUser?.id || 'Open a row to inspect account state.'}</p>
          </div>
          {selectedUser ? <StatusBadge tone={selectedUser.accountStatus === 'active' ? 'ready' : isBlockedStatus(selectedUser.accountStatus) ? 'blocked' : 'warn'}>{selectedUser.accountStatus}</StatusBadge> : null}
        </div>
        {detailQuery.isError ? <p className="field-error">{getErrorMessage(detailQuery.error)}</p> : null}
        {selectedUser ? (
          <div className="support-toolbar">
            <label>
              Account status
              <select onChange={(event) => setNextStatus(event.target.value as AccountStatus)} value={nextStatus}>
                {accountStatusOptions.map((status) => (
                  <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
                ))}
              </select>
            </label>
            <button className="icon-button" disabled={pendingStatus || selectedUser.accountStatus === nextStatus} onClick={updateStatus} type="button">
              {pendingStatus ? 'Updating...' : 'Update status'}
            </button>
          </div>
        ) : null}
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

function AdminVehicleClassesPanel({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [capacityKg, setCapacityKg] = useState('1200');
  const [capacityCubicMeters, setCapacityCubicMeters] = useState('10');
  const [displayOrder, setDisplayOrder] = useState('100');
  const [baseFare, setBaseFare] = useState('1200');
  const [perKmRate, setPerKmRate] = useState('75');
  const [minimumFare, setMinimumFare] = useState('1800');
  const [pendingAction, setPendingAction] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const vehicleClassesQuery = useQuery({
    enabled,
    queryKey: ['vehicle-classes'],
    queryFn: async () => ((await kuliApi.vehicleClasses()) as ApiEnvelope<VehicleClass[]>).data
  });

  const vehicleClasses = vehicleClassesQuery.data ?? [];
  const selectedClass = selectedClassId ? vehicleClasses.find((vehicleClass) => vehicleClass.id === selectedClassId) : undefined;

  useEffect(() => {
    if (!selectedClass) {
      return;
    }

    setSelectedClassId(selectedClass.id);
    setName(selectedClass.name ?? '');
    setSlug(selectedClass.slug ?? '');
    setDescription(selectedClass.description ?? '');
    setCapacityKg(String(selectedClass.capacityKg ?? 1200));
    setCapacityCubicMeters(String(selectedClass.capacityCubicMeters ?? 10));
    setDisplayOrder(String(selectedClass.displayOrder ?? 100));
    setBaseFare(String(selectedClass.defaultPricing?.baseFare ?? 1200));
    setPerKmRate(String(selectedClass.defaultPricing?.perKmRate ?? 75));
    setMinimumFare(String(selectedClass.defaultPricing?.minimumFare ?? 1800));
  }, [selectedClass?.id]);

  if (!enabled) {
    return null;
  }

  const payload = () => ({
    name: name.trim(),
    slug: slug.trim() || undefined,
    description: description.trim() || undefined,
    capacityKg: parseRate(capacityKg),
    capacityCubicMeters: parseRate(capacityCubicMeters),
    displayOrder: parseRate(displayOrder, 100),
    defaultPricing: {
      baseFare: parseRate(baseFare),
      perKmRate: parseRate(perKmRate),
      minimumFare: parseRate(minimumFare)
    },
    active: true
  });

  const saveClass = async () => {
    if (!name.trim()) {
      setError('Vehicle class name is required.');
      return;
    }

    setPendingAction('save');
    setError('');
    setMessage('');

    try {
      const endpoint = selectedClass ? `/admin/vehicle-classes/${selectedClass.id}` : '/admin/vehicle-classes';
      const method = selectedClass ? 'PATCH' : 'POST';
      const result = (await kuliApi.request(endpoint, {
        method,
        body: payload()
      })) as ApiEnvelope<VehicleClass>;

      setSelectedClassId(result.data.id);
      setMessage(selectedClass ? 'Vehicle class updated.' : 'Vehicle class created.');
      await queryClient.invalidateQueries({ queryKey: ['vehicle-classes'] });
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setPendingAction('');
    }
  };

  const deactivateClass = async () => {
    if (!selectedClass) {
      setError('Select a vehicle class first.');
      return;
    }

    setPendingAction('delete');
    setError('');
    setMessage('');

    try {
      await kuliApi.request(`/admin/vehicle-classes/${selectedClass.id}`, {
        method: 'DELETE'
      });
      setSelectedClassId('');
      setName('');
      setSlug('');
      setDescription('');
      setMessage('Vehicle class deactivated.');
      await queryClient.invalidateQueries({ queryKey: ['vehicle-classes'] });
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setPendingAction('');
    }
  };

  return (
    <section className="panel panel--wide">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Vehicle classes</p>
          <h2>Capacity bands</h2>
        </div>
        <StatusBadge tone={vehicleClassesQuery.isError ? 'blocked' : vehicleClasses.length ? 'ready' : 'warn'}>
          {vehicleClassesQuery.isError ? 'Needs token' : `${vehicleClasses.length} active`}
        </StatusBadge>
      </div>
      {vehicleClassesQuery.isError ? <p className="field-error">{getErrorMessage(vehicleClassesQuery.error)}</p> : null}
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      {message ? <p className="muted">{message}</p> : null}
      <div className="split-panel">
        <div className="queue-list">
          <button
            className={`queue-item ${!selectedClassId ? 'is-selected' : ''}`}
            onClick={() => {
              setSelectedClassId('');
              setName('');
              setSlug('');
              setDescription('');
              setError('');
              setMessage('');
            }}
            type="button"
          >
            <strong>New vehicle class</strong>
            <span>Create a capacity band for owners and quote rules.</span>
            <StatusBadge tone="muted">Draft</StatusBadge>
          </button>
          {vehicleClasses.map((vehicleClass) => (
            <button
              className={`queue-item ${selectedClass?.id === vehicleClass.id ? 'is-selected' : ''}`}
              key={vehicleClass.id}
              onClick={() => {
                setSelectedClassId(vehicleClass.id);
                setError('');
                setMessage('');
              }}
              type="button"
            >
              <strong>{vehicleClass.name}</strong>
              <span>{vehicleClass.capacityKg ?? 0}kg / {vehicleClass.capacityCubicMeters ?? 0}m3 / {vehicleClass.slug}</span>
              <StatusBadge tone="ready">Active</StatusBadge>
            </button>
          ))}
        </div>
        <div className="decision-panel">
          <div className="detail-heading">
            <div>
              <h3>{selectedClass ? selectedClass.name : 'New class'}</h3>
              <p className="muted">Vehicle classes feed owner onboarding, load validation, matching, and pricing rules.</p>
            </div>
            {selectedClass ? <StatusBadge tone="ready">Active</StatusBadge> : <StatusBadge tone="muted">Draft</StatusBadge>}
          </div>
          <div className="support-form-grid">
            <label>
              Name
              <input onChange={(event) => setName(event.target.value)} value={name} />
            </label>
            <label>
              Slug
              <input onChange={(event) => setSlug(event.target.value)} value={slug} />
            </label>
            <label>
              Display order
              <input onChange={(event) => setDisplayOrder(event.target.value)} type="number" value={displayOrder} />
            </label>
            <label>
              Capacity kg
              <input onChange={(event) => setCapacityKg(event.target.value)} type="number" value={capacityKg} />
            </label>
            <label>
              Volume m3
              <input onChange={(event) => setCapacityCubicMeters(event.target.value)} type="number" value={capacityCubicMeters} />
            </label>
            <label>
              Base fare
              <input onChange={(event) => setBaseFare(event.target.value)} type="number" value={baseFare} />
            </label>
            <label>
              Per km
              <input onChange={(event) => setPerKmRate(event.target.value)} type="number" value={perKmRate} />
            </label>
            <label>
              Minimum fare
              <input onChange={(event) => setMinimumFare(event.target.value)} type="number" value={minimumFare} />
            </label>
          </div>
          <label className="decision-label">
            Description
            <textarea onChange={(event) => setDescription(event.target.value)} value={description} />
          </label>
          <div className="decision-actions">
            <button className="icon-button" disabled={Boolean(pendingAction)} onClick={saveClass} type="button">
              {pendingAction === 'save' ? 'Saving...' : selectedClass ? 'Update class' : 'Create class'}
            </button>
            {selectedClass ? (
              <button className="danger-button" disabled={Boolean(pendingAction)} onClick={deactivateClass} type="button">
                {pendingAction === 'delete' ? 'Deactivating...' : 'Deactivate'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

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

const adminReportCategories = ['overcharge', 'no_show', 'misconduct', 'damage', 'safety', 'platform_issue', 'other'];
const reportResolutionOutcomes = ['warning', 'suspension', 'rejected', 'resolved_no_action', 'refund_recommended', 'visibility_penalty'];
const reportStatuses: Array<ReportRecord['status']> = ['open', 'under_review', 'awaiting_response', 'resolved', 'rejected'];

const reportTone = (status: ReportRecord['status']): 'ready' | 'warn' | 'blocked' | 'muted' => {
  if (status === 'resolved') {
    return 'ready';
  }

  if (status === 'rejected') {
    return 'blocked';
  }

  return status === 'open' ? 'warn' : 'muted';
};

const paymentTone = (status: PaymentRecord['status']): 'ready' | 'warn' | 'blocked' | 'muted' => {
  if (status === 'resolved' || status === 'confirmed_by_owner') {
    return 'ready';
  }

  if (status === 'disputed') {
    return 'blocked';
  }

  return status === 'pending' ? 'warn' : 'muted';
};

const formatMoney = (currency = 'ETB', amount = 0) => `${currency} ${Number(amount).toFixed(2)}`;

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

function AdminTrustFinancePanel({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const [reportStatusFilter, setReportStatusFilter] = useState<ReportRecord['status'] | ''>('open');
  const [reportCategoryFilter, setReportCategoryFilter] = useState('');
  const [selectedReportId, setSelectedReportId] = useState('');
  const [reportOutcome, setReportOutcome] = useState('resolved_no_action');
  const [reportNote, setReportNote] = useState('');
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [pendingAction, setPendingAction] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const reportsQuery = useQuery({
    enabled,
    queryKey: ['admin-reports', reportStatusFilter, reportCategoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (reportStatusFilter) {
        params.set('status', reportStatusFilter);
      }

      if (reportCategoryFilter) {
        params.set('category', reportCategoryFilter);
      }

      const suffix = params.toString() ? `?${params.toString()}` : '';
      return ((await kuliApi.request(`/admin/reports${suffix}`)) as ApiEnvelope<ReportRecord[]>).data;
    }
  });

  const paymentsQuery = useQuery({
    enabled,
    queryKey: ['admin-payments'],
    queryFn: async () => ((await kuliApi.request('/admin/payments')) as ApiEnvelope<PaymentRecord[]>).data
  });

  const reports = reportsQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];
  const selectedReport = reports.find((report) => report.id === selectedReportId) ?? reports[0];
  const selectedPayment = payments.find((payment) => payment.id === selectedPaymentId) ?? payments[0];

  useEffect(() => {
    if (!selectedReportId && reports[0]) {
      setSelectedReportId(reports[0].id);
    }
  }, [reports, selectedReportId]);

  useEffect(() => {
    if (!selectedPaymentId && payments[0]) {
      setSelectedPaymentId(payments[0].id);
      setPaymentAmount(String(payments[0].amountConfirmed ?? payments[0].amountExpected ?? 0));
    }
  }, [payments, selectedPaymentId]);

  if (!enabled) {
    return null;
  }

  const resolveReport = async () => {
    if (!selectedReport) {
      setError('Select a report first.');
      return;
    }

    if (!reportNote.trim()) {
      setError('Report resolution requires an audit note.');
      return;
    }

    setPendingAction('report');
    setError('');
    setMessage('');

    try {
      await kuliApi.request(`/admin/reports/${selectedReport.id}`, {
        method: 'PATCH',
        body: {
          outcome: reportOutcome,
          note: reportNote.trim()
        }
      });
      setReportNote('');
      setMessage(`Report ${selectedReport.reportCode} resolved.`);
      await queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    } catch (resolveError) {
      setError(getErrorMessage(resolveError));
    } finally {
      setPendingAction('');
    }
  };

  const resolvePayment = async () => {
    if (!selectedPayment) {
      setError('Select a payment record first.');
      return;
    }

    if (!paymentNote.trim()) {
      setError('Payment resolution requires an audit note.');
      return;
    }

    const parsedAmount = Number(paymentAmount);

    setPendingAction('payment');
    setError('');
    setMessage('');

    try {
      await kuliApi.request(`/admin/payments/${selectedPayment.id}`, {
        method: 'PATCH',
        body: {
          amountConfirmed: Number.isFinite(parsedAmount) ? parsedAmount : undefined,
          resolutionNote: paymentNote.trim()
        }
      });
      setPaymentNote('');
      setMessage(`Payment ${selectedPayment.id} resolved.`);
      await queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
    } catch (resolveError) {
      setError(getErrorMessage(resolveError));
    } finally {
      setPendingAction('');
    }
  };

  return (
    <section className="panel panel--wide">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Trust and finance</p>
          <h2>Reports and payment disputes</h2>
        </div>
        <StatusBadge tone={reportsQuery.isError || paymentsQuery.isError ? 'blocked' : reports.length || payments.length ? 'warn' : 'ready'}>
          {reportsQuery.isError || paymentsQuery.isError ? 'Needs token' : `${reports.length} reports / ${payments.length} payments`}
        </StatusBadge>
      </div>
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      {message ? <p className="muted">{message}</p> : null}
      {reportsQuery.isError ? <p className="field-error">{getErrorMessage(reportsQuery.error)}</p> : null}
      {paymentsQuery.isError ? <p className="field-error">{getErrorMessage(paymentsQuery.error)}</p> : null}

      <div className="support-layout">
        <div className="support-column">
          <div className="support-toolbar">
            <label>
              Report status
              <select onChange={(event) => setReportStatusFilter(event.target.value as ReportRecord['status'] | '')} value={reportStatusFilter}>
                <option value="">All</option>
                {reportStatuses.map((status) => (
                  <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
                ))}
              </select>
            </label>
            <label>
              Category
              <select onChange={(event) => setReportCategoryFilter(event.target.value)} value={reportCategoryFilter}>
                <option value="">All</option>
                {adminReportCategories.map((category) => (
                  <option key={category} value={category}>{category.replaceAll('_', ' ')}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="queue-list">
            {reportsQuery.isLoading ? <p className="muted">Loading reports...</p> : null}
            {reports.length === 0 && !reportsQuery.isLoading ? <p className="muted">No reports match this filter.</p> : null}
            {reports.map((report) => (
              <button
                className={`queue-item ${selectedReport?.id === report.id ? 'is-selected' : ''}`}
                key={report.id}
                onClick={() => {
                  setSelectedReportId(report.id);
                  setError('');
                  setMessage('');
                }}
                type="button"
              >
                <strong>{report.reportCode}</strong>
                <span>{report.category.replaceAll('_', ' ')} / {report.requestId || 'platform issue'}</span>
                <StatusBadge tone={reportTone(report.status)}>{report.status.replaceAll('_', ' ')}</StatusBadge>
              </button>
            ))}
          </div>

          <div className="support-card">
            <div className="detail-heading">
              <div>
                <h3>{selectedReport?.reportCode ?? 'Select a report'}</h3>
                <p className="muted">{selectedReport?.description ?? 'Evidence and outcomes appear after selecting a report.'}</p>
              </div>
              {selectedReport ? <StatusBadge tone={reportTone(selectedReport.status)}>{selectedReport.status.replaceAll('_', ' ')}</StatusBadge> : null}
            </div>
            {selectedReport ? (
              <>
                <p className="muted">Reporter {selectedReport.reporterId} / reported owner {selectedReport.reportedUserId || 'n/a'} / evidence {(selectedReport.evidenceFileIds ?? []).length}</p>
                <label>
                  Outcome
                  <select onChange={(event) => setReportOutcome(event.target.value)} value={reportOutcome}>
                    {reportResolutionOutcomes.map((outcome) => (
                      <option key={outcome} value={outcome}>{outcome.replaceAll('_', ' ')}</option>
                    ))}
                  </select>
                </label>
                <label className="decision-label">
                  Resolution note
                  <textarea onChange={(event) => setReportNote(event.target.value)} placeholder="Required audit note for the report outcome." value={reportNote} />
                </label>
                <button className="icon-button" disabled={pendingAction === 'report'} onClick={resolveReport} type="button">
                  {pendingAction === 'report' ? 'Resolving...' : 'Resolve report'}
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="support-column support-column--wide">
          <div className="queue-list">
            {paymentsQuery.isLoading ? <p className="muted">Loading payments...</p> : null}
            {payments.length === 0 && !paymentsQuery.isLoading ? <p className="muted">No payment records yet.</p> : null}
            {payments.map((payment) => (
              <button
                className={`queue-item ${selectedPayment?.id === payment.id ? 'is-selected' : ''}`}
                key={payment.id}
                onClick={() => {
                  setSelectedPaymentId(payment.id);
                  setPaymentAmount(String(payment.amountConfirmed ?? payment.amountExpected ?? 0));
                  setError('');
                  setMessage('');
                }}
                type="button"
              >
                <strong>{formatMoney(payment.currency, payment.amountConfirmed ?? payment.amountExpected)}</strong>
                <span>{payment.requestId} / owner {payment.payeeOwnerId || 'n/a'}</span>
                <StatusBadge tone={paymentTone(payment.status)}>{payment.status.replaceAll('_', ' ')}</StatusBadge>
              </button>
            ))}
          </div>

          <div className="support-card">
            <div className="detail-heading">
              <div>
                <h3>{selectedPayment ? formatMoney(selectedPayment.currency, selectedPayment.amountConfirmed ?? selectedPayment.amountExpected) : 'Select a payment'}</h3>
                <p className="muted">{selectedPayment?.disputeReason || selectedPayment?.resolutionNote || 'Cash confirmations and disputes stay manual in v1.'}</p>
              </div>
              {selectedPayment ? <StatusBadge tone={paymentTone(selectedPayment.status)}>{selectedPayment.status.replaceAll('_', ' ')}</StatusBadge> : null}
            </div>
            {selectedPayment ? (
              <>
                <p className="muted">Request {selectedPayment.requestId} / client {selectedPayment.payerClientId || 'n/a'} / method {selectedPayment.method || 'manual_cash'}</p>
                <label>
                  Confirmed amount
                  <input onChange={(event) => setPaymentAmount(event.target.value)} type="number" value={paymentAmount} />
                </label>
                <label className="decision-label">
                  Resolution note
                  <textarea onChange={(event) => setPaymentNote(event.target.value)} placeholder="Required audit note for the payment decision." value={paymentNote} />
                </label>
                <button className="icon-button" disabled={pendingAction === 'payment'} onClick={resolvePayment} type="button">
                  {pendingAction === 'payment' ? 'Resolving...' : 'Resolve payment'}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminTripOversightPanel({ enabled }: { enabled: boolean }) {
  const [statusFilter, setStatusFilter] = useState<KuliRequest['status'] | ''>('');
  const [search, setSearch] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState('');

  const requestsQuery = useQuery({
    enabled,
    queryKey: ['admin-kuli-requests'],
    queryFn: async () => ((await kuliApi.request('/admin/kuli-requests')) as ApiEnvelope<KuliRequest[]>).data
  });

  const requests = requestsQuery.data ?? [];
  const selectedRequest = requests.find((request) => request.id === selectedRequestId) ?? requests[0];
  const eventsQuery = useQuery({
    enabled: enabled && Boolean(selectedRequest?.id),
    queryKey: ['admin-kuli-requests', selectedRequest?.id, 'events'],
    queryFn: async () => ((await kuliApi.request(`/kuli-requests/${selectedRequest?.id}/events`)) as ApiEnvelope<StatusEvent[]>).data
  });
  const filteredRequests = requests.filter((request) => {
    const haystack = `${request.requestCode} ${request.id} ${request.clientId} ${request.selectedOwnerId ?? ''} ${request.pickupLocation?.addressText ?? ''} ${request.destinationLocation?.addressText ?? ''}`.toLowerCase();
    return (!statusFilter || request.status === statusFilter) && (!search.trim() || haystack.includes(search.trim().toLowerCase()));
  });

  useEffect(() => {
    if (!selectedRequestId && requests[0]) {
      setSelectedRequestId(requests[0].id);
    }
  }, [requests, selectedRequestId]);

  if (!enabled) {
    return null;
  }

  return (
    <section className="panel panel--wide">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Trip oversight</p>
          <h2>KULI requests</h2>
        </div>
        <StatusBadge tone={requestsQuery.isError ? 'blocked' : filteredRequests.length ? 'warn' : 'ready'}>
          {requestsQuery.isError ? 'Needs token' : `${filteredRequests.length} visible`}
        </StatusBadge>
      </div>
      {requestsQuery.isError ? <p className="field-error">{getErrorMessage(requestsQuery.error)}</p> : null}
      <div className="support-toolbar">
        <label>
          Status
          <select onChange={(event) => setStatusFilter(event.target.value as KuliRequest['status'] | '')} value={statusFilter}>
            <option value="">All</option>
            {requestStatusOptions.map((status) => (
              <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
            ))}
          </select>
        </label>
        <label>
          Search
          <input onChange={(event) => setSearch(event.target.value)} placeholder="Request, client, owner, address" value={search} />
        </label>
      </div>
      <div className="split-panel">
        <div className="queue-list">
          {filteredRequests.length === 0 ? <p className="muted">No requests match the current filters.</p> : null}
          {filteredRequests.map((request) => (
            <button
              className={`queue-item ${selectedRequest?.id === request.id ? 'is-selected' : ''}`}
              key={request.id}
              onClick={() => setSelectedRequestId(request.id)}
              type="button"
            >
              <strong>{request.requestCode}</strong>
              <span>{request.pickupLocation?.addressText || 'Pickup'} to {request.destinationLocation?.addressText || 'Destination'}</span>
              <StatusBadge tone={request.status === 'completed' ? 'ready' : ['cancelled', 'timed_out'].includes(request.status) ? 'blocked' : 'warn'}>{request.status.replaceAll('_', ' ')}</StatusBadge>
            </button>
          ))}
        </div>
        <div className="decision-panel">
          {selectedRequest ? (
            <>
              <div className="detail-heading">
                <div>
                  <h3>{selectedRequest.requestCode}</h3>
                  <p className="muted">{selectedRequest.id}</p>
                </div>
                <StatusBadge tone={selectedRequest.status === 'completed' ? 'ready' : ['cancelled', 'timed_out'].includes(selectedRequest.status) ? 'blocked' : 'warn'}>{selectedRequest.status.replaceAll('_', ' ')}</StatusBadge>
              </div>
              <div className="detail-grid">
                <span>Client <strong>{selectedRequest.clientId}</strong></span>
                <span>Owner <strong>{selectedRequest.selectedOwnerId || 'not assigned'}</strong></span>
                <span>Vehicle <strong>{selectedRequest.selectedVehicleId || 'not assigned'}</strong></span>
                <span>Estimate <strong>{formatMoney(selectedRequest.quoteSnapshot?.currency, selectedRequest.quoteSnapshot?.totalEstimate)}</strong></span>
              </div>
              <div className="document-list">
                {eventsQuery.isError ? <p className="field-error">{getErrorMessage(eventsQuery.error)}</p> : null}
                {(eventsQuery.data ?? []).length === 0 ? <p className="muted">No status events returned yet.</p> : null}
                {(eventsQuery.data ?? []).map((event) => (
                  <div className="document-row document-row--static" key={event.id}>
                    <span>
                      <strong>{event.fromStatus ? `${event.fromStatus} to ${event.toStatus}` : event.toStatus}</strong>
                      <small>{event.actorRole || 'system'} / {event.actorUserId || 'no actor'}{event.reason ? ` / ${event.reason}` : ''}</small>
                    </span>
                    <em>{event.createdAt ? new Date(event.createdAt).toLocaleString() : 'pending time'}</em>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="muted">Select a request to inspect participants, estimate, and timeline.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function AdminAuditLogPanel({ enabled }: { enabled: boolean }) {
  const [actorUserId, setActorUserId] = useState('');
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [selectedLogId, setSelectedLogId] = useState('');

  const auditQuery = useQuery({
    enabled,
    queryKey: ['admin-audit-logs', actorUserId, action, targetType],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (actorUserId.trim()) {
        params.set('actorUserId', actorUserId.trim());
      }

      if (action.trim()) {
        params.set('action', action.trim());
      }

      if (targetType.trim()) {
        params.set('targetType', targetType.trim());
      }

      const suffix = params.toString() ? `?${params.toString()}` : '';
      return ((await kuliApi.request(`/admin/audit-logs${suffix}`)) as ApiEnvelope<AuditLogRecord[]>).data;
    }
  });

  const logs = auditQuery.data ?? [];
  const selectedLog = logs.find((log) => log.id === selectedLogId) ?? logs[0];

  useEffect(() => {
    if (!selectedLogId && logs[0]) {
      setSelectedLogId(logs[0].id);
    }
  }, [logs, selectedLogId]);

  if (!enabled) {
    return null;
  }

  return (
    <section className="panel panel--wide">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Audit viewer</p>
          <h2>Append-only admin trail</h2>
        </div>
        <StatusBadge tone={auditQuery.isError ? 'blocked' : 'ready'}>{auditQuery.isError ? 'Needs token' : `${logs.length} logs`}</StatusBadge>
      </div>
      {auditQuery.isError ? <p className="field-error">{getErrorMessage(auditQuery.error)}</p> : null}
      <div className="support-toolbar support-toolbar--triple">
        <label>
          Actor user id
          <input onChange={(event) => setActorUserId(event.target.value)} placeholder="usr_..." value={actorUserId} />
        </label>
        <label>
          Action
          <input onChange={(event) => setAction(event.target.value)} placeholder="vehicle.verification" value={action} />
        </label>
        <label>
          Target type
          <input onChange={(event) => setTargetType(event.target.value)} placeholder="vehicle, report, payment" value={targetType} />
        </label>
      </div>
      <div className="split-panel">
        <div className="queue-list">
          {logs.length === 0 ? <p className="muted">No audit logs match the filters.</p> : null}
          {logs.map((log) => (
            <button
              className={`queue-item ${selectedLog?.id === log.id ? 'is-selected' : ''}`}
              key={log.id}
              onClick={() => setSelectedLogId(log.id)}
              type="button"
            >
              <strong>{log.action}</strong>
              <span>{log.targetType || 'target'} / {log.targetId || 'no target id'}</span>
              <StatusBadge tone={log.actorRole === 'admin' ? 'warn' : 'muted'}>{log.actorRole || 'system'}</StatusBadge>
            </button>
          ))}
        </div>
        <div className="decision-panel">
          {selectedLog ? (
            <>
              <div className="detail-heading">
                <div>
                  <h3>{selectedLog.action}</h3>
                  <p className="muted">{selectedLog.createdAt ? new Date(selectedLog.createdAt).toLocaleString() : 'No timestamp'}</p>
                </div>
                <StatusBadge tone="muted">{selectedLog.targetType || 'target'}</StatusBadge>
              </div>
              <div className="detail-grid">
                <span>Actor <strong>{selectedLog.actorUserId || 'system'}</strong></span>
                <span>Role <strong>{selectedLog.actorRole || 'system'}</strong></span>
                <span>Target <strong>{selectedLog.targetId || 'none'}</strong></span>
              </div>
              <pre className="metadata-block">{JSON.stringify(selectedLog.metadata ?? {}, null, 2)}</pre>
            </>
          ) : (
            <p className="muted">Select a log to inspect metadata.</p>
          )}
        </div>
      </div>
    </section>
  );
}

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
            <p className="eyebrow">Frontend Phase 7</p>
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
          <AdminDashboardPanel enabled={profile.role === 'admin'} />
          <AssistantSupportPanel enabled={profile.role === 'assistant'} profile={profile} />
          <AdminVerificationPanel enabled={profile.role === 'admin'} />
          <AdminVehicleClassesPanel enabled={profile.role === 'admin'} />
          <AdminPricingPanel enabled={profile.role === 'admin'} />
          <AdminTrustFinancePanel enabled={profile.role === 'admin'} />
          <AdminTripOversightPanel enabled={profile.role === 'admin'} />
          <AdminUsersPanel enabled={profile.role === 'admin'} />
          <AdminAuditLogPanel enabled={profile.role === 'admin'} />
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
    clearDemoAccessToken();
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
