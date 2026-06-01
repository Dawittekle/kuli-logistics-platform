# KULI Test Cases

Project title: **KULI: P2P Logistics Mobile Application On Demand Trucking Service**

Last updated: 2026-06-01

Use this document during manual and automated test execution. For every run, update `Actual result`, `Status`, and `Notes`. Unless the test has been executed for the specific build under test, keep `Actual result` as `Not run yet` and `Status` as `Not Run`.

Status values:

- `Pass`
- `Fail`
- `Not Run`

## Test Data Guidelines

| Data Type | Recommended Data |
|---|---|
| Client email | Use a real Supabase test email only when email confirmation/password reset must be tested. Use demo auth for UI exploration. |
| Truck owner email | Use a separate real Supabase test email or demo owner profile. |
| Admin/assistant | Use provisioned staff accounts from the web dashboard or seeded local data. |
| Password | Use a non-production test password. Do not document real credentials in this file. |
| Pickup/destination | Addis Ababa locations such as Bole, Piazza, CMC, Megenagna, Mexico, Atlas. |
| Vehicle | Example plate `AA-12345`, approved class such as Medium Truck or Large Truck. |
| Documents | Use test images/PDFs only; do not upload private identity documents for repeated testing. |

## 1. Authentication

| Test case ID | Feature | Purpose | Preconditions | Test data | Steps | Expected result | Actual result | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| AUTH-001 | Login | Verify valid user can sign in. | API running; Supabase configured; account exists. | Valid email/password. | Open mobile app.<br>Enter email/password.<br>Press Login. | User is authenticated and routed by backend profile role. | Not run yet | Not Run | Test client and owner separately. |
| AUTH-002 | Login | Verify invalid login shows clear error. | API and Supabase configured. | Wrong password or unknown email. | Open Login.<br>Enter invalid credentials.<br>Press Login. | Login fails; user sees recoverable error; no route change. | Not run yet | Not Run | Do not expose whether account exists. |
| AUTH-003 | Register client | Verify public client registration. | Supabase registration enabled or demo auth enabled. | Full name, email, phone, password. | Open Register.<br>Select Client.<br>Submit details.<br>Confirm email if required. | Client account/profile exists and routes to client tabs after confirmation. | Not run yet | Not Run | Public mobile registration only. |
| AUTH-004 | Register truck owner | Verify public truck-owner registration. | Supabase registration enabled or demo auth enabled. | Full name, email, phone, password. | Open Register.<br>Select Truck owner.<br>Submit details.<br>Confirm email if required. | Truck owner account/profile exists and routes to owner tabs after confirmation. | Not run yet | Not Run | Vehicle approval still separate. |
| AUTH-005 | Password reset | Verify reset request for valid email. | Supabase URL/key configured; email provider available. | Existing account email. | Open Login.<br>Tap Forgot password.<br>Enter email.<br>Send reset email. | Success message appears and Supabase sends reset email/link. | Not run yet | Not Run | External email delivery depends on provider. |
| AUTH-006 | Password reset | Verify invalid/missing email handling. | Mobile app running. | Blank or malformed email. | Open Forgot password.<br>Submit blank/malformed email. | Clear validation error; no crash. | Not run yet | Not Run | |
| AUTH-007 | Logout | Verify user can sign out. | User signed in. | Any valid user. | Open Home.<br>Press Sign out. | Session clears and app returns to auth screen. | Not run yet | Not Run | |
| AUTH-008 | Session persistence | Verify session survives app refresh. | User signed in; token valid. | Any valid user. | Sign in.<br>Refresh Expo web or restart app.<br>Observe app. | User remains signed in and routes by profile. | Not run yet | Not Run | |

## 2. Role Routing

