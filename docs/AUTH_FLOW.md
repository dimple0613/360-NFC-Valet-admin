# AUTH_FLOW.md - Authentication Flows

## Current State

**Implemented.** The admin signs in with email + password against the `admins` table and receives a signed, httpOnly session cookie.

## Flow

1. User submits email + password on `/login`.
2. `POST /api/auth/login` looks up `admins` by lowercase email and verifies the scrypt hash (`lib/auth.js` → `verifyPassword`).
3. On success, a **session cookie** is set: an HMAC-SHA256-signed payload `{ adminId, email, name, exp }` (signed with `JWT_SECRET`, 24h lifetime).
4. Every other API route calls `withSession` (`lib/session.js`), which verifies signature + expiry and attaches `req.session`.
5. A missing/invalid/expired session → `401 Not signed in`. Pages catch this and redirect to `/login`.
6. `POST /api/auth/logout` clears the cookie.

## Passwords

- Seeded admin password is hashed with `crypto.scryptSync(password, salt, 64)` and stored as `salt:hash` in `admins.password_hash`.
- `verifyPassword` recomputes the hash and compares with `timingSafeEqual`.

## Session details

- Cookie name: `session`; `HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`.
- Payload is not encrypted (only signed) — no secrets are stored in it.
- `JWT_SECRET` comes from `.env` (falls back to `360nfc-dev-secret` in non-prod).

## Forgot Password

Implemented (dev-complete; email sending is stubbed):

1. User clicks **Forgot password?** on the login screen → `/forgot-password`.
2. `POST /api/auth/forgot-password` looks up the admin email and stores a one-time reset token (SHA-256 hash) in the `password_resets` table with a 1h expiry. The response is always `{ ok: true }` so emails aren't enumerable.
3. **When no `SMTP_HOST` is configured** the response also includes `resetUrl` (shown on the page) because no email is sent — configure SMTP and it emails the link instead.
4. `/reset-password?token=…` collects the new password and calls `POST /api/auth/reset-password`, which validates the token (unused + unexpired), re-hashes the password with scrypt, and marks the token used.

## SSO (OIDC authorization-code flow)

- The **Sign in with SSO** button navigates to `GET /api/auth/sso` (the start endpoint).
- **When `SSO_AUTHORIZE_URL` and `SSO_CLIENT_ID` are configured**, `/api/auth/sso` stores a random `sso_state` cookie and redirects to the identity provider's authorize URL (`response_type=code`, `openid email profile`).
- The IdP redirects back to `GET /api/auth/sso/callback` (`SSO_CALLBACK_URL`, default `http://localhost:3000/api/auth/sso/callback`), which:
  1. validates `state` against the `sso_state` cookie (and clears it),
  2. exchanges `code` for tokens at `SSO_TOKEN_URL`,
  3. verifies the `id_token` signature against the IdP's JWKS (`SSO_JWKS_URL`), the `exp`, `iss` (`SSO_ISSUER`), and `aud` (`SSO_CLIENT_ID`),
  4. matches `email` against the `admins` table and issues a real session cookie.
- Failures redirect to `/login?error=…` and the login page shows a friendly message.
- **When SSO is not configured** (no `SSO_AUTHORIZE_URL`/`SSO_CLIENT_ID`), `/api/auth/sso` falls back to a demo sign-in as the first admin so the flow can be demoed.

## Security notes

- HTTPS required in production (cookie is not marked `Secure`; add it behind TLS).
- Logins are rate-limited only by the app server defaults — consider adding throttling for production.
- Admin password should be rotated from the seeded default before real use.
