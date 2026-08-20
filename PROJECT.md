# PROJECT.md - Project Overview

## Project Overview

360 NFC Valet Admin is the **Super Admin — Valet Company Console**: a web dashboard for running every property, driver and NFC card in the 360 NFC Valet system. It is built with Next.js (Pages Router), plain JavaScript, and PostgreSQL.

**Status: Implemented** — the console is fully functional and backed by a real PostgreSQL database with 7 days of seeded operational data.

## Project Goals

- Run every property, driver and NFC card from one console.
- See the day's numbers (cars in/out, return times, validations, outlet spend) as they happen.
- Create locations, drivers, card batches and offers end-to-end.
- Export reporting data for weekly business reviews.

## Target Users

- Super admins (operations) — full access to all screens.
- Hotel operations teams — day-to-day monitoring via the dashboard.

## Core Features

- **Sign in** — email + password (scrypt-hashed), httpOnly session cookie.
- **Dashboard (A2)** — KPI cards (cars parked, avg return time, offers validated, drivers on shift), hourly drop-offs/returns chart, per-property breakdown, live activity feed.
- **Locations (A3)** — properties with zones + slot occupancy; create new locations (auto card pool + slug + zones).
- **Drivers (A4)** — searchable/filterable list with per-driver today/avg-return metrics; add drivers (auto VD-ID + PIN); start/end shift.
- **Cards (A5)** — per-property pool stats, searchable card ledger with last order, register card batches.
- **Offers (A6)** — filterable offers list, live/draft/featured toggles, create & publish offers, guest-page preview.
- **Reports (A7)** — daily table (drop-offs, returns, avg return, overdue, validations, outlet spend), period totals, CSV export, 7/14/30-day ranges.

## Application Structure

Follows a **Pages Router** layout with a clear backend split:

```
pages/          screens + API routes (pages/api/*)
components/     shared UI (AdminLayout, ui.js, icons.js)
lib/            db, auth, session, api helpers, client fetch, useApi hook
db/             schema.sql + seed.js + reset.js
styles/         design system (globals.css)
```

- **Pages** render UI and fetch via `lib/client.js`.
- **`pages/api/*`** is the only place that talks to PostgreSQL (`lib/db.js`).
- **`lib/session.js`** guards all routes with a signed session cookie.

## Authentication Requirements

- Email + password login for a single super-admin.
- Passwords hashed with `crypto.scryptSync` (salt:hash stored in `admins.password_hash`).
- Session = HMAC-SHA256 signed cookie (`session`), verified on every API request by `withSession`.
- 24h expiry; logout clears the cookie.

**Status: Implemented**

## Roles and Permissions

- **Super Admin** — the only role. Full access to all screens and API routes.
- Authorization is enforced server-side via `withSession` on every route (except `auth/login`, `auth/logout`). A missing/invalid session returns `401`.

## UI Requirements

- Design tokens as CSS variables (`--primary`, `--navy-2`, …) in `styles/globals.css`.
- Font Plus Jakarta Sans (loaded in `pages/_document.js`).
- Loading, empty, and error states on every data screen.
- Responsive grid for the KPI cards.

**Status: Implemented**

## Security Requirements

- No passwords or secrets committed (`.env` gitignored; `.env.example` is the template).
- scrypt password hashing (never plaintext).
- Server-side auth on all API routes.
- SQL uses parameterized queries via `pg` (no string interpolation).
- Prepared-statement-friendly `$n` placeholders throughout.

**Status: Implemented**

## Testing Requirements

- Build + lint gate (`npm run build`, `npm run lint`).
- Manual smoke tests: login → every screen → create/update flows → CSV export.
- Seeder sanity checks (row counts for properties, cards, drivers, orders, offers, validations).

**Status: Smoke-tested end-to-end.** Automated tests are planned (see `docs/TESTING_STRATEGY.md`).

## Deployment Requirements

- Local dev: PostgreSQL (Laragon) + `npm run dev`.
- Production: `npm run build` + `npm run start`, with `DATABASE_URL` pointing at a managed Postgres.
- See `docs/DEPLOYMENT.md`.

**Status: Local production build verified.**

## Decisions Required

- Multi-tenant support (multiple companies vs single super-admin).
- Forgot-password / password reset flow.
- SSO (the login screen shows a "Sign in with SSO" button — not wired).
- Deployment host (Vercel / VPS) and managed Postgres provider.
- Monitoring and logging strategy.

---

## Related Docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) — folder structure, data flow, conventions
- [docs/API_REFERENCE.md](./docs/API_REFERENCE.md) — endpoint catalog
- [docs/AUTH_FLOW.md](./docs/AUTH_FLOW.md) — authentication flows
- [docs/DATABASE.md](./docs/DATABASE.md) — schema & data
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) — local dev + production
- [docs/ROLES_AND_PERMISSIONS.md](./docs/ROLES_AND_PERMISSIONS.md) — admin roles
- [docs/TESTING_STRATEGY.md](./docs/TESTING_STRATEGY.md) — test plan
- [docs/ROADMAP.md](./docs/ROADMAP.md) — planned work

