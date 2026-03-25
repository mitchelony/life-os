# Working State

This file is the compact handoff for new threads.

## Active Repo

- Only use `/Users/MAC/GitHub/life-os`.
- Ignore the old iCloud-backed repo at `/Users/MAC/Documents/GitHub/life-os`.

## Current Product State

- The app is single-user and private.
- Hosted Supabase is the active database and auth target.
- The frontend prefers API-backed persistence for:
  - dashboard
  - quick add
  - accounts
  - debts
  - obligations
  - settings/bootstrap
  - roadmap and strategy
- Browser storage is still used as a mirror or fallback, not as the main saved truth.

## Auth State

- Supabase email/password auth is supported.
- Supabase Google OAuth is supported.
- Auth callback route: `/auth/callback`
- First successful auth returns to `/`, then the home gate decides:
  - incomplete onboarding -> `/settings`
  - completed onboarding -> `/dashboard`
- API-backed onboarding state is the source of truth for that decision.
- Generic local setup persistence must not mark onboarding complete on its own.
- Logout should always return to `/login`.
- Browser auth validation should use `http://localhost:3000` or `http://localhost:3001`, not `127.0.0.1`, because API CORS is scoped to explicit localhost origins.

## Dashboard UX State

- The dashboard has been intentionally simplified.
- Primary content should focus on:
  - safe-to-spend number
  - what matters next
  - top actions
  - compact weekly strip
- Do not let it drift back into a dense reporting page.
- Authenticated app pages should not flash `sampleDashboard` content before real local/API data hydrates.

## Roadmap UX State

- Roadmap is a cash-flow-first planning surface.
- The `Focus / Goals / Strategy` toggle must remain visible.
- Strategy JSON input must remain accessible in `Strategy` mode.
- The page should feel centered and full, not sparse.
- Secondary detail belongs lower on the page, not above the main decision content.

## Hosted Supabase Setup Notes

- Docs and examples should assume hosted Supabase first.
- Local Supabase is optional.
- If using the Supabase pooler, Postgres usernames must be `postgres.<project_ref>`.
- Use `postgresql+psycopg://...?...sslmode=require` for Postgres env URLs.
- Backend CORS should allow:
  - `http://localhost:3000`
  - `http://localhost:3001`
- `SUPABASE_URL`, `DATABASE_URL`, and `SUPABASE_DB_URL` must all target the same hosted project.
- API startup now fails fast if Supabase auth and database env vars point at different project refs.
- The active hosted `life-os` project schema is currently clean:
  - owner-scoped uniqueness exists for `app_settings`, `profiles`, `onboarding_state`, `merchants`, and `income_sources`
  - the last live blocker came from local env drift, not from current hosted schema drift
- Any hosted validation pass that creates test users or owner-scoped rows must delete them before the pass is considered complete.
- Hosted cleanup is required even for throwaway Playwright or auth-flow users.

## Backend Stability Notes

- Onboarding/profile bootstrap now tolerates duplicate historical owner rows instead of crashing with `500`.
- Canonical owner-row selection prefers:
  - `id = owner_id`
  - then earlier `created_at`
  - then lower `id`
- Regression tests cover duplicate `profiles` and duplicate `onboarding_state` rows.

## Verification Commands

Web tests:

```bash
cd /Users/MAC/GitHub/life-os
source ~/.nvm/nvm.sh
nvm use 20
npm --workspace apps/web run test
```

Focused onboarding/local-state web tests:

```bash
cd /Users/MAC/GitHub/life-os
source ~/.nvm/nvm.sh
nvm use 20
npm --workspace apps/web run test -- lib/onboarding.test.ts lib/auth.test.ts lib/local-state.test.ts
```

Web typecheck:

```bash
cd /Users/MAC/GitHub/life-os
source ~/.nvm/nvm.sh
nvm use 20
npm --workspace apps/web run typecheck
```

API tests:

```bash
cd /Users/MAC/GitHub/life-os/apps/api
source ../../.venv/bin/activate
python3 -m pytest
```

## Known Next Steps

- Do a Playwright validation pass for auth:
  - sign up
  - sign in
  - Google redirect start
  - OAuth callback completion
  - onboarding completion
  - logout
- Validate full hosted flow with the correct `life-os` database credentials in repo `.env`:
  - sign back in
  - quick add
  - roadmap strategy save/load
- Keep repo docs aligned with real hosted-project behavior after each substantial pass.
- Keep polishing primary surfaces around their core question instead of adding more panels.
- Keep local setup mirroring and API-backed onboarding state separate so fresh-session routing stays consistent.
