# Feature Specifications

This document defines each major feature as an implementation contract. Coding agents should treat these sections as behavior-level requirements, not product summaries.

Related documents:
- [API Architecture](api_architecture.md)
- [Database Design](database_design.md)
- [Frontend Architecture](frontend_architecture.md)
- [Backend Architecture](backend_architecture.md)

## Feature 1: Authentication, Profiles, and Roles

### Functional Description

The system must allow users to authenticate with email or phone through Supabase Auth and then operate under one of the supported roles: client, truck owner, call-center assistant, or admin.

Public self-registration should be allowed for clients and truck owners. Admin and assistant accounts should be provisioned by an existing admin or seeded during deployment, even though the source document lists all roles in registration. This is a security assumption that prevents arbitrary users from self-assigning privileged roles.

### User Flow

1. User opens app or web dashboard.
2. User selects login or create account.
3. User enters email/phone and OTP/password flow.
4. Supabase authenticates the user.
5. Backend syncs or creates application profile.
6. Backend returns role, permissions, account status, and profile completeness.
7. UI redirects to the correct dashboard.

### Technical Behavior

- Supabase stores credentials.
- MongoDB `users` stores application profile and role.
- Every authenticated request includes a Supabase JWT.
- Backend resolves the profile from `supabaseUserId`.
- If no profile exists and registration is allowed, create one with `accountStatus=active` or `pending_verification` based on role.
- If account is suspended/banned/deleted, authentication may succeed but API commands must be blocked.

### Required Components

- Mobile auth screens.
- Admin web login screen.
- Backend auth guard.
- Profile sync endpoint.
- RBAC policy guard.
- User repository.
- Session-aware API client.

### API Interactions

- `POST /api/v1/auth/sync-profile`
- `GET /api/v1/me`
- `PATCH /api/v1/me`
- `POST /api/v1/admin/users`
- `PATCH /api/v1/admin/users/:id/status`

### Database Implications

- `users.supabaseUserId` must be unique.
- `users.phone` and `users.email` should be unique when present.
- Store notification preferences and role-specific metadata in `users`.
- Never store plaintext passwords.

### Validation Rules

- Phone numbers must normalize to E.164 where possible.
- Email must be valid and lowercase normalized.
- Role must be one of allowed enum values.
- Admin and assistant creation requires admin role.
- User cannot change own role through profile update.

### Edge Cases and Failure Handling

- Duplicate email/phone: return conflict.
- Supabase token valid but no MongoDB profile: sync profile if allowed, otherwise return onboarding required.
- Suspended account: return forbidden with displayable reason.
- Lost connectivity during OTP: show retryable state.
- Invalid OTP/password: show concise error without leaking account existence.

### Permissions

- Client and truck owner can self-register.
- Admin can create staff accounts and modify status.
- Assistant cannot create privileged accounts.

### Future Extensibility

- Add MFA policy for staff.
- Add OAuth providers.
- Add locale preference and local-language onboarding.

## Feature 2: Vehicle Classes and Pricing Inputs

### Functional Description

Admins manage vehicle classes that represent truck categories and capacity bands. These classes are used by vehicle registration, matching, capacity filtering, and price calculation.

### User Flow

1. Admin opens vehicle class management.
2. Admin creates or edits class name, description, capacity, dimensions, base pricing parameters, active flag, and display order.
3. Truck owners select a class during vehicle registration.
4. Clients can filter/request by class or allow the system to suggest alternatives.

### Technical Behavior

- Vehicle classes are controlled reference data.
- Pricing rules may reference vehicle classes.
- Classes should be soft-deleted or deactivated, not removed when referenced by historical trips.

### Required Components

- Admin vehicle class CRUD UI.
- Mobile vehicle class selector.
- Request form vehicle class selector.
- Backend vehicle class module.

### API Interactions

- `GET /api/v1/vehicle-classes`
- `POST /api/v1/admin/vehicle-classes`
- `PATCH /api/v1/admin/vehicle-classes/:id`
- `DELETE /api/v1/admin/vehicle-classes/:id` as soft delete/deactivate

### Database Implications

- `vehicle_classes` collection.
- Index `active`, `displayOrder`, `slug`.
- Historical requests should denormalize class label and pricing version.

### Validation Rules

- Capacity must be positive.
- Slug must be unique.
- Cannot deactivate the only active class if vehicles depend on it without migration plan.

### Edge Cases

