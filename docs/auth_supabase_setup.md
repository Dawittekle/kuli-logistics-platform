# KULI Supabase Auth Setup

This guide documents the current KULI authentication flow for mobile client/truck-owner accounts and web staff accounts.

## Auth Model

KULI uses Supabase Auth for identity and MongoDB profiles for product roles and account state.

- Supabase stores the login identity and issues the JWT.
- The KULI API verifies the JWT on protected requests.
- `GET /api/v1/me` is the source of truth for routing after login.
- `POST /api/v1/auth/sync-profile` creates or updates public mobile profiles only for `client` and `truck_owner`.
- Staff profiles are provisioned by an admin or bootstrap configuration. They are not publicly registered.

## Mobile Client And Truck-Owner Flow

1. User signs in with Supabase email/password.
2. The mobile app stores the fresh Supabase access token in memory for the API client.
3. The app calls `GET /api/v1/me`.
4. If `/me` returns a client profile, the app opens the client tabs.
5. If `/me` returns a truck-owner profile, the app opens the owner tabs.
6. If `/me` returns `PROFILE_NOT_FOUND` and the Supabase metadata contains a public role, the app calls `POST /api/v1/auth/sync-profile`, then routes by the backend profile.
7. If the account is `admin` or `assistant`, the mobile app blocks access and tells the user to use the web dashboard.

Mobile public signup is limited to:

- `client`
- `truck_owner`

Signup validation:

- Email must be valid.
- Phone must be Ethiopian mobile format: `+251911000000`, `251911000000`, `0911000000`, or equivalent `07...` mobile format.
- Password must have at least 8 characters, one uppercase letter, one lowercase letter, and one number.
- Confirm password must match.

If Supabase requires email confirmation, KULI shows the confirmation-code screen only after signup or an explicit `email not confirmed` login error. It does not resend confirmation emails automatically.

## Password Recovery

Forgot password uses the Supabase recovery flow:

1. User enters their email.
2. Mobile calls `supabase.auth.resetPasswordForEmail(email, { redirectTo })`.
3. User enters the recovery OTP or opens the recovery link.
4. Mobile verifies recovery with `verifyOtp({ type: 'recovery' })` or consumes the recovery deep link.
5. User chooses a new strong password inside KULI.
6. Mobile calls `supabase.auth.updateUser({ password })`.

Signup confirmation OTP and password recovery OTP are handled separately.

## Admin And Assistant Flow

Staff users sign in through the web dashboard, not the mobile app.

1. Staff user signs in with Supabase email/password.
2. The admin app stores the fresh Supabase access token in memory for the API client.
3. The admin app calls `GET /api/v1/me`.
4. `admin` profiles route to `/admin/dashboard`.
5. `assistant` profiles route to `/assistant/dashboard`.
6. `client` and `truck_owner` profiles are blocked from the staff dashboard.
7. Assistants are blocked from admin-only pages by frontend routing and backend RBAC.

## Exact Environment Keys

### API `.env`

```bash
PORT=4000
HOST=127.0.0.1
NODE_ENV=development

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_JWT_MODE=supabase
SUPABASE_JWT_ISSUER=https://your-project-ref.supabase.co/auth/v1
SUPABASE_JWT_AUDIENCE=authenticated
SUPABASE_JWKS_URL=https://your-project-ref.supabase.co/auth/v1/.well-known/jwks.json

MONGODB_URI=mongodb://localhost:27018/kuli
MONGODB_SERVER_SELECTION_TIMEOUT_MS=5000
REDIS_URL=redis://localhost:6380

CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:8081,http://127.0.0.1:8081,http://localhost:19006,http://127.0.0.1:19006
CORS_ALLOW_PRIVATE_NETWORK=true

DEMO_AUTH_ENABLED=false

BOOTSTRAP_ADMIN_SUPABASE_USER_ID=the-supabase-user-uuid-for-first-admin
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BOOTSTRAP_ADMIN_FULL_NAME=KULI Admin
```

### Mobile `.env`

```bash
MOBILE_APP_API_BASE_URL=http://localhost:4000/api/v1
MOBILE_APP_SUPABASE_URL=https://your-project-ref.supabase.co
MOBILE_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
MOBILE_APP_GOOGLE_MAPS_API_KEY=
MOBILE_APP_AUTH_REDIRECT_URL=kuli://auth/callback
MOBILE_APP_PASSWORD_RESET_REDIRECT_URL=kuli://auth/reset-password
```

