# System Architecture

This document defines the target architecture for KULI. It should guide repository structure, module boundaries, data flow, infrastructure, service extraction decisions, and future scalability.

Related documents:
- [Backend Architecture](backend_architecture.md)
- [Database Design](database_design.md)
- [API Architecture](api_architecture.md)
- [Engineering Decisions](engineering_decisions.md)

## Architectural Style

KULI should be implemented as a layered modular monolith deployed as a small number of applications inside a TypeScript monorepo:

- `apps/api`: Node.js backend, recommended framework: NestJS.
- `apps/mobile`: Expo React Native mobile app for clients and truck owners.
- `apps/admin`: React web dashboard for admins and call-center assistants.
- `packages/shared`: shared types, DTOs, enums, validation schemas, constants, and API client helpers.

The backend is a monolith at deployment time but modular internally. Each domain owns its services, repositories, controllers, DTOs, and events. Cross-domain access should go through service APIs or domain events, not direct imports of another module's database models except where explicitly exposed.

This approach matches the project constraints:

- Lower operational complexity than microservices.
- Stronger consistency for booking and acceptance flows.
- Faster implementation by AI coding agents.
- Clear future extraction path for high-load modules such as matching, notifications, or payments.

## High-Level Architecture

```text
Mobile App (Client / Truck Owner)
        |
        | HTTPS REST, push tokens, optional WebSocket later
        v
API Gateway / Backend Edge
        |
        | validates Supabase JWT, rate limits, routes requests
        v
Modular Node.js Application
        |
        | Mongoose repositories, domain services, outbox/events
        v
MongoDB + Object Storage
        |
        | external calls
        v
Supabase Auth, Mapping/Routing API, SMS/Email/Push providers

Admin Web Dashboard / Assistant Console
        |
        | HTTPS REST
        v
Same API
```

## Backend Subsystems

### Edge and Identity

Owns request entry concerns:

- Supabase JWT verification.
- Profile loading and role hydration.
- RBAC policy enforcement.
- Rate limiting.
- Request correlation ids.
- API versioning.
- Global error formatting.

Supabase Auth handles credentials and token issuance. The backend owns application authorization.

### Accounts

Owns application profiles and role metadata:

- User profile lifecycle.
- Client, truck owner, assistant, and admin metadata.
- Notification preferences.
- Account states: active, unverified, suspended, banned, deleted.
- Staff provisioning and role changes.

### Truck Registry

Owns supply-side assets:

- Vehicle classes.
- Vehicles.
- Vehicle documents.
- Verification workflow.
- Owner active vehicle.
- Vehicle availability and operational state.
- Maintenance and suspension state.

Vehicle verification status and availability status must be separate fields.

### Logistics

Owns core marketplace behavior:

- KULI request creation and validation.
- Geocoding and route estimation.
- Pricing quote generation.
- Nearby vehicle discovery.
- Offer creation and dispatch.
- First-accept-wins acceptance.
- Trip lifecycle state machine.
- Status event log.
- Cancellation and timeout policy.

### Live Operations

In the first version, Live Operations means manual status synchronization, event logging, and messaging context. It does not mean continuous GPS telemetry.

Future Live Operations can add:

- WebSocket or SSE status streaming.
- Driver location pings.
- Route deviation detection.
- Customer-facing live map.

### Engagement

Owns post-trip and trust-building features:

- Ratings and reviews.
- Reports and disputes.
- Admin mediation outcomes.
- Owner visibility penalties from unresolved/frequent disputes.
- Payment records and manual payment confirmation.

Payment records live here because the first version is cash/manual settlement. If digital payments become complex, payment processing can be extracted later.

### Support Operations

Owns assisted booking:

- Hotline tickets.
- Missed call records.
- Assistant ticket assignment.
- Assisted request creation.
- Ticket status state machine.
- Client consent notes and call summaries.

### Shared Utilities

Cross-cutting infrastructure:

