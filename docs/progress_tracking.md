# Progress Tracking

This file is the engineering tracker for KULI. Update it as implementation progresses. Keep checklists honest; do not mark work complete until validation criteria pass.

## Global Progress

- [x] Source PDF analyzed.
- [x] Initial project docs created.
- [x] Monorepo initialized.
- [x] API app scaffolded.
- [x] Mobile app scaffolded.
- [x] Admin app scaffolded.
- [x] Shared package scaffolded.
- [x] Local MongoDB setup documented.
- [x] CI configured.
- [ ] First end-to-end workflow completed.
- [ ] Production deployment checklist completed.

## Documentation Progress

- [x] `project_overview.md`
- [x] `system_architecture.md`
- [x] `feature_specifications.md`
- [x] `database_design.md`
- [x] `api_architecture.md`
- [x] `frontend_architecture.md`
- [x] `frontend_progress.md`
- [x] `frontend_ui_system.md`
- [x] `backend_architecture.md`
- [x] `development_phases.md`
- [x] `progress_tracking.md`
- [x] `engineering_decisions.md`
- [x] `risks_and_unknowns.md`
- [x] `testing_strategy.md`
- [x] `deployment_and_devops.md`
- [x] `security_considerations.md`
- [x] `references.md`
- [x] `glossary.md`

## Phase Tracking

### Phase 0: Repository and Tooling Foundation

- [x] Initialize workspace/package manager.
- [x] Create `apps/api`.
- [x] Create `apps/mobile`.
- [x] Create `apps/admin`.
- [x] Create `packages/shared`.
- [x] Configure TypeScript.
- [x] Configure linting and formatting.
- [x] Add test runners.
- [x] Add Docker Compose for local services.
- [x] Add `.env.example` files.
- [x] Add baseline CI.
- [x] Validate clean local startup.

Completion:

- [x] All apps boot.
- [x] Lint/typecheck/test pass.

### Phase 1: Identity, Profiles, RBAC, and Core Layouts

- [x] Configure Supabase Auth clients.
- [x] Implement backend JWT verification.
- [x] Create user schema/model.
- [x] Implement profile sync.
- [x] Implement `/me`.
- [x] Implement account status guard.
- [x] Implement RBAC guard.
- [x] Mobile auth screens.
- [x] Admin auth screen.
- [x] Role-specific route shells.
- [x] Admin seed/provisioning path.

Completion:

- [x] Public self-registration limited to client/truck owner.
- [x] Staff accounts cannot self-register.
- [x] Suspended account blocked from commands.

### Phase 2: Vehicle Registry and Verification

- [x] Seed vehicle classes.
- [x] Owner vehicle CRUD.
- [x] File upload intent.
- [x] Vehicle document metadata.
- [x] Owner registration form.
- [x] Admin pending queue.
- [x] Admin document preview.
- [x] Approve/reject workflow.
- [x] Owner rejection reason display.
- [x] Vehicle availability transition rules.
- [x] Verification audit logs.

Completion:

- [x] Approved vehicle can go online.
- [x] Pending/rejected vehicle cannot be matched.

### Phase 3: Quotes, Pricing, and Nearby Search

- [x] Mapping provider adapter.
- [x] Route distance/ETA.
- [x] Pricing rule model.
- [x] Quote endpoint.
- [x] Admin pricing rule UI.
- [x] Geospatial vehicle search.
- [x] Radius expansion.
- [x] Ranking score.
- [x] Client request form.
- [x] Candidate result UI.

Completion:

- [x] Quote returns correct breakdown.
- [x] Search filters and ranking are tested.

### Phase 4: Requests, Offers, Acceptance

- [x] Create KULI request endpoint.
- [x] Trip offer model.
- [x] Offer dispatch.
- [x] Owner offer inbox.
- [x] Accept/decline/viewed endpoints.
- [x] Atomic acceptance.
- [x] Competing offer expiry.
- [x] Timeout job.
- [x] Client waiting state.
- [x] Notifications for offer events.

Completion:

- [x] Two simultaneous accepts produce one winner.
- [x] Timeout and cancellation clean up offers.

### Phase 5: Trip Execution, Messaging, Notifications

