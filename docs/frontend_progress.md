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

## Environment Readiness

- [x] Android SDK path detected through `ANDROID_HOME`.
- [x] Java path detected through `JAVA_HOME`.
- [x] Android emulator command available.
- [x] ADB available outside the sandbox.
- [x] Android virtual devices detected: `Pixel_6`, `Small_Phone`.
- [x] Emulator attached for live mobile smoke testing.
- [x] MongoDB local service running through Docker Compose.
- [x] Redis local service running through Docker Compose.
- [x] API `.env` has required Supabase and local service keys present.
- [x] Mobile `.env` has API and Supabase keys present.
- [x] Admin `.env` has API and Supabase keys present.
- [x] `npm run verify:startup` passes for the real frontend foundations.
- [x] `npm run smoke:critical` passes for the dependency-light workflow checklist.

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

- [ ] Client request form with pickup, destination, load details, schedule, and vehicle class.
- [ ] Manual location entry and pin-style correction UI.
- [ ] Quote result with price breakdown, distance, ETA, and radius used.
- [ ] Candidate vehicle list with distance, class, rating, capacity, and suitability signals.
- [ ] No nearby trucks and alternative-class states.
- [ ] Admin pricing rule list and editor.

Validation:

- [ ] Quote call returns visible breakdown.
- [ ] Candidate list reflects backend search results.
- [ ] No-result state gives useful alternatives.
- [ ] Pricing rule updates invalidate quote/reference queries.

### Frontend Phase 4: Requests, Offers, Acceptance, and Timeouts

Objective: turn quotes into real marketplace transactions.

- [ ] Client request confirmation and selected-candidate submission.
- [ ] Client waiting state with timeout/cancel behavior.
- [ ] Owner offer inbox with viewed, decline, and accept actions.
- [ ] Conflict handling for already-accepted requests.
- [ ] Accepted trip detail route for client and owner.

Validation:

- [ ] Client can send request from quote results.
- [ ] Owner can view and accept/decline offer.
- [ ] Losing acceptance conflict renders clearly.
- [ ] Timeout/cancellation removes stale offers from UI.

### Frontend Phase 5: Trip Execution, Messaging, and Notifications

Objective: support active trip operation from acceptance through completion or cancellation.

- [ ] Owner active trip status update screen.
- [ ] Client trip timeline.
- [ ] Request-scoped message thread.
- [ ] In-app notification center.
- [ ] Notification preferences.
- [ ] Cancellation flow and policy messaging.
- [ ] Offline banner and retryable message send state.

Validation:

- [ ] Full accepted-to-completed trip can be driven through UI.
- [ ] Invalid transitions render backend error state.
- [ ] Messages persist and refetch.
- [ ] Notifications can be marked read.

### Frontend Phase 6: Assisted Booking and Hotline Tickets

Objective: build the assistant console for live phone workflows.

- [ ] Assistant ticket queue with claim action.
- [ ] Ticket detail with state transitions and notes.
- [ ] Client lookup by phone.
- [ ] Assisted booking wizard.
- [ ] Assisted quote/search result step.
- [ ] Assisted request confirmation and ticket/request linking.

Validation:

- [ ] Assistant can create/claim ticket.
- [ ] Assistant can create request on behalf of client.
- [ ] Closed tickets cannot be edited.
- [ ] SMS confirmation intent appears through API response/state.

### Frontend Phase 7: Ratings, Reports, Disputes, and Payment Records

Objective: add trust, accountability, and cash/manual payment UX.

- [ ] Owner payment confirmation UI.
- [ ] Client payment dispute UI.
- [ ] Client rating form after terminal trip.
- [ ] Client report form with evidence upload.
- [ ] Owner ratings summary.
- [ ] Admin reports queue and resolution panel.
- [ ] Admin payments queue and resolution panel.

Validation:

- [ ] Rating is blocked before terminal trip.
- [ ] Payment confirmation is blocked before completion.
- [ ] Report evidence upload errors are recoverable.
- [ ] Admin resolution requires reason and updates audit-backed state.

### Frontend Phase 8: Admin Operations, Responsiveness, Accessibility, and QA

Objective: prepare real frontends for an end-to-end demo.

- [ ] Admin dashboard metrics.
- [ ] User management details and status actions.
- [ ] Audit log viewer with filters.
- [ ] KULI request/trip oversight.
- [ ] Release readiness panel.
- [ ] Mobile responsiveness pass on `Small_Phone` and `Pixel_6`.
- [ ] Admin responsive pass on desktop and tablet widths.
- [ ] Accessibility pass for labels, touch targets, contrast, keyboard navigation, and status text.
- [ ] Frontend E2E/manual QA checklist completed.

Validation:

- [ ] At least one full frontend happy path passes end to end.
- [ ] Admin Playwright smoke passes where available.
- [ ] Android emulator smoke passes.
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run smoke:critical`, and `npm run verify:startup` pass.

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
