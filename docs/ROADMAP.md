# ROADMAP.md

Planned work for the 360 NFC Valet Admin console. Items marked ✅ are complete.

## Phase 1 — Foundation

- ✅ **1. Project scaffold** — Next.js 15 Pages Router + plain JS, design-system CSS, path alias `@/*`.
- ✅ **2. Screens A1–A7** — login, dashboard, locations, drivers, cards, offers, reports from the design spec.

## Phase 2 — PostgreSQL backend

- ✅ **3. Schema** — `db/schema.sql`: admins, properties, zones, drivers, nfc_cards, offers, orders, validations.
- ✅ **4. Seeder** — `db/seed.js` (idempotent, 7 days of orders/validations) + `db/reset.js`.
- ✅ **5. Connection layer** — `pg` Pool in `lib/db.js`, `DATABASE_URL` in `.env`.

## Phase 3 — API + wiring

- ✅ **6. Auth** — `auth/login` + `auth/logout`, scrypt hashing, signed session cookie, `withSession` guard.
- ✅ **7. Dashboard API** — KPIs, per-property, hourly chart, live activity.
- ✅ **8. CRUD APIs** — locations, drivers (+shift), cards (batch), offers (toggle), reports (multi-day).
- ✅ **9. Page wiring** — every page fetches real data with loading / error / empty states and 401 redirect.

## Phase 4 — Hardening

- ⚠️ **10. Automated tests** — strategy documented in `docs/TESTING_STRATEGY.md`; not yet implemented.
- ✅ **11. Forgot password** — `password_resets` table + `/api/auth/forgot-password` + `/api/auth/reset-password` + `/forgot-password` and `/reset-password` pages (email delivery stubbed for a real SMTP provider).
- ✅ **11b. SSO** — real OIDC authorization-code flow (`/api/auth/sso` start + `/api/auth/sso/callback` with JWKS verification). Falls back to a demo sign-in as the first admin until `SSO_*` env vars are set.
- ❌ **12. Role granularity** — single admin today; add roles/multi-tenant later (see `docs/ROLES_AND_PERMISSIONS.md`).
- ❌ **13. Login rate-limiting** — add throttling on `auth/login` for production.

## Phase 5 — Deployment

- ✅ **14. Production build verified** — `npm run build` + `npm run start`.
- ⚠️ **15. Cloud hosting** — template CI in `docs/DEPLOYMENT.md`; Vercel/NEON are the likely choices.
- ❌ **16. Monitoring & logging.**

## Phase 6 — Feature depth

- ❌ **17. Live updates** — poll or WebSocket so the dashboard "live activity" refreshes without reload.
- ❌ **18. Property-level detail view** — drill into a location's zones, drivers and card pool from A3.
- ⚠️ **19. Offer images / banner** — rows show `img` placeholders and the preview banner is a static slot; no upload flow yet (featured drag-and-drop IS implemented).

## Immediate next steps

1. Add Jest + a first integration test for `auth/login` (against a scratch DB).
2. Point `SSO_*` env vars at a real identity provider and set up SMTP for reset emails.
3. Deploy to Vercel with a managed Postgres and set `JWT_SECRET`.
