# KULI Test Plan

Project title: **KULI: P2P Logistics Mobile Application On Demand Trucking Service**

Document type: Test Plan Document

Template source: Addis Ababa University Department of Computer Science Test Plan Document template (`TPD-Temeplet.docx`).

Last updated: 2026-06-01

## 1. Introduction

KULI is a peer-to-peer logistics marketplace for on-demand truck booking in Addis Ababa. The system connects clients who need transport with verified truck owners, supports vehicle verification, quote calculation, request dispatch, first-accept-wins offer handling, manual trip status tracking, messaging, notifications, ratings, reports, and cash payment confirmation.

This test plan describes how the team will verify that KULI satisfies its planned purpose and behaves correctly across mobile, backend API, and supporting web-dashboard workflows. It follows the university template sections: purpose, features to be tested, features not to be tested, pass/fail criteria, approach/strategy, test cases with specifications, and references.

## 1.1 Purpose

The purpose of testing KULI is to verify reliability, correctness, usability, security, and workflow completeness before final project submission. Testing should uncover defects early, confirm that business-critical workflows are server-confirmed, and ensure that errors remain visible and recoverable for users.

The test plan specifically checks that:

- Clients can register, sign in, request trucks, receive quotes, send requests, track status, message, cancel, rate, report, and view notifications.
- Truck owners can register, create vehicles, upload documents, manage availability, receive offers, accept or decline, update trip status, confirm payment, and view earnings/ratings.
- Staff-only workflows remain in the web dashboard and are not exposed as mobile registration options.
- Backend rules enforce roles, account status, vehicle verification, matching, atomic offer acceptance, payment status, and allowed trip transitions.
- The mobile UI remains usable on Expo web and Android device/emulator targets.

## 2. Features to Be Tested / Not to Be Tested

### 2.1 Features to Be Tested

| Feature | Description | Risk |
|---|---|---|
| Authentication and registration | Login, public client/truck-owner registration, logout, email confirmation handling, session persistence. | High |
| Password reset/account recovery | Forgot password email flow through Supabase and invalid email handling. | Medium |
| Supabase session/profile sync | Supabase identity must map to backend profile and role through `/me` and profile sync. | High |
| Role-based routing | Clients route to client mobile tabs; truck owners route to owner mobile tabs; admin/assistant are blocked on mobile. | High |
| Client request creation | Pickup/drop-off, load details, truck type, schedule, quote, candidate selection, and dispatch. | High |
| Quote calculation | Distance, ETA, pricing rule snapshot, ETB total, and price breakdown. | High |
| Nearby truck/candidate discovery | Approved, online vehicles are returned and unverified/offline vehicles are excluded. | High |
| Request dispatch | KULI request and offer records are created only after backend confirmation. | High |
| Owner vehicle registration | Vehicle class, license plate, capacity, notes, and duplicate/missing-field handling. | High |
| Document upload/verification state | Required document capture, upload intent, metadata, pending/rejected/approved states. | High |
| Owner availability | Approved vehicles can go online; unapproved vehicles cannot. | High |
| Offer inbox | Owner receives offers with route/load/estimate and can view details. | High |
| Accept/decline offer | First-accept-wins, conflict handling, and decline behavior. | High |
| Active trip status updates | Owner can move only through valid manual status transitions. | High |
| Client tracking/status timeline | Client sees status history and active trip details without fake live GPS. | High |
| Messaging | Request-scoped messages send, refetch, and archive after terminal states. | Medium |
| Cancellation | Client can cancel allowed requests with reason and cannot cancel closed states. | High |
| Rating/review | Eligible completed/cancelled trips can be rated with clear UI feedback. | Medium |
| Report/issue/dispute | Client can file report, attach optional evidence, and dispute eligible payment. | High |
| Manual cash payment confirmation | Owner confirms cash after completion; pending/disputed states display clearly. | High |
| Notifications and preferences | In-app notification list, unread state, mark read, and preference update. | Medium |
| Loading/empty/error/offline states | UI handles slow API, no data, validation errors, network-style failures, and retry paths. | Medium |
| Mobile UI/UX responsiveness | Bottom tabs, map preview, request flow, cards, forms, and text fit on small screens and Expo web. | Medium |

