# Life OS Web

The web app is the primary user interface for the Life OS MVP.

It is a mobile-first Next.js application designed to make the most important money and life information easy to scan and act on.

Core screens include:

- dashboard
- quick add
- accounts
- obligations
- debts
- roadmap
- tasks
- settings

Tasks are still derived from bills, debt, and expected income, but the web app now lets the user manage that layer directly with:

- manual task add/delete
- derived task overrides for title, due date, priority, and notes
- complete/reopen controls
- hide/restore for derived tasks

Accounts are also manageable directly from the Accounts page:

- add account
- edit account name, institution, type, and balance
- delete accounts that no longer have linked data

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide icons
- Vitest for unit testing

## Product Goals for the Frontend

The frontend should feel:

- calm
- clear
- private
- decisive
- mobile-friendly

The dashboard should answer, at a glance:

- what is next
- what comes after that
- what is safe to spend
- what needs attention this week

## Local Setup

From the repository root:

```bash
cd /Users/MAC/Projects/life-os
source ~/.nvm/nvm.sh
nvm use 20 || nvm install 20
npm install
```

If you want the web app to call the API, create a local env file:

```bash
cp apps/web/.env.example apps/web/.env.local
```

The web app now expects Supabase auth env values in `apps/web/.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_BASE_URL`

## Run the Web App

From the repository root:

```bash
cd /Users/MAC/Projects/life-os
source ~/.nvm/nvm.sh
nvm use 20
npm run dev:web
```

Default local address:

- `http://localhost:3000`

If port `3000` is already in use, Next.js will automatically choose the next open port.

## Environment Variables

The frontend currently uses a very small env surface:

- `NEXT_PUBLIC_API_BASE_URL` - optional backend base URL, usually `http://localhost:8000/api`
- `NEXT_PUBLIC_APP_ORIGIN` - public web origin to use for auth callbacks, for example `https://app.yourdomain.com`
- `NEXT_PUBLIC_ONBOARDING_KEY` - browser storage key for onboarding state
- `NEXT_PUBLIC_SUPABASE_URL` - hosted Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - hosted Supabase anon key

Important:

- the web app no longer ships the owner token to the browser
- the web app signs in the owner through Supabase email/password or Google and sends the bearer token to the backend
- API-backed persistence is now the preferred path for dashboard, quick add, settings, and roadmap data
- browser storage is still used as a mirror/fallback, not the primary saved truth
- production auth callbacks should use `NEXT_PUBLIC_APP_ORIGIN`, not the current browser's LAN address
- `NEXT_PUBLIC_APP_ORIGIN` must be a bare origin, not a route like `https://app.yourdomain.com/login`
- the auth callback builder now strips accidental paths from `NEXT_PUBLIC_APP_ORIGIN`, but the env should still be set correctly
- if a local run shows UI that does not match `apps/web` in this repo, verify the dev server path and clear stale builds before patching the wrong checkout
- mobile shell behavior should keep desktop parity for navigation and session controls
- every desktop destination should remain reachable from the mobile menu
- mobile must expose a direct path to log out without forcing the user through settings
- the mobile header menu trigger should be obviously labeled, not an easy-to-miss icon-only control
- the mobile menu sheet should support touch scrolling and leave enough bottom clearance above the fixed bottom nav
- Settings should include its own direct log out action as a second clear path
- signed-in recovery screens must also expose a log out path so mobile users are never trapped behind a failed onboarding or API check
- for phone or LAN testing, Supabase must allow the exact callback URL such as `http://192.168.1.162:3000/auth/callback`
- for phone or LAN testing, the API must allow the exact browser origin such as `http://192.168.1.162:3000` in `CORS_ALLOWED_ORIGINS`
- the web client rewrites loopback API URLs like `http://localhost:8000/api` to the current browser host for LAN testing, but hosted auth redirect settings still need the exact callback URL

## Auth Flow

The app now supports:

- sign in
- sign up
- Google sign-in
- Supabase OAuth callback handling at `/auth/callback`

Current routing behavior:

- signed-out users stay on the public landing page at `/`
- first successful sign-in returns to `/`
- the home gate checks onboarding state through the API
- incomplete onboarding routes to `Settings`
- completed onboarding routes to `Dashboard`
- logout returns to `/login`
- Settings defaults incomplete onboarding to the `Onboarding` section
- the first onboarding step now asks whether to start blank or load student demo data

## Scripts

From `apps/web` directly:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
```

From the repository root:

```bash
npm run dev:web
npm --workspace apps/web run test
```

## Testing

Run the frontend test suite:

```bash
cd /Users/MAC/Projects/life-os
source ~/.nvm/nvm.sh
nvm use 20
npm --workspace apps/web run test
```

Current tests focus on:

- local state and financial logic
- auth/session-aware API client behavior
- roadmap and strategy behavior
- app shell behavior
- API client behavior

For real browser validation on this machine:

```bash
cd /Users/MAC/Projects/life-os
python3 -m playwright install webkit
```

Important:

- the generic Playwright wrapper may resolve to a missing `playwright-cli` binary here
- if that happens, use `python3 -m playwright ...` or another explicit runtime path instead of retrying the broken wrapper
- a wrapper failure is a tooling problem, not automatically a frontend regression

## Frontend Design Rules

- mobile-first layouts
- restrained visual language
- clear hierarchy over decorative density
- reusable primitives instead of many one-off components
- amount-first input for quick add
- calm, explainable finance UI
- auth screens should follow the Life OS visual system even when using a more editorial split layout
- on phones, auth should be form-first and compact; supporting preview content must not push the first input fields below an oversized hero
- mobile controls should keep comfortable touch-target sizing and avoid iOS zoom-on-focus
- full-screen setup or editing flows may hide the bottom nav on mobile when it would crowd the viewport
- the mobile entry surface should put the first real action above oversized preview content
- the web app should ship a real branded tab icon:
  - `/icon` and `/apple-icon` should match the current app mark
  - `app/favicon.ico` should exist for browser tabs and bookmarks

## Notes for Developers

- Keep mock data isolated so it can be swapped with API data cleanly
- Avoid turning primary screens into dense dashboards or generic card grids
- Prefer simple, readable labels and descriptions
- Any new screen should justify why it belongs in the MVP
- If a page feels sparse, fill the primary content area first before adding secondary chrome
