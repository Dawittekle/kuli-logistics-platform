# API Architecture

KULI should expose a REST/JSON API from the Node.js backend. REST is sufficient for v1 because continuous GPS telemetry is out of scope. WebSockets or Server-Sent Events can be added later for active-trip streaming.

Related documents:
- [Feature Specifications](feature_specifications.md)
- [Backend Architecture](backend_architecture.md)
- [Security Considerations](security_considerations.md)

## API Principles

- Prefix all routes with `/api/v1`.
- Use JSON request and response bodies except upload endpoints.
- Validate all input using shared DTO schemas.
- Require Supabase JWT for all non-public endpoints.
- Enforce roles server-side.
- Use idempotency keys for retry-prone create/command endpoints.
- Use consistent error formats.
- Keep command endpoints explicit for business actions instead of generic patches when state rules matter.

## Authentication Flow

1. Client authenticates with Supabase.
2. Client sends `Authorization: Bearer <supabase-access-token>`.
3. Backend verifies token and resolves `users.supabaseUserId`.
4. Backend attaches `currentUser` with role and account status.
5. Guards enforce account and role permissions.

Public endpoints:

- `GET /api/v1/health`
- `GET /api/v1/vehicle-classes`
- `POST /api/v1/auth/sync-profile` after Supabase token, but creates profile if allowed

## Standard Response Envelope

Use a predictable response shape.

```json
{
  "data": {},
  "meta": {
    "requestId": "req_...",
    "timestamp": "2026-05-15T10:00:00.000Z"
  }
}
```

List response:

```json
{
  "data": [],
  "pagination": {
    "limit": 20,
    "cursor": "opaque_cursor",
    "nextCursor": "opaque_cursor_or_null",
    "hasMore": true
  },
  "meta": {
    "requestId": "req_..."
  }
}
```

Error response:

```json
{
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "This trip cannot move from pending to completed.",
    "fieldErrors": {
      "status": ["Unsupported transition."]
    },
    "details": {
      "fromStatus": "pending",
      "toStatus": "completed"
    }
  },
  "meta": {
    "requestId": "req_..."
  }
}
```

## HTTP Status Guidance

- `200`: successful read/update.
- `201`: resource created.
- `202`: accepted for async processing.
- `204`: successful command with no body.
- `400`: validation or malformed request.
- `401`: missing/invalid token.
- `403`: authenticated but insufficient permission or suspended account.
- `404`: resource not found or hidden by access policy.
- `409`: conflict such as request already accepted.
- `422`: valid JSON but business rule failed.
- `429`: rate limit exceeded.
- `500`: unexpected server error.

## Pagination, Filtering, and Sorting

Use cursor pagination for high-volume lists:

```text
GET /api/v1/kuli-requests/mine?limit=20&cursor=...
```

Admin tables may support filters:

```text
GET /api/v1/admin/vehicles/pending?limit=30&cursor=...&status=pending&search=AA-B
GET /api/v1/admin/reports?status=open&category=overcharge
```

Sort values should be allowlisted:

```text
sort=createdAt:desc
sort=rating:desc
sort=distance:asc
```

## Idempotency

The mobile app must survive retries under weak connectivity. For create commands that may be retried, accept an `Idempotency-Key` header or `idempotencyKey` body field.

Apply idempotency to:

- Create KULI request.
- Send message.
- Accept offer.
- Submit rating.
- Confirm payment.
- Create report.
- Create hotline ticket.

## Route Map

### Health and Metadata

```text
GET /api/v1/health
GET /api/v1/vehicle-classes
GET /api/v1/config/public
```

### Auth and Profile

```text
POST /api/v1/auth/sync-profile
GET /api/v1/me
PATCH /api/v1/me
PATCH /api/v1/me/notification-preferences
```

`POST /auth/sync-profile` body:

```json
{
  "role": "client",
  "fullName": "Abebe Bekele",
  "phone": "+251911000000",
  "email": "abebe@example.com"
}
```

Staff roles are rejected here unless created by admin.

### Vehicles

```text
POST /api/v1/vehicles
GET /api/v1/vehicles/mine
GET /api/v1/vehicles/:id
PATCH /api/v1/vehicles/:id
POST /api/v1/vehicles/:id/documents
PATCH /api/v1/vehicles/:id/availability
PATCH /api/v1/owners/me/active-vehicle
```

Availability request:

```json
{
  "availabilityStatus": "online_available",
  "currentLocation": {
    "point": { "type": "Point", "coordinates": [38.746, 9.0128] },
    "addressText": "Bole, Addis Ababa",
    "source": "gps"
  }
}
```

### Quotes and KULI Requests

```text
POST /api/v1/quotes
POST /api/v1/kuli-requests
GET /api/v1/kuli-requests/mine
GET /api/v1/kuli-requests/:id
POST /api/v1/kuli-requests/:id/cancel
PATCH /api/v1/kuli-requests/:id/status
GET /api/v1/kuli-requests/:id/events
```

Quote request:

```json
{
  "pickupLocation": {
    "addressText": "Bole, Addis Ababa",
    "point": { "type": "Point", "coordinates": [38.746, 9.0128] },
    "source": "manual_pin"
  },
  "destinationLocation": {
    "addressText": "Piyassa, Addis Ababa",
    "point": { "type": "Point", "coordinates": [38.76, 9.03] },
    "source": "manual_pin"
  },
  "loadDetails": {
    "itemType": "household_move",
    "estimatedWeightKg": 800,
    "estimatedVolumeCubicMeters": 12,
    "loadingAssistanceRequested": true,
    "specialHandlingInstructions": "Fragile glass cabinet"
  },
  "requestedVehicleClassId": "..."
}
```

Quote response includes:

- Distance and ETA.
- Pricing breakdown.
- Candidate vehicles.
- Search radius used.
- Alternative classes if no exact match.

Create request body should include the quote inputs, selected candidates, and optional idempotency key.

### Offers

```text
GET /api/v1/owner/offers
POST /api/v1/offers/:id/viewed
POST /api/v1/offers/:id/accept
POST /api/v1/offers/:id/decline
```

Accept must return `409 REQUEST_ALREADY_ACCEPTED` if another owner has already won.

### Messages and Notifications

```text
GET /api/v1/kuli-requests/:id/messages
POST /api/v1/kuli-requests/:id/messages
GET /api/v1/notifications
PATCH /api/v1/notifications/:id/read
POST /api/v1/devices/push-token
DELETE /api/v1/devices/push-token/:id
```

Message body:

```json
{
  "body": "I am near the pickup location.",
  "clientGeneratedId": "mobile-uuid"
}
```

### Ratings, Reports, and Payments

```text
POST /api/v1/kuli-requests/:id/rating
GET /api/v1/owners/:id/ratings
POST /api/v1/reports
POST /api/v1/reports/:id/evidence/upload-intent
POST /api/v1/reports/:id/evidence
POST /api/v1/kuli-requests/:id/payment/confirm
POST /api/v1/kuli-requests/:id/payment/dispute
```

### Assistant Routes

```text
GET /api/v1/assistant/tickets
POST /api/v1/assistant/tickets
GET /api/v1/assistant/tickets/:id
PATCH /api/v1/assistant/tickets/:id/status
POST /api/v1/assistant/bookings
GET /api/v1/assistant/clients/search
```

Assisted booking must store `createdByAssistantId` and link the ticket.

### Admin Routes

```text
GET /api/v1/admin/dashboard
GET /api/v1/admin/release-readiness
GET /api/v1/admin/users
GET /api/v1/admin/users/:id
PATCH /api/v1/admin/users/:id/status
POST /api/v1/admin/users

GET /api/v1/admin/vehicles/pending
GET /api/v1/admin/vehicles/:id
PATCH /api/v1/admin/vehicles/:id/verification
PATCH /api/v1/admin/vehicles/:id/status

POST /api/v1/admin/vehicle-classes
PATCH /api/v1/admin/vehicle-classes/:id
DELETE /api/v1/admin/vehicle-classes/:id

GET /api/v1/admin/pricing-rules
POST /api/v1/admin/pricing-rules
PATCH /api/v1/admin/pricing-rules/:id/activate

GET /api/v1/admin/kuli-requests
GET /api/v1/admin/reports
PATCH /api/v1/admin/reports/:id
GET /api/v1/admin/payments
PATCH /api/v1/admin/payments/:id
GET /api/v1/admin/audit-logs
POST /api/v1/admin/jobs/expire-offers
POST /api/v1/admin/jobs/expire-pending-client-tickets
```

## Authorization Matrix

| Capability | Client | Truck Owner | Assistant | Admin |
|---|---:|---:|---:|---:|
| Update own profile | Yes | Yes | Yes | Yes |
| Register vehicle | No | Yes | No | Admin override |
| Approve vehicle | No | No | No | Yes |
| Create own KULI request | Yes | No | On behalf | Admin override |
| Accept offer | No | Yes | No | No |
| Update trip status | Limited cancel | Yes | Assisted ticket only | Override/audit |
| Send request messages | Participant | Participant | Support only | Support only |
| Confirm payment | No | Yes | No | Resolve |
| Submit rating | Yes | No | On behalf with workflow | Moderate |
| Submit report | Yes | Limited future | On behalf | Yes |
| Manage users | No | No | No | Yes |
| Manage pricing | No | No | No | Yes |

## Validation Standards

Use schema validation at the DTO boundary. Recommended libraries:

- `zod` in shared package, or
- NestJS DTOs with `class-validator`.

Do not duplicate validation logic independently in mobile, admin, and backend. Frontend validation can mirror shared schemas for UX, but backend remains authoritative.

## Rate Limiting

Apply rate limits by IP and user id:

- Login/profile sync: strict.
- OTP actions: Supabase controls plus backend protection where applicable.
- Quote search: moderate, because route APIs cost money.
- Messaging: spam protection.
- Report creation: spam protection.
- Admin actions: not heavily throttled, but audited.

## API Versioning

Use URL versioning: `/api/v1`. Add `/api/v2` only for breaking changes. Non-breaking additions can remain in v1.

## Upload API Pattern

Prefer signed upload URLs:

```text
POST /api/v1/files/upload-intent
POST /api/v1/files/:id/complete
GET /api/v1/files/:id/signed-url
```

The backend must validate file category and ownership before issuing signed URLs.

## Realtime API Future

Do not block v1 on WebSockets. Future channels:

- `trip:<requestId>` for trip status and messages.
- `owner:<ownerId>` for offers.
- `admin:operations` for dashboard counters.