### 2.2 Features Not to Be Tested in This Version

| Feature | Reason |
|---|---|
| Live GPS tracking | Current v1 uses static map previews and manual status updates. |
| Real-time moving truck animation | Not implemented and must not be implied by the UI. |
| Real digital payment gateway | v1 records cash/manual payment confirmation only. |
| Pay-in-advance | Not supported by current backend workflow. |
| Pay-on-acceptance | Not supported by current backend workflow. |
| Real SMS/email/push provider delivery | External provider delivery is not guaranteed unless provider keys are configured. In-app notification intent can be tested. |
| Advanced toll/live fuel pricing | Current pricing uses configured pricing rules and static fuel surcharge logic where implemented. |
| Admin/call-center mobile screens | Admin and assistant workflows belong to the web dashboard, not mobile. |
| Automated document OCR/verification | Admin manual review and file metadata are in scope; OCR is future scope. |
| Multi-city marketplace expansion | Current mobile flow is designed around Addis Ababa locations. |

## 3. Pass/Fail Criteria

| Criterion | Pass | Fail |
|---|---|---|
| Expected output | Actual output matches the expected result in the test case. | Actual output differs, is incomplete, or cannot be observed. |
| Backend confirmation | State-changing actions pass only when the backend confirms success and the UI reflects returned state. | UI shows success without confirmed backend state or ignores server rejection. |
| No fake success states | Request creation, offer acceptance, payment confirmation, rating, report, and status update show success only after API success. | UI pretends an action succeeded before the server confirms it. |
| Error visibility | Validation, permission, conflict, and network errors are visible and recoverable. | Error is hidden, unclear, or forces the user to restart unnecessarily. |
| Security/role enforcement | Mobile hides privileged staff registration and backend blocks unauthorized commands. | Unauthorized user can access or perform restricted actions. |
| Data persistence | Created records remain available after refresh/re-login where expected. | Data disappears, duplicates unexpectedly, or is tied only to local UI state. |
| Usability | UI labels are clear, touch targets usable, and screen content fits on supported web/mobile viewports. | UI contains route/debug labels, clipped text, confusing status, or inaccessible actions. |

## 4. Approach / Strategy

### 4.1 Test Levels

| Level | Scope | Examples |
|---|---|---|
| Unit tests | Pure service logic, guards, validation, pricing, state machines. | Backend `node:test` suites under `apps/api/src/__tests__`. |
| Integration/API tests | API behavior with repositories, auth guards, idempotency, role checks, and business commands. | Quote, marketplace, engagement, vehicle registry, support, identity tests. |
| Manual mobile smoke tests | Expo web and Android device/emulator checks for role-based flows and UI behavior. | Login, request, owner vehicle, offer, trip, messaging, notifications. |
| Role-based E2E testing | End-to-end client plus owner plus admin/assistant workflows. | Client creates request, owner accepts, trip completes, owner confirms cash, client rates. |
| Regression testing | Repeat critical tests after UI copy/layout/API changes. | Bottom tabs, request flow, active trip, notifications, payment/rating screens. |

### 4.2 Test Tools

| Tool | Use |
|---|---|
| `npm run lint` | Repository lint and required-file validation. |
| `npm run typecheck` | Shared contract and route-shell validation. |
| `npm test` | Node test runner for backend service tests. |
| `npm run smoke:critical` | Dependency-light critical workflow smoke checklist. |
| `npm run verify:startup` | Startup validation across app foundations. |
| `npm run verify --workspace @kuli/mobile` | Mobile Expo foundation verification. |
| Expo CLI | Mobile app testing on web, Android emulator, or device. |
| TypeScript compiler | Mobile TypeScript validation with `npx tsc -p apps/mobile/tsconfig.json --noEmit`. |
| Postman/REST client | Manual API endpoint verification. |
| Supabase dashboard | Auth user, email confirmation, password reset, and session inspection. |
| MongoDB Docker/local database | Local backend persistence and seeded data testing. |