- Client request references inactive class: reject for new requests, still display history.
- Owner vehicle uses old class: preserve historical label and require admin migration if class is retired.

## Feature 3: Truck Owner Vehicle Registration and Verification

### Functional Description

Truck owners register vehicles and upload required documents. Admins review submissions and approve or reject. Unverified vehicles must not appear in matching results.

### User Flow

1. Truck owner opens vehicle management.
2. Owner enters vehicle class, license plate, capacity, service area, current/standby location, a vehicle photo where available, and document uploads.
3. System validates required fields and file readability.
4. Vehicle enters pending verification.
5. Admin reviews pending queue.
6. Admin approves or rejects with reason.
7. Owner receives notification.
8. Approved vehicle can be made available.

### Technical Behavior

- Vehicle has `verificationStatus`.
- Vehicle also has `availabilityStatus`.
- Document files are stored in object storage with metadata in MongoDB.
- Admin decision creates an audit log.
- Duplicate license plates should be blocked across active/non-deleted vehicles.

### Required Components

- Mobile vehicle registration form.
- Vehicle photo picker and default vehicle image fallback.
- Document upload component.
- Owner vehicle list and status screen.
- Admin verification queue.
- Admin document preview.
- Backend vehicle registry module.
- File storage adapter.
- Notification event.

### API Interactions

- `POST /api/v1/vehicles`
- `GET /api/v1/vehicles/mine`
- `PATCH /api/v1/vehicles/:id`
- `POST /api/v1/vehicles/:id/documents`
- `PATCH /api/v1/vehicles/:id/availability`
- `GET /api/v1/admin/vehicles/pending`
- `PATCH /api/v1/admin/vehicles/:id/verification`

### Database Implications

- `vehicles` collection with indexes on owner, plate, class, verification, availability, current location.
- `vehicle_documents` can be embedded for small metadata or separate if audit/history is complex. Prefer separate collection if documents need versioning.

### Validation Rules

- License plate required and normalized.
- Owner must be truck owner role.
- Required documents: identity, driver license, vehicle registration certificate, proof of ownership, insurance where available.
- Vehicle photo is requested for marketplace trust, but existing vehicles can fall back to a default truck image until a photo is attached.
- File types restricted to image/PDF.
- File size capped.
- Vehicle cannot become available unless approved and not suspended/maintenance.

### Edge Cases and Failure Handling

- Corrupted file: reject before creating verification task.
- Missing document: show field-level error.
- Admin rejects: owner sees reason and resubmission path.
- Vehicle under maintenance: exclude from matching.
- Owner has multiple vehicles: only one active vehicle should be used for request offers unless product later supports fleet-style multi-vehicle dispatch.

### Permissions

- Owner manages own vehicles.
- Admin verifies, suspends, and edits vehicle classes.
- Client has read-only access to public vehicle listing fields.

### Future Extensibility

- Automated OCR/document checks.
- Insurance validation integration.
- Fleet operator accounts with multiple drivers.

## Feature 4: Availability Management

### Functional Description

Truck owners manage whether approved vehicles are available to receive work. Matching must only use vehicles that are verified, online, not busy, not suspended, and not under maintenance.

### Technical Behavior

Use separate fields:

- `verificationStatus`: pending, approved, rejected.
- `availabilityStatus`: offline, online_available, busy_on_job, under_maintenance, suspended.

### State Rules

- Pending/rejected vehicles cannot become online.
- Online vehicles become busy when accepting a request.
- Busy vehicles return online or offline after completion/cancellation based on owner preference.
- Admin can force suspended.
- Owner can set maintenance from online/offline but not during an active job unless emergency handling is implemented.

### API Interactions

- `PATCH /api/v1/vehicles/:id/availability`
- `GET /api/v1/owners/me/availability`

### Edge Cases

- Owner goes offline after offer dispatch: block acceptance if vehicle no longer available.
- Vehicle suspended by admin while offer pending: expire offers.
- Emergency breakdown during active job: transition vehicle to maintenance and trip to dispute/cancelled workflow requiring admin review.

## Feature 5: KULI Request Creation

### Functional Description

Clients and call-center assistants create logistics requests with pickup, destination, load, schedule, vehicle preferences, optional services, and special instructions.

### User Flow

