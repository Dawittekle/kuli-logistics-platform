# Security Considerations

KULI handles personal data, vehicle documents, location data, messages, payment records, and admin decisions. Security must be designed into the first implementation.

## Security Principles

- Never trust client-provided role or account status.
- Use Supabase for credential security.
- Enforce authorization server-side.
- Store the minimum sensitive data required.
- Encrypt data in transit.
- Protect file uploads and signed URLs.
- Audit privileged and business-critical actions.
- Fail closed for admin/security actions when audit or authorization checks fail.

## Authentication

- Supabase Auth issues access and refresh tokens.
- API verifies JWT on every protected request.
- Staff accounts should require stronger authentication where possible.
- Session expiration and refresh should be handled by Supabase clients.
- Backend should not store passwords.

## Authorization

Implement RBAC with resource ownership checks.

Examples:

- Client can read own request.
- Truck owner can read offers assigned to their vehicle.
- Assistant can access assigned tickets and assisted booking records.
- Admin can access operational records.
- Staff file access must be audited.

Do not rely on frontend hiding controls.

## Account Status Enforcement

`suspended`, `banned`, or `deleted` users:

- May authenticate with Supabase.
- Must be blocked from business commands.
- May be allowed limited read access to support/account status information.

## Sensitive Data

Sensitive fields:

- Phone numbers.
- Email addresses.
- Physical addresses.
- Pickup/destination locations.
- Vehicle documents.
- Identity documents.
- Message history.
- Payment disputes.
- Reports and evidence.

Protection:

- TLS for all traffic.
- Database encryption at rest through managed provider.
- Field-level encryption for high-sensitivity document numbers if stored.
- Avoid storing national ID numbers unless required.
- Use signed URLs for private files.

## File Upload Security

Controls:

- Restrict MIME types.
- Restrict file size.
- Validate extension and MIME where possible.
- Reject empty files.
- Store outside MongoDB.
- Use random storage keys.
- Do not expose storage bucket publicly.
- Expire signed URLs.
- Audit admin/staff document access.

## Admin Security

Admin actions must:

- Require admin role.
- Require reason for destructive or punitive decisions.
- Write audit log.
- Be protected against CSRF if cookie auth is introduced.
- Be rate limited for sensitive endpoints.

High-risk admin actions:

- Creating staff user.
- Suspending/banning user.
- Approving/rejecting vehicle.
- Changing pricing rules.
- Resolving payment disputes.
- Resolving reports.
- Viewing identity documents.

## API Security

- Use Helmet/security headers.
- Strict CORS allowlist.
- Rate limit auth/profile sync, quotes, messages, reports, and uploads.
- Validate all request bodies.
- Sanitize text fields displayed in admin/mobile.
- Use request size limits.
- Use idempotency for retry-prone commands.
- Do not expose stack traces in production.

## Location Privacy

- Only request participants and authorized staff can view trip locations.
- Owner standby/current location should be public only in approximate/candidate form before a request is accepted.
- Avoid exposing exact owner location to clients before selection unless necessary.
- Future GPS telemetry must include privacy retention rules.

## Messaging Safety

- Store message history by request.
- Escape/sanitize text when rendering.
- Rate limit sends.
- Allow reporting abusive communication.
- Consider moderation tools in future.

## Payment and Dispute Security

- Owner payment confirmation must require completed trip.
- Client dispute must be linked to request/payment.
- Admin payment adjustment must be audited.
- Digital payment future must use provider webhooks with signature verification.

## Audit Logging

Audit:

- Staff login.
- Role/account status changes.
- Vehicle verification decisions.
- Pricing changes.
- Request acceptance/cancellation.
- Payment confirmation/dispute/resolution.
- Report resolution.
- Sensitive file access.

Audit logs should be append-only at application level and protected from regular deletion.

## Abuse and Fraud Risks

Risks:

- Fake truck owner documents.
- Fake client requests.
- Rating manipulation.
- Owners accepting then cancelling.
- Clients filing malicious reports.
- Spam messages.
- Unauthorized staff access.

Mitigations:

- Manual verification.
- Rating/report anomaly review.
- Visibility penalty for unresolved disputes.
- Account sanctions.
- Rate limits.
- Audit trails.

## Security Review Checklist

- [ ] JWT verification cannot be bypassed.
- [ ] Role is loaded from backend profile.
- [ ] Staff self-registration blocked.
- [ ] Suspended/banned users blocked from commands.
- [ ] Vehicle documents private by default.
- [ ] File signed URLs expire.
- [ ] Admin actions require reason and audit.
- [ ] Pricing changes audited.
- [ ] Accept request is concurrency-safe.
- [ ] Message/report text sanitized.
- [ ] Rate limits enabled.
- [ ] Production secrets not committed.
- [ ] CORS restricted.
- [ ] Errors do not leak internals.

