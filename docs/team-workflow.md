# Team Workflow

This repo is designed for parallel contribution. The goal is for each team member to work in a clear area without breaking shared contracts.

## Branching

Use short-lived feature branches:

```text
feature/auth-login
feature/mobile-client-request
feature/admin-vehicle-verification
fix/request-status-validation
docs/api-contracts
```

## Recommended Work Split

- Backend auth and users
- Backend vehicle verification
- Backend Kuli request lifecycle
- Backend matching and pricing
- Mobile client app
- Mobile truck owner app
- Admin and call-center dashboard
- Database, infrastructure, and testing
- Documentation and API contracts

## Contribution Rules

- Define shared enums and DTOs in `packages/shared`.
- Keep feature work inside the correct module folder.
- Update docs when behavior or API contracts change.
- Add tests for backend rules, especially authorization and status changes.
- Avoid mixing unrelated features in one pull request.
- Request review from the teammate who owns the affected module.

## Suggested Pull Request Checklist

- The feature matches the design document scope.
- API request and response shapes are documented.
- Role permissions are enforced on the backend.
- Shared types are updated if contracts changed.
- Tests or manual verification notes are included.
- README or docs are updated when needed.