1. Actor starts KULI request.
2. Actor enters or selects pickup and destination.
3. Actor adjusts map pins if needed.
4. Actor selects item type and load details.
5. Actor enters volume/weight estimate, pickup time, tip, and special handling.
6. Backend validates and generates price estimate and candidate vehicles.
7. Actor selects preferred drivers/vehicles and sends request.

### Technical Behavior

- A request may start as a quote/search before final submission.
- Persist final request only after actor confirms selected owner(s), unless assisted booking needs draft persistence.
- Store quote snapshot and pricing rule version on final request.
- For call-assisted requests, store `createdByAssistantId` and `clientContactSnapshot`.

### Required Components

- Request form.
- Location picker/map.
- Load details controls.
- Price estimate panel.
- Candidate vehicle list/map.
- Confirmation screen.
- Backend quote and request service.

### API Interactions

- `POST /api/v1/quotes`
- `POST /api/v1/kuli-requests`
- `GET /api/v1/kuli-requests/:id`
- `GET /api/v1/kuli-requests/mine`
- `POST /api/v1/kuli-requests/:id/cancel`

### Database Implications

- `kuli_requests` stores current status, locations, load details, quote snapshot, selected vehicle/owner when accepted, and event log references.
- `trip_offers` stores targeted owners/vehicles and offer status.

### Validation Rules

- Pickup and destination required.
- Coordinates required after geocoding.
- Pickup and destination cannot be identical.
- Distance must be positive.
- Load details required.
- Weight/volume must be non-negative and within vehicle class capacity if class selected.
- Pickup time cannot be too far in past.
- Client active request rule must be enforced according to config.

### Edge Cases and Failure Handling

- No vehicles found: show no-trucks-nearby state, offer broader radius or alternative classes.
- Route provider fails: allow manual fallback only if admin/assistant enabled and clearly mark estimate as approximate.
- Client abandons request after quote: do not dispatch offers.
- Network loss after submit: use idempotency key so retries do not duplicate request.

### Permissions

- Client creates own request.
- Assistant creates on behalf of client with recorded operator id.
- Admin can view and intervene.

## Feature 6: Pricing, Quotation, and Payment Records

### Functional Description

The system calculates transparent estimates and records payment outcomes. Integrated digital payments are future scope, but the data model and APIs must support multiple payment flows.

### Pricing Formula Guidance

Initial configurable formula:

```text
estimate =
  baseFare(vehicleClass)
  + distanceKm * perKmRate(vehicleClass)
  + max(0, estimatedDurationMinutes - includedMinutes) * waitOrDurationRate
  + loadAdjustment(weight, volume, itemType)
  + optionalServiceFees
  + fuelSurcharge
  + tollsOrAccessFees
  + tip
```

Apply:

- Minimum fare.
- Rounding rules.
- Currency `ETB`.
- Pricing rule version snapshot.

### Payment Flows

- `pay_on_acceptance`: record expected payment after owner accepts.
- `pay_on_delivery`: record expected payment after completion.
- `pay_in_advance`: reserved for digital payment integration.

Initial production should support cash/manual record keeping:

- `paymentStatus=pending`
- owner confirms payment after completion
- client can dispute amount
- admin can resolve

### API Interactions

- `POST /api/v1/quotes`
- `GET /api/v1/admin/pricing-rules`
- `POST /api/v1/admin/pricing-rules`
- `PATCH /api/v1/admin/pricing-rules/:id`
- `POST /api/v1/kuli-requests/:id/payment/confirm`
- `POST /api/v1/kuli-requests/:id/payment/dispute`

### Edge Cases

- Fuel price changes after quote: request keeps quote snapshot; new requests use latest rule.
- Owner disputes estimate: support admin adjustment only with audit log.
- Client tip omitted: default 0.
- Digital gateway later: do not overload cash confirmation endpoint; create provider-specific payment intents.

## Feature 7: Nearby Vehicle Discovery and Matching

### Functional Description

The system lists verified available truck owners near the pickup location and ranks them by practical suitability.

### Matching Algorithm

1. Start with configured radius, default 10 km.
2. Query vehicles:
   - approved verification
   - online available
   - not busy
   - not suspended
   - class compatible
   - capacity compatible
   - within radius using MongoDB 2dsphere
3. If no results, expand to second radius, default 20 km.
4. If still none, return no nearby trucks and suggested alternatives.
5. For results, calculate distance and optionally route ETA.
6. Apply filters for type and capacity.
7. Rank by weighted score:
   - distance
   - rating
   - completion rate
   - recent cancellations
   - unresolved disputes
   - availability freshness
