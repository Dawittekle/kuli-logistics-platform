# KULI Logistics Platform

A peer-to-peer logistics marketplace connecting clients who need freight transport with verified independent truck owners in Addis Ababa, Ethiopia.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, TypeScript, MongoDB (Mongoose), Redis |
| Mobile | Expo React Native, TypeScript, TanStack Query |
| Admin Dashboard | React, TypeScript, Vite |
| Auth | Supabase Auth (JWT) |
| Infrastructure | Docker Compose (MongoDB + Redis) |

## Architecture

The platform follows a **modular monolith** pattern — a single backend service with domain-separated modules (accounts, vehicle registry, logistics/marketplace, support, engagement, notifications, files, audit).

### System Roles

- **Client** — end user requesting transport; can register, create requests, track trips, message, rate, and report
- **Truck Owner** — supply-side user; registers vehicles, uploads documents, manages availability, accepts offers, updates trip status
- **Call-Center Assistant** — staff role for assisted bookings via hotline tickets (web dashboard)
- **Admin** — privileged operator; manages users, vehicle verification, pricing, reports, disputes, audit logs (web dashboard)


## Project Structure

```
apps/
  api/          — Backend API server (Express-style HTTP router)
  admin/        — React web dashboard for admin & assistant roles
  mobile/       — Expo React Native app for client & truck owner
packages/
  shared/       — Shared enums, constants, types, and API client
```

## Prerequisites

- Node.js 20+
- Docker and Docker Compose (for local MongoDB and Redis)
- npm (workspaces-enabled)

## Quick Start

### 1. Start local services

```bash
docker compose up -d
```

MongoDB on port `27018`, Redis on port `6380`.

### 2. Configure environment

Copy the example env files and set your values:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
cp apps/admin/.env.example apps/admin/.env
```

### 3. Install dependencies

```bash
npm install
```

### 4. Seed vehicle classes and demo data

```bash
npm run seed:demo --workspace @kuli/api
```

### 5. Run the API

```bash
npm run dev:api
```

The server starts at `http://localhost:4000`.

### 6. Run the mobile app

```bash
npm run dev:mobile
```

Opens Expo dev tools for web/Android/iOS testing.

### 7. Run the admin dashboard

```bash
npm run dev:admin
```

Runs at `http://localhost:5174`.

## Testing

The backend uses Node's built-in test runner with test suites covering all major domains:

```bash
npm test
```

The test suites verify:

- **Identity & Auth** — profile sync, role guards, account status enforcement, staff provisioning, registration rules
- **Vehicle Registry** — CRUD operations, document metadata attachment, verification transitions, availability gating
- **Quotes & Pricing** — distance calculation, pricing rule application, quote breakdown accuracy, vehicle class filtering
- **Marketplace** — request creation with idempotency, offer dispatch, first-accept-wins concurrency, timeout and cancellation cleanup
- **Trip Execution** — valid and invalid status transitions, event logging, cancellation policy enforcement
- **Assisted Booking** — hotline ticket lifecycle, client lookup, assisted request creation, direct truck assignment, busy-truck protection
- **Engagement** — rating submission and duplicate blocking, report creation with evidence, payment confirmation and dispute, admin resolution with audit trails
- **Hardening** — CORS configuration, security headers, rate limiting, runtime config validation

