# KULI Mobile Frontend Structure

Purpose: this handoff document explains the current mobile frontend shape so another agent can understand the app flow before editing. It should be read with:

- `docs/frontend_architecture.md`
- `docs/frontend_ui_system.md`
- `docs/frontend_progress.md`
- `docs/feature_specifications.md`
- `docs/project_overview.md`

Last reviewed: 2026-06-01.

## Product Scope

The mobile app serves public operational users only:

- Clients: register/login, request trucks, track active trips, chat, cancel, review, report, and view notifications.
- Truck owners: register/login, register vehicles, upload verification documents, manage availability, respond to offers, update trip status, confirm payment, view ratings/earnings, and view notifications.

Admin and call-center assistant workflows live in the web dashboard, not the mobile app. If an admin or assistant account signs into mobile, mobile shows a forbidden state and directs them away from the public app.

## Current Code Shape

The mobile implementation is an Expo React Native app in `apps/mobile`.

Important files:

| File | Responsibility |
|---|---|
| `index.js` | Repository-root Expo entrypoint for `expo start` from the repo root. Registers `apps/mobile/src/App`. |
| `app.config.js` | Repository-root Expo config delegate. Imports `apps/mobile/app.config.js`. |
| `apps/mobile/index.js` | Workspace-local Expo entrypoint. Registers `apps/mobile/src/App`. |
| `apps/mobile/app.config.js` | Reads `apps/mobile/.env` and passes runtime config through `expo-constants`. Configures app name, package IDs, JSC engine, image-picker permissions, API URL, Supabase values, auth redirects, and Google Maps key. |
| `apps/mobile/src/App.tsx` | Main mobile application. Contains navigation, auth, client screens, owner screens, reusable UI primitives, styles, and most workflow logic. |
| `apps/mobile/src/config/runtime.ts` | Reads Expo runtime config and exposes `runtimeConfig` plus readiness booleans. |
| `apps/mobile/src/lib/api.ts` | Creates the shared KULI API client. Attaches the latest Supabase access token for backend requests. |
| `apps/mobile/src/lib/supabase.ts` | Supabase browser/mobile client setup. |
| `apps/mobile/src/theme.ts` | Shared colors and spacing used by `App.tsx`. |
| `apps/mobile/src/*-shell.mjs` | Lightweight startup/smoke helpers for auth, quotes, marketplace, trip, and engagement flows. |
| `apps/mobile/src/verify-startup.mjs` | Mobile startup verification script. |

The app is currently concentrated in `apps/mobile/src/App.tsx`. When adding larger features, prefer extracting stable components or hooks only when it reduces real complexity. Keep behavior consistent with the existing UI language and avoid broad refactors during feature fixes.

## Runtime Configuration

Mobile runtime values come from `apps/mobile/.env`, then `process.env`, and are exposed through `apps/mobile/app.config.js`.

Expected keys:

| Key | Purpose |
|---|---|
| `MOBILE_APP_API_BASE_URL` | Backend API base, usually `http://localhost:4000/api/v1` for web or `http://10.0.2.2:4000/api/v1` for Android emulator. |
| `MOBILE_APP_SUPABASE_URL` | Supabase project URL. |
| `MOBILE_APP_SUPABASE_ANON_KEY` | Supabase public anon key. |
| `MOBILE_APP_GOOGLE_MAPS_API_KEY` | Optional static map provider key. If absent, local map preview uses a no-key fallback. |
| `MOBILE_APP_AUTH_REDIRECT_URL` | Supabase email-confirmation redirect, default `kuli://auth/callback`. Add this URL to Supabase Auth redirect URLs. |
| `MOBILE_APP_PASSWORD_RESET_REDIRECT_URL` | Supabase password-recovery redirect, default `kuli://auth/reset-password`. Add this URL to Supabase Auth redirect URLs. |

Runtime readiness checks remain internal to development workflows; the production auth screen does not expose demo login controls.

