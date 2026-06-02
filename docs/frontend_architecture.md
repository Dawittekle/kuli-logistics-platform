# Frontend Architecture

KULI has two frontend applications: a mobile app for clients and truck owners, and a web dashboard for admins and call-center assistants.

Related documents:
- [Feature Specifications](feature_specifications.md)
- [API Architecture](api_architecture.md)
- [Testing Strategy](testing_strategy.md)

## Recommended Stack

Mobile:

- Expo React Native with TypeScript.
- React Navigation or Expo Router.
- TanStack Query for server state.
- React Hook Form plus shared validation schemas.
- Zustand or lightweight context for local UI/session state.
- Supabase client for authentication.

Admin Web:

- React with Vite or Next.js.
- TypeScript.
- TanStack Query.
- React Hook Form plus shared validation schemas.
- Table component with pagination, filtering, and sorting.
- Supabase client for authentication.

Shared:

- `packages/shared` for enums, DTOs, validation schemas, API response types, and formatting helpers.
- Optional `packages/ui` only if shared components provide real reuse without slowing implementation.

## Application Boundaries

### Mobile App

The mobile app must support:

- Client registration/login.
- Truck owner registration/login.
- Role-specific home tabs.
- Client KULI request creation.
- Nearby vehicle map/list.
- Client active trip detail.
- Client history, rating, reports, notifications.
- Truck owner vehicle registration.
- Truck owner availability.
- Truck owner offer inbox.
- Truck owner active trip status updates.
- Truck owner payment confirmation.

### Admin Web Dashboard

The admin web app must support:

- Admin and assistant login.
- Role-specific navigation.
- Admin: dashboard, users, vehicles, vehicle classes, pricing, requests, reports, payments, audit logs.
- Assistant: dashboard, ticket queue, assisted booking form, request oversight, available trucks, client lookup, and notifications.

## Routing Strategy

### Mobile Routes

```text
/(auth)
  login
  register
  otp
/(client)
  home
  request/new
  request/quote
  request/:id
  history
  notifications
  profile
/(owner)
  home
  vehicles
  vehicles/new
  offers
  trips/:id
  earnings
  notifications
  profile
```

After login, route by backend `me.role`, not by local selected role.

### Admin Routes

```text
/login
/admin
  dashboard
  users
  vehicles/pending
  vehicles/:id
  vehicle-classes
  pricing
  requests
  reports
  payments
  audit-logs
/assistant
  dashboard
  bookings/new
  tickets
  tickets/:id
  requests
  trucks
  clients
  notifications
```

Guard routes by backend role and show a clear forbidden state if access is denied.

## State Management

Separate three state categories:

- Authentication/session: Supabase session plus backend profile.
- Server state: TanStack Query.
- Local UI state: form steps, modal visibility, selected filters, draft map pin.

Do not mirror server entities into global client stores unless offline behavior requires a draft.

## Data Fetching Strategy

- Use query keys by resource and actor scope, such as `['kuliRequests', 'mine']`.
- Invalidate exact resources after mutations.
- Refetch active trip and offer inbox on app focus.
- Use stale times for reference data such as vehicle classes.
- Use optimistic updates only for safe local UX: marking notification read, message send pending state, not request acceptance.

## Offline and Retry Behavior

The platform must tolerate weak mobile connectivity:

- Show offline banner when network is unavailable.
- Keep draft request form data locally until submitted.
- Use idempotency keys for create request, message send, report creation, and payment confirmation.
- Queue message sends and non-critical form submissions when practical.
- Never fake successful offer acceptance or payment confirmation; show pending until backend confirms.

## Component Architecture

### Mobile Components

Core components:

- `LocationPicker`: map pin, address input, GPS/manual mode.
- `LoadDetailsForm`: item type, weight, volume, special instructions.
- `VehicleCandidateCard`: vehicle class, owner rating, distance, ETA, estimate.
- `TripStatusTimeline`: manual status events.
- `OfferCard`: owner inbox action card.
- `AvailabilityToggle`: online/offline with location requirement.
- `DocumentUploadField`: file/image selector with upload progress.
- `RatingForm`.
- `ReportForm`.
- `NotificationList`.

Screen-level components compose these with API hooks.

### Admin Components

Core components:

- `DataTable`: pagination, search, sort, filters.
- `VerificationQueueTable`.
- `VehicleDocumentPreview`.
- `DecisionPanel`: approve/reject/suspend with required reason.
- `PricingRuleEditor`.
- `TicketQueue`.
- `AssistedBookingWizard`.
- `TripTimeline`.
- `AuditLogTable`.
- `ReportResolutionPanel`.

## Form Architecture

- Use schema-driven validation.
- Keep server validation messages visible next to fields.
- Multi-step forms should save local draft state between steps.
- Location forms must support manual correction even when GPS/geocoding works.
- Required fields must be explicit.
- Submit buttons should be disabled only for local invalid state or in-flight mutation; server errors must be recoverable.

## UI Behavior Requirements

### Loading States

- Full-page loading only for initial route/profile fetch.
- Use skeletons or compact loading rows for tables/lists.
- Show map loading without blocking form editing where possible.
- Show upload progress for documents and evidence.

### Empty States

- No vehicles nearby: explain no trucks found and show alternative classes/radius result.
- No owner offers: show standby/availability guidance.
- No verification queue: show clean empty table state.
- No tickets: show queue empty state.
- No history: show no completed trips yet.

### Error States

- API validation errors map to fields.
- Permission errors route to forbidden screen.
- Conflict on accept shows "Request already accepted or unavailable."
- Mapping provider failure allows retry or manual location entry.
- Upload failure keeps form data and allows retry.

### Permission-Based Rendering

Frontend may hide unauthorized controls for clarity, but backend is authoritative. Admin-only actions must not appear for assistants. Assistants should not see pricing-rule management or audit logs unless explicitly granted.

## Accessibility Expectations

- Touch targets at least 44x44 points.
- Support scalable text without layout overlap.
- High contrast for critical status colors.
- Do not rely on color alone; pair status color with text/icon.
- Form fields must have accessible labels.
- Error messages must be screen-reader discoverable.
- Admin dashboard tables should be keyboard navigable.

## Responsive Behavior

Mobile:

- Support screens down to 4.7 inches.
- Keep primary actions sticky only when they do not cover form content.
- Avoid horizontal scrolling.
- Map/list views should collapse into tabs or bottom sheets.

Admin:

- Desktop-first but usable on tablets.
- Navigation can collapse on narrow viewports.
- Tables should preserve critical columns and move secondary details into row detail/drawer.

## Design Direction from PDF

The UI reference shows:

- Blue/purple primary mobile screens.
- White card-like form inputs over strong header backgrounds.
- Map previews inside request creation.
- Bottom-tab navigation for mobile.
- Admin verification queue with document rows and approve/reject actions.

Implementation guidance:

- Keep the mobile app operational and workflow-focused, not a marketing landing page.
- Use status color consistently: green for approved/completed, red for rejected/cancelled, amber for pending/attention.
- Avoid decorative screens that slow low-bandwidth users.
- Prioritize readable forms and clear next actions.

## Navigation Behavior

- After auth, call `/me` before choosing dashboard.
- If profile incomplete, route to onboarding.
- If truck owner has no approved vehicle, owner home should emphasize registration and verification status.
- If owner has approved vehicle but is offline, owner home should emphasize availability toggle.
- If client has active request, client home should show active trip card before creating a new request.
- Assistant home should default to the call-center dashboard with live queue, request, truck, and notification summaries.
- Admin home should default to operational dashboard.

## Cache Invalidation

Examples:

- Vehicle registration success: invalidate `vehicles/mine`, admin pending vehicles if admin app.
- Verification decision: invalidate pending queue, vehicle detail, owner vehicle list through notification/refetch.
- Request creation: invalidate client requests and owner offers for targeted owners through notification/refetch.
- Offer accept: invalidate offer inbox, request detail, vehicle availability, active trip.
- Status update: invalidate request detail and timeline.
- Rating submit: invalidate owner ratings and request detail.

## Critical Frontend Risks

- Map/location UX can become confusing if addresses are inaccurate. Always allow pin adjustment and address notes.
- Owner acceptance must not be optimistic because concurrency conflicts are expected.
- Admin document review must handle slow file loading and signed URL expiry.
- Assisted booking must be fast enough for live calls; minimize required fields and allow notes.
