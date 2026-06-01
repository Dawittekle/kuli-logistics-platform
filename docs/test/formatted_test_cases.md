# KULI Formatted Test Cases

Project: **KULI: P2P Logistics Mobile Application On Demand Trucking Service**

Use `Pass`, `Fail`, or `Not Run` for the Status column during execution. Until a case is executed, keep Actual Result as `Not run yet`.

## Table 5-1 Test case for Authentication

| Test Case ID | Test Scenario | Preconditions | Test Data | Test Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|
| TC-AUTH-01 | Login with valid client credentials | API, MongoDB, and Supabase are running; confirmed client account exists. | Client email and password | 1. Open the mobile app.<br>2. Enter valid email and password.<br>3. Tap Login. | Client is authenticated, backend `/me` is fetched, and client tabs are shown. | Not run yet | Not Run |
| TC-AUTH-02 | Login with valid truck owner credentials | API, MongoDB, and Supabase are running; confirmed truck owner account exists. | Truck owner email and password | 1. Open the mobile app.<br>2. Enter valid owner email and password.<br>3. Tap Login. | Truck owner is authenticated, backend `/me` is fetched, and owner tabs are shown. | Not run yet | Not Run |
| TC-AUTH-03 | Login with invalid password | User account exists. | Existing email and wrong password | 1. Open Login.<br>2. Enter existing email and wrong password.<br>3. Tap Login. | Login fails and a clear error message is shown without navigating. | Not run yet | Not Run |
| TC-AUTH-04 | Register as client | Supabase signup is enabled. | Full name, email, phone, password | 1. Open Register.<br>2. Select Request trucks.<br>3. Fill form.<br>4. Tap Create account.<br>5. Confirm email if required. | Client account is created and routes to client tabs after confirmation/profile sync. | Not run yet | Not Run |
| TC-AUTH-05 | Register as truck owner | Supabase signup is enabled. | Full name, email, phone, password | 1. Open Register.<br>2. Select Earn with your truck.<br>3. Fill form.<br>4. Tap Create account.<br>5. Confirm email if required. | Truck owner account is created and routes to owner tabs after confirmation/profile sync. | Not run yet | Not Run |
| TC-AUTH-06 | Email verification prompt only when required | One confirmed account and one unconfirmed account exist. | Confirmed and unconfirmed credentials | 1. Login with confirmed user.<br>2. Logout.<br>3. Login with unconfirmed user. | Confirmed user is not asked to verify; unconfirmed user sees verification screen only when Supabase requires it. | Not run yet | Not Run |
| TC-AUTH-07 | Manual resend verification cooldown | User is on verification screen. | Unconfirmed email | 1. Tap Resend email.<br>2. Immediately try again. | Verification email is sent only manually; resend button shows cooldown and prevents repeated sending. | Not run yet | Not Run |
| TC-AUTH-08 | Forgot password | Supabase email provider is configured. | Existing email | 1. Open Forgot password.<br>2. Enter email.<br>3. Tap Send reset email. | Password reset email is requested and success message appears. | Not run yet | Not Run |
| TC-AUTH-09 | Session persistence after restart | User is logged in with valid session. | Existing client or owner session | 1. Login.<br>2. Close/reload app.<br>3. Open app again. | Existing session is read, `/me` is fetched, and user routes to correct tabs without login. | Not run yet | Not Run |

## Table 5-2 Test case for Role Routing

