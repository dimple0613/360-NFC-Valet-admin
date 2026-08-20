# AGENTS.md

Guidance for AI coding agents working in this repository.

## Commands

```bash
npm run dev          # start dev server
npm run build        # production build (RUN AFTER EVERY CODE CHANGE)
npm run lint         # ESLint
npm run db:setup     # create schema + seed demo data
npm run db:reset     # drop all tables
```

## Conventions

- **Pages Router + plain JavaScript** — never introduce TypeScript.
- **All DB access lives in `pages/api/*`** — pages must not import `lib/db`.
- **No direct `fetch` in pages** — always go through `@/lib/client` (`api()`).
- **Guard every API route** with `withSession` from `@/lib/session` (except `auth/login`, `auth/logout` and the public `public/*` routes that serve the Module 3 guest tap page).
- **Path alias `@/*` maps to the project root** — prefer it over relative imports.
- **Use design tokens** (`--primary`, `--navy-2`, …) from `styles/globals.css`; avoid hard-coded hex.
- Follow existing component style: functional components, `className`-based styling, JSX.
- Do not add comments to code unless asked.

## Database workflow

1. `npm run db:setup` — idempotent; only inserts when tables are empty.
2. To reseed cleanly: `npm run db:reset` then `npm run db:setup`.
3. Start PostgreSQL in Laragon first; `DATABASE_URL` in `.env` (default `postgresql://postgres@localhost:5432/360nfc_valet`).

## Workflow

1. Explore the relevant folders first (`pages`, `components`, `lib`, `db`).
2. Implement the change following the conventions above.
3. Run `npm run build` and fix any errors.
4. If schema/seed logic changed, run `npm run db:reset` + `npm run db:setup`.
5. Smoke-test against `http://localhost:3000` (login: `admin@wewant360.com` / `admin123`).
6. When a task changes features or behavior, update the relevant docs (`.md` files such as `README.md` or `docs/*.md`) to stay in sync.
7. Commit and push when the user asks (remote `origin`, branch `main`) — never commit without an explicit request.
