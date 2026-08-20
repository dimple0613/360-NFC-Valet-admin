# DATABASE.md - Database Reference

## Overview

- **PostgreSQL 18** (Laragon) on `localhost:5432`, database `360nfc_valet`.
- Client: `pg` (node-postgres) via a `Pool` in `lib/db.js`.
- Connection string from `DATABASE_URL` (`.env`), default `postgresql://postgres@localhost:5432/360nfc_valet`.
- All access happens in `pages/api/*` through `lib/db.js` `query(text, params)` — parameterized SQL only.

## Tables

### `admins`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `full_name` | text | |
| `email` | text UNIQUE | stored lowercase |
| `password_hash` | text | `salt:hash` (scrypt) |

### `properties`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `name` | text UNIQUE | |
| `area` | text | |
| `zones_count` / `slots_count` | int | layout |
| `slug` | text UNIQUE | guest page URL |
| `phone` | text | Module 3 — property contact number shown on the guest offer detail ("Call to reserve") |
| `card_pool` | int | cards assigned |
| `uid_start` | bigint | first card UID (real NFC UIDs exceed int — must stay BIGINT) |

### `zones`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `property_id` | int FK → properties | |
| `code` | text | `A`, `B`, `C` … |
| `slot_count` | int | |

### `drivers`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `valet_id` | text UNIQUE | `VD-xxxx` |
| `full_name`, `initials`, `avatar_color` | text | |
| `email`, `phone`, `pin` | text | 4-digit PIN |
| `property_id` | int FK → properties | |
| `status` | text | `on_shift` / `on_break` / `off_duty` |
| `shift_started_at` | timestamptz | |

### `nfc_cards`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `uid` | text | unique identifier printed on the card |
| `property_id` | int FK → properties | |
| `status` | text | `ready` / `with_guest` / `blocked` |
| `uses_count` | int | lifetime activations |

### `offers`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `property_id` | int FK → properties | |
| `title`, `category`, `description` | text | |
| `price` | numeric | current price |
| `was_price` | numeric nullable | Module 3 — original price (drives the "SAVE %" badge) |
| `rating` | numeric(2,1) nullable | Module 3 — guest rating shown on offer cards |
| `reviews` | int | Module 3 — review count |
| `level` | text nullable | Module 3 — "Level 1", "All-Day", … |
| `opens_at` / `closes_at` | time nullable | Module 3 — operating hours ("Open till 4 PM") |
| `deal_tag` | text nullable | Module 3 — badge label such as "FRIDAY ONLY" |
| `staff_code` | text nullable | Module 3 — secret code used only by `POST /api/public/offer/validate`; never returned by any endpoint |
| `featured` | int nullable | featured slot # |
| `live` / `draft` | boolean | visibility |
| `validates_valet` | boolean | |
| `ends_on` | date nullable | |
| `views_7d` | int | |

### `orders`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `property_id`, `card_id`, `driver_id` | FK | |
| `plate`, `car_make`, `car_model`, `car_color` | text | |
| `zone` | text | zone letter |
| `slot` | int | |
| `status` | text | `active` / `parked` / `retrieving` / `returning` / `returned` |
| `created_at` | timestamptz | drop-off time |
| `dropped_at` | timestamptz nullable | parked time |
| `returned_at` | timestamptz nullable | return time |
| `guest_eta` | timestamptz nullable | Module 3 — when the guest asked the car to be ready (set by `POST /api/public/tap/[uid]`) |

### `validations`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `order_id` | int FK → orders | |
| `offer_id` | int FK → offers (nullable) | |
| `outlet` | text | |
| `qty` | int | |
| `amount` | numeric | AED |
| `created_at` | timestamptz | |

### `password_resets`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `admin_id` | int FK → admins | |
| `token_hash` | text | SHA-256 of the one-time reset token |
| `expires_at` | timestamptz | 1h lifetime |
| `used` | boolean | one-time use |
| `created_at` | timestamptz | |

## Key aggregates used by the API

- **Cars parked (today)** — `COUNT(orders WHERE created_at >= today)`.
- **Avg return time** — `AVG(returned_at - dropped_at)` in minutes, for orders returned today.
- **Overdue** — `COUNT(orders WHERE status IN ('parked','retrieving') AND created_at < now() - interval '2 hours')` (dashboard restricts to today).
- **Outlet spend** — `SUM(validations.amount)` for today.
- **Report row** — per-day `dropOffs` (created_at), `returns` (returned_at), `avgMin`, `overdue` (parked today, never returned), `validations` + `spend`.

## Seeding

- `db/schema.sql` — full schema (idempotent `CREATE TABLE IF NOT EXISTS`).
- `db/seed.js` — checks counts first; seeds admin, 3 properties (+ zones + card pools), 22 drivers, 22 offers, and 7 days of orders + validations (~1,550 orders, ~467 validations).
- `db/reset.js` — drops all tables.
- Seeded super-admin: `admin@wewant360.com` / `admin123` (from `.env`, default `admin123`).

## Notes

- Rows are `RANDOM()`-seeded for demo variety; rerun `npm run db:reset` + `npm run db:setup` for a clean state.
- No migrations framework — schema changes go directly into `db/schema.sql`.
