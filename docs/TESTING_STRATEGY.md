# TESTING_STRATEGY.md

## Current State

**No automated tests exist.** Verification today is:

- `npm run build` — production build (catches compile/import errors).
- `npm run lint` — ESLint.
- Manual smoke tests: login → every screen loads real data → create location / driver / card batch / offer → toggle offer → CSV export → logout redirect.

The seeder also self-verifies by logging row counts after each section.

## Target (per PROJECT.md)

- Unit tests for `lib/` helpers (auth hashing, session signing, duration formatting).
- Integration tests for `pages/api/*` against a real Postgres.
- Component tests for the pages (loading / error / data states).
- End-to-end tests for critical flows (login → dashboard → reports export).

## Proposed Stack

| Layer | Tool | Purpose |
|---|---|---|
| Test runner | Jest (`jest-environment-jsdom`) | Unit + component tests |
| Component | React Testing Library | Page rendering + interactions |
| API integration | Jest + `pg` against a test database | Route handlers |
| E2E | Playwright | Login + critical admin flows |

## Suggested scripts

```json
{
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

## Test plan map

### Unit tests

- `lib/auth.js` — `hashPassword`/`verifyPassword` round-trip; wrong password fails; `makeValetId`/`makePin` format.
- `lib/session.js` — `signToken`/`verifyToken` round-trip; tampered token fails; expired token fails.
- `lib/client.js` — non-2xx throws with `status`; body serialization.
- Dashboard/format helpers — `fmtDuration`, time-ago labels, chart scaling.

### API integration tests

- `auth/login` — valid/invalid credentials; sets cookie; 401 cases.
- Guarded routes return `401` without a session.
- `locations` POST creates property + zones + card pool; duplicate name → 400.
- `cards` POST registers a batch with sequential UIDs.
- `reports` returns `days` rows with correct sums.

### Component tests

- Login — validation, busy state, error banner.
- Dashboard — renders KPI values, chart bars, live activity from mocked fetch.
- Drivers — search filter, shift toggle calls PATCH.
- Cards / Offers / Locations — filter, search, create forms.

### E2E (Playwright)

- Login → dashboard → locations create → reports CSV download.

## CI note

Wire `lint` + `build` (and, once added, `test`) into a GitHub Actions workflow — see `docs/DEPLOYMENT.md` for a template that boots a Postgres service container for integration tests.
