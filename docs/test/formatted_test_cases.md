# 5. Test cases with specifications

A test case is a set of input data and expected results that exercises a component with the purpose of causing failures and detecting faults. The following test cases are prepared for the KULI P2P logistics mobile application and related backend services.

## Table 5-1 Test case for Authentication

**Name:** Authentication

**Purpose:** To verify that users can register, log in, recover accounts, keep valid sessions, and receive clear authentication errors.

**Test Data:** Email address (valid, invalid, empty), password (valid, invalid, empty), full name (valid, invalid, empty), phone number (valid, invalid, empty), confirmation state (confirmed, unconfirmed), Supabase session (valid, expired, missing).

| Input | Expected result | Data | Actual output | Pass/fail |
|---|---|---|---|---|
| Valid confirmed client email and valid password | Client logs in successfully and opens the client workspace | Email = confirmed client email, Password = valid password | Not executed yet | Not run |
| Valid confirmed truck owner email and valid password | Truck owner logs in successfully and opens the owner workspace | Email = confirmed owner email, Password = valid password | Not executed yet | Not run |
| Valid email and wrong password | System rejects login and shows a clear invalid credentials message | Email = registered email, Password = wrong password | Not executed yet | Not run |
| Empty email or empty password | System blocks submission and asks the user to complete required fields | Email = empty or Password = empty | Not executed yet | Not run |
| New client registration with valid data | Client account is created or email confirmation instruction is shown according to Supabase setting | Name = valid, Email = new valid email, Phone = valid, Password = valid | Not executed yet | Not run |
| New truck owner registration with valid data | Truck owner account is created or email confirmation instruction is shown according to Supabase setting | Name = valid, Email = new valid email, Phone = valid, Password = valid | Not executed yet | Not run |
| Confirmed user logs in repeatedly | Verification screen is not shown again and user routes normally | Confirmed email, valid password, existing backend profile | Not executed yet | Not run |
| Forgot password with registered email | Password reset email request is sent and success message is displayed | Email = registered email | Not executed yet | Not run |

## Table 5-2 Test case for Role Routing

**Name:** Role Routing

**Purpose:** To verify that authenticated users are routed to the correct workspace based on the backend `/me` profile and that unsupported mobile roles are blocked.

**Test Data:** User role (client, truck owner, admin, assistant, missing profile, suspended), Supabase token (valid, invalid), backend profile status (active, blocked, missing).

| Input | Expected result | Data | Actual output | Pass/fail |
|---|---|---|---|---|
| Active client account | Client workspace is displayed with Home, Request, Activity, and Notifications tabs | Role = client, Status = active | Not executed yet | Not run |
| Active truck owner account | Owner workspace is displayed with Home, Vehicles, Offers, Notifications, and Earnings tabs | Role = truck_owner, Status = active | Not executed yet | Not run |
| Admin account attempts mobile login | Mobile marketplace screens are blocked and user is directed to the web dashboard | Role = admin, Status = active | Not executed yet | Not run |
| Assistant account attempts mobile login | Mobile marketplace screens are blocked and user is directed to the web dashboard | Role = assistant, Status = active | Not executed yet | Not run |
| Valid Supabase session but missing backend profile | System shows account/profile error and does not route to the wrong role | Token = valid, Backend profile = missing | Not executed yet | Not run |
| Suspended or blocked account | User is prevented from using app features and sees a clear blocked account message | Role = client or truck_owner, Status = suspended | Not executed yet | Not run |
| User leaves app on non-home tab and returns | App remains on the same tab and does not reset to the default home tab | Current tab = Request, Offers, Vehicles, Activity, or Earnings | Not executed yet | Not run |

## Table 5-3 Test case for Client Request

**Name:** Client Request

**Purpose:** To verify that clients can create delivery requests through route selection, truck selection, quote generation, candidate selection, and dispatch.

**Test Data:** Pickup location (valid, empty), destination (valid, empty), load details (valid, invalid), truck class (small pickup, medium truck, large truck), schedule (now, future), candidate vehicles (available, unavailable), quote response (success, error).

