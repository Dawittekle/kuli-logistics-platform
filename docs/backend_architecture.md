# Backend Architecture

The backend should be a TypeScript Node.js modular monolith. NestJS is recommended because it gives clear modules, guards, DTO validation, dependency injection, testing support, and a production-friendly structure.

Related documents:
- [System Architecture](system_architecture.md)
- [Database Design](database_design.md)
- [API Architecture](api_architecture.md)

## Recommended Backend Structure

```text
apps/api/src/
  main.ts
  app.module.ts
  config/
  common/
    decorators/
    filters/
    guards/
    interceptors/
    pipes/
    errors/
  modules/
    identity/
    accounts/
    vehicle-registry/
    logistics/
    support/
    engagement/
    notifications/
    files/
    audit/
    admin/
  jobs/
  integrations/
    supabase/
    maps/
    storage/
    sms/
    email/
    push/
```

## Module Responsibilities

### `identity`

- Supabase JWT verification.
- Current user resolution.
- RBAC guard.
- Staff-only protection.
- Account status enforcement.

Do not store passwords. Do not implement a parallel credential system.

### `accounts`

- User profile schemas and repositories.
- Profile sync after Supabase auth.
- User status changes.
- Notification preferences.
- Staff account provisioning.

### `vehicle-registry`

- Vehicle class CRUD.
- Vehicle registration.
- Vehicle document metadata.
- Verification decisions.
- Availability and active vehicle management.
- Vehicle state machine.

### `logistics`

- Quotes.
- Matching and nearby discovery.
- KULI request creation.
- Offer dispatch and acceptance.
- Trip lifecycle and status event logging.
- Cancellation and timeout policy.

### `support`

- Hotline tickets.
- Assistant availability.
- Assisted booking.
- Missed-call ticket records.

### `engagement`

- Ratings.
- Reports and disputes.
- Payment records.
- Payment confirmation and admin resolution.

### `notifications`

- Notification intent creation.
- In-app notification records.
- External dispatch through SMS/email/push adapters.
- Retry jobs.

### `files`

- Upload intent generation.
- File metadata.
- Signed read URLs.
- MIME/size/category validation.

### `audit`

- Append-only audit writer.
- Audit query for admins.
- Required audit decorator/helper for privileged actions.

### `admin`

Admin can be a facade module that composes domain services for dashboard routes. Avoid duplicating business logic in admin controllers.

## Layering Rules

Each domain module should use:

- Controller: HTTP transport only.
- DTO/schema: input/output validation.
- Service: business rules and orchestration.
- Repository/model: MongoDB access.
- Policy/state helpers: permission and transition maps.

Controllers should not contain business decisions. Repositories should not enforce cross-domain workflows.

## State Machines

Implement state machines as explicit transition maps.

### KULI Request Transitions

```ts
const kuliTransitions = {
  pending: ['accepted', 'cancelled', 'timed_out'],
  accepted: ['en_route_to_pickup', 'cancelled'],
  en_route_to_pickup: ['arrived_at_pickup', 'cancelled'],
  arrived_at_pickup: ['loading', 'cancelled'],
  loading: ['in_transit', 'cancelled'],
  in_transit: ['unloading', 'cancelled'],
  unloading: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  timed_out: []
};
```

### Ticket Transitions

```ts
const ticketTransitions = {
  open: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['pending_client', 'closed', 'cancelled'],
  pending_client: ['in_progress', 'closed', 'cancelled'],
  closed: [],
  cancelled: []
};
```

### Vehicle Availability Transitions

```ts
const vehicleAvailabilityTransitions = {
  offline: ['online_available', 'under_maintenance', 'suspended'],
  online_available: ['offline', 'busy_on_job', 'under_maintenance', 'suspended'],
  busy_on_job: ['online_available', 'offline', 'under_maintenance'],
  under_maintenance: ['offline', 'suspended'],
  suspended: ['offline']
};
```

Admin actions can override some transitions, but must go through audited service methods.

## Concurrency Control