8. Return top N plus enough metadata for UI cards.

### Technical Behavior

- `currentLocation` must be updated when owner sets availability or manually changes standby location.
- Ranking must be deterministic for stable UI pagination.
- Distance in query can use geospatial distance; ETA may come from routing API for top candidates only to reduce cost.

### Edge Cases

- Final filtered list empty after initial geospatial hits: suggest alternative vehicle types.
- Stale location: mark candidate lower or exclude after configured timeout.
- Low network: client can enter manual address; backend still requires coordinates before matching.

## Feature 8: Offer Dispatch and Acceptance

### Functional Description

After a client selects preferred drivers/vehicles, the system sends offer notifications. A truck owner can accept first if still eligible.

### Technical Behavior

- Create one `trip_offer` per targeted vehicle/owner.
- Offer statuses: sent, viewed, accepted, declined, expired, cancelled.
- Request statuses: pending, accepted, timed_out, cancelled.
- Offer expiration should be configurable, default 10 minutes from the state chart.
- Acceptance must be atomic.

### API Interactions

- `GET /api/v1/owner/offers`
- `POST /api/v1/offers/:id/accept`
- `POST /api/v1/offers/:id/decline`
- `POST /api/v1/offers/:id/viewed`

### Edge Cases

- Two owners accept at same time: one succeeds, one gets conflict.
- Owner not verified anymore: block acceptance.
- Vehicle no longer online: block acceptance.
- Request cancelled by client: expire offers and notify owners.

## Feature 9: Trip Lifecycle and Manual Status Updates

### Functional Description

Truck owners manually update trip status. Clients receive status updates. All status changes are logged.

### Statuses

Recommended normalized enum:

- `pending`
- `accepted`
- `en_route_to_pickup`
- `arrived_at_pickup`
- `loading`
- `in_transit`
- `unloading`
- `completed`
- `cancelled`
- `timed_out`

### Technical Behavior

- Use a transition map in backend domain code.
- UI labels can be friendlier than enum values.
- Store every transition as `kuli_status_events`.
- Notify affected users on important states.
- Vehicle becomes busy after accepted and releases after completed/cancelled according to policy.

### API Interactions

- `PATCH /api/v1/kuli-requests/:id/status`
- `GET /api/v1/kuli-requests/:id/events`

### Edge Cases

- Invalid transition: return `INVALID_STATUS_TRANSITION`.
- Client tries to update owner-only status: forbidden.
- Owner completes without payment: allowed only if payment flow supports payment after completion; payment status remains pending.
- Cancellation in transit: may require admin/dispute path.

## Feature 10: Messaging and Notifications

### Functional Description

Clients and truck owners communicate in-app with message history tied to a KULI request. Notifications alert users to key events.

### Technical Behavior

- Messages belong to a specific request.
- Only request participants and authorized staff can access message thread.
- In-app notification records are persisted.
- External notifications are dispatched through a queue/outbox.
- Users can opt out of non-essential notifications, but cannot opt out of safety/security/transactional messages.

### API Interactions