| Input | Expected result | Data | Actual output | Pass/fail |
|---|---|---|---|---|
| Valid pickup, destination, load, truck type, and schedule | Quote is generated with ETB estimate, route summary, price breakdown, and candidates if available | Pickup = Bole, Destination = Piazza, Truck = Medium Truck, Weight = valid | Not executed yet | Not run |
| Empty pickup and valid destination | System shows pickup validation error and does not request quote | Pickup = empty, Destination = valid | Not executed yet | Not run |
| Valid pickup and empty destination | System shows destination validation error and does not request quote | Pickup = valid, Destination = empty | Not executed yet | Not run |
| Invalid load weight or volume | System shows load validation error and keeps entered form data | Weight = invalid or Volume = invalid | Not executed yet | Not run |
| Valid quote with available candidate trucks | Candidate truck cards are displayed and can be selected | Quote response = success, Candidates = available | Not executed yet | Not run |
| Selected candidates and send request action | Backend creates KULI request and client sees waiting/searching state | Candidate IDs = selected, Quote ID = valid | Not executed yet | Not run |
| No candidate trucks available | System shows a clear no-trucks-found state and does not fake dispatch success | Candidates = empty | Not executed yet | Not run |
| Backend quote or request API fails | Error message is shown and request is not created falsely | API response = network error or server error | Not executed yet | Not run |

## Table 5-4 Test case for Owner Vehicle

**Name:** Owner Vehicle

**Purpose:** To verify that truck owners can register vehicles, attach vehicle images, upload verification documents, and only approved vehicles can go online.

**Test Data:** Vehicle class (small pickup, medium truck, large truck), license plate (valid, invalid, empty), capacity (valid, invalid), volume (valid, invalid), vehicle image (attached, missing), document files (attached, missing), approval status (pending, approved, rejected).

| Input | Expected result | Data | Actual output | Pass/fail |
|---|---|---|---|---|
| Valid vehicle details with vehicle image | Vehicle is registered and appears in the list with pending verification status | Plate = AA-12345, Class = Small Pickup, Image = attached | Not executed yet | Not run |
| Valid vehicle details without vehicle image | Vehicle is registered and default vehicle image is displayed | Plate = AA-12345, Class = Medium Truck, Image = missing | Not executed yet | Not run |
| Empty license plate | System blocks vehicle registration and shows required plate message | Plate = empty, Capacity = valid, Volume = valid | Not executed yet | Not run |
| Required documents uploaded from file picker | Documents are attached and shown as pending review | Identity, driver license, registration certificate, ownership proof = uploaded | Not executed yet | Not run |
| Required documents captured from camera | Camera image is attached and shown as pending review | Identity or license image = captured from camera | Not executed yet | Not run |
| Pending vehicle tries to go online | System blocks online action and explains that KULI approval is required | Vehicle status = pending | Not executed yet | Not run |
| Approved vehicle goes online | Availability changes to Online and vehicle can receive offers | Vehicle status = approved, Availability = offline | Not executed yet | Not run |
| Rejected vehicle is opened | Rejected status and reason are visible, and online action remains blocked | Vehicle status = rejected, Reason = provided | Not executed yet | Not run |

## Table 5-5 Test case for Offer and Trip Execution

**Name:** Offer and Trip Execution

**Purpose:** To verify that truck owners receive offers, review details, accept or decline offers, and execute backend-approved trip status transitions.

**Test Data:** Offer status (pending, accepted, declined, expired), request route, load details, estimated price, owner vehicle status (online, offline), trip status (accepted, en route, arrived, loading, in transit, delivered, completed).

| Input | Expected result | Data | Actual output | Pass/fail |
|---|---|---|---|---|
| Online approved owner receives client request | Offer appears in owner Offers screen with route, load, price, expiry, and actions | Vehicle = approved online, Request = pending | Not executed yet | Not run |
| Owner opens offer details | Detail screen shows pickup, destination, load information, estimate, and client note if available | Offer ID = valid | Not executed yet | Not run |
| Owner accepts pending offer | Backend accepts offer, trip becomes active, and client request changes to accepted | Offer status = pending | Not executed yet | Not run |
| Owner declines pending offer | Offer is marked declined or removed without creating active job | Offer status = pending | Not executed yet | Not run |
| Two owners try to accept same request | First confirmed owner gets the job and second owner receives unavailable or expired message | Owner A offer = pending, Owner B offer = pending | Not executed yet | Not run |
| Owner performs valid next trip action | Backend accepts status transition and timeline updates | Current status = accepted, Action = allowed next action | Not executed yet | Not run |
| Owner attempts invalid status transition | Backend rejects transition and UI shows clear error | Current status = accepted, Action = unsupported jump | Not executed yet | Not run |

## Table 5-6 Test case for Tracking and Messaging

**Name:** Tracking and Messaging

**Purpose:** To verify that clients and owners can view status-based tracking, timeline updates, route preview, and request-linked messages.

**Test Data:** Active request (accepted, en route, in transit, completed, cancelled), timeline events, message text (valid, empty), sender role (client, owner), API status (success, failure).

