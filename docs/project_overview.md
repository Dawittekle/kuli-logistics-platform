# KULI Project Overview

This document is the engineering interpretation of the KULI project source document. It translates the product proposal, requirements, diagrams, UI reference, and system design into implementation guidance for this repository.

Related documents:
- [System Architecture](system_architecture.md)
- [Feature Specifications](feature_specifications.md)
- [Development Phases](development_phases.md)
- [Risks and Unknowns](risks_and_unknowns.md)

## Product Interpretation

KULI is a peer-to-peer logistics marketplace for truck-based transportation in Addis Ababa. The platform connects clients who need trucks for household relocation, furniture movement, appliance transport, equipment transport, or small business deliveries with verified independent truck owners.

The product is not a moving company operating its own fleet. It is a coordination, discovery, verification, communication, pricing, and operations platform. The system must make informal truck discovery more structured by:

- Verifying truck owners and vehicle documents before they can receive requests.
- Letting clients create detailed logistics requests.
- Ranking available vehicles by proximity, availability, vehicle suitability, rating, and dispute history.
- Providing transparent, configurable price estimates before a request is sent.
- Supporting manual status updates instead of full GPS telemetry in the first production version.
- Supporting call-assisted booking for users who do not have smartphones or who need help.
- Giving administrators tools to review users, verify vehicles, inspect reports, tune pricing rules, and monitor operations.

The platform has four first-class roles:

- `Client`: creates KULI requests, searches nearby trucks, communicates with owners, cancels eligible requests, rates completed or terminated trips, files reports, and receives notifications.
- `Truck Owner`: registers vehicles, uploads required documents, manages availability, receives requests, accepts or ignores work, updates trip status, confirms payment, and sees ratings.
- `Call-Center Assistant`: creates and manages assisted bookings, handles hotline tickets, records client information, updates ticket state, and may submit reports or ratings on behalf of a client when explicitly part of the support workflow.
- `Admin`: manages users, vehicle classes, verification queues, reports, disputes, pricing rules, account sanctions, audit visibility, and operational oversight.

## Core System Responsibilities

The KULI system must own the following responsibilities end to end:

1. Identity and role-aware session handling.
2. Application profile storage separate from external authentication identity.
3. Vehicle registration, document upload, validation, and approval workflow.
4. Vehicle availability and operational status management.
5. KULI request creation with pickup, destination, load, schedule, and optional service details.
6. Mapping provider integration for geocoding, route distance, and ETA estimates.
7. Pricing calculation using configurable business rules.
8. Nearby vehicle discovery using geospatial indexes and radius expansion.
9. Request offer dispatch, acceptance, timeout, and race-condition handling.
10. Manual trip state transitions with immutable event history.
11. Messaging tied to a KULI request.
12. Notifications across in-app, SMS, email, and push channels where configured.
13. Hotline ticket workflow for assisted bookings and missed calls.
14. Ratings, text reviews, reports, and dispute mediation.
15. Payment record keeping for cash-first workflows, with future digital payment integration.
16. Administrative dashboards and operational reports.
17. Audit logs for security-sensitive and business-critical actions.

## Primary Workflows

### Client Self-Service Booking

1. Client signs up or logs in using phone/email and OTP/password.
2. Client lands on a role-specific home screen.
3. Client starts a new KULI request.
4. Client enters pickup location, destination, load type, volume/weight, preferred time, vehicle type if known, optional tip, and special handling instructions.
5. Client confirms or adjusts map pins because address quality may be unreliable.
6. Backend geocodes the locations and calculates route distance and ETA.
7. Backend calculates an estimate from pricing rules.
8. Backend searches verified, available vehicles near the pickup point.
9. Search starts with a default radius, such as 10 km, then expands to a configured second radius, such as 20 km, before returning an empty result or alternatives.
10. Client sees a map/list of recommended vehicles with distance, rating, price estimate, vehicle type, capacity, and availability signals.
11. Client selects one or more preferred truck owners and sends the request.
12. System creates the KULI request, creates offer records, notifies targeted truck owners, and shows the client a waiting state.
13. First eligible truck owner to accept wins. The backend must use an atomic state transition so two owners cannot accept the same request.
14. Client and truck owner coordinate through in-app messaging and/or contact details depending on privacy settings.
15. Truck owner manually advances the trip through allowed states.
16. Client receives status notifications and can cancel only when policy allows.
17. After completion or eligible termination, client can rate and report.
18. Truck owner confirms payment if the trip used a cash/manual flow.

### Truck Owner Onboarding

1. User registers or logs in as a truck owner.
2. Truck owner opens vehicle management.
3. Truck owner creates a vehicle registration with vehicle class, capacity, license plate, ownership proof, driver license, identification, registration certificate, and insurance where available.
4. System validates file type, size, corruption, required fields, duplicate plate, and basic format.
5. System stores the vehicle as `pending_verification`.
6. Admin reviews the queue, inspects metadata and document images/files, then approves or rejects with a reason.
7. Approved vehicles become eligible for availability management and matching.
8. Rejected vehicles remain visible to the owner with the reason and resubmission path.