| Test Case ID | Test Scenario | Preconditions | Test Data | Test Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|
| TC-ROLE-01 | Client routes to client workspace | Client profile exists in backend. | Client credentials | 1. Login as client. | App shows Home, Request, Activity, and Notifications tabs. | Not run yet | Not Run |
| TC-ROLE-02 | Truck owner routes to owner workspace | Truck owner profile exists in backend. | Owner credentials | 1. Login as truck owner. | App shows Home, Vehicles, Offers, Notifications, and Earnings tabs. | Not run yet | Not Run |
| TC-ROLE-03 | Admin blocked from mobile | Admin account exists. | Admin credentials | 1. Login on mobile as admin. | Forbidden screen appears and mobile marketplace tabs are not shown. | Not run yet | Not Run |
| TC-ROLE-04 | Assistant blocked from mobile | Assistant account exists. | Assistant credentials | 1. Login on mobile as assistant. | Forbidden screen appears and mobile marketplace tabs are not shown. | Not run yet | Not Run |
| TC-ROLE-05 | Suspended account blocked | User account is suspended/banned/deleted. | Blocked user credentials | 1. Login as blocked user. | Account blocked screen appears and app actions are unavailable. | Not run yet | Not Run |
| TC-ROLE-06 | Missing profile prompts profile completion | Supabase session exists but backend profile is missing. | Authenticated Supabase user without KULI profile | 1. Start app with session.<br>2. Observe routing. | Profile required screen appears; user can complete allowed public profile only. | Not run yet | Not Run |

## Table 5-3 Test case for Client Request

| Test Case ID | Test Scenario | Preconditions | Test Data | Test Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|
| TC-REQ-01 | Generate quote with valid request | Client is logged in; vehicle classes exist. | Pickup Bole, destination Piazza, load details, truck class | 1. Open Request.<br>2. Select route.<br>3. Enter load details.<br>4. Select truck type.<br>5. Tap Get quote. | Quote displays ETB estimate, distance, ETA, price breakdown, and candidate section. | Not run yet | Not Run |
| TC-REQ-02 | Validate missing pickup or destination | Client is logged in. | Missing pickup or destination | 1. Open Request.<br>2. Leave route incomplete.<br>3. Try to continue. | App shows clear validation error and does not create quote. | Not run yet | Not Run |
| TC-REQ-03 | Validate load details | Client is logged in. | Invalid weight or volume | 1. Enter invalid load data.<br>2. Tap Get quote. | App/API shows recoverable validation error and preserves form data. | Not run yet | Not Run |
| TC-REQ-04 | Select truck type | Vehicle classes are loaded. | Small Pickup, Medium Truck, Large Truck | 1. Open truck selection step.<br>2. Tap a truck card. | Selected truck card is visually highlighted and selected class is used in quote. | Not run yet | Not Run |
| TC-REQ-05 | Select candidate trucks | Quote returns candidate vehicles. | Candidate list | 1. Generate quote.<br>2. Select one or more candidate trucks. | Selected candidate state is obvious and request button reflects selection count. | Not run yet | Not Run |
| TC-REQ-06 | Send KULI request | Quote exists and candidates are selected. | Selected candidate IDs | 1. Tap Send KULI request. | Backend creates request/offers and UI shows waiting/searching state. | Not run yet | Not Run |
| TC-REQ-07 | No nearby trucks found | No approved online vehicles match request. | Route/class without candidates | 1. Generate quote. | App shows no-trucks state and suggests trying different route/class/time. | Not run yet | Not Run |
| TC-REQ-08 | Request API failure | API is unavailable or returns server error. | Valid request data | 1. Try quote or dispatch while API fails. | App shows clear error and does not fake request success. | Not run yet | Not Run |

## Table 5-4 Test case for Owner Vehicle

| Test Case ID | Test Scenario | Preconditions | Test Data | Test Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|
| TC-VEH-01 | Register vehicle | Truck owner is logged in; vehicle classes exist. | Plate AA-12345, class, capacity, volume, notes | 1. Open Vehicles.<br>2. Enter vehicle details.<br>3. Submit. | Vehicle is created and appears in vehicle list. | Not run yet | Not Run |
| TC-VEH-02 | Add vehicle photo | Vehicle registration form is open. | Test vehicle image | 1. Pick image from library or camera.<br>2. Submit vehicle/photo. | Vehicle image is attached or default truck image is used when missing. | Not run yet | Not Run |
| TC-VEH-03 | Upload required documents | Vehicle exists. | Identity, license, registration, ownership proof, optional insurance files | 1. Open verification checklist.<br>2. Upload/take photo for each required document.<br>3. Attach documents. | Documents show attached/pending state for admin review. | Not run yet | Not Run |
| TC-VEH-04 | Missing document handling | Vehicle exists with missing documents. | Missing required file | 1. Open verification checklist. | Missing document status is visible and user understands what is required. | Not run yet | Not Run |
| TC-VEH-05 | Pending vehicle cannot go online | Vehicle verification is pending. | Pending vehicle | 1. Select pending vehicle.<br>2. Try Go online. | App blocks online action and explains approval is required. | Not run yet | Not Run |
| TC-VEH-06 | Approved vehicle can go online | Admin has approved vehicle. | Approved vehicle | 1. Select approved vehicle.<br>2. Tap Go online. | Vehicle availability becomes Online and can receive offers. | Not run yet | Not Run |
| TC-VEH-07 | Rejected vehicle shows reason | Admin rejected vehicle with reason. | Rejected vehicle | 1. Open Vehicles.<br>2. Select rejected vehicle. | Rejection status and reason are visible. | Not run yet | Not Run |