- Notification dispatch.
- Audit logs.
- File storage adapters.
- Mapping provider adapter.
- Outbox jobs.
- Logging and metrics.
- Configuration loading.

Shared utilities must not contain business decisions. They provide infrastructure primitives used by domain modules.

## Data Flow: Authentication

1. Client authenticates with Supabase using OTP, email link, password, or allowed provider.
2. Supabase issues an access token and refresh token.
3. Client calls `GET /api/v1/me` or `POST /api/v1/auth/sync-profile`.
4. Backend verifies JWT signature and issuer.
5. Backend maps `supabaseUserId` to MongoDB `users` document.
6. Backend returns role, profile, account status, permissions, and dashboard route hints.
7. Frontend routes to the role-specific dashboard.

Important implementation rule: roles are loaded from MongoDB, not from arbitrary client payloads.

## Data Flow: KULI Request Creation

1. Client or assistant submits trip details.
2. Backend validates payload and role permissions.
3. Backend normalizes pickup and destination into location objects.
4. Backend calls mapping provider for geocoding if needed.
5. Backend calls routing provider for distance and ETA.
6. Backend applies active pricing rule version.
7. Backend queries vehicles with geospatial filter and availability/verification constraints.
8. Backend ranks results.
9. Backend returns quote plus candidate vehicles, or alternatives/empty state.
10. Client confirms selected owners.
11. Backend creates request and offer records.
12. Backend writes audit and status events.
13. Backend dispatches notifications through the outbox.

## Data Flow: Request Acceptance

The acceptance path must be concurrency-safe.

1. Truck owner submits accept for a pending offer.
2. Backend verifies owner, vehicle, availability, active vehicle, and offer eligibility.
3. Backend runs an atomic conditional update:
   - Request must still be `pending` or `searching`.
   - Offer must still be `sent`.
   - Vehicle must still be available and not busy.
4. Backend sets request to `accepted`, assigns owner and vehicle, marks selected offer accepted, expires competing offers, and marks vehicle busy.
5. Backend writes status event and audit log.
6. Backend notifies client and competing owners.

If the conditional update fails, return a conflict error explaining that the request is no longer available.

## Data Flow: Manual Trip Execution

Trip statuses are controlled by the logistics state machine:

```text
pending -> accepted -> en_route_to_pickup -> arrived_at_pickup -> loading
loading -> in_transit -> unloading -> completed

pending -> timed_out
pending/accepted/en_route_to_pickup/arrived_at_pickup/loading/in_transit/unloading -> cancelled
```

The source document sometimes uses `Arrived`, `Loaded`, and `In Transit`. The implementation should use explicit normalized enum values and map UI labels from them.

Each transition must:

- Validate actor permission.
- Validate previous status.
- Apply cancellation/payment policy when relevant.
- Append a `statusEvents` entry.
- Update denormalized current status.
- Notify affected participants.

## Data Flow: Assisted Booking

```text
missed call or client call
  -> hotline ticket created/open
  -> assistant claims/assigned
  -> assistant collects client and trip details
  -> system searches and quotes
  -> assistant confirms with client
  -> KULI request created with createdByAssistantId
  -> ticket linked to request
  -> ticket closed or remains pending client
```

Ticket states:

```text
open -> assigned -> in_progress -> pending_client -> in_progress -> closed
open/assigned/in_progress/pending_client -> cancelled
```

Ticket cancellation reasons include spam, error, no response, client aborted, and request dropped.

## External Integrations

### Supabase Auth

Use Supabase only for authentication credentials, OTP/email links, refresh tokens, and identity provider integration. Do not store passwords in MongoDB.

### Mapping and Routing

Use a provider adapter so the implementation can start with OpenStreetMap-based services, Mapbox, Google Maps, or another provider without rewriting domain services.

Required provider capabilities:

- Forward geocoding.
- Reverse geocoding.
- Route distance.
- ETA estimate.
- Optional place search/autocomplete.

