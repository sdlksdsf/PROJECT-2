import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Tiny JSON store with atomic writes and debounced persistence.
 * Every Kimmino data file is plain, readable JSON in the user's profile folder —
 * no proprietary database, no hidden state, easy to export or delete.
 */
export class JsonStore<T> {
  private readonly file: string;
  private data: T;
  private saveTimer: NodeJS.Timeout | null = null;
  private readonly defaultValue: () => T;

  constructor(fileName: string, defaultValue: () => T, dir?: string) {
    const base = dir ?? app.getPath('userData');
    this.file = path.join(base, fileName);
    this.defaultValue = defaultValue;
    this.data = this.read();
  }

  private read(): T {
    try {
      const raw = fs.readFileSync(this.file, 'utf8');
      const parsed = JSON.parse(raw) as T;
      return this.migrate(parsed);
    } catch {
      return this.defaultValue();
    }
  }

  /** Hook for shape migrations; overridden per store when needed. */
  protected migrate(value: T): T {
    return value;
  }

  get(): T {
    return this.data;
  }

  set(value: T): T {
    this.data = value;
    this.scheduleSave();
    return this.data;
  }

  update(fn: (current: T) => T): T {
    return this.set(fn(this.data));
  }

  get path(): string {
    return this.file;
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), 120);
    this.saveTimer.unref?.();
  }

  flush(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmp, this.file);
    } catch (err) {
      console.error('[kimmino:store] failed to persist', this.file, err);
    }
  }
}

export function ensureDir(dir: string): string {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function removeFileIfExists(file: string): void {
  try {
    fs.rmSync(file, { force: true, recursive: true });
  } catch {
    /* ignore */
  }
}

export function profileDir(profileId: string): string {
  return ensureDir(path.join(app.getPath('userData'), 'profiles', profileId));
}

export function deepMerge<T>(base: T, patch: unknown): T {
  if (Array.isArray(base) || typeof base !== 'object' || base === null) {
    return (patch === undefined ? base : patch) as T;
  }
  if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) {
    return patch === undefined ? base : (patch as T);
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    if (value === undefined) continue;
    const current = (base as Record<string, unknown>)[key];
    out[key] = current && typeof current === 'object' && !Array.isArray(current) ? deepMerge(current, value) : value;
  }
  return out as T;
}