## Table 5-5 Test case for Offer and Trip Execution

| Test Case ID | Test Scenario | Preconditions | Test Data | Test Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|
| TC-OFFER-01 | Owner receives offer | Client dispatched request to owner vehicle. | Active offer | 1. Login as owner.<br>2. Open Offers. | Offer card displays pickup, destination, load, estimate, status, and actions. | Not run yet | Not Run |
| TC-OFFER-02 | Owner views offer detail | Offer exists. | Offer ID | 1. Open offer detail. | Detail view shows route summary, load details, client note if available, and price estimate. | Not run yet | Not Run |
| TC-OFFER-03 | Owner accepts offer | Offer is still available. | Offer ID | 1. Tap Accept. | Backend accepts offer, request becomes accepted, and active job appears. | Not run yet | Not Run |
| TC-OFFER-04 | Owner declines offer | Offer is still available. | Offer ID | 1. Tap Decline. | Offer becomes declined and is removed/marked from inbox without accepting request. | Not run yet | Not Run |
| TC-OFFER-05 | First accept wins | Same request was sent to multiple owners. | Two owner accounts/offers | 1. Owner A accepts.<br>2. Owner B tries to accept. | Owner A wins; Owner B sees conflict/unavailable message. | Not run yet | Not Run |
| TC-OFFER-06 | Execute valid trip statuses | Request is accepted by owner. | Accepted request | 1. Owner taps next action through allowed states until Completed. | Each status transition succeeds, timeline updates, and invalid jumps are not exposed. | Not run yet | Not Run |
| TC-OFFER-07 | Invalid status transition blocked | Request is active. | Unsupported transition | 1. Attempt invalid transition via UI/API. | Backend rejects transition and UI shows clear error. | Not run yet | Not Run |

## Table 5-6 Test case for Tracking and Messaging

| Test Case ID | Test Scenario | Preconditions | Test Data | Test Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|
| TC-TRACK-01 | Client tracks accepted trip | Request is accepted. | Accepted request | 1. Login as client.<br>2. Open Home/active request. | Client sees map preview, route, owner/vehicle details, status, timeline, and actions. | Not run yet | Not Run |
| TC-TRACK-02 | Owner sees active job | Owner accepted request. | Active job | 1. Login as owner.<br>2. Open Offers/active job. | Owner sees active job summary, next allowed action, timeline, and messages. | Not run yet | Not Run |
| TC-TRACK-03 | Timeline refreshes after status update | Trip has status events. | Status event data | 1. Owner updates status.<br>2. Client refreshes/open tracking. | New timeline event appears with human-readable status and time. | Not run yet | Not Run |
| TC-TRACK-04 | Client sends message | Request is active and participants are valid. | Message text | 1. Client enters message.<br>2. Tap Send. | Message is saved by backend and visible in thread. | Not run yet | Not Run |
| TC-TRACK-05 | Owner replies message | Request is active and participants are valid. | Reply text | 1. Owner enters message.<br>2. Tap Send.<br>3. Client refreshes. | Reply appears for client and owner after backend confirmation. | Not run yet | Not Run |
| TC-TRACK-06 | Message failure recovery | API is unavailable or message send fails. | Message text | 1. Try sending message during failure. | Error/retry state appears and app does not fake success. | Not run yet | Not Run |

