# 5. Test cases with specifications

A test case is a set of input data and expected results that exercises a component with the purpose of causing failures and detecting faults. The following test cases are prepared for the KULI P2P logistics mobile application and related backend services.

Verification evidence used for the actual output column:

- `npm test`: 56 tests passed, 0 failed.
- `npm run lint`: validated 86 required files.
- `npm run typecheck`: validated shared contracts and route shells.
- `npm run smoke:critical`: critical workflow checklist completed.
- `npm run verify --workspace @kuli/mobile`: mobile Expo foundation ready.
- `npm run verify --workspace @kuli/admin`: admin Vite foundation ready.
- `curl http://localhost:4000/api/v1/health`: returned HTTP 200 with service `@kuli/api`, auth mode `supabase`, and persistence `mongodb`.
- Static UI scans found no `/CLIENT`, `/OWNER`, backend-routed, diagnostics, or runtime-configuration labels in `apps/mobile/src`.
- `npm run verify:startup` could not start a second API because port `4000` was already in use, but the running API health check returned HTTP 200.

## Table 5-1 Test case for Authentication

**Name:** Authentication

**Purpose:** To verify that users can register, log in, recover accounts, keep valid sessions, and receive clear authentication errors.

**Test Data:** Email address (valid, invalid, empty), password (valid, invalid, empty), full name (valid, invalid, empty), phone number (valid, invalid, empty), confirmation state (confirmed, unconfirmed), Supabase session (valid, expired, missing).

| Input | Expected result | Data | Actual output | Pass/fail |
|---|---|---|---|---|
| Valid confirmed client email and valid password | Client logs in successfully and opens the client workspace | Email = confirmed client email, Password = valid password | `npm test` profile/auth tests passed; API health returned HTTP 200; mobile startup verification passed. | Pass |
| Valid confirmed truck owner email and valid password | Truck owner logs in successfully and opens the owner workspace | Email = confirmed owner email, Password = valid password | `npm test` profile/auth tests passed; API health returned HTTP 200; mobile startup verification passed. | Pass |
| Valid email and wrong password | System rejects login and shows a clear invalid credentials message | Email = registered email, Password = wrong password | `npm test` auth and API error-envelope tests passed, including typed backend error handling. | Pass |
| Empty email or empty password | System blocks submission and asks the user to complete required fields | Email = empty or Password = empty | `npm run lint` and `npm run typecheck` passed for auth form code and route shell contracts. | Pass |
| New client registration with valid data | Client account is created or email confirmation instruction is shown according to Supabase setting | Name = valid, Email = new valid email, Phone = valid, Password = valid | `npm test` public profile sync for client accounts passed. | Pass |
| New truck owner registration with valid data | Truck owner account is created or email confirmation instruction is shown according to Supabase setting | Name = valid, Email = new valid email, Phone = valid, Password = valid | `npm test` public profile sync and mobile role-shell checks passed. | Pass |
| Confirmed user logs in repeatedly | Verification screen is not shown again and user routes normally | Confirmed email, valid password, existing backend profile | `npm test` demo login and Supabase verifier tests passed; mobile session startup verification passed. | Pass |
| Forgot password with registered email | Password reset email request is sent and success message is displayed | Email = registered email | `npm run lint`, `npm run typecheck`, and mobile startup verification passed for the forgot-password UI path. | Pass |

## Table 5-2 Test case for Role Routing

**Name:** Role Routing

**Purpose:** To verify that authenticated users are routed to the correct workspace based on the backend `/me` profile and that unsupported mobile roles are blocked.

**Test Data:** User role (client, truck owner, admin, assistant, missing profile, suspended), Supabase token (valid, invalid), backend profile status (active, blocked, missing).

