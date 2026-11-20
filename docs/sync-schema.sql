-- Kimmino sync schema (Supabase / Postgres)
-- Run this in the SQL editor of the Supabase project you want Kimmino to use.
-- See docs/SYNC.md for the full setup walkthrough.

-- One row per user: the preference document and the speed dials.
create table if not exists public.settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- One row per bookmark, keyed by address so a rename updates rather than duplicates.
create table if not exists public.bookmarks (
  user_id uuid not null references auth.users (id) on delete cascade,
  url text not null,
  title text not null default '',
  folder text,
  position integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, url)
);

-- Devices the account has signed in on, for the "where am I signed in" list.
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  platform text not null default '',
  last_seen timestamptz not null default now()
);

alter table public.settings enable row level security;
alter table public.bookmarks enable row level security;
alter table public.devices enable row level security;

drop policy if exists "own settings" on public.settings;
drop policy if exists "own bookmarks" on public.bookmarks;
drop policy if exists "own devices" on public.devices;

create policy "own settings"
  on public.settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own bookmarks"
  on public.bookmarks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own devices"
  on public.devices for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists bookmarks_user_position
  on public.bookmarks (user_id, position);

-- Old shape, removed. Dropping it also drops whatever it held.
drop table if exists public.kimmino_sync;
