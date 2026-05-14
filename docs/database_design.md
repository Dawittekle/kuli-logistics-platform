# Database Design

KULI should use MongoDB as the primary application database with Mongoose as the ODM. The model is document-oriented, but the system still needs explicit ownership boundaries, indexes, state rules, and migration discipline.

Related documents:
- [System Architecture](system_architecture.md)
- [Feature Specifications](feature_specifications.md)
- [Backend Architecture](backend_architecture.md)

## Design Principles

- Store authentication credentials in Supabase Auth, not MongoDB.
- Store application profiles, roles, vehicles, requests, tickets, payments, messages, reports, and audit logs in MongoDB.
- Use object storage for uploaded documents and evidence; MongoDB stores metadata and storage keys.
- Use normalized collections for unbounded or high-write data such as messages, notifications, audit logs, offers, and events.
- Keep immutable snapshots for historical correctness: pricing rule version, vehicle class label, request estimate, client contact snapshot for assisted bookings.
- Use soft delete for user-facing/business entities. Hard delete only for ephemeral tokens or local development fixtures.

## Core Enums

Recommended shared enums should live in `packages/shared`.

```ts
type UserRole = 'client' | 'truck_owner' | 'assistant' | 'admin';
type AccountStatus = 'active' | 'pending_verification' | 'suspended' | 'banned' | 'deleted';
type VerificationStatus = 'draft' | 'pending' | 'approved' | 'rejected';
type VehicleAvailabilityStatus = 'offline' | 'online_available' | 'busy_on_job' | 'under_maintenance' | 'suspended';
type KuliStatus =
  | 'pending'
  | 'accepted'
  | 'en_route_to_pickup'
  | 'arrived_at_pickup'
  | 'loading'
  | 'in_transit'
  | 'unloading'
  | 'completed'
  | 'cancelled'
  | 'timed_out';
type OfferStatus = 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'cancelled';
type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'pending_client' | 'closed' | 'cancelled';
type PaymentStatus = 'not_required' | 'pending' | 'confirmed_by_owner' | 'disputed' | 'resolved' | 'cancelled';
type ReportStatus = 'open' | 'under_review' | 'awaiting_response' | 'resolved' | 'rejected';
```

## Location Shape

MongoDB geospatial indexes require GeoJSON coordinate order `[longitude, latitude]`.

```ts
type GeoPoint = {
  type: 'Point';
  coordinates: [number, number];
};

type LocationSnapshot = {
  point: GeoPoint;
  addressText: string;
  placeId?: string;
  source: 'gps' | 'manual_pin' | 'geocoded_address' | 'assistant_entry';
  notes?: string;
};
```

All pickup, destination, and vehicle standby locations must include a point and human-readable address text.

## Collections

### `users`

Owns application identity and role metadata.

```ts
{
  _id: ObjectId,
  supabaseUserId: string,
  role: UserRole,
  accountStatus: AccountStatus,
  fullName: string,
  email?: string,
  phone?: string,
  address?: string,
  preferredLanguage?: 'en' | 'am' | 'om' | string,
  profilePhotoFileId?: ObjectId,
  notificationPreferences: {
    push: boolean,
    sms: boolean,
    email: boolean,
    marketing: boolean
  },
  clientMeta?: {
    activeRequestId?: ObjectId,
    completedTripsCount: number
  },
  truckOwnerMeta?: {
    averageRating: number,
    ratingCount: number,
    totalTrips: number,
    completedTrips: number,
    cancelledTrips: number,
    activeVehicleId?: ObjectId,
    visibilityPenaltyScore: number
  },
  assistantMeta?: {
    isAvailable: boolean,
    activeTicketId?: ObjectId
  },
  staffMeta?: {
    createdByAdminId?: ObjectId,
    lastPrivilegedLoginAt?: Date
  },
  createdAt: Date,
  updatedAt: Date,
  deletedAt?: Date
}
```

Indexes:

- Unique `supabaseUserId`.
- Unique sparse `email`.
- Unique sparse `phone`.
- `{ role: 1, accountStatus: 1 }`.
- `{ 'truckOwnerMeta.averageRating': -1 }` for admin/reporting.

### `vehicle_classes`

Admin-managed reference data for truck types and pricing.