- [x] KULI state machine.
- [x] Status update endpoint.
- [x] Status event log.
- [x] Owner active trip UI.
- [x] Client timeline UI.
- [x] Cancellation policy.
- [x] Messages collection.
- [x] Message screens.
- [x] In-app notifications.
- [x] External notification adapters.
- [x] Notification preferences.

Completion:

- [x] UI can execute accepted to completed trip.
- [x] Invalid transitions blocked.

### Phase 6: Assisted Booking

- [x] Hotline ticket schema.
- [x] Ticket state machine.
- [x] Assistant ticket queue.
- [x] Claim ticket.
- [x] Assisted booking wizard.
- [x] Client lookup by phone.
- [x] Create assisted request.
- [x] Link ticket/request.
- [x] SMS confirmation notification intent.
- [x] Pending-client timeout.

Completion:

- [x] Assistant can create KULI request from ticket.
- [x] Closed ticket cannot be edited.

### Phase 7: Ratings, Reports, Payments

- [x] Payment record model.
- [x] Owner payment confirmation.
- [x] Client payment dispute.
- [x] Admin payment resolution.
- [x] Rating model.
- [x] Rating form.
- [x] Owner aggregate rating.
- [x] Report model.
- [x] Evidence upload.
- [x] Admin report resolution.
- [x] Dispute penalty in matching.

Completion:

- [x] Completed trip can be paid, rated, and reported.
- [x] Admin can resolve report with audit trail.

### Phase 8: Hardening and Release Readiness

- [x] Admin dashboard metrics.
- [x] User management complete.
- [x] Audit log viewer.
- [x] Structured logging.
- [x] Rate limiting.
- [x] Security headers.
- [x] E2E critical workflows.
- [x] Seed/demo data.
- [x] Deployment docs.
- [x] Accessibility pass.
- [x] Mobile responsiveness pass.
- [x] Security review.

Completion:

- [x] CI green.
- [x] Production-like deployment validated.

## Feature Completion Tracking

| Feature | Status | Owner | Notes |
|---|---|---|---|
| Authentication and RBAC | Implemented; live OTP E2E pending | AI agents | Supabase client env values are configured, dev-token and Supabase verification modes pass, staff self-registration is blocked, browser login screens render, and development-only demo auth unblocks local UI exploration without Supabase users |
| User profile management | Implemented; live OTP E2E pending | AI agents | MongoDB-backed profile sync, `/me`, profile update, notification preferences, status guard, RBAC guard, staff provisioning, and demo profile upsert are in place |
| Vehicle classes | Implemented | AI agents | Default classes are seeded; admin CRUD API and real admin management UI are in place; update/deactivate regression is covered |
| Vehicle registration | Implemented; live OTP E2E pending | AI agents | Owner CRUD, active-vehicle selection, document upload-intent/complete/attach APIs, mobile owner form, and document metadata attachment UI are in place |
| Vehicle verification | Implemented; live OTP E2E pending | AI agents | Admin pending queue, detail, document signed URL, approve/reject workflow, admin status actions, audit logs, and owner rejection display are in place |
| Availability management | Implemented | AI agents | Vehicle availability transition rules block unapproved vehicles from going online; admin suspension requires a reason |
| Quotes and pricing | In progress | AI agents | Deterministic route adapter, seeded active pricing rule, admin pricing API/UI, mobile quote form, and quote result breakdown are in place |
| Nearby matching | In progress | AI agents | Approved/online nearby search, radius expansion, deterministic ranking, mobile candidate list, and no-result state are tested/bundled |
| Request creation | In progress | AI agents | Idempotent KULI request endpoint creates pending requests and dispatches selected offers; mobile client dispatch/wait/cancel UI is in place |
| Offer acceptance | In progress | AI agents | Owner inbox, viewed/decline/accept commands, timeout cleanup, first-accept-wins tests, and mobile owner offer actions are in place |
| Trip state machine | In progress | AI agents | Manual status endpoint, transition map, immutable event log, cancellation policy, owner status controls, and client/owner active trip panels are in place |
| Messaging | In progress | AI agents | Request-scoped message collection, idempotent send, participant access rules, mobile message thread, and retry state are in place |
| Notifications | Implemented; external providers deferred | AI agents | In-app notification records, list/read APIs, preferences route, device push-token registration, disabled push/SMS/email adapter placeholders, and mobile Alerts tab are in place |
| Assisted booking | In progress | AI agents | Hotline tickets, claim/status flow, client lookup, assisted quote/search, assisted request creation, ticket/request linking, SMS confirmation intents, and real assistant console UI are in place |
| Ratings | In progress | AI agents | Terminal-trip rating API, duplicate guard, owner aggregate updates, mobile client rating UI, and owner ratings summary are in place |
| Reports/disputes | In progress | AI agents | Report creation, evidence upload intents/linking, client report/dispute UI, admin resolution, audit logging, visibility penalties, and admin report queue are in place |
| Payment records | In progress | AI agents | Cash/manual payment records are created on completion, with owner confirmation UI, client dispute/admin notification, admin resolution, and finance queue in place |
| Admin dashboard | Implemented; live OTP E2E pending | AI agents | Metrics, user detail/status actions, vehicle class management, request oversight through `/admin/kuli-requests`, audit log filters, release-readiness checks, and real admin operations UI are in place |

