# Architecture

This document describes the high-level architecture of the **360 NFC Valet Admin** console.

## Overview

The admin is a **server-rendered web app (Next.js Pages Router)** with client-side data fetching:

```
Pages (UI) → lib/client (fetch) → pages/api/* → lib/db (PostgreSQL)
```

- **Pages** compose UI and orchestrate state (loading / error / data).
- **`lib/client.js`** is the only place pages call `fetch`.
- **`pages/api/*`** are the backend — all DB access happens here.
- **`lib/session.js`** guards every API route via a signed session cookie.
- **`styles/globals.css`** holds the design system as CSS custom properties.

## Directory Layout

```
admin/
├── pages/
│   ├── login.js               # public — sign in
│   ├── dashboard.js           # A2 overview
│   ├── locations.js           # A3 properties
│   ├── drivers.js             # A4 valet drivers
│   ├── cards.js               # A5 NFC cards
│   ├── offers.js              # A6 offers
│   ├── reports.js             # A7 reports
│   ├── profile.js             # edit profile + change password
│   └── api/
│       ├── auth/login.js      # POST — sets session cookie
│       ├── auth/logout.js     # POST — clears session cookie
│       ├── dashboard.js       # GET
│       ├── locations.js       # GET, POST
│       ├── drivers.js         # GET, POST, PATCH
│       ├── cards.js           # GET, POST
│       ├── offers.js          # GET, POST
│       ├── offers/[id].js     # PATCH, DELETE
│       ├── reports.js         # GET ?days=7 | ?from=&to=
│       ├── me.js              # GET — current admin (sidebar user menu)
│       ├── profile.js         # PUT — update name/email + refresh cookie
│       ├── password.js        # PUT — verify + change password
│       └── public/tap/[uid].js# GET/POST — Module 3 guest tap page (no auth)
├── middleware.js              # CORS for /api/* (mobile-web origin)
├── components/
│   ├── layout/AdminLayout.js  # sidebar shell (shared by all screens)
│   ├── ui.js                  # StatCard, Pill, Badge, SectionTitle, Select
│   ├── DateRangePicker.js     # shadcn-style range picker (react-day-picker)
│   ├── Toast.js               # toast provider + useToast() hook
│   └── icons.js               # inline SVG icons
├── lib/
│   ├── db.js                  # pg Pool + query()
│   ├── auth.js                # scrypt hash/verify, makeValetId, makePin
│   ├── session.js             # sign/verify cookie, withSession guard
│   ├── api.js                 # badRequest/serverError/etc. helpers
│   ├── uid.js                 # BigInt card-UID helpers (maxCardUid, nextUidStart)
│   ├── client.js              # browser api() wrapper (throws on non-2xx)
│   └── useApi.js              # reusable { data, loading, error, reload }
├── db/
│   ├── schema.sql             # tables + indexes
│   ├── seed.js                # idempotent demo seeder
│   └── reset.js               # DROP TABLE
└── styles/globals.css         # design tokens + component styles
```

## Design Rules

1. **All DB access lives in `pages/api/*`.** Pages never import `lib/db`.
2. **No direct `fetch` in pages** — use `api()` from `lib/client.js`.
3. **Every API route is guarded** by `withSession` (except `auth/login`, `auth/logout` and the `public/*` guest endpoints for Module 3).
4. **Design tokens over hex** — reuse `--primary`, `--navy-2`, etc. from `globals.css`.
5. **Path alias `@/*`** maps to the project root (`jsconfig.json`).
6. **Plain JS** — no TypeScript in this project.
7. **Forms use Formik + Yup.** Each form is a `<Formik>` with a Yup `validationSchema`. Field errors render inline as `.field-error` text under each input (`touched[name] && errors[name]`); field markup otherwise matches the design exactly. Forms use `noValidate` so Yup — not browser native validation — drives error messages.
8. **Feedback via toasts.** Use `useToast()` from `components/Toast.js` — `toast.success(msg)` / `toast.error(msg)`. Toasts fire only when an **action completes** (API success / failure); validation is inline, not toasted.
9. **Card UIDs are `BIGINT`/`TEXT`, never `INT`.** Real NFC UIDs exceed 32-bit and JS `Number` precision — always use the BigInt helpers in `lib/uid.js` and return `.toString()` values in JSON.