## Providers and App Entry Flow

`App` wraps the app with:

- `SafeAreaProvider`
- `QueryClientProvider`
- `AppContent`

`AppContent` is the main session gate:

1. Reads Supabase session with `supabase.auth.getSession()`.
2. Subscribes to `supabase.auth.onAuthStateChange`.
3. Calls backend `/me` through `kuliApi.me()`.
4. Routes by backend profile role, never by local role selection.
5. Clears TanStack Query cache on sign out.

Session states:

| State | UI |
|---|---|
| Loading session/profile | `SessionLoadingScreen` |
| No session | `AuthScreen` |
| Supabase session exists but backend profile missing | `ProfileRequiredScreen` |
| Suspended/blocked profile | `AccountBlockedScreen` |
| Staff role on mobile | `ForbiddenScreen` |
| Client role | `ClientTabs` |
| Truck owner role | `OwnerTabs` |

## Authentication Flow

`AuthScreen` supports:

- Login with Supabase email/password.
- Public registration for `client` and `truck_owner`.
- Forgot-password/account recovery through Supabase reset OTP. The user requests a code, enters it inside KULI, then chooses a new password in the app.
- Password-reset completion from a Supabase recovery deep link remains available as a fallback, then the user signs in again with the new password.
- Email confirmation code entry and resend.

Important behavior:

- Public registration does not expose `admin` or `assistant`.
- Normal routing after auth depends on backend `/me`.
- Staff roles are blocked from mobile and must use the web dashboard.
- Password reset uses Supabase recovery OTP (`verifyOtp` with `type: recovery`) and keeps signup confirmation behavior separate from password recovery.
- Supabase password-recovery email templates should include the OTP token for the in-app reset flow. The deep-link URL is still configured as a fallback.

## Navigation Structure

The app uses React Navigation bottom tabs, not Expo Router.

Client tabs:

| Tab | Component | Main responsibility |
|---|---|---|
| `Home` | `ClientHomeScreen` | Profile summary, active requests, accepted trip workspace, cancel/sign out. |
| `Request` | `ClientQuoteScreen` | Pickup/destination, load details, schedule, quote, candidate selection, dispatch. |
| `Activity` | `ClientHistoryScreen` | Terminal requests, rating prompt, reviews, reports, payment disputes. |
| `Notifications` | `NotificationCenterScreen` | In-app notifications and preferences. |

Truck owner tabs:

| Tab | Component | Main responsibility |
|---|---|---|
| `Home` | `HomeOverview` | Owner profile, account status, sign out. |
| `Vehicles` | `OwnerVehiclesScreen` | Vehicle registration, document upload, verification state, availability. |
| `Offers` | `OwnerOffersScreen` | Offer inbox, offer detail, accept/decline, active trip workspace. |
| `Notifications` | `NotificationCenterScreen` | In-app notifications and preferences. |
| `Earnings` | `OwnerEarningsScreen` | Completed trips, cash/manual payment confirmation, rating summary. |

## Main Component Map

Shared primitives and helpers in `App.tsx`:

| Component/helper | Purpose |
|---|---|
| `StatusPill` | Consistent ready/warn/blocked status labels. |
| `ShellCard` | Main mobile panel surface. |
| `HealthCard` | API health check from the auth screen. |
| `Field` | Labeled text input. |
| `RoleOption` | Client/truck-owner public role selector. |
| `FilePickerField` | Upload or camera capture for report evidence and documents. |
| `RuntimeReadiness` | Shows API/Supabase/demo readiness. |
| `getErrorMessage` | Converts API/Supabase errors into user-facing text. |

Owner vehicle and verification:

| Component | Purpose |
|---|---|
| `OwnerVehiclesScreen` | Vehicle list, registration form, approval state, active vehicle, availability. |
| `VehicleClassPicker` | Backend-backed vehicle class selector. |
| `VehicleCard` | Owner vehicle row/card with vehicle image/default truck fallback, verification, and availability actions. |
| `DocumentUploadField` | Per-document upload slot for identity, driver license, registration certificate, ownership proof, and optional insurance. |