- `GET /api/v1/kuli-requests/:id/messages`
- `POST /api/v1/kuli-requests/:id/messages`
- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/:id/read`
- `PATCH /api/v1/me/notification-preferences`

### Edge Cases

- Message send offline: client queues retry with idempotency key.
- User removed/suspended mid-trip: preserve history and restrict new sends.
- Push provider failure: notification record remains and retry job handles external dispatch.

## Feature 11: Ratings and Reviews

### Functional Description

Clients rate completed or cancelled/terminated KULI trips. Ratings influence future matching.

### Technical Behavior

- One client rating per request per rating target.
- Rating allowed only after terminal trip state.
- Aggregate owner rating updates after rating creation.
- Moderation fields allow hiding abusive text without deleting the rating record.

### API Interactions

- `POST /api/v1/kuli-requests/:id/rating`
- `GET /api/v1/owners/:id/ratings`

### Validation Rules

- Numeric rating required, 1 to 5.
- Text review optional with max length.
- Client must be request owner or assistant acting under support workflow.

### Edge Cases

- Cancelled before owner accepted: rating should generally not target an owner.
- Duplicate rating: update within editable window or reject.
- Fraudulent review: admin can moderate and audit action.

## Feature 12: Reports and Disputes

### Functional Description

Clients or assistants can file reports about truck owner misconduct or trip issues. Admins review and resolve.

### Technical Behavior

- Reports reference request, reporter, reported party, category, description, evidence files, and status.
- Report statuses: open, under_review, awaiting_response, resolved, rejected.
- Admin resolution can issue warning, suspension, refund recommendation, visibility penalty, or no action.
- Frequent/unresolved reports affect owner ranking.

### API Interactions

- `POST /api/v1/reports`
- `GET /api/v1/admin/reports`
- `PATCH /api/v1/admin/reports/:id`
- `POST /api/v1/reports/:id/evidence`

### Edge Cases

- Report without request: allow only for platform issue category.
- Evidence upload fails: keep draft report or allow later evidence attachment.
- Report against suspended user: still allow admin resolution.

## Feature 13: Administration Dashboard

### Functional Description

Admin dashboard provides operational control over users, reports, vehicles, vehicle classes, pricing rules, and system health.

### Required Views

- Login/session view.
- Overview dashboard with metrics.
- User management.
- Vehicle verification queue.
- Vehicle class management.
- Pricing rule management.
- KULI requests/trips oversight.
- Reports/disputes queue.
- Payment records and reconciliation.
- Audit log viewer.

### Technical Behavior

- All admin actions are server-authorized and audit logged.
- Tables must support pagination, sorting, search, and filters.
- Detail drawers/pages should show timeline, documents, messages summary, and decision forms.

### Edge Cases

- Admin rejects verification without reason: block.
- Concurrent admin decisions: second action gets conflict.
- Audit log tampering: logs should be append-only at application level.

## Feature 14: Call-Center Assistant Console and Hotline Tickets

### Functional Description

Assistants handle phone-based bookings and hotline tickets. They can create KULI requests on behalf of clients, update ticket status, and record call notes.

### Ticket States

- `open`
- `assigned`
- `in_progress`
- `pending_client`
- `closed`
- `cancelled`

### User Flow

1. Assistant opens ticket dashboard.
2. Assistant claims open ticket or creates assisted booking from live call.
3. Assistant collects client information.
4. Assistant searches vehicles and quotes price.
5. Assistant confirms with client.
6. Assistant creates KULI request and links ticket.
7. Assistant sends SMS confirmation.
8. Ticket closes or remains pending follow-up.

### API Interactions

- `GET /api/v1/assistant/tickets`
- `POST /api/v1/assistant/tickets`
- `PATCH /api/v1/assistant/tickets/:id/status`
- `POST /api/v1/assistant/bookings`

### Edge Cases

- Assistant unavailable: system creates open missed-call ticket.
- Client no response: ticket becomes pending client, then cancelled after timeout.
- No available vehicles: assistant records delay explanation and whether client waits.
- Duplicate caller creates multiple tickets: UI should surface recent tickets by phone.

## Feature 15: Payment Confirmation and Reconciliation

### Functional Description

Truck owner confirms payment after completion. Admin can review payment records and disputes.

### Technical Behavior

- Payment records are created when request is accepted or completed based on payment flow.
- Owner confirmation updates payment status to confirmed_by_owner.
- Client dispute moves payment to disputed and notifies admin.
- Admin resolution sets final status and optional adjustment.

### API Interactions

- `POST /api/v1/kuli-requests/:id/payment/confirm`
- `POST /api/v1/kuli-requests/:id/payment/dispute`
- `GET /api/v1/admin/payments`
- `PATCH /api/v1/admin/payments/:id`

### Edge Cases

- Owner confirms before completion: reject.
- Client disputes after confirmed: allow within policy window.
- Commission collection for cash payments is not defined; track platform commission owed but do not implement automated collection until product decision.

## Feature 16: Audit Logs and Operational Reporting

### Functional Description

The system must track security-sensitive and business-critical events.

### Events to Audit

- Login anomalies and staff login.
- Role changes.
- Account suspension/ban.
- Vehicle approval/rejection/suspension.
- Pricing rule changes.
- Request acceptance/cancellation/completion.
- Payment confirmation/dispute/resolution.
- Report resolution.
- File access for sensitive documents.

### Technical Behavior

- Audit logs are append-only.
- Include actor, target, action, timestamp, request id, IP/user agent where available, and metadata.
- Admin UI can filter and view logs.

### Edge Cases

- Audit write failure during critical command: command should fail closed for admin/security actions, but can degrade for low-risk read actions.
