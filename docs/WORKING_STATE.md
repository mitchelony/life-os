# Working State

This file is the compact handoff for new threads.

## Active Repo

- Only use `/Users/MAC/Projects/life-os`.
- Ignore the old iCloud-backed repo at `/Users/MAC/Documents/GitHub/life-os`.
- If the project is reopened from the wrong path, stop and reopen `/Users/MAC/Projects/life-os` before making changes.
- If a local server is already running, confirm it is serving this repo before trusting what the browser shows.

## Automation State

- Life OS has active recurring Codex automations for:
  - maintenance work
  - docs drift and architecture audits
  - planner regression checks
  - TODO triage
- These automations should target `/Users/MAC/Projects/life-os`.
- Automation triage and maintenance runs should use the canonical root queue file at `/Users/MAC/Projects/life-os/TODOLIST.md`.
- Review `/Users/MAC/Projects/life-os/automationlog.md` before changing automation-related workflow or trying to reconstruct what a recent automation run changed.
- Automation runs should append a short review note to `automationlog.md` with the automation name, timestamp, summary, changed files, validation, commit/push status, hosted-data status, and blockers or follow-up.
- The `TODO triage` automation should also scan for actionable improvements, security risks, and missing fallback behavior instead of only reclassifying already-listed TODO items.
- If `TODO triage` adds new TODO items, the run summary should call that out clearly and those newly added items should remain queued for a later run instead of being resolved immediately.
- The current recurring automation prompts do not require an automatic commit or push.

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
- Current settings flow is split into:
  - `Roadmap setup`
  - `Onboarding`
  - `Useful settings`
- The signed-out root route now shows a public landing page aimed at student cash flow.
- `Roadmap setup` now keeps the manual fallback tools:
  - GPT context export
  - roadmap import schema `v2`
- The primary roadmap drafting flow now lives on the `Roadmap` page through the copilot review surface.
- Expected income now has its own `Income` route outside onboarding.

## Auth State

- Supabase email/password auth is supported.
- Supabase Google OAuth is supported.
- Auth callback route: `/auth/callback`
- Production auth callback URLs should come from `NEXT_PUBLIC_APP_ORIGIN`, not from a LAN browser origin.
- `NEXT_PUBLIC_APP_ORIGIN` must be set as a bare origin such as `https://mitchel-life-os.vercel.app`, not a route like `https://mitchel-life-os.vercel.app/login`.
- The web callback builder now sanitizes accidental path segments in `NEXT_PUBLIC_APP_ORIGIN` back to the origin so Google OAuth does not fall through to `/login/auth/callback`.
- First successful auth returns to `/`, then the home gate decides:
  - incomplete onboarding -> `/settings`
  - completed onboarding -> `/dashboard`
- Signed-out users stay on the landing page at `/`.
- API-backed onboarding state is the source of truth for that decision.
- Generic local setup persistence must not mark onboarding complete on its own.
- Logout should always return to `/login`.
- The first onboarding step now asks whether to start blank or load student demo data before showing the rest of the setup form.
- Browser auth validation should use `http://localhost:3000` or `http://localhost:3001`, not `127.0.0.1`, because API CORS is scoped to explicit localhost origins.
- Phone or LAN auth testing needs extra hosted config:
  - add the exact LAN callback URL, for example `http://192.168.1.162:3000/auth/callback`, to Supabase Auth redirect URLs
  - add the exact LAN origin, for example `http://192.168.1.162:3000`, to API `CORS_ALLOWED_ORIGINS`
- If hosted Supabase does not allow the exact LAN callback URL, OAuth will often bounce back to the project's default site URL, which may still be `http://localhost:3000`.
- `npm run dev:api` now binds to `0.0.0.0:8000` by default so phone-based onboarding checks can reach the backend over LAN.
- Browser-aware localhost/LAN API rewriting is a local-development convenience only and should not be relied on in production.
- The `/login` screen now uses a mobile form-first layout:
  - brand header
  - short student-focused auth copy
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
- The `/auth/callback` error state now exposes a direct recovery action so Supabase error or missing-session returns do not leave you on a message-only screen. (Added By Project Maintenance Agent)

## Dashboard UX State

- The dashboard has been intentionally simplified.
- Primary content should focus on:
  - safe-to-spend number
  - what matters next
  - top actions
  - compact weekly strip
- Do not let it drift back into a dense reporting page.
- Authenticated app pages should not flash `sampleDashboard` content before real local/API data hydrates.
- Closed or inactive items should not keep feeding dashboard priority.
- Completed, skipped, or blocked actions belong lower in the action system, not in the dashboard hero path.

## Accounts UX State

- The Accounts page is now the control surface for account balances, not just a read-only summary.
- The Accounts API now returns effective balances from the stored account balance plus linked income and expense transactions, so manual quick add income and expense show up on the Accounts surface without waiting for a separate balance rewrite. (Added By Project Maintenance Agent)
- You can:
  - add accounts
  - edit name, institution, type, and balance
  - remove unlinked accounts
- Account deletion should stay conservative:
  - if an account still has linked data, do not silently let the page orphan those references

## Actions State

- The product language has shifted from `Tasks` toward `Actions`, even if `/tasks` still exists as the route.
- Actions are API-backed and persist across refresh and login.
- Inactive actions:
  - `done`
  - `skipped`
  - `blocked`
