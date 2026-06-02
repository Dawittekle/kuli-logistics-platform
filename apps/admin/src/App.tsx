import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Eye,
  EyeOff,
  ExternalLink,
  FileCheck2,
  FileClock,
  FileSearch,
  FileText,
  FileWarning,
  FileX2,
  Gauge,
  History,
  Layers,
  LockKeyhole,
  LogOut,
  MapPin,
  Search,
  RefreshCw,
  ShieldCheck,
  Truck,
  UsersRound,
  X
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { runtimeConfig, runtimeReadiness } from './config/runtime';
import { clearSessionAccessToken, kuliApi, setSessionAccessToken } from './lib/api';
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

type FileMetadata = {
  id: string;
  originalFileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedSizeBytes?: number;
  status?: string;
  storageProvider?: string;
  visibility?: string;
  completedAt?: string;
};

type VehicleDocument = {
  id: string;
  type: string;
  fileId: string;
  status: string;
  file?: FileMetadata;
};

type DocumentPreview = {
  vehicleId: string;
  documentId: string;
  fileId: string;
  url: string;
  expiresInSeconds: number;
  file: FileMetadata;
};

type Vehicle = {
  id: string;
  ownerId: string;
  owner?: Pick<UserProfile, 'id' | 'fullName' | 'email' | 'phone' | 'accountStatus'>;
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
  activeTripId?: string;
  currentLocation?: {
    addressText?: string;
    point?: {
      coordinates?: [number, number];
    };
  };
  currentLocationUpdatedAt?: string;
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
  deletedAt?: string;
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
  createdByAssistantId?: string;
  hotlineTicketId?: string;
  clientContactSnapshot?: {
    fullName?: string;
    phone?: string;
    email?: string;
  };
  quoteSnapshot?: {
    currency?: string;
    totalEstimate?: number;
  };
  payment?: PaymentRecord;
  createdAt?: string;
  updatedAt?: string;
};

type NotificationRecord = {
  id: string;
  recipientUserId: string;
  type: string;
  title: string;
  body?: string;
  deliveryStatus: 'pending' | 'read' | 'sent' | 'failed';
  data?: Record<string, unknown>;
  createdAt?: string;
};

type AssistantDashboardMetrics = {
  tickets: {
    total: number;
    open: number;
    assigned: number;
    inProgress: number;
    pendingClient: number;
  };
  requests: {
    total: number;
    active: number;
    completed: number;
  };
  trucks: {
    total: number;
    online: number;
    busy: number;
    offline: number;
    pendingVerification: number;
  };
  notifications: {
    total: number;
    unread: number;
  };
};