The adapter must support fallbacks for manual coordinates because address quality in Addis Ababa may be inconsistent.

### SMS, Email, Push

Notifications should be event-driven. Domain services emit notification intents; the notification module dispatches through configured providers.

Initial providers can be mocked or logged in development. Production must support at least SMS for assisted booking confirmations and push/in-app notifications for app users.

### Object Storage

Vehicle documents and dispute evidence must be stored in object storage, not MongoDB. Recommended options:

- Supabase Storage.
- S3-compatible storage.
- Cloud provider object storage.

Store metadata and access policy in MongoDB.

## Infrastructure Assumptions

Local development should use Docker Compose for MongoDB and optional Redis. Production should use managed MongoDB, managed object storage, hosted Supabase Auth, and containerized backend deployment.

Redis is recommended but not required for the earliest phase. It becomes important for:

- Notification queues.
- Timed request expiration.
- Retry jobs.
- Rate limiting in multi-instance deployments.
- WebSocket pub/sub if realtime is added.

## Scalability Strategy

### Database

- Use 2dsphere indexes for vehicle location.
- Keep KULI request status and vehicle availability indexed.
- Keep audit logs append-only and partition/archive later.
- Use compound indexes for common admin queues.
- Avoid unbounded embedded arrays for messages, notifications, and audit logs.

### Backend

- Keep the API stateless except for external stores.
- Horizontal scale the API behind a load balancer.
- Move queues to Redis-backed workers when background volume grows.
- Extract matching/search only if geospatial queries become a bottleneck.
- Extract notifications when provider retries and delivery volume grow.

### Frontend

- Use cached query data and pagination.
- Avoid heavy map rendering on low-end devices.
- Support offline queueing for high-value forms and retryable actions.

## Realtime Communication Architecture

Version 1 should rely on:

- REST for commands and reads.
- Push/in-app notifications for status changes.
- Polling or refetch-on-focus for active trips.

Future versions can add:

- WebSockets for active trip room updates.
- Server-Sent Events for admin dashboards.
- Location telemetry channel for continuous tracking.

Do not design the first release around continuous location streaming because the source scope excludes GPS telemetry.

## File Storage Handling

Files must be uploaded through controlled backend flows:

1. Client requests an upload intent.
2. Backend validates file category and actor permission.
3. Backend returns signed upload URL or accepts multipart upload.
4. Client uploads file.
5. Backend records metadata: owner, category, MIME type, size, checksum if available, storage key, access level, and linked entity.
6. Admin views documents through signed read URLs.

Reject unsupported MIME types, oversized files, empty files, and files that fail basic image/PDF parsing.

## Error Handling

All API errors must use a consistent format described in [API Architecture](api_architecture.md). Domain errors should be specific enough for UI state:

- `NO_AVAILABLE_VEHICLES`
- `VEHICLE_NOT_VERIFIED`
- `REQUEST_ALREADY_ACCEPTED`
- `INVALID_STATUS_TRANSITION`
- `CANCELLATION_WINDOW_CLOSED`
- `DOCUMENT_UPLOAD_INVALID`
- `INSUFFICIENT_ROLE`

## Observability

The backend must produce:

- Structured logs with request id and user id where available.
- Audit logs for privileged and business-critical actions.
- Metrics for API latency, error rate, queue failure rate, request creation rate, acceptance rate, cancellation rate, and search empty-result rate.
- Alerts for high error rates, failed notification dispatch, suspicious login patterns, and payment/dispute anomalies.

## Future Service Extraction Candidates

The modular monolith should preserve extraction boundaries for:

- `Matching Service`: if geospatial/ranking volume grows.
- `Notification Service`: if SMS/push retries become operationally heavy.
- `Payment Service`: when digital payment gateway settlement launches.
- `Telemetry Service`: when continuous GPS tracking launches.
- `Support Service`: if call-center workflow requires telephony integration at scale.