## API Endpoints
<details>
<summary>Endpoints</summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/me` | Current user profile |
| POST | `/api/v1/me/sync-profile` | Sync Supabase identity to MongoDB profile |
| POST | `/api/v1/quotes` | Calculate trip quote |
| POST | `/api/v1/kuli-requests` | Create transport request |
| GET | `/api/v1/kuli-requests/mine` | Current user's requests |
| POST | `/api/v1/kuli-requests/:id/cancel` | Cancel request |
| POST | `/api/v1/kuli-requests/:id/messages` | Send message |
| GET | `/api/v1/owner/offers` | Owner's offer inbox |
| POST | `/api/v1/offers/:id/accept` | Accept offer |
| POST | `/api/v1/offers/:id/decline` | Decline offer |
| POST | `/api/v1/owner/vehicles` | Register vehicle |
| PATCH | `/api/v1/owner/vehicles/:id/availability` | Toggle vehicle availability |
| POST | `/api/v1/reports` | Submit report |
| GET | `/api/v1/notifications` | List notifications |
| GET | `/api/v1/admin/dashboard` | Admin metrics |
| GET | `/api/v1/admin/audit-logs` | Audit log viewer |
</details>

## Authentication

KULI uses **Supabase Auth** for identity management. The backend verifies JWTs and resolves application roles from MongoDB profile records (not client-held claims). Public self-registration is available for clients and truck owners; staff accounts (admin, assistant) are provisioned through an admin-only workflow.

## Roadmap

The following features are planned for future versions:

- **GPS tracking** — real-time location sharing during active trips, with opt-in privacy controls
- **Digital payments** — card and mobile-money payment processing through a gateway integration, with automated settlement and reconciliation
- **Fleet management** — separating truck owners from drivers, letting one owner manage multiple drivers and vehicles
- **Multi-city expansion** — service area definitions, city-specific pricing rules, and region-aware search
- **Local language support** — Amharic and other Ethiopian language translations through i18n key bindings
- **SMS and push notification delivery** — production-grade notification dispatch through configured providers
- **Insurance integration** — policy purchase and claim handling through third-party insurance partners

## How the App Works

### The Full Marketplace Lifecycle

KULI's core flow turns a freight request into a completed delivery. Here's how it works from end to end.

#### 1. Client Creates a Request

 a user opens the mobile app to create a request, they enter their pickup and destination locations, which map directly to coordinates for route tracking. They also fill in cargo details like item type, weight, dimensions, and handling needs, before picking a truck class and scheduled time. The system sends this data to the backend to generate a real-time quote detailing distance, ETA, and the fare breakdown. Right on that same screen, the user can browse active nearby trucks ranked by proximity, customer ratings, and capacity. To finish up, they just select which specific drivers should receive their logistics request

#### 2. Request Becomes Offers

Once the client confirms, the backend creates a KULI request record and dispatches individual offers to each selected truck owner. Each offer enters a pending state with a configurable timeout — if an owner doesn't respond in time, the offer expires automatically.

#### 3. Owner Accepts (First-Accept-Wins)

Truck owners see incoming offers in their offer inbox with the route, load details, estimated payout, and the client's information. They can view the details, then accept or decline. Here's where the system's concurrency guard kicks in: if multiple owners try to accept the same request at nearly the same time, only the first one to commit wins. The others see a clear conflict message saying the request is already taken.

#### 4. Trip Execution

After acceptance, the trip moves through a series of manual status updates controlled by the truck owner. The owner progresses through: en route to pickup, arrived, loading, in transit, unloading, and completed. Each transition is validated by the backend — you cannot skip steps or move backwards. Every status change creates an immutable timestamped event that both the client and owner can see in the trip timeline.

The client watches from their end — a map preview shows the route, the timeline lists every status event, and the request-scoped chat lets them coordinate with the owner in real time.

#### 5. Payment, Ratings, and Reports

When the trip reaches completed, a cash/manual payment record is created automatically. The owner confirms they received payment from the earnings screen. If the client disagrees with the amount or suspects an issue, they can file a dispute from the activity screen — this flags the payment for admin review.

Clients can also rate the trip (star rating with an optional review) or submit a report with evidence photos if something went wrong. Reports enter an admin resolution queue where an administrator reviews the details, can apply visibility penalties to the owner's matching score, and records the outcome with an audit trail.

### Assisted Booking: How Call-Center Help Works

Not every client has a smartphone or data plan. KULI handles this through the assistant dashboard.

A call-center assistant receives a phone call, creates a hotline ticket in the admin web app, looks up the caller by phone number, and walks through the same quote-and-request flow on their behalf. The assistant can either dispatch offers to multiple owners (same as a normal client request) or directly assign an available truck if the caller needs immediate confirmation. The system links the ticket to the resulting request so the full history is traceable.

The assistant's ticket queue tracks state: incoming, assigned, in progress, waiting for client (paused while the assistant waits for the caller to call back), closed, or cancelled.

### Vehicle Verification: How Truck Owners Get Onboard

Before a truck appears in search results, it has to go through admin verification. Here's the owner's side:

1. Register your vehicle — pick a category, enter the license plate, capacity, and details
2. Upload required documents one by one: proof of identity, driver's license, registration certificate, ownership proof, and optionally insurance. Each document can be captured from the camera or picked from the gallery
3. Submit for review — the vehicle enters a pending state
4. Wait for admin approval — an admin reviews the documents in the verification queue, can preview each file, and either approves or rejects with a reason
5. Once approved, toggle your availability to online. Unapproved vehicles cannot receive offers, period

### Admin Operations Dashboard

The admin dashboard ties everything together. From one workspace, an administrator can:

- View key metrics: active trips, pending verifications, open reports, unresolved payments
- Manage users: search by role or status, view profiles, suspend or reactivate accounts
- Verify vehicles: work through the pending queue with document preview and approve/reject actions
- Configure pricing: create new pricing rule versions with base fares and per-km rates for each vehicle class, activate drafts, or deactivate old rules
- Oversee requests: browse all requests with filters, inspect trip timelines and participant details
- Resolve reports and payment disputes: review evidence, record outcomes with mandatory notes
- Inspect audit logs: filter by actor, action, or target type to trace every privileged operation

### Notifications and Messaging

Throughout the entire lifecycle, both parties get in-app notifications for important events: offer received, request accepted, status changes, new messages, payment confirmations, and more. Each user can configure which channels they want — push, SMS, or email — though external delivery depends on provider configuration.

The messaging system is scoped to each request: the client and the assigned owner can exchange messages during the active trip. After the trip completes, messages stay open while payment is pending or disputed, and then archive automatically once payment is confirmed or resolved. If a trip is cancelled or times out, the chat collapses into a read-only archive.

## Features

- Role-based authentication and authorization (Supabase Auth + MongoDB profile sync)
- Vehicle registration with document upload and admin verification workflow
- Configurable pricing rules with quote calculation (distance, load, vehicle class)
- Geospatial nearby vehicle search with ranking (distance, rating, dispute history)
- Request dispatch with first-accept-wins offer handling and timeout cleanup
- Manual trip status tracking with immutable event timeline
- Request-scoped messaging between clients and truck owners
- In-app notifications with preference controls
- Assisted booking workflow via call-center hotline tickets
- Ratings, reviews, and report/dispute resolution with admin oversight
- Cash/manual payment records with confirmation, dispute, and admin resolution
- Admin operations dashboard with metrics, user management, and audit log
