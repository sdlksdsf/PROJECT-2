import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { JsonStore } from './store';
import type { Library } from './library';
import type { PrefsManager } from './prefs';
import type { SyncStatus } from '../shared/types';

/**
 * Kimmino Sync.
 *
 * Local-first by design: if you never sign in, nothing ever leaves the device.
 * When you do sign in, only the things you choose are synced (bookmarks,
 * settings, start-page dials) and they are stored in *your* backend — the
 * browser ships with no vendor endpoint baked in. Operators self-host the
 * schema in `supabase/migrations/0001_kimmino_sync.sql`.
 *
 * Supported backend: any Supabase-compatible project (PostgREST + GoTrue).
 * Configure with KIMMINO_SUPABASE_URL / KIMMINO_SUPABASE_ANON_KEY or by writing
 * the same two values into <userData>/cloud.json.
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

const SYNC_TABLE = 'kimmino_sync';
const SYNC_KEYS = ['bookmarks', 'preferences', 'dials'] as const;
type SyncKey = (typeof SYNC_KEYS)[number];

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
    // Two-minute debounce so rapid edits coalesce into a single upsert.
    this.timer = setInterval(() => void this.flush(), 120_000);
    this.timer.unref?.();
  }

  config(): CloudConfig | null {
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
      /* ignore */
    }
    return null;
  }

  get configured(): boolean {
    return Boolean(this.config());
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

  /* ------------------------------------------------------------------ */
  /* Auth                                                               */
  /* ------------------------------------------------------------------ */

  async signIn(email: string): Promise<{ ok: boolean; message: string }> {
    const config = this.config();
    if (!config) {
      return {
        ok: false,
        message:
          'Sync backend is not configured on this build. Kimmino stays fully local — you can still export/import your data from Settings → Sync.'
      };
    }
    try {
      const res = await fetch(`${config.url}/auth/v1/otp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', apikey: config.anonKey },
        body: JSON.stringify({ email, create_user: true })
      });
      if (!res.ok) {
        const body = await res.text();
        return { ok: false, message: `Could not send the code (${res.status}). ${body.slice(0, 160)}` };
      }
      this.status = { ...this.status, email, state: 'signed-out', message: 'Verification code sent' };
      this.emit();
      return { ok: true, message: `We emailed a 6-digit code to ${email}.` };
    } catch (err) {
      return { ok: false, message: `Network error: ${(err as Error).message}` };
    }
  }

  async verify(email: string, token: string): Promise<{ ok: boolean; message: string }> {
    const config = this.config();
    if (!config) return { ok: false, message: 'Sync backend is not configured on this build.' };
    try {
      const res = await fetch(`${config.url}/auth/v1/verify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', apikey: config.anonKey },
        body: JSON.stringify({ email, token, type: 'email' })
      });
      if (!res.ok) {
        return { ok: false, message: 'That code is not valid or has expired.' };
      }
      const data = (await res.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        user: { id: string; email: string };
      };
      this.store.update((current) => ({
        ...current,
        session: {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          email: data.user.email ?? email,
          userId: data.user.id,
          expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000
        }
      }));
      this.store.flush();
      this.status = { state: 'syncing', email: data.user.email ?? email, lastSyncedAt: null, pendingChanges: 0 };
      this.emit();
      await this.pushAll();
      this.status = { state: 'synced', email: data.user.email ?? email, lastSyncedAt: Date.now(), pendingChanges: 0 };
      this.emit();
      void this.profileId;
      return { ok: true, message: 'Signed in. Your settings are now synced.' };
    } catch (err) {
      this.status = { ...this.status, state: 'error', message: (err as Error).message };
      this.emit();
      return { ok: false, message: `Network error: ${(err as Error).message}` };
    }
  }

  async signOut(): Promise<void> {
    this.store.set({ session: null, lastSyncedAt: null });
    this.store.flush();
    this.status = { state: 'signed-out', email: null, lastSyncedAt: null, pendingChanges: 0 };
    this.emit();
  }

  /* ------------------------------------------------------------------ */
  /* Sync                                                               */
  /* ------------------------------------------------------------------ */

  markDirty(key: SyncKey): void {
    if (!this.store.get().session) return;
    this.pending.add(key);
    this.emit();
  }

  private snapshot(key: SyncKey): unknown {
    if (key === 'bookmarks') return this.library.bookmarks();
    if (key === 'preferences') {
      const prefs = this.prefs.all();
      return { ...prefs, developer: undefined };
    }
    return this.prefs.all().startPage.dials;
  }

  private async pushAll(): Promise<void> {
    for (const key of SYNC_KEYS) await this.push(key);
  }

  private async push(key: SyncKey): Promise<boolean> {
    const config = this.config();
    const session = this.store.get().session;
    if (!config || !session) return false;
    try {
      const res = await fetch(`${config.url}/rest/v1/${SYNC_TABLE}?on_conflict=user_id,profile_id,key`, {
        method: 'POST',
        headers: {
          apikey: config.anonKey,
          authorization: `Bearer ${session.accessToken}`,
          'content-type': 'application/json',
          prefer: 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify({
          user_id: session.userId,
          profile_id: this.profileId,
          key,
          value: this.snapshot(key),
          updated_at: new Date().toISOString()
        })
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async pull(): Promise<boolean> {
    const config = this.config();
    const session = this.store.get().session;
    if (!config || !session) return false;
    try {
      const res = await fetch(
        `${config.url}/rest/v1/${SYNC_TABLE}?select=key,value,updated_at&profile_id=eq.${encodeURIComponent(this.profileId)}`,
        {
          headers: { apikey: config.anonKey, authorization: `Bearer ${session.accessToken}` }
        }
      );
      if (!res.ok) return false;
      const rows = (await res.json()) as Array<{ key: SyncKey; value: unknown }>;
      for (const row of rows) {
        if (row.key === 'bookmarks' && Array.isArray(row.value)) {
          const remoteUpdatedAt = Date.now();
          void remoteUpdatedAt;
          for (const bookmark of row.value as Array<{ title: string; url: string; folder?: string }>) {
            if (bookmark?.url) this.library.addBookmark(bookmark);
          }
        }
        if (row.key === 'preferences' && row.value && typeof row.value === 'object') {
          this.prefs.set(row.value as never);
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  async syncNow(): Promise<SyncStatus> {
    if (!this.store.get().session) return this.statusOf();
    this.status = { ...this.status, state: 'syncing' };
    this.emit();
    await this.pull();
    await this.pushAll();
    this.pending.clear();
    this.store.update((current) => ({ ...current, lastSyncedAt: Date.now() }));
    this.store.flush();
    this.status = { ...this.status, state: 'synced', lastSyncedAt: Date.now() };
    this.emit();
    return this.statusOf();
  }

  private async flush(): Promise<void> {
    if (!this.pending.size) return;
    for (const key of [...this.pending]) {
      if (await this.push(key)) this.pending.delete(key);
    }
    this.emit();
  }

  /* ------------------------------------------------------------------ */
  /* Manual export / import (works with no backend at all)               */
  /* ------------------------------------------------------------------ */

  exportData(): string {
    return JSON.stringify(
      {
        format: 'kimmino-backup',
        version: 1,
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
      // Still be forgiving: accept anything with bookmarks/preferences keys.
      if (!data.bookmarks && !data.preferences) throw new Error('That file is not a Kimmino backup.');
    }
    if (data.preferences) this.prefs.set(data.preferences as never);
    for (const bookmark of data.bookmarks ?? []) {
      if (bookmark?.url) this.library.addBookmark(bookmark);
    }
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
