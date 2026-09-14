# FlowFuel

A mobile-first PWA that helps a college student on a dining plan eat well within
their actual dining dollar and meal swipe budget, with optional macro tracking
and AI meal photo analysis.

No user accounts. All personal data (dining balance, meal logs, cycle dates,
macro settings) lives client-side in IndexedDB. The only server-side data is a
shared, read-only dining menu.

## Architecture

- **Client:** React PWA, service worker for offline app shell, IndexedDB for
  all personal data.
- **Shared data:** Supabase, one public read-only table (`menu_items`).
- **AI:** Gemini, called only through a serverless proxy (`api/recommend.js`,
  `api/analyze-photo.js`). The client never holds a Gemini key.
- **Dining scraper:** `backend/scrapers`, run on a schedule via GitHub Actions,
  writes into Supabase using a service-role key stored only as a GitHub
  Actions secret.
- **Hosting:** Vercel (app + proxy functions together).

## Known limitations (read before relying on this for real dining data)

- **Purdue's dining courts (Hillenbrand, Earhart, Windsor, Wiley, Ford) are
  all-you-care-to-eat swipe access, not itemized by price.** `menu_items` rows
  from the scraper are always `swipe_eligible: true` with `dollar_cost: null`.
  Verified via GraphQL schema introspection against Purdue's live API
  (`Item`, `ItemAppearance`, `RetailLocation`, `CbordItem` — none carry a price
  field): there is no itemized pricing data anywhere in this API, and no data
  source wired in for the separate à-la-carte/retail dining-dollar locations.
  The optimizer's dollar-scarcity math still runs, but `typicalMealDollarCost`
  falls back to the spec's hardcoded `$12` estimate rather than a real
  average, since no item ever has a real price.
- **The scraper's Purdue API endpoint and auth were fixed during testing.**
  The endpoint originally in this repo (`api.hfs.purdue.edu/graphql`, with
  hardcoded session cookies) 404s — it no longer exists. The correct, verified
  endpoint is `api.hfs.purdue.edu/menus/v3/GraphQL`, confirmed live to need
  **no session cookies or auth at all**. The scraper now fetches real
  `calories`/`protein_g`/`fat_g`/`carb_g`/`iron_pct` per item directly from
  the API's `nutritionFacts` field (confirmed via introspection and a live
  pull: 321 items across all dining halls open on the test day, 270 of them
  with full nutrition data). A small number of items (station-label rows with
  no real nutrition) come back with null macros — harmless, just don't expect
  100% coverage.
- **A Gemini API key was previously hardcoded in this repo's history** (in a
  now-deleted `backend/server.js`, using Groq rather than Gemini). Treat that
  key as permanently compromised regardless of whether it still works; it has
  been removed from the codebase.

## Environment setup

Copy `.env.example` to `.env` (gitignored) for local development:

```bash
cp .env.example .env
```

- `REACT_APP_SUPABASE_URL` / `REACT_APP_SUPABASE_ANON_KEY` — from your
  Supabase project settings. Anon key only; it is public and read-only via
  row-level security (see `supabase/schema.sql`).
- `GEMINI_API_KEY` — a Google AI Studio key, set only on the Vercel project's
  serverless function environment, never in the client env.
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — set on the Vercel project
  (server-side, for the recommendation cache) **and** as GitHub Actions repo
  secrets (for the scraper). Never set as a `REACT_APP_` variable.
- `APP_ORIGIN` — your deployed app's origin, used to restrict the proxy's CORS.

## Database setup

Run `supabase/schema.sql` against a fresh Supabase project (SQL editor or
`supabase db push`). It creates `menu_items` (public read, RLS-locked writes)
and `recommendation_cache` (service-role only).

## Local development

```bash
npm install
npm run dev   # runs the CRA dev server AND api/*.js locally, together
```

`npm run dev` runs two processes: `react-scripts start` (port 3000) and
`scripts/dev-api-server.mjs` (port 5050, dev-only — Vercel runs `api/*.js`
natively in production, this just lets `/api/recommend` and
`/api/analyze-photo` work locally too). CRA's `"proxy"` field in
`package.json` forwards `/api/*` requests from 3000 to 5050 automatically.
Use `npm start` alone only if you don't need the AI recommendation/photo
features for what you're testing.

Local env vars go in `.env.local` (gitignored): `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, plus
`REACT_APP_SUPABASE_URL` / `REACT_APP_SUPABASE_ANON_KEY` (CRA only exposes
`REACT_APP_`-prefixed vars to the client bundle, so these mirror the
non-prefixed ones) and `APP_ORIGIN=http://localhost:3000`.

To populate real menu data locally, run the scraper once against your
project:

```bash
cd backend && npm install
set -a && source <(grep '=' ../.env.local) && set +a
node scrapers/run.js
```

## Tests

```bash
npm test
```

Covers the dining optimizer (`src/lib/optimizer.js`) and the cycle phase
Bayesian model (`src/lib/cyclePhaseModel.js`) — both pure functions, no
network or IndexedDB required.

## Deployment

Deploy to Vercel; `api/*.js` deploys alongside the app as serverless
functions automatically. `vercel.json` sets a `Content-Security-Policy`
restricting `script-src` to `'self'`.

CI (`.github/workflows/ci.yml`) runs tests, builds, and audits dependencies,
failing on high-severity findings outside the allowlist in `.audit-ci.json`
(that allowlist covers `react-scripts`' own build-tooling dependencies —
svgo/postcss/webpack chain used only by `npm run build`, never shipped in the
browser bundle or the serverless functions).

The scraper (`.github/workflows/scraper.yml`) runs daily via cron, writing
into `menu_items` using the service-role key from GitHub Actions secrets.

## Security

See `docs/motion-specs.md` for the UI motion specs and the build's security
requirements list (git history, at the time of writing) for the full
checklist this build follows: proxy-only Gemini access, anon-key-only client
Supabase access, RLS-locked writes, CORS + per-client rate limiting on the
proxy, client- and server-side photo upload validation, escaped-text-only
rendering of Gemini output, secret-redacting error logs, a restrictive CSP,
and a CI dependency audit gate.
