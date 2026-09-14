-- FlowFuel Supabase schema.
-- Run this against a fresh Supabase project (SQL editor or `supabase db push`).

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  dining_hall text not null,
  date date not null,
  meal_period text not null,
  name text not null,
  calories numeric,
  protein_g numeric,
  fat_g numeric,
  carb_g numeric,
  iron_pct numeric,
  calcium_pct numeric,
  swipe_eligible boolean default true,
  dollar_cost numeric,
  scraped_at timestamptz default now()
);

alter table menu_items enable row level security;
create policy "public read" on menu_items for select using (true);
-- No insert/update/delete policy for the anon role — writes only via the
-- service role key, used exclusively inside the GitHub Actions scraper job.

-- Server-side cache for Gemini recommendations, keyed by the derived signals
-- the proxy sends (never raw meal history or cycle dates). Written and read
-- only by the proxy function via the service role key.
create table recommendation_cache (
  dining_hall text not null,
  date date not null,
  priority text not null,
  phase text not null default 'none',
  response jsonb not null,
  created_at timestamptz default now(),
  primary key (dining_hall, date, priority, phase)
);

alter table recommendation_cache enable row level security;
-- No policies at all: RLS with zero policies denies every anon-role request.
-- The proxy talks to this table exclusively via the service role key, which
-- bypasses RLS entirely.