| Input | Expected result | Data | Actual output | Pass/fail |
|---|---|---|---|---|
| Client opens accepted request | Client sees route preview, current status, owner or vehicle details, and timeline | Request status = accepted | Not executed yet | Not run |
| Owner opens active job | Owner sees job summary, route preview, next action, timeline, and message thread | Request status = accepted or active | Not executed yet | Not run |
| Owner updates trip status | Client tracking timeline displays new human-readable event after refresh | Status event = owner_en_route_to_pickup or next valid status | Not executed yet | Not run |
| Client sends valid message | Message is saved and displayed in chat-style thread | Sender = client, Message = valid text | Not executed yet | Not run |
| Owner replies with valid message | Reply is saved and displayed to both owner and client | Sender = truck_owner, Message = valid text | Not executed yet | Not run |
| Empty message is submitted | System blocks empty message and keeps message input available | Message = empty | Not executed yet | Not run |
| Message API fails | Error is shown and message is not displayed as successfully sent | API response = failure | Not executed yet | Not run |
| Completed or cancelled trip is opened | Message area clearly shows terminal or archived state according to policy | Request status = completed or cancelled | Not executed yet | Not run |

## Table 5-7 Test case for Cancellation

**Name:** Cancellation

**Purpose:** To verify that request cancellation works only in allowed states, requires clear reasons where needed, updates both parties, and records cancellation in history.

**Test Data:** Request status (pending, accepted, active, completed), cancellation reason (valid, empty), cancelling party (client, owner), policy result (allowed, blocked).

| Input | Expected result | Data | Actual output | Pass/fail |
|---|---|---|---|---|
| Client cancels pending request with valid reason | Request changes to cancelled and related offers become inactive | Request status = pending, Reason = valid | Not executed yet | Not run |
| Client cancels without reason where reason is required | System blocks cancellation and shows validation message | Request status = pending, Reason = empty | Not executed yet | Not run |
| Owner cancels active trip with valid reason | Trip changes to cancelled, timeline records owner cancellation, and client sees cancelled state | Request status = active, Reason = valid | Not executed yet | Not run |
| Cancellation attempted after completion | Cancellation action is hidden or backend rejects request | Request status = completed | Not executed yet | Not run |
| Other party opens cancelled request | Other party sees cancelled status, cancellation message, and no active controls | Request status = cancelled | Not executed yet | Not run |
| Cancelled request is checked in history | Cancelled request appears in Activity or history with clear cancelled badge | Request status = cancelled | Not executed yet | Not run |

## Table 5-8 Test case for Payment

**Name:** Payment

**Purpose:** To verify manual cash payment visibility, owner cash confirmation, payment disputes, and owner earnings summaries.

**Test Data:** Payment status (pending, confirmed, disputed), request status (active, completed, cancelled), ETB amount, dispute reason (valid, empty), payment method (cash).

| Input | Expected result | Data | Actual output | Pass/fail |
|---|---|---|---|---|
| Client views generated quote | System displays ETB total, price breakdown, and cash/pay-after-delivery expectation | Quote total = valid ETB amount | Not executed yet | Not run |
| Owner confirms cash for completed trip | Payment status changes to confirmed and earnings summary updates | Request status = completed, Payment status = pending | Not executed yet | Not run |
| Owner tries to confirm payment before completion | Confirmation is unavailable or backend rejects the action | Request status = active, Payment status = pending | Not executed yet | Not run |
| Client opens completed trip with pending payment | Payment pending state is shown clearly | Request status = completed, Payment status = pending | Not executed yet | Not run |
| Client submits payment dispute with valid reason | Dispute is created and payment status changes to disputed or in review | Reason = valid, Payment status = pending or confirmed | Not executed yet | Not run |
| Payment dispute submitted without required reason | System blocks submission and asks for dispute reason | Reason = empty | Not executed yet | Not run |
| Owner opens Earnings with completed trips | Weekly earnings, cash collected, pending confirmations, completed jobs, and rating summary are displayed | Completed trips = available | Not executed yet | Not run |

## Table 5-9 Test case for Rating and Report

**Name:** Rating and Report

**Purpose:** To verify that completed trips can be rated, reports can be submitted with or without evidence according to policy, and invalid reports are rejected.

**Test Data:** Rating value (1-5, empty, invalid), review text, quick tags, report category, report description, evidence file or photo, trip status (completed, active, cancelled).