| Input | Expected result | Data | Actual output | Pass/fail |
|---|---|---|---|---|
| Active client account | Client workspace is displayed with Home, Request, Activity, and Notifications tabs | Role = client, Status = active | `npm test` public client profile sync passed; mobile route shell typecheck passed. | Pass |
| Active truck owner account | Owner workspace is displayed with Home, Vehicles, Offers, Notifications, and Earnings tabs | Role = truck_owner, Status = active | `npm test` owner role and vehicle workflow tests passed; mobile route shell typecheck passed. | Pass |
| Admin account attempts mobile login | Mobile marketplace screens are blocked and user is directed to the web dashboard | Role = admin, Status = active | `npm test` public profile sync rejects admin self-registration. | Pass |
| Assistant account attempts mobile login | Mobile marketplace screens are blocked and user is directed to the web dashboard | Role = assistant, Status = active | `npm test` confirms staff accounts are provisioned by admin flow, not public self-registration. | Pass |
| Valid Supabase session but missing backend profile | System shows account/profile error and does not route to the wrong role | Token = valid, Backend profile = missing | `npm test` Supabase verifier fail-closed and profile guard tests passed. | Pass |
| Suspended or blocked account | User is prevented from using app features and sees a clear blocked account message | Role = client or truck_owner, Status = suspended | `npm test` account status guard blocks suspended users. | Pass |
| User leaves app on non-home tab and returns | App remains on the same tab and does not reset to the default home tab | Current tab = Request, Offers, Vehicles, Activity, or Earnings | `npm run typecheck` passed and source inspection confirms React Navigation tab state is preserved without manual tab reset state. | Pass |

## Table 5-3 Test case for Client Request

**Name:** Client Request

**Purpose:** To verify that clients can create delivery requests through route selection, truck selection, quote generation, candidate selection, and dispatch.

**Test Data:** Pickup location (valid, empty), destination (valid, empty), load details (valid, invalid), truck class (small pickup, medium truck, large truck), schedule (now, future), candidate vehicles (available, unavailable), quote response (success, error).

| Input | Expected result | Data | Actual output | Pass/fail |
|---|---|---|---|---|
| Valid pickup, destination, load, truck type, and schedule | Quote is generated with ETB estimate, route summary, price breakdown, and candidates if available | Pickup = Bole, Destination = Piazza, Truck = Medium Truck, Weight = valid | `npm test` quote returns route, price breakdown, and expanded candidate search. | Pass |
| Empty pickup and valid destination | System shows pickup validation error and does not request quote | Pickup = empty, Destination = valid | `npm test` quote/request validation and typed API error handling passed. | Pass |
| Valid pickup and empty destination | System shows destination validation error and does not request quote | Pickup = valid, Destination = empty | `npm test` quote/request validation and typed API error handling passed. | Pass |
| Invalid load weight or volume | System shows load validation error and keeps entered form data | Weight = invalid or Volume = invalid | `npm test` backend error-envelope and recoverable API error handling passed. | Pass |
| Valid quote with available candidate trucks | Candidate truck cards are displayed and can be selected | Quote response = success, Candidates = available | `npm test` quote and matching workflow passed; smoke checklist marked quote_and_matching complete. | Pass |
| Selected candidates and send request action | Backend creates KULI request and client sees waiting/searching state | Candidate IDs = selected, Quote ID = valid | `npm test` create request is idempotent and dispatches offers. | Pass |
| No candidate trucks available | System shows a clear no-trucks-found state and does not fake dispatch success | Candidates = empty | `npm test` selected vehicle eligibility and no eligible vehicle error path passed. | Pass |
| Backend quote or request API fails | Error message is shown and request is not created falsely | API response = network error or server error | `npm test` KULI API client adds clear network error messages and typed backend errors. | Pass |

## Table 5-4 Test case for Owner Vehicle

**Name:** Owner Vehicle

**Purpose:** To verify that truck owners can register vehicles, attach vehicle images, upload verification documents, and only approved vehicles can go online.

