# KULI Logistics Platform

KULI is a peer-to-peer logistics marketplace for Addis Ababa. It connects clients who need truck transport with verified truck owners, and includes an admin/call-assistant dashboard for verification, support, pricing, and operations.

The repository is a JavaScript/TypeScript monorepo with three application surfaces:

- `apps/api` - Node.js REST API, modular domain services, MongoDB persistence, Supabase Auth token verification.
- `apps/mobile` - Expo React Native app for clients and truck owners.
- `apps/admin` - Vite React dashboard for administrators and call-center assistants.
- `packages/shared` - Shared contracts and API client helpers.

## Architecture

KULI uses a layered modular monolith: the API owns business rules, MongoDB owns product data, and Supabase is used only as the identity provider. Mobile and admin clients authenticate with Supabase, then call the API with bearer tokens.

```text
Mobile/Admin -> Node API -> MongoDB
                  |
                  -> Supabase Auth JWKS
```

Core workflows include role-based onboarding, vehicle/document verification, quote generation, nearby vehicle matching, first-accept-wins offers, manual trip status tracking, cash payment confirmation, request messaging, ratings, reports, notifications, and hotline-assisted booking.

## Requirements

- Node.js 20+
- npm workspaces
- Docker and Docker Compose
- A Supabase project for real authentication

## Environment

Copy the examples and fill in local values:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
cp apps/admin/.env.example apps/admin/.env
```

Supabase uses the current API key model:

- Use `sb_publishable_...` keys in `SUPABASE_PUBLISHABLE_KEY`, `MOBILE_APP_SUPABASE_PUBLISHABLE_KEY`, and `ADMIN_APP_SUPABASE_PUBLISHABLE_KEY`.
- Do not put `sb_secret_...` or any elevated key in mobile or browser env files.
- Keep `SUPABASE_JWKS_URL` pointed at `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`.

For local demo auth without Supabase sessions, set:

```env
DEMO_AUTH_ENABLED=true
MOBILE_APP_DEMO_AUTH_ENABLED=true
ADMIN_APP_DEMO_AUTH_ENABLED=true
```

## Install

```bash
npm install
docker compose up -d
```

Docker exposes:

- MongoDB: `localhost:27018`
- Redis: `localhost:6380`

## Run Locally

Start each service in a separate terminal:

```bash
npm run dev:api
npm run dev:admin
npm run dev:mobile
```

Default URLs:

- API: `http://127.0.0.1:4000/api/v1`
- Admin dashboard: `http://localhost:5174`
- Mobile: Expo Dev Tools/Metro from `npm run dev:mobile`

For Android emulator access to the local API, set `MOBILE_APP_API_BASE_URL=http://10.0.2.2:4000/api/v1`.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run smoke:critical
npm run verify:startup
```

Useful data commands:

```bash
npm run seed:demo
npm run seed:fake-users
npm run reset:auth-data
```

## Production Notes

- Set `NODE_ENV=production`.
- Set `SUPABASE_JWT_MODE=supabase`.
- Keep demo auth disabled.
- Restrict `CORS_ORIGINS` to deployed mobile/web origins.
- Use managed MongoDB with backups and TLS.
- Provision staff users through Supabase Auth, then map their KULI roles in MongoDB.
- Rotate Supabase publishable/secret keys from the Supabase dashboard; never commit secrets.

For domain rules and implementation guardrails, see `docs/KULI_DEVELOPER_GUIDE.md`.
