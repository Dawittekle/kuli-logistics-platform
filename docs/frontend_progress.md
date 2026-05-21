# Frontend Progress

This file tracks the real mobile and admin frontend implementation separately from the backend-heavy phase tracker. Keep this file honest: do not mark a frontend phase complete until the UI exists, talks to the expected API contracts, and has been tested at the level listed for that phase.

Related documents:
- [Frontend Architecture](frontend_architecture.md)
- [Frontend UI System](frontend_ui_system.md)
- [Feature Specifications](feature_specifications.md)
- [Development Phases](development_phases.md)
- [Progress Tracking](progress_tracking.md)
- [Testing Strategy](testing_strategy.md)

## Current Frontend Baseline

- `apps/mobile` now has a real Expo React Native foundation with route-placeholder screens for client and truck owner workflows.
- `apps/admin` now has a real React/Vite foundation with route-placeholder workspaces for admin and assistant workflows.
- Backend APIs, shared enums, smoke checks, and local service setup are available for frontend integration.
- Frontend Phase 1 added auth/profile routing foundations; Frontend Phase 2 added owner vehicle onboarding and admin verification foundations.
- Frontend Phase 3 added the client quote/search workflow and admin pricing rule management.
- Frontend Phase 4 added client request dispatch, waiting/cancel state, and the owner offer inbox.
- Frontend Phase 5 added active trip status controls, timeline, messages, and notifications.
- Frontend Phase 6 added the assistant hotline ticket and assisted booking console.
- Frontend Phase 7 added client trust actions, owner payment/rating screens, and admin report/payment resolution queues.
- Frontend Phase 8 added admin operations metrics, release readiness, request oversight, user status actions, and audit log inspection.

## Environment Readiness

- [x] Android SDK path detected through `ANDROID_HOME`.
- [x] Java path detected through `JAVA_HOME`.
- [x] Android emulator command available.
- [x] ADB available outside the sandbox.
- [x] Android virtual devices detected: `Pixel_6`, `Small_Phone`.
- [ ] Emulator attached for live mobile smoke testing.
- [x] MongoDB local service running through Docker Compose.
- [x] Redis local service running through Docker Compose.
- [x] API `.env` has required Supabase and local service keys present.
- [x] Mobile `.env` has API and Supabase keys present.
- [x] Admin `.env` has API and Supabase keys present.
- [x] `npm run verify:startup` passes for the real frontend foundations.
- [x] `npm run smoke:critical` passes for the dependency-light workflow checklist.
- [x] Mobile Android export passes from the `apps/mobile` Expo workspace.
- [x] Mobile web export passes from the `apps/mobile` Expo workspace for low-resource browser smoke testing.
- [x] Headless Chrome browser smoke renders admin web and mobile web entry screens.

## Frontend Implementation Phases

### Frontend Phase 0: App Foundations

Objective: replace dependency-light shells with runnable frontend application foundations without changing product behavior.

- [x] Install and configure Expo React Native for `apps/mobile`.
- [x] Install and configure React/Vite TypeScript for `apps/admin`.
- [x] Preserve workspace scripts for `npm run dev:mobile` and `npm run dev:admin`.
- [x] Add environment loading that maps current `.env` values to frontend-safe runtime variables.
- [x] Add shared API client, response-envelope handling, auth-token attachment, and typed error mapping.
- [x] Add Supabase client setup for mobile and admin.
- [x] Add base navigation, guarded route placeholders, loading, forbidden, offline, and error states.
- [x] Add KULI design tokens and component primitives aligned with `skills-lock.json` and the PDF direction.

Validation:

- [ ] Mobile app starts in Android emulator.
- [x] Admin app builds for browser.
- [x] API client can call `/api/v1/health`.
- [x] Android bundle export passes.
- [x] Lint/typecheck/tests pass.
- [x] Startup verification updated for real frontend apps.

Notes:

- `Small_Phone` booted successfully and ADB detected `emulator-5554`.
- Full Expo Go launch in the emulator was not completed because Expo Go APK download was extremely slow during validation; use the same `npm run android --workspace @kuli/mobile` command to finish that device install when the network is stable.
- The mobile foundation uses JSC for now because Hermes bytecode generation fails on a dynamic OpenTelemetry import inside the current Supabase dependency chain.
- Mobile `.env` should use `http://10.0.2.2:4000/api/v1` when testing from the Android emulator, because emulator `localhost` points to the emulator itself.