| Test case ID | Feature | Purpose | Preconditions | Test data | Steps | Expected result | Actual result | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| ROLE-001 | Client routing | Verify client routes to client tabs. | Client profile exists. | Client account. | Sign in as client. | Bottom tabs show Home, Request, Activity, Notifications. | Not run yet | Not Run | |
| ROLE-002 | Owner routing | Verify truck owner routes to owner tabs. | Truck-owner profile exists. | Owner account. | Sign in as truck owner. | Bottom tabs show Home, Vehicles, Offers, Notifications, Earnings. | Not run yet | Not Run | |
| ROLE-003 | Staff forbidden | Verify admin blocked from mobile. | Admin account exists. | Admin credentials. | Sign in on mobile as admin. | Mobile shows forbidden/right workspace state; no marketplace tabs. | Not run yet | Not Run | Staff work belongs to web dashboard. |
| ROLE-004 | Staff forbidden | Verify assistant blocked from mobile. | Assistant account exists. | Assistant credentials. | Sign in on mobile as assistant. | Mobile shows forbidden/right workspace state; no marketplace tabs. | Not run yet | Not Run | |
| ROLE-005 | Role preservation | Verify demo login does not silently change owner to client. | Demo auth enabled; existing owner profile by email. | Owner email. | Sign in or start demo profile for existing owner. | Existing backend role is preserved unless explicit registration changes it. | Not run yet | Not Run | Regression from earlier role confusion. |

## 3. Client Request

| Test case ID | Feature | Purpose | Preconditions | Test data | Steps | Expected result | Actual result | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| REQ-001 | Valid quote | Verify quote generation. | Client signed in; vehicle classes exist; API running. | Pickup Bole, destination Piazza, Medium Truck, 800kg. | Open Request.<br>Select route.<br>Enter load/truck/schedule.<br>Press Get quote. | Quote step shows ETB total, route, breakdown, distance/ETA, candidates or empty state. | Not run yet | Not Run | Uses `/quotes`. |
| REQ-002 | Route validation | Verify same pickup/drop-off blocked. | Client signed in. | Pickup Bole, destination Bole. | Select same pickup and drop-off.<br>Continue. | UI shows validation error and does not continue. | Not run yet | Not Run | |
| REQ-003 | Truck type selection | Verify selected truck state. | Vehicle classes loaded. | Medium Truck and Large Truck. | Open Truck/load step.<br>Select truck types. | Selected truck card is visibly active and quote payload uses selected class. | Not run yet | Not Run | |
| REQ-004 | Load validation | Verify required load details. | Client signed in. | Missing/invalid weight or volume. | Leave invalid load values.<br>Get quote. | Backend or UI returns clear recoverable validation error. | Not run yet | Not Run | |
| REQ-005 | Candidate selection | Verify selecting nearby trucks. | Quote has candidates. | Candidate list from API. | Generate quote.<br>Select/deselect candidates. | Selected state updates and Send request disabled when none selected. | Not run yet | Not Run | |
| REQ-006 | Dispatch request | Verify request creation. | Quote generated; at least one candidate selected. | Selected candidate IDs. | Press Send request. | Backend creates request/offers; UI shows sent/searching state; Home active move updates. | Not run yet | Not Run | Uses `/kuli-requests`. |
| REQ-007 | No candidate state | Verify empty discovery handling. | No approved online vehicles near pickup or class unavailable. | Pickup far from active vehicles. | Generate quote. | UI shows no nearby approved trucks and suggests adjustment. | Not run yet | Not Run | |
| REQ-008 | Server/network error | Verify recoverable request error. | API temporarily stopped or forced error. | Any request data. | Try quote or dispatch while API unreachable. | Clear error appears; form data remains available. | Not run yet | Not Run | |
| REQ-009 | Map preview | Verify map-first request UI. | Mobile app running. | Any pickup/destination. | Open Request.<br>Observe route screen.<br>Use zoom/full-screen if available. | Map preview is visible and central; UI does not claim live GPS. | Not run yet | Not Run | |

## 4. Owner Vehicle