## Table 5-7 Test case for Cancellation

| Test Case ID | Test Scenario | Preconditions | Test Data | Test Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|
| TC-CANCEL-01 | Client cancels pending request | Client has pending request. | Cancellation reason | 1. Open active pending request.<br>2. Tap Cancel.<br>3. Select reason.<br>4. Confirm. | Request becomes Cancelled and pending offers are cancelled. | Not run yet | Not Run |
| TC-CANCEL-02 | Cancellation reason required | Request is cancellable. | Empty reason | 1. Open cancel dialog.<br>2. Try to confirm without reason. | App blocks confirmation or shows validation error. | Not run yet | Not Run |
| TC-CANCEL-03 | Owner cancels active trip | Owner has accepted/active trip and cancellation is allowed. | Owner cancellation reason | 1. Owner opens active job.<br>2. Tap Cancel trip.<br>3. Confirm reason. | Backend cancels trip, timeline updates, and terminal UI is shown. | Not run yet | Not Run |
| TC-CANCEL-04 | Cancellation unavailable after completion | Trip is completed. | Completed request | 1. Open completed trip.<br>2. Look for cancel action. | Cancel action is hidden or disabled; backend rejects if attempted. | Not run yet | Not Run |
| TC-CANCEL-05 | Cancelled trip appears in history | Request has been cancelled. | Cancelled request | 1. Open Activity/history. | Cancelled trip appears with status and details. | Not run yet | Not Run |

## Table 5-8 Test case for Payment

| Test Case ID | Test Scenario | Preconditions | Test Data | Test Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|
| TC-PAY-01 | Owner confirms cash after completion | Trip is completed and payment pending. | Completed request, expected amount | 1. Open Earnings.<br>2. Select pending payment.<br>3. Tap Confirm cash received. | Payment status becomes confirmed by owner after backend success. | Not run yet | Not Run |
| TC-PAY-02 | Payment cannot be confirmed before completion | Trip is not completed. | Active request | 1. Try to confirm payment from UI/API. | Payment confirmation is unavailable or backend rejects it. | Not run yet | Not Run |
| TC-PAY-03 | Client sees payment pending | Trip completed but owner has not confirmed cash. | Completed request | 1. Client opens Activity/detail. | Payment pending status is visible. | Not run yet | Not Run |
| TC-PAY-04 | Client disputes payment | Completed/cancelled eligible trip exists. | Dispute category/reason | 1. Open Activity detail.<br>2. Submit payment dispute. | Dispute is created and status changes to In review/Disputed. | Not run yet | Not Run |
| TC-PAY-05 | Resolved payment no longer blocks chat | Payment is confirmed or resolved. | Resolved payment request | 1. Open terminal trip messages. | Chat/archive state follows payment resolution policy and no pending-payment warning remains. | Not run yet | Not Run |

## Table 5-9 Test case for Rating and Report

| Test Case ID | Test Scenario | Preconditions | Test Data | Test Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|
| TC-RATE-01 | Rate completed trip | Client has completed trip. | Star rating, review text, tags | 1. Open Activity/completed trip.<br>2. Select stars/tags.<br>3. Submit review. | Rating is saved and success state appears. | Not run yet | Not Run |
| TC-RATE-02 | Prevent duplicate rating | Trip already rated. | Same request | 1. Attempt second rating. | Duplicate is rejected or existing rating is preserved. | Not run yet | Not Run |
| TC-RATE-03 | Report issue without evidence | Eligible trip exists. | Category and description | 1. Open Report issue.<br>2. Select category.<br>3. Enter description.<br>4. Submit. | Report is created without requiring evidence if optional. | Not run yet | Not Run |
| TC-RATE-04 | Report issue with evidence | Eligible trip exists; file available. | Category, description, image/PDF | 1. Open Report issue.<br>2. Attach evidence using upload/camera.<br>3. Submit. | Report is created and evidence metadata is linked. | Not run yet | Not Run |
| TC-RATE-05 | Report validation | Eligible trip exists. | Missing description/category | 1. Try to submit incomplete report. | App/API shows validation error and does not create report. | Not run yet | Not Run |
| TC-RATE-06 | Owner rating summary updates | Owner has received ratings. | Rated trips | 1. Login as owner.<br>2. Open Earnings. | Average rating and recent reviews are visible after refetch. | Not run yet | Not Run |