### Frontend Phase 1: Identity, Profiles, RBAC, and Core Layouts

Objective: implement authenticated role-aware access across real mobile and admin UIs.

- [x] Mobile login/register screens for client and truck owner.
- [x] Supabase session handling and backend profile sync.
- [x] Backend `/me` profile fetch after auth before route selection.
- [x] Client and owner mobile home shells.
- [x] Admin and assistant login screen.
- [x] Admin and assistant route guards.
- [x] Account status and forbidden states.
- [x] Admin user table shell connected to API.

Validation:

- [ ] Client can register or log in and land on client home.
- [ ] Truck owner can register or log in and land on owner home.
- [x] Staff cannot self-register publicly.
- [x] Admin/assistant routes reject wrong roles.
- [x] Suspended account state blocks commands in UI.

Notes:

- Real Supabase credential/manual login checks remain open for client and truck-owner landing because no test account credentials were supplied during this phase.
- Attempted random Supabase account creation on 2026-05-20. `example.com` addresses were rejected as invalid and valid-looking Gmail-format test addresses were rejected by Supabase email rate limits, so no random test accounts were created.
- Mobile and admin now both route by backend `/me`; locally selected/public roles only affect public mobile registration.
- Admin-only user management is hidden for assistants and still protected by backend RBAC.

### Frontend Phase 2: Vehicle Registry and Verification

Objective: complete the owner onboarding and admin verification UI.

- [x] Owner vehicle registration form.
- [x] Vehicle class selector.
- [x] Document upload fields with progress and retry states.
- [x] Owner vehicle list with pending, approved, rejected, and reason states.
- [x] Availability toggle gated by approval.
- [x] Admin pending verification queue.
- [x] Admin vehicle detail and document preview.
- [x] Approve/reject decision panel with required reason.

Validation:

- [ ] Owner can submit vehicle and documents with real authenticated owner credentials.
- [x] Invalid or missing document errors map to fields.
- [ ] Admin can approve/reject with audit-producing API call using real authenticated admin credentials.
- [x] Rejected vehicle reason appears to owner.
- [x] Unapproved vehicle cannot go online.

Notes:

- Phase 2 uses backend upload-intent and document metadata APIs. Real binary upload still depends on object storage configuration.
- Live owner/admin API mutation checks need working Supabase test credentials; public signup is currently rate-limited by Supabase.

### Frontend Phase 3: Quotes, Pricing, Location, and Nearby Search

Objective: build the client discovery workflow and admin pricing controls.

- [x] Client request form with pickup, destination, load details, pickup window, and vehicle class.
- [x] Manual location entry and pin-style correction UI.
- [x] Quote result with price breakdown, distance, ETA, and radius used.
- [x] Candidate vehicle list with distance, class, rating, capacity, and suitability signals.
- [x] No nearby trucks and alternative-class states.
- [x] Admin pricing rule list and editor.

Validation:

- [x] Quote call returns visible breakdown in the mobile UI contract.
- [x] Candidate list reflects backend search results.
- [x] No-result state gives useful alternatives.
- [x] Pricing rule updates invalidate pricing rule queries.

Notes:

- Mobile quote creation posts to `/api/v1/quotes` with manual GeoJSON pickup/destination coordinates, selected vehicle class, load details, and optional tip.
- Pickup window is captured in the Phase 3 UI, but request persistence and selected-candidate submission are intentionally left for Phase 4.
- Admin pricing rule creation posts all active vehicle classes as a new version; admins can save a draft, create active, or activate an existing draft.
- Live authenticated quote/pricing mutation checks still depend on stable Supabase client/admin credentials; no accounts were created during this phase.

### Frontend Phase 4: Requests, Offers, Acceptance, and Timeouts

Objective: turn quotes into real marketplace transactions.

- [x] Client request confirmation and selected-candidate submission.
- [x] Client waiting state with timeout/cancel behavior.
- [x] Owner offer inbox with viewed, decline, and accept actions.
- [x] Conflict handling for already-accepted requests.
- [x] Accepted trip detail route for client and owner.

