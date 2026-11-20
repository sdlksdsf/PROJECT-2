# Sync setup

# Sync setup

Sync is optional. Kimmino ships pointing at its own Supabase project
(`cvprinxmfqguqezaylhk.supabase.co`) with a **publishable** key, so an account
works out of the box; every request is scoped to the signed-in user by
row-level security. Point a build at your own project with environment
variables or `cloud.json` below, and the same code keeps working.


## What syncs

| Synced | Never synced |
| :--- | :--- |
| Bookmarks and speed dials | Browsing history |
| Preferences (per profile) | Cookies and site storage |
| Imported themes | Saved passwords |
| | Cache and page contents |

Everything is opt-in per category in **Settings → Sync**.

## 1. Create the database

Create a Supabase project, then run [`docs/sync-schema.sql`](sync-schema.sql) in
the SQL editor. It creates three tables and their policies:

| Table | Shape | Purpose |
| :--- | :--- | :--- |
| `settings` | one row per user | `data` holds the preference document and the speed dials |
| `bookmarks` | one row per address | `(user_id, url)` primary key, so a rename updates instead of duplicating |
| `devices` | one row per sign-in | name, platform, last seen |

RLS on all three is `auth.uid() = user_id` — the publishable key cannot read
another account's rows even if someone extracts it from the installer.

## 2. Enable email sign-in

Supabase → **Authentication → Providers → Email**: enable Email sign-in. Kimmino
signs in with email + password (`/auth/v1/token?grant_type=password`) and creates
accounts with `/auth/v1/signup`; passwords are hashed by Supabase and never
stored by the browser.

For a first run that does not need an inbox, turn **Confirm email** off
(`mailer_autoconfirm`), which is what the Kimmino project does. With it on,
the account is created but the user must confirm before signing in.

## 3. Point Kimmino at it

The built-in project is used when nothing else is configured. To override it,
either set environment variables before launching:

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

**Settings → Account** (or `kimmino://settings` → Sync & account), enter an email
and a password, then press **Sign in** or **Create account**. Signed in, the same
panel shows the last sync time, a **Sync now** button and **Sign out**.

## How merge works

Bookmarks are merged **per address**: signing in pulls the account's rows and
adds any this device does not have, then pushes the local list. Settings are
last-writer-wins per document, because preferences change as a set. Nothing is
ever deleted from the server by a pull, so an offline device cannot erase
another device's bookmarks.

## Deleting your data

- In Supabase: `delete from public.settings where user_id = auth.uid();` and
  `delete from public.bookmarks where user_id = auth.uid();` (or delete the
  account in Authentication → Users, which cascades).
- **Settings → Account → Sign out** removes the session from this device only.
- Deleting the Supabase project removes everything, including the auth user.

## Local-only alternative

No account is required for anything else in Kimmino. If you want portable backups without a server, **Settings → Sync → Export backup** writes a single JSON file:

```json
{ "format": "kimmino-backup", "version": 2, "profile": "…", "preferences": {}, "bookmarks": [], "history": [] }
```

Restore it on any machine with **Import backup**.

## Self-hosting

The client only needs PostgREST-compatible endpoints for the two auth calls and the table above, so a self-hosted Supabase (Docker) works unchanged. A minimal standalone server image is on the roadmap.
