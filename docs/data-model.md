# Data Model

MongoDB is the proposed database because the platform needs flexible documents and geospatial queries for matching vehicles and pickup locations.

## Main Collections

### `users`

Stores all platform accounts.

Important fields:

- `role`: `client`, `truck_owner`, `call_assistant`, or `admin`
- `name`
- `email`
- `phone`
- `passwordHash` or external auth provider reference
- `profile`
- `status`: `active`, `suspended`, or `banned`
- `createdAt`, `updatedAt`

### `vehicles`

Stores trucks registered by owners.

Important fields:

- `ownerId`
- `vehicleClass`
- `capacity`
- `licensePlate`
- `documents`
- `insurance`
- `verification`
- `location`

### `kuli_requests`

Stores the transport request lifecycle.

Important fields:

- `clientId`
- `assignedOwnerId`
- `pickup`
- `destination`
- `items`
- `preferredPickupTime`
- `status`
- `pricing`
- `vehicleSnapshot`
- `events`

Recommended statuses:

- `requested`
- `matched`
- `accepted`
- `enroute`
- `loading`
- `in_transit`
- `unloading`
- `completed`
- `cancelled`

### Other Collections

- `tickets`: assisted booking and support tickets
- `reports`: complaints and misconduct reports
- `notifications`: queued and delivered messages
- `ratings`: post-trip scores and reviews
- `audit_logs`: security and business audit trail
- `system_config`: pricing rules, cancellation policies, vehicle classes

## Indexing Notes

- Unique indexes on `users.email` and `users.phone`
- `vehicles.ownerId`
- `vehicles.location` as `2dsphere`
- `kuli_requests.pickup.location` as `2dsphere`
- `kuli_requests.status` and `kuli_requests.createdAt`
- `kuli_requests.assignedOwnerId`
- `notifications.userId` and `notifications.deliveredAt`
- `audit_logs.timestamp`