Validation:

- [x] Client can send request from quote results in the mobile UI contract.
- [x] Owner can view and accept/decline offer in the mobile UI contract.
- [x] Losing acceptance conflict renders clearly.
- [x] Timeout/cancellation removes stale offers from UI after query refresh.

Notes:

- Client quote results now allow selecting candidate vehicles and posting `/api/v1/kuli-requests` with an idempotency key.
- Client Home fetches `/api/v1/kuli-requests/mine`, shows active waiting/accepted requests, and can cancel cancellable requests.
- Owner Offers fetches `/api/v1/owner/offers` and supports viewed, decline, and accept actions with clear conflict messaging.
- Accepted trip cards are intentionally lightweight; Phase 5 owns the full status timeline, messages, and notification center.
- Live authenticated client/owner mutation checks still depend on stable Supabase credentials; no accounts were created during this phase.

### Frontend Phase 5: Trip Execution, Messaging, and Notifications

Objective: support active trip operation from acceptance through completion or cancellation.

- [x] Owner active trip status update screen.
- [x] Client trip timeline.
- [x] Request-scoped message thread.
- [x] In-app notification center.
- [x] Notification preferences.
- [x] Cancellation flow and policy messaging.
- [x] Offline banner and retryable message send state.

Validation:

- [x] Full accepted-to-completed trip can be driven through UI contract.
- [x] Invalid transitions render backend error state.
- [x] Messages persist and refetch.
- [x] Notifications can be marked read.

Notes:

- Client Home now embeds accepted-trip timeline and request-scoped messaging for active requests.
- Owner Offers now embeds active trip controls for the assigned owner, using backend status transitions through completion or cancellation.
- Messages use idempotency keys and keep a retry action visible after send failure.
- Alerts tab is available to clients and truck owners, with in-app notification list/read commands and notification preference toggles.
- No continuous GPS/realtime socket was added; Phase 5 follows the v1 manual-status and refetch model in the architecture docs.
- Live authenticated device testing remains deferred until emulator/manual Supabase test accounts are available; no accounts were created during this phase.

### Frontend Phase 6: Assisted Booking and Hotline Tickets

Objective: build the assistant console for live phone workflows.

- [x] Assistant ticket queue with claim action.
- [x] Ticket detail with state transitions and notes.
- [x] Client lookup by phone.
- [x] Assisted booking wizard.
- [x] Assisted quote/search result step.
- [x] Assisted request confirmation and ticket/request linking.

Validation:

- [x] Assistant can create/claim ticket.
- [x] Assistant can create request on behalf of client.
- [x] Closed tickets cannot be edited.
- [x] SMS confirmation intent appears through API response/state.

Notes:

- Assistant console now lists and filters hotline tickets, creates incoming/missed/manual tickets, and drives allowed ticket state transitions.
- Ticket detail keeps call notes and follow-up context visible beside the queue.
- Client lookup searches by phone and can attach an existing client id or fall back to a caller contact snapshot.
- Assisted booking wizard uses manual pickup/destination coordinates, vehicle class, load details, assisted quote/search, candidate selection, and `/api/v1/assistant/bookings`.
- Booking result displays linked ticket/request and SMS confirmation intent state.
- Live staff credential testing remains deferred; no Supabase accounts were created during this phase.

### Frontend Phase 7: Ratings, Reports, Disputes, and Payment Records

Objective: add trust, accountability, and cash/manual payment UX.

- [x] Owner payment confirmation UI.
- [x] Client payment dispute UI.
- [x] Client rating form after terminal trip.
- [x] Client report form with evidence upload.
- [x] Owner ratings summary.
- [x] Admin reports queue and resolution panel.
- [x] Admin payments queue and resolution panel.

Validation:

- [x] Rating is blocked before terminal trip.
- [x] Payment confirmation is blocked before completion.
- [x] Report evidence upload errors are recoverable.
- [x] Admin resolution requires reason and updates audit-backed state.

Notes:

