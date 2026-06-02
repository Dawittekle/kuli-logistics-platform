# KULI Logistics Platform

KULI is a peer-to-peer trucking and logistics marketplace designed for Addis Ababa operations. This repository is the implementation workspace for the platform and the persistent handoff surface for multiple AI coding agents.

## Repository Status

The repository now contains:

- A full project documentation package in [`docs/`](docs).
- A monorepo for API, mobile, admin, and shared domain contracts.
- A MongoDB-backed API covering the MVP backend workflows.
- A real Expo React Native mobile foundation for client and truck-owner workflows.
- A real React/Vite admin foundation for admin and call-center assistant workflows.

## Monorepo Layout

```text
apps/
  api/
  admin/
  mobile/
packages/
  shared/
tools/
docs/
```

## Quick Start

### 1. Review the source-of-truth docs

Start with:

- [`docs/project_overview.md`](docs/project_overview.md)
- [`docs/system_architecture.md`](docs/system_architecture.md)
- [`docs/development_phases.md`](docs/development_phases.md)
- [`docs/progress_tracking.md`](docs/progress_tracking.md)
- [`docs/frontend_progress.md`](docs/frontend_progress.md)

### 2. Run repository validation

```bash
npm run lint
npm run typecheck
npm test
npm run smoke:critical
npm run verify:startup
```

These scripts validate the current scaffold and execute foundational policy tests.

### 3. Start local services

```bash
docker compose up -d
```

MongoDB listens on `localhost:27018` and Redis listens on `localhost:6380` by default.

### 4. Verify local startup

```bash
npm run verify:startup
```

This checks the admin React/Vite foundation, mobile Expo foundation, admin production build, and API startup against MongoDB.

### 5. Run the API server

```bash
npm run dev --workspace @kuli/api
```

The server exposes:

- `GET /api/v1/health`
- `POST /api/v1/auth/sync-profile`
- `GET /api/v1/me`
- `PATCH /api/v1/me`
- `GET /api/v1/admin/users`
- `GET /api/v1/admin/users/:id`
- `POST /api/v1/admin/users`
- `POST /api/v1/admin/staff-users`
- `PATCH /api/v1/admin/users/:userId/status`
- `GET /api/v1/vehicle-classes`
- `POST /api/v1/vehicles`
- `GET /api/v1/vehicles/mine`
- `GET /api/v1/vehicles/:id`
- `PATCH /api/v1/vehicles/:id`
- `POST /api/v1/files/upload-intent`
- `GET /api/v1/files/:id/signed-url`
- `POST /api/v1/vehicles/:id/documents`
- `PATCH /api/v1/vehicles/:id/availability`
- `GET /api/v1/admin/vehicles/pending`
- `GET /api/v1/admin/vehicles/:id`
- `PATCH /api/v1/admin/vehicles/:id/verification`
- `POST /api/v1/quotes`
- `GET /api/v1/admin/pricing-rules`
- `POST /api/v1/admin/pricing-rules`
- `PATCH /api/v1/admin/pricing-rules/:id/activate`
- `POST /api/v1/kuli-requests`
- `GET /api/v1/kuli-requests/mine`
- `GET /api/v1/kuli-requests/:id`
- `POST /api/v1/kuli-requests/:id/cancel`
- `PATCH /api/v1/kuli-requests/:id/status`
- `GET /api/v1/kuli-requests/:id/events`
- `GET /api/v1/kuli-requests/:id/messages`
- `POST /api/v1/kuli-requests/:id/messages`
- `POST /api/v1/kuli-requests/:id/rating`
- `POST /api/v1/kuli-requests/:id/payment/confirm`
- `POST /api/v1/kuli-requests/:id/payment/dispute`
- `GET /api/v1/owner/offers`
- `GET /api/v1/owners/:id/ratings`
- `POST /api/v1/offers/:id/viewed`
- `POST /api/v1/offers/:id/accept`
- `POST /api/v1/offers/:id/decline`
- `POST /api/v1/reports`
- `POST /api/v1/reports/:id/evidence/upload-intent`
- `POST /api/v1/reports/:id/evidence`
- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/:id/read`
- `PATCH /api/v1/me/notification-preferences`
- `POST /api/v1/admin/jobs/expire-offers`
- `GET /api/v1/assistant/tickets`
- `POST /api/v1/assistant/tickets`
- `GET /api/v1/assistant/tickets/:id`
- `PATCH /api/v1/assistant/tickets/:id/status`
- `POST /api/v1/assistant/bookings`
- `GET /api/v1/assistant/clients/search`
- `POST /api/v1/admin/jobs/expire-pending-client-tickets`
- `GET /api/v1/admin/reports`
- `PATCH /api/v1/admin/reports/:id`
- `GET /api/v1/admin/payments`
- `PATCH /api/v1/admin/payments/:id`
- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/audit-logs`
- `GET /api/v1/admin/release-readiness`

### 6. Run the admin web app

```bash
npm run dev:admin
```

The admin app runs on Vite's local server, usually `http://localhost:5174`.

### 7. Run the mobile app

