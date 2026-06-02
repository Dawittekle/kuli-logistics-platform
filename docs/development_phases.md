# Development Phases

This roadmap stages KULI so AI coding agents can build incrementally without creating dependency chaos. Each phase has clear outputs and validation gates.

Related documents:
- [Progress Tracking](progress_tracking.md)
- [Testing Strategy](testing_strategy.md)
- [Engineering Decisions](engineering_decisions.md)

## Phase 0: Repository and Tooling Foundation

### Objective

Create a stable monorepo foundation before product features are implemented.

### Systems Involved

- Root workspace.
- API app.
- Mobile app.
- Admin app.
- Shared package.
- Local development infrastructure.

### Technical Tasks

- Initialize TypeScript monorepo.
- Create `apps/api`, `apps/mobile`, `apps/admin`, and `packages/shared`.
- Configure linting, formatting, TypeScript, and test commands.
- Add Docker Compose for MongoDB and Redis if queues are included.
- Add `.env.example` files for each app.
- Add shared enums, API response types, and initial validation conventions.
- Add CI skeleton for lint, typecheck, and tests.

### Dependencies

None.

### Validation Requirements

- `install`, `lint`, `typecheck`, and empty test command pass.
- Apps boot locally with placeholder screens/endpoints.
- Environment variables are documented.

### Expected Outputs

- Working monorepo.
- Basic API health endpoint.
- Placeholder mobile and admin apps.
- Shared package importable from apps.

### Risks

- Starting feature work before workspace boundaries are stable.
- Inconsistent TypeScript/module config across apps.

### Completion Criteria

- A new coding agent can run the project locally from README instructions.
- CI verifies baseline code health.

## Phase 1: Identity, Profiles, RBAC, and Core Layouts

### Objective

Implement authenticated role-aware access across API, mobile, and admin dashboard.

### Systems Involved

- Supabase Auth integration.
- API identity/accounts modules.
- Mobile auth/onboarding.
- Admin auth shell.
- Shared user/role schemas.

### Technical Tasks

- Implement Supabase JWT verification in API.
- Implement `users` collection and profile sync.
- Implement `/me` and profile update endpoints.
- Implement RBAC guards and account status checks.
- Create client/truck-owner mobile auth screens.
- Create admin/assistant web login and route guards.
- Seed or document first admin provisioning.
- Add basic user status management for admin.

### Dependencies

Phase 0.

### Validation Requirements

- Client and truck owner can register and reach correct dashboard.
- Admin and assistant cannot self-register through public route.
- Suspended/banned accounts are blocked from commands.
- Role cannot be spoofed from client payload.

### Expected Outputs

- Working auth/session flow.
- Role-specific navigation shells.
- Initial user admin table.

### Risks

- Confusing Supabase identity with application authorization.
- Accidentally allowing public admin registration.

### Completion Criteria

- All apps can authenticate and call protected endpoints.
- RBAC tests cover each role.

## Phase 2: Reference Data, Vehicle Registry, Files, and Verification

### Objective

Build the supply-side onboarding workflow so truck owners can register vehicles and admins can verify them.

### Systems Involved

- Vehicle registry module.
- File storage module.
- Admin verification queue.
- Mobile owner vehicle screens.
- Notifications/audit foundations.

### Technical Tasks

- Implement vehicle class schema and seeded defaults.
- Implement vehicle CRUD for owners.
- Implement file upload intent and metadata.
- Implement document validation and attachment.
- Implement vehicle verification queue.
- Implement approve/reject decision with required reason.
- Implement owner vehicle status screen.
- Implement vehicle availability state machine but allow online only after approval.
- Add audit logs for verification decisions.

### Dependencies

Phase 1.

### Validation Requirements

- Owner can submit vehicle with documents.
- Invalid/corrupt/oversized file is rejected.
- Admin can approve or reject.
- Rejected vehicle shows reason.
- Unapproved vehicles cannot be made available.

### Expected Outputs