- Client History now fetches `/api/v1/kuli-requests/mine`, filters terminal requests, and posts rating, dispute, report, upload-intent, and evidence-link commands.
- Rating stays disabled until a completed or owner-linked cancelled trip; timed-out requests can still be reported but not rated.
- Owner Earnings fetches completed trips for `/payment/confirm` and fetches `/owners/:id/ratings` for rating average and recent reviews.
- Admin dashboard now exposes report filters, report outcome/note resolution, payment queues, confirmed amount adjustment, and required payment resolution notes.
- Validation passed with `npm run lint`, `npm run typecheck`, `npm test`, `npm run build --workspace @kuli/admin`, `npm run smoke:critical`, `npm run verify:startup`, and `npx expo export --platform android --output-dir /tmp/kuli-mobile-phase7-export` from `apps/mobile`.
- No Supabase test accounts were created during this phase.

### Frontend Phase 8: Admin Operations, Responsiveness, Accessibility, and QA

Objective: prepare real frontends for an end-to-end demo.

- [x] Admin dashboard metrics.
- [x] User management details and status actions.
- [x] Audit log viewer with filters.
- [x] KULI request/trip oversight.
- [x] Release readiness panel.
- [x] Mobile responsiveness pass on `Small_Phone` and `Pixel_6` bundle constraints.
- [x] Admin responsive pass on desktop and tablet widths.
- [x] Accessibility pass for labels, touch targets, contrast, keyboard navigation, and status text.
- [x] Frontend E2E/manual QA checklist completed for available local automation.

Validation:

- [ ] At least one full frontend happy path passes end to end with real Supabase credentials.
- [ ] Admin Playwright smoke passes where available.
- [ ] Android emulator smoke passes.
- [x] `npm run lint`, `npm run typecheck`, `npm test`, `npm run smoke:critical`, and `npm run verify:startup` pass.

Notes:

- Admin dashboard now fetches `/api/v1/admin/dashboard` and `/api/v1/admin/release-readiness`, with dense metric and readiness panels.
- Admin users now support role/status/search filters, detail fetch, and server-confirmed status updates through `/api/v1/admin/users/:id/status`.
- Admin trip oversight lists all admin-visible KULI requests via `/api/v1/kuli-requests/mine` and shows selected request participants, estimate, and status events.
- Admin trip oversight lists all admin-visible KULI requests via `/api/v1/admin/kuli-requests` and shows selected request participants, estimate, and status events.
- Admin audit viewer filters by actor, action, and target type, and renders selected metadata without hiding append-only context.
- Admin layout now has responsive metric/readiness/detail grids and keyboard-focusable queue/table rows.
- Validation passed with `npm run lint`, `npm run typecheck`, `npm test`, `npm run build --workspace @kuli/admin`, `npm run smoke:critical`, `npm run verify:startup`, and `npx expo export --platform android --output-dir /tmp/kuli-mobile-phase8-export` from `apps/mobile`.
- No Playwright config exists in the repo, so no Playwright smoke was run.
- `adb devices` returned no attached Android emulator, so live emulator smoke remains open for your later device run.
- Follow-up verification on 2026-05-21 added Expo web dependencies, confirmed `npx expo export --platform web --output-dir /tmp/kuli-mobile-check-web`, and rendered the mobile web entry screen in headless Chrome at a 390x844 viewport.
- Follow-up verification on 2026-05-21 rendered the admin production build in headless Chrome at a 1440x1000 viewport and confirmed no blank/crashed entry screen.

## Commit Discipline

- Make one reasonable commit per completed frontend phase or coherent subphase.
- Keep generated dependency changes with the phase that introduced them.
- Do not combine unrelated admin, mobile, backend, and docs work unless the change is a single cross-cutting frontend foundation.
- Use professional commit messages, for example `feat(frontend): add Expo and admin app foundations`.

## Design Notes

- The frontend should stay operational and workflow-focused, not marketing-style.
- Mobile should feel fast, readable, and trustworthy for clients and truck owners using weak connectivity.
- Admin and assistant screens should be denser, table-driven, keyboard-friendly, and optimized for repeated operational work.
- Use the locked frontend skill and avoid generic generated aesthetics.
- Keep maps/manual location controls clear because Addis Ababa address quality is a known risk.