| Test case ID | Feature | Purpose | Preconditions | Test data | Steps | Expected result | Actual result | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| VEH-001 | Create vehicle | Verify owner can submit vehicle. | Owner signed in; vehicle classes exist. | Plate AA-12345, class Medium Truck, capacity. | Open Vehicles.<br>Fill vehicle form.<br>Submit. | Vehicle appears in My vehicles with pending/draft state. | Not run yet | Not Run | |
| VEH-002 | Missing documents | Verify missing required documents are visible. | Vehicle exists. | No document files. | Open document upload section. | Required document count shows missing items; submit all unavailable until documents attached. | Not run yet | Not Run | |
| VEH-003 | Upload document | Verify document upload metadata. | Vehicle exists; image/PDF available. | Test image/PDF. | Pick document type.<br>Upload from library or camera.<br>Submit document. | Document shows latest upload metadata and pending review state. | Not run yet | Not Run | Real binary storage depends on config. |
| VEH-004 | Pending approval | Verify pending state. | Vehicle submitted for review. | Submitted vehicle. | Open Vehicles after submit. | Vehicle shows Pending and cannot receive offers. | Not run yet | Not Run | |
| VEH-005 | Approved online | Verify approved vehicle can go online. | Admin approved vehicle. | Approved vehicle. | Open Vehicles.<br>Set active vehicle.<br>Toggle Online. | Availability becomes Online and vehicle can appear in matching. | Not run yet | Not Run | |
| VEH-006 | Unapproved cannot go online | Verify gate by approval. | Vehicle not approved. | Pending/rejected vehicle. | Try availability action. | UI/API blocks online state and explains approval required. | Not run yet | Not Run | |
| VEH-007 | Rejected reason | Verify rejection reason visibility. | Admin rejected vehicle with reason. | Rejected vehicle. | Open Vehicles. | Rejection reason appears and owner can prepare corrections. | Not run yet | Not Run | |

## 5. Offer and Trip Execution

| Test case ID | Feature | Purpose | Preconditions | Test data | Steps | Expected result | Actual result | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| OFFER-001 | Receive offer | Verify owner sees offer. | Client dispatched request to owner vehicle. | Active offer. | Sign in as owner.<br>Open Offers. | Offer card shows route, load, estimate, distance/expiry. | Not run yet | Not Run | |
| OFFER-002 | Accept offer | Verify owner acceptance. | Pending offer exists; vehicle available. | Offer ID. | Open offer.<br>Press Accept request. | Request becomes accepted; active trip appears; competing offers close. | Not run yet | Not Run | |
| OFFER-003 | Decline offer | Verify owner decline. | Pending offer exists. | Offer ID. | Press Decline. | Offer removed/marked declined; request remains open for other offers. | Not run yet | Not Run | |
| OFFER-004 | First-accept-wins | Verify race-condition behavior. | Same request sent to multiple owners. | Two owner accounts. | Owner A accepts.<br>Owner B attempts accept. | Owner A wins; Owner B gets conflict/unavailable message. | Not run yet | Not Run | Critical backend rule. |
| OFFER-005 | Status transitions | Verify valid manual trip flow. | Request accepted. | Accepted request. | Owner advances: en route, arrived, loading, in transit, unloading, completed. | Each allowed transition succeeds and creates timeline event. | Not run yet | Not Run | |
| OFFER-006 | Invalid transition | Verify invalid status blocked. | Request accepted or pending. | Unsupported transition. | Attempt invalid direct transition if API/client permits. | Backend rejects and UI shows clear error. | Not run yet | Not Run | May need REST client. |
| OFFER-007 | Active trip visibility | Verify accepted trip shows for both roles. | Offer accepted. | Accepted request. | Open client Home and owner Offers. | Both users see active trip details and current status. | Not run yet | Not Run | |

## 6. Tracking and Messaging

| Test case ID | Feature | Purpose | Preconditions | Test data | Steps | Expected result | Actual result | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| TRACK-001 | Client active trip | Verify client sees active tracking workspace. | Request accepted. | Accepted request. | Client opens Home.<br>Tap Track request/details. | Map preview, route, status, timeline, and messages are visible. | Not run yet | Not Run | No live GPS claim. |
| TRACK-002 | Timeline updates | Verify status events visible. | Owner updates status. | Status events. | Owner updates trip.<br>Client refreshes/refetches. | Timeline shows new event with timestamp/status. | Not run yet | Not Run | |
| TRACK-003 | Send message | Verify request-scoped chat. | Active request exists. | Text message. | Client sends message.<br>Owner opens thread. | Message appears for both parties after API confirmation. | Not run yet | Not Run | |
| TRACK-004 | Message failure | Verify retryable error. | API unavailable or forced failure. | Text message. | Send message during failure. | Error/retry state appears; no fake sent state. | Not run yet | Not Run | |
| TRACK-005 | Archived terminal chat | Verify terminal behavior. | Request cancelled/timed out. | Terminal request. | Open message section. | Messaging is collapsed/archived with follow-up guidance. | Not run yet | Not Run | |