## Table 5-10 Test case for Notifications

| Test Case ID | Test Scenario | Preconditions | Test Data | Test Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|
| TC-NOTIF-01 | Display unread notifications | User has unread notifications. | Offer/status/payment notification | 1. Open Notifications. | Unread count and notification cards are visible. | Not run yet | Not Run |
| TC-NOTIF-02 | Mark notification as read | Unread notification exists. | Notification ID | 1. Tap Read/Mark read. | Notification becomes read and unread count decreases. | Not run yet | Not Run |
| TC-NOTIF-03 | View notification detail | Notification references offer/request. | Notification with request ID | 1. Tap View details. | User is guided to the relevant request/offer/details area. | Not run yet | Not Run |
| TC-NOTIF-04 | Update notification preferences | User is logged in. | Push, SMS, Email settings | 1. Toggle preferences.<br>2. Tap Save preferences. | Preferences are saved and success message appears. | Not run yet | Not Run |
| TC-NOTIF-05 | Empty notification state | User has no notifications. | Fresh account | 1. Open Notifications. | Professional empty state appears with helpful role-specific message. | Not run yet | Not Run |

## Table 5-11 Test case for UI/UX Regression

| Test Case ID | Test Scenario | Preconditions | Test Data | Test Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|
| TC-UI-01 | No debug sections on login | App is signed out. | Mobile auth screen | 1. Open app signed out.<br>2. Inspect login/register/forgot/verification screens. | API connection and runtime configuration diagnostic cards are not visible. | Not run yet | Not Run |
| TC-UI-02 | No route/debug labels | App has client and owner flows available. | All normal screens | 1. Navigate all client and owner tabs. | No visible `/CLIENT/...`, `/OWNER/...`, backend route, phase, or workflow placeholder labels. | Not run yet | Not Run |
| TC-UI-03 | Navigation persists after app switch | User is on non-home tab/page. | Any logged-in user | 1. Open Request/Offers/Activity.<br>2. Switch to another app/tab.<br>3. Return to KULI. | App remains on the same page and does not reset to Home/default tab. | Not run yet | Not Run |
| TC-UI-04 | Bottom tab usability | User is logged in as client and owner. | Client and owner sessions | 1. Tap each tab for both roles. | Icons and labels are readable; tabs navigate correctly. | Not run yet | Not Run |
| TC-UI-05 | Small-screen layout | Expo web small viewport or Android emulator available. | Small phone viewport | 1. Navigate auth, request, vehicle, offer, history, earnings screens. | Text does not overlap; buttons remain tappable; bottom tab does not cover important content. | Not run yet | Not Run |
| TC-UI-06 | Loading states | Slow network or loading data. | Any query screen | 1. Open screen while data loads. | Loading state is clear, compact, and does not imply success. | Not run yet | Not Run |
| TC-UI-07 | Empty states | Account has no data. | No requests, offers, vehicles, notifications | 1. Open each empty screen. | Empty state gives useful next action and avoids blank/academic layout. | Not run yet | Not Run |
| TC-UI-08 | Error states | API unavailable or validation error. | Invalid input or stopped API | 1. Trigger API/validation error. | Error message is clear, recoverable, and not overly technical. | Not run yet | Not Run |
| TC-UI-09 | Auth UI quality | App is signed out. | Login/register/forgot screens | 1. Open auth screens. | UI uses KULI black/white branding, clear CTAs, role cards with icons, and no staff signup. | Not run yet | Not Run |
| TC-UI-10 | Map preview wording | Request or active trip exists. | Route and active request | 1. Open request map and active tracking map. | UI presents static/status-based tracking and does not claim live GPS. | Not run yet | Not Run |
| TC-UI-11 | Human-readable statuses | Multiple records exist. | Pending, accepted, completed, cancelled, payment states | 1. Scan cards/lists across app. | Status labels are human-readable and use correct green/amber/red meaning. | Not run yet | Not Run |
