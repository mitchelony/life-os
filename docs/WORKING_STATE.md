# Working State

This file is the compact handoff for new threads.

## Active Repo

- Only use `/Users/MAC/GitHub/life-os`.
- Ignore the old iCloud-backed repo at `/Users/MAC/Documents/GitHub/life-os`.

## Current Product State

- The app is single-user and private.
- Hosted Supabase is the active database and auth target.
- Production deployment target is:
  - Vercel for `apps/web`
  - Render for `apps/api`
  - hosted Supabase for Postgres and Auth
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
- Production auth callback URLs should come from `NEXT_PUBLIC_APP_ORIGIN`, not from a LAN browser origin.
- First successful auth returns to `/`, then the home gate decides:
  - incomplete onboarding -> `/settings`
  - completed onboarding -> `/dashboard`
- API-backed onboarding state is the source of truth for that decision.
- Generic local setup persistence must not mark onboarding complete on its own.
- Logout should always return to `/login`.
- Browser auth validation should use `http://localhost:3000` or `http://localhost:3001`, not `127.0.0.1`, because API CORS is scoped to explicit localhost origins.
- Phone or LAN auth testing needs extra hosted config:
  - add the exact LAN callback URL, for example `http://192.168.1.162:3000/auth/callback`, to Supabase Auth redirect URLs
  - add the exact LAN origin, for example `http://192.168.1.162:3000`, to API `CORS_ALLOWED_ORIGINS`
- If hosted Supabase does not allow the exact LAN callback URL, OAuth will often bounce back to the project's default site URL, which may still be `http://localhost:3000`.
- `npm run dev:api` now binds to `0.0.0.0:8000` by default so phone-based onboarding checks can reach the backend over LAN.
- Browser-aware localhost/LAN API rewriting is a local-development convenience only and should not be relied on in production.
- The `/login` screen now uses a mobile form-first layout:
  - brand header
  - short auth copy
  - sign in / create account switch
  - fields and primary action
  - social sign-in
  - compact supporting preview below
- Do not let the mobile auth screen drift back into a tall hero-first layout.
- Mobile app navigation should preserve desktop capability parity:
  - every desktop destination must remain reachable from mobile
  - the mobile menu should expose all app pages, not just overflow pages
  - logout must be reachable on mobile without hunting through settings
  - route access should not dead-end on mobile-only shells
- The mobile menu sheet should be touch-scrollable on iPhone Safari and leave enough bottom padding to clear the fixed bottom nav.
- Settings should always expose a direct logout action, including on mobile.
- Signed-in recovery states must also expose logout:
  - the `/` home gate error state should never trap a signed-in mobile user with only `Retry check`

## Dashboard UX State

- The dashboard has been intentionally simplified.
- Primary content should focus on:
  - safe-to-spend number
  - what matters next
  - top actions
  - compact weekly strip
- Do not let it drift back into a dense reporting page.
- Authenticated app pages should not flash `sampleDashboard` content before real local/API data hydrates.

## Accounts UX State

- The Accounts page is now the control surface for account balances, not just a read-only summary.
- You can:
  - add accounts
  - edit name, institution, type, and balance
  - remove unlinked accounts
- Account renames should update name-linked references in:
  - transactions
  - obligation linked accounts
  - expected income linked accounts
- Account deletion should stay conservative:
  - if an account still has linked data, do not silently let the page orphan those references

## Tasks UX State

- Tasks should stay derived from obligations, debt minimums, and expected income.
- The user should still be able to manage that list:
  - add manual tasks
  - edit derived task wording, due dates, priority, and notes through overrides
  - mark tasks done or reopen them
  - hide derived tasks and restore them later
- Managed task state is currently local-first:
  - it lives in browser setup storage as `manualTasks` and `taskOverrides`
  - it should survive onboarding saves and API dashboard/setup refreshes
- The Tasks page is now the control surface for that behavior, not just a read-only mirror of dashboard top actions.

## Roadmap UX State

- Roadmap is a cash-flow-first planning surface.
- The `Focus / Goals / Strategy` toggle must remain visible.
- Strategy JSON input must remain accessible in `Strategy` mode.
- The page should feel centered and full, not sparse.
- Secondary detail belongs lower on the page, not above the main decision content.

## Icon State

- The web app no longer uses a placeholder `L` icon.
- App icon routes (`/icon`, `/apple-icon`) now use the branded card mark.
- A real `apps/web/app/favicon.ico` now exists for browser tabs and bookmarks.

## Hosted Supabase Setup Notes

- Docs and examples should assume hosted Supabase first.
- Local Supabase is optional.
- If using the Supabase pooler, Postgres usernames must be `postgres.<project_ref>`.
- Use `postgresql+psycopg://...?...sslmode=require` for Postgres env URLs.
- Backend CORS should allow:
  - `http://localhost:3000`
  - `http://localhost:3001`
- The API now also honors legacy `ALLOWED_ORIGIN` for single-origin LAN testing, so an existing root `.env` can allow a phone origin without renaming the variable first.
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

Playwright/browser validation on this machine:

```bash
cd /Users/MAC/GitHub/life-os
python3 -m playwright install webkit
python3 -m playwright --help
```

- The generic Playwright wrapper on this machine may resolve to a missing `playwright-cli` binary.
- If that happens, do not keep retrying the wrapper.
- Use the Python package form instead, or another explicit runtime path that does not depend on the missing wrapper binary.
- Treat wrapper resolution failures as tooling issues first, not as evidence that the app flow is broken.

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