## 7. Cancellation

| Test case ID | Feature | Purpose | Preconditions | Test data | Steps | Expected result | Actual result | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| CANCEL-001 | Client cancels pending | Verify pending cancellation. | Client has pending request. | Reason: plans changed. | Open active request.<br>Cancel.<br>Select reason.<br>Confirm. | Request becomes Cancelled; open offers close; Home updates. | Not run yet | Not Run | |
| CANCEL-002 | Reason required | Verify reason validation. | Cancellable request exists. | No reason. | Open cancel dialog.<br>Try confirm without reason. | Confirm is blocked or validation appears. | Not run yet | Not Run | |
| CANCEL-003 | Cancel accepted allowed state | Verify accepted/en route policy. | Accepted or en-route request. | Reason: delay or safety. | Client cancels where policy allows. | Backend confirms cancellation or returns clear policy error. | Not run yet | Not Run | |
| CANCEL-004 | History after cancel | Verify cancelled trip appears in Activity. | Request cancelled. | Cancelled request. | Open Activity. | Cancelled move appears with status and details. | Not run yet | Not Run | |

## 8. Payment

| Test case ID | Feature | Purpose | Preconditions | Test data | Steps | Expected result | Actual result | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| PAY-001 | Confirm cash payment | Verify owner confirms payment after completion. | Trip completed; owner signed in. | Amount blank or estimate. | Open Earnings.<br>Press Confirm cash payment. | Payment becomes confirmed and disappears from pending confirmation list. | Not run yet | Not Run | Backend-confirmed only. |
| PAY-002 | Payment before completion | Verify blocked early payment. | Trip not completed. | Active request. | Try payment confirm via UI/API. | Action is unavailable or backend rejects. | Not run yet | Not Run | |
| PAY-003 | Client payment state | Verify client sees pending/disputed state. | Completed request with payment record. | Completed trip. | Open Activity/details. | Payment state is visible and human-readable. | Not run yet | Not Run | |
| PAY-004 | Dispute payment | Verify dispute eligibility. | Completed or cancelled request. | Dispute reason. | Open Activity.<br>Details.<br>Payment tab.<br>Submit dispute. | Dispute is recorded and notification/report state updates. | Not run yet | Not Run | |

## 9. Rating and Report

| Test case ID | Feature | Purpose | Preconditions | Test data | Steps | Expected result | Actual result | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| TRUST-001 | Rate completed trip | Verify rating submission. | Completed trip with selected owner. | 5 stars, optional note. | Open Activity or rating popup.<br>Select stars.<br>Submit review. | Review saved and owner rating data updates after refetch. | Not run yet | Not Run | |
| TRUST-002 | Duplicate rating | Verify duplicate rating blocked if backend supports it. | Trip already rated. | Same trip. | Submit second rating. | Backend blocks duplicate or returns idempotent existing result. | Not run yet | Not Run | |
| TRUST-003 | Report issue no evidence | Verify report without file. | Terminal or eligible request. | Category: damage, description. | Open Activity details.<br>Issue tab.<br>Submit without evidence. | Report code appears; report is saved. | Not run yet | Not Run | |
| TRUST-004 | Report issue with evidence | Verify optional evidence attachment. | Eligible request; test image available. | Category and image. | Submit report with uploaded/taken photo. | Report saved; evidence attached or retry message shown. | Not run yet | Not Run | |
| TRUST-005 | Missing report description | Verify validation. | Eligible request. | Empty description. | Try submit issue. | Clear validation error; no report created. | Not run yet | Not Run | |

## 10. Notifications