The request acceptance flow is the most important concurrency-sensitive path.

Use a MongoDB transaction when available, or a carefully ordered conditional update:

1. Conditional update request where `_id=requestId` and `status=pending`.
2. Conditional update offer where `_id=offerId`, `status=sent`, and `expiresAt > now`.
3. Conditional update vehicle where `_id=vehicleId` and `availabilityStatus=online_available`.
4. Expire competing offers.
5. Insert status event.

If any step fails, roll back with transaction or return conflict and leave consistent state. Production MongoDB should use replica set support so transactions are available.

## Background Jobs

Initial jobs:

- Expire offers after timeout.
- Send queued notifications.
- Retry failed external notification dispatch.
- Clean abandoned upload intents.
- Recalculate owner rating aggregates if needed.
- Detect stale online vehicle locations.
- Close pending-client hotline tickets after configured timeout.

Recommended queue:

- BullMQ with Redis when infrastructure is available.
- In-memory/scheduled jobs only for early local development, not production.

## Domain Events

Use internal events or an outbox pattern for side effects:

- `VehicleVerificationSubmitted`
- `VehicleApproved`
- `VehicleRejected`
- `KuliRequestCreated`
- `OfferSent`
- `OfferAccepted`
- `TripStatusChanged`
- `PaymentConfirmed`
- `ReportSubmitted`
- `TicketAssigned`

Domain services should commit the primary data change first, then enqueue side effects. Avoid sending SMS/email inside database transaction code.

## External Integration Adapters

Each external dependency must be behind an interface:

```ts
interface MapsProvider {
  geocode(address: string): Promise<LocationCandidate[]>;
  reverseGeocode(point: GeoPoint): Promise<string>;
  getRoute(origin: GeoPoint, destination: GeoPoint): Promise<RouteEstimate>;
}
```

Adapters needed:

- Supabase Auth verifier.
- Maps provider.
- Object storage provider.
- SMS provider.
- Email provider.
- Push provider.

Development implementations can log or return deterministic mocks.

## Validation and Error Handling

Use shared error codes. Throw domain-specific errors and map them to HTTP responses in a global exception filter.

Examples:

- `VehicleNotVerifiedError`
- `NoAvailableVehiclesError`
- `RequestAlreadyAcceptedError`
- `InvalidStatusTransitionError`
- `CancellationWindowClosedError`
- `DocumentUploadInvalidError`

All errors should include a machine code and safe user-facing message.

## Configuration Management

Use environment variables validated at startup.

Required categories:

- Server port and environment.
- MongoDB URI.
- Supabase project URL/JWT secret or JWKS settings.
- Object storage credentials.
- Maps provider credentials.
- SMS/email/push provider credentials.
- Redis URL if queues are enabled.
- Pricing defaults and search radius defaults for seed only.
- Logging level.

Fail startup if required production secrets are missing.

## Security Middleware

- Helmet/security headers.
- CORS allowlist.
- Request body size limits.
- Multipart upload size limits.
- Rate limiting.
- Request id.
- Structured logging.
- Input validation pipe.

## Admin and Assistant Safety

Admin controllers must never bypass domain service rules. If admin override is needed, create explicit methods:

- `adminSuspendVehicle`
- `adminResolveReport`
- `adminAdjustPayment`
- `adminRejectVehicle`

Each method must require a reason and write audit logs.

## Repository Guidance

Use Mongoose models per collection. Keep query methods named by use case:

- `findApprovedAvailableNearby`
- `findPendingVerification`
- `findActiveRequestForClient`
- `acceptPendingRequest`
- `expireOffersForRequest`

Avoid exposing raw model operations throughout the codebase.

## Testing Hooks

Services should accept provider interfaces so tests can inject fakes. State machines should be pure functions and unit tested thoroughly.

## Future Extraction Boundaries

Keep module APIs stable enough that these can become services later:

- Matching and pricing.
- Notifications.
- Payments.
- GPS telemetry/live operations.
- Support/telephony integration.