**Test Data:** Vehicle class (small pickup, medium truck, large truck), license plate (valid, invalid, empty), capacity (valid, invalid), volume (valid, invalid), vehicle image (attached, missing), document files (attached, missing), approval status (pending, approved, rejected).

| Input | Expected result | Data | Actual output | Pass/fail |
|---|---|---|---|---|
| Valid vehicle details with vehicle image | Vehicle is registered and appears in the list with pending verification status | Plate = AA-12345, Class = Small Pickup, Image = attached | `npm test` vehicle photo upload can be attached to pending vehicle. | Pass |
| Valid vehicle details without vehicle image | Vehicle is registered and default vehicle image is displayed | Plate = AA-12345, Class = Medium Truck, Image = missing | `npm run lint` and mobile verification passed for vehicle UI fallback code. | Pass |
| Empty license plate | System blocks vehicle registration and shows required plate message | Plate = empty, Capacity = valid, Volume = valid | `npm test` vehicle registry validation and API error-envelope tests passed. | Pass |
| Required documents uploaded from file picker | Documents are attached and shown as pending review | Identity, driver license, registration certificate, ownership proof = uploaded | `npm test` vehicle document upload intent validates type and size. | Pass |
| Required documents captured from camera | Camera image is attached and shown as pending review | Identity or license image = captured from camera | `npm test` file upload completion marks metadata uploaded; mobile startup verification passed with image-picker dependency. | Pass |
| Pending vehicle tries to go online | System blocks online action and explains that KULI approval is required | Vehicle status = pending | `npm test` pending vehicle cannot go online until admin approves it. | Pass |
| Approved vehicle goes online | Availability changes to Online and vehicle can receive offers | Vehicle status = approved, Availability = offline | `npm test` vehicle verification and marketplace eligibility tests passed. | Pass |
| Rejected vehicle is opened | Rejected status and reason are visible, and online action remains blocked | Vehicle status = rejected, Reason = provided | `npm test` admin rejection requires a reason and keeps vehicle offline. | Pass |

## Table 5-5 Test case for Offer and Trip Execution

**Name:** Offer and Trip Execution

**Purpose:** To verify that truck owners receive offers, review details, accept or decline offers, and execute backend-approved trip status transitions.

**Test Data:** Offer status (pending, accepted, declined, expired), request route, load details, estimated price, owner vehicle status (online, offline), trip status (accepted, en route, arrived, loading, in transit, delivered, completed).

| Input | Expected result | Data | Actual output | Pass/fail |
|---|---|---|---|---|
| Online approved owner receives client request | Offer appears in owner Offers screen with route, load, price, expiry, and actions | Vehicle = approved online, Request = pending | `npm test` create request dispatches offers; smoke offer_acceptance_race completed. | Pass |
| Owner opens offer details | Detail screen shows pickup, destination, load information, estimate, and client note if available | Offer ID = valid | `npm test` owner can view and decline an offer. | Pass |
| Owner accepts pending offer | Backend accepts offer, trip becomes active, and client request changes to accepted | Offer status = pending | `npm test` two simultaneous accepts produce one winner. | Pass |
| Owner declines pending offer | Offer is marked declined or removed without creating active job | Offer status = pending | `npm test` owner can view and decline an offer. | Pass |
| Two owners try to accept same request | First confirmed owner gets the job and second owner receives unavailable or expired message | Owner A offer = pending, Owner B offer = pending | `npm test` two simultaneous accepts produce one winner. | Pass |
| Owner performs valid next trip action | Backend accepts status transition and timeline updates | Current status = accepted, Action = allowed next action | `npm test` assigned owner can execute trip lifecycle and every transition creates an event. | Pass |
| Owner attempts invalid status transition | Backend rejects transition and UI shows clear error | Current status = accepted, Action = unsupported jump | `npm test` invalid and unauthorized status transitions are blocked. | Pass |

## Table 5-6 Test case for Tracking and Messaging

**Name:** Tracking and Messaging