- Vehicle onboarding from owner mobile to admin approval.
- Vehicle classes in admin.
- File metadata and signed access flow.

### Risks

- Upload/security issues.
- Mixing availability with verification status.

### Completion Criteria

- Approved vehicle can become online.
- Pending/rejected vehicles never appear in matching test query.

## Phase 3: Quotes, Pricing Rules, Location, and Nearby Search

### Objective

Implement the core discovery engine without dispatching real offers yet.

### Systems Involved

- Logistics module.
- Mapping provider adapter.
- Pricing rule module.
- Mobile request form.
- Admin pricing management.

### Technical Tasks

- Implement location DTOs and map provider adapter.
- Implement route distance/ETA calculation.
- Implement pricing rule schema and active rule resolution.
- Implement quote endpoint with pricing breakdown.
- Implement geospatial vehicle search.
- Implement radius expansion behavior.
- Implement ranking by distance, rating, suitability, and dispute penalty.
- Build client request form and candidate list/map.
- Build admin pricing rules screen.

### Dependencies

Phase 2.

### Validation Requirements

- Quote returns distance, ETA, and price breakdown.
- Search excludes offline/unverified/busy/suspended vehicles.
- Search expands radius if no initial results.
- No-result state includes useful alternatives.

### Expected Outputs

- Client can create a quote/search.
- Admin can configure pricing.
- Backend has matching tests.

### Risks

- Mapping provider cost/failure.
- Incorrect coordinate order in MongoDB geospatial queries.

### Completion Criteria

- Deterministic nearby search works with seeded vehicles.
- Pricing snapshots are stable after rules change.

## Phase 4: KULI Requests, Offers, Acceptance, and Timeouts

### Objective

Turn quotes into real marketplace transactions with concurrency-safe acceptance.

### Systems Involved

- KULI requests.
- Trip offers.
- Notification outbox.
- Owner offer inbox.
- Client waiting state.

### Technical Tasks

- Implement create request from quote inputs.
- Implement offer creation for selected candidates.
- Implement owner offer inbox.
- Implement viewed/decline/accept commands.
- Implement atomic first-accept-wins flow.
- Implement request timeout and offer expiration job.
- Update vehicle busy state on acceptance.
- Notify client and competing owners.
- Add idempotency for request creation and accept command.

### Dependencies

Phase 3.

### Validation Requirements

- Two owners accepting same request produces one success and one conflict.
- Request cancellation expires offers.
- Timeout moves pending request to `timed_out`.
- Owner cannot accept with unapproved/offline/busy vehicle.

### Expected Outputs

- Client can send request.
- Owner can receive and accept offer.
- Request becomes accepted and assigned.

### Risks

- Race conditions.
- Missing idempotency creating duplicate requests.

### Completion Criteria

- Acceptance concurrency integration tests pass.
- Client and owner see consistent accepted trip detail.

## Phase 5: Trip Execution, Messaging, Notifications, and Cancellation

### Objective

Support active trip operations from acceptance through completion or cancellation.

### Systems Involved

- Trip lifecycle state machine.
- Status events.
- Messaging.
- Notifications.
- Mobile active trip screens.

### Technical Tasks

- Implement status transition endpoint.
- Implement immutable status events.
- Implement owner status update UI.
- Implement client trip timeline UI.
- Implement cancellation policy and cancellation command.
- Implement request-scoped messaging.
- Implement in-app notifications.
- Implement push/SMS/email adapter interfaces with production provider placeholders.
- Implement notification preferences.

### Dependencies

Phase 4.

### Validation Requirements

- Invalid status transitions are blocked.
- Every status change creates event log.
- Client receives visible update after owner status change.
- Messaging access is limited to participants/staff.

### Expected Outputs

- End-to-end trip lifecycle manually executable.
- Basic communications available.

### Risks

- Overbuilding realtime before v1 needs it.
- Missing audit/event records for status changes.

### Completion Criteria

- A full request can move from pending to completed through UI.
- Messages and notifications are persisted.

## Phase 6: Assisted Booking and Hotline Tickets

