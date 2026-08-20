# DEPLOYMENT.md

## Current State

- Local development with `npm run dev` against PostgreSQL (Laragon).
- Production build verified locally with `npm run build` + `npm run start`.
- **No cloud deployment configured yet.**

## Environment variables (`.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (default `postgresql://postgres@localhost:5432/360nfc_valet`) |
| `JWT_SECRET` | Secret used to sign session cookies |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Super-admin used by the seeder |

Copy `.env.example` to `.env` and set values before running the seeder.

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

## Production

1. Provision a managed PostgreSQL (e.g. Neon, Supabase, Railway, RDS) and set `DATABASE_URL`.
2. Run the schema + seed against it once: `npm run db:setup`.
3. Build and start:

```bash
npm run build
npm run start
```

4. Put it behind TLS (cookie is `HttpOnly; SameSite=Lax`; consider `Secure` behind HTTPS).

## Deploy target (Next.js hosting)

| Host | Notes |
|---|---|
| Vercel | Native Next.js support; `npm run build` runs on deploy; add `DATABASE_URL` + `JWT_SECRET` as env vars |
| Railway / Render | Node server — build with `npm run build`, start with `npm run start` |
| Docker | `node:20-alpine`, copy `.next` + `package.json`, run `npm run start` |

> The Pages Router API routes run as Node serverless functions on Vercel; a connection pool created at module scope is acceptable for low traffic but a connection pooler (e.g. PgBouncer) is recommended as traffic grows.

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

- Cloud host for the web app (Vercel vs VPS vs container platform).
- Managed Postgres provider + pooler for scale.
- Monitoring and logging (e.g. Sentry, OpenTelemetry).
- Custom domain / TLS configuration.