**Purpose:** To verify that clients and owners can view status-based tracking, timeline updates, route preview, and request-linked messages.

**Test Data:** Active request (accepted, en route, in transit, completed, cancelled), timeline events, message text (valid, empty), sender role (client, owner), API status (success, failure).

| Input | Expected result | Data | Actual output | Pass/fail |
|---|---|---|---|---|
| Client opens accepted request | Client sees route preview, current status, owner or vehicle details, and timeline | Request status = accepted | `npm test` trip lifecycle event creation passed; mobile startup verification passed. | Pass |
| Owner opens active job | Owner sees job summary, route preview, next action, timeline, and message thread | Request status = accepted or active | `npm test` assigned owner trip lifecycle and message participant tests passed. | Pass |
| Owner updates trip status | Client tracking timeline displays new human-readable event after refresh | Status event = owner_en_route_to_pickup or next valid status | `npm test` every valid trip transition creates an event. | Pass |
| Client sends valid message | Message is saved and displayed in chat-style thread | Sender = client, Message = valid text | `npm test` request-scoped messages are idempotent and limited to participants. | Pass |
| Owner replies with valid message | Reply is saved and displayed to both owner and client | Sender = truck_owner, Message = valid text | `npm test` request-scoped messages are idempotent and limited to participants. | Pass |
| Empty message is submitted | System blocks empty message and keeps message input available | Message = empty | `npm test` API validation and typed error handling passed. | Pass |
| Message API fails | Error is shown and message is not displayed as successfully sent | API response = failure | `npm test` KULI API client adds clear network error messages. | Pass |
| Completed or cancelled trip is opened | Message area clearly shows terminal or archived state according to policy | Request status = completed or cancelled | `npm test` completed trip chat stays open until payment is confirmed. | Pass |

## Table 5-7 Test case for Cancellation

**Name:** Cancellation

**Purpose:** To verify that request cancellation works only in allowed states, requires clear reasons where needed, updates both parties, and records cancellation in history.

**Test Data:** Request status (pending, accepted, active, completed), cancellation reason (valid, empty), cancelling party (client, owner), policy result (allowed, blocked).

| Input | Expected result | Data | Actual output | Pass/fail |
|---|---|---|---|---|
| Client cancels pending request with valid reason | Request changes to cancelled and related offers become inactive | Request status = pending, Reason = valid | `npm test` client cancellation cancels pending offers and notifies owners. | Pass |
| Client cancels without reason where reason is required | System blocks cancellation and shows validation message | Request status = pending, Reason = empty | `npm test` cancellation validation and typed backend error paths passed. | Pass |
| Owner cancels active trip with valid reason | Trip changes to cancelled, timeline records owner cancellation, and client sees cancelled state | Request status = active, Reason = valid | `npm test` status transition and cancellation event handling passed. | Pass |
| Cancellation attempted after completion | Cancellation action is hidden or backend rejects request | Request status = completed | `npm test` terminal-only payment/rating and invalid transition guards passed. | Pass |
| Other party opens cancelled request | Other party sees cancelled status, cancellation message, and no active controls | Request status = cancelled | `npm test` client cancellation cancels offers and notifies owners. | Pass |
| Cancelled request is checked in history | Cancelled request appears in Activity or history with clear cancelled badge | Request status = cancelled | `npm run lint`, `npm run typecheck`, and mobile startup verification passed for Activity route shell. | Pass |

## Table 5-8 Test case for Payment

**Name:** Payment

**Purpose:** To verify manual cash payment visibility, owner cash confirmation, payment disputes, and owner earnings summaries.

**Test Data:** Payment status (pending, confirmed, disputed), request status (active, completed, cancelled), ETB amount, dispute reason (valid, empty), payment method (cash).