### Truck Owner Request Handling

1. Verified owner sets an approved vehicle to available/online.
2. System includes the vehicle in geospatial discovery.
3. Owner receives matching requests while available and not busy.
4. Owner views request details, estimate, pickup/destination, distance, load summary, and client rating or platform trust signals where available.
5. Owner accepts, ignores, or declines/cancels.
6. If accepted, the vehicle becomes busy and the request becomes accepted.
7. Owner manually updates statuses: en route, arrived/loading, in transit, unloading, completed.
8. Owner confirms payment after completion for cash/manual payment flows.

### Assisted Booking

Assisted booking exists because some users may not use smartphones confidently, may not have reliable connectivity, or may prefer calling.

1. Client calls hotline.
2. If an assistant is available, the assistant answers, collects client identity and trip details, enters the request into the staff dashboard, searches available vehicles, explains estimate and delay conditions, confirms the client's choice, creates a KULI request, and sends SMS confirmation.
3. If no assistant is available or the call times out, the system logs a missed call, creates an `open` hotline ticket, and queues it for the next available assistant.
4. Assistant claims the ticket, contacts the client, and transitions it through assigned, in progress, pending client, closed, or cancelled.
5. If no vehicles are available, the assistant explains delay or alternatives. If the client wants to wait, the ticket remains active; otherwise it is cancelled/closed.

### Admin Verification and Operations

1. Admin logs into the web dashboard.
2. Admin sees queues for pending vehicle verification, reports/disputes, users, vehicle classes, pricing rules, and system health.
3. Admin reviews vehicle details and documents, approves or rejects with required reason.
4. Admin handles reports by collecting details, reviewing trip history and message context, and recording outcome.
5. Admin can suspend/ban users or vehicles based on policy.
6. Admin can update vehicle classes and pricing rules, but all changes must be audit logged.

## Product-To-Technical Translation

The proposal describes "real-time tracking" but also states that real-time GPS tracking is excluded from the first phase. The implementation must interpret this as real-time status visibility based on manual status events in the first version. Continuous GPS telemetry is future scope and must be isolated behind a `Live Operations` extension point.

The proposal describes "payments" but also says integrated digital payments may be later. The first version must record payment obligations and confirmations, especially cash payment completion, without depending on a gateway. The architecture must still reserve clean integration points for digital payment providers.

The proposal lists Supabase Auth and MongoDB. Supabase should own authentication credentials and token issuance. MongoDB should own application profiles, roles, vehicles, KULI requests, tickets, messages, payments, and audit logs. The backend must never trust a client-provided role without validating the Supabase user id against the MongoDB profile.

The repository is currently an empty implementation workspace. The recommended structure is a TypeScript monorepo:

```text
apps/
  api/       NestJS modular monolith
  mobile/    Expo React Native app for clients and truck owners
  admin/     React web dashboard for admins and call-center assistants
packages/
  shared/    shared DTOs, validation schemas, constants, and types
  ui/        optional shared design tokens/components if useful
docs/
```

## Initial Scope

The initial build should include:

- Role-aware authentication and profile sync.
- Client and truck owner mobile flows.
- Admin and assistant web dashboard.
- Vehicle registration and verification.
- KULI request creation.
- Pricing estimate.
- Nearby vehicle discovery.
- Request offer/accept flow.
- Manual trip lifecycle.
- Basic messaging and notifications.
- Assisted booking tickets.
- Rating, report, and payment confirmation records.
- Audit logs and core monitoring.

The initial build should defer:

- Continuous GPS telemetry.
- Digital payment gateway settlement.
- Machine-learning-based pricing or matching.
- Cargo insurance purchase.
- USSD support.
- Multi-city marketplace expansion.
- Advanced route optimization.
- Automated document verification beyond basic file checks.

## Non-Negotiable Implementation Constraints

- Unverified truck owners must not appear in public listings or accept KULI requests.
- Vehicle availability and verification must be modeled separately.
- KULI status changes must be validated by a state machine, not arbitrary strings.
- Every business-critical status change must create an event log entry.
- First-accept-wins must be atomic.
- Admin/assistant permissions must be server-enforced.
- Pricing rules must be configurable by admin, versioned, and auditable.
- Cash payment workflows must still create payment records for reconciliation.
- Location objects must include coordinates and human-readable address text.
- All file uploads must be validated, stored outside the database, and referenced by immutable file metadata.
- The mobile app must tolerate unreliable connectivity through retryable forms and clear offline states.

## Success Criteria

The system is implementation-ready when coding agents can:

- Build features phase by phase using [Development Phases](development_phases.md).
- Implement modules without guessing ownership boundaries from [Backend Architecture](backend_architecture.md).
- Create schemas and indexes from [Database Design](database_design.md).
- Implement REST contracts from [API Architecture](api_architecture.md).
- Build role-specific UI from [Frontend Architecture](frontend_architecture.md) and [Feature Specifications](feature_specifications.md).
- Verify behavior with the coverage expectations in [Testing Strategy](testing_strategy.md).