```bash
npm run dev:mobile
```

The preferred command above runs Expo from `apps/mobile`. If Expo is accidentally started from the repository root, the root Expo entrypoint delegates to the same mobile app so Metro does not fall back to looking for a missing root `App` file.

For Android emulator testing, use this API base URL in `apps/mobile/.env`:

```env
MOBILE_APP_API_BASE_URL=http://10.0.2.2:4000/api/v1
```

`10.0.2.2` is the Android emulator bridge back to the host machine. Keep `apps/admin/.env` on `http://localhost:4000/api/v1` for browser testing on the same machine.

The first `npm run android --workspace @kuli/mobile` run may download Expo Go into the emulator. If that download is slow, the Android bundle can still be checked with:

```bash
cd apps/mobile
npx expo export --platform android --output-dir /tmp/kuli-mobile-export
```

## Local Demo Auth and Fake Users

For local UI exploration, enable demo auth in your ignored `.env` files:

```env
# apps/api/.env
DEMO_AUTH_ENABLED=true

# apps/mobile/.env
MOBILE_APP_DEMO_AUTH_ENABLED=true

# apps/admin/.env
ADMIN_APP_DEMO_AUTH_ENABLED=true
```

When demo auth is enabled outside production, the mobile login/register form and demo client/owner buttons create or refresh MongoDB profiles with local development tokens instead of calling Supabase. The admin login form and demo admin/assistant buttons do the same for staff. This lets you explore the UI without creating Supabase users or sending email OTPs.

You can also seed many fake local users and vehicles:

```bash
npm run seed:fake-users
```

The seed is idempotent by record id and creates demo clients, truck owners, vehicles, staff users, and hotline tickets. Override counts with `FAKE_CLIENTS` and `FAKE_OWNERS` if needed.

Demo mobile web flow:

1. Start Docker services with `docker compose up -d`.
2. Start the API with `npm run dev:api`.
3. Start mobile web from `apps/mobile` with `npx expo start --web --clear`.
4. Confirm the login screen shows `Local demo auth` as set.
5. Register as `Client` or `Truck owner` with any email and any short password. Blank phone is allowed in demo mode.
6. Sign out and log in again with the same email to return to the same local demo profile.

If you open admin or mobile web through your machine's LAN address, for example `http://192.168.x.x:5174`, keep `CORS_ALLOW_PRIVATE_NETWORK=true` in `apps/api/.env` during development. Production should leave private-network CORS disabled and use explicit hosted origins.

Local development tokens use:

Use:

```text
Authorization: Bearer dev:<supabaseUserId>
```

Example:

```text
Authorization: Bearer dev:client-demo-001
```

Examples created by `npm run seed:fake-users` include `dev:demo-client-001`, `dev:demo-owner-001`, `dev:demo-admin-001`, and `dev:demo-assistant-001`.

Keep all demo auth flags disabled in production. Production must use `SUPABASE_JWT_MODE=supabase` with real Supabase project values in `apps/api/.env`.

## Admin Bootstrap

The API can bootstrap a first admin profile at startup using environment variables:

```env
BOOTSTRAP_ADMIN_SUPABASE_USER_ID=admin-seed-001
BOOTSTRAP_ADMIN_EMAIL=admin@kuli.local
BOOTSTRAP_ADMIN_FULL_NAME=Seed Admin
```

That bootstrap path is included because staff accounts are not allowed to self-register publicly.

## Local Infrastructure

Use Docker Compose for local MongoDB and Redis:

```bash
docker compose up -d
```

See [`docker-compose.yml`](docker-compose.yml).

## Supabase Project Values

For local Supabase verification, create `apps/api/.env`, `apps/mobile/.env`, and `apps/admin/.env` from the example files. The API can derive issuer and JWKS URLs from `SUPABASE_URL`, but the examples show the explicit values too.

The backend follows Supabase's current JWT guidance:

- Asymmetric user access tokens are verified against `SUPABASE_JWKS_URL`.
- Legacy/shared-secret `HS256` user access tokens are verified through `GET /auth/v1/user` with `SUPABASE_ANON_KEY`.

Do not put the Supabase service-role key in frontend env files or commit it anywhere. Phase 1 does not need the service-role key or JWT secret for normal user-token verification.

## Current Limitations

- The API currently covers identity/profile/RBAC, vehicle verification, quote/pricing/search, request/offer acceptance, manual trip execution, request-scoped messages, in-app notification records, assisted booking tickets, ratings, reports, and cash/manual payment records.
- Frontend phases are implemented for mobile web/Expo and admin web, including role-aware auth, marketplace workflows, trust/payment screens, and admin/assistant operations.
- Supabase JWKS verification is wired in the API, and the mobile/admin apps have Supabase clients configured through local env files.
- No file storage, telephony integration, digital payment gateway, automated commission collection, or production notification delivery flows yet.
- Production deployment still requires real provider credentials, backups, monitoring, and a hosted environment even though release-readiness checks and smoke scripts are now scaffolded.

Those remaining items are tracked in [`docs/progress_tracking.md`](docs/progress_tracking.md).