Client request and matching:

| Component | Purpose |
|---|---|
| `ClientQuoteScreen` | End-to-end request draft, quote, nearby candidates, and request dispatch. |
| `LocationDropdown` | Addis Ababa area/location selection. |
| `PickupSchedulePicker` | Calendar/time-style pickup scheduling. |
| `RouteMapPreview` | Static route/map preview with zoom/full-screen controls. |
| `CandidateCard` | Candidate truck owner/vehicle with distance, star rating, capacity, and ranking score. |
| `PriceLine` | Quote estimate line item. |
| `StarRating` | Compact rating display/input style. |

Trip execution and messaging:

| Component | Purpose |
|---|---|
| `RequestSummaryCard` | Route/load/status summary for a request. |
| `TripTimeline` | Fetches and displays immutable status events. |
| `TimelineEventRow` | Single status event. |
| `MessageThread` | Request-scoped chat. |
| `ArchivedMessagePanel` | Collapsed terminal/cancelled message state. |
| `OwnerStatusControls` | Owner-only status transitions and cancellation. |
| `ActiveTripWorkspace` | Combined map, timeline, status controls, and messages for accepted/active trips. |
| `ClientCancelDialog` | Client cancellation confirmation and reason selection. |

Notifications and trust:

| Component | Purpose |
|---|---|
| `NotificationCenterScreen` | Notification list, read/detail actions, preferences. |
| `RatingReportPanel` | Review, issue/report, and payment dispute modes. |
| `ClientHistoryScreen` | Completed/cancelled trip history and post-trip trust actions. |
| `OwnerEarningsScreen` | Owner ratings and payment confirmation. |

## Client User Flow

Typical client path:

1. Register or log in as client.
2. Backend `/me` returns `role: client`.
3. Land on `ClientTabs`.
4. Use `Request` tab to choose pickup/destination from Addis selectors.
5. Enter item, weight, dimensions/volume, handling notes, date/time, and optional tip.
6. Request quote from `/api/v1/quotes`.
7. Review estimate and candidate trucks.
8. Select one or more candidates and create a KULI request through `/api/v1/kuli-requests`.
9. Wait for first owner acceptance. Competing offers are closed by backend after acceptance.
10. Track accepted trip from Home: map preview, timeline, messages, and cancellation where allowed.
11. After terminal trip, use History to rate, report, or dispute payment if eligible.

UX rules for client work:

- Do not call users "client" in visible conversational copy when their profile name is available.
- Do not imply a booking is accepted until backend confirms it.
- Cancellation must be explicit, reasoned, and server-confirmed.
- Keep post-trip rating/report/payment actions compact; do not overload History with always-open forms.

## Truck Owner User Flow

Typical truck-owner path:

1. Register or log in as truck owner.
2. Backend `/me` returns `role: truck_owner`.
3. Land on `OwnerTabs`.
4. Use `Vehicles` to register vehicle details and upload all required documents.
5. Add a vehicle photo where possible, then complete the verification checklist for the selected vehicle.
6. Wait for admin approval. Unapproved vehicles cannot go online.
7. Set an approved vehicle online/available.
8. Receive offer notifications and view offer detail from `Offers`.
9. Accept or decline offers. First accepted owner wins; other offers close.
10. Use active trip controls to progress statuses through the allowed transition map.
11. Coordinate with the client in request-scoped chat.
12. Complete the trip and confirm cash/manual payment from `Earnings`.
13. Review aggregate rating and recent reviews.

UX rules for owner work:

- Availability must stay approval-gated.
- Owner status controls must only show backend-allowed transitions.
- After cancellation/timeout, trip messages collapse into a terminal/archive view.
- Chat stays open after completion while cash/manual payment is pending or disputed, and closes after confirmed/resolved payment.

