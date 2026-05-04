# Kuli Logistics Platform

Kuli is a peer-to-peer logistics platform for connecting clients who need local transport with verified truck owners. The initial scope targets Addis Ababa and supports client booking, truck owner onboarding, request matching, pricing, assisted booking through a call center, notifications, reports, ratings, and admin oversight.

The project is planned as a monorepo so the team can work on mobile, admin web, backend, shared types, documentation, and infrastructure in one coordinated repository.

## Repository Structure

```text
kuli-logistics-platform/
├── apps/
│   ├── mobile/                 # React Native app for clients and truck owners
│   └── admin/                  # Web dashboard for admins and call-center assistants
├── services/
│   └── api/                    # Node.js modular-monolith backend
│       └── src/
│           ├── modules/        # Domain modules: auth, users, vehicles, requests, etc.
│           ├── common/         # Shared backend utilities, guards, errors, helpers
│           ├── config/         # Backend configuration and environment loading
│           └── database/       # MongoDB connection, migrations, repositories
├── packages/
│   ├── shared/                 # Shared types, constants, validation schemas, DTOs
│   └── config/                 # Shared linting, formatting, TypeScript, env helpers
├── infra/
│   ├── docker/                 # Local Docker services such as MongoDB/API containers
│   └── deploy/                 # Deployment manifests and environment notes
├── scripts/                    # Developer automation scripts
├── tests/
│   ├── e2e/                    # End-to-end test flows
│   └── fixtures/               # Test seed data and sample payloads
└── docs/                       # Project design, architecture, workflow, and planning docs
```

## Main Subsystems

- Authentication and authorization
- User and account management
- Vehicle registration and verification
- Kuli request lifecycle management
- Matching and pricing
- Assisted booking and support tickets
- Notifications and messaging
- Ratings, reports, administration, and audit logging

## Suggested Technology Direction

- Mobile app: React Native
- Admin/call-center dashboard: React web app
- Backend: Node.js REST API using a modular monolith
- Database: MongoDB with geospatial indexes
- Authentication: Supabase Auth or another JWT/OIDC-compatible provider
- Communication: HTTPS REST APIs, with future support for real-time updates if needed

## Documentation

Start with these files:

- [Project Overview](docs/project-overview.md)
- [Architecture](docs/architecture.md)
- [Modules and Ownership](docs/modules-and-ownership.md)
- [Data Model](docs/data-model.md)
- [API Roadmap](docs/api-roadmap.md)
- [Security and Access Control](docs/security-access-control.md)
- [Team Workflow](docs/team-workflow.md)

## Team Contribution Model

Each team member should own a bounded area, create feature branches, document API contracts before implementing shared behavior, and keep changes small enough to review. Shared models and constants should live in `packages/shared` so mobile, admin, and backend stay aligned.
# kuli-logistics-platform