type AssistantAssignmentResult = {
  request: KuliRequest;
  offer?: {
    id: string;
    requestId: string;
    vehicleId: string;
    ownerId: string;
    status: string;
  };
  assignment: {
    vehicleId: string;
    ownerId: string;
    status: string;
  };
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

type AdminPageKey = 'dashboard' | 'users' | 'verification' | 'vehicleClasses' | 'pricing' | 'reports' | 'payments' | 'kuliRequests' | 'audit';
type AssistantPageKey = 'dashboard' | 'booking' | 'tickets' | 'requests' | 'trucks' | 'clients' | 'notifications';

type AdminRouteItem = RouteItem & {
  page: AdminPageKey;
};

type AssistantRouteItem = RouteItem & {
  page: AssistantPageKey;
};

const roleLabels: Record<Role, string> = {
  client: 'Client',
  truck_owner: 'Truck owner',
  assistant: 'Assistant',
  admin: 'Admin'
};

const accountStatusOptions: AccountStatus[] = ['active', 'pending_verification', 'suspended', 'banned', 'deleted'];
const requestStatusOptions: KuliRequest['status'][] = ['pending', 'accepted', 'en_route_to_pickup', 'arrived_at_pickup', 'loading', 'in_transit', 'unloading', 'completed', 'cancelled', 'timed_out'];
const verificationStatusOptions: Vehicle['verificationStatus'][] = ['draft', 'pending', 'approved', 'rejected'];

const accountStatusLabels: Record<AccountStatus, string> = {
  active: 'Active',
  pending_verification: 'Pending verification',
  suspended: 'Suspended',
  banned: 'Banned',
  deleted: 'Deleted'
};

const verificationStatusLabels: Record<Vehicle['verificationStatus'], string> = {
  draft: 'Draft',
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected'
};

const availabilityStatusLabels: Record<string, string> = {
  offline: 'Offline',
  online_available: 'Online',
  busy_on_job: 'Busy on job',
  maintenance: 'Maintenance',
  suspended: 'Suspended'
};

const requestStatusLabels: Record<KuliRequest['status'], string> = {
  pending: 'Waiting for owner',
  accepted: 'Accepted',
  en_route_to_pickup: 'Heading to pickup',
  arrived_at_pickup: 'Arrived at pickup',
  loading: 'Loading',
  in_transit: 'In transit',
  unloading: 'Unloading',
  completed: 'Completed',
  cancelled: 'Cancelled',
  timed_out: 'Timed out'
};

const paymentStatusLabels: Record<PaymentRecord['status'], string> = {
  pending: 'Payment pending',
  confirmed_by_owner: 'Confirmed by owner',
  disputed: 'Disputed',
  resolved: 'Resolved',
  cancelled: 'Cancelled',
  not_required: 'Not required'
};

const reportStatusLabels: Record<ReportRecord['status'], string> = {
  open: 'Open',
  under_review: 'Under review',
  awaiting_response: 'Awaiting response',
  resolved: 'Resolved',
  rejected: 'Rejected'
};

const auditActionLabels: Record<string, string> = {
  'vehicle.approved': 'Vehicle approved',
  'vehicle.rejected': 'Vehicle rejected',
  'vehicle.status_updated': 'Vehicle status updated',
  'vehicle.document_attached': 'Vehicle document attached',
  'file.signed_url.created': 'File preview created',
  'file_signed_url_created': 'File preview created',
  'vehicle.document.preview_url.created': 'Vehicle document preview created',
  'pricing_rule.created': 'Pricing rule created',
  'pricing_rule.activated': 'Pricing rule activated',
  'report.resolved': 'Report resolved',
  'payment.resolved': 'Payment resolved',
  'user.status_updated': 'User status updated'
};

const adminRoutes: AdminRouteItem[] = [
  { path: '/admin/dashboard', page: 'dashboard', label: 'Dashboard', icon: Gauge, detail: 'Operational metrics and release readiness.' },
  { path: '/admin/users', page: 'users', label: 'Users', icon: UsersRound, detail: 'Role, status, and account controls.' },
  { path: '/admin/verification', page: 'verification', label: 'Verification', icon: Truck, detail: 'Document review and approve/reject decisions.' },
  { path: '/admin/vehicle-classes', page: 'vehicleClasses', label: 'Vehicle Classes', icon: Truck, detail: 'Capacity bands used by onboarding, pricing, and matching.' },
  { path: '/admin/pricing', page: 'pricing', label: 'Pricing', icon: ClipboardList, detail: 'Versioned pricing rules and audit-backed edits.' },
  { path: '/admin/reports', page: 'reports', label: 'Reports', icon: FileWarning, detail: 'Trip reports, evidence links, and admin outcomes.' },
  { path: '/admin/payments', page: 'payments', label: 'Payments', icon: CreditCard, detail: 'Cash confirmations, disputes, and resolution notes.' },
  { path: '/admin/kuli-requests', page: 'kuliRequests', label: 'KULI Requests', icon: MapPin, detail: 'Marketplace request oversight and status timelines.' },
  { path: '/admin/audit', page: 'audit', label: 'Audit', icon: ShieldCheck, detail: 'Privileged action trail and filters.' }
];

const assistantRoutes: AssistantRouteItem[] = [
  { path: '/assistant/dashboard', page: 'dashboard', label: 'Dashboard', icon: Gauge, detail: 'Live call-center queues, trucks, requests, and alerts.' },
  { path: '/assistant/bookings/new', page: 'booking', label: 'New booking', icon: Truck, detail: 'Create assisted KULI requests during live calls.' },
  { path: '/assistant/tickets', page: 'tickets', label: 'Tickets', icon: ClipboardList, detail: 'Claim, update, and close hotline tickets.' },
  { path: '/assistant/requests', page: 'requests', label: 'Requests', icon: MapPin, detail: 'Track assisted KULI requests and support timelines.' },
  { path: '/assistant/trucks', page: 'trucks', label: 'Available trucks', icon: Truck, detail: 'Find approved online trucks and assign them to waiting requests.' },
  { path: '/assistant/clients', page: 'clients', label: 'Clients', icon: UsersRound, detail: 'Find clients by phone, email, or name.' },
  { path: '/assistant/notifications', page: 'notifications', label: 'Notifications', icon: Bell, detail: 'Review assistant alerts and mark updates read.' }
];

const routeAliases: Record<string, string> = {
  '/': '/admin/dashboard',
  '/admin': '/admin/dashboard',
  '/admin/vehicles/pending': '/admin/verification',
  '/admin/audit-logs': '/admin/audit',
  '/assistant': '/assistant/dashboard'
};

const normalizeWorkspacePath = (pathname: string, routes: RouteItem[]) => {
  const withoutTrailingSlash = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const canonicalPath = routeAliases[withoutTrailingSlash] ?? withoutTrailingSlash;
  const match = routes.find((route) => route.path === canonicalPath);

  return match?.path ?? routes[0]?.path ?? '/admin/dashboard';
};

const isBlockedStatus = (status: AccountStatus) => ['suspended', 'banned', 'deleted'].includes(status);

const createIdempotencyKey = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const humanize = (value?: string) => {
  if (!value) {
    return 'Not set';
  }

  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
};

const humanRole = (role?: Role | 'system') => (role ? roleLabels[role as Role] ?? humanize(role) : 'System');
const humanAccountStatus = (status?: AccountStatus) => (status ? accountStatusLabels[status] : 'Unknown');
const humanVerificationStatus = (status?: Vehicle['verificationStatus']) => (status ? verificationStatusLabels[status] : 'Unknown');
const humanAvailabilityStatus = (status?: string) => (status ? availabilityStatusLabels[status] ?? humanize(status) : 'Unknown');
const humanRequestStatus = (status?: KuliRequest['status']) => (status ? requestStatusLabels[status] : 'Unknown');
const humanPaymentStatus = (status?: PaymentRecord['status']) => (status ? paymentStatusLabels[status] : 'Unknown');
const humanReportStatus = (status?: ReportRecord['status']) => (status ? reportStatusLabels[status] : 'Unknown');
const humanAuditAction = (action?: string) => (action ? auditActionLabels[action] ?? humanize(action) : 'Unknown action');

const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString() : 'Not recorded');
const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : 'Not recorded');
const formatFileSize = (bytes?: number) => {
  if (!bytes || bytes <= 0) {
    return 'Size unknown';
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
const canRenderSignedUrl = (url?: string) => Boolean(url && /^(https?:|blob:|data:|file:)/.test(url));

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
};

const fetchProfileForSession = async (session: Session) => {
  setSessionAccessToken(session.access_token);

  try {
    const profile = (await kuliApi.me()) as ApiEnvelope<UserProfile>;
    return profile.data;
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

function StatusBadge({ tone, children }: { tone: 'ready' | 'warn' | 'blocked' | 'muted'; children: ReactNode }) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>;
}

function MetricCard({ icon: Icon, label, value, tone, helper }: { icon: typeof Gauge; label: string; value: ReactNode; tone: 'ready' | 'warn' | 'blocked' | 'muted'; helper: string }) {
  return (
    <div className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__icon">
        <Icon aria-hidden="true" size={18} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="info-pill">
      {label}
      <strong>{value}</strong>
    </span>
  );
}

function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="page-intro">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="muted">{description}</p>
      </div>
      {action ? <div className="page-intro__action">{action}</div> : null}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tone, helper }: { icon: typeof Gauge; label: string; value: ReactNode; tone: 'ready' | 'warn' | 'blocked' | 'muted'; helper?: string }) {
  return (
    <div className="summary-card">
      <span className={`summary-card__icon summary-card__icon--${tone}`}>
        <Icon aria-hidden="true" size={18} />
      </span>
      <span>{label}</span>
      <strong>{value}</strong>
      {helper ? <p>{helper}</p> : null}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <ClipboardList aria-hidden="true" size={24} />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function DocumentReviewCard({
  document,
  onPreview,
  isPreviewing
}: {
  document: VehicleDocument;
  onPreview: (document: VehicleDocument) => void;
  isPreviewing: boolean;
}) {
  const tone = document.status === 'approved' ? 'ready' : document.status === 'rejected' ? 'blocked' : 'warn';
  const fileName = document.file?.originalFileName || document.fileId;
  const mimeType = document.file?.mimeType || 'File type unknown';
  const fileSize = formatFileSize(document.file?.uploadedSizeBytes ?? document.file?.sizeBytes);

  return (
    <div className="document-review-card">
      <span className="document-review-card__icon">
        <FileSearch aria-hidden="true" size={20} />
      </span>
      <span className="document-review-card__body">
        <strong>{humanize(document.type)}</strong>
        <small>{fileName}</small>
        <em>{mimeType} / {fileSize}</em>
      </span>
      <span className="document-review-card__actions">
        <StatusBadge tone={tone}>{humanize(document.status)}</StatusBadge>
        <button className="secondary-action secondary-action--compact" disabled={isPreviewing} onClick={() => onPreview(document)} type="button">
          <FileSearch aria-hidden="true" size={15} />
          {isPreviewing ? 'Preparing...' : 'Preview'}
        </button>
      </span>
    </div>
  );
}

function DocumentPreviewModal({ preview, onClose }: { preview: DocumentPreview; onClose: () => void }) {
  const mimeType = preview.file.mimeType ?? '';
  const fileName = preview.file.originalFileName ?? preview.fileId;
  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  const renderableUrl = canRenderSignedUrl(preview.url);

  return (
    <div className="preview-modal" role="dialog" aria-modal="true" aria-label="Document preview">
      <div className="preview-modal__panel">
        <div className="preview-modal__header">
          <div>
            <p className="eyebrow">Secure preview</p>
            <h3>{fileName}</h3>
            <p className="muted">{mimeType || 'Unknown file type'} / expires in {preview.expiresInSeconds}s</p>
          </div>
          <button className="preview-modal__close" onClick={onClose} type="button" aria-label="Close preview">
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="preview-modal__body">
          {isImage && renderableUrl ? <img alt={fileName} src={preview.url} /> : null}
          {isPdf && renderableUrl ? <iframe src={preview.url} title={fileName} /> : null}
          {!((isImage || isPdf) && renderableUrl) ? (
            <div className="preview-modal__fallback">
              <FileText aria-hidden="true" size={32} />
              <strong>{preview.file.storageProvider === 'local_dev' ? 'Local development preview' : 'Open document'}</strong>
              <p>
                {preview.file.storageProvider === 'local_dev'
                  ? 'The backend returned protected local-dev metadata. Configure Supabase Storage or S3-compatible object storage to render binary previews in the browser.'
                  : 'This file type cannot be rendered inline. Open it with the signed URL.'}
              </p>
            </div>
          ) : null}
        </div>
        <div className="preview-modal__footer">
          <span>{preview.file.storageProvider || 'storage'} / {formatFileSize(preview.file.uploadedSizeBytes ?? preview.file.sizeBytes)}</span>
          <button
            className="icon-button"
            onClick={() => window.open(preview.url, '_blank', 'noopener,noreferrer')}
            type="button"
          >
            <ExternalLink aria-hidden="true" size={16} />
            Open signed URL
          </button>
        </div>
      </div>
    </div>
  );
}

function TimelineEventRow({ event }: { event: StatusEvent }) {
  return (
    <div className="timeline-row">
      <span className="timeline-row__dot" aria-hidden="true" />
      <div>
        <strong>{event.fromStatus ? `${humanRequestStatus(event.fromStatus)} to ${humanRequestStatus(event.toStatus)}` : humanRequestStatus(event.toStatus)}</strong>
        <small>{humanRole(event.actorRole)}{event.actorUserId ? ` / ${event.actorUserId}` : ''}{event.reason ? ` / ${event.reason}` : ''}</small>
      </div>
      <time>{formatDateTime(event.createdAt)}</time>
    </div>
  );
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
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const normalizedEmail = email.trim().toLowerCase();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const canSubmit = emailValid && password.length > 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (!canSubmit || pending) {
      return;
    }

    setPending(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      if (authError) {
        throw authError;
      }

      if (!data.session) {
        throw new Error('No staff session was returned. Check Supabase email confirmation settings.');
      }

      const profile = await fetchProfileForSession(data.session);
      onAuthenticated(profile, data.session);
    } catch (loginError) {
      setError(getErrorMessage(loginError));
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-brand" aria-label="KULI staff login context">
        <p className="eyebrow">KULI Operations</p>
        <h1>Control verified truck logistics.</h1>
        <p>Review vehicles, protect users, tune pricing, and keep Addis Ababa moves accountable from one staff console.</p>
      </section>
      <form className="login-panel" onSubmit={submit}>
        <div>
          <p className="eyebrow">Staff sign in</p>
          <h2>Welcome back.</h2>
        </div>
        <label>
          Email
          <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder="admin@kuli.local" type="email" value={email} />
        </label>
        <label>
          Password
          <span className="password-field">
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 6 characters"
              type={passwordVisible ? 'text' : 'password'}
              value={password}
            />
            <button
              aria-label={passwordVisible ? 'Hide password' : 'Show password'}
              className="password-field__toggle"
              onClick={() => setPasswordVisible((visible) => !visible)}
              type="button"
            >
              {passwordVisible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
            </button>
          </span>
        </label>
        {error ? <p className="field-error" role="alert">{error}</p> : null}
        <button className="icon-button" disabled={!canSubmit || pending} type="submit">
          <LockKeyhole aria-hidden="true" size={18} />
          {pending ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="muted">Staff accounts are provisioned by an administrator. Clients and truck owners use the mobile app.</p>
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
    { label: 'Users', value: metrics?.usersTotal ?? 0, tone: 'ready' as const, icon: UsersRound, helper: 'Registered profiles' },
    { label: 'Active trips', value: metrics?.activeRequests ?? 0, tone: metrics?.activeRequests ? 'warn' as const : 'ready' as const, icon: MapPin, helper: 'Moving or waiting' },
    { label: 'Pending vehicles', value: metrics?.pendingVehicles ?? 0, tone: metrics?.pendingVehicles ? 'warn' as const : 'ready' as const, icon: Truck, helper: 'Need document review' },
    { label: 'Open reports', value: metrics?.openReports ?? 0, tone: metrics?.openReports ? 'blocked' as const : 'ready' as const, icon: FileWarning, helper: 'Trust queue' },
    { label: 'Disputed payments', value: metrics?.disputedPayments ?? 0, tone: metrics?.disputedPayments ? 'blocked' as const : 'ready' as const, icon: CircleDollarSign, helper: 'Manual cash review' },
    { label: 'Open tickets', value: metrics?.openTickets ?? 0, tone: metrics?.openTickets ? 'warn' as const : 'ready' as const, icon: ClipboardList, helper: 'Assistant follow-up' },
    { label: 'Unread alerts', value: metrics?.unreadNotifications ?? 0, tone: metrics?.unreadNotifications ? 'warn' as const : 'ready' as const, icon: Bell, helper: 'Operational updates' }
  ];
  const readiness = readinessQuery.data;
  const hardeningChecks = readiness ? Object.entries(readiness.checks) : [];
  const pendingWork = [
    { label: 'Vehicle approvals', value: metrics?.pendingVehicles ?? 0, helper: 'Documents waiting for review', tone: (metrics?.pendingVehicles ?? 0) > 0 ? 'warn' as const : 'ready' as const },
    { label: 'Open trust reports', value: metrics?.openReports ?? 0, helper: 'Reports needing mediation', tone: (metrics?.openReports ?? 0) > 0 ? 'blocked' as const : 'ready' as const },
    { label: 'Payment disputes', value: metrics?.disputedPayments ?? 0, helper: 'Manual cash cases', tone: (metrics?.disputedPayments ?? 0) > 0 ? 'blocked' as const : 'ready' as const },
    { label: 'Hotline tickets', value: metrics?.openTickets ?? 0, helper: 'Assistant follow-up queue', tone: (metrics?.openTickets ?? 0) > 0 ? 'warn' as const : 'ready' as const }
  ];

  return (
    <>
      <PageIntro
        eyebrow="Operations overview"
        title="Admin dashboard"
        description="Monitor platform health, active marketplace queues, and release readiness from one focused overview."
        action={(
          <button className="icon-button" type="button" onClick={() => {
            metricsQuery.refetch();
            readinessQuery.refetch();
          }}>
            <RefreshCw aria-hidden="true" size={18} />
            Refresh
          </button>
        )}
      />
      {metricsQuery.isError ? <p className="field-error">{getErrorMessage(metricsQuery.error)}</p> : null}
      {readinessQuery.isError ? <p className="field-error">{getErrorMessage(readinessQuery.error)}</p> : null}
      <section className="panel panel--wide">
        <div className="dashboard-hero">
          <div>
            <p className="eyebrow">Live control room</p>
            <h3>Queues, readiness, and operational risk</h3>
            <p className="muted">Metrics come from backend admin endpoints. Nothing on this dashboard is hard-coded.</p>
          </div>
          <div className="hero-status-stack">
            <StatusBadge tone={readiness?.runtime.ok ? 'ready' : 'blocked'}>{readiness?.runtime.ok ? 'Runtime ready' : 'Runtime review'}</StatusBadge>
            <StatusBadge tone={metricsQuery.isFetching || readinessQuery.isFetching ? 'warn' : 'ready'}>{metricsQuery.isFetching || readinessQuery.isFetching ? 'Refreshing' : 'Current'}</StatusBadge>
          </div>
        </div>
        <div className="metric-board" aria-label="Admin dashboard metrics">
          {metricRows.map((metric) => (
            <MetricCard icon={metric.icon} key={metric.label} label={metric.label} value={metric.value} tone={metric.tone} helper={metric.helper} />
          ))}
        </div>
      </section>
      <section className="dashboard-structure panel--wide">
        <div className="dashboard-structure__main">
          <div className="panel">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Live queues</p>
                <h2>Pending work preview</h2>
              </div>
              <StatusBadge tone={pendingWork.some((item) => item.value > 0) ? 'warn' : 'ready'}>
                {pendingWork.reduce((total, item) => total + Number(item.value), 0)} items
              </StatusBadge>
            </div>
            <div className="work-preview-list">
              {pendingWork.map((item) => (
                <div className="work-preview-row" key={item.label}>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.helper}</small>
                  </span>
                  <StatusBadge tone={item.tone}>{item.value}</StatusBadge>
                </div>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Runtime hardening</p>
                <h2>Release checklist</h2>
              </div>
              <StatusBadge tone={hardeningChecks.every(([, ok]) => ok) ? 'ready' : 'blocked'}>{hardeningChecks.every(([, ok]) => ok) ? 'Passing' : 'Review'}</StatusBadge>
            </div>
            <div className="runtime-list">
              {hardeningChecks.map(([key, ok]) => (
                <div className="runtime-row" key={key}>
                  <span>{humanize(key.replaceAll(/([A-Z])/g, ' $1').trim())}</span>
                  <StatusBadge tone={ok ? 'ready' : 'blocked'}>{ok ? 'Pass' : 'Fail'}</StatusBadge>
                </div>
              ))}
            </div>
          </div>
        </div>
        <aside className="dashboard-structure__side">
          <ApiHealthPanel />
          <RuntimePanel />
          <div className="panel">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Environment</p>
                <h2>Runtime checks</h2>
              </div>
              <StatusBadge tone={readiness?.runtime.ok ? 'ready' : 'blocked'}>{readiness?.runtime.ok ? 'Ready' : 'Review'}</StatusBadge>
            </div>
            <div className="runtime-list">
              {(readiness?.runtime.checks ?? []).map((check) => (
                <div className="runtime-row" key={check.id}>
                  <span>{check.message}</span>
                  <StatusBadge tone={check.ok ? 'ready' : check.severity === 'error' ? 'blocked' : 'warn'}>{check.ok ? 'Pass' : humanize(check.severity)}</StatusBadge>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </>
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
  const activeUsers = users.filter((user) => user.accountStatus === 'active').length;
  const staffUsers = users.filter((user) => user.role === 'admin' || user.role === 'assistant').length;
  const ownerUsers = users.filter((user) => user.role === 'truck_owner').length;

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

      setMessage(`${result.data.fullName || result.data.email || result.data.id} moved to ${humanAccountStatus(result.data.accountStatus)}.`);
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (statusError) {
      setError(getErrorMessage(statusError));
    } finally {
      setPendingStatus(false);
    }
  };

  return (
    <>
      <PageIntro
        eyebrow="Identity and access"
        title="User management"
        description="Search profiles, inspect account details, and update account status with backend authorization."
        action={<StatusBadge tone={usersQuery.isSuccess ? 'ready' : usersQuery.isError ? 'blocked' : 'warn'}>{usersQuery.isSuccess ? `${usersQuery.data.length} records` : usersQuery.isError ? 'Needs token' : 'Loading'}</StatusBadge>}
      />
      {usersQuery.isError ? <p className="field-error">{getErrorMessage(usersQuery.error)}</p> : null}
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      {message ? <p className="muted">{message}</p> : null}
      <section className="summary-grid panel--wide" aria-label="User summary">
        <SummaryCard icon={UsersRound} label="Total users" value={users.length} tone="ready" helper="All marketplace profiles" />
        <SummaryCard icon={CheckCircle2} label="Active users" value={activeUsers} tone="ready" helper="Allowed to operate" />
        <SummaryCard icon={ShieldCheck} label="Staff" value={staffUsers} tone={staffUsers ? 'warn' : 'muted'} helper="Admin and assistant profiles" />
        <SummaryCard icon={Truck} label="Truck owners" value={ownerUsers} tone="ready" helper="Supply-side accounts" />
      </section>
      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Directory</p>
            <h2>Profiles and access state</h2>
          </div>
          <button className="secondary-action" type="button" onClick={() => usersQuery.refetch()}>
            <RefreshCw aria-hidden="true" size={16} />
            Refresh
          </button>
        </div>
        <div className="support-toolbar support-toolbar--triple">
          <label>
            Role
            <select onChange={(event) => setRoleFilter(event.target.value as Role | '')} value={roleFilter}>
              <option value="">All roles</option>
              {Object.entries(roleLabels).map(([role, label]) => (
                <option key={role} value={role}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select onChange={(event) => setStatusFilter(event.target.value as AccountStatus | '')} value={statusFilter}>
              <option value="">All statuses</option>
              {accountStatusOptions.map((status) => (
                <option key={status} value={status}>{humanAccountStatus(status)}</option>
              ))}
            </select>
          </label>
          <label>
            Search
            <span className="input-with-icon">
              <Search aria-hidden="true" size={16} />
              <input onChange={(event) => setSearch(event.target.value)} placeholder="Name, email, phone, id" value={search} />
            </span>
          </label>
        </div>
        <div className="management-layout">
          <div className="data-table" role="table" aria-label="Admin users">
            <div className="data-row data-row--head" role="row">
              <span>Name</span>
              <span>Role</span>
              <span>Status</span>
              <span>Contact</span>
            </div>
            {filteredUsers.length === 0 ? <EmptyState title="No users found" description="Try a different role, status, or search term." /> : null}
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
                <StatusBadge tone={user.accountStatus === 'active' ? 'ready' : isBlockedStatus(user.accountStatus) ? 'blocked' : 'warn'}>{humanAccountStatus(user.accountStatus)}</StatusBadge>
                <span>{user.email || user.phone || 'No contact'}</span>
              </button>
            ))}
          </div>

          <aside className="inspector-panel" aria-label="Selected user details">
            <div className="detail-heading">
              <div>
                <p className="eyebrow">Account inspector</p>
                <h3>{detailQuery.data?.fullName || selectedUser?.fullName || 'Select a user'}</h3>
                <p className="muted">{detailQuery.data?.email || detailQuery.data?.phone || selectedUser?.id || 'Open a row to inspect account state.'}</p>
              </div>
              {selectedUser ? <StatusBadge tone={selectedUser.accountStatus === 'active' ? 'ready' : isBlockedStatus(selectedUser.accountStatus) ? 'blocked' : 'warn'}>{humanAccountStatus(selectedUser.accountStatus)}</StatusBadge> : null}
            </div>
            {detailQuery.isError ? <p className="field-error">{getErrorMessage(detailQuery.error)}</p> : null}
            {selectedUser ? (
              <>
                <div className="info-strip">
                  <InfoPill label="Role" value={roleLabels[selectedUser.role]} />
                  <InfoPill label="Created" value={formatDate(selectedUser.createdAt)} />
                </div>
                <div className="support-toolbar">
                  <label>
                    Account status
                    <select onChange={(event) => setNextStatus(event.target.value as AccountStatus)} value={nextStatus}>
                      {accountStatusOptions.map((status) => (
                        <option key={status} value={status}>{humanAccountStatus(status)}</option>
                      ))}
                    </select>
                  </label>
                  <button className="icon-button" disabled={pendingStatus || selectedUser.accountStatus === nextStatus} onClick={updateStatus} type="button">
                    {pendingStatus ? 'Updating...' : 'Update status'}
                  </button>
                </div>
              </>
            ) : null}
          </aside>
        </div>
      </section>
    </>
  );
}

function AdminVerificationPanel({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<Vehicle['verificationStatus'] | ''>('pending');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [previewingDocumentId, setPreviewingDocumentId] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [preview, setPreview] = useState<DocumentPreview | null>(null);
  const [decisionError, setDecisionError] = useState('');
  const [pendingDecision, setPendingDecision] = useState(false);

  const vehiclesQuery = useQuery({
    enabled,
    queryKey: ['admin-vehicles', verificationFilter, vehicleSearch],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (verificationFilter) {
        params.set('verificationStatus', verificationFilter);
      }

      if (vehicleSearch.trim()) {
        params.set('search', vehicleSearch.trim());
      }

      const suffix = params.toString() ? `?${params.toString()}` : '';
      return ((await kuliApi.request(`/admin/vehicles${suffix}`)) as ApiEnvelope<Vehicle[]>).data;
    }
  });

  const allVehiclesQuery = useQuery({
    enabled,
    queryKey: ['admin-vehicles', 'summary'],
    queryFn: async () => ((await kuliApi.request('/admin/vehicles')) as ApiEnvelope<Vehicle[]>).data
  });

  const visibleVehicles = vehiclesQuery.data ?? [];
  const selectedVehicle = selectedVehicleId || visibleVehicles[0]?.id || '';

  const vehicleDetailQuery = useQuery({
    enabled: enabled && Boolean(selectedVehicle),
    queryKey: ['admin-vehicles', selectedVehicle],
    queryFn: async () => ((await kuliApi.request(`/admin/vehicles/${selectedVehicle}`)) as ApiEnvelope<Vehicle>).data
  });

  const ownerDetailQuery = useQuery({
    enabled: enabled && Boolean(vehicleDetailQuery.data?.ownerId),
    queryKey: ['admin-users', vehicleDetailQuery.data?.ownerId],
    queryFn: async () => ((await kuliApi.request(`/admin/users/${vehicleDetailQuery.data?.ownerId}`)) as ApiEnvelope<UserProfile>).data
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
      await queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    } catch (error) {
      setDecisionError(getErrorMessage(error));
    } finally {
      setPendingDecision(false);
    }
  };

  const previewDocument = async (document: VehicleDocument) => {
    if (!detail) {
      setPreviewError('Select a vehicle before previewing documents.');
      return;
    }

    setPreviewingDocumentId(document.id);
    setPreviewError('');

    try {
      const result = (await kuliApi.request(`/admin/vehicles/${detail.id}/documents/${document.id}/preview-url`)) as ApiEnvelope<DocumentPreview>;
      setPreview(result.data);
    } catch (error) {
      setPreviewError(getErrorMessage(error));
    } finally {
      setPreviewingDocumentId('');
    }
  };

  const detail = vehicleDetailQuery.data;
  const allVehicles = allVehiclesQuery.data ?? [];
  const summary = verificationStatusOptions.reduce<Record<Vehicle['verificationStatus'], number>>((counts, status) => {
    counts[status] = allVehicles.filter((vehicle) => vehicle.verificationStatus === status).length;
    return counts;
  }, { draft: 0, pending: 0, approved: 0, rejected: 0 });
  const requiredDocumentTypes = ['identity', 'driver_license', 'vehicle_registration', 'ownership_proof', 'insurance'];
  const owner = ownerDetailQuery.data;

  return (
    <>
      <PageIntro
        eyebrow="Vehicle verification"
        title="Review submitted trucks"
        description="Work through owner applications with document evidence, owner context, and audit-backed decisions."
        action={<StatusBadge tone={vehiclesQuery.isError ? 'blocked' : summary.pending ? 'warn' : 'ready'}>{vehiclesQuery.isError ? 'Needs token' : `${summary.pending} pending`}</StatusBadge>}
      />
      {vehiclesQuery.isError ? <p className="field-error">{getErrorMessage(vehiclesQuery.error)}</p> : null}
      {allVehiclesQuery.isError ? <p className="field-error">{getErrorMessage(allVehiclesQuery.error)}</p> : null}
      <section className="summary-grid panel--wide" aria-label="Vehicle verification summary">
        <SummaryCard icon={FileClock} label="Pending review" value={summary.pending} tone={summary.pending ? 'warn' : 'ready'} helper="Awaiting admin decision" />
        <SummaryCard icon={FileCheck2} label="Approved" value={summary.approved} tone="ready" helper="Allowed to go online" />
        <SummaryCard icon={FileX2} label="Rejected" value={summary.rejected} tone={summary.rejected ? 'blocked' : 'muted'} helper="Returned with reason" />
        <SummaryCard icon={FileText} label="Drafts" value={summary.draft} tone={summary.draft ? 'warn' : 'muted'} helper="Not submitted yet" />
      </section>
      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Review workbench</p>
            <h2>Queue and decision detail</h2>
          </div>
          <button className="secondary-action" type="button" onClick={() => {
            vehiclesQuery.refetch();
            allVehiclesQuery.refetch();
          }}>
            <RefreshCw aria-hidden="true" size={16} />
            Refresh
          </button>
        </div>
        <div className="support-toolbar support-toolbar--triple">
          <label>
            Verification status
            <select onChange={(event) => {
              setVerificationFilter(event.target.value as Vehicle['verificationStatus'] | '');
              setSelectedVehicleId('');
              setPreview(null);
              setPreviewError('');
            }} value={verificationFilter}>
              <option value="">All statuses</option>
              {verificationStatusOptions.map((status) => (
                <option key={status} value={status}>{humanVerificationStatus(status)}</option>
              ))}
            </select>
          </label>
          <label>
            Search
            <span className="input-with-icon">
              <Search aria-hidden="true" size={16} />
              <input onChange={(event) => setVehicleSearch(event.target.value)} placeholder="Plate, owner, description" value={vehicleSearch} />
            </span>
          </label>
          <label>
            Queue state
            <span className="input-static">{vehiclesQuery.isFetching ? 'Refreshing queue' : `${visibleVehicles.length} visible vehicles`}</span>
          </label>
        </div>
        <div className="review-workbench">
          <div className="queue-list queue-list--sticky" aria-label="Vehicle verification queue">
            <p className="eyebrow">Vehicle list</p>
            {visibleVehicles.length === 0 ? <EmptyState title="No vehicles found" description="Try another status or search term." /> : null}
            {visibleVehicles.map((vehicle) => (
              <button
                className={`queue-item ${selectedVehicle === vehicle.id ? 'is-selected' : ''}`}
                key={vehicle.id}
                onClick={() => {
                  setSelectedVehicleId(vehicle.id);
                  setDecisionError('');
                  setPreviewError('');
                  setPreview(null);
                }}
                type="button"
              >
                <strong>{vehicle.licensePlate}</strong>
                <span>{vehicle.vehicleClassSnapshot?.name || 'Vehicle class'} / {vehicle.capacityKg ?? 0}kg / {humanAvailabilityStatus(vehicle.availabilityStatus)}</span>
                <StatusBadge tone={vehicle.verificationStatus === 'approved' ? 'ready' : vehicle.verificationStatus === 'rejected' ? 'blocked' : 'warn'}>{humanVerificationStatus(vehicle.verificationStatus)}</StatusBadge>
              </button>
            ))}
          </div>

          <div className="verification-detail">
            {detail ? (
              <>
                <div className="vehicle-summary-card">
                  <div>
                    <p className="eyebrow">Vehicle detail</p>
                    <h3>{detail.licensePlate}</h3>
                    <p className="muted">{detail.description || 'No owner notes submitted.'}</p>
                  </div>
                  <StatusBadge tone={detail.verificationStatus === 'pending' ? 'warn' : detail.verificationStatus === 'approved' ? 'ready' : 'blocked'}>
                    {humanVerificationStatus(detail.verificationStatus)}
                  </StatusBadge>
                  <div className="info-strip info-strip--four">
                    <InfoPill label="Class" value={detail.vehicleClassSnapshot?.name || 'Vehicle'} />
                    <InfoPill label="Capacity" value={`${detail.capacityKg ?? 0}kg`} />
                    <InfoPill label="Volume" value={`${detail.capacityCubicMeters ?? 0}m3`} />
                    <InfoPill label="Availability" value={humanAvailabilityStatus(detail.availabilityStatus)} />
                  </div>
                </div>
                <div className="owner-card">
                  <div>
                    <p className="eyebrow">Owner</p>
                    <h3>{owner?.fullName || owner?.email || detail.ownerId}</h3>
                    <p className="muted">{owner?.phone || owner?.email || 'Owner profile is loading or unavailable.'}</p>
                  </div>
                  <StatusBadge tone={owner?.accountStatus === 'active' ? 'ready' : owner?.accountStatus && isBlockedStatus(owner.accountStatus) ? 'blocked' : 'warn'}>
                    {owner?.accountStatus ? humanAccountStatus(owner.accountStatus) : 'Profile'}
                  </StatusBadge>
                </div>
                <div className="document-review-grid">
                  <div className="document-review-grid__header">
                    <div>
                      <p className="eyebrow">Documents</p>
                      <h3>Verification checklist</h3>
                    </div>
                    <StatusBadge tone={(detail.documents ?? []).length ? 'warn' : 'blocked'}>{(detail.documents ?? []).length} files</StatusBadge>
                  </div>
                  {requiredDocumentTypes.map((type) => {
                    const document = (detail.documents ?? []).find((doc) => doc.type === type);

                    return document ? (
                      <DocumentReviewCard document={document} isPreviewing={previewingDocumentId === document.id} key={type} onPreview={previewDocument} />
                    ) : (
                      <div className="document-review-card document-review-card--missing" key={type}>
                        <span className="document-review-card__icon">
                          <FileText aria-hidden="true" size={20} />
                        </span>
                        <span className="document-review-card__body">
                          <strong>{humanize(type)}</strong>
                          <small>Required document is not attached yet.</small>
                        </span>
                        <StatusBadge tone={type === 'insurance' ? 'muted' : 'blocked'}>{type === 'insurance' ? 'Optional' : 'Missing'}</StatusBadge>
                      </div>
                    );
                  })}
                </div>
                {previewError ? <p className="field-error" role="alert">{previewError}</p> : null}
                <div className="decision-card">
                  <div>
                    <p className="eyebrow">Decision</p>
                    <h3>Record admin outcome</h3>
                    <p className="muted">Approval unlocks normal availability rules. Rejection requires a clear owner-facing reason.</p>
                  </div>
                  <label className="decision-label">
                    Decision note
                    <textarea
                      onChange={(event) => setDecisionReason(event.target.value)}
                      placeholder="Required for rejection; useful for approval notes."
                      value={decisionReason}
                    />
                  </label>
                  {decisionError ? <p className="field-error" role="alert">{decisionError}</p> : null}
                  <div className="decision-actions">
                    <button className="icon-button" disabled={pendingDecision || detail.verificationStatus === 'approved'} onClick={() => decide('approved')} type="button">
                      Approve vehicle
                    </button>
                    <button className="danger-button" disabled={pendingDecision || detail.verificationStatus === 'rejected'} onClick={() => decide('rejected')} type="button">
                      Reject vehicle
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState title="Select a vehicle" description="Choose a queue item to inspect owner details, documents, and decision controls." />
            )}
          </div>
        </div>
      </section>
      {preview ? <DocumentPreviewModal preview={preview} onClose={() => setPreview(null)} /> : null}
    </>
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
    queryKey: ['admin-vehicle-classes'],
    queryFn: async () => ((await kuliApi.request('/admin/vehicle-classes')) as ApiEnvelope<VehicleClass[]>).data
  });

  const vehicleClasses = vehicleClassesQuery.data ?? [];
  const selectedClass = selectedClassId ? vehicleClasses.find((vehicleClass) => vehicleClass.id === selectedClassId) : undefined;
  const activeClasses = vehicleClasses.filter((vehicleClass) => vehicleClass.active !== false && !('deletedAt' in vehicleClass)).length;
  const inactiveClasses = vehicleClasses.length - activeClasses;

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
      await queryClient.invalidateQueries({ queryKey: ['admin-vehicle-classes'] });
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
      await queryClient.invalidateQueries({ queryKey: ['admin-vehicle-classes'] });
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setPendingAction('');
    }
  };

  return (
    <>
      <PageIntro
        eyebrow="Fleet configuration"
        title="Vehicle classes"
        description="Manage the truck categories used by onboarding, matching, and quote pricing."
        action={<StatusBadge tone={vehicleClassesQuery.isError ? 'blocked' : activeClasses ? 'ready' : 'warn'}>{vehicleClassesQuery.isError ? 'Needs token' : `${activeClasses} active`}</StatusBadge>}
      />
      {vehicleClassesQuery.isError ? <p className="field-error">{getErrorMessage(vehicleClassesQuery.error)}</p> : null}
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      {message ? <p className="muted">{message}</p> : null}
      <section className="summary-grid panel--wide" aria-label="Vehicle class summary">
        <SummaryCard icon={Truck} label="Active classes" value={activeClasses} tone="ready" helper="Available in owner/client flows" />
        <SummaryCard icon={Layers} label="Inactive classes" value={inactiveClasses} tone={inactiveClasses ? 'warn' : 'muted'} helper="Hidden from public selectors" />
        <SummaryCard icon={CircleDollarSign} label="Pricing defaults" value={vehicleClasses.filter((item) => item.defaultPricing).length} tone="ready" helper="Seed values for rule drafts" />
      </section>
      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Class workbench</p>
            <h2>Library and editor</h2>
          </div>
          <button className="secondary-action" type="button" onClick={() => vehicleClassesQuery.refetch()}>
            <RefreshCw aria-hidden="true" size={16} />
            Refresh
          </button>
        </div>
        <div className="class-workbench">
        <div className="queue-list">
          <p className="eyebrow">Class library</p>
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
              <StatusBadge tone={vehicleClass.active === false || 'deletedAt' in vehicleClass ? 'muted' : 'ready'}>{vehicleClass.active === false || 'deletedAt' in vehicleClass ? 'Inactive' : 'Active'}</StatusBadge>
            </button>
          ))}
        </div>
        <div className="class-editor">
          <div className="detail-heading">
            <div>
              <p className="eyebrow">Class editor</p>
              <h3>{selectedClass ? selectedClass.name : 'New class'}</h3>
              <p className="muted">Vehicle classes feed owner onboarding, load validation, matching, and pricing rules.</p>
            </div>
            {selectedClass ? <StatusBadge tone={selectedClass.active === false || 'deletedAt' in selectedClass ? 'muted' : 'ready'}>{selectedClass.active === false || 'deletedAt' in selectedClass ? 'Inactive' : 'Active'}</StatusBadge> : <StatusBadge tone="muted">Draft</StatusBadge>}
          </div>
          <div className="class-editor__sections">
            <div className="form-section">
              <div>
                <h4>Identity</h4>
                <p className="muted">Name and display order used across onboarding and quotes.</p>
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
              </div>
            </div>
            <div className="form-section">
              <div>
                <h4>Capacity and defaults</h4>
                <p className="muted">These values guide owner eligibility and the quote engine.</p>
              </div>
              <div className="support-form-grid">
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
            </div>
          </div>
          <label className="decision-label">
            Description
            <textarea onChange={(event) => setDescription(event.target.value)} value={description} />
          </label>
          <div className="decision-actions">
            <button className="icon-button" disabled={Boolean(pendingAction)} onClick={saveClass} type="button">
              {pendingAction === 'save' ? 'Saving...' : selectedClass ? 'Update class' : 'Create class'}
            </button>
            {selectedClass && selectedClass.active !== false && !('deletedAt' in selectedClass) ? (
              <button className="danger-button" disabled={Boolean(pendingAction)} onClick={deactivateClass} type="button">
                {pendingAction === 'delete' ? 'Deactivating...' : 'Deactivate'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
      </section>
    </>
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
    <>
      <PageIntro
        eyebrow="Pricing control"
        title="Pricing rules"
        description="Create draft quote rules, compare them with the active version, and activate server-confirmed pricing."
        action={<StatusBadge tone={pricingRulesQuery.isError ? 'blocked' : activeRule ? 'ready' : 'warn'}>{pricingRulesQuery.isError ? 'Needs token' : activeRule ? `Active v${activeRule.version}` : 'No active rule'}</StatusBadge>}
      />
      {pricingRulesQuery.isError ? <p className="field-error">{getErrorMessage(pricingRulesQuery.error)}</p> : null}
      {vehicleClassesQuery.isError ? <p className="field-error">{getErrorMessage(vehicleClassesQuery.error)}</p> : null}
      <section className="summary-grid panel--wide" aria-label="Pricing summary">
        <SummaryCard icon={CircleDollarSign} label="Active version" value={activeRule ? `v${activeRule.version}` : 'None'} tone={activeRule ? 'ready' : 'warn'} helper="Used by new quotes" />
        <SummaryCard icon={Truck} label="Vehicle rows" value={vehicleClasses.length} tone="ready" helper="Class-specific rates" />
        <SummaryCard icon={History} label="Rule history" value={pricingRules.length} tone={pricingRules.length ? 'ready' : 'warn'} helper="Versioned records" />
      </section>
      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Pricing workbench</p>
            <h2>Draft editor and version history</h2>
          </div>
          <button className="secondary-action" type="button" onClick={() => pricingRulesQuery.refetch()}>
            <RefreshCw aria-hidden="true" size={16} />
            Refresh
          </button>
        </div>
        <div className="pricing-workbench">
        <div className="pricing-editor pricing-editor--primary">
          <div className="detail-heading">
            <div>
              <p className="eyebrow">Pricing workbench</p>
              <h3>New rule draft</h3>
              <p className="muted">Rules are versioned. Activating a new rule retires the previous active version.</p>
            </div>
            <button className={`status-toggle ${createActive ? 'is-active' : ''}`} type="button" onClick={() => setCreateActive((value) => !value)}>
              {createActive ? 'Create active' : 'Create draft'}
            </button>
          </div>
          <div className="pricing-summary-strip">
            <InfoPill label="Active rule" value={activeRule ? `v${activeRule.version}` : 'None'} />
            <InfoPill label="Vehicle classes" value={vehicleClasses.length} />
            <label className="rate-label rate-label--inline">
              Fuel surcharge %
              <input onChange={(event) => setFuelSurchargePercent(event.target.value)} type="number" value={fuelSurchargePercent} />
            </label>
          </div>
          <div className="pricing-class-list">
            {vehicleClasses.length === 0 ? <p className="muted">No active vehicle classes available.</p> : null}
            {vehicleClasses.map((vehicleClass) => {
              const rates = draft[vehicleClass.id] ?? createDraftFromClasses([vehicleClass])[vehicleClass.id];

              return (
                <div className="pricing-class-row" key={vehicleClass.id}>
                  <div className="pricing-class-row__title">
                    <Truck aria-hidden="true" size={20} />
                    <span>
                      <strong>{vehicleClass.name}</strong>
                      <small>{vehicleClass.capacityKg ?? 0}kg / {vehicleClass.capacityCubicMeters ?? 0}m3</small>
                    </span>
                  </div>
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

        <aside className="pricing-history">
          <div className="detail-heading">
            <div>
              <p className="eyebrow">Rule history</p>
              <h3>Version control</h3>
            </div>
          </div>
          {pricingRules.length === 0 ? <p className="muted">No pricing rules yet.</p> : null}
          {pricingRules.map((rule) => (
            <div className="pricing-rule-card" key={rule.id}>
              <div className="detail-heading">
                <div>
                  <h3>Version {rule.version}</h3>
                  <p className="muted">{rule.currency} / fuel {rule.fuelSurchargePercent}% / {rule.vehicleClassRules.length} classes</p>
                </div>
                <StatusBadge tone={rule.status === 'active' ? 'ready' : rule.status === 'draft' ? 'warn' : 'muted'}>{humanize(rule.status)}</StatusBadge>
              </div>
              <p className="muted">Effective {formatDateTime(rule.effectiveFrom)}</p>
              <div className="info-strip">
                <InfoPill label="Currency" value={rule.currency} />
                <InfoPill label="Fuel" value={`${rule.fuelSurchargePercent}%`} />
              </div>
              {rule.status !== 'active' ? (
                <button className="icon-button" disabled={pendingActivationId === rule.id} onClick={() => activateRule(rule.id)} type="button">
                  {pendingActivationId === rule.id ? 'Activating...' : 'Activate'}
                </button>
              ) : null}
            </div>
          ))}
        </aside>
        </div>
      </section>
    </>
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

const requestTone = (status: KuliRequest['status']): 'ready' | 'warn' | 'blocked' | 'muted' => {
  if (status === 'completed') {
    return 'ready';
  }

  if (['cancelled', 'timed_out'].includes(status)) {
    return 'blocked';
  }

  return status === 'pending' ? 'warn' : 'muted';
};

const activeRequestStatuses: KuliRequest['status'][] = ['pending', 'accepted', 'en_route_to_pickup', 'arrived_at_pickup', 'loading', 'in_transit', 'unloading'];

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

const nextRequestStatuses = (request?: KuliRequest): KuliRequest['status'][] => {
  if (!request) {
    return [];
  }

  const transitions: Record<KuliRequest['status'], KuliRequest['status'][]> = {
    pending: ['cancelled'],
    accepted: ['en_route_to_pickup', 'cancelled'],
    en_route_to_pickup: ['arrived_at_pickup', 'cancelled'],
    arrived_at_pickup: ['loading', 'cancelled'],
    loading: ['in_transit', 'cancelled'],
    in_transit: ['unloading', 'cancelled'],
    unloading: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
    timed_out: []
  };

  return transitions[request.status] ?? [];
};

const buildAssistantLocation = ({ address, lon, lat }: { address: string; lon: string; lat: string }): GeoLocationInput => ({
  addressText: address.trim(),
  source: 'assistant_entry',
  point: {
    type: 'Point',
    coordinates: [Number(lon), Number(lat)]
  }
});

function AdminTrustFinancePanel({ enabled, view }: { enabled: boolean; view: 'reports' | 'payments' }) {
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
    enabled: enabled && view === 'reports',
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
    enabled: enabled && view === 'payments',
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

  if (view === 'reports') {
    const openReports = reports.filter((report) => ['open', 'under_review', 'awaiting_response'].includes(report.status)).length;
    const evidenceCount = reports.reduce((total, report) => total + (report.evidenceFileIds?.length ?? 0), 0);

    return (
      <>
        <PageIntro
          eyebrow="Trust operations"
          title="Reports and disputes"
          description="Review reported issues, inspect evidence, and record audit-backed resolution outcomes."
          action={<StatusBadge tone={reportsQuery.isError ? 'blocked' : openReports ? 'warn' : 'ready'}>{reportsQuery.isError ? 'Needs token' : `${openReports} open`}</StatusBadge>}
        />
        {error ? <p className="field-error" role="alert">{error}</p> : null}
        {message ? <p className="muted">{message}</p> : null}
        {reportsQuery.isError ? <p className="field-error">{getErrorMessage(reportsQuery.error)}</p> : null}
        <section className="summary-grid panel--wide" aria-label="Reports summary">
          <SummaryCard icon={FileWarning} label="Visible reports" value={reports.length} tone={reports.length ? 'warn' : 'ready'} helper="Current filter results" />
          <SummaryCard icon={AlertTriangle} label="Open work" value={openReports} tone={openReports ? 'blocked' : 'ready'} helper="Needs staff resolution" />
          <SummaryCard icon={FileText} label="Evidence files" value={evidenceCount} tone={evidenceCount ? 'warn' : 'muted'} helper="Linked uploads" />
        </section>
        <section className="panel panel--wide">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Resolution workbench</p>
              <h2>Report list and detail</h2>
            </div>
            <button className="secondary-action" type="button" onClick={() => reportsQuery.refetch()}>
              <RefreshCw aria-hidden="true" size={16} />
              Refresh
            </button>
          </div>
          <div className="support-toolbar support-toolbar--triple">
            <label>
              Report status
              <select onChange={(event) => setReportStatusFilter(event.target.value as ReportRecord['status'] | '')} value={reportStatusFilter}>
                <option value="">All statuses</option>
                {reportStatuses.map((status) => (
                  <option key={status} value={status}>{humanReportStatus(status)}</option>
                ))}
              </select>
            </label>
            <label>
              Category
              <select onChange={(event) => setReportCategoryFilter(event.target.value)} value={reportCategoryFilter}>
                <option value="">All categories</option>
                {adminReportCategories.map((category) => (
                  <option key={category} value={category}>{humanize(category)}</option>
                ))}
              </select>
            </label>
            <label>
              Queue
              <span className="input-static">{reportsQuery.isFetching ? 'Refreshing reports' : `${reports.length} matching reports`}</span>
            </label>
          </div>
          <div className="admin-split admin-split--detail-heavy">
            <div className="queue-list queue-list--sticky">
              {reportsQuery.isLoading ? <p className="muted">Loading reports...</p> : null}
              {reports.length === 0 && !reportsQuery.isLoading ? <EmptyState title="No reports found" description="Try another status or category filter." /> : null}
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
                  <span>{humanize(report.category)} / {report.requestId || 'Platform issue'}</span>
                  <StatusBadge tone={reportTone(report.status)}>{humanReportStatus(report.status)}</StatusBadge>
                </button>
              ))}
            </div>
            <div className="detail-workspace">
              {selectedReport ? (
                <>
                  <div className="vehicle-summary-card">
                    <div>
                      <p className="eyebrow">Report detail</p>
                      <h3>{selectedReport.reportCode}</h3>
                      <p className="muted">{selectedReport.description}</p>
                    </div>
                    <StatusBadge tone={reportTone(selectedReport.status)}>{humanReportStatus(selectedReport.status)}</StatusBadge>
                    <div className="info-strip info-strip--four">
                      <InfoPill label="Category" value={humanize(selectedReport.category)} />
                      <InfoPill label="Request" value={selectedReport.requestId || 'Platform'} />
                      <InfoPill label="Reporter" value={selectedReport.reporterId} />
                      <InfoPill label="Reported user" value={selectedReport.reportedUserId || 'Not linked'} />
                    </div>
                  </div>
                  <div className="support-card">
                    <div className="detail-heading">
                      <div>
                        <p className="eyebrow">Evidence</p>
                        <h3>Attached files</h3>
                      </div>
                      <StatusBadge tone={(selectedReport.evidenceFileIds ?? []).length ? 'warn' : 'muted'}>{(selectedReport.evidenceFileIds ?? []).length} files</StatusBadge>
                    </div>
                    <div className="evidence-grid">
                      {(selectedReport.evidenceFileIds ?? []).length === 0 ? <p className="muted">No evidence files were attached to this report.</p> : null}
                      {(selectedReport.evidenceFileIds ?? []).map((fileId) => (
                        <span className="evidence-chip" key={fileId}>
                          <FileText aria-hidden="true" size={16} />
                          {fileId}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="decision-card">
                    <div>
                      <p className="eyebrow">Resolution</p>
                      <h3>Record outcome</h3>
                    </div>
                    <label>
                      Outcome
                      <select onChange={(event) => setReportOutcome(event.target.value)} value={reportOutcome}>
                        {reportResolutionOutcomes.map((outcome) => (
                          <option key={outcome} value={outcome}>{humanize(outcome)}</option>
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
                  </div>
                </>
              ) : (
                <EmptyState title="Select a report" description="Report details, evidence, and resolution controls appear here." />
              )}
            </div>
          </div>
        </section>
      </>
    );
  }

  const disputedPayments = payments.filter((payment) => payment.status === 'disputed').length;
  const pendingPayments = payments.filter((payment) => payment.status === 'pending').length;

  return (
    <>
      <PageIntro
        eyebrow="Manual cash"
        title="Payment management"
        description="Review cash payment records, owner confirmations, and client disputes without implying digital processing."
        action={<StatusBadge tone={paymentsQuery.isError ? 'blocked' : disputedPayments ? 'blocked' : pendingPayments ? 'warn' : 'ready'}>{paymentsQuery.isError ? 'Needs token' : `${payments.length} payments`}</StatusBadge>}
      />
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      {message ? <p className="muted">{message}</p> : null}
      {paymentsQuery.isError ? <p className="field-error">{getErrorMessage(paymentsQuery.error)}</p> : null}
      <section className="summary-grid panel--wide" aria-label="Payments summary">
        <SummaryCard icon={CreditCard} label="Payment records" value={payments.length} tone="ready" helper="Manual/cash records" />
        <SummaryCard icon={CircleDollarSign} label="Pending" value={pendingPayments} tone={pendingPayments ? 'warn' : 'ready'} helper="Awaiting confirmation" />
        <SummaryCard icon={FileWarning} label="Disputed" value={disputedPayments} tone={disputedPayments ? 'blocked' : 'ready'} helper="Needs admin review" />
      </section>
      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Payment workbench</p>
            <h2>Cash states and resolution</h2>
          </div>
          <button className="secondary-action" type="button" onClick={() => paymentsQuery.refetch()}>
            <RefreshCw aria-hidden="true" size={16} />
            Refresh
          </button>
        </div>
        <div className="admin-split admin-split--detail-heavy">
          <div className="queue-list queue-list--sticky">
            {paymentsQuery.isLoading ? <p className="muted">Loading payments...</p> : null}
            {payments.length === 0 && !paymentsQuery.isLoading ? <EmptyState title="No payment records" description="Completed trips with cash settlement will appear here." /> : null}
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
                <span>{payment.requestId} / owner {payment.payeeOwnerId || 'Not assigned'}</span>
                <StatusBadge tone={paymentTone(payment.status)}>{humanPaymentStatus(payment.status)}</StatusBadge>
              </button>
            ))}
          </div>
          <div className="detail-workspace">
            {selectedPayment ? (
              <>
                <div className="vehicle-summary-card">
                  <div>
                    <p className="eyebrow">Payment detail</p>
                    <h3>{formatMoney(selectedPayment.currency, selectedPayment.amountConfirmed ?? selectedPayment.amountExpected)}</h3>
                    <p className="muted">{selectedPayment.disputeReason || selectedPayment.resolutionNote || 'Cash confirmations and disputes stay manual in v1.'}</p>
                  </div>
                  <StatusBadge tone={paymentTone(selectedPayment.status)}>{humanPaymentStatus(selectedPayment.status)}</StatusBadge>
                  <div className="info-strip info-strip--four">
                    <InfoPill label="Request" value={selectedPayment.requestId} />
                    <InfoPill label="Client" value={selectedPayment.payerClientId || 'Not linked'} />
                    <InfoPill label="Owner" value={selectedPayment.payeeOwnerId || 'Not linked'} />
                    <InfoPill label="Method" value={humanize(selectedPayment.method || 'manual_cash')} />
                  </div>
                </div>
                <div className="decision-card">
                  <div>
                    <p className="eyebrow">Resolution</p>
                    <h3>Resolve cash record</h3>
                    <p className="muted">Use this only for backend-confirmed payment records. Digital payment gateways are not part of v1.</p>
                  </div>
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
                </div>
              </>
            ) : (
              <EmptyState title="Select a payment" description="Payment amount, parties, dispute reason, and resolution controls appear here." />
            )}
          </div>
        </div>
      </section>
    </>
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
  const requestReportsQuery = useQuery({
    enabled,
    queryKey: ['admin-reports', 'request-connections'],
    queryFn: async () => ((await kuliApi.request('/admin/reports')) as ApiEnvelope<ReportRecord[]>).data
  });
  const requestPaymentsQuery = useQuery({
    enabled,
    queryKey: ['admin-payments', 'request-connections'],
    queryFn: async () => ((await kuliApi.request('/admin/payments')) as ApiEnvelope<PaymentRecord[]>).data
  });
  const filteredRequests = requests.filter((request) => {
    const haystack = `${request.requestCode} ${request.id} ${request.clientId} ${request.selectedOwnerId ?? ''} ${request.pickupLocation?.addressText ?? ''} ${request.destinationLocation?.addressText ?? ''}`.toLowerCase();
    return (!statusFilter || request.status === statusFilter) && (!search.trim() || haystack.includes(search.trim().toLowerCase()));
  });
  const activeRequests = requests.filter((request) => ['pending', 'accepted', 'en_route_to_pickup', 'arrived_at_pickup', 'loading', 'in_transit', 'unloading'].includes(request.status)).length;
  const completedRequests = requests.filter((request) => request.status === 'completed').length;
  const cancelledRequests = requests.filter((request) => ['cancelled', 'timed_out'].includes(request.status)).length;
  const relatedReports = (requestReportsQuery.data ?? []).filter((report) => report.requestId === selectedRequest?.id);
  const relatedPayments = (requestPaymentsQuery.data ?? []).filter((payment) => payment.requestId === selectedRequest?.id);

  useEffect(() => {
    if (!selectedRequestId && requests[0]) {
      setSelectedRequestId(requests[0].id);
    }
  }, [requests, selectedRequestId]);

  if (!enabled) {
    return null;
  }

  return (
    <>
      <PageIntro
        eyebrow="Marketplace oversight"
        title="KULI requests"
        description="Monitor request state, route summaries, owner assignment, timelines, and connected trust/payment records."
        action={<StatusBadge tone={requestsQuery.isError ? 'blocked' : activeRequests ? 'warn' : 'ready'}>{requestsQuery.isError ? 'Needs token' : `${activeRequests} active`}</StatusBadge>}
      />
      {requestsQuery.isError ? <p className="field-error">{getErrorMessage(requestsQuery.error)}</p> : null}
      {requestReportsQuery.isError ? <p className="field-error">{getErrorMessage(requestReportsQuery.error)}</p> : null}
      {requestPaymentsQuery.isError ? <p className="field-error">{getErrorMessage(requestPaymentsQuery.error)}</p> : null}
      <section className="summary-grid panel--wide" aria-label="Request summary">
        <SummaryCard icon={MapPin} label="Active requests" value={activeRequests} tone={activeRequests ? 'warn' : 'ready'} helper="Waiting or in progress" />
        <SummaryCard icon={CheckCircle2} label="Completed" value={completedRequests} tone="ready" helper="Terminal successful trips" />
        <SummaryCard icon={AlertTriangle} label="Cancelled/timed out" value={cancelledRequests} tone={cancelledRequests ? 'blocked' : 'muted'} helper="Terminal interruptions" />
      </section>
      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Oversight workbench</p>
            <h2>Request list and timeline</h2>
          </div>
          <button className="secondary-action" type="button" onClick={() => {
            requestsQuery.refetch();
            eventsQuery.refetch();
            requestReportsQuery.refetch();
            requestPaymentsQuery.refetch();
          }}>
            <RefreshCw aria-hidden="true" size={16} />
            Refresh
          </button>
        </div>
        <div className="support-toolbar">
          <label>
            Status
            <select onChange={(event) => setStatusFilter(event.target.value as KuliRequest['status'] | '')} value={statusFilter}>
              <option value="">All statuses</option>
              {requestStatusOptions.map((status) => (
                <option key={status} value={status}>{humanRequestStatus(status)}</option>
              ))}
            </select>
          </label>
          <label>
            Search
            <span className="input-with-icon">
              <Search aria-hidden="true" size={16} />
              <input onChange={(event) => setSearch(event.target.value)} placeholder="Request, client, owner, address" value={search} />
            </span>
          </label>
        </div>
        <div className="request-oversight-layout">
          <div className="queue-list queue-list--sticky">
            <p className="eyebrow">Request list</p>
            {filteredRequests.length === 0 ? <EmptyState title="No requests found" description="Try a different status or search term." /> : null}
            {filteredRequests.map((request) => (
              <button
                className={`queue-item request-card-row ${selectedRequest?.id === request.id ? 'is-selected' : ''}`}
                key={request.id}
                onClick={() => setSelectedRequestId(request.id)}
                type="button"
              >
                <span className="request-card-row__top">
                  <strong>{request.requestCode}</strong>
                  <StatusBadge tone={request.status === 'completed' ? 'ready' : ['cancelled', 'timed_out'].includes(request.status) ? 'blocked' : 'warn'}>{humanRequestStatus(request.status)}</StatusBadge>
                </span>
                <span>{request.pickupLocation?.addressText || 'Pickup'} to {request.destinationLocation?.addressText || 'Destination'}</span>
                <small>{formatMoney(request.quoteSnapshot?.currency, request.quoteSnapshot?.totalEstimate)}</small>
              </button>
            ))}
          </div>
          <div className="request-inspector">
            {selectedRequest ? (
              <>
                <div className="vehicle-summary-card">
                  <div>
                    <p className="eyebrow">Request detail</p>
                    <h3>{selectedRequest.requestCode}</h3>
                    <p className="muted">{selectedRequest.pickupLocation?.addressText || 'Pickup'} to {selectedRequest.destinationLocation?.addressText || 'Destination'}</p>
                  </div>
                  <StatusBadge tone={selectedRequest.status === 'completed' ? 'ready' : ['cancelled', 'timed_out'].includes(selectedRequest.status) ? 'blocked' : 'warn'}>{humanRequestStatus(selectedRequest.status)}</StatusBadge>
                  <div className="info-strip info-strip--four">
                    <InfoPill label="Client" value={selectedRequest.clientId} />
                    <InfoPill label="Owner" value={selectedRequest.selectedOwnerId || 'Not assigned'} />
                    <InfoPill label="Vehicle" value={selectedRequest.selectedVehicleId || 'Not assigned'} />
                    <InfoPill label="Estimate" value={formatMoney(selectedRequest.quoteSnapshot?.currency, selectedRequest.quoteSnapshot?.totalEstimate)} />
                  </div>
                </div>
                <div className="support-card">
                  <div className="detail-heading">
                    <div>
                      <p className="eyebrow">Connected records</p>
                      <h3>Trust and payment links</h3>
                    </div>
                  </div>
                  <div className="connection-grid">
                    <div>
                      <strong>Reports</strong>
                      {relatedReports.length === 0 ? <p className="muted">No reports linked.</p> : relatedReports.map((report) => (
                        <span className="connection-chip" key={report.id}>{report.reportCode} / {humanReportStatus(report.status)}</span>
                      ))}
                    </div>
                    <div>
                      <strong>Payments</strong>
                      {relatedPayments.length === 0 ? <p className="muted">No payment record linked.</p> : relatedPayments.map((payment) => (
                        <span className="connection-chip" key={payment.id}>{formatMoney(payment.currency, payment.amountConfirmed ?? payment.amountExpected)} / {humanPaymentStatus(payment.status)}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="timeline-panel">
                  <div className="detail-heading">
                    <div>
                      <p className="eyebrow">Timeline</p>
                      <h3>Status events</h3>
                    </div>
                    <StatusBadge tone={eventsQuery.isFetching ? 'warn' : 'ready'}>{eventsQuery.isFetching ? 'Refreshing' : `${eventsQuery.data?.length ?? 0} events`}</StatusBadge>
                  </div>
                  {eventsQuery.isError ? <p className="field-error">{getErrorMessage(eventsQuery.error)}</p> : null}
                  {(eventsQuery.data ?? []).length === 0 ? <p className="muted">No status events returned yet.</p> : null}
                  {(eventsQuery.data ?? []).map((event) => (
                    <TimelineEventRow event={event} key={event.id} />
                  ))}
                </div>
              </>
            ) : (
              <EmptyState title="Select a request" description="Participants, route, estimate, connections, and timeline appear here." />
            )}
          </div>
        </div>
      </section>
    </>
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
    <>
      <PageIntro
        eyebrow="Security trail"
        title="Audit logs"
        description="Filter privileged actions, inspect targets, and review metadata without changing append-only records."
        action={<StatusBadge tone={auditQuery.isError ? 'blocked' : 'ready'}>{auditQuery.isError ? 'Needs token' : `${logs.length} logs`}</StatusBadge>}
      />
      {auditQuery.isError ? <p className="field-error">{getErrorMessage(auditQuery.error)}</p> : null}
      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Audit workbench</p>
            <h2>Filters and metadata preview</h2>
          </div>
          <button className="secondary-action" type="button" onClick={() => auditQuery.refetch()}>
            <RefreshCw aria-hidden="true" size={16} />
            Refresh
          </button>
        </div>
        <div className="support-toolbar support-toolbar--triple">
          <label>
            Actor user id
            <span className="input-with-icon">
              <Search aria-hidden="true" size={16} />
              <input onChange={(event) => setActorUserId(event.target.value)} placeholder="usr_..." value={actorUserId} />
            </span>
          </label>
          <label>
            Action
            <input onChange={(event) => setAction(event.target.value)} placeholder="vehicle.approved" value={action} />
          </label>
          <label>
            Target type
            <input onChange={(event) => setTargetType(event.target.value)} placeholder="vehicle, report, payment" value={targetType} />
          </label>
        </div>
        <div className="split-panel">
          <div className="queue-list">
            {logs.length === 0 ? <EmptyState title="No audit logs found" description="Try clearing filters or checking another actor/target." /> : null}
            {logs.map((log) => (
              <button
                className={`queue-item ${selectedLog?.id === log.id ? 'is-selected' : ''}`}
                key={log.id}
                onClick={() => setSelectedLogId(log.id)}
                type="button"
              >
                <strong>{humanAuditAction(log.action)}</strong>
                <span>{humanize(log.targetType || 'target')} / {log.targetId || 'No target id'}</span>
                <StatusBadge tone={log.actorRole === 'admin' ? 'warn' : 'muted'}>{humanRole(log.actorRole)}</StatusBadge>
              </button>
            ))}
          </div>
          <div className="decision-panel">
            {selectedLog ? (
              <>
                <div className="detail-heading">
                  <div>
                    <p className="eyebrow">Selected log</p>
                    <h3>{humanAuditAction(selectedLog.action)}</h3>
                    <p className="muted">{formatDateTime(selectedLog.createdAt)}</p>
                  </div>
                  <StatusBadge tone="muted">{humanize(selectedLog.targetType || 'target')}</StatusBadge>
                </div>
                <div className="detail-grid">
                  <span>Actor <strong>{selectedLog.actorUserId || 'System'}</strong></span>
                  <span>Role <strong>{humanRole(selectedLog.actorRole)}</strong></span>
                  <span>Target <strong>{selectedLog.targetId || 'None'}</strong></span>
                  <span>Action key <strong>{selectedLog.action}</strong></span>
                </div>
                <pre className="metadata-block">{JSON.stringify(selectedLog.metadata ?? {}, null, 2)}</pre>
              </>
            ) : (
              <EmptyState title="Select a log" description="Audit metadata, actor, and target details appear here." />
            )}
          </div>
        </div>
      </section>
    </>
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
  const [directAssign, setDirectAssign] = useState(false);
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
      const result = (await kuliApi.request(`/assistant/clients/search?query=${encodeURIComponent(clientSearchPhone.trim())}`)) as ApiEnvelope<UserProfile[]>;
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
          selectedVehicleIds,
          directAssignVehicleId: directAssign ? selectedVehicleIds[0] : undefined
        }
      })) as ApiEnvelope<AssistedBookingResult>;

      setBookingResult(result.data);
      setTicketMessage(directAssign ? 'Assisted booking created, truck assigned, and SMS confirmation intent recorded.' : 'Assisted booking created and SMS confirmation intent recorded.');
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
                  setDirectAssign(false);
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
                <p className="muted">Search existing clients by phone, email, or name. Assisted bookings can still use a caller snapshot when no app profile exists.</p>
              </div>
              <button className="icon-button" disabled={clientLookupPending} onClick={searchClients} type="button">
                {clientLookupPending ? 'Searching...' : 'Search'}
              </button>
            </div>
            <label>
              Phone, email, or name
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
              <div className="support-card support-card--inline">
                <div>
                  <strong>Direct assignment</strong>
                  <p className="muted">Turn this on to assign the first selected truck immediately and mark it busy. Leave it off to notify selected owners and wait for acceptance.</p>
                </div>
                <button className={`status-toggle ${directAssign ? 'is-active' : ''}`} disabled={selectedVehicleIds.length === 0} onClick={() => setDirectAssign((current) => !current)} type="button">
                  {directAssign ? 'Direct assign on' : 'Send offers'}
                </button>
              </div>
              <button className="icon-button" disabled={bookingPending || selectedVehicleIds.length === 0 || !canBook} onClick={createBooking} type="button">
                {bookingPending ? 'Creating...' : directAssign ? 'Create and assign truck' : `Create request (${selectedVehicleIds.length} selected)`}
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

function AssistantDashboardPanel({ enabled, profile }: { enabled: boolean; profile: UserProfile }) {
  const dashboardQuery = useQuery({
    enabled,
    queryKey: ['assistant-dashboard'],
    queryFn: async () => ((await kuliApi.request('/assistant/dashboard')) as ApiEnvelope<AssistantDashboardMetrics>).data
  });
  const metrics = dashboardQuery.data;

  if (!enabled) {
    return null;
  }

  return (
    <>
      <PageIntro
        eyebrow="Call-center desk"
        title={`Welcome${profile.fullName ? `, ${profile.fullName.split(' ')[0]}` : ''}`}
        description="Watch active calls, assisted requests, online truck supply, and assistant alerts from one dispatch dashboard."
        action={(
          <button className="secondary-action" type="button" onClick={() => dashboardQuery.refetch()}>
            <RefreshCw aria-hidden="true" size={16} />
            Refresh
          </button>
        )}
      />
      {dashboardQuery.isError ? <p className="field-error">{getErrorMessage(dashboardQuery.error)}</p> : null}
      <section className="summary-grid panel--wide" aria-label="Assistant dashboard summary">
        <SummaryCard icon={ClipboardList} label="Open tickets" value={metrics?.tickets.open ?? 0} tone={(metrics?.tickets.open ?? 0) ? 'warn' : 'ready'} helper="Waiting for claim" />
        <SummaryCard icon={MapPin} label="Active requests" value={metrics?.requests.active ?? 0} tone={(metrics?.requests.active ?? 0) ? 'warn' : 'ready'} helper="Created or supported by you" />
        <SummaryCard icon={Truck} label="Online trucks" value={metrics?.trucks.online ?? 0} tone={(metrics?.trucks.online ?? 0) ? 'ready' : 'warn'} helper="Approved and available" />
        <SummaryCard icon={Bell} label="Unread alerts" value={metrics?.notifications.unread ?? 0} tone={(metrics?.notifications.unread ?? 0) ? 'warn' : 'ready'} helper="Assistant notifications" />
      </section>
      <section className="dashboard-structure panel--wide">
        <div className="dashboard-structure__main">
          <div className="panel">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Ticket health</p>
                <h2>Call queue</h2>
              </div>
              <StatusBadge tone={(metrics?.tickets.pendingClient ?? 0) ? 'warn' : 'ready'}>{metrics?.tickets.total ?? 0} tickets</StatusBadge>
            </div>
            <div className="work-preview-list">
              <div className="work-preview-row"><span><strong>Assigned</strong><small>Tickets claimed by assistants</small></span><StatusBadge tone="muted">{metrics?.tickets.assigned ?? 0}</StatusBadge></div>
              <div className="work-preview-row"><span><strong>In progress</strong><small>Live support work</small></span><StatusBadge tone="warn">{metrics?.tickets.inProgress ?? 0}</StatusBadge></div>
              <div className="work-preview-row"><span><strong>Waiting for client</strong><small>Follow-up needed</small></span><StatusBadge tone={(metrics?.tickets.pendingClient ?? 0) ? 'warn' : 'ready'}>{metrics?.tickets.pendingClient ?? 0}</StatusBadge></div>
            </div>
          </div>
          <div className="panel">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Truck supply</p>
                <h2>Availability snapshot</h2>
              </div>
              <StatusBadge tone="ready">{metrics?.trucks.total ?? 0} trucks</StatusBadge>
            </div>
            <div className="work-preview-list">
              <div className="work-preview-row"><span><strong>Busy</strong><small>Currently assigned to a job</small></span><StatusBadge tone="warn">{metrics?.trucks.busy ?? 0}</StatusBadge></div>
              <div className="work-preview-row"><span><strong>Offline</strong><small>Approved but not available</small></span><StatusBadge tone="muted">{metrics?.trucks.offline ?? 0}</StatusBadge></div>
              <div className="work-preview-row"><span><strong>Pending verification</strong><small>Cannot receive work yet</small></span><StatusBadge tone={(metrics?.trucks.pendingVerification ?? 0) ? 'warn' : 'ready'}>{metrics?.trucks.pendingVerification ?? 0}</StatusBadge></div>
            </div>
          </div>
        </div>
        <aside className="dashboard-structure__side">
          <div className="panel">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Operating rule</p>
                <h2>Backend-confirmed only</h2>
              </div>
              <StatusBadge tone="ready">Protected</StatusBadge>
            </div>
            <p className="muted">Bookings, assignment, ticket status, request status, and notifications are all written through the API. The console does not fake success states.</p>
          </div>
        </aside>
      </section>
    </>
  );
}

function AssistantTicketsPanel({ enabled, profile }: { enabled: boolean; profile: UserProfile }) {
  const queryClient = useQueryClient();
  const [ticketFilter, setTicketFilter] = useState<TicketStatus | ''>('open');
  const [callerFilter, setCallerFilter] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [source, setSource] = useState<TicketSource>('incoming_call');
  const [callerPhone, setCallerPhone] = useState('+251911111111');
  const [callSummary, setCallSummary] = useState('');
  const [followUpAt, setFollowUpAt] = useState('');
  const [pendingAction, setPendingAction] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const ticketsQuery = useQuery({
    enabled,
    queryKey: ['assistant-tickets-page', ticketFilter, callerFilter],
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
  const tickets = ticketsQuery.data ?? [];
  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) ?? tickets[0];
  const canEditTicket = selectedTicket && !['closed', 'cancelled'].includes(selectedTicket.status);

  useEffect(() => {
    if (!selectedTicketId && tickets[0]) {
      setSelectedTicketId(tickets[0].id);
      setCallSummary(tickets[0].callSummary ?? '');
      setFollowUpAt(tickets[0].followUpAt ?? '');
    }
  }, [selectedTicketId, tickets]);

  if (!enabled) {
    return null;
  }

  const createTicket = async () => {
    if (!callerPhone.trim()) {
      setError('Caller phone is required.');
      return;
    }

    setPendingAction('create');
    setError('');
    setMessage('');

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
      setMessage('Ticket created.');
      await queryClient.invalidateQueries({ queryKey: ['assistant-tickets-page'] });
      await queryClient.invalidateQueries({ queryKey: ['assistant-dashboard'] });
    } catch (ticketError) {
      setError(getErrorMessage(ticketError));
    } finally {
      setPendingAction('');
    }
  };

  const transitionTicket = async (status: TicketStatus) => {
    if (!selectedTicket || !canEditTicket) {
      return;
    }

    setPendingAction(status);
    setError('');
    setMessage('');

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
      setMessage(`Ticket moved to ${ticketStatusLabels[status]}.`);
      await queryClient.invalidateQueries({ queryKey: ['assistant-tickets-page'] });
      await queryClient.invalidateQueries({ queryKey: ['assistant-dashboard'] });
    } catch (ticketError) {
      setError(getErrorMessage(ticketError));
    } finally {
      setPendingAction('');
    }
  };

  return (
    <>
      <PageIntro
        eyebrow="Hotline queue"
        title="Tickets"
        description="Claim calls, record notes, move tickets through support states, and link bookings when the caller is ready."
        action={<StatusBadge tone={ticketsQuery.isError ? 'blocked' : tickets.length ? 'warn' : 'ready'}>{tickets.length} visible</StatusBadge>}
      />
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      {message ? <p className="muted">{message}</p> : null}
      {ticketsQuery.isError ? <p className="field-error">{getErrorMessage(ticketsQuery.error)}</p> : null}
      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Ticket workbench</p>
            <h2>Queue and call detail</h2>
          </div>
          <button className="secondary-action" type="button" onClick={() => ticketsQuery.refetch()}>
            <RefreshCw aria-hidden="true" size={16} />
            Refresh
          </button>
        </div>
        <div className="support-toolbar support-toolbar--triple">
          <label>
            Status
            <select onChange={(event) => setTicketFilter(event.target.value as TicketStatus | '')} value={ticketFilter}>
              <option value="">All statuses</option>
              {Object.entries(ticketStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Caller
            <span className="input-with-icon">
              <Search aria-hidden="true" size={16} />
              <input onChange={(event) => setCallerFilter(event.target.value)} placeholder="+251..." value={callerFilter} />
            </span>
          </label>
          <label>
            Assigned to
            <span className="input-static">{profile.fullName || profile.email || 'Current assistant'}</span>
          </label>
        </div>
        <div className="admin-split admin-split--detail-heavy">
          <div className="queue-list queue-list--sticky">
            {ticketsQuery.isLoading ? <p className="muted">Loading tickets...</p> : null}
            {tickets.length === 0 && !ticketsQuery.isLoading ? <EmptyState title="No tickets found" description="Try another status or create a new ticket from the form below." /> : null}
            {tickets.map((ticket) => (
              <button
                className={`queue-item ${selectedTicket?.id === ticket.id ? 'is-selected' : ''}`}
                key={ticket.id}
                onClick={() => {
                  setSelectedTicketId(ticket.id);
                  setCallSummary(ticket.callSummary ?? '');
                  setFollowUpAt(ticket.followUpAt ?? '');
                  setError('');
                  setMessage('');
                }}
                type="button"
              >
                <strong>{ticket.ticketCode}</strong>
                <span>{ticket.callerPhone || 'No caller phone'} / {humanize(ticket.source)}</span>
                <StatusBadge tone={ticketTone(ticket.status)}>{ticketStatusLabels[ticket.status]}</StatusBadge>
              </button>
            ))}
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
              <button className="icon-button" disabled={pendingAction === 'create'} onClick={createTicket} type="button">
                {pendingAction === 'create' ? 'Creating...' : 'Create ticket'}
              </button>
            </div>
          </div>
          <div className="detail-workspace">
            {selectedTicket ? (
              <>
                <div className="vehicle-summary-card">
                  <div>
                    <p className="eyebrow">Selected ticket</p>
                    <h3>{selectedTicket.ticketCode}</h3>
                    <p className="muted">{selectedTicket.callSummary || 'No call notes recorded yet.'}</p>
                  </div>
                  <StatusBadge tone={ticketTone(selectedTicket.status)}>{ticketStatusLabels[selectedTicket.status]}</StatusBadge>
                  <div className="info-strip info-strip--four">
                    <InfoPill label="Caller" value={selectedTicket.callerPhone || 'Not recorded'} />
                    <InfoPill label="Client" value={selectedTicket.clientId || 'Snapshot only'} />
                    <InfoPill label="Request" value={selectedTicket.requestId || 'Not linked'} />
                    <InfoPill label="Follow up" value={formatDateTime(selectedTicket.followUpAt)} />
                  </div>
                </div>
                <label className="decision-label">
                  Call notes
                  <textarea disabled={!canEditTicket} onChange={(event) => setCallSummary(event.target.value)} placeholder="Caller context, building access, load notes, confirmation details." value={callSummary} />
                </label>
                <label>
                  Follow up
                  <input disabled={!canEditTicket} onChange={(event) => setFollowUpAt(event.target.value)} value={followUpAt} />
                </label>
                <div className="decision-actions">
                  {nextTicketStatuses(selectedTicket).map((status) => (
                    <button
                      className={status === 'cancelled' ? 'danger-button' : 'icon-button'}
                      disabled={Boolean(pendingAction)}
                      key={status}
                      onClick={() => transitionTicket(status)}
                      type="button"
                    >
                      {pendingAction === status ? 'Working...' : ticketStatusLabels[status]}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState title="Select a ticket" description="Caller details, notes, timeline state, and transition actions appear here." />
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function AssistantRequestsPanel({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<KuliRequest['status'] | ''>('');
  const [search, setSearch] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [pendingAction, setPendingAction] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const requestsQuery = useQuery({
    enabled,
    queryKey: ['assistant-requests'],
    queryFn: async () => ((await kuliApi.request('/assistant/requests')) as ApiEnvelope<KuliRequest[]>).data
  });
  const trucksQuery = useQuery({
    enabled,
    queryKey: ['assistant-trucks', 'online-for-request'],
    queryFn: async () => ((await kuliApi.request('/assistant/trucks?verificationStatus=approved&availabilityStatus=online_available')) as ApiEnvelope<Vehicle[]>).data
  });
  const requests = requestsQuery.data ?? [];
  const filteredRequests = requests.filter((request) => {
    const haystack = `${request.requestCode} ${request.clientId ?? ''} ${request.clientContactSnapshot?.phone ?? ''} ${request.pickupLocation?.addressText ?? ''} ${request.destinationLocation?.addressText ?? ''}`.toLowerCase();
    return (!statusFilter || request.status === statusFilter) && (!search.trim() || haystack.includes(search.trim().toLowerCase()));
  });
  const selectedRequest = requests.find((request) => request.id === selectedRequestId) ?? filteredRequests[0] ?? requests[0];
  const eventsQuery = useQuery({
    enabled: enabled && Boolean(selectedRequest?.id),
    queryKey: ['assistant-requests', selectedRequest?.id, 'events'],
    queryFn: async () => ((await kuliApi.request(`/kuli-requests/${selectedRequest?.id}/events`)) as ApiEnvelope<StatusEvent[]>).data
  });
  const messagesQuery = useQuery({
    enabled: enabled && Boolean(selectedRequest?.id),
    queryKey: ['assistant-requests', selectedRequest?.id, 'messages'],
    queryFn: async () => ((await kuliApi.request(`/kuli-requests/${selectedRequest?.id}/messages`)) as ApiEnvelope<Array<{ id: string; body: string; senderDisplayName?: string; senderRole?: Role; createdAt?: string }>>).data
  });
  const activeRequests = requests.filter((request) => activeRequestStatuses.includes(request.status)).length;

  useEffect(() => {
    if (!selectedRequestId && filteredRequests[0]) {
      setSelectedRequestId(filteredRequests[0].id);
    }
  }, [filteredRequests, selectedRequestId]);

  if (!enabled) {
    return null;
  }

  const assignTruck = async () => {
    if (!selectedRequest || !selectedTruckId) {
      setError('Select a waiting request and an online truck first.');
      return;
    }

    setPendingAction('assign');
    setError('');
    setMessage('');

    try {
      const result = (await kuliApi.request(`/assistant/requests/${selectedRequest.id}/assign`, {
        method: 'POST',
        body: {
          vehicleId: selectedTruckId
        }
      })) as ApiEnvelope<AssistantAssignmentResult>;

      setMessage(`${result.data.request.requestCode} assigned to ${result.data.assignment.vehicleId}.`);
      await queryClient.invalidateQueries({ queryKey: ['assistant-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['assistant-trucks'] });
      await queryClient.invalidateQueries({ queryKey: ['assistant-dashboard'] });
    } catch (assignError) {
      setError(getErrorMessage(assignError));
    } finally {
      setPendingAction('');
    }
  };

  const transitionRequest = async (status: KuliRequest['status']) => {
    if (!selectedRequest) {
      return;
    }

    setPendingAction(status);
    setError('');
    setMessage('');

    try {
      await kuliApi.request(`/kuli-requests/${selectedRequest.id}/status`, {
        method: 'PATCH',
        body: {
          status,
          reason: status === 'cancelled' ? 'assistant_cancelled' : `assistant_${status}`
        }
      });
      setMessage(`Request moved to ${humanRequestStatus(status)}.`);
      await queryClient.invalidateQueries({ queryKey: ['assistant-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['assistant-trucks'] });
      await queryClient.invalidateQueries({ queryKey: ['assistant-dashboard'] });
    } catch (statusError) {
      setError(getErrorMessage(statusError));
    } finally {
      setPendingAction('');
    }
  };

  return (
    <>
      <PageIntro
        eyebrow="Assisted requests"
        title="Requests"
        description="Monitor assistant-created KULI requests, assign online trucks, inspect timelines, and keep support notes close."
        action={<StatusBadge tone={requestsQuery.isError ? 'blocked' : activeRequests ? 'warn' : 'ready'}>{activeRequests} active</StatusBadge>}
      />
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      {message ? <p className="muted">{message}</p> : null}
      {requestsQuery.isError ? <p className="field-error">{getErrorMessage(requestsQuery.error)}</p> : null}
      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Request workbench</p>
            <h2>List, assignment, and timeline</h2>
          </div>
          <button className="secondary-action" type="button" onClick={() => {
            requestsQuery.refetch();
            trucksQuery.refetch();
            eventsQuery.refetch();
            messagesQuery.refetch();
          }}>
            <RefreshCw aria-hidden="true" size={16} />
            Refresh
          </button>
        </div>
        <div className="support-toolbar">
          <label>
            Status
            <select onChange={(event) => setStatusFilter(event.target.value as KuliRequest['status'] | '')} value={statusFilter}>
              <option value="">All statuses</option>
              {requestStatusOptions.map((status) => (
                <option key={status} value={status}>{humanRequestStatus(status)}</option>
              ))}
            </select>
          </label>
          <label>
            Search
            <span className="input-with-icon">
              <Search aria-hidden="true" size={16} />
              <input onChange={(event) => setSearch(event.target.value)} placeholder="Request, caller, route" value={search} />
            </span>
          </label>
        </div>
        <div className="request-oversight-layout">
          <div className="queue-list queue-list--sticky">
            {filteredRequests.length === 0 ? <EmptyState title="No assisted requests found" description="Create a booking or adjust the filters." /> : null}
            {filteredRequests.map((request) => (
              <button
                className={`queue-item request-card-row ${selectedRequest?.id === request.id ? 'is-selected' : ''}`}
                key={request.id}
                onClick={() => {
                  setSelectedRequestId(request.id);
                  setError('');
                  setMessage('');
                }}
                type="button"
              >
                <span className="request-card-row__top">
                  <strong>{request.requestCode}</strong>
                  <StatusBadge tone={requestTone(request.status)}>{humanRequestStatus(request.status)}</StatusBadge>
                </span>
                <span>{request.pickupLocation?.addressText || 'Pickup'} to {request.destinationLocation?.addressText || 'Destination'}</span>
                <small>{formatMoney(request.quoteSnapshot?.currency, request.quoteSnapshot?.totalEstimate)} / {request.hotlineTicketId || 'No ticket'}</small>
              </button>
            ))}
          </div>
          <div className="request-inspector">
            {selectedRequest ? (
              <>
                <div className="vehicle-summary-card">
                  <div>
                    <p className="eyebrow">Request detail</p>
                    <h3>{selectedRequest.requestCode}</h3>
                    <p className="muted">{selectedRequest.pickupLocation?.addressText || 'Pickup'} to {selectedRequest.destinationLocation?.addressText || 'Destination'}</p>
                  </div>
                  <StatusBadge tone={requestTone(selectedRequest.status)}>{humanRequestStatus(selectedRequest.status)}</StatusBadge>
                  <div className="info-strip info-strip--four">
                    <InfoPill label="Caller" value={selectedRequest.clientContactSnapshot?.phone || selectedRequest.clientId || 'Snapshot'} />
                    <InfoPill label="Owner" value={selectedRequest.selectedOwnerId || 'Not assigned'} />
                    <InfoPill label="Vehicle" value={selectedRequest.selectedVehicleId || 'Not assigned'} />
                    <InfoPill label="Payment" value={selectedRequest.payment ? humanPaymentStatus(selectedRequest.payment.status) : 'No record'} />
                  </div>
                </div>
                {selectedRequest.status === 'pending' ? (
                  <div className="support-card">
                    <div className="detail-heading">
                      <div>
                        <p className="eyebrow">Assignment</p>
                        <h3>Assign an online truck</h3>
                        <p className="muted">Only approved online trucks are listed. The backend marks the assigned truck busy.</p>
                      </div>
                    </div>
                    <label>
                      Online truck
                      <select onChange={(event) => setSelectedTruckId(event.target.value)} value={selectedTruckId}>
                        <option value="">Select a truck</option>
                        {(trucksQuery.data ?? []).map((truck) => (
                          <option key={truck.id} value={truck.id}>{truck.licensePlate} / {truck.vehicleClassSnapshot?.name || 'Truck'} / {truck.owner?.fullName || truck.ownerId}</option>
                        ))}
                      </select>
                    </label>
                    <button className="icon-button" disabled={pendingAction === 'assign' || !selectedTruckId} onClick={assignTruck} type="button">
                      {pendingAction === 'assign' ? 'Assigning...' : 'Assign truck'}
                    </button>
                  </div>
                ) : null}
                <div className="decision-actions">
                  {nextRequestStatuses(selectedRequest).map((status) => (
                    <button
                      className={status === 'cancelled' ? 'danger-button' : 'icon-button'}
                      disabled={Boolean(pendingAction)}
                      key={status}
                      onClick={() => transitionRequest(status)}
                      type="button"
                    >
                      {pendingAction === status ? 'Updating...' : humanRequestStatus(status)}
                    </button>
                  ))}
                </div>
                <div className="timeline-panel">
                  <div className="detail-heading">
                    <div>
                      <p className="eyebrow">Timeline</p>
                      <h3>Status events</h3>
                    </div>
                    <StatusBadge tone={eventsQuery.isFetching ? 'warn' : 'ready'}>{eventsQuery.data?.length ?? 0} events</StatusBadge>
                  </div>
                  {(eventsQuery.data ?? []).length === 0 ? <p className="muted">No status events returned yet.</p> : null}
                  {(eventsQuery.data ?? []).map((event) => (
                    <TimelineEventRow event={event} key={event.id} />
                  ))}
                </div>
                <div className="support-card">
                  <div className="detail-heading">
                    <div>
                      <p className="eyebrow">Messages</p>
                      <h3>Request thread</h3>
                    </div>
                    <StatusBadge tone="muted">{messagesQuery.data?.length ?? 0} messages</StatusBadge>
                  </div>
                  {(messagesQuery.data ?? []).length === 0 ? <p className="muted">No request messages yet.</p> : null}
                  {(messagesQuery.data ?? []).slice(0, 5).map((entry) => (
                    <div className="work-preview-row" key={entry.id}>
                      <span><strong>{entry.senderDisplayName || humanRole(entry.senderRole)}</strong><small>{entry.body}</small></span>
                      <time>{formatDateTime(entry.createdAt)}</time>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState title="Select a request" description="Route, assignment, timeline, messages, and payment state appear here." />
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function AssistantTrucksPanel({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const [availabilityFilter, setAvailabilityFilter] = useState('online_available');
  const [verificationFilter, setVerificationFilter] = useState<Vehicle['verificationStatus'] | ''>('approved');
  const [search, setSearch] = useState('');
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [pendingAssign, setPendingAssign] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const trucksQuery = useQuery({
    enabled,
    queryKey: ['assistant-trucks', verificationFilter, availabilityFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (verificationFilter) {
        params.set('verificationStatus', verificationFilter);
      }

      if (availabilityFilter) {
        params.set('availabilityStatus', availabilityFilter);
      }

      if (search.trim()) {
        params.set('search', search.trim());
      }

      const suffix = params.toString() ? `?${params.toString()}` : '';
      return ((await kuliApi.request(`/assistant/trucks${suffix}`)) as ApiEnvelope<Vehicle[]>).data;
    }
  });
  const requestsQuery = useQuery({
    enabled,
    queryKey: ['assistant-requests', 'pending-for-trucks'],
    queryFn: async () => ((await kuliApi.request('/assistant/requests')) as ApiEnvelope<KuliRequest[]>).data
  });
  const trucks = trucksQuery.data ?? [];
  const selectedTruck = trucks.find((truck) => truck.id === selectedTruckId) ?? trucks[0];
  const pendingRequests = (requestsQuery.data ?? []).filter((request) => request.status === 'pending');

  useEffect(() => {
    if (!selectedTruckId && trucks[0]) {
      setSelectedTruckId(trucks[0].id);
    }
  }, [selectedTruckId, trucks]);

  if (!enabled) {
    return null;
  }

  const assignTruck = async () => {
    if (!selectedTruck || !selectedRequestId) {
      setError('Select an online truck and a waiting request first.');
      return;
    }

    setPendingAssign(true);
    setError('');
    setMessage('');

    try {
      const result = (await kuliApi.request(`/assistant/requests/${selectedRequestId}/assign`, {
        method: 'POST',
        body: {
          vehicleId: selectedTruck.id
        }
      })) as ApiEnvelope<AssistantAssignmentResult>;

      setMessage(`${selectedTruck.licensePlate} assigned to ${result.data.request.requestCode}.`);
      await queryClient.invalidateQueries({ queryKey: ['assistant-trucks'] });
      await queryClient.invalidateQueries({ queryKey: ['assistant-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['assistant-dashboard'] });
    } catch (assignError) {
      setError(getErrorMessage(assignError));
    } finally {
      setPendingAssign(false);
    }
  };

  return (
    <>
      <PageIntro
        eyebrow="Dispatch supply"
        title="Available trucks"
        description="Review verified truck supply, owner contact context, location state, and assign online trucks to waiting assisted requests."
        action={<StatusBadge tone={trucksQuery.isError ? 'blocked' : trucks.some((truck) => truck.availabilityStatus === 'online_available') ? 'ready' : 'warn'}>{trucks.length} trucks</StatusBadge>}
      />
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      {message ? <p className="muted">{message}</p> : null}
      {trucksQuery.isError ? <p className="field-error">{getErrorMessage(trucksQuery.error)}</p> : null}
      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Truck workbench</p>
            <h2>Supply list and assignment</h2>
          </div>
          <button className="secondary-action" type="button" onClick={() => {
            trucksQuery.refetch();
            requestsQuery.refetch();
          }}>
            <RefreshCw aria-hidden="true" size={16} />
            Refresh
          </button>
        </div>
        <div className="support-toolbar support-toolbar--triple">
          <label>
            Verification
            <select onChange={(event) => setVerificationFilter(event.target.value as Vehicle['verificationStatus'] | '')} value={verificationFilter}>
              <option value="">All</option>
              {verificationStatusOptions.map((status) => (
                <option key={status} value={status}>{humanVerificationStatus(status)}</option>
              ))}
            </select>
          </label>
          <label>
            Availability
            <select onChange={(event) => setAvailabilityFilter(event.target.value)} value={availabilityFilter}>
              <option value="">All</option>
              {Object.entries(availabilityStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Search
            <span className="input-with-icon">
              <Search aria-hidden="true" size={16} />
              <input onChange={(event) => setSearch(event.target.value)} placeholder="Plate, owner, notes" value={search} />
            </span>
          </label>
        </div>
        <div className="admin-split admin-split--detail-heavy">
          <div className="queue-list queue-list--sticky">
            {trucks.length === 0 ? <EmptyState title="No trucks found" description="Adjust filters or ask owners to bring approved trucks online." /> : null}
            {trucks.map((truck) => (
              <button
                className={`queue-item ${selectedTruck?.id === truck.id ? 'is-selected' : ''}`}
                key={truck.id}
                onClick={() => {
                  setSelectedTruckId(truck.id);
                  setError('');
                  setMessage('');
                }}
                type="button"
              >
                <strong>{truck.licensePlate}</strong>
                <span>{truck.vehicleClassSnapshot?.name || 'Truck'} / {truck.capacityKg ?? 0}kg / {truck.owner?.fullName || truck.ownerId}</span>
                <StatusBadge tone={truck.availabilityStatus === 'online_available' ? 'ready' : truck.availabilityStatus === 'busy_on_job' ? 'warn' : truck.verificationStatus === 'rejected' ? 'blocked' : 'muted'}>
                  {humanAvailabilityStatus(truck.availabilityStatus)}
                </StatusBadge>
              </button>
            ))}
          </div>
          <div className="detail-workspace">
            {selectedTruck ? (
              <>
                <div className="vehicle-summary-card">
                  <div>
                    <p className="eyebrow">Truck detail</p>
                    <h3>{selectedTruck.licensePlate}</h3>
                    <p className="muted">{selectedTruck.description || selectedTruck.currentLocation?.addressText || 'No truck note or location label submitted.'}</p>
                  </div>
                  <StatusBadge tone={selectedTruck.availabilityStatus === 'online_available' ? 'ready' : selectedTruck.availabilityStatus === 'busy_on_job' ? 'warn' : 'muted'}>
                    {humanAvailabilityStatus(selectedTruck.availabilityStatus)}
                  </StatusBadge>
                  <div className="info-strip info-strip--four">
                    <InfoPill label="Owner" value={selectedTruck.owner?.fullName || selectedTruck.owner?.phone || selectedTruck.ownerId} />
                    <InfoPill label="Class" value={selectedTruck.vehicleClassSnapshot?.name || 'Truck'} />
                    <InfoPill label="Capacity" value={`${selectedTruck.capacityKg ?? 0}kg`} />
                    <InfoPill label="Volume" value={`${selectedTruck.capacityCubicMeters ?? 0}m3`} />
                  </div>
                </div>
                <div className="support-card">
                  <div className="detail-heading">
                    <div>
                      <p className="eyebrow">Assignment</p>
                      <h3>Assign to waiting request</h3>
                      <p className="muted">Busy trucks cannot be assigned again. Completed or cancelled trips release the truck through backend status rules.</p>
                    </div>
                    <StatusBadge tone={selectedTruck.availabilityStatus === 'online_available' ? 'ready' : 'warn'}>
                      {selectedTruck.availabilityStatus === 'online_available' ? 'Assignable' : 'Not assignable'}
                    </StatusBadge>
                  </div>
                  <label>
                    Waiting request
                    <select onChange={(event) => setSelectedRequestId(event.target.value)} value={selectedRequestId}>
                      <option value="">Select a request</option>
                      {pendingRequests.map((request) => (
                        <option key={request.id} value={request.id}>{request.requestCode} / {request.pickupLocation?.addressText || 'Pickup'} to {request.destinationLocation?.addressText || 'Destination'}</option>
                      ))}
                    </select>
                  </label>
                  <button className="icon-button" disabled={pendingAssign || selectedTruck.availabilityStatus !== 'online_available' || !selectedRequestId} onClick={assignTruck} type="button">
                    {pendingAssign ? 'Assigning...' : 'Assign truck'}
                  </button>
                </div>
              </>
            ) : (
              <EmptyState title="Select a truck" description="Owner, capacity, location, status, and assignment controls appear here." />
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function AssistantClientsPanel({ enabled }: { enabled: boolean }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  if (!enabled) {
    return null;
  }

  const searchClients = async () => {
    if (!query.trim()) {
      setError('Enter a phone, email, or name to search.');
      return;
    }

    setPending(true);
    setError('');

    try {
      const result = (await kuliApi.request(`/assistant/clients/search?query=${encodeURIComponent(query.trim())}`)) as ApiEnvelope<UserProfile[]>;
      setResults(result.data);
      setSelectedClientId(result.data[0]?.id ?? '');
    } catch (searchError) {
      setError(getErrorMessage(searchError));
    } finally {
      setPending(false);
    }
  };

  const selectedClient = results.find((client) => client.id === selectedClientId) ?? results[0];

  return (
    <>
      <PageIntro
        eyebrow="Caller identity"
        title="Clients"
        description="Search existing client profiles. If no profile exists, assisted bookings can still keep a caller contact snapshot."
        action={<StatusBadge tone={results.length ? 'ready' : 'muted'}>{results.length} matches</StatusBadge>}
      />
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Client lookup</p>
            <h2>Search and profile context</h2>
          </div>
          <button className="icon-button" disabled={pending} onClick={searchClients} type="button">
            {pending ? 'Searching...' : 'Search'}
          </button>
        </div>
        <div className="support-toolbar">
          <label>
            Phone, email, or name
            <span className="input-with-icon">
              <Search aria-hidden="true" size={16} />
              <input onChange={(event) => setQuery(event.target.value)} placeholder="+251911..., abebe@example.com, Abebe" value={query} />
            </span>
          </label>
          <label>
            Profile creation
            <span className="input-static">Use caller snapshot when no Supabase profile exists</span>
          </label>
        </div>
        <div className="split-panel">
          <div className="queue-list">
            {results.length === 0 ? <EmptyState title="No selected client" description="Search for an existing client before linking a booking. A caller snapshot remains available for phone-only customers." /> : null}
            {results.map((client) => (
              <button className={`queue-item ${selectedClient?.id === client.id ? 'is-selected' : ''}`} key={client.id} onClick={() => setSelectedClientId(client.id)} type="button">
                <strong>{client.fullName || client.email || client.phone || 'Unnamed client'}</strong>
                <span>{client.phone || client.email || client.id}</span>
                <StatusBadge tone={client.accountStatus === 'active' ? 'ready' : 'warn'}>{humanAccountStatus(client.accountStatus)}</StatusBadge>
              </button>
            ))}
          </div>
          <div className="decision-panel">
            {selectedClient ? (
              <>
                <div className="detail-heading">
                  <div>
                    <p className="eyebrow">Client profile</p>
                    <h3>{selectedClient.fullName || selectedClient.email || selectedClient.phone}</h3>
                    <p className="muted">{selectedClient.id}</p>
                  </div>
                  <StatusBadge tone={selectedClient.accountStatus === 'active' ? 'ready' : 'warn'}>{humanAccountStatus(selectedClient.accountStatus)}</StatusBadge>
                </div>
                <div className="detail-grid">
                  <span>Phone <strong>{selectedClient.phone || 'Not set'}</strong></span>
                  <span>Email <strong>{selectedClient.email || 'Not set'}</strong></span>
                  <span>Role <strong>{roleLabels[selectedClient.role]}</strong></span>
                  <span>Created <strong>{formatDate(selectedClient.createdAt)}</strong></span>
                </div>
              </>
            ) : (
              <EmptyState title="No client selected" description="Client details appear here after a successful lookup." />
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function AssistantNotificationsPanel({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const [pendingReadId, setPendingReadId] = useState('');
  const [error, setError] = useState('');
  const notificationsQuery = useQuery({
    enabled,
    queryKey: ['assistant-notifications'],
    queryFn: async () => ((await kuliApi.request('/assistant/notifications')) as ApiEnvelope<NotificationRecord[]>).data
  });
  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((notification) => notification.deliveryStatus !== 'read').length;

  if (!enabled) {
    return null;
  }

  const markRead = async (notificationId: string) => {
    setPendingReadId(notificationId);
    setError('');

    try {
      await kuliApi.request(`/notifications/${notificationId}/read`, { method: 'PATCH' });
      await queryClient.invalidateQueries({ queryKey: ['assistant-notifications'] });
      await queryClient.invalidateQueries({ queryKey: ['assistant-dashboard'] });
    } catch (readError) {
      setError(getErrorMessage(readError));
    } finally {
      setPendingReadId('');
    }
  };

  return (
    <>
      <PageIntro
        eyebrow="Assistant alerts"
        title="Notifications"
        description="Review assistant-specific operational alerts and mark them read after action."
        action={<StatusBadge tone={unreadCount ? 'warn' : 'ready'}>{unreadCount} unread</StatusBadge>}
      />
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      {notificationsQuery.isError ? <p className="field-error">{getErrorMessage(notificationsQuery.error)}</p> : null}
      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Notification center</p>
            <h2>Updates</h2>
          </div>
          <button className="secondary-action" type="button" onClick={() => notificationsQuery.refetch()}>
            <RefreshCw aria-hidden="true" size={16} />
            Refresh
          </button>
        </div>
        <div className="notification-list">
          {notificationsQuery.isLoading ? <p className="muted">Loading notifications...</p> : null}
          {notifications.length === 0 && !notificationsQuery.isLoading ? <EmptyState title="No updates yet" description="Ticket, request, assignment, and support notifications will appear here." /> : null}
          {notifications.map((notification) => (
            <div className="notification-card" key={notification.id}>
              <span className="notification-card__icon">
                <Bell aria-hidden="true" size={18} />
              </span>
              <span>
                <strong>{notification.title}</strong>
                <small>{notification.body || humanize(notification.type)}</small>
                <em>{formatDateTime(notification.createdAt)}</em>
              </span>
              <span className="document-review-card__actions">
                <StatusBadge tone={notification.deliveryStatus === 'read' ? 'muted' : 'warn'}>{notification.deliveryStatus === 'read' ? 'Read' : 'Unread'}</StatusBadge>
                {notification.deliveryStatus !== 'read' ? (
                  <button className="secondary-action secondary-action--compact" disabled={pendingReadId === notification.id} onClick={() => markRead(notification.id)} type="button">
                    {pendingReadId === notification.id ? 'Saving...' : 'Mark read'}
                  </button>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function BlockedAccount({ profile, onSignOut }: { profile: UserProfile; onSignOut: () => void }) {
  return (
    <main className="login-shell">
      <section className="login-panel">
        <p className="eyebrow">Account status</p>
        <h1>Staff commands are blocked.</h1>
        <p className="muted">{profile.fullName || profile.email} is currently marked {humanAccountStatus(profile.accountStatus)}.</p>
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

function AdminRouteOutlet({ page }: { page: AdminPageKey }) {
  switch (page) {
    case 'dashboard':
      return <AdminDashboardPanel enabled />;
    case 'users':
      return <AdminUsersPanel enabled />;
    case 'verification':
      return <AdminVerificationPanel enabled />;
    case 'vehicleClasses':
      return <AdminVehicleClassesPanel enabled />;
    case 'pricing':
      return <AdminPricingPanel enabled />;
    case 'reports':
      return <AdminTrustFinancePanel enabled view="reports" />;
    case 'payments':
      return <AdminTrustFinancePanel enabled view="payments" />;
    case 'kuliRequests':
      return <AdminTripOversightPanel enabled />;
    case 'audit':
      return <AdminAuditLogPanel enabled />;
    default:
      return <AdminDashboardPanel enabled />;
  }
}

function AssistantRouteOutlet({ page, profile }: { page: AssistantPageKey; profile: UserProfile }) {
  switch (page) {
    case 'dashboard':
      return <AssistantDashboardPanel enabled profile={profile} />;
    case 'booking':
      return <AssistantSupportPanel enabled profile={profile} />;
    case 'tickets':
      return <AssistantTicketsPanel enabled profile={profile} />;
    case 'requests':
      return <AssistantRequestsPanel enabled />;
    case 'trucks':
      return <AssistantTrucksPanel enabled />;
    case 'clients':
      return <AssistantClientsPanel enabled />;
    case 'notifications':
      return <AssistantNotificationsPanel enabled />;
    default:
      return <AssistantDashboardPanel enabled profile={profile} />;
  }
}

function StaffWorkspace({ profile, onSignOut }: { profile: UserProfile; onSignOut: () => void }) {
  const workspace = profile.role === 'admin' ? 'admin' : 'assistant';
  const routes = workspace === 'admin' ? adminRoutes : assistantRoutes;
  const [activePath, setActivePath] = useState(() => normalizeWorkspacePath(window.location.pathname, routes));
  const activeRoute = routes.find((route) => route.path === activePath) ?? routes[0];

  useEffect(() => {
    const nextPath = normalizeWorkspacePath(window.location.pathname, routes);
    setActivePath(nextPath);

    if (window.location.pathname !== nextPath) {
      window.history.replaceState({}, '', nextPath);
    }

    const handlePopState = () => {
      setActivePath(normalizeWorkspacePath(window.location.pathname, routes));
    };

    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, [routes]);

  const navigateTo = (path: string) => {
    const nextPath = normalizeWorkspacePath(path, routes);

    if (nextPath !== window.location.pathname) {
      window.history.pushState({}, '', nextPath);
    }

    setActivePath(nextPath);
  };

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Workspace navigation">
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true">K</span>
          <div>
            <p className="eyebrow">KULI Operations</p>
            <h1>{workspace === 'admin' ? 'Admin control room' : 'Assistant console'}</h1>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label={`${workspace} sections`}>
          {routes.map((route) => {
            const Icon = route.icon;
            const isActive = route.path === activePath;

            return (
              <button
                aria-current={isActive ? 'page' : undefined}
                className={`sidebar-nav__item ${isActive ? 'is-active' : ''}`}
                key={route.path}
                onClick={() => navigateTo(route.path)}
                type="button"
              >
                <Icon aria-hidden="true" size={18} />
                <span>{route.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="identity-card">
          <strong>{profile.fullName || profile.email}</strong>
          <span>{roleLabels[profile.role]}</span>
          <StatusBadge tone={profile.accountStatus === 'active' ? 'ready' : 'warn'}>{humanAccountStatus(profile.accountStatus)}</StatusBadge>
        </div>
        <div className="notice">
          <AlertTriangle aria-hidden="true" size={18} />
          <p>Your staff permissions decide which operational tools appear here.</p>
        </div>
        <button className="sidebar-button" type="button" onClick={onSignOut}>
          <LogOut aria-hidden="true" size={18} />
          Sign out
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{workspace === 'admin' ? 'Admin workspace' : 'Assistant workspace'}</p>
            <h2>{activeRoute?.label ?? (workspace === 'admin' ? 'Admin dashboard' : 'Assistant console')}</h2>
            <p className="muted">{activeRoute?.detail}</p>
          </div>
          <StatusBadge tone="ready">
            <CheckCircle2 aria-hidden="true" size={14} /> Authenticated
          </StatusBadge>
        </header>

        <div className="panel-grid">
          {workspace === 'admin' ? <AdminRouteOutlet page={(activeRoute as AdminRouteItem).page} /> : <AssistantRouteOutlet page={(activeRoute as AssistantRouteItem).page} profile={profile} />}
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

/**
 * Root Controller and Orchestrator for the KULI Admin & Assistant Console.
 * Validates staff authentication, synchronizes access tokens, checks roles,
 * and renders either the administrative portal, the assistant console, or login view.
 */
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
      setSessionAccessToken(null);
      setLoading(false);
      return;
    }

    setSessionAccessToken(nextSession.access_token);

    try {
      const profile = await fetchProfileForSession(nextSession);
      setProfile(profile);
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
    setSessionAccessToken(nextSession.access_token);
    setSession(nextSession);
    setProfile(nextProfile);
    setProfileMissing(false);
    setLoading(false);
  };

  const handleSignOut = async () => {
    clearSessionAccessToken();
    setSessionAccessToken(null);
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
