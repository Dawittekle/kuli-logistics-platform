# Progress Tracking

This file is the engineering tracker for KULI. Update it as implementation progresses. Keep checklists honest; do not mark work complete until validation criteria pass.

## Global Progress

- [x] Source PDF analyzed.
- [x] Initial project docs created.
- [ ] Monorepo initialized.
- [ ] API app scaffolded.
- [ ] Mobile app scaffolded.
- [ ] Admin app scaffolded.
- [ ] Shared package scaffolded.
- [ ] Local MongoDB setup documented.
- [ ] CI configured.
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

- [ ] Initialize workspace/package manager.
- [ ] Create `apps/api`.
- [ ] Create `apps/mobile`.
- [ ] Create `apps/admin`.
- [ ] Create `packages/shared`.
- [ ] Configure TypeScript.
- [ ] Configure linting and formatting.
- [ ] Add test runners.
- [ ] Add Docker Compose for local services.
- [ ] Add `.env.example` files.
- [ ] Add baseline CI.
- [ ] Validate clean local startup.

Completion:

- [ ] All apps boot.
- [ ] Lint/typecheck/test pass.

### Phase 1: Identity, Profiles, RBAC, and Core Layouts

- [ ] Configure Supabase Auth clients.
- [ ] Implement backend JWT verification.
- [ ] Create user schema/model.
- [ ] Implement profile sync.
- [ ] Implement `/me`.
- [ ] Implement account status guard.
- [ ] Implement RBAC guard.
- [ ] Mobile auth screens.
- [ ] Admin auth screen.
- [ ] Role-specific route shells.
- [ ] Admin seed/provisioning path.

Completion:

- [ ] Public self-registration limited to client/truck owner.
- [ ] Staff accounts cannot self-register.
- [ ] Suspended account blocked from commands.

### Phase 2: Vehicle Registry and Verification

- [ ] Seed vehicle classes.
- [ ] Owner vehicle CRUD.
- [ ] File upload intent.
- [ ] Vehicle document metadata.
- [ ] Owner registration form.
- [ ] Admin pending queue.
- [ ] Admin document preview.
- [ ] Approve/reject workflow.
- [ ] Owner rejection reason display.
- [ ] Vehicle availability transition rules.
- [ ] Verification audit logs.

Completion:

- [ ] Approved vehicle can go online.
- [ ] Pending/rejected vehicle cannot be matched.

### Phase 3: Quotes, Pricing, and Nearby Search

- [ ] Mapping provider adapter.
- [ ] Route distance/ETA.
- [ ] Pricing rule model.
- [ ] Quote endpoint.
- [ ] Admin pricing rule UI.
- [ ] Geospatial vehicle search.
- [ ] Radius expansion.
- [ ] Ranking score.
- [ ] Client request form.
- [ ] Candidate result UI.

Completion:

- [ ] Quote returns correct breakdown.
- [ ] Search filters and ranking are tested.

### Phase 4: Requests, Offers, Acceptance

- [ ] Create KULI request endpoint.
- [ ] Trip offer model.
- [ ] Offer dispatch.
- [ ] Owner offer inbox.
- [ ] Accept/decline/viewed endpoints.
- [ ] Atomic acceptance.
- [ ] Competing offer expiry.
- [ ] Timeout job.
- [ ] Client waiting state.
- [ ] Notifications for offer events.

Completion:

- [ ] Two simultaneous accepts produce one winner.
- [ ] Timeout and cancellation clean up offers.

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
| Authentication and RBAC | Not started | TBD | Supabase Auth plus MongoDB profile |
| User profile management | Not started | TBD | Includes notification preferences |
| Vehicle classes | Not started | TBD | Seed defaults first |
| Vehicle registration | Not started | TBD | Requires file storage |
| Vehicle verification | Not started | TBD | Admin queue |
| Availability management | Not started | TBD | Separate from verification |
| Quotes and pricing | Not started | TBD | Versioned pricing rules |
| Nearby matching | Not started | TBD | MongoDB 2dsphere |
| Request creation | Not started | TBD | Needs idempotency |
| Offer acceptance | Not started | TBD | Atomic first-accept-wins |
| Trip state machine | Not started | TBD | Manual status updates |
| Messaging | Not started | TBD | Request-scoped |
| Notifications | Not started | TBD | In-app first, external later |
| Assisted booking | Not started | TBD | Ticket workflow |
| Ratings | Not started | TBD | Terminal trips only |
| Reports/disputes | Not started | TBD | Admin mediation |
| Payment records | Not started | TBD | Cash/manual first |
| Admin dashboard | Not started | TBD | Operations control |

## Infrastructure Tracking

- [ ] MongoDB local development.
- [ ] MongoDB production target selected.
- [ ] Redis local development.
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

- [ ] Unit tests configured.
- [ ] Integration tests configured.
- [ ] E2E tests configured.
- [ ] Auth/RBAC tests.
- [ ] Vehicle verification tests.
- [ ] Matching tests.
- [ ] Acceptance concurrency tests.
- [ ] Trip state machine tests.
- [ ] Assisted booking tests.
- [ ] Payment/report/rating tests.
- [ ] Accessibility checks.
- [ ] Mobile device smoke tests.
- [ ] Admin dashboard smoke tests.

## Security Review Status

- [ ] Auth token verification reviewed.
- [ ] Role escalation blocked.
- [ ] Staff account provisioning reviewed.
- [ ] File upload validation reviewed.
- [ ] Document access authorization reviewed.
- [ ] Rate limiting configured.
- [ ] Audit logging coverage reviewed.
- [ ] Secrets management reviewed.
- [ ] CORS configuration reviewed.
- [ ] Admin action audit trail reviewed.

## Deployment Readiness

- [ ] Environment variables documented.
- [ ] Production config validation.
- [ ] Dockerfiles created.
- [ ] Database migrations/seeds ready.
- [ ] Backups configured.
- [ ] Monitoring configured.
- [ ] Error alerts configured.
- [ ] Rollback procedure documented.
- [ ] Demo seed data prepared.
- [ ] Smoke test checklist prepared.

