# Deployment and DevOps

This document defines environment setup, deployment strategy, CI/CD, secrets, monitoring, backups, and operational readiness.

## Environments

Use at least three environments:

- `local`: developer machine, local MongoDB/Redis, mocked external providers where useful.
- `staging`: production-like infrastructure with test provider credentials and seeded demo data.
- `production`: real user data, strict secrets, backups, monitoring, and access controls.

## Local Development

Recommended local services:

- MongoDB via Docker Compose.
- Redis via Docker Compose if queues are enabled.
- Supabase project or local Supabase if team chooses.
- Mock maps/SMS/email/push providers for most development.

Each app should include `.env.example`.

API required environment variables:

```text
NODE_ENV=
PORT=
MONGODB_URI=
REDIS_URL=
SUPABASE_URL=
SUPABASE_JWT_SECRET= or SUPABASE_JWKS_URL=
OBJECT_STORAGE_PROVIDER=
OBJECT_STORAGE_BUCKET=
MAPS_PROVIDER=
MAPS_API_KEY=
SMS_PROVIDER=
SMS_API_KEY=
EMAIL_PROVIDER=
EMAIL_API_KEY=
PUSH_PROVIDER=
LOG_LEVEL=
CORS_ORIGINS= # comma-separated admin/mobile web origins, for example localhost/127.0.0.1 Vite and Expo web ports
```

## Deployment Strategy

Recommended first deployment:

- API as a containerized Node.js service.
- Admin app as static web app or server-rendered app depending on framework.
- Mobile app distributed through Expo/EAS or native store builds.
- MongoDB hosted through MongoDB Atlas or equivalent managed service.
- Redis hosted managed service when background jobs are productionized.
- Object storage through Supabase Storage, S3, or S3-compatible provider.

## CI/CD Pipeline

Minimum CI stages:

1. Install dependencies from lockfile.
2. Lint.
3. Typecheck.
4. Unit tests.
5. Integration tests.
6. Build API.
7. Build admin.
8. Validate mobile bundle/build.
9. Run migration/seed dry-run for staging.

Deployment pipeline:

- Deploy to staging on merge to main.
- Run smoke tests.
- Promote production manually.
- Support rollback to previous API/admin image.

## Database Migrations and Seeds

Even with MongoDB, use migration scripts for:

- Index creation.
- Seed vehicle classes.
- Seed default pricing rule.
- Create first admin profile metadata.
- Add new enum fields or backfill snapshots.

Migration rules:

- Idempotent.
- Logged.
- Run before app deployment when compatible.
- Never rewrite historical quote snapshots without explicit migration notes.

## Secrets Management

Do not commit secrets. Use:

- Platform environment variables for simple deployments.
- Cloud secrets manager for production.
- Separate credentials per environment.
- Key rotation plan for provider API keys.

Production secrets access should be limited to maintainers who need it.

## Monitoring and Logging

Backend must emit structured logs:

- request id
- user id if available
- route
- status code
- latency
- error code
- environment

Metrics to track:

- API latency p50/p95/p99.
- API error rate.
- Quote creation count.
- Search empty-result rate.
- Request acceptance rate.
- Cancellation rate.
- Offer timeout rate.
- Notification failure rate.
- File upload failure rate.
- Admin decision volume.
- Payment disputes.

Recommended tools:

- Sentry or equivalent for errors.
- OpenTelemetry-compatible tracing later.
- Provider-specific dashboards for MongoDB/Redis.

## Alerts

Initial alerts:

- API high 5xx error rate.
- API latency above target.
- MongoDB connection failure.
- Queue failure/dead-letter growth.
- Notification dispatch failure spike.
- File storage errors.
- Suspicious admin login pattern.
- High payment dispute spike.

## Backup and Recovery

Backups:

- Managed MongoDB daily snapshots minimum.
- Point-in-time recovery if available.
- Object storage lifecycle and retention policy.
- Export critical pricing/rule configuration.

Recovery requirements:

- Document restore process.
- Test restore in staging periodically.
- Keep audit logs retained according to policy.

## Rollback Strategy

- Use immutable API/admin builds.
- Keep previous production image available.
- Migrations must be backward compatible when possible.
- If a migration is destructive, require manual approval and rollback plan.
- Mobile clients can lag behind API, so API changes must be backward compatible within a release window.

## Deployment Readiness Checklist

- [ ] Production MongoDB configured.
- [ ] Production object storage configured.
- [ ] Supabase production project configured.
- [ ] Production CORS allowlist configured.
- [x] Rate limiting enabled.
- [x] Security headers enabled.
- [x] Logging configured.
- [ ] Error monitoring configured.
- [ ] Backups enabled.
- [x] Admin seed/provisioning complete.
- [x] Vehicle classes seeded.
- [x] Active pricing rule seeded.
- [x] Smoke tests pass.
- [ ] Rollback procedure documented.

Local release gate commands:

```bash
npm run lint
npm run typecheck
npm test
npm run smoke:critical
npm run verify:startup
```

Demo data can be upserted into the configured MongoDB with:

```bash
npm run seed:demo
```

## Staging Demo Data

Staging should include:

- Demo client.
- Demo truck owner.
- Approved vehicle near Addis Ababa center.
- Pending vehicle for verification demo.
- Active pricing rule.
- Sample request history.
- Sample report.
- Sample ticket.
