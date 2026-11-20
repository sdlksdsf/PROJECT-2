import { app } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { JsonStore } from './store';
import type { Library } from './library';
import type { PrefsManager } from './prefs';
import type { Preferences, SyncStatus } from '../shared/types';

/**
 * Kimmino Sync.
 *
 * Local-first: with no account nothing leaves the machine. Signing in mirrors
 * bookmarks and settings into the user's own Supabase project — the browser
 * ships with a publishable key only, so every request is scoped to that user by
 * row-level security on the server.
 */
interface CloudConfig {
  url: string;
  anonKey: string;
}

interface AuthSession {
  accessToken: string;
  refreshToken: string;
  email: string;
  userId: string;
  expiresAt: number;
}

interface SyncFile {
  session: AuthSession | null;
  lastSyncedAt: number | null;
}

/**
 * The project Kimmino accounts live in. These two values are public by design
 * (a publishable key can only do what row-level security allows) and exist so a
 * fresh install can sign in without asking the user to paste anything.
 * Override with KIMMINO_SUPABASE_URL / KIMMINO_SUPABASE_ANON_KEY, or with
 * <userData>/cloud.json, to point a build at another project.
 */
const DEFAULT_CLOUD: CloudConfig = {
  url: 'https://cvprinxmfqguqezaylhk.supabase.co',
  anonKey: 'sb_publishable_ax5KDdrMs3QeX7y5FRdaWQ_zy_79_TB'
};

type SyncKey = 'bookmarks' | 'settings';

