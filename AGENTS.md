# AGENTS.md

This file is the build contract for Codex agents and human contributors working on Life OS.

## Product Rules

- This is a private, single-user app.
- Do not introduce team, org, workspace, invite, or multi-tenant abstractions.
- `user_id` exists for clean ownership boundaries and future-proofing, not for SaaS complexity.
- The dashboard must stay calm and high-signal.
- The app should prioritize situational awareness over reporting depth.
- Manual entry is the MVP source of truth.
- Roadmap is a planning layer, not a generic productivity board.
- The product should help answer: "When the next paycheck hits, what gets paid first?"

## Architectural Rules

- Keep the repo split into `apps/web`, `apps/api`, `supabase`, and `docs`.
- `transactions` are the source of truth for actual money movement.
- `income_entries` model expected income planning and may later result in transactions.
- `roadmapItems` and `strategyDocument` are advisory planning inputs, not ledger truth.
- Business logic belongs in the API service layer, not in SQL triggers and not spread across UI components.
- The frontend should consume stable API shapes and avoid direct coupling to table structure.
- Use UUIDs for persisted entities.
- Keep auth owner-only and lightweight.
- Owner secrets must stay server-side. Do not move development auth tokens into browser-visible config.

## Active Workspace Rules

- The active repo is `/Users/MAC/Github/life-os`.
- Ignore the old iCloud-backed repo at `/Users/MAC/Documents/GitHub/life-os`.
- Do all new work only in the clean repo unless the user explicitly says otherwise.
- When verifying or editing files, prefer the clean repo paths in responses and tooling.

## Hosted Supabase Rules

- The app is currently being wired against a hosted Supabase project, not local Docker Supabase.
- Do not assume `supabase start` or local containers are available.
- Hosted schema has already been applied from `supabase/migrations/20260323000100_initial_schema.sql`.
- Hosted Supabase is the default setup path in docs and examples. Local Supabase should be presented as optional only.
- Backend runtime should treat Supabase/Postgres as the primary database path.
- Do not rely on runtime `create_all()` for hosted Postgres schema creation.
- If using the Supabase pooler, Postgres usernames must use `postgres.<project_ref>`.
- Use `postgresql+psycopg://...?...sslmode=require` for Postgres env URLs.
- Keep CORS explicit and local-dev scoped by default:
  - `http://localhost:3000`
  - `http://localhost:3001`
- Do not use `http://127.0.0.1:3000` for browser auth validation unless CORS is updated first.
- `SUPABASE_URL`, `DATABASE_URL`, and `SUPABASE_DB_URL` must point at the same hosted project.
- API startup should fail fast if Supabase auth and database project refs do not match.
- Hosted validation should default to read-only unless the task explicitly requires writes.
- If hosted writes are required, use a disposable owner/test account whenever possible instead of the real owner account.
- Do not leave test accounts, fake roadmap imports, exploratory planner rows, or throwaway actions in hosted Supabase after validation.
- Hosted cleanup must remove the test identity and all linked owner-scoped rows before the task ends.
- If cleanup cannot be completed, call that out explicitly before ending the thread.

## UX Rules

- The dashboard must answer:
  - what is next
  - what comes after that
  - what is safe to spend now
  - what is safe to spend until next income
  - what is overdue
  - what actions matter this week
- The roadmap must answer:
  - what goal is active
  - what payment comes first when income lands
  - what the next best step is
- Avoid dense data tables on primary surfaces.
- Avoid generic card mosaics.
- Large numbers and decisive hierarchy are preferred over decorative UI.
- Quick add must be amount-first.
- Tasks should not simply restate roadmap strategy in different words.
- Every new screen should justify its inclusion in MVP.
- The dashboard should focus on "what matters right now" first, not full reporting depth.
- Secondary details should be pushed lower on the page instead of competing with the primary decision path.
- Roadmap should feel like a centered planning surface, not a sparse editor.
- When a page feels empty, fill the primary content area first before adding sidecar chrome.
- Bulk roadmap setup should live outside onboarding as a first-class settings workflow.
- The canonical one-shot roadmap seed format is roadmap import schema `v2`.
- GPT-facing import flows should preserve explicit ids and tolerate common paste issues like smart quotes when safe to do so.

