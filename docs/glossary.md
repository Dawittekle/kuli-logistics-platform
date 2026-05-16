# Glossary

This glossary defines project-specific language used across the KULI documentation set. It should be treated as the normalization layer for future agents so terminology stays consistent across product docs, code, database schema, and API naming.

Related documents:
- [Project Overview](project_overview.md)
- [Feature Specifications](feature_specifications.md)
- [Database Design](database_design.md)
- [References](references.md)

## Core Product Terms

### KULI

The product/platform being built in this repository. In documentation, "KULI" may refer to the full logistics marketplace, the combined software system, or the service brand.

### KULI request

The main transport request entity created by a client or by an assistant on behalf of a client. It contains pickup and destination information, load details, schedule intent, pricing snapshot, matching context, current state, and final trip outcome.

Use this term in code and docs instead of generic names like "booking" when referring to the core business object.

### Marketplace transaction

The lifecycle that begins when a client requests transport and ends when the job is completed, cancelled, or timed out. It may involve quote generation, candidate search, offer dispatch, owner acceptance, trip execution, payment confirmation, and post-trip engagement.

## User and Staff Roles

### Client

End user who needs logistics service. Clients can:

- Register publicly.
- Create KULI requests.
- View matches, request status, notifications, and history.
- Confirm payment state.
- Rate or report completed trips.

### Truck owner

Supply-side user who owns or operates a truck/vehicle listed on the platform. Truck owners can:

- Register publicly.
- Create and manage vehicle records.
- Upload verification documents.
- Toggle availability after approval.
- Receive and respond to trip offers.
- Execute trip status transitions.

### Assistant

Operational staff member who supports call-center and assisted booking flows. Assistants are internal users and cannot self-register through public channels.

Typical responsibilities:

- Work hotline ticket queues.
- Create assisted requests for clients.
- Look up clients by contact data.
- Move tickets through operational states.

### Admin

Privileged internal operator with broader oversight and control than assistants. Admins cannot self-register publicly.

Typical responsibilities:

- Manage users and statuses.
- Verify vehicles and documents.
- Configure pricing/reference data.
- Review disputes and payments.
- Access audit logs and operations dashboards.

## Identity and Access Terms

### Authentication

The process of verifying who a user is. In this project, authentication is handled by Supabase Auth.

### Authorization

The process of determining what an authenticated user is allowed to do. In this project, authorization is determined by backend policy using MongoDB-stored application profile data.

### Profile sync

The backend process that links an authenticated Supabase identity to a MongoDB application profile, ensuring role, status, and metadata are available for business logic.

### Public self-registration

Account creation flow available without staff intervention. In v1 this is limited to `client` and `truck_owner`.

### Staff provisioning

Admin-controlled creation or activation flow for `assistant` and `admin` accounts.

### RBAC

Role-based access control. In KULI, RBAC controls route access, API permissions, and operational actions by role and account status.

### Account status

Administrative lifecycle flag applied to a user account, such as active, suspended, banned, pending review, or soft-deleted. Status must be enforced separately from authentication success.

## Vehicle and Supply Terms

### Vehicle class

A reference-data category describing truck size/type capabilities used for pricing, search filtering, and suitability checks.

### Vehicle verification

The compliance approval process through which admins review submitted vehicle documents and decide whether the vehicle is allowed to participate in the marketplace.

### Availability status

Operational state indicating whether a verified vehicle is offline, available, busy, under maintenance, or suspended. This is distinct from verification status.

### Supply-side onboarding

The end-to-end workflow where a truck owner registers, creates a vehicle record, uploads supporting documents, and receives verification decisions.

## Request, Matching, and Offer Terms

### Quote

A computed estimate returned before a formal request is accepted into the marketplace workflow. A quote typically includes price breakdown, route distance, ETA, and candidate-search context.

### Pricing snapshot

The persisted copy of pricing inputs and outputs attached to a KULI request at the time the request is created. It protects historical correctness when pricing rules later change.

### Nearby search

The geospatial matching process that finds eligible vehicles close enough to a pickup point, filtered by verification, availability, status, and suitability.

### Candidate vehicle

A vehicle that passed matching eligibility checks and is considered a potential recipient of a trip offer.

### Offer

An invitation sent to a truck owner for a specific KULI request. Offers have their own status lifecycle such as sent, viewed, declined, accepted, expired, or cancelled.

### First-accept-wins

The concurrency rule stating that only one owner may successfully accept a pending request, even if multiple owners attempt acceptance at nearly the same time.

### Timeout

A state transition triggered when a user or system action is not completed within a defined period, such as offer expiry or unresolved pending-client state.

## Trip Execution Terms

### Trip lifecycle

The ordered sequence of transport execution states after request acceptance, such as accepted, en route to pickup, arrived, loading, in transit, unloading, and completed.

### Status event

An immutable record describing a meaningful state transition or operational change, usually including actor, timestamp, prior state, next state, and optional reason.

### Timeline

The user-facing or admin-facing representation of status events across the life of a request or trip.

## Support and Operations Terms

### Hotline ticket

An operational record representing a phone-based or assisted support interaction. A ticket may or may not result in a KULI request.

### Assisted booking

The workflow where an assistant creates or manages a request on behalf of a client, usually through a call-center or support flow.

### Pending-client

A temporary operational state where assistant work is paused pending additional confirmation or information from the client.

## Messaging, Notifications, and Engagement Terms

### In-app notification

Notification stored and displayed within the application UI, independent of external delivery channels.

### Notification preference

User-configurable settings that determine which channels or event types should trigger notifications.

### Report

A complaint, issue, or dispute record raised by a user, usually associated with a completed or in-progress request and optionally backed by evidence attachments.

### Rating

A post-trip evaluation submitted by an eligible participant, generally used to compute trust and ranking signals.

## Payments and Finance Terms

### Manual payment record

Payment data captured without automated gateway settlement, such as cash or manually confirmed transfer.

### Payment dispute

An issue raised when payment status, amount, or completion is contested and requires admin review.

### Commission model

The product/business rule describing how the platform takes a fee from transactions. This is currently not fully defined and remains an open requirement.

## System and Engineering Terms

### Modular monolith

An application deployed as a single backend service but internally separated into domain modules with explicit boundaries.

### Shared package

A package intended to hold common enums, DTOs, schemas, utility types, and other code reused across API, mobile, and admin apps.

### DTO

Data transfer object. Structured request or response contract used at API boundaries and often paired with validation logic.

### Audit log

Append-only record of privileged or security-sensitive actions, especially those taken by staff or automated operational processes.

### Idempotency key

A client-generated or server-coordinated token used to make retries safe for commands that must not duplicate effects.

### Outbox pattern

A persistence-based integration pattern where side effects, such as notifications, are recorded transactionally and dispatched asynchronously later.

### Soft delete

A deletion approach where data remains stored but is marked inactive or removed from normal query surfaces, usually for audit or recovery reasons.

## Language Normalization Guidance

Use the following naming conventions consistently:

- Prefer `truck_owner` over `owner` in backend/domain code unless local brevity is harmless and unambiguous.
- Prefer `kuli_request` or `KuliRequest` over generic `booking`.
- Prefer `assistant` over `operator` unless a broader staffing abstraction is intentionally introduced later.
- Prefer `verificationStatus` and `availabilityStatus` as separate fields.
- Prefer `supabaseUserId` or `authUserId` for identity linkage, not just `userId`, when distinguishing external identity from internal profile ids matters.

If future product language changes, update this file first and then align the rest of the docs and codebase against it.
