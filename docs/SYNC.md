# Sync setup

Kimmino has **no sync server of its own**. Sync works against a Supabase project you create, so the data lives in a database you control — and can delete.

## What syncs

| Synced | Never synced |
| :--- | :--- |
| Bookmarks and speed dials | Browsing history |
| Preferences (per profile) | Cookies and site storage |
| Imported themes | Saved passwords |
| | Cache and page contents |

Everything is opt-in per category in **Settings → Sync**.

## 1. Create the database

Create a free Supabase project, then run this in the SQL editor (also available as [`docs/sync-schema.sql`](sync-schema.sql)):

```sql
-- file: docs/sync-schema.sql
create table if not exists public.kimmino_sync (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('bookmarks','preferences','dials','themes')),
  id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  primary key (user_id, kind, id)
);

alter table public.kimmino_sync enable row level security;

create policy "own rows read"   on public.kimmino_sync for select using (auth.uid() = user_id);
create policy "own rows write"  on public.kimmino_sync for insert with check (auth.uid() = user_id);
create policy "own rows update" on public.kimmino_sync for update using (auth.uid() = user_id);
create policy "own rows delete" on public.kimmino_sync for delete using (auth.uid() = user_id);

create index if not exists kimmino_sync_user_kind on public.kimmino_sync (user_id, kind);
```

## 2. Enable email sign-in

Supabase → **Authentication → Providers → Email**: enable "Email OTP" (magic code, no password). The default Supabase email template sends a six-digit code; Kimmino uses `/auth/v1/otp` and `/auth/v1/verify`.

For a smoother first run, disable "Confirm email" redirects — Kimmino verifies inline.

## 3. Point Kimmino at it

Either set environment variables before launching:

```bash
export KIMMINO_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
export KIMMINO_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIs..."
```

or drop a `cloud.json` in your profile folder:

```json
{
  "url": "https://YOUR-PROJECT.supabase.co",
  "anonKey": "eyJhbGciOiJIUzI1NiIs..."
}
```

Profile folder locations: `%APPDATA%\Kimmino` (Windows), `~/Library/Application Support/Kimmino` (macOS), `~/.config/Kimmino` (Linux).

The anon key is designed to be public; row-level security is what protects the rows. Never use the service-role key in a client.

## 4. Connect

**Settings → Sync → Sign in**, enter your email, then the six-digit code. Choose what to sync and whether new devices should pull, push, or merge.

## How merge works

Each row is `(user_id, kind, id, payload, updated_at, deleted)`. Merge is last-writer-wins **per item**, not per file, so adding a bookmark on your laptop and another on your desktop keeps both. Deletions are tombstones (`deleted = true`), so a device that has been offline does not resurrect what you removed.

## Deleting your data

- **Settings → Sync → Delete cloud data** removes every row for your user and signs you out.
- In Supabase: `delete from public.kimmino_sync where user_id = auth.uid();`
- Deleting the Supabase project removes everything, including the auth user.

## Local-only alternative

No account is required for anything else in Kimmino. If you want portable backups without a server, **Settings → Sync → Export backup** writes a single JSON file:

```json
{ "format": "kimmino-backup", "version": 1, "profile": "…", "bookmarks": [], "prefs": {}, "themes": [] }
```

Restore it on any machine with **Import backup**.

## Self-hosting

The client only needs PostgREST-compatible endpoints for the two auth calls and the table above, so a self-hosted Supabase (Docker) works unchanged. A minimal standalone server image is on the roadmap.
