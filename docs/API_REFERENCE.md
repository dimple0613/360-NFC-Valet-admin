# API_REFERENCE.md

All admin API routes live in `pages/api/*`. They are served at `/api/...` and are guarded by `withSession` (HMAC-signed `session` cookie) unless noted. JSON is returned in the shape documented below; errors use `{ "error": "message" }`.

Browser pages call these through `lib/client.js` (`api()`), which throws `Error` with a `status` property on non-2xx responses.

## Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | none | Body `{ email, password }` → `{ name, email, signedIn }` + sets `session` cookie |
| POST | `/api/auth/logout` | none | Clears the `session` cookie → `{ signedOut: true }` |
| POST | `/api/auth/forgot-password` | none | Body `{ email }` → `{ ok: true }`. In dev also returns `{ resetToken, resetUrl }` because email sending is stubbed |
| POST | `/api/auth/reset-password` | none | Body `{ token, password }` → `{ ok: true }`. Password min 6 chars |
| GET | `/api/auth/sso` | none | OIDC start — sets `sso_state` cookie, redirects to the IdP authorize URL. Falls back to demo sign-in (first admin) when SSO isn't configured |
| GET | `/api/auth/sso/callback` | none | OIDC callback — exchanges `code`, verifies `id_token` against JWKS, issues a session cookie. Redirects to `/dashboard` or `/login?error=…` |

Login returns `401 { error: "Invalid email or password" }` on bad credentials.
Reset returns `400 { error: "Reset link is invalid or has expired" }` for bad/used/expired tokens.

## Dashboard

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/dashboard` | session | KPIs, per-property stats, hourly chart, live activity. Query params: `days` (1/7/30, default 1), `property` (`all` or a property id) |

```jsonc
{
  "date": "2026-08-14T00:00:00.000Z",
  "stats": {
    "carsParked": 248,          // drop-offs in range
    "avgReturnTime": 349,       // minutes
    "offersValidated": 77,
    "outletSpend": 41200,       // AED
    "driversOnShift": 16,
    "driversTotal": 22,
    "overdue": 4                // parked > 2h in range
  },
  "byProperty": [{ "id": 1, "name": "JW Marriott Marquis", "carsToday": 112, "width": 100, "color": "#F4531F", "zones": 4, "status": "Active" }],
  "chart": [{ "label": "8AM", "drop": 12, "ret": 3 }],
  "live": [{ "id": 1, "name": "Ramesh Kumar", "time": "...", "plate": "DXB J 5580", "action": "Car parked", "kind": "parked", "property": "...", "car": "Mercedes G63" }],
  "properties": [{ "id": 1, "name": "...", "area": "..." }]
}
```

When `property` is set, `byProperty` contains only that property, `live` is filtered to it, and the driver KPIs are scoped to that property.

## Locations

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/locations` | session | All properties with zone breakdown + current occupancy |
| POST | `/api/locations` | session | Create property. Body `{ name, area, zones, slots }` → `{ id, name, area, zonesCount, slots }` |

POST also creates the zones and a card pool of `slots * 2`. A duplicate name returns `400 { error: "A location with this name already exists" }`.

## Drivers

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/drivers` | session | All drivers with `today`, `avgMin`, status, property |
| POST | `/api/drivers` | session | Add driver. Body `{ name, email?, phone?, propertyId }` → `{ id, valetId, pin, name }` |
| PATCH | `/api/drivers` | session | Toggle shift. Body `{ id, shift: boolean }` → `{ id, shift }` |

## Cards

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/cards?q=&property=` | session | Pool stats (total/inValet/ready/blocked, per-property) + up to 500 cards with last order |
| POST | `/api/cards` | session | Register batch. Body `{ propertyId, count }` → `{ created, from, to }` |

## Offers

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/offers` | session | All offers with status label/tone |
| POST | `/api/offers` | session | Create offer. Body `{ title, category?, price, desc?, propertyId? }` → `{ id }` |
| PATCH | `/api/offers/[id]` | session | Body `{ live?, featured?, draft? }`. `featured` accepts a slot number `1`/`2` (sets it, clearing the previous holder), `null`/`0`/`false` (clears), or a boolean. → `{ id, live, featured, draft }` |
| DELETE | `/api/offers/[id]` | session | → `{ id, deleted: true }` |

## Reports

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/reports?days=7` | session | Daily rows `{ day, date, dropOffs, returns, avgMin, overdue, validations, spend, isToday }`, oldest → newest. `days` up to 60; optional `property` id filters to one property |
| GET | `/api/reports?from=&to=` | session | Same rows but iterates the exact `YYYY-MM-DD` range (inclusive), oldest → newest. Overrides `days`; both clamped to today |