## Implementation Status (Current State)

> This section tracks how far the codebase matches the specification above.

### Legend

- ✅ **Done** — implemented and functional
- ⚠️ **Partial** — partially implemented
- ❌ **Missing** — not implemented / deviates from spec

### Screens

| Requirement | Status | Notes |
|---|---|---|
| Login (A1) | ✅ | Real auth, error + busy states |
| Dashboard (A2) | ✅ | Live KPIs, chart, by-property, live activity |
| Locations (A3) | ✅ | List + create (zones, slots, card pool) |
| Drivers (A4) | ✅ | Search/filter, add, shift toggle |
| Cards (A5) | ✅ | Pool stats, search, batch registration |
| Offers (A6) | ✅ | Filters, live toggle, create & publish |
| Reports (A7) | ✅ | Daily table, period totals, CSV export |

### API

| Requirement | Status | Notes |
|---|---|---|
| `auth/login` + `auth/logout` | ✅ | Session cookie |
| `dashboard` | ✅ | Stats, byProperty, chart, live |
| `locations` (GET/POST) | ✅ | Create property + zones + cards |
| `drivers` (GET/POST/PATCH) | ✅ | Add + shift toggle + aggregates |
| `cards` (GET/POST) | ✅ | Stats + search + batch register (BigInt UIDs) |
| `offers` (GET/POST) + `offers/[id]` (PATCH/DELETE) | ✅ | Toggle live/featured |
| `reports` (GET) | ✅ | 7/14/30-day daily table + `from`/`to` |
| `me` / `profile` / `password` | ✅ | Sidebar user menu + edit profile + change password |
| `public/tap/[uid]` (GET/POST) | ✅ | Module 3 guest tap page (no auth, CORS)

### Database

| Requirement | Status | Notes |
|---|---|---|
| Schema (`db/schema.sql`) | ✅ | 8 tables + indexes |
| Seeder (`db/seed.js`) | ✅ | Idempotent, 7 days of history |
| Reset (`db/reset.js`) | ✅ | Drop all |
| Seed admin login | ✅ | `admin@wewant360.com` / `admin123` |

### Auth & Security

| Requirement | Status | Notes |
|---|---|---|
| scrypt password hashing | ✅ | `lib/auth.js` |
| Signed session cookie | ✅ | `lib/session.js` HMAC-SHA256 |
| `withSession` route guard | ✅ | All routes except auth + `public/*` |
| `middleware.js` CORS | ✅ | `/api/*` for mobile-web origin |
| Parameterized SQL | ✅ | `$n` placeholders only |

### UI

| Requirement | Status | Notes |
|---|---|---|
| Design tokens | ✅ | `styles/globals.css` |
| Loading / empty / error states | ✅ | Every data screen + retry |
| Responsive KPI grid | ✅ | `grid-4` collapses on mobile |
| SSO button | ⚠️ | Visible but not wired |

### Testing & Deployment

| Requirement | Status |
|---|---|
| `npm run build` | ✅ |
| `npm run lint` | ✅ |
| Smoke tests (login → screens → writes → CSV) | ✅ |
| Automated unit/integration tests | ❌ |
| Production hosting | ⚠️ Local `next start` verified; cloud pending |

## Known Deviations

1. **SSO button** is decorative — no SSO backend configured.
2. **Demo numbers** are seeded relative to "today" — the date label updates automatically; the left-hand login stats are static marketing copy.
3. **One admin role only** — multi-tenant/role granularity is future work.

---

## Module 3 — Customer Tap Page (`../mobile_web`)

**Status: Implemented (v1).** Guest-facing mobile web app, no install — an NFC-tagged card opens `https://<host>/t/<card-uid>` on the guest's phone.

- **Mobile web** (`../mobile_web`, Next.js, port `3001`): hotel banner + card chip, **Bring my car** with 6 ETA chips (5–30 min), live countdown after request, hotel offers (featured boxes first + category filter). Reads the UID from the URL path or `?uid=`.
- **Public API** (`/api/public/tap/[uid]`, GET/POST): resolves card → property + live offers; POST flips the card's parked order to `returning` and stamps `guest_eta = now + minutes`. Exempt from `withSession` (deliberate, see `AGENTS.md`).
- **CORS** (`middleware.js`): `/api/*` echoes `Access-Control-Allow-Origin` for allow-listed origins (`CORS_ORIGINS`, default `http://localhost:3001`) and answers `OPTIONS` preflight with `204`.
- **Schema**: `orders.guest_eta TIMESTAMPTZ` added for the countdown/ETA.

### Card UID overflow fix

Real NFC UIDs (e.g. `72100112791`) exceed `INT4`. Fixed by `properties.uid_start BIGINT` (card UIDs stay `TEXT`) and BigInt arithmetic in `lib/uid.js` (`maxCardUid`, `nextUidStart`) used by the locations/cards APIs. `pg` returns `bigint` as strings; responses always `.toString()`. Verified end-to-end with a `72100112791` card (register batch, new location, pool expansion, tap lookup all work).