## Brand Voice Rules

- Speak directly to the user as "you".
- Keep copy calm, plain, and short.
- Prefer clear guidance over descriptive system language.
- Avoid copy that sounds like internal notes, implementation narration, or generic productivity jargon.
- The tone should feel private, steady, and action-first.

## Available Spend Rules

- The formula must remain explainable.
- Inputs:
  - liquid cash
  - protected cash buffer
  - manual reserves
  - obligations due before next income
  - debt minimums due before next income
  - essential spend target remaining until next income
- The API must expose both the final number and an explanation payload.
- The product should distinguish between `Available Now` and `Available Through Next Income` where appropriate.
- The UI must show the number prominently and allow a one-tap breakdown.

## Backend Rules

- Use FastAPI routers + service modules + schema modules.
- Validate request/response payloads with Pydantic.
- Keep date-sensitive business logic deterministic and testable.
- Use dependency injection for DB session access.
- Prefer explicit service methods over fat route handlers.
- Development auth routes must be clearly gated to local development only.
- Unsupported auth strategies should fail closed, not silently fall open.

## Frontend Rules

- Use Next.js App Router.
- Follow the `frontend-skill` guidance for layout, motion, and restraint.
- Prefer a mobile-first responsive PWA.
- Use a small number of reusable primitives and consistent visual tokens.
- Keep sample/mock data isolated so it can be replaced by API data cleanly.
- Do not ship owner auth tokens or other sensitive secrets in `NEXT_PUBLIC_*` variables.
- Treat browser storage as sensitive but non-secure during MVP.
- First successful sign-in should route through the onboarding decision path:
  - incomplete onboarding -> `/settings`
  - completed onboarding -> `/dashboard`
- Logout should take the user directly back to `/login`.
- Auth pages should follow the overall Life OS visual system even when borrowing structure from external references.
- The auth screen should support:
  - sign in
  - sign up
  - Google sign-in
  - OAuth callback completion
- If the rendered local UI does not match the current checkout, verify the active dev server path and stale build state before patching the wrong surface.
- New auth/onboarding guidance should not reintroduce a dead-end login-only flow.
- Roadmap should keep the `Focus / Goals / Strategy` mode switch visible and strategy JSON input accessible.
- Onboarding completion must be decided from API-backed onboarding state, not from generic local setup persistence.

## Database Rules

- Use owner-only RLS policies.
- Distinguish cash-like accounts from credit/debt accounts.
- Merchant/source reuse must be first-class.
- Keep migrations readable and additive.
- Seed data should help local development without pretending to be production data.
- Treat migrations as the source of truth for hosted schema.
- Keep owner-scoped uniqueness aligned across migrations, ORM metadata, and bootstrap logic.
- If a feature needs new persisted fields, ship the migration in the same pass rather than relying on implicit runtime tables.
- Do not leave the repo in a state where local tests pass but hosted Postgres cannot store the new fields.

## Testing Rules

- Add unit tests for core financial logic before expanding features.
- Add API tests for permission boundaries and core response shapes.
- Add frontend tests for primary flows and failure states where practical.
- Use Playwright CLI for browser validation of UI flows after major frontend slices.
- On this machine, do not rely on the generic Playwright wrapper if it resolves to a missing `playwright-cli` binary.
- If the wrapper is broken, use a direct installed runtime instead:
  - Python package form: `python3 -m playwright ...`
  - or an explicit project/runtime invocation that does not depend on the missing wrapper binary
