# References

This document captures the concrete references, source materials, framework assumptions, and implementation concepts that anchor the KULI project. It exists for agent-to-agent continuity: a new coding agent should be able to read this file and understand which external systems, standards, and source documents are considered authoritative for implementation decisions.

Related documents:
- [Project Overview](project_overview.md)
- [System Architecture](system_architecture.md)
- [Engineering Decisions](engineering_decisions.md)
- [Risks and Unknowns](risks_and_unknowns.md)

## Primary Product Source Materials

### 1. Final project PDF

Primary source:

- `Final Project - Kuli.pdf`

This PDF is the primary business and workflow source for the platform. It establishes the product scope around a peer-to-peer trucking and logistics marketplace, the operational roles, the assisted booking model, the admin oversight requirements, and the high-level request lifecycle.

Implementation impact:

- Defines the system as a logistics marketplace rather than a simple booking form.
- Implies multi-actor workflow orchestration across clients, truck owners, assistants, and admins.
- Justifies the need for request status tracking, vehicle verification, manual operations tooling, auditability, and concurrency controls around offer acceptance.
- Supports the separation between user authentication, user authorization, and role-governed operational access.

### 2. Images and diagrams embedded in the PDF

Embedded visuals in the PDF are treated as product workflow references rather than pixel-perfect UI contracts.

Implementation impact:

- Flow diagrams inform navigation order, state transitions, and actor responsibilities.
- Admin and operations-oriented visuals justify dashboard, queue, and approval interfaces.
- User-facing visuals imply split experiences for client flows versus truck-owner flows.
- Diagram relationships should be translated into route shells, API boundaries, and status models rather than copied literally into UI markup.

## Product Domain References

### Urban logistics marketplace model

KULI behaves like a marketplace for short-haul and intra-city freight movement:

- Demand side: clients requesting transport.
- Supply side: truck owners listing available vehicles.
- Operations side: assistants and admins managing exceptions, verification, and assisted booking.

Implementation impact:

- Matching logic must consider both logistics fit and operational eligibility.
- Supply records must model verification and live availability separately.
- Request state must be durable, queryable, and auditable.
- Admin tooling is part of the core product, not an afterthought.

### Manual-operations-first delivery model

The product assumptions indicate that v1 depends on operational oversight rather than full automation.

Implementation impact:

- Assisted booking is a first-class feature.
- Manual status transitions are acceptable in v1 when explicitly modeled.
- Cash/manual payment records can exist without a payment gateway.
- Admin review and dispute handling must be built into the data model early.

## Technology References

The following technologies are not yet installed in the repository, but they are the current engineering assumptions reflected across the docs.

### Supabase Auth

Use Supabase Auth for:

- User identity creation.
- Password or OTP-based sign-in.
- Token issuance and refresh.
- Potential future identity providers.

Do not use Supabase as the application database of record for KULI business entities.

Implementation impact:

- JWT verification must happen server-side.
- Backend authorization must derive from MongoDB user profile records, not directly from client-held claims.
- Public sign-up policy must be enforced in backend profile sync logic.

### MongoDB

Use MongoDB as the primary application datastore for:

- User profiles.
- Vehicles.
- Vehicle classes.
- KULI requests.
- Offers.
- Hotline tickets.
- Messages.
- Notifications.
- Payments.
- Ratings.
- Reports.
- Audit logs.

Implementation impact:

- Geospatial search should use `2dsphere` indexes.
- Status-heavy entities benefit from embedded snapshots plus append-only event records where appropriate.
- Replica-set support is preferred for transaction-safe acceptance flows.

### Node.js + TypeScript backend

The backend is documented as a modular monolith, ideally implemented in TypeScript.

Preferred framework direction:

- NestJS for modularity, guards, DTO validation, and testability.

Implementation impact:

- Domain modules should remain isolated by responsibility.
- Guards, decorators, DTOs, and repository/service boundaries should be explicit.
- Shared types should live outside the API app when used by multiple frontends.

### React Native / Expo mobile app

Use Expo React Native with TypeScript for the client and truck-owner app.

Implementation impact:

