# Modules and Ownership

Use this file to divide work across the team. Each module should have one primary owner and one reviewer.

## Backend Modules

| Module | Folder | Responsibility |
| --- | --- | --- |
| Auth | `services/api/src/modules/auth` | Login, registration, JWT validation, sessions, role checks |
| Users | `services/api/src/modules/users` | Profiles, account status, admin user management |
| Vehicles | `services/api/src/modules/vehicles` | Vehicle registration, documents, approval workflow |
| Requests | `services/api/src/modules/requests` | Kuli request creation, cancellation, status lifecycle |
| Matching | `services/api/src/modules/matching` | Nearby vehicle search, capacity filters, assignment |
| Pricing | `services/api/src/modules/pricing` | Quote estimation, pricing rules, configuration |
| Support | `services/api/src/modules/support` | Assisted booking, call-center tickets, issue handling |
| Notifications | `services/api/src/modules/notifications` | In-app, SMS, email notification queue |
| Reports | `services/api/src/modules/reports` | Complaints, ratings, admin decisions |
| Audit | `services/api/src/modules/audit` | Critical event logging and traceability |

## Frontend Areas

| Area | Folder | Responsibility |
| --- | --- | --- |
| Mobile client flows | `apps/mobile/src/features/client` | Create request, view quote, track status, rate service |
| Mobile truck owner flows | `apps/mobile/src/features/truck-owner` | Vehicle registration, job inbox, accept job, update status |
| Shared mobile UI | `apps/mobile/src/components` | Reusable mobile components |
| Admin dashboard | `apps/admin/src/features/admin` | Users, verification, reports, analytics, config |
| Call-center dashboard | `apps/admin/src/features/call-center` | Assisted booking and ticket handling |

## Shared Package

Put cross-app contracts in `packages/shared`:

- Role names
- Request status enums
- Vehicle status enums
- API DTOs
- Validation schemas
- Shared constants

This prevents the mobile app, admin dashboard, and backend from inventing different names for the same concept.