- Before assuming the app is broken, distinguish wrapper/tooling failures from actual browser-flow failures.
- If strategy or roadmap logic changes, update tests for payment-order guidance and next-step prioritization.
- If auth flow changes, verify:
  - sign up
  - sign in
  - Google redirect start
  - OAuth callback completion
  - onboarding bootstrap
  - logout
- If dashboard structure changes, keep a focused testable helper for any derived view-specific grouping logic.
- If onboarding bootstrap changes, add coverage for duplicate historical rows and canonical owner-row selection.
- If a validation pass creates or mutates hosted Supabase data, clean it up before ending the pass.
- Hosted cleanup is part of the task, not an optional follow-up.
- If hosted cleanup cannot be completed, call that out explicitly before ending the thread.
- Prefer the local in-memory or local test database for feature validation unless the task specifically requires hosted verification.
- For hosted verification, use a disposable owner/test account and delete the account plus all linked owner-scoped rows afterward.
- If you apply a hosted migration for validation, verify only what is needed and avoid seeding junk records.
- Before ending a task, state whether validation was local-only or whether hosted data was touched.

## Sub-Agent Ownership Guidance

- `supabase/`: schema, policies, seed data, local setup docs
- `apps/api/`: backend code, tests, env handling, services, routers
- `apps/web/`: UI, client data layer, design system, route screens
- Shared docs and top-level repo files should be coordinated carefully to avoid conflicts.
- Close spawned sub-agents after their assigned work is complete.

## Current Persistent Implementation Notes

- Auth is currently Supabase-first:
  - backend verifies Supabase bearer tokens
  - frontend stores a lightweight session locally for MVP
  - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must point to the same hosted project as backend Supabase config
- First successful auth should land at `/`, then route through the onboarding decision gate.
- Local setup storage may mirror setup payloads, but it must not mark onboarding complete by itself.
- Backend CORS middleware is required for local web development and currently expects explicit localhost origins.
- The API now validates Supabase auth/database project alignment during startup and should not be started with mixed-project env vars.
- Onboarding/profile bootstrap now tolerates duplicate historical owner rows by choosing a canonical row instead of throwing `500`.
- Roadmap strategy is persisted through setup/bootstrap and remains advisory only.
- Roadmap focus should answer:
  - what gets paid first
  - what the next step is
  - why it matters now
- Dashboard has been intentionally simplified:
  - hero safe-spend number
  - top actions
  - spend breakdown
  - compact "this week" strip
- Settings now owns the bulk setup workflow:
  - GPT context export
  - roadmap import schema `v2`
  - onboarding edits
  - planning relaunch
- Expected income now has its own `Income` route and can be confirmed into real income transactions.
- Planning relaunch currently clears expected income, transactions, merchants, income sources, reserves, roadmap state, actions, and progress history while preserving accounts, debts, and obligations.
- Actions are API-backed, date-aware, and inactive action states should stop feeding dashboard priority.
- Browser and hosted-db validation should use disposable test identities and remove them, plus any linked owner-scoped rows, before the pass is considered complete.
- When updating docs or setup steps, keep them aligned with the active hosted-Supabase flow and the clean repo path.
- Before ending a substantial pass, check whether `.gitignore` needs updates for any newly generated local artifacts.
- If Playwright browser binaries are missing, install them explicitly before retrying:
  - `python3 -m playwright install <browser>`
  - do not keep retrying the same broken wrapper path
- Roadmap import schema `v2` is the preferred one-shot planning seed format.
- Frontend roadmap import should live in Settings rather than being hidden inside onboarding.
- Import payloads may contain richer advisory fields than the current UI uses; the backend importer is the contract boundary for what is actually persisted.
- Temp-id resolution currently exists for goals, steps, income plans, and optional top-level debt, obligation, and expected-income temp ids when provided explicitly.

## What To Avoid

- Premature bank syncing
- Overbuilt auth
- Background job infrastructure before it is needed
- Fancy analytics before the dashboard feels trustworthy
- Splitting logic across too many abstractions for an MVP
- Letting roadmap strategy silently mutate saved financial truth
