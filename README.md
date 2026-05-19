# KULI Logistics Platform

KULI is a peer-to-peer trucking and logistics marketplace designed for Addis Ababa operations. This repository is the implementation workspace for the platform and the persistent handoff surface for multiple AI coding agents.

## Repository Status

The repository now contains:

- A full project documentation package in [`docs/`](docs).
- A monorepo scaffold for API, mobile, admin, and shared domain contracts.
- A Phase 1 identity/RBAC foundation with a MongoDB-backed API slice and route-shell placeholders for mobile and admin.

The current code is intentionally dependency-light so it can run in this environment without downloading packages. The backend architecture is still aimed at a TypeScript modular monolith with NestJS once dependency installation is available.

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

### 2. Run repository validation

```bash
npm run lint
npm run typecheck
npm test
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

This checks the admin placeholder, mobile placeholder, and API startup against MongoDB.

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
- `GET /api/v1/owner/offers`
- `POST /api/v1/offers/:id/viewed`
- `POST /api/v1/offers/:id/accept`
- `POST /api/v1/offers/:id/decline`
- `POST /api/v1/admin/jobs/expire-offers`

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

- The API currently covers identity/profile/RBAC, vehicle verification, quote/pricing/search, and Phase 4 request/offer acceptance flows.
- No installed frontend framework yet; mobile and admin apps currently expose route and RBAC scaffolds rather than full UI builds.
- Supabase JWKS verification is wired in the API, but it still needs your project URL and anon key for real-device/auth-client testing.
- No file storage, trip execution, messaging, payment, rating, or production notification delivery flows yet.

Those remaining items are tracked in [`docs/progress_tracking.md`](docs/progress_tracking.md).