## Module 3 — Guest Tap Page

The guest mobile web app lives in `../mobile_web` (Next.js, port `3001`). It consumes the public API here:

```
mobile_web (3001) ──GET/POST──▶ /api/public/tap/[uid] ──▶ Postgres
        ▲                              │
        └──── CORS via middleware.js ──┘
```

- `middleware.js` adds `Access-Control-Allow-Origin` (echoes the request origin, allow-list via `CORS_ORIGINS`, default `http://localhost:3001`) and answers `OPTIONS` preflights with `204`.
- `GET /api/public/tap/[uid]` resolves a card UID → `{ card, property, offers }` (live + non-draft, featured first). `POST` flips the card's parked order to `returning` and stamps `guest_eta`.
- The tap page reads the UID from the URL (`/t/<uid>` or `/?uid=<uid>`), offers 6 ETA chips (5–30 min) and shows a live countdown after the request.

## Data Flow

```
┌─────────┐  fetch    ┌────────────┐   JSON   ┌──────────────┐   SQL   ┌──────────┐
│  Page    │ ───────▶ │ lib/client │ ───────▶ │  pages/api/* │ ──────▶ │ Postgres │
└─────────┘           └────────────┘          └──────────────┘         └──────────┘
    ▲   ▲                    ▲                       │
    │   │                    │ signed cookie          │ 401 on missing/invalid
    │   └─ router.replace   │                        ▼
    │        on 401        session.js          JSON response
    └─ loading/error UI
```

1. A page calls `api("/api/...")` inside a `useEffect` (or `useApi`).
2. `api()` attaches `Content-Type: application/json` and throws on non-2xx.
3. The route verifies the session cookie via `withSession`; a 401 redirects to `/login`.
4. `lib/db.js` runs the query; the route returns JSON for the page to render.

## Authentication

- `POST /api/auth/login` verifies `admins.email` + scrypt password hash, then sets an **httpOnly signed cookie** (`lib/session.js`, HMAC-SHA256 of `JWT_SECRET`).
- Every other route wraps its handler with `withSession`, which rejects requests with `401 Not signed in`.
- `POST /api/auth/logout` clears the cookie.

## Database

Schema lives in `db/schema.sql`. Seeding is **idempotent** — `db/seed.js` checks row counts before inserting. Tables: `admins`, `properties`, `zones`, `drivers`, `nfc_cards`, `offers`, `orders` (`guest_eta`), `validations`. See [docs/DATABASE.md](./docs/DATABASE.md).

## Related Docs

- [PROJECT.md](./PROJECT.md) — project overview and implementation status
- [docs/API_REFERENCE.md](./docs/API_REFERENCE.md) — endpoint catalog
- [docs/AUTH_FLOW.md](./docs/AUTH_FLOW.md) — authentication flows
- [docs/DATABASE.md](./docs/DATABASE.md) — schema & data
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) — local dev + production
- [docs/ROLES_AND_PERMISSIONS.md](./docs/ROLES_AND_PERMISSIONS.md) — admin roles
- [docs/TESTING_STRATEGY.md](./docs/TESTING_STRATEGY.md) — test plan
- [docs/ROADMAP.md](./docs/ROADMAP.md) — planned work

## Scaling Notes

- **State:** auth is cookie-based; screens keep their own fetch state via `useApi`. For heavy cross-screen state, add React Context — not needed yet.
- **Theming:** add new tokens as CSS variables in `styles/globals.css`.
- **Testing:** add Jest + React Testing Library when business logic grows (see `docs/TESTING_STRATEGY.md`).
