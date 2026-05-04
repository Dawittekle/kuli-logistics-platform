# Architecture

The project uses a client-server architecture with a modular-monolith backend. This gives the team clear separation between features while keeping deployment simpler than a microservice system.

## High-Level Layers

```text
Mobile App / Admin Web
        |
        | HTTPS REST API
        v
Node.js Backend API
        |
        v
MongoDB Database
```

## Presentation Layer

- `apps/mobile`: React Native app for clients and truck owners.
- `apps/admin`: Web dashboard for admins and call-center assistants.

The client applications should handle display, local form validation, navigation, and role-specific workflows. Business rules must still be enforced by the backend.

## Application Layer

- `services/api`: Node.js backend exposing RESTful APIs.

The backend should be split internally by domain modules:

- Auth
- Users/accounts
- Vehicles/verification
- Kuli requests
- Matching/pricing
- Assisted booking/support
- Notifications
- Reports/ratings
- Admin/audit

## Data Layer

MongoDB stores users, vehicles, Kuli requests, tickets, reports, notifications, ratings, audit logs, and system configuration. Geospatial indexes should be used for pickup locations and vehicle locations when matching by proximity.

## Design Rationale

A modular monolith is a strong fit for the academic and early-product phase because it is easier to test, deploy, and coordinate. If the platform grows, modules like notifications, matching, or analytics can later move into separate services.

