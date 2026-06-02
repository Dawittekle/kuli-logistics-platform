# Assistant Dashboard

Last updated: 2026-06-02

The assistant dashboard is the KULI call-center workspace for hotline operators. It is part of the web dashboard in `apps/admin`, but it is routed and permissioned separately from admin-only tools.

## Purpose

Assistants support clients who call instead of using the mobile app. The console lets an assistant create and manage hotline tickets, look up clients, generate assisted quotes, create KULI requests, assign approved online trucks when policy allows, and monitor request/ticket notifications.

The assistant dashboard must not expose admin-only operations such as pricing, audit logs, user sanctions, vehicle-class management, or vehicle verification approval.

## Route Map

| Route | Page | Purpose |
|---|---|---|
| `/assistant/dashboard` | Dashboard | Live summary of ticket queue, active assisted requests, truck supply, and unread assistant alerts. |
| `/assistant/bookings/new` | New booking | Assisted booking form for caller details, client lookup, quote generation, truck selection, and request creation. |
| `/assistant/tickets` | Tickets | Ticket queue with filters, create ticket form, call notes, follow-up date, and backend-confirmed status actions. |
| `/assistant/requests` | Requests | Assisted request list/detail panel with route, timeline, messages, payment status, and assignment/status actions. |
| `/assistant/trucks` | Available trucks | Approved/online/busy/offline truck list with owner, class, capacity, status, and assignment controls. |
| `/assistant/clients` | Clients | Client lookup by phone, email, or name. |
| `/assistant/notifications` | Notifications | Assistant notification inbox with mark-as-read behavior. |

Admin users continue to use `/admin/*`. If an assistant opens an admin URL in the browser, the frontend normalizes the route back to the assistant workspace and the backend also rejects admin-only API actions.

## Backend Endpoints

| Method | Endpoint | Roles | Behavior |
|---|---|---|---|
| `GET` | `/api/v1/assistant/dashboard` | `assistant`, `admin` | Returns ticket, request, truck, and notification counts for assistant overview. |
| `GET` | `/api/v1/assistant/tickets` | `assistant`, `admin` | Lists hotline tickets with status and caller filters. |
| `POST` | `/api/v1/assistant/tickets` | `assistant`, `admin` | Creates a hotline ticket. |
| `PATCH` | `/api/v1/assistant/tickets/:ticketId/status` | `assistant`, `admin` | Moves a ticket through allowed ticket states. |
| `GET` | `/api/v1/assistant/clients/search?query=` | `assistant`, `admin` | Searches client profiles by phone, email, or name. |
| `POST` | `/api/v1/assistant/bookings/quote` | `assistant`, `admin` | Generates a quote using the real quote service. |
| `POST` | `/api/v1/assistant/bookings` | `assistant`, `admin` | Creates an assisted KULI request and sends offer/confirmation notifications. Supports direct assignment when `directAssignVehicleId` is supplied. |
| `GET` | `/api/v1/assistant/requests` | `assistant`, `admin` | Lists assistant-created/supported requests visible to the actor. |
| `POST` | `/api/v1/assistant/requests/:requestId/assign` | `assistant`, `admin` | Assigns an approved online truck to a pending assisted request. |
| `GET` | `/api/v1/assistant/trucks` | `assistant`, `admin` | Lists vehicles for dispatch, with filters for verification, availability, and search. |
| `GET` | `/api/v1/assistant/notifications` | `assistant`, `admin` | Lists notifications for the current assistant. |
| `PATCH` | `/api/v1/notifications/:notificationId/read` | Authenticated recipient | Marks an assistant notification read. |

Shared request endpoints such as `/api/v1/kuli-requests/:id/events`, `/api/v1/kuli-requests/:id/messages`, and `/api/v1/kuli-requests/:id/status` remain backend-authoritative and still enforce participant/role rules.

## Ticket Flow

1. Assistant creates or claims a ticket from the queue.
2. Ticket can move through the supported states: Open, Assigned, In progress, Waiting for client, Closed, or Cancelled.
3. Status updates are saved by the backend; the UI does not fake transitions.
4. Ticket notes and follow-up time are saved with status updates when provided.
5. Closed and cancelled tickets cannot be edited by ordinary assistant actions.
6. A ticket can be linked to an assisted request through `hotlineTicketId` during booking creation.

## Assisted Booking Flow

1. Assistant searches for an existing client by phone, email, or name.
2. If no client profile exists, the request can keep a caller contact snapshot. Creating a full Supabase-backed client profile from the assistant console is not implemented yet because it requires credential/identity provisioning policy.
3. Assistant enters pickup, destination, vehicle class, load details, schedule, and optional notes.
4. The console calls the quote endpoint. Quote totals, route estimate, and candidate trucks come from the backend.
5. Assistant selects one or more candidate vehicles.
6. If direct assignment is off, the backend creates a pending request, creates offers, and notifies selected truck owners.
7. If direct assignment is on, the backend validates the first selected truck, marks it busy, creates the request as accepted, creates an accepted offer, writes a status event, and notifies the owner/client.

## Truck Assignment Flow

1. Only approved `online_available` vehicles can be assigned.
2. A direct assignment or assignment from the Requests page marks the chosen vehicle `busy_on_job`.
3. A busy truck cannot be assigned to another request.
4. Assistant assignment uses backend conflict checks, so two assignment attempts cannot silently win at the same time.
5. When the trip reaches Completed or Cancelled through valid status rules, the backend releases the vehicle from the active trip so it can return to online availability when owner status allows.
6. Assignment creates notifications for the assigned owner and client when a client profile exists. Competing offers are expired when a pending request is assigned.

## RBAC Rules

- `assistant` and `admin` can use assistant routes.
- `assistant` cannot access admin-only routes or endpoints.
- `admin` keeps access to admin tools and can inspect assistant workflows for operations support.
- `client` and `truck_owner` cannot access staff dashboard routes.
- The frontend hides unauthorized routes, but backend role guards are the source of truth.

## Testing Checklist

Run these before final acceptance:

- Assistant login routes to `/assistant/dashboard`.
- Admin login routes to `/admin/dashboard`.
- Assistant is blocked from admin-only tools.
- Dashboard metrics load.
- Ticket create, claim/update, close, and cancel are backend-confirmed.
- Client lookup works by phone, email, and name.
- Assisted quote generation returns real quote data.
- Assisted booking without direct assignment creates pending request/offers.
- Assisted booking with direct assignment creates accepted request and marks truck busy.
- Busy truck cannot be assigned twice.
- Trip completion or cancellation releases the busy vehicle.
- Requests page shows timeline, messages, payment status, and assignment actions.
- Notifications page lists alerts and mark-as-read works.
- Browser refresh keeps the same assistant route.

## Remaining Gaps

- Creating a brand-new Supabase-authenticated client account from the assistant dashboard is not implemented. The current safe behavior is client lookup plus caller snapshot for assisted bookings.
- Continuous GPS is still out of v1 scope. Assistant request/truck views use saved coordinates and status-based tracking.
- External SMS/email/push delivery depends on configured notification providers. In-app notification records are created in the current backend.
