# Security and Access Control

Security must be enforced on the backend. Frontend role-based screens are helpful for usability, but they are not enough to protect the system.

## Authentication

- Use Supabase Auth or another JWT/OIDC-compatible provider.
- Use short-lived access tokens and refresh tokens.
- Store passwords only as salted hashes if in-app passwords are used.
- Require stronger controls for admin accounts, preferably MFA.

## Authorization

The platform uses role-based access control.

| Resource | Admin | Truck Owner | Client | Call-Center Assistant |
| --- | --- | --- | --- | --- |
| Own profile | Read/update | Read/update | Read/update | Read/update |
| Manage users | Full | No | No | Limited assisted actions |
| Register vehicle | View/approve | Create own | No | Create on behalf |
| Verify vehicle | Full | View own status | No | View/support |
| Create request | No | No | Create own | Create on behalf |
| Read requests | Global | Assigned/inbox | Own | Assisted clients |
| Update request status | Global | Assigned requests | Limited cancellation | Assisted updates |
| Tickets | Global | No | Own | Assigned |
| Ratings | Audit | Own received | Create/view own | No |
| Reports | Investigate/resolve | Respond if subject | Create/view own | Create on behalf |
| System config | Full | No | No | No |
| Audit logs | Read by policy | No | No | No |

## Audit Logging

Log critical actions:

- Login failures
- Role changes
- Vehicle verification decisions
- Request assignment and cancellation
- Admin configuration changes
- Report decisions
- Sensitive account updates

Each audit event should include `actorId`, `action`, `resourceType`, `resourceId`, `timestamp`, IP address, user agent, and useful metadata.

## Data Protection

- Use HTTPS for all external traffic.
- Enable database encryption at rest.
- Minimize personally identifiable information.
- Add deletion or anonymization workflows for user data.
- Keep secrets out of the repository.