### Admin `.env`

```bash
ADMIN_APP_API_BASE_URL=http://localhost:4000/api/v1
ADMIN_APP_SUPABASE_URL=https://your-project-ref.supabase.co
ADMIN_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Supabase Dashboard Settings

Check these settings in Supabase:

- Authentication provider: Email enabled.
- Confirm email: ON for production; OFF is acceptable only for local UI exploration.
- Redirect URLs:
  - `kuli://auth/callback`
  - `kuli://auth/reset-password`
  - `http://localhost:8081`
  - `http://127.0.0.1:8081`
  - `http://localhost:19006`
  - `http://127.0.0.1:19006`
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`
- Password reset redirect should match `MOBILE_APP_PASSWORD_RESET_REDIRECT_URL`.
- For production email delivery, configure a custom SMTP provider. Supabase default email has strict rate limits.

## Provisioning Admin Accounts

For the first admin:

1. Create a Supabase Auth user in the Supabase dashboard.
2. Copy the Supabase user UUID.
3. Add these API env values:

```bash
BOOTSTRAP_ADMIN_SUPABASE_USER_ID=<supabase-user-uuid>
BOOTSTRAP_ADMIN_EMAIL=<admin-email>
BOOTSTRAP_ADMIN_FULL_NAME=<admin-name>
```

4. Restart the API.
5. Sign in to the web dashboard with that Supabase account.

The bootstrap creates only the first admin profile if it does not already exist.

## Provisioning Assistant Accounts

After the first admin exists:

1. Create the assistant Supabase Auth user in the Supabase dashboard.
2. Copy the Supabase user UUID.
3. Sign in as admin.
4. Use the admin Users page, or call:

```http
POST /api/v1/admin/users
Authorization: Bearer <admin-jwt>
Content-Type: application/json
```

```json
{
  "supabaseUserId": "<assistant-supabase-user-uuid>",
  "role": "assistant",
  "fullName": "Assistant Name",
  "email": "assistant@example.com",
  "phone": "+251911000000"
}
```

Admins can also provision additional admin users through the same endpoint with `"role": "admin"`.

## Troubleshooting

### Profile Check Failed

Usually means the frontend had a Supabase session but the API request did not include a valid bearer token, or MongoDB has no profile for the Supabase identity.

Check:

- API base URL points to the running API.
- Supabase URL and anon key match the API JWT settings.
- `GET /api/v1/me` receives `Authorization: Bearer <jwt>`.
- MongoDB has a user profile linked to the Supabase user ID.
- Public users have `client` or `truck_owner` metadata if profile sync is expected.

### Login Returns To Login

Check:

- Supabase session exists after sign in.
- API `/me` does not return `401`.
- Admin web accounts are not trying to use the mobile app.
- Client/truck-owner accounts are not trying to use the staff dashboard.

### Email Confirmation Required

If Supabase email confirmation is ON, users must confirm by email link or OTP before normal login. KULI does not automatically resend confirmation emails on every login.

### OTP Not Working

Check:

- Signup confirmation uses `verifyOtp({ type: 'signup' })`.
- Password recovery uses `verifyOtp({ type: 'recovery' })`.
- Codes are not expired.
- Supabase email rate limit has not been exceeded.

### Password Reset Link Not Opening

Check:

- `MOBILE_APP_PASSWORD_RESET_REDIRECT_URL` is set.
- The same URL is allowed in Supabase redirect URLs.
- Expo/web deep link handling is started before testing recovery.

### API Token Not Attached

The mobile and admin apps keep the fresh Supabase access token in memory immediately after login, recovery, startup session load, and auth state changes. If API calls still fail:

- Sign out and sign in again.
- Confirm the API and frontend point to the same Supabase project.
- Confirm `DEMO_AUTH_ENABLED=false` in the API `.env`; frontend demo login controls are intentionally removed.
- Check development-only mobile auth logs while running Expo dev mode. They show auth event, session presence, email, `/me` failure code, profile role, and route decision without logging tokens or passwords.