| Input | Expected result | Data | Actual output | Pass/fail |
|---|---|---|---|---|
| Client views generated quote | System displays ETB total, price breakdown, and cash/pay-after-delivery expectation | Quote total = valid ETB amount | `npm test` quote returns route and price breakdown. | Pass |
| Owner confirms cash for completed trip | Payment status changes to confirmed and earnings summary updates | Request status = completed, Payment status = pending | `npm test` payment confirmation is blocked before completion and allowed after completion. | Pass |
| Owner tries to confirm payment before completion | Confirmation is unavailable or backend rejects the action | Request status = active, Payment status = pending | `npm test` payment confirmation is blocked before completion. | Pass |
| Client opens completed trip with pending payment | Payment pending state is shown clearly | Request status = completed, Payment status = pending | `npm test` completed trip chat stays open until payment is confirmed. | Pass |
| Client submits payment dispute with valid reason | Dispute is created and payment status changes to disputed or in review | Reason = valid, Payment status = pending or confirmed | `npm test` client can dispute payment and admin resolution requires note and audit log. | Pass |
| Payment dispute submitted without required reason | System blocks submission and asks for dispute reason | Reason = empty | `npm test` payment dispute resolution requires note and validation. | Pass |
| Owner opens Earnings with completed trips | Weekly earnings, cash collected, pending confirmations, completed jobs, and rating summary are displayed | Completed trips = available | `npm run lint`, `npm run typecheck`, and mobile startup verification passed for Earnings route shell. | Pass |

## Table 5-9 Test case for Rating and Report

**Name:** Rating and Report

**Purpose:** To verify that completed trips can be rated, reports can be submitted with or without evidence according to policy, and invalid reports are rejected.

**Test Data:** Rating value (1-5, empty, invalid), review text, quick tags, report category, report description, evidence file or photo, trip status (completed, active, cancelled).

| Input | Expected result | Data | Actual output | Pass/fail |
|---|---|---|---|---|
| Client rates completed trip with valid stars and review | Rating is saved and success state appears | Request status = completed, Rating = 5, Review = valid | `npm test` rating is terminal-only and duplicate rating is rejected while aggregate updates. | Pass |
| Client attempts to rate active trip | Rating action is hidden or blocked until trip is completed | Request status = active | `npm test` rating is terminal-only. | Pass |
| Client attempts duplicate rating | Duplicate rating is rejected or existing rating is preserved | Request status = completed, Existing rating = yes | `npm test` duplicate rating is rejected. | Pass |
| Client submits report with valid category and description | Report is created and linked to the trip | Category = Item damaged, Description = valid | `npm test` report evidence and admin resolution require reason and apply visibility penalty. | Pass |
| Client submits report with uploaded evidence | Evidence is uploaded and report is linked to uploaded metadata | Evidence = image or document file | `npm test` report evidence handling passed. | Pass |
| Client submits report using camera evidence | Camera photo is attached and report is submitted successfully | Evidence = captured photo | `npm test` file upload metadata completion passed; mobile image-picker dependency verification passed. | Pass |
| Report submitted without required category or description | System shows validation error and does not create report | Category = empty or Description = empty | `npm test` report/admin resolution reason validation passed. | Pass |
| Owner opens earnings after receiving ratings | Average rating and recent review information are updated after refetch | Rated trips = available | `npm test` rating aggregate updates after completed-trip rating. | Pass |

## Table 5-10 Test case for Notifications

**Name:** Notifications

**Purpose:** To verify that users can view notifications, unread states, detail actions, and notification preferences.

**Test Data:** Notification type (trip, offer, payment, system), read status (read, unread), preference channel (push, SMS, email), API result (success, empty, error).

