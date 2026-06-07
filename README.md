# KULI Logistics Platform

KULI is a private logistics marketplace platform for coordinating truck-based transport in Addis Ababa, Ethiopia. It connects clients who need to move goods with verified truck owners, while giving operations staff the tools to support assisted booking, vehicle verification, pricing, disputes, and audit trails.

This repository is a JavaScript/TypeScript monorepo containing the API, admin web app, mobile app, shared contracts, tests, verification tools, and Docker configuration needed to run and validate the system.

## Product Scope

KULI supports four operational roles:

- Clients create logistics requests, receive route and price estimates, choose available truck offers, track trip status, message trip participants, dispute payments, and rate completed trips.
- Truck owners register vehicles, upload verification documents and photos, manage availability, receive offers, accept work through a first-accept-wins flow, advance trip status, and confirm cash payment.
- Call-center assistants manage hotline tickets, look up client profiles, create assisted requests, assign trucks, and close support workflows.
- Administrators review vehicle documents, approve or reject vehicles, manage pricing rules, inspect operations, handle account status changes, and resolve disputes with audit logging.

Core workflows covered by the test suite include identity/profile sync, account status and role guards, vehicle verification, quotes, matching, offer acceptance races, manual trip execution, assisted booking, notifications, payments, ratings, reporting, admin previews, and file metadata handling.

## Repository Layout

```text
apps/
  api/       Node.js HTTP API and domain modules
  admin/     Vite/React admin and assistant console
  mobile/    Expo/React Native client and owner app
packages/
  shared/    Shared roles, constants, and API client contracts
tests/       Cross-app contract and behavior tests
tools/       Lint, typecheck, startup, seed, and smoke scripts
scripts/     Repository maintenance and packaging scripts
```

## Architecture

The backend is a modular monolith. Domain boundaries are kept in separate modules, but deployment remains simple: one API process talks to MongoDB, Redis-compatible infrastructure, Supabase Auth, and file storage abstractions.

The frontend layer is split by audience:

- The mobile app is the primary public workflow for clients and truck owners.
- The admin app is the operational workflow for administrators and call-center assistants.

The API owns server-side enforcement for roles, account status, vehicle state, request transitions, offer acceptance, audit logging, and profile sync. Client-provided role or status values are not trusted as authority.

## Technical Decisions

- Node.js 20 is the runtime baseline.
- Native `node --test` is used for dependency-light API, contract, and workflow tests.
- MongoDB is the primary persistence layer for accounts, logistics requests, vehicles, documents, notifications, support tickets, payments, ratings, reports, and audits.
- Redis is configured as local infrastructure for queue/cache-style workflows.
- Supabase provides external authentication; the API verifies Supabase tokens through configured issuer, audience, and JWKS settings outside demo mode.
- Demo auth exists for local development only and is explicitly disabled by default.
- The mobile registration flow requires email/OTP confirmation before syncing the Mongo profile and routing users into a role home screen.
- Email delivery in local/test contexts writes to `EMAIL_LOG_PATH`, defaulting to `/tmp/kuli-sent-emails.log`, so the repository never depends on a developer-local path.
- Docker Compose is used for local dependencies. The root Dockerfile is a verification image, not the production runtime image: it copies the repository, installs dependencies, and runs lint, typecheck, and tests.

## Prerequisites

- Node.js 20 or newer
- npm with workspace support
- Docker Engine with Compose v2
- A Supabase project for non-demo authentication flows

## Environment Configuration

Copy the examples before running local apps:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/admin/.env.example apps/admin/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Important API settings:

```text
PORT=4000
HOST=127.0.0.1
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27018/kuli
REDIS_URL=redis://localhost:6380
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=replace-me
SUPABASE_JWT_MODE=supabase
SUPABASE_JWKS_URL=https://your-project-ref.supabase.co/auth/v1/.well-known/jwks.json
DEMO_AUTH_ENABLED=false
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:8081,http://127.0.0.1:8081,http://localhost:19006,http://127.0.0.1:19006
```

Important admin and mobile settings:

```text
ADMIN_APP_API_BASE_URL=http://localhost:4000/api/v1
ADMIN_APP_SUPABASE_URL=https://your-project-ref.supabase.co
ADMIN_APP_SUPABASE_ANON_KEY=replace-me

MOBILE_APP_API_BASE_URL=http://localhost:4000/api/v1
MOBILE_APP_SUPABASE_URL=https://your-project-ref.supabase.co
MOBILE_APP_SUPABASE_ANON_KEY=replace-me
MOBILE_APP_AUTH_REDIRECT_URL=kuli://auth/callback
MOBILE_APP_PASSWORD_RESET_REDIRECT_URL=kuli://auth/reset-password
```

Do not commit real `.env` files or real secrets. Only `.env.example` files belong in source control.

## Local Infrastructure With Docker

Start MongoDB and Redis:

```bash
docker compose up -d
```

Default local ports:

```text
MongoDB: localhost:27018
Redis:   localhost:6380
```

