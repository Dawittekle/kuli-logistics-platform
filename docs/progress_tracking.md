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

- [ ] Configure Supabase Auth clients.
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
- [ ] Owner registration form.
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

- [ ] KULI state machine.
- [ ] Status update endpoint.
- [ ] Status event log.
- [ ] Owner active trip UI.
- [ ] Client timeline UI.
- [ ] Cancellation policy.
- [ ] Messages collection.
- [ ] Message screens.
- [ ] In-app notifications.
- [ ] External notification adapters.
- [ ] Notification preferences.

Completion:

- [ ] UI can execute accepted to completed trip.
- [ ] Invalid transitions blocked.

### Phase 6: Assisted Booking

- [ ] Hotline ticket schema.
- [ ] Ticket state machine.
- [ ] Assistant ticket queue.
- [ ] Claim ticket.
- [ ] Assisted booking wizard.
- [ ] Client lookup by phone.
- [ ] Create assisted request.
- [ ] Link ticket/request.
- [ ] SMS confirmation notification intent.
- [ ] Pending-client timeout.

Completion:

- [ ] Assistant can create KULI request from ticket.
- [ ] Closed ticket cannot be edited.

### Phase 7: Ratings, Reports, Payments

- [ ] Payment record model.
- [ ] Owner payment confirmation.
- [ ] Client payment dispute.
- [ ] Admin payment resolution.
- [ ] Rating model.
- [ ] Rating form.
- [ ] Owner aggregate rating.
- [ ] Report model.
- [ ] Evidence upload.
- [ ] Admin report resolution.
- [ ] Dispute penalty in matching.

Completion:

- [ ] Completed trip can be paid, rated, and reported.
- [ ] Admin can resolve report with audit trail.

### Phase 8: Hardening and Release Readiness

- [ ] Admin dashboard metrics.
- [ ] User management complete.
- [ ] Audit log viewer.
- [ ] Structured logging.
- [ ] Rate limiting.
- [ ] Security headers.
- [ ] E2E critical workflows.
- [ ] Seed/demo data.
- [ ] Deployment docs.
- [ ] Accessibility pass.
- [ ] Mobile responsiveness pass.
- [ ] Security review.

Completion:

- [ ] CI green.
- [ ] Production-like deployment validated.

## Feature Completion Tracking

| Feature | Status | Owner | Notes |
|---|---|---|---|
| Authentication and RBAC | In progress | AI agents | Dev-token verifier and Supabase JWKS verifier are in place; real project env values still need to be supplied |
| User profile management | In progress | AI agents | MongoDB-backed profile sync, `/me`, profile update, status guard, RBAC guard, and staff provisioning scaffolded |
| Vehicle classes | In progress | AI agents | Default classes are seeded; admin CRUD API scaffolded |
| Vehicle registration | In progress | AI agents | Owner CRUD and document metadata APIs are in place; mobile form UI still pending |
| Vehicle verification | In progress | AI agents | Admin pending queue, detail, document signed URL, and approve/reject workflow are in place |
| Availability management | In progress | AI agents | Vehicle availability transition rules block unapproved vehicles from going online |
| Quotes and pricing | In progress | AI agents | Deterministic route adapter, seeded active pricing rule, admin pricing API, and quote endpoint are in place |
| Nearby matching | In progress | AI agents | Approved/online nearby search, radius expansion, and deterministic ranking are tested |
| Request creation | In progress | AI agents | Idempotent KULI request endpoint creates pending requests and dispatches selected offers |
| Offer acceptance | In progress | AI agents | Owner inbox, viewed/decline/accept commands, timeout cleanup, and first-accept-wins tests are in place |
| Trip state machine | Not started | TBD | Manual status updates |
| Messaging | Not started | TBD | Request-scoped |
| Notifications | In progress | AI agents | Offer/request notification records are persisted; user notification inbox APIs and external delivery remain Phase 5 work |
| Assisted booking | Not started | TBD | Ticket workflow |
| Ratings | Not started | TBD | Terminal trips only |
| Reports/disputes | Not started | TBD | Admin mediation |
| Payment records | Not started | TBD | Cash/manual first |
| Admin dashboard | Not started | TBD | Operations control |

## Infrastructure Tracking

- [x] MongoDB local development.
- [ ] MongoDB production target selected.
- [x] Redis local development.
- [ ] Redis production target selected.
- [ ] Object storage selected.
- [ ] Supabase project configured.
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
- [ ] E2E tests configured.
- [x] Auth/RBAC tests.
- [x] Vehicle verification tests.
- [x] Matching tests.
- [x] Acceptance concurrency tests.
- [ ] Trip state machine tests.
- [ ] Assisted booking tests.
- [ ] Payment/report/rating tests.
- [ ] Accessibility checks.
- [ ] Mobile device smoke tests.
- [ ] Admin dashboard smoke tests.

## Security Review Status

- [x] Auth token verification reviewed.
- [x] Role escalation blocked.
- [x] Staff account provisioning reviewed.
- [x] File upload validation reviewed.
- [x] Document access authorization reviewed.
- [ ] Rate limiting configured.
- [x] Audit logging coverage reviewed.
- [ ] Secrets management reviewed.
- [ ] CORS configuration reviewed.
- [x] Admin action audit trail reviewed.

## Deployment Readiness

- [x] Environment variables documented.
- [ ] Production config validation.
- [ ] Dockerfiles created.
- [ ] Database migrations/seeds ready.
- [ ] Backups configured.
- [ ] Monitoring configured.
- [ ] Error alerts configured.
- [ ] Rollback procedure documented.
- [ ] Demo seed data prepared.
- [ ] Smoke test checklist prepared.

## Current Implementation Notes

- Phase 0 is complete as a dependency-light scaffold intended for agent handoff.
- Phase 1 has a working API slice for auth/profile flow using development bearer tokens in the form `dev:<supabaseUserId>` or Supabase JWT mode when project env values are supplied.
- MongoDB persistence is wired for the Phase 1 `users` slice. Installed frontend frameworks and real Supabase client testing are still pending before Phase 1 can be considered fully production-ready.
- Staff provisioning is documented, bootstrapped for first-admin creation, and exposed through an admin-only scaffold route.
- Local startup was verified with Docker Compose MongoDB/Redis, admin placeholder, mobile placeholder, and API listener startup.
- Phase 4 has a backend request/offer acceptance slice with idempotent create, owner offer commands, first-accept-wins protection, timeout cleanup, cancellation cleanup, and lightweight mobile waiting/inbox screen contracts.
