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
cd /Users/MAC/GitHub/life-os
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
cd /Users/MAC/GitHub/life-os
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
- `NEXT_PUBLIC_ONBOARDING_KEY` - browser storage key for onboarding state
- `NEXT_PUBLIC_SUPABASE_URL` - hosted Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - hosted Supabase anon key

Important:

- the web app no longer ships the owner token to the browser
- the web app signs in the owner through Supabase email/password or Google and sends the bearer token to the backend
- API-backed persistence is now the preferred path for dashboard, quick add, settings, and roadmap data
- browser storage is still used as a mirror/fallback, not the primary saved truth

## Auth Flow

The app now supports:

- sign in
- sign up
- Google sign-in
- Supabase OAuth callback handling at `/auth/callback`

Current routing behavior:

- first successful sign-in returns to `/`
- the home gate checks onboarding state through the API
- incomplete onboarding routes to `Settings`
- completed onboarding routes to `Dashboard`
- logout returns to `/login`

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
cd /Users/MAC/GitHub/life-os
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

## Frontend Design Rules

- mobile-first layouts
- restrained visual language
- clear hierarchy over decorative density
- reusable primitives instead of many one-off components
- amount-first input for quick add
- calm, explainable finance UI
- auth screens should follow the Life OS visual system even when using a more editorial split layout

## Notes for Developers

- Keep mock data isolated so it can be swapped with API data cleanly
- Avoid turning primary screens into dense dashboards or generic card grids
- Prefer simple, readable labels and descriptions
- Any new screen should justify why it belongs in the MVP
- If a page feels sparse, fill the primary content area first before adding secondary chrome