### Objective

Enable call-center staff to create and manage requests for clients.

### Systems Involved

- Support module.
- Assistant dashboard.
- KULI request creation facade.
- SMS confirmation.

### Technical Tasks

- Implement hotline ticket schema and state machine.
- Implement assistant ticket queue and claim flow.
- Implement assisted booking wizard.
- Implement client lookup by phone.
- Implement create KULI request on behalf of client.
- Link ticket and request.
- Implement missed-call/manual ticket creation.
- Implement pending-client and cancellation logic.

### Dependencies

Phase 5 is ideal, but Phase 6 can begin after Phase 4 if messaging/status screens are still in progress.

### Validation Requirements

- Assistant can create request with `createdByAssistantId`.
- Ticket state transitions are enforced.
- Closed tickets cannot be edited.
- SMS confirmation intent is created.

### Expected Outputs

- Assistant console supports live call workflow.
- Assisted request appears in operational/admin views.

### Risks

- Assistant UI becoming too slow for real calls.
- Duplicate tickets for same caller.

### Completion Criteria

- Assisted booking can create a request and send it to owners.

## Phase 7: Ratings, Reports, Disputes, and Payment Records

### Objective

Add trust, accountability, and cash/manual payment tracking.

### Systems Involved

- Engagement module.
- Admin reports dashboard.
- Mobile rating/report/payment flows.
- Owner aggregate rating.

### Technical Tasks

- Implement payment record creation and owner confirmation.
- Implement payment dispute and admin resolution.
- Implement rating submission after terminal trip.
- Implement owner aggregate rating updates.
- Implement report creation with evidence upload.
- Implement admin report resolution with outcomes.
- Connect unresolved/frequent disputes to matching penalty.

### Dependencies

Phase 5.

### Validation Requirements

- Rating blocked before completion/cancellation.
- Duplicate rating is blocked or handled by defined edit policy.
- Payment confirmation blocked before completion.
- Admin report resolution requires reason and audit log.

### Expected Outputs

- Trust and payment records visible in app/admin.
- Matching uses rating/dispute data.

### Risks

- Unclear commission collection model.
- Reports without enough evidence.

### Completion Criteria

- Completed trip can be paid, rated, reported, and resolved.

## Phase 8: Admin Operations, Observability, Hardening, and QA

### Objective

Prepare the platform for production-like demonstration or deployment.

### Systems Involved

- Admin dashboard.
- Audit logs.
- Monitoring/logging.
- CI/CD.
- Security hardening.
- Full test suite.

### Technical Tasks

- Complete admin dashboard metrics.
- Complete user management.
- Complete audit log viewer.
- Add structured logging and request ids.
- Add rate limiting and security headers.
- Add E2E tests for critical workflows.
- Add seed data and demo scenarios.
- Add deployment scripts and environment docs.
- Run accessibility and mobile responsiveness passes.
- Run security review checklist.

### Dependencies

All prior phases.

### Validation Requirements

- All critical workflows covered by automated or manual QA.
- No admin action bypasses server authorization.
- Logs/audit records exist for privileged flows.
- Production env config validates at startup.

### Expected Outputs

- Production-minded MVP.
- CI green.
- Deployment-ready documentation.

### Risks

- QA debt from earlier phases.
- Missing provider credentials or deployment assumptions.

### Completion Criteria

- System can be demonstrated end to end with realistic seeded data.
- Deployment checklist is complete.

## Future Phases

### Digital Payments

- Payment provider integration.
- Payment intents.
- Webhooks.
- Payouts/commission collection.
- Reconciliation.

### Continuous GPS Tracking

- Location telemetry ingestion.
- WebSocket/SSE trip rooms.
- Driver location privacy controls.
- Route deviation alerts.

### Multi-City Expansion

- City/service area modeling.
- City-specific pricing.
- Localized operations and support.

### Advanced Matching

- Driver incentives.
- Surge indicators.
- Waitlists.
- Fleet partnerships.
- ML-assisted fraud/rating anomaly detection.