```ts
{
  _id: ObjectId,
  slug: string,
  name: string,
  description?: string,
  capacityKg?: number,
  capacityCubicMeters?: number,
  dimensions?: { lengthM?: number, widthM?: number, heightM?: number },
  defaultPricing: {
    baseFare: number,
    perKmRate: number,
    includedMinutes?: number,
    perExtraMinuteRate?: number,
    minimumFare: number
  },
  active: boolean,
  displayOrder: number,
  createdAt: Date,
  updatedAt: Date,
  deletedAt?: Date
}
```

Indexes:

- Unique `slug`.
- `{ active: 1, displayOrder: 1 }`.

### `vehicles`

Supply-side vehicle records.

```ts
{
  _id: ObjectId,
  ownerId: ObjectId,
  vehicleClassId: ObjectId,
  vehicleClassSnapshot: { slug: string, name: string },
  licensePlate: string,
  capacityKg?: number,
  capacityCubicMeters?: number,
  description?: string,
  verificationStatus: VerificationStatus,
  verificationSubmittedAt?: Date,
  verifiedAt?: Date,
  verifiedByAdminId?: ObjectId,
  rejectionReason?: string,
  availabilityStatus: VehicleAvailabilityStatus,
  currentLocation?: LocationSnapshot,
  currentLocationUpdatedAt?: Date,
  activeTripId?: ObjectId,
  documentsRequired: string[],
  suspensionReason?: string,
  maintenanceNote?: string,
  createdAt: Date,
  updatedAt: Date,
  deletedAt?: Date
}
```

Indexes:

- Unique `{ licensePlate: 1 }` with partial filter `{ deletedAt: { $exists: false } }`.
- `{ ownerId: 1, deletedAt: 1 }`.
- `{ verificationStatus: 1, availabilityStatus: 1 }`.
- `currentLocation.point` as `2dsphere`.
- Compound matching index: `{ vehicleClassId: 1, verificationStatus: 1, availabilityStatus: 1 }`.

### `vehicle_documents`

Versionable document metadata.

```ts
{
  _id: ObjectId,
  vehicleId: ObjectId,
  ownerId: ObjectId,
  type: 'identity' | 'driver_license' | 'vehicle_registration' | 'ownership_proof' | 'insurance' | 'other',
  fileId: ObjectId,
  status: 'uploaded' | 'accepted' | 'rejected',
  rejectionReason?: string,
  uploadedAt: Date,
  reviewedAt?: Date,
  reviewedByAdminId?: ObjectId
}
```

Indexes:

- `{ vehicleId: 1, type: 1 }`.
- `{ status: 1, uploadedAt: -1 }`.

### `files`

Storage metadata for documents, report evidence, and profile images.

```ts
{
  _id: ObjectId,
  ownerId?: ObjectId,
  linkedEntityType: 'vehicle' | 'report' | 'profile' | 'message',
  linkedEntityId?: ObjectId,
  storageProvider: 'supabase_storage' | 's3' | 'local_dev',
  storageKey: string,
  originalFileName: string,
  mimeType: string,
  sizeBytes: number,
  checksum?: string,
  visibility: 'private' | 'staff_only' | 'public',
  createdAt: Date,
  deletedAt?: Date
}
```

Indexes:

- `{ linkedEntityType: 1, linkedEntityId: 1 }`.
- `{ ownerId: 1, createdAt: -1 }`.

### `pricing_rules`

Versioned pricing configuration.