| Input | Expected result | Data | Actual output | Pass/fail |
|---|---|---|---|---|
| Client rates completed trip with valid stars and review | Rating is saved and success state appears | Request status = completed, Rating = 5, Review = valid | Not executed yet | Not run |
| Client attempts to rate active trip | Rating action is hidden or blocked until trip is completed | Request status = active | Not executed yet | Not run |
| Client attempts duplicate rating | Duplicate rating is rejected or existing rating is preserved | Request status = completed, Existing rating = yes | Not executed yet | Not run |
| Client submits report with valid category and description | Report is created and linked to the trip | Category = Item damaged, Description = valid | Not executed yet | Not run |
| Client submits report with uploaded evidence | Evidence is uploaded and report is linked to uploaded metadata | Evidence = image or document file | Not executed yet | Not run |
| Client submits report using camera evidence | Camera photo is attached and report is submitted successfully | Evidence = captured photo | Not executed yet | Not run |
| Report submitted without required category or description | System shows validation error and does not create report | Category = empty or Description = empty | Not executed yet | Not run |
| Owner opens earnings after receiving ratings | Average rating and recent review information are updated after refetch | Rated trips = available | Not executed yet | Not run |

## Table 5-10 Test case for Notifications

**Name:** Notifications

**Purpose:** To verify that users can view notifications, unread states, detail actions, and notification preferences.

**Test Data:** Notification type (trip, offer, payment, system), read status (read, unread), preference channel (push, SMS, email), API result (success, empty, error).

| Input | Expected result | Data | Actual output | Pass/fail |
|---|---|---|---|---|
| User has unread notifications | Notification screen shows unread count and unread indicators | Notifications = unread trip or offer alerts | Not executed yet | Not run |
| User marks notification as read | Notification read state updates and unread count decreases | Notification status = unread | Not executed yet | Not run |
| User opens notification detail | App guides user to related request, offer, payment, or supported detail state | Notification type = offer, trip, or payment | Not executed yet | Not run |
| User updates alert preferences | Preferences are saved and success message is displayed | Push = on, SMS = off, Email = on | Not executed yet | Not run |
| User has no notifications | Professional empty state is displayed with role-specific explanation | Notifications = empty | Not executed yet | Not run |
| Notification API fails | Friendly error state with retry option is displayed | API response = failure | Not executed yet | Not run |
| Disabled or unconfigured channel is shown | Channel appears intentionally disabled and does not look broken | Channel = SMS or Email unavailable | Not executed yet | Not run |

## Table 5-11 Test case for UI/UX Regression

**Name:** UI/UX Regression

**Purpose:** To verify that the application remains polished, mobile-friendly, readable, and free from generated or debug-looking interface text.

**Test Data:** Screen type (auth, client home, request, tracking, history, notifications, owner home, vehicles, offers, earnings), viewport size (small mobile, web mobile), app state (loading, empty, error, success), user role (client, truck owner).

| Input | Expected result | Data | Actual output | Pass/fail |
|---|---|---|---|---|
| Login and registration screens are opened | Development diagnostics and runtime configuration cards are not visible to normal users | Screen = auth, User = signed out | Not executed yet | Not run |
| Client and owner pages are inspected | No route labels, backend route text, phase labels, or generated placeholder copy are visible | Screens = all normal mobile screens | Not executed yet | Not run |
| User switches away from app and returns | Current tab or page is preserved and app does not reset to home automatically | Current tab = Request, Vehicles, Offers, Activity, or Earnings | Not executed yet | Not run |
| Bottom navigation is used on client and owner accounts | Icons, labels, active state, and spacing are clear and professional | Role = client and truck_owner | Not executed yet | Not run |
| App is tested on small mobile viewport | Text does not overlap, cards fit, buttons remain tappable, and bottom bar does not cover content | Viewport = small Android or Expo web mobile size | Not executed yet | Not run |
| Loading state appears on data screens | Loading UI is clear and does not imply success before API returns | API state = loading | Not executed yet | Not run |
| Empty state appears on new account screens | Empty state gives useful next action and does not show blank academic layout | Vehicles, offers, requests, notifications = empty | Not executed yet | Not run |
| API or validation error occurs | Error message is understandable and recoverable without exposing unnecessary technical details | API state = error or validation failure | Not executed yet | Not run |
| Status badges are reviewed across the app | Status labels are human-readable and color-coded consistently | Status = pending, online, active, completed, cancelled, disputed | Not executed yet | Not run |
| Map preview screens are opened | UI clearly presents static or status-based tracking and does not claim live GPS | Screen = request map or active tracking | Not executed yet | Not run |
