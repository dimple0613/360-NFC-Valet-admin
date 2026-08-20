# ROLES_AND_PERMISSIONS.md

## Current State

There is a single role: **Super Admin**.

| Role | Purpose |
|---|---|
| `admin` | Full access to every screen and API route |

Roles are stored in the `admins` table (the `email` + `password_hash` authenticate the admin). There is no role column yet — the console is single-tenant / single-admin.

## How authorization works

- `POST /api/auth/login` authenticates the admin and sets a signed `session` cookie.
- Every API route (except `auth/login`, `auth/logout`) is wrapped with `withSession` from `lib/session.js`.
- `withSession` verifies the cookie signature + expiry; failure → `401 Not signed in`.
- All authorization is **server-side** — pages never gate on client-side state alone.

## Screen access

All screens assume an authenticated session; a `401` on any data fetch redirects to `/login`:

| Screen | Data route | Access |
|---|---|---|
| Dashboard | `/api/dashboard` | admin |
| Locations | `/api/locations` | admin |
| Drivers | `/api/drivers` | admin |
| Cards | `/api/cards` | admin |
| Offers | `/api/offers` | admin |
| Reports | `/api/reports` | admin |

## Planned

- A `role` column on `admins` (`super_admin` / `ops` / `viewer`) with fine-grained permission keys (e.g. `locations.manage`, `cards.register`, `reports.export`).
- Multi-tenant isolation (each property owned by a company).
- Forgot-password / admin invite flows.