### 4.3 Test Environment

| Environment Item | Expected Setup |
|---|---|
| Local API | `npm run dev:api`, usually `http://localhost:4000/api/v1`. |
| MongoDB | Docker/local MongoDB configured by API `.env`; use isolated database or unique port for test runs when possible. |
| Supabase | Project URL and anon key configured in mobile/admin `.env`; service keys remain server-side only. |
| Mobile app | Expo web for low-resource testing; Android emulator/device when available. |
| Admin dashboard | Browser/Vite dev server for admin and assistant workflows. |
| Demo auth | Enabled only in local development to explore UI without Supabase email limits. |
| Seed data | `npm run seed:demo` and `npm run seed:fake-users` where useful for repeatable testing. |

### 4.4 Current Automated Coverage Evidence

The repository contains backend Node test suites for:

- Identity/profile/role guards.
- Vehicle registry and verification rules.
- Quote calculation and pricing behavior.
- Marketplace request/offer flow.
- Trip/support hotline behavior.
- Engagement features such as reports, ratings, payment records.
- Release hardening such as CORS, security headers, rate limiting, and runtime checks.

The repository also contains mobile shell/smoke files for auth, quote, marketplace, trip, and engagement flows. These files document intended UI behavior and support startup validation, but they do not replace manual UI execution.

## 5. Test Cases With Specifications

Detailed test case tables are maintained in [test_cases.md](test_cases.md).

Each test case includes:

- Test case ID
- Feature
- Purpose
- Preconditions
- Test data
- Steps
- Expected result
- Actual result
- Status
- Notes

Manual testers must update `Actual result`, `Status`, and `Notes` during each test run. Until a test is actually executed, the actual result should remain `Not run yet` and status should remain `Not Run`.

## 6. Test Execution History

| Date | Build/Commit | Environment | Tester | Scope | Result Summary | Notes |
|---|---|---|---|---|---|---|
| 2026-06-01 | Current local branch | Local repo | Codex | Documentation creation only | Not executed | Test plan and test case documents created. |

## 7. Known Testing Gaps

| Gap | Impact | Planned Mitigation |
|---|---|---|
| Full Android emulator/device run not completed in all phases | Native-only layout or device permission issues may be missed. | Use Expo web now; run Android emulator/device before final submission. |
| Real Supabase email confirmation/password reset can hit provider limits | Auth flow may be difficult to repeat quickly. | Use local demo auth for UI exploration; reserve real Supabase tests for final verification. |
| Real SMS/email/push provider delivery may be unconfigured | External notification delivery cannot be proven. | Test in-app notification records and preferences; mark external delivery out of scope unless keys are configured. |
| Real object storage upload may need provider configuration | Document/evidence binary upload could fail outside local metadata flow. | Test upload intent and metadata; verify binary storage when storage keys are configured. |
| No continuous GPS in v1 | Live truck movement cannot be tested. | Confirm UI says status/map preview only and does not promise live tracking. |
| Admin/assistant mobile screens are intentionally absent | Mobile cannot test those roles beyond forbidden state. | Test staff workflows in web dashboard. |

## 8. References

- `TPD-Temeplet.docx`, Addis Ababa University Department of Computer Science Test Plan Document template.
- `docs/project_overview.md`
- `docs/feature_specifications.md`
- `docs/frontend_architecture.md`
- `docs/frontend_progress.md`
- `docs/api_architecture.md`
- `docs/testing_strategy.md`
- `docs/final_project_checklists/mobile_frontend_structure.md`
- `package.json`
- `apps/mobile/package.json`
- `apps/api/src/__tests__/*.test.mjs`
- `apps/mobile/src/*-shell.mjs`