```ts
{
  _id: ObjectId,
  version: number,
  status: 'draft' | 'active' | 'retired',
  currency: 'ETB',
  vehicleClassRules: [{
    vehicleClassId: ObjectId,
    baseFare: number,
    perKmRate: number,
    minimumFare: number,
    includedMinutes?: number,
    perExtraMinuteRate?: number
  }],
  loadAdjustments: [{
    itemType: string,
    flatFee?: number,
    multiplier?: number
  }],
  fuelSurchargePercent: number,
  cancellationPolicyId?: ObjectId,
  effectiveFrom: Date,
  effectiveTo?: Date,
  createdByAdminId: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- Unique `version`.
- `{ status: 1, effectiveFrom: -1 }`.

### `kuli_requests`

Central transactional entity.

```ts
{
  _id: ObjectId,
  requestCode: string,
  clientId?: ObjectId,
  createdByAssistantId?: ObjectId,
  hotlineTicketId?: ObjectId,
  clientContactSnapshot?: {
    fullName?: string,
    phone?: string,
    notes?: string
  },
  status: KuliStatus,
  pickupLocation: LocationSnapshot,
  destinationLocation: LocationSnapshot,
  requestedPickupTime?: Date,
  loadDetails: {
    itemType: string,
    description?: string,
    estimatedWeightKg?: number,
    estimatedVolumeCubicMeters?: number,
    specialHandlingInstructions?: string,
    loadingAssistanceRequested: boolean
  },
  requestedVehicleClassId?: ObjectId,
  quoteSnapshot: {
    pricingRuleVersion: number,
    currency: 'ETB',
    baseFare: number,
    distanceKm: number,
    etaMinutes?: number,
    loadAdjustment: number,
    optionalServicesTotal: number,
    fuelSurcharge: number,
    tip: number,
    totalEstimate: number
  },
  selectedOwnerId?: ObjectId,
  selectedVehicleId?: ObjectId,
  acceptedOfferId?: ObjectId,
  cancellation?: {
    cancelledByUserId: ObjectId,
    reason: string,
    feeAmount?: number,
    cancelledAt: Date
  },
  idempotencyKey?: string,
  createdAt: Date,
  updatedAt: Date,
  completedAt?: Date,
  deletedAt?: Date
}
```

Indexes:

- Unique `requestCode`.
- Unique sparse `{ clientId: 1, idempotencyKey: 1 }`.
- `{ clientId: 1, status: 1, createdAt: -1 }`.
- `{ selectedOwnerId: 1, status: 1, createdAt: -1 }`.
- `{ createdByAssistantId: 1, createdAt: -1 }`.
- `{ status: 1, createdAt: -1 }`.
- `pickupLocation.point` as `2dsphere`.

### `trip_offers`

Offer records sent to owners.

```ts
{
  _id: ObjectId,
  requestId: ObjectId,
  ownerId: ObjectId,
  vehicleId: ObjectId,
  status: OfferStatus,
  distanceKmAtOffer?: number,
  etaMinutesAtOffer?: number,
  expiresAt: Date,
  viewedAt?: Date,
  acceptedAt?: Date,
  declinedAt?: Date,
  declineReason?: string,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- Unique `{ requestId: 1, vehicleId: 1 }`.
- `{ ownerId: 1, status: 1, createdAt: -1 }`.
- `{ requestId: 1, status: 1 }`.
- TTL-like scheduled job should expire by `expiresAt`; avoid relying solely on Mongo TTL if business side effects are required.

### `kuli_status_events`

Immutable status history.

```ts
{
  _id: ObjectId,
  requestId: ObjectId,
  fromStatus?: KuliStatus,
  toStatus: KuliStatus,
  actorUserId?: ObjectId,
  actorRole?: UserRole,
  reason?: string,
  metadata?: Record<string, unknown>,
  createdAt: Date
}
```

Indexes:

- `{ requestId: 1, createdAt: 1 }`.
- `{ toStatus: 1, createdAt: -1 }`.

### `messages`

Request-scoped conversation records.

```ts
{
  _id: ObjectId,
  requestId: ObjectId,
  senderId: ObjectId,
  body: string,
  attachments?: ObjectId[],
  readBy: [{ userId: ObjectId, readAt: Date }],
  clientGeneratedId?: string,
  createdAt: Date,
  deletedAt?: Date
}
```

Indexes:

- `{ requestId: 1, createdAt: 1 }`.
- Unique sparse `{ senderId: 1, clientGeneratedId: 1 }`.

### `hotline_tickets`

Assisted booking workflow.

```ts
{
  _id: ObjectId,
  ticketCode: string,
  status: TicketStatus,
  callerPhone?: string,
  clientId?: ObjectId,
  assignedAssistantId?: ObjectId,
  requestId?: ObjectId,
  source: 'incoming_call' | 'missed_call' | 'manual',
  callSummary?: string,
  cancellationReason?: string,
  followUpAt?: Date,
  createdAt: Date,
  updatedAt: Date,
  closedAt?: Date
}
```

Indexes:

- Unique `ticketCode`.
- `{ status: 1, createdAt: -1 }`.
- `{ assignedAssistantId: 1, status: 1 }`.
- `{ callerPhone: 1, createdAt: -1 }`.

### `payments`

Manual and future digital payment records.

```ts
{
  _id: ObjectId,
  requestId: ObjectId,
  payerClientId?: ObjectId,
  payeeOwnerId: ObjectId,
  status: PaymentStatus,
  flow: 'pay_on_acceptance' | 'pay_on_delivery' | 'pay_in_advance',
  method: 'cash' | 'manual' | 'digital_gateway',
  currency: 'ETB',
  amountExpected: number,
  amountConfirmed?: number,
  platformCommissionAmount?: number,
  confirmedByOwnerId?: ObjectId,
  confirmedAt?: Date,
  disputedByUserId?: ObjectId,
  disputeReason?: string,
  resolvedByAdminId?: ObjectId,
  resolutionNote?: string,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- Unique `{ requestId: 1 }` if one payment per request in v1.
- `{ status: 1, createdAt: -1 }`.
- `{ payeeOwnerId: 1, createdAt: -1 }`.

### `ratings`

Trip ratings and reviews.

```ts
{
  _id: ObjectId,
  requestId: ObjectId,
  raterId: ObjectId,
  targetOwnerId: ObjectId,
  targetVehicleId?: ObjectId,
  rating: number,
  reviewText?: string,
  moderationStatus: 'visible' | 'hidden' | 'flagged',
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- Unique `{ requestId: 1, raterId: 1, targetOwnerId: 1 }`.
- `{ targetOwnerId: 1, createdAt: -1 }`.
- `{ targetOwnerId: 1, rating: -1 }`.

### `reports`

Complaints and disputes.

```ts
{
  _id: ObjectId,
  reportCode: string,
  requestId?: ObjectId,
  reporterId: ObjectId,
  reportedUserId?: ObjectId,
  reportedVehicleId?: ObjectId,
  category: 'overcharge' | 'no_show' | 'misconduct' | 'damage' | 'safety' | 'platform_issue' | 'other',
  description: string,
  evidenceFileIds: ObjectId[],
  status: ReportStatus,
  assignedAdminId?: ObjectId,
  resolution?: {
    outcome: 'warning' | 'suspension' | 'rejected' | 'resolved_no_action' | 'refund_recommended' | 'visibility_penalty',
    note: string,
    resolvedByAdminId: ObjectId,
    resolvedAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- Unique `reportCode`.
- `{ status: 1, createdAt: -1 }`.
- `{ reportedUserId: 1, status: 1 }`.
- `{ requestId: 1 }`.

### `notifications`

In-app notification records.

```ts
{
  _id: ObjectId,
  recipientUserId: ObjectId,
  type: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
  channels: ('in_app' | 'push' | 'sms' | 'email')[],
  deliveryStatus: 'pending' | 'sent' | 'failed' | 'read',
  readAt?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- `{ recipientUserId: 1, createdAt: -1 }`.
- `{ deliveryStatus: 1, createdAt: 1 }`.

### `audit_logs`

Append-only operational and security event log.

```ts
{
  _id: ObjectId,
  actorUserId?: ObjectId,
  actorRole?: UserRole,
  action: string,
  targetType: string,
  targetId?: ObjectId,
  requestId?: string,
  ipAddress?: string,
  userAgent?: string,
  metadata?: Record<string, unknown>,
  createdAt: Date
}
```

Indexes:

- `{ createdAt: -1 }`.
- `{ actorUserId: 1, createdAt: -1 }`.
- `{ targetType: 1, targetId: 1, createdAt: -1 }`.
- `{ action: 1, createdAt: -1 }`.

## Relationships

- One user can be one role in v1. Multi-role accounts can be introduced later by replacing `role` with `roles`.
- One truck owner can own many vehicles.
- One vehicle belongs to one owner.
- One KULI request belongs to a client or an assisted client contact snapshot.
- One KULI request can have many offers.
- One KULI request can have one accepted offer.
- One KULI request has many status events.
- One KULI request has one payment record in v1.
- One KULI request can have many messages.
- One hotline ticket can link to zero or one KULI request.
- One report can reference a request, user, and/or vehicle.

## Soft Delete Strategy

Use `deletedAt` on users, vehicles, files, and reference data. Preserve transactional records such as KULI requests, payments, ratings, reports, status events, and audit logs. If legal or privacy deletion is requested, anonymize PII while retaining financial/audit references.

## Migration Considerations

- Use explicit migration scripts even with MongoDB.
- Seed vehicle classes, default pricing rule, admin account metadata, and cancellation policy.
- Migration scripts must be idempotent.
- Never mutate historical quote snapshots when pricing changes.
- For enum changes, add compatibility mapping before changing UI labels.

## Query Expectations

Critical queries:

- Find online approved vehicles near pickup point.
- List pending vehicle verification queue.
- List owner offers and active jobs.
- List client active and historical requests.
- List assistant tickets by status.
- List admin reports by status and category.
- Fetch request detail with events, offers, payment, rating, and reports.

Avoid joining too much in one request. Use targeted endpoints for detail pages and aggregate cards for list views.