- Inactive actions should:
  - fall to the bottom of the action list
  - stop feeding dashboard priority
  - stop acting like live next-step guidance
- Action lanes are now date-aware:
  - due today or overdue -> `do_now`
  - due within 7 days -> `this_week`
  - later work -> `manual`
  - explicit `when_income_lands` remains distinct

## Income State

- Expected income is managed on `/income`.
- The Income page is the current control surface for:
  - viewing expected income
  - editing expected income
  - deleting expected income
  - confirming expected income into a real income transaction
- Confirmation should:
  - mark the income entry as received
  - create a real transaction
  - update the linked account when an account is provided
  - write an activity event for downstream snapshot surfaces

## Roadmap UX State

- Roadmap is a cash-flow-first planning surface.
- The Roadmap page now includes the primary copilot review flow for draft, revise, approve, deny, and emergency-expense replanning.
- The `Focus / Goals / Strategy` toggle must remain visible.
- Strategy JSON input must remain accessible in `Strategy` mode.
- The page should feel centered and full, not sparse.
- Secondary detail belongs lower on the page, not above the main decision content.
- Bulk roadmap setup should be available in `Settings`, not buried inside onboarding.
- Settings now holds the manual export/import fallback rather than the primary roadmap drafting flow.
- The canonical bulk seed contract is roadmap import schema `v2`.
- GPT-pasted roadmap JSON may contain smart quotes; the frontend import flow should normalize them before parse when safe to do so.
- Import files should preserve explicit linked ids for real records and use temp ids only for in-file dependencies.
- Current import caveats:
  - goal, step, and income-plan temp ids resolve within the import file
  - top-level debt, obligation, and expected-income temp ids also resolve when `temp_id` is provided
  - if you want to preserve existing debt and obligation ids after a planning reset, leave top-level `debts` and `obligations` empty in the import payload
  - `source_income_entry_id` should be a real existing id or `null`, not a placeholder label

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
- Prefer local test DB validation by default. Use hosted writes only when the task actually requires them.
- If hosted writes are required, use a disposable owner/test account where possible and remove it with all linked rows before ending the pass.

## Backend Stability Notes

- Onboarding/profile bootstrap now tolerates duplicate historical owner rows instead of crashing with `500`.
- Canonical owner-row selection prefers:
  - `id = owner_id`
  - then earlier `created_at`
  - then lower `id`
- Regression tests cover duplicate `profiles` and duplicate `onboarding_state` rows.
- Planning relaunch currently clears:
  - roadmap goals and steps
  - actions
  - planner drafts
  - activity history
  - progress snapshots
  - transactions
  - merchants
  - reserves
- Planning relaunch currently preserves:
  - accounts
  - debts
  - obligations
  - expected income entries
  - income sources
- Planning relaunch now preserves expected income entries and income sources while clearing planning history, so income planning survives a fresh roadmap reset. (Added By Project Maintenance Agent)
- The roadmap importer writes `ActivityEvent` rows so recent updates can reflect bulk setup activity.

## Current Progress Snapshot

- API-owned planning state is live.
- Settings owns the main setup and reset workflows.
- Expected income has a dedicated route instead of living only in onboarding.
- Context export plus roadmap import schema `v2` form the GPT-assisted setup path.
- Roadmap copilot drafts now flow through backend-owned approval before import rather than copy/paste as the primary path.
- Dashboard and roadmap both read from shared backend planning state.
- The main remaining sharp edge is operational, not conceptual:
  - hosted migrations must stay in sync with importer fields before deploys
  - production web envs must never build against localhost API values

## Verification Commands

Web tests:

```bash
cd /Users/MAC/Projects/life-os
source ~/.nvm/nvm.sh
nvm use 20
npm --workspace apps/web run test
```

Focused onboarding/local-state web tests:

```bash
cd /Users/MAC/Projects/life-os
source ~/.nvm/nvm.sh
nvm use 20
npm --workspace apps/web run test -- lib/onboarding.test.ts lib/auth.test.ts lib/local-state.test.ts
```

Web typecheck:

```bash
cd /Users/MAC/Projects/life-os
source ~/.nvm/nvm.sh
nvm use 20
npm --workspace apps/web run typecheck
```

API tests:

```bash
cd /Users/MAC/Projects/life-os/apps/api
source ../../.venv/bin/activate
python3 -m pytest
```

Playwright/browser validation on this machine:

```bash
cd /Users/MAC/Projects/life-os
python3 -m playwright install webkit
python3 -m playwright --help
```

- The generic Playwright wrapper on this machine may resolve to a missing `playwright-cli` binary.
- If that happens, do not keep retrying the wrapper.
- Use the Python package form instead, or another explicit runtime path that does not depend on the missing wrapper binary.
- Treat wrapper resolution failures as tooling issues first, not as evidence that the app flow is broken.

## Known Next Steps

- Do a focused hosted validation pass for:
  - roadmap import `v2`
  - context export
  - expected income confirm flow
  - relaunch planning behavior
- Keep deploy docs aligned with the real Vercel and Render env behavior so production never falls back to localhost.
- Keep roadmap import docs honest about current temp-id resolution limits instead of implying broader linker support than exists today.
- Keep primary surfaces focused on:
  - dashboard -> what matters now
  - roadmap -> what gets paid first
  - income -> what money is expected next