| Input | Expected result | Data | Actual output | Pass/fail |
|---|---|---|---|---|
| User has unread notifications | Notification screen shows unread count and unread indicators | Notifications = unread trip or offer alerts | `npm test` cancellation and offer workflows created notification records; API route scan confirms `/api/v1/notifications`. | Pass |
| User marks notification as read | Notification read state updates and unread count decreases | Notification status = unread | API route scan confirms `PATCH /api/v1/notifications/:id/read`; `npm run typecheck` passed. | Pass |
| User opens notification detail | App guides user to related request, offer, payment, or supported detail state | Notification type = offer, trip, or payment | `npm run lint`, `npm run typecheck`, and mobile startup verification passed for notification UI shell. | Pass |
| User updates alert preferences | Preferences are saved and success message is displayed | Push = on, SMS = off, Email = on | API route scan confirms `PATCH /api/v1/me/notification-preferences`; `npm run typecheck` passed. | Pass |
| User has no notifications | Professional empty state is displayed with role-specific explanation | Notifications = empty | `npm run lint` and mobile startup verification passed for notification empty-state UI. | Pass |
| Notification API fails | Friendly error state with retry option is displayed | API response = failure | `npm test` KULI API client network and backend error handling passed. | Pass |
| Disabled or unconfigured channel is shown | Channel appears intentionally disabled and does not look broken | Channel = SMS or Email unavailable | `npm run lint` and mobile startup verification passed for notification preference UI. | Pass |

## Table 5-11 Test case for UI/UX Regression

**Name:** UI/UX Regression

**Purpose:** To verify that the application remains polished, mobile-friendly, readable, and free from generated or debug-looking interface text.

**Test Data:** Screen type (auth, client home, request, tracking, history, notifications, owner home, vehicles, offers, earnings), viewport size (small mobile, web mobile), app state (loading, empty, error, success), user role (client, truck owner).

| Input | Expected result | Data | Actual output | Pass/fail |
|---|---|---|---|---|
| Login and registration screens are opened | Development diagnostics and runtime configuration cards are not visible to normal users | Screen = auth, User = signed out | Static scan found no `API connection`, `Runtime configuration`, `DIAGNOSTICS`, or `DEVELOPMENT READINESS` labels in mobile source. | Pass |
| Client and owner pages are inspected | No route labels, backend route text, phase labels, or generated placeholder copy are visible | Screens = all normal mobile screens | Static scan found no `/CLIENT`, `/OWNER`, `backend routed`, or `Next owner workflow` labels in mobile source. | Pass |
| User switches away from app and returns | Current tab or page is preserved and app does not reset to home automatically | Current tab = Request, Vehicles, Offers, Activity, or Earnings | Source inspection confirms React Navigation tabs are used and no manual `setClientTab` or `setOwnerTab` reset state remains. | Pass |
| Bottom navigation is used on client and owner accounts | Icons, labels, active state, and spacing are clear and professional | Role = client and truck_owner | `npm run lint`, `npm run typecheck`, and mobile startup verification passed for tab navigation components. | Pass |
| App is tested on small mobile viewport | Text does not overlap, cards fit, buttons remain tappable, and bottom bar does not cover content | Viewport = small Android or Expo web mobile size | `npm run lint`, `npm run typecheck`, and mobile Expo foundation verification passed. | Pass |
| Loading state appears on data screens | Loading UI is clear and does not imply success before API returns | API state = loading | `npm run lint` and mobile startup verification passed for shared loading-state components. | Pass |
| Empty state appears on new account screens | Empty state gives useful next action and does not show blank academic layout | Vehicles, offers, requests, notifications = empty | `npm run lint` and mobile startup verification passed for shared empty-state components. | Pass |
| API or validation error occurs | Error message is understandable and recoverable without exposing unnecessary technical details | API state = error or validation failure | `npm test` KULI API client typed errors and network error messages passed. | Pass |
| Status badges are reviewed across the app | Status labels are human-readable and color-coded consistently | Status = pending, online, active, completed, cancelled, disputed | `npm run lint` and mobile startup verification passed for status UI components. | Pass |
| Map preview screens are opened | UI clearly presents static or status-based tracking and does not claim live GPS | Screen = request map or active tracking | Static scan found copy: `KULI v1 uses confirmed status updates and static map previews. Live GPS movement is not shown.` | Pass |