export class SyncService {
  private store: JsonStore<SyncFile>;
  private listeners = new Set<(status: SyncStatus) => void>();
  private status: SyncStatus = { state: 'signed-out', email: null, lastSyncedAt: null, pendingChanges: 0 };
  private pending = new Set<SyncKey>();
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly dir: string,
    private readonly library: Library,
    private readonly prefs: PrefsManager,
    private readonly profileId: string
  ) {
    this.store = new JsonStore<SyncFile>('sync.json', () => ({ session: null, lastSyncedAt: null }), dir);
    const session = this.store.get().session;
    if (session) {
      this.status = {
        state: 'synced',
        email: session.email,
        lastSyncedAt: this.store.get().lastSyncedAt,
        pendingChanges: 0
      };
    }
    this.timer = setInterval(() => void this.flush(), 120_000);
    this.timer.unref?.();
  }

  config(): CloudConfig {
    const envUrl = process.env.KIMMINO_SUPABASE_URL;
    const envKey = process.env.KIMMINO_SUPABASE_ANON_KEY;
    if (envUrl && envKey) return { url: envUrl.replace(/\/$/, ''), anonKey: envKey };
    try {
      const file = path.join(app.getPath('userData'), 'cloud.json');
      if (fs.existsSync(file)) {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<CloudConfig>;
        if (parsed.url && parsed.anonKey) return { url: parsed.url.replace(/\/$/, ''), anonKey: parsed.anonKey };
      }
    } catch {
      /* ignore a broken override and use the project below */
    }
    return DEFAULT_CLOUD;
  }

  get configured(): boolean {
    return true;
  }

  statusOf(): SyncStatus {
    return { ...this.status, pendingChanges: this.pending.size };
  }

  onChange(fn: (status: SyncStatus) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    const snapshot = this.statusOf();
    this.listeners.forEach((fn) => fn(snapshot));
  }

  private setStatus(patch: Partial<SyncStatus>): void {
    this.status = { ...this.status, ...patch };
    this.emit();
  }

  /* ------------------------------------------------------------------ */
  /* Auth                                                               */
  /* ------------------------------------------------------------------ */

  async signUp(email: string, password: string): Promise<{ ok: boolean; message: string }> {
    const { url, anonKey } = this.config();
    try {
      const res = await fetch(`${url}/auth/v1/signup`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', apikey: anonKey },
        body: JSON.stringify({ email, password })
      });
      const data = (await res.json().catch(() => ({}))) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        user?: { id: string; email?: string };
        msg?: string;
        error_description?: string;
        message?: string;
      };
      if (!res.ok) return { ok: false, message: friendlyAuthError(data, res.status) };
      if (!data.access_token || !data.user) {
        return { ok: true, message: `Account created. Check ${email} to confirm the address, then sign in.` };
      }
      this.persistSession(data as Required<typeof data>);
      this.setStatus({ state: 'syncing', email: data.user.email ?? email, lastSyncedAt: null });
      await this.pushAll();
      this.setStatus({ state: 'synced', lastSyncedAt: Date.now(), message: undefined });
      return { ok: true, message: 'Account created and signed in.' };
    } catch (err) {
      return { ok: false, message: `Network error: ${(err as Error).message}` };
    }
  }

  async signIn(email: string, password: string): Promise<{ ok: boolean; message: string }> {
    const { url, anonKey } = this.config();
    try {
      const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', apikey: anonKey },
        body: JSON.stringify({ email, password })
      });
      const data = (await res.json().catch(() => ({}))) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        user?: { id: string; email?: string };
        error_description?: string;
        msg?: string;
        message?: string;
      };
      if (!res.ok || !data.access_token || !data.user) {
        return { ok: false, message: friendlyAuthError(data, res.status) };
      }
      this.persistSession(data as Required<typeof data>);
      this.setStatus({ state: 'syncing', email: data.user.email ?? email, lastSyncedAt: null, message: undefined });
      await this.pull();
      await this.pushAll();
      this.setStatus({ state: 'synced', lastSyncedAt: Date.now(), message: undefined });
      return { ok: true, message: 'Signed in.' };
    } catch (err) {
      return { ok: false, message: `Network error: ${(err as Error).message}` };
    }
  }

  private persistSession(data: {
    access_token: string;
    refresh_token: string;
    expires_in?: number;
    user: { id: string; email?: string };
  }): void {
    this.store.update((current) => ({
      ...current,
      session: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        email: data.user.email ?? '',
        userId: data.user.id,
        expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000
      }
    }));
    this.store.flush();
  }

  async signOut(): Promise<void> {
    const session = this.store.get().session;
    const { url, anonKey } = this.config();
    if (session) {
      void fetch(`${url}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: anonKey, authorization: `Bearer ${session.accessToken}` }
      }).catch(() => undefined);
    }
    this.store.set({ session: null, lastSyncedAt: null });
    this.store.flush();
    this.status = { state: 'signed-out', email: null, lastSyncedAt: null, pendingChanges: 0 };
    this.emit();
  }

  /** Trade the refresh token for a fresh access token. */
  private async refreshSession(): Promise<boolean> {
    const session = this.store.get().session;
    if (!session?.refreshToken) return false;
    const { url, anonKey } = this.config();
    try {
      const res = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', apikey: anonKey },
        body: JSON.stringify({ refresh_token: session.refreshToken })
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { access_token: string; refresh_token: string; expires_in?: number };
      this.persistSession({ ...data, user: { id: session.userId, email: session.email } });
      return true;
    } catch {
      return false;
    }
  }

  private async authorized(pathname: string, init: RequestInit = {}): Promise<Response> {
    const { url, anonKey } = this.config();
    let session = this.store.get().session;
    if (!session) throw new Error('not signed in');
    const call = (token: string) =>
      fetch(`${url}${pathname}`, {
        ...init,
        headers: {
          ...(init.headers as Record<string, string> | undefined),
          apikey: anonKey,
          authorization: `Bearer ${token}`
        }
      });
    let res = await call(session.accessToken);
    if (res.status === 401 && (await this.refreshSession())) {
      session = this.store.get().session!;
      res = await call(session.accessToken);
    }
    return res;
  }

  /* ------------------------------------------------------------------ */
  /* Sync                                                               */
  /* ------------------------------------------------------------------ */

  markDirty(): void {
    if (!this.store.get().session) return;
    this.pending.add('bookmarks');
    this.pending.add('settings');
    this.emit();
  }

  private async pushAll(): Promise<void> {
    await this.pushBookmarks();
    await this.pushSettings();
    this.pending.clear();
  }

  private async pushSettings(): Promise<boolean> {
    const session = this.store.get().session;
    if (!session) return false;
    const prefs = this.prefs.all();
    const data: Record<string, unknown> = {
      preferences: {
        ...prefs,
        // Developer settings are machine-specific, and the profile id is local.
        developer: undefined,
        onboarded: true
      },
      dials: prefs.startPage.dials
    };
    try {
      const res = await this.authorized('/rest/v1/settings?on_conflict=user_id', {
        method: 'POST',
        headers: { 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ user_id: session.userId, data, updated_at: new Date().toISOString() })
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private async pushBookmarks(): Promise<boolean> {
    const session = this.store.get().session;
    if (!session) return false;
    const rows = this.library.bookmarks().map((bookmark, index) => ({
      user_id: session.userId,
      url: bookmark.url,
      title: bookmark.title ?? '',
      folder: bookmark.folder || null,
      position: index
    }));
    if (!rows.length) return true;
    try {
      const res = await this.authorized('/rest/v1/bookmarks?on_conflict=user_id,url', {
        method: 'POST',
        headers: { 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows)
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async pull(): Promise<boolean> {
    const session = this.store.get().session;
    if (!session) return false;
    try {
      const settingsRes = await this.authorized(`/rest/v1/settings?select=data&user_id=eq.${session.userId}`);
      if (settingsRes.ok) {
        const rows = (await settingsRes.json()) as Array<{ data?: { preferences?: Partial<Preferences> } }>;
        const remote = rows[0]?.data?.preferences;
        // Only adopt remote values the user has not changed more recently locally.
        if (remote) this.prefs.set(remote as never);
      }
      const bookmarksRes = await this.authorized(
        `/rest/v1/bookmarks?select=url,title,folder&user_id=eq.${session.userId}&order=position.asc`
      );
      if (bookmarksRes.ok) {
        const rows = (await bookmarksRes.json()) as Array<{ url: string; title: string; folder: string | null }>;
        const known = new Set(this.library.bookmarks().map((bookmark) => bookmark.url));
        for (const row of rows) {
          if (row.url && !known.has(row.url)) {
            this.library.addBookmark({ url: row.url, title: row.title ?? '', folder: row.folder ?? '' });
          }
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  async syncNow(): Promise<SyncStatus> {
    if (!this.store.get().session) {
      this.setStatus({ state: 'signed-out' });
      return this.statusOf();
    }
    this.setStatus({ state: 'syncing' });
    const pulled = await this.pull();
    const pushed = (await this.pushSettings()) && (await this.pushBookmarks());
    this.pending.clear();
    if (!pulled || !pushed) {
      this.setStatus({ state: 'offline', message: 'Could not reach the sync server.' });
      return this.statusOf();
    }
    this.store.update((current) => ({ ...current, lastSyncedAt: Date.now() }));
    this.store.flush();
    this.setStatus({ state: 'synced', lastSyncedAt: Date.now(), message: undefined });
    return this.statusOf();
  }

  private async flush(): Promise<void> {
    if (!this.pending.size || !this.store.get().session) return;
    await this.syncNow();
  }

  /* ------------------------------------------------------------------ */
  /* Manual export / import (works with no account at all)               */
  /* ------------------------------------------------------------------ */

  exportData(): string {
    return JSON.stringify(
      {
        format: 'kimmino-backup',
        version: 2,
        exportedAt: new Date().toISOString(),
        profile: this.profileId,
        preferences: this.prefs.all(),
        bookmarks: this.library.bookmarks(),
        history: this.library.history().slice(0, 5000)
      },
      null,
      2
    );
  }

  importData(json: string): void {
    const data = JSON.parse(json) as {
      format?: string;
      preferences?: Record<string, unknown>;
      bookmarks?: Array<{ title: string; url: string; folder?: string }>;
    };
    if (data.format !== 'kimmino-backup') {
      if (!data.bookmarks && !data.preferences) throw new Error('That file is not a Kimmino backup.');
    }
    if (data.preferences) this.prefs.set(data.preferences as never);
    for (const bookmark of data.bookmarks ?? []) {
      if (bookmark?.url) this.library.addBookmark(bookmark);
    }
  }

  deviceName(): string {
    try {
      return `${os.hostname()} (${process.platform})`;
    } catch {
      return process.platform;
    }
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}

/** Turn Supabase's auth errors into something a person can act on. */
function friendlyAuthError(data: { msg?: string; error_description?: string; message?: string }, status: number): string {
  const raw = (data.error_description || data.msg || data.message || '').toLowerCase();
  if (raw.includes('invalid login credentials')) return 'That email and password do not match an account.';
  if (raw.includes('already registered') || raw.includes('user already exists')) return 'An account with that email already exists. Sign in instead.';
  if (raw.includes('password should be at least')) return 'Use at least 6 characters for the password.';
  if (raw.includes('unable to validate email') || raw.includes('invalid email')) return 'That email address does not look valid.';
  if (raw.includes('email not confirmed')) return 'Check your inbox and confirm the address first.';
  if (status === 429) return 'Too many attempts. Wait a minute and try again.';
  if (status >= 500) return 'The sync server is having trouble. Try again shortly.';
  return data.error_description || data.msg || data.message || `Request failed (${status}).`;
}