## API and Server State Pattern

Server calls go through `kuliApi` from `apps/mobile/src/lib/api.ts`.

Token behavior:

- `kuliApi` uses the latest in-memory Supabase access token and falls back to `supabase.auth.getSession()` if needed.

Data fetching uses TanStack Query:

- Use query keys scoped by resource and actor where practical.
- Invalidate exact resources after successful mutations.
- Active trip, offer inbox, and notifications use refresh/polling patterns where needed.
- Do not fake success for acceptance, payment, or status transitions; wait for backend confirmation.

## Important Backend Endpoints Used by Mobile

Common/auth:

- `GET /health`
- `GET /me`
- `POST /me/sync-profile`
- `PATCH /me/notification-preferences`
- `POST /dev/demo-profile` in local development

Client marketplace:

- `POST /quotes`
- `POST /kuli-requests`
- `GET /kuli-requests/mine`
- `PATCH /kuli-requests/:id/status`
- `POST /kuli-requests/:id/cancel`
- `GET /kuli-requests/:id/status-events`
- `GET /kuli-requests/:id/messages`
- `POST /kuli-requests/:id/messages`
- `POST /kuli-requests/:id/rating`
- `POST /kuli-requests/:id/payment/dispute`

Owner marketplace:

- `GET /owner/vehicles`
- `POST /owner/vehicles`
- `POST /owner/vehicles/:id/documents/upload-intent`
- `POST /owner/vehicles/:id/documents`
- `PATCH /owner/vehicles/:id/availability`
- `GET /owner/offers`
- `POST /owner/offers/:id/viewed`
- `POST /owner/offers/:id/decline`
- `POST /owner/offers/:id/accept`
- `GET /owners/:id/ratings`
- `POST /kuli-requests/:id/payment/confirm`

Notifications and reports:

- `GET /notifications`
- `POST /notifications/:id/read`
- `POST /reports`
- `POST /reports/:id/evidence/upload-intent`
- `POST /reports/:id/evidence`

## Design System Rules

Follow `docs/frontend_ui_system.md` and `skills-lock.json`:

- Keep the app operational and calm, not marketing-style.
- Use deep teal for primary surfaces, warm ivory for form panels, amber for pending, green for ready/completed, red for blocked/cancelled.
- Keep cards/panels at 8px radius or less.
- Avoid nested cards and decorative gradients/blobs.
- Touch targets should be at least 44px.
- Use clear status text with color; do not rely on color alone.
- Buttons should not resize when loading.
- Forms must preserve state after recoverable server errors.

## Known Gaps and Cautions

- Real Supabase credential E2E should be used for final auth validation; frontend demo account shortcuts have been removed.
- Phone auth is not implemented.
- SMS/email delivery depends on provider configuration; in-app notifications are implemented.
- Continuous GPS live tracking is future scope. Current v1 uses manual trip statuses, polling, and static map previews.
- The app can run on web for low-resource smoke testing, but final mobile behavior should still be checked on Android when the emulator/device is available.
- `App.tsx` is large. Be careful with broad edits; small feature changes should stay close to the related component section.

## Suggested Editing Approach for Another Agent

1. Read this file, then `docs/frontend_ui_system.md` and `docs/feature_specifications.md`.
2. Locate the relevant component in `apps/mobile/src/App.tsx` using the component map above.
3. Check the backend contract in `docs/api_architecture.md` or the API route in `apps/api/src/app.mjs`.
4. Reuse `kuliApi`, `getErrorMessage`, `ShellCard`, `StatusPill`, `Field`, and existing mutation/query patterns.
5. Keep copy user-facing and role-aware; prefer names from `profile.fullName` or request participant metadata over generic role labels.
6. Validate with at least `npm run lint`, `npm run typecheck`, and mobile web export when UI changes are made.