Check service status:

```bash
docker compose ps
```

View logs:

```bash
docker compose logs -f mongodb
docker compose logs -f redis
```

Stop services:

```bash
docker compose down
```

Stop services and remove local volumes:

```bash
docker compose down -v
```

## Install Dependencies

Use `npm ci` for reproducible installs:

```bash
npm ci
```

Use `npm install` only when intentionally updating dependencies and `package-lock.json`.

## Run The Applications

Start infrastructure first:

```bash
docker compose up -d
```

Start the API:

```bash
npm run dev:api
```

The API listens on `http://localhost:4000` by default.

Start the admin app:

```bash
npm run dev:admin
```

The admin Vite dev server listens on the port Vite selects, typically `http://localhost:5173` or `http://localhost:5174`.

Start the mobile app:

```bash
npm run dev:mobile
```

Expo will provide options for Android, iOS, and web depending on the local environment.

## Demo Data

Seed representative local data:

```bash
npm run seed:demo
npm run seed:fake-users
```

Reset temporary auth/demo data:

```bash
npm run reset:auth-data
```

Demo mode is local-only. Enable it only in local `.env` files:

```text
DEMO_AUTH_ENABLED=true
ADMIN_APP_DEMO_AUTH_ENABLED=true
```

Keep demo auth disabled for staging and production.

## Verification Commands

Run the full local verification set before merging or deploying:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run smoke:critical
```

Optional startup verification:

```bash
npm run verify:startup
```

`verify:startup` builds/verifies frontend foundations and starts the API long enough to confirm it reports readiness.

## Docker Verification Image

The root Dockerfile is designed to prove the repository can build in a clean container and that the test suite passes with repository history available inside the image.

Build the verification image:

```bash
docker build -t kuli-verification-check .
```

Verify Git history is present inside the image:

```bash
docker run --rm kuli-verification-check git -C /workspace log -1 --oneline
```

Run tests inside the image:

```bash
docker run --rm kuli-verification-check npm test
```

The Dockerfile:

- Uses `node:20-bookworm`.
- Installs `git` and `ca-certificates`.
- Installs dependencies from package manifests in a cacheable layer.
- Uses npm fetch retries to reduce transient registry failures.
- Copies the full repository afterward, including `.git`.
- Runs `npm ci`, `npm run lint`, `npm run typecheck`, and `npm test`.
- Includes a simple healthcheck suitable for static verification environments.

`.dockerignore` intentionally excludes dependency folders, real env files, build outputs, coverage, logs, temp files, and local agent metadata. It must not exclude `.git`.

## Repository Archive

After running local verification, regenerate the repository archive:

```bash
bash scripts/create-silver-zip.sh
```

The archive script can be run after `npm ci`. It warns about local dependency folders, creates the staged archive from a clean single-branch clone of the current branch, removes clone remote metadata, verifies a single `kuli-logistics-platform/` top-level folder, and checks that `.git/HEAD` is included while unsafe files are absent.

## Testing Strategy

The current tests are intentionally dependency-light so they can run in local shells and Docker without external managed services.

Test coverage includes:

- Identity profile sync and public registration role rules
- Supabase token verifier behavior
- Account status and role guards
- Quote pricing and matching
- Atomic offer acceptance behavior
- Trip lifecycle transitions and message permissions
- Vehicle class, vehicle, document, and file preview workflows
- Support ticket and assisted booking workflows
- Payment, rating, and report workflows
- Notification and local email log behavior
- Shared API client behavior
- Mobile registration confirmation decision logic

There is no committed coverage-report script. Do not claim a coverage percentage unless a coverage tool is added and run.

## Production Readiness Checklist

Before production deployment:

- Set `NODE_ENV=production`.
- Use `SUPABASE_JWT_MODE=supabase`.
- Configure real Supabase issuer, audience, JWKS URL, and anon key.
- Disable all demo auth flags.
- Restrict `CORS_ORIGINS` to deployed frontend origins.
- Keep `CORS_ALLOW_PRIVATE_NETWORK=false` unless there is a deliberate internal-network requirement.
- Use managed MongoDB and Redis-compatible services with backups, monitoring, and access controls.
- Route logs to the deployment logging platform instead of local files.
- Use production object storage for uploaded files and enforce MIME, size, and ownership checks.
- Protect admin bootstrap variables and rotate them after initial provisioning.
- Keep `.env`, secrets, dependency folders, build outputs, coverage reports, and logs out of source control.

## Operational Notes

- The admin and mobile apps depend on the API base URL and Supabase settings at build/runtime.
- Vehicle and document moderation decisions should include reasons so audit logs remain useful.
- Offer acceptance relies on conditional updates to prevent multiple owners from winning the same request.
- Registration must complete email confirmation before a new user profile is synced and routed to the client or truck-owner home screen.
- If a Docker command cannot reach the daemon, check `docker context show`, `docker context ls`, and the Docker service status before debugging the application.