| Test case ID | Feature | Purpose | Preconditions | Test data | Steps | Expected result | Actual result | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| NOTIF-001 | Unread display | Verify unread count/list. | Notification records exist. | Offer/status/message notifications. | Open Notifications. | Unread count and rows display clearly. | Not run yet | Not Run | |
| NOTIF-002 | Mark as read | Verify read action. | Unread notification exists. | Notification ID. | Press Mark read. | Notification becomes Read; unread count decreases. | Not run yet | Not Run | |
| NOTIF-003 | View details | Verify notification navigation. | Notification has request ID. | Offer or request notification. | Press View offer/details. | Owner goes to Offers; client goes to Home/details area. | Not run yet | Not Run | |
| NOTIF-004 | Preference update | Verify preferences save. | User signed in. | Push/SMS/Email toggles. | Change toggles.<br>Save preferences. | Preferences save and success message appears. | Not run yet | Not Run | |

## 11. UI/UX Regression

| Test case ID | Feature | Purpose | Preconditions | Test data | Steps | Expected result | Actual result | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| UI-001 | Bottom tabs | Verify tab navigation and icons. | Client and owner users available. | Client and owner sessions. | Sign in as each role.<br>Tap all bottom tabs. | Tabs use professional icons, labels fit, and navigation works. | Not run yet | Not Run | |
| UI-002 | No generated labels | Verify route/debug labels removed. | Mobile app running. | All mobile screens. | Scan Home, Request, Activity, Notifications, Vehicles, Offers, Earnings. | No `/client/...`, `/owner/...`, workflow, phase, or debug labels in normal screens. | Not run yet | Not Run | |
| UI-003 | Loading states | Verify loading copy and layout. | Slow network or query loading. | Any list/query screen. | Open screen during loading. | Loading state is clear and not oversized or confusing. | Not run yet | Not Run | |
| UI-004 | Empty states | Verify empty states. | No requests/offers/vehicles/notifications. | Fresh demo data. | Open each empty screen. | Empty states explain next action and avoid blank space. | Not run yet | Not Run | |
| UI-005 | Error states | Verify recoverable errors. | API stopped or invalid input. | Any screen. | Trigger API/validation error. | Error is user-visible, concise, and recoverable. | Not run yet | Not Run | |
| UI-006 | Small screen usability | Verify mobile layout. | Expo web/mobile viewport or emulator. | Small phone viewport. | Navigate all screens. | Text does not overlap; buttons remain tappable; bottom tabs do not cover critical controls. | Not run yet | Not Run | |
| UI-007 | Map preview visible | Verify map-first request/tracking. | Client signed in. | Any route. | Open Request and active tracking. | Map preview is visible; zoom/full-screen controls work where available. | Not run yet | Not Run | |
| UI-008 | Request flow usable | Verify guided flow. | Client signed in. | Valid route/load/truck. | Complete Route -> Truck -> Quote -> Sent steps. | Flow is understandable and preserves input after recoverable errors. | Not run yet | Not Run | |

## Test Execution History

| Date | Build/Commit | Environment | Tester | Test cases run | Pass | Fail | Not Run | Notes |
|---|---|---|---|---|---:|---:|---:|---|
| 2026-06-01 | Current local branch | Local repo | Codex | Documentation creation only | 0 | 0 | All | Created test case document; no manual test execution performed. |

## Known Testing Gaps

| Gap | Affected Test Cases | Notes |
|---|---|---|
| Android emulator/device not always available due to resource cost | UI-001, UI-006, UI-007, UI-008 | Use Expo web first; run Android before final submission. |
| Supabase email confirmation/rate limits | AUTH-003, AUTH-004, AUTH-005 | Use demo auth for UI exploration and run real Supabase checks sparingly. |
| External SMS/email/push providers may not be configured | NOTIF-001 to NOTIF-004 | Test in-app notifications; external delivery is out of scope unless provider keys exist. |
| Real file storage provider may not be configured | VEH-003, TRUST-004 | Test upload intent/metadata locally; verify binary storage when configured. |
| Live GPS is not implemented | UI-007, TRACK-001 | Test static map preview and manual status tracking only. |
| Full web dashboard workflows need separate execution | ROLE-003, ROLE-004, vehicle/admin approval support | Mobile must block staff; staff workflows should be tested in admin web. |
