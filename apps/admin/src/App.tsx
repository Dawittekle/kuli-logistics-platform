import { ReactNode, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, Gauge, LockKeyhole, RefreshCw, ShieldCheck, Truck, UsersRound } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { runtimeConfig, runtimeReadiness } from './config/runtime';
import { kuliApi } from './lib/api';

const adminRoutes = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: Gauge, detail: 'Operational metrics and release readiness.' },
  { path: '/admin/users', label: 'Users', icon: UsersRound, detail: 'Role, status, and account controls.' },
  { path: '/admin/vehicles/pending', label: 'Verification', icon: Truck, detail: 'Document review and approve/reject decisions.' },
  { path: '/admin/pricing', label: 'Pricing', icon: ClipboardList, detail: 'Versioned pricing rules and audit-backed edits.' },
  { path: '/admin/audit-logs', label: 'Audit', icon: ShieldCheck, detail: 'Privileged action trail and filters.' }
];

const assistantRoutes = [
  { path: '/assistant/tickets', label: 'Tickets', icon: ClipboardList, detail: 'Claim, update, and close hotline tickets.' },
  { path: '/assistant/bookings/new', label: 'Assisted Booking', icon: Truck, detail: 'Create KULI requests during live calls.' },
  { path: '/assistant/clients', label: 'Client Lookup', icon: UsersRound, detail: 'Find clients by phone for assisted requests.' }
];

function StatusBadge({ tone, children }: { tone: 'ready' | 'warn' | 'blocked'; children: ReactNode }) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>;
}

function ApiHealthPanel() {
  const healthQuery = useQuery({
    queryKey: ['api-health'],
    queryFn: () => kuliApi.health()
  });

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Connection</p>
          <h2>Backend health</h2>
        </div>
        <StatusBadge tone={healthQuery.isSuccess ? 'ready' : healthQuery.isError ? 'blocked' : 'warn'}>
          {healthQuery.isSuccess ? 'Ready' : healthQuery.isError ? 'Needs API' : 'Checking'}
        </StatusBadge>
      </div>
      <p className="muted">{runtimeConfig.apiBaseUrl}</p>
      {healthQuery.isError ? <p className="field-error">The admin app cannot reach the API from this browser runtime yet.</p> : null}
      <button className="icon-button" type="button" onClick={() => healthQuery.refetch()}>
        <RefreshCw aria-hidden="true" size={18} />
        Check again
      </button>
    </section>
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
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Runtime</p>
          <h2>Environment readiness</h2>
        </div>
        <LockKeyhole aria-hidden="true" />
      </div>
      <div className="runtime-list">
        {rows.map((row) => (
          <div className="runtime-row" key={row.label}>
            <span>{row.label}</span>
            <StatusBadge tone={row.ready ? 'ready' : 'blocked'}>{row.ready ? 'Set' : 'Missing'}</StatusBadge>
          </div>
        ))}
      </div>
    </section>
  );
}

function RouteTable({ title, routes }: { title: string; routes: typeof adminRoutes }) {
  return (
    <section className="panel panel--wide">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Guarded shell</p>
          <h2>{title}</h2>
        </div>
        <StatusBadge tone="warn">Phase 0</StatusBadge>
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

export default function App() {
  const [workspace, setWorkspace] = useState<'admin' | 'assistant'>('admin');
  const routes = workspace === 'admin' ? adminRoutes : assistantRoutes;

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Workspace navigation">
        <div>
          <p className="eyebrow">KULI operations</p>
          <h1>Control room for verified truck logistics.</h1>
        </div>
        <div className="segmented" role="group" aria-label="Workspace role">
          <button className={workspace === 'admin' ? 'is-active' : ''} type="button" onClick={() => setWorkspace('admin')}>
            Admin
          </button>
          <button className={workspace === 'assistant' ? 'is-active' : ''} type="button" onClick={() => setWorkspace('assistant')}>
            Assistant
          </button>
        </div>
        <div className="notice">
          <AlertTriangle aria-hidden="true" size={18} />
          <p>Frontend authorization starts here, but the backend remains authoritative for every role and admin action.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Frontend Phase 0</p>
            <h2>{workspace === 'admin' ? 'Admin dashboard foundation' : 'Assistant console foundation'}</h2>
          </div>
          <StatusBadge tone="ready">
            <CheckCircle2 aria-hidden="true" size={14} /> Ready for Phase 1
          </StatusBadge>
        </header>

        <div className="panel-grid">
          <ApiHealthPanel />
          <RuntimePanel />
          <RouteTable title={workspace === 'admin' ? 'Admin routes' : 'Assistant routes'} routes={routes} />
        </div>
      </section>
    </main>
  );
}
