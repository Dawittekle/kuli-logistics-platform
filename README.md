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

## Development Tokens

Until a real Supabase project is wired in, the API supports a development token mode.

Use:

```text
Authorization: Bearer dev:<supabaseUserId>
```

Example:

```text
Authorization: Bearer dev:client-demo-001
```

This exists to unblock local Phase 1 work. Set `SUPABASE_JWT_MODE=supabase` and provide the Supabase project values in `apps/api/.env` to use real Supabase JWT verification.

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
- Frontend Phase 0 is complete, but later phases still need real auth screens, forms, tables, maps/location UX, trip workflows, and admin/assistant feature screens.
- Supabase JWKS verification is wired in the API, and the mobile/admin apps have Supabase clients configured through local env files.
- No file storage, telephony integration, digital payment gateway, automated commission collection, or production notification delivery flows yet.
- Production deployment still requires real provider credentials, backups, monitoring, and a hosted environment even though release-readiness checks and smoke scripts are now scaffolded.

Those remaining items are tracked in [`docs/progress_tracking.md`](docs/progress_tracking.md).
