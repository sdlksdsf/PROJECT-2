-- Kimmino sync schema (Supabase / Postgres)
-- Run this in the SQL editor of the Supabase project you want Kimmino to use.
-- See docs/SYNC.md for the full setup walkthrough.

create table if not exists public.kimmino_sync (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('bookmarks', 'preferences', 'dials', 'themes')),
  id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  primary key (user_id, kind, id)
);

alter table public.kimmino_sync enable row level security;

drop policy if exists "own rows read" on public.kimmino_sync;
drop policy if exists "own rows write" on public.kimmino_sync;
drop policy if exists "own rows update" on public.kimmino_sync;
drop policy if exists "own rows delete" on public.kimmino_sync;

create policy "own rows read"
  on public.kimmino_sync for select
  using (auth.uid() = user_id);

create policy "own rows write"
  on public.kimmino_sync for insert
  with check (auth.uid() = user_id);

create policy "own rows update"
  on public.kimmino_sync for update
  using (auth.uid() = user_id);

create policy "own rows delete"
  on public.kimmino_sync for delete
  using (auth.uid() = user_id);

create index if not exists kimmino_sync_user_kind
  on public.kimmino_sync (user_id, kind);

create index if not exists kimmino_sync_updated
  on public.kimmino_sync (user_id, updated_at desc);

-- Keep updated_at honest.
create or replace function public.kimmino_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists kimmino_sync_touch on public.kimmino_sync;
create trigger kimmino_sync_touch
  before update on public.kimmino_sync
  for each row execute function public.kimmino_touch_updated_at();
