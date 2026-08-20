# DEPLOYMENT.md

## Architecture

| Component | Host | Purpose |
|---|---|---|
| Web app (Next.js) | Render (Web Service) | Serves the admin console |
| Database (PostgreSQL) | Neon | Managed Postgres (with PgBouncer pooler) |

- Repo: `https://github.com/dimple0613/360-NFC-Valet-admin` (branch `main`)
- Web app URL: `https://360-nfc-valet-admin.onrender.com`

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon connection string (see below) |
| `JWT_SECRET` | Secret used to sign session cookies |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Super-admin used by the seeder |

Copy `.env.example` to `.env` for local development.

## Local development

```bash
npm install
# 1. start PostgreSQL in Laragon
psql -U postgres -h localhost -c "CREATE DATABASE 360nfc_valet;"
# 2. create schema + seed
npm run db:setup
# 3. run the app
npm run dev
```

Open http://localhost:3000 and sign in with `admin@wewant360.com` / `admin123`.

## Production setup (Render + Neon)

### 1. Neon database

1. Create a project at https://neon.tech → name `360-nfc-valet`, database `360nfc_valet`, region near the Render region.
2. Copy the **Pooled** connection string (host contains `-pooler`), e.g.
   `postgresql://user:password@ep-xxx-pooler.us-east-1.aws.neon.tech/360nfc_valet`
3. Ensure it ends with `?sslmode=require` (append it if not).

### 2. Render web service

1. New Web Service → connect the GitHub repo `360-NFC-Valet-admin` → branch `main`.
2. Settings:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`
   - Node version: 20
3. Environment variables:
   - `DATABASE_URL` = Neon pooled URL
   - `JWT_SECRET` = long random string (`openssl rand -hex 32`)
   - `ADMIN_EMAIL` = `admin@wewant360.com`
   - `ADMIN_PASSWORD` = `admin123`
4. Deploy (manual or auto on push).

### 3. Schema + seed (run once against Neon)

Option A — Render Shell:

```bash
npm run db:setup
```

Option B — locally with the Neon non-pooled connection string:

```bash
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/360nfc_valet?sslmode=require" \
ADMIN_EMAIL="admin@wewant360.com" ADMIN_PASSWORD="admin123" \
npm run db:setup
```

Verify tables in Neon dashboard → **Tables** tab.

### 4. Verify

Open the Render URL → redirected to `/login` → sign in with `admin@wewant360.com` / `admin123`.

## Notes

- **WebSocket (`ws-server.js`)** is a separate Node process; Render does not run it, so live socket features (dashboard live activity, driver updates) won't work. Everything else (CRUD, reports, auth) works.
- **Neon free tier**: 0.5 GB storage; compute auto-suspends after ~5 min idle (first query after idle takes a few seconds). Add `connection_limit=10` to the URL if connection limits are hit.
- **Render free tier**: instance sleeps after 15 min idle. Upgrade to paid plans for production.
- This app's `pg.Pool` (max 10 connections) is a good fit for Neon's PgBouncer pooler.

## Suggested CI/CD (GitHub Actions)

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: 360nfc_valet
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports: ['5432:5432']
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/360nfc_valet
      JWT_SECRET: ci-secret
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run db:setup
      - run: npm run build
```

## Pending decisions

- Monitoring and logging (e.g. Sentry, OpenTelemetry).
- Custom domain / TLS configuration.