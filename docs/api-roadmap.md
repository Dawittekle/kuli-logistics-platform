# API Roadmap

This is a starting contract map for the backend. Final request and response schemas should be defined in `packages/shared`.

## Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## Users

- `GET /users/me`
- `PATCH /users/me`
- `GET /admin/users`
- `PATCH /admin/users/:id/status`

## Vehicles

- `POST /vehicles`
- `GET /vehicles/mine`
- `GET /vehicles/:id`
- `PATCH /vehicles/:id`
- `POST /vehicles/:id/documents`
- `PATCH /admin/vehicles/:id/verification`

## Kuli Requests

- `POST /requests`
- `GET /requests/mine`
- `GET /requests/:id`
- `PATCH /requests/:id`
- `POST /requests/:id/cancel`
- `POST /requests/:id/accept`
- `POST /requests/:id/status`

## Matching and Pricing

- `POST /pricing/estimate`
- `GET /matching/nearby-requests`
- `POST /matching/assign`

## Support

- `POST /support/tickets`
- `GET /support/tickets`
- `GET /support/tickets/:id`
- `PATCH /support/tickets/:id`
- `POST /support/assisted-bookings`

## Notifications

- `GET /notifications`
- `PATCH /notifications/:id/read`

## Ratings and Reports

- `POST /ratings`
- `GET /ratings/mine`
- `POST /reports`
- `GET /admin/reports`
- `PATCH /admin/reports/:id`

## Admin

- `GET /admin/dashboard`
- `GET /admin/audit-logs`
- `GET /admin/system-config`
- `PATCH /admin/system-config`