`days` is clamped to 2–30 (default 7). `from`/`to` are clamped to today and each other.

## Profile

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/me` | session | Current admin → `{ name, email, role }` (drives the sidebar user menu) |
| PUT | `/api/profile` | session | Update profile. Body `{ name, email }` → `{ name, email }` and refreshes the `session` cookie. Rejects duplicate emails (`400`) |
| PUT | `/api/password` | session | Change password. Body `{ current, next }` → `{ ok: true }`. Verifies `current` via `verifyPassword`; `next` min 6 chars. Wrong current → `400 { error: "Current password is incorrect." }` |

## Public guest endpoints (Module 3 — no auth)

These serve the customer mobile-web tap page (`mobile_web/`). CORS is enabled for the configured mobile-web origin via `middleware.js` (see `CORS_ORIGINS`, default `http://localhost:3001`). Preflight `OPTIONS` returns `204`; the `Access-Control-Allow-Origin` header echoes the request origin.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/public/tap/[uid]` | none | Resolve an NFC card UID (text) → `{ card, property, order, offers }`. `order` is the card's latest `active`/`parked`/`retrieving`/`returning` order (or `null`), with the assigned valet. `offers` = live, non-draft offers for the card's property, featured first. Unknown UID → `404 { error: "Card not found" }` |
| POST | `/api/public/tap/[uid]` | none | Bring-my-car. Body `{ minutes }` (5–60, int) → `{ ok, orderId, minutes, eta }`. Sets the card's latest `active`/`parked`/`retrieving`/`returning` order to `status='returning'` and `guest_eta = now() + minutes`. No parked order → `400 { error: "No parked car found for this card" }`. Out-of-range ETA → `400 { error: "ETA must be between 5 and 60 minutes" }` |
| POST | `/api/public/offer/validate` | none | Validate a staff-only offer code. Body `{ offerId, code }` → `200 { ok: true, validated: true }` on match, `403 { ok: false, validated: false, error: "Incorrect staff code" }` otherwise. `code` is compared against the offer's `staff_code`; the code itself is never returned by any endpoint |

```jsonc
// GET /api/public/tap/72100112791
{
  "card": { "uid": "72100112791", "status": "ready", "usesCount": 0 },
  "property": {
    "id": 1, "name": "JW Marriott Marquis", "area": "Business Bay",
    "slug": "jw-marriott-marquis", "city": "Dubai", "phone": "+971 4 414 0000"
  },
  "order": {
    "plate": "DXB F 44556", "carMake": "Mercedes", "carModel": "S-Class", "carColor": "White",
    "zone": "A", "slot": 41, "status": "retrieving", "guestEta": null,
    "driver": { "name": "Suresh Rao", "initials": "SR", "color": "#0C9D61" }
  },
  "offers": [{
    "id": 1, "title": "Friday Brunch at Kitchen6", "category": "Dining", "price": 395,
    "wasPrice": 565, "desc": "...", "featured": 1, "validatesValet": true,
    "rating": 4.7, "reviews": 1240, "level": "Level 1",
    "opensAt": "12:30:00", "closesAt": "16:00:00", "dealTag": "FRIDAY ONLY"
  }]
}
```

## Usage

```js
import { api } from "@/lib/client";

const dash = await api("/api/dashboard");
await api("/api/drivers", { method: "PATCH", body: { id: 4, shift: true } });
```

## Authorization notes

- Every route except `auth/login`, `auth/logout` and the `public/*` guest endpoints returns `401 { error: "Not signed in" }` without a valid `session` cookie.
- Sessions expire after 24h (HMAC-SHA256 signed payload with `exp`).
- Pages catch `401` and `router.replace("/login")`.

## BigInt / card UIDs

- `properties.uid_start` is `BIGINT` and card UIDs are `TEXT` — real NFC UIDs exceed `INT4` (e.g. `72100112791`).
- `lib/uid.js` provides `maxCardUid(propertyId?)` and `nextUidStart(propertyId?)` (BigInt). `pg` returns `bigint` columns as JS strings; JSON cannot serialize `BigInt`, so UID arithmetic always returns `.toString()` in API responses.
