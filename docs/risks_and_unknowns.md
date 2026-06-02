# Risks and Unknowns

This document records ambiguities, assumptions, technical risks, blockers, and product questions that must be validated as the project matures.

## Explicit Assumptions

- Public self-registration is limited to clients and truck owners. Admin and assistant accounts are provisioned by admins.
- Supabase Auth is available and acceptable for production use.
- MongoDB remains the primary application database.
- The first launch city is Addis Ababa.
- V1 uses manual trip status updates, not continuous GPS telemetry.
- V1 records cash/manual payment status but does not process digital payments.
- Object storage is available for vehicle documents and report evidence.
- Phone/SMS is important for assisted booking and critical notifications.
- English is supported first; local language support should be prepared but may launch later.

## Missing Product Decisions

### Commission Collection

The document says the platform may charge commission, service fees, premium listings, or cancellation fees. It does not define:

- Commission percentage.
- Who pays the commission.
- When commission is collected for cash trips.
- Whether owners settle balances periodically.
- Whether clients see platform fee separately.

Impact: payment records can track expected commission, but automated collection should be deferred.

### Cancellation Policy

The document says cancellation windows, fees, and penalties are configurable but does not define actual values.

Needed:

- Free cancellation window after request creation.
- Fee after owner en route.
- Cancellation by owner penalties.
- In-transit cancellation handling.

### Cargo Damage Responsibility

The source states the platform is not responsible for disputes, damages, or physical handling, while also requiring disputes and reports. This must be clarified in user terms and admin workflows.

Needed:

- What outcomes can admins impose?
- Is compensation ever supported?
- Are damage reports informational or enforceable?

### Truck Owner vs Driver

The document uses truck owner and truck driver in places. V1 should treat them as the same actor unless fleet/driver delegation is later required.

Needed:

- Can one owner register multiple drivers?
- Can a vehicle have a driver distinct from owner?

### Preferred Drivers Selection

The request flow says clients select preferred drivers and send request. It does not define whether requests go to one owner or many.

Assumption:

- V1 allows selecting one or more candidates and creates offers. First acceptance wins.

## Architectural Risks

### Geolocation and Address Quality

Addis Ababa addresses may be inconsistent. Pure text address search can fail.

Mitigations:

- Require map pin/coordinate confirmation.
- Allow manual pin adjustment.
- Store address notes.
- Use assistant verification for ambiguous locations.

### Matching Query Performance

Nearby search is central and can become expensive with many vehicles.

Mitigations:

- 2dsphere index on vehicle location.
- Filter by verification and availability before ranking.
- Route ETA only for top candidates.
- Cache class/reference data.

### Acceptance Race Conditions

Multiple owners can accept at once.

Mitigations:

- Atomic conditional update or transaction.
- Integration tests for concurrent accept.
- Conflict response for losing owner.

### Notification Reliability

SMS/push/email providers can fail.

Mitigations:

- Persist notification records.
- Use queue retries.
- Show in-app notification as source of truth.
- Monitor failed dispatches.

### File Upload Security

Vehicle documents and evidence are sensitive.

Mitigations:

- Validate MIME type, size, and file category.
- Use signed URLs.
- Restrict access by role and linked entity.
- Audit staff file access.

### Cash-First Payment Workflows

Cash payments complicate commission and dispute resolution.

Mitigations:

- Track expected amount, owner confirmation, disputes, and admin resolution.
- Defer automated commission collection until product rules exist.

## Security-Sensitive Areas

- Staff role creation.
- Admin account takeover.
- Vehicle document access.
- Pricing rule changes.
- Payment confirmation/dispute resolution.
- Report moderation.
- File upload.
- Role spoofing.
- Request acceptance race conditions.
- Messaging abuse.

## Scalability Bottlenecks

- Nearby geospatial queries.
- Mapping/routing API calls.
- Notification dispatch.
- Admin audit log volume.
- Message history if embedded in requests.
- Document storage and signed URL generation.

## Integration Complexity

### Supabase Auth

Need to decide JWT verification method:

- Supabase JWKS if available.
- Project JWT secret configuration.

### Mapping Provider

Provider choice affects:

- Cost.
- Accuracy in Addis Ababa.
- Rate limits.
- Geocoding quality.
- Terms of use.

### SMS Provider

Provider choice affects:

- Ethiopian delivery support.
- Sender ID registration.
- Cost.
- Delivery reports.

### Object Storage

Provider choice affects:

- Signed URL patterns.
- Access control.
- Lifecycle policy.
- Regional availability.

## Future Extensibility Concerns

- Multi-city expansion requires service areas and city-specific pricing.
- Fleet operators require owner/driver/dispatcher separation.
- Digital payments require payment intents, webhooks, reconciliation, and payout models.
- GPS tracking requires telemetry ingestion, privacy controls, and realtime transport.
- Insurance requires policy purchase, claim handling, and third-party integrations.
- Local language support requires i18n keys from the beginning.

## Open Questions for Product Owner

- What exact vehicle classes should launch first?
- What are default base fares and per-km rates?
- What is the maximum search radius?
- How many owners should receive a request at once?
- Can a client have more than one active request?
- How long before pending offers time out?
- What cancellation fees apply at each trip stage?
- Is client-to-owner phone number masking required?
- What admin report outcomes are legally/operationally allowed?
- How should cash commission be collected?
- Which SMS and maps providers are available locally?
- Which languages are required for launch?

