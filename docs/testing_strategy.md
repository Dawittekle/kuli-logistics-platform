# Testing Strategy

Testing must focus on business-critical correctness: authentication, authorization, verification, matching, acceptance concurrency, trip state machines, assisted booking, payment records, and admin actions.

## Test Pyramid

- Unit tests: pure logic, state machines, pricing, matching score, validation helpers.
- Integration tests: API endpoints with database, auth guards, repository behavior, transactions.
- E2E tests: critical user journeys across frontend and backend.
- Manual QA: maps, uploads, push/SMS behavior, mobile device quirks.

## Unit Testing Expectations

Backend unit tests:

- KULI status transition map.
- Ticket transition map.
- Vehicle availability transition map.
- Pricing calculation.
- Matching/ranking score.
- Cancellation policy.
- RBAC policy helpers.
- Error mapping.

Frontend unit/component tests:

- Request form validation.
- Vehicle registration form validation.
- Admin decision forms requiring reason.
- Trip timeline rendering.
- Permission-based navigation rendering.
- Offline/pending message states.

## Integration Testing

Use a test MongoDB instance. Recommended:

- Testcontainers if available.
- Docker Compose test service.
- In-memory mocks only for external providers, not MongoDB query behavior.

Critical integration tests:

- Auth token maps to profile and role.
- Suspended account cannot create request.
- Unverified vehicle cannot go online.
- Approved online vehicle appears in nearby search.
- MongoDB geospatial query uses correct coordinate order.
- Pricing snapshot persists after pricing rule changes.
- Create request with idempotency does not duplicate.
- Offer acceptance is atomic.
- Invalid trip transitions are rejected.
- Payment confirmation blocked before completion.
- Report resolution writes audit log.

## E2E Critical Workflows

### Client Booking Workflow

1. Client logs in.
2. Creates quote.
3. Selects available truck.
4. Sends KULI request.
5. Sees waiting state.
6. Owner accepts.
7. Client sees accepted trip.

### Owner Onboarding Workflow

1. Truck owner registers.
2. Registers vehicle with documents.
3. Admin approves.
4. Owner sets vehicle online.
5. Vehicle appears in matching.

### Trip Execution Workflow

1. Owner accepts request.
2. Owner updates status through all allowed states.
3. Client sees timeline.
4. Trip completes.
5. Owner confirms payment.
6. Client rates owner.

### Assisted Booking Workflow

1. Assistant creates/claims ticket.
2. Assistant enters client and trip details.
3. Assistant searches vehicles.
4. Assistant confirms and creates request.
5. Ticket links to request and closes.

### Report Workflow

1. Client files report with description/evidence.
2. Admin reviews report.
3. Admin resolves with outcome.
4. Audit log records decision.

## Mocking Strategy

Mock external services behind adapters:

- Supabase Auth verifier: fake verified user ids/claims.
- Maps provider: deterministic distance/ETA.
- Storage provider: fake upload/read URLs.
- SMS/email/push provider: capture notification intents.

Do not mock:

- State machine behavior.
- MongoDB query filters for matching.
- Authorization guards in integration tests.
- Acceptance concurrency behavior.

## Frontend Testing

Mobile:

- Use React Native Testing Library for forms and state rendering.
- Use mocked API client for screen behavior.
- Use device/emulator smoke tests for navigation and layout.

Admin:

- Use React Testing Library for tables/forms.
- Use Playwright for E2E admin workflows.

Accessibility checks:

- Required field labels.
- Touch target size.
- Keyboard navigation in admin tables.
- Color contrast for status labels.

## Performance Testing

Minimum performance checks before release:

- Nearby search with realistic seeded vehicle count.
- Admin table pagination with large datasets.
- Request creation under concurrent owners.
- Notification queue processing.

Targets from source:

- Normal user interaction response within 3 seconds.
- Peak degraded response within 5 seconds.

## CI Validation

CI should run:

- Install dependency lockfile check.
- Lint.
- Typecheck.
- Unit tests.
- Integration tests if services are available.
- Build all apps.
- E2E smoke tests on main branch or release candidates.

## Manual QA Checklist

- [ ] Client registration.
- [ ] Truck owner registration.
- [ ] Vehicle document upload from mobile.
- [ ] Admin document preview.
- [ ] Approve/reject vehicle.
- [ ] Owner availability toggle.
- [ ] Client location picker with manual pin.
- [ ] Quote and candidate list.
- [ ] Request send.
- [ ] Owner accept.
- [ ] Status updates.
- [ ] Cancellation.
- [ ] Messaging.
- [ ] Payment confirmation.
- [ ] Rating.
- [ ] Report.
- [ ] Assisted booking.
- [ ] Notification delivery.
- [ ] Offline retry behavior.

## Release Gate

Do not consider MVP release-ready until:

- Acceptance race condition tests pass.
- Admin privilege tests pass.
- Vehicle verification restrictions pass.
- Trip state machine tests pass.
- File access authorization tests pass.
- At least one complete E2E happy path passes.
- `npm run smoke:critical` passes for the dependency-light workflow checklist.