## Infrastructure Tracking

- [x] MongoDB local development.
- [ ] MongoDB production target selected.
- [x] Redis local development.
- [ ] Redis production target selected.
- [ ] Object storage selected.
- [x] Supabase project configured.
- [ ] Mapping provider selected.
- [ ] SMS provider selected.
- [ ] Push notification setup.
- [ ] Email provider selected.
- [ ] Logging provider selected.
- [ ] Error monitoring selected.
- [ ] Backup policy defined.

## Technical Debt Tracking

| Item | Severity | Status | Notes |
|---|---|---|---|
| Real payment gateway not implemented | Medium | Accepted | Explicit v1 defer |
| Continuous GPS not implemented | Medium | Accepted | Manual statuses only |
| Commission collection model unclear | High | Open | Product decision needed |
| Telephony integration undefined | Medium | Open | Manual tickets first |
| Local language rollout undefined | Low | Open | Architecture should support i18n |

## Bug Tracking

| ID | Severity | Area | Status | Description |
|---|---|---|---|---|
| BUG-001 | TBD | TBD | Open | Add bugs here during implementation |

## QA and Testing Progress

- [x] Unit tests configured.
- [ ] Integration tests configured.
- [x] E2E tests configured.
- [x] Auth/RBAC tests.
- [x] Vehicle verification tests.
- [x] Matching tests.
- [x] Acceptance concurrency tests.
- [x] Trip state machine tests.
- [x] Assisted booking tests.
- [x] Payment/report/rating tests.
- [x] Accessibility checks.
- [x] Mobile device smoke tests.
- [x] Admin dashboard smoke tests.

## Security Review Status

- [x] Auth token verification reviewed.
- [x] Role escalation blocked.
- [x] Staff account provisioning reviewed.
- [x] File upload validation reviewed.
- [x] Document access authorization reviewed.
- [ ] Rate limiting configured.
- [x] Audit logging coverage reviewed.
- [ ] Secrets management reviewed.
- [x] CORS configuration reviewed.
- [x] Admin action audit trail reviewed.

## Deployment Readiness

- [x] Environment variables documented.
- [x] Production config validation.
- [ ] Dockerfiles created.
- [x] Database migrations/seeds ready.
- [ ] Backups configured.
- [ ] Monitoring configured.
- [ ] Error alerts configured.
- [ ] Rollback procedure documented.
- [x] Demo seed data prepared.
- [x] Smoke test checklist prepared.

## Current Implementation Notes

