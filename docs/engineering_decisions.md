# Engineering Decisions

This document records major technical decisions, reasoning, tradeoffs, and rejected alternatives. Update it when new architectural choices are made.

## Decision 1: Use a Modular Monolith Instead of Microservices

Decision: implement the backend as a Node.js modular monolith.

Reasoning:

- The project is an MVP for one city and does not need microservice operational complexity.
- Booking, acceptance, vehicle availability, payment records, and status changes benefit from strong consistency.
- A single deployable backend is simpler for a student/final-project team and AI coding agents.
- Clear module boundaries still allow future service extraction.

Rejected alternatives:

- Microservices: too much infrastructure, service discovery, orchestration, distributed tracing, and transaction complexity for v1.
- Unstructured monolith: fast at first but would make the product hard to extend and unsafe for concurrent AI agent work.

Tradeoff:

- A modular monolith can still become tangled if module boundaries are ignored. Enforce domain services and repository ownership.

## Decision 2: Use MongoDB with Mongoose

Decision: use MongoDB as primary storage with Mongoose as ODM.

Reasoning:

- The source document specifies MongoDB and geospatial indexing.
- 2dsphere indexes support nearby vehicle search.
- Flexible documents help with variable vehicle documents, pricing snapshots, and future payment/provider metadata.
- Mongoose provides schema validation and model structure.

Rejected alternatives:

- PostgreSQL/PostGIS: excellent geospatial option but contradicts the source stack and adds relational modeling overhead for the current plan.
- Firebase/Firestore: simpler realtime features, but less aligned with existing MongoDB requirement and transactional acceptance rules.

Tradeoff:

- MongoDB requires discipline around schema design, migrations, and transactions. Use explicit schemas and indexes.

## Decision 3: Supabase Auth for Identity, MongoDB for Authorization

Decision: Supabase Auth handles credentials and token issuance; MongoDB stores app roles, profile metadata, account status, and permissions.

Reasoning:

- Avoid building password/OTP infrastructure.
- Keep platform-specific roles under backend control.
- Prevent clients from self-asserting privileged roles.

Rejected alternatives:

- Custom auth: unnecessary risk.
- Supabase as entire application database: conflicts with MongoDB geospatial/database direction in the source document.

Tradeoff:

- The backend must reliably map Supabase user ids to MongoDB profiles. Profile sync and `/me` become critical.

## Decision 4: REST First, Realtime Later

Decision: implement v1 with REST APIs, notifications, and polling/refetch for active states.

Reasoning:

- Source scope excludes continuous GPS tracking in the first phase.
- Manual status updates do not require a persistent socket.
- REST reduces complexity for mobile, admin, and testing.

Rejected alternatives:

- WebSockets from day one: useful later but unnecessary for MVP and adds infrastructure complexity.

Tradeoff:

- Active trip updates are not instant unless push/polling is configured well. This is acceptable for manual status v1.

## Decision 5: Separate Vehicle Verification from Availability

Decision: model `verificationStatus` and `availabilityStatus` separately.

Reasoning:

- A verified vehicle can still be offline, busy, suspended, or under maintenance.
- A pending vehicle must never appear in matching even if the owner toggles availability.
- Admin and owner workflows affect different state dimensions.

Rejected alternatives:

- Single `status` field: ambiguous and error-prone.

Tradeoff:

- More state combinations to validate, but much clearer business behavior.

## Decision 6: Use Explicit State Machines

Decision: implement KULI, ticket, and vehicle state transitions as explicit transition maps.

Reasoning:

- The PDF includes state charts.
- Status changes are business-critical.
- Explicit maps prevent arbitrary or impossible states.

Rejected alternatives:

- Free-form status strings.
- UI-only transition controls.

Tradeoff:

- New states require code changes and tests, which is desirable for safety.

## Decision 7: First-Accept-Wins Requires Atomic Backend Logic

Decision: offer acceptance must use conditional updates/transactions.

Reasoning:

- Multiple truck owners can receive the same request.
- Only one owner/vehicle can own a trip.
- Optimistic frontend acceptance would create inconsistencies.

Rejected alternatives:

- Let frontend hide accepted requests after notification.
- Assign after manual admin review.

Tradeoff:

- Requires careful integration tests and MongoDB transaction support in production.

## Decision 8: Files Stored Outside MongoDB

Decision: store document/evidence files in object storage; store metadata in MongoDB.

Reasoning:

- Vehicle documents and evidence can be large.
- Object storage supports signed URLs and lifecycle policies.
- MongoDB should not store binary file payloads for this app.

Rejected alternatives:

- Base64 files inside documents.
- Local filesystem in production.

Tradeoff:

- Requires storage provider configuration and signed URL flows.

## Decision 9: Pricing Rules Are Versioned

Decision: pricing rules are admin-configurable and versioned; each quote/request stores a snapshot.

Reasoning:

- Fuel prices and local operating costs can change quickly.
- Historical trips must preserve the estimate users saw.
- Admin pricing changes require auditability.

Rejected alternatives:

- Hard-coded fare formula.
- Updating historical requests when pricing changes.

Tradeoff:

- More data fields, but avoids disputes and historical confusion.

## Decision 10: Call-Assisted Booking Is First-Class

Decision: implement assisted booking with tickets and request linkage, not as informal admin-only request creation.

Reasoning:

- The source document makes call assistance a core inclusivity feature.
- Missed calls, pending client, assistant ownership, and SMS confirmations require their own workflow.
- Support operations need accountability and workload visibility.

Rejected alternatives:

- Let assistants impersonate clients.
- Create requests without tickets.

Tradeoff:

- More workflow complexity, but better auditability and operational control.

## Decision 11: Admin/Assistant Dashboard as Web App

Decision: build a React web dashboard for admins and assistants rather than mobile-only staff tools.

Reasoning:

- The source document describes admin/staff workstations and dashboards.
- Verification queues, document review, reports, and tables are more ergonomic on web.

Rejected alternatives:

- Put all roles into one mobile app.

Tradeoff:

- Requires maintaining two frontends, but role workflows are cleaner.

## Decision 12: Queue Side Effects

Decision: notifications, offer expiry, retries, and cleanup should use background jobs.

Reasoning:

- External providers fail and need retry.
- Offer timeout is business-critical.
- API commands should not block on SMS/email.

Rejected alternatives:

- Synchronous notification dispatch inside request handlers.

Tradeoff:

- Requires Redis/BullMQ for production reliability.