- One app must support multiple roles while preserving role-specific navigation.
- Route decisions must come from backend profile state after authentication.
- Mobile architecture must tolerate weak connectivity and draft persistence.

### React admin dashboard

Use a React-based web dashboard for admin and assistant flows.

Implementation impact:

- Operational tables, filters, and queue views are central, not secondary.
- Route guards must support admin-only and assistant-only areas.
- Admin UI should prioritize density, clarity, and repeated task efficiency over marketing-style layout.

### Redis and queue processing

Redis is an implementation recommendation, not a hard product dependency for the earliest local setup.

Use cases:

- Offer expiry jobs.
- Notification dispatch.
- Retry queues.
- Cleanup jobs.

Implementation impact:

- Early local development may stub job handling.
- Production architecture should leave clear seams for BullMQ or equivalent job orchestration.

## External Service Categories

The following are integration categories, even where a specific vendor is not yet selected:

### Mapping and routing provider

Needed for:

- Distance calculation.
- ETA estimation.
- Reverse geocoding or address normalization.
- Potential map display support in mobile UI.

Constraints:

- Provider outages must not destroy in-progress form state.
- Manual location entry must remain possible.
- Price and ETA snapshots must be persisted at request creation time.

### Object storage provider

Needed for:

- Vehicle documents.
- Evidence attachments for reports.
- Potential profile or vehicle images.

Constraints:

- File metadata must remain in MongoDB.
- Signed upload and read access should be preferred over direct public storage.
- File category validation must happen before persistence.

### Notification providers

Categories:

- SMS.
- Email.
- Push notifications.
- In-app notifications.

Implementation impact:

- Notification creation should be domain-driven and recorded even if external dispatch is delayed.
- External delivery should be asynchronous and retryable.
- Notification preferences belong to application profile data.

## Implementation Standards and Concepts

### Role-based access control

Supported roles:

- `client`
- `truck_owner`
- `assistant`
- `admin`

Implementation expectations:

- Public self-registration is only allowed for `client` and `truck_owner`.
- `assistant` and `admin` accounts must be provisioned through a staff-controlled path.
- Backend remains the authority for role resolution.

### State-machine-oriented workflow design

The product includes several entities whose transitions should be modeled explicitly:

- KULI requests.
- Vehicle verification and availability.
- Hotline tickets.
- Offers.
- Reports and dispute handling.

Implementation expectations:

- Transition rules should live in dedicated policy helpers, not scattered through controllers.
- Invalid transitions must return structured conflicts rather than silently mutating records.
- Admin override actions should always be audited.

### Auditability

Privileged decisions require traceability:

- Vehicle approval and rejection.
- User suspension and reactivation.
- Report resolution.
- Payment dispute decisions.
- Staff-assisted booking actions.

Implementation expectations:

- Audit logs are append-only.
- Admin tooling needs a queryable audit surface.
- Actor id, target entity, action type, reason, and timestamps must be recorded.

### Idempotency and concurrency control

Several commands can be retried or raced:

- Create request.
- Offer acceptance.
- Payment confirmation.
- Messaging in unstable connectivity conditions.

Implementation expectations:

- API design should support idempotency keys where retries are likely.
- Offer acceptance must use atomic update semantics or transactions.
- Conflict handling must return deterministic machine-readable errors.

## Framework Assumptions for Agents

Agents working in this repository should assume the following unless superseded by later implementation:

- Monorepo structure with `apps/` and `packages/`.
- Shared domain contracts in `packages/shared`.
- Backend-first enforcement of permissions and state transitions.
- Frontends consume role-specific backend profile data rather than constructing product rules client-side.
- v1 favors correctness and operational clarity over aggressive optimization or over-automation.

## Reference Gaps

The following references are still missing and must be resolved during implementation:

- Exact Supabase project configuration.
- Exact mapping provider.
- Exact object storage provider.
- Exact SMS/email/push vendors.
- Final language and localization requirements.
- Final pricing formula details and commission model.
- Production hosting target.

Those gaps are tracked in [Risks and Unknowns](risks_and_unknowns.md) and should not be silently invented inside feature code.
