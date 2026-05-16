# KULI Logistics Platform

KULI is a peer-to-peer trucking and logistics marketplace designed for Addis Ababa operations. This repository is the implementation workspace for the platform and the persistent handoff surface for multiple AI coding agents.

## Repository Status

The repository now contains:

- A full project documentation package in [`docs/`](docs).
- A monorepo scaffold for API, mobile, admin, and shared domain contracts.
- A Phase 1 identity/RBAC foundation with a runnable API stub and route-shell placeholders for mobile and admin.

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

These scripts validate the current scaffold and execute foundational policy tests without requiring external package installation.

### 3. Run the API placeholder server

```bash
npm run dev --workspace @kuli/api
```

The server exposes:

- `GET /api/v1/health`
- `POST /api/v1/auth/sync-profile`
- `GET /api/v1/me`
- `PATCH /api/v1/me`
- `GET /api/v1/admin/users`
- `POST /api/v1/admin/staff-users`
- `PATCH /api/v1/admin/users/:userId/status`

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

This only exists to unblock Phase 1 architecture work. It must be replaced with real Supabase JWT verification in a later iteration before production readiness.

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

## Current Limitations

- No real database persistence yet; the API uses an in-memory repository for the auth/profile slice.
- No installed frontend framework yet; mobile and admin apps currently expose route and RBAC scaffolds rather than full UI builds.
- No real Supabase JWKS verification yet.
- The sandbox used for this implementation blocks binding a local HTTP port, so API module loading and tests were verified but a live listener was not fully exercised here.
- No file storage, vehicle registry, quotes, or marketplace execution flows yet.

Those remaining items are tracked in [`docs/progress_tracking.md`](docs/progress_tracking.md).