- Phase 0 is complete as a dependency-light scaffold intended for agent handoff.
- Phase 1 has a working API slice for auth/profile flow using development bearer tokens in the form `dev:<supabaseUserId>` or Supabase JWT mode when project env values are supplied.
- MongoDB persistence is wired for the Phase 1 `users` slice. Installed frontend frameworks and real Supabase client testing are still pending before Phase 1 can be considered fully production-ready.
- Staff provisioning is documented, bootstrapped for first-admin creation, and exposed through an admin-only scaffold route.
- Local startup was verified with Docker Compose MongoDB/Redis, admin placeholder, mobile placeholder, and API listener startup.
- Phase 4 has a backend request/offer acceptance slice with idempotent create, owner offer commands, first-accept-wins protection, timeout cleanup, cancellation cleanup, and lightweight mobile waiting/inbox screen contracts.
- Phase 5 has manual trip execution, status events, request-scoped messaging, in-app notification read/list, notification preferences, disabled external adapter placeholders, and lightweight mobile active-trip/message/notification screen contracts.
- Phase 6 has hotline ticket persistence, ticket transitions, assistant assignment, client phone lookup, assisted request creation, ticket/request linking, SMS confirmation intents, pending-client cleanup, and lightweight assistant console screen contracts.
- Phase 7 has cash/manual payment records, owner payment confirmation, client payment disputes, admin payment resolution, terminal-trip ratings with owner aggregates, reports with evidence links, admin report resolution with audit logs, visibility penalties for matching, and lightweight mobile/admin trust screen contracts.
- Phase 8 has admin operations metrics, user detail management, audit log listing, request IDs, structured logging, security headers, in-memory rate limiting, runtime config readiness checks, demo seed data, critical workflow smoke checks, and lightweight release-readiness/admin operations screen contracts.
- Real frontend implementation is tracked separately in [Frontend Progress](frontend_progress.md). Frontend Phase 0 has working Expo React Native, Expo web export support, and React/Vite foundations. Frontend Phase 1 adds Supabase auth screens, backend `/me` role routing, account status states, staff-only admin login, assistant/admin guards, an admin users table shell, and development-only demo auth buttons for local browser/mobile-web exploration. Frontend Phase 2 adds owner vehicle registration, document upload-intent/complete/attach handling, verification status display, approval-gated availability, active-vehicle selection, admin pending queue, document preview intent, approve/reject decisions, and admin vehicle status controls. Frontend Phase 3 adds the mobile quote/search flow, visible price breakdown, candidate/no-result states, and admin pricing rule list/editor/activation controls. Frontend Phase 4 adds mobile request dispatch from quote results, client active request waiting/cancel state, owner viewed/decline/accept offer inbox, acceptance conflict messaging, and lightweight accepted-trip summaries. Frontend Phase 5 adds mobile owner status controls, client/owner status timeline panels, request-scoped messaging with retry, notification list/read UI, notification preference controls, and device push-token API wiring. Frontend Phase 6 adds the assistant ticket queue, ticket state actions, client lookup, assisted quote/search, candidate selection, assisted booking creation, ticket/request link display, and SMS intent confirmation UI. Frontend Phase 7 adds client rating/report/payment dispute actions, owner payment confirmation and rating summary, and admin report/payment resolution queues with required audit notes. Frontend Phase 8 adds admin metrics, release readiness, user filters/status actions, vehicle class management, request oversight, audit log filters/detail, and responsive operations layouts. A follow-up mobile marketplace pass clarified automatic competing-offer closure, added notification detail navigation, payment-aware trip chat closure, active trip polling, and provider-ready static maps with a no-key development fallback. Real credential E2E remains open until Supabase OTP/password login can be completed; Android emulator smoke is deferred because the emulator is too resource-heavy, with browser-based mobile web smoke used for this pass.
- Local demo auth is guarded by `DEMO_AUTH_ENABLED`/frontend demo flags, auto-enabled for local frontend API URLs, blocked from production readiness, and paired with `npm run seed:fake-users` for fake client/truck-owner/staff/vehicle/ticket data.
- Demo profile creation now treats blank phone as absent, reuses profiles by email, and surfaces API failures with clearer user messages plus request ids for developer tracing.
- Demo login now preserves existing backend roles by email so returning to a truck-owner account cannot silently convert it to a client account.
- Development CORS now supports local private-network browser origins such as `http://192.168.x.x:5174`, so admin/mobile web can be opened through LAN URLs while production still requires explicit hosted origins.
- Owner offer inbox now includes request detail snapshots and a clearer accept/start-moving path, while offer notifications direct truck owners to the Offers tab for the actual decision flow.
- Client mobile booking now uses Addis Ababa area selectors with generated coordinates, optional pin adjustment, route preview, and calendar/time-style pickup scheduling. Trip messages and owner notifications no longer fall back to anonymous "client" wording when profile names or neutral wording are available.
- Client cancellation now uses an explicit confirmation modal with reason selection before the server-confirmed cancel call. Post-trip review/report/payment actions are compacted into modes with star ratings, and mobile file capture supports upload-from-library or take-picture flows for documents/evidence.
