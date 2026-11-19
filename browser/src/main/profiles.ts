import { app, session } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { JsonStore, ensureDir, profileDir } from './store';
import type { ProfileSummary } from '../shared/types';

interface ProfilesFile {
  profiles: Array<Omit<ProfileSummary, 'isDefault'>>;
  lastProfileId: string;
  incognitoId: string | null;
}

const DEFAULT_PROFILES: ProfilesFile = {
  profiles: [
    {
      id: 'default',
      name: 'Personal',
      color: '#6d8cff',
      avatar: null,
      email: null,
      incognito: false,
      createdAt: Date.now()
    }
  ],
  lastProfileId: 'default',
  incognitoId: null
};

const PROFILE_COLORS = ['#6d8cff', '#33d6a6', '#ff8f5e', '#c084fc', '#f472b6', '#facc15'];

/** Multi-profile identity, each with its own cookie jar, cache and settings. */
export class ProfileManager {
  private store: JsonStore<ProfilesFile>;

  constructor() {
    this.store = new JsonStore<ProfilesFile>('profiles.json', () => structuredClone(DEFAULT_PROFILES));
    if (!this.store.get().profiles?.length) this.store.set(structuredClone(DEFAULT_PROFILES));
  }

  list(): ProfileSummary[] {
    const { profiles, lastProfileId } = this.store.get();
    return profiles.map((p) => ({ ...p, isDefault: p.id === lastProfileId }));
  }

  currentId(): string {
    return this.store.get().lastProfileId;
  }

  current(): ProfileSummary {
    const id = this.currentId();
    const found = this.list().find((p) => p.id === id);
    return found ?? this.list()[0];
  }

  get(id: string): ProfileSummary | undefined {
    return this.list().find((p) => p.id === id);
  }

  create(input: { name: string; color?: string; avatar?: string | null }): ProfileSummary {
    const file = this.store.get();
    const id = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const profile = {
      id,
      name: input.name.trim() || `Profile ${file.profiles.length + 1}`,
      color: input.color ?? PROFILE_COLORS[file.profiles.length % PROFILE_COLORS.length],
      avatar: input.avatar ?? null,
      email: null,
      incognito: false,
      createdAt: Date.now()
    };
    this.store.update((current) => ({ ...current, profiles: [...current.profiles, profile] }));
    this.store.flush();
    ensureDir(profileDir(id));
    return { ...profile, isDefault: false };
  }

  rename(id: string, name: string): void {
    this.store.update((current) => ({
      ...current,
      profiles: current.profiles.map((p) => (p.id === id ? { ...p, name } : p))
    }));
    this.store.flush();
  }

  setEmail(id: string, email: string | null): void {
    this.store.update((current) => ({
      ...current,
      profiles: current.profiles.map((p) => (p.id === id ? { ...p, email } : p))
    }));
    this.store.flush();
  }

  setLast(id: string): void {
    this.store.update((current) => ({ ...current, lastProfileId: id }));
    this.store.flush();
  }

  async remove(id: string): Promise<void> {
    const file = this.store.get();
    if (file.profiles.length <= 1) throw new Error('You need at least one profile.');
    const partition = partitionFor(id);
    const ses = session.fromPartition(partition);
    await ses.clearStorageData();
    await ses.clearCache();
    const dir = path.join(app.getPath('userData'), 'profiles', id);
    fs.rmSync(dir, { recursive: true, force: true });
    // Session data folder
    const sessionDir = path.join(app.getPath('userData'), 'Partitions', partition.replace('persist:', ''));
    fs.rmSync(sessionDir, { recursive: true, force: true });

    this.store.update((current) => {
      const profiles = current.profiles.filter((p) => p.id !== id);
      return {
        ...current,
        profiles,
        lastProfileId: current.lastProfileId === id ? profiles[0].id : current.lastProfileId
      };
    });
    this.store.flush();
  }

  partitionFor(profileId: string): string {
    return partitionFor(profileId);
  }

  incognitoPartition(): string {
    return `kimmino-incognito-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  flush(): void {
    this.store.flush();
  }
}

export function partitionFor(profileId: string): string {
  return `persist:kimmino-${profileId}`;
}

export function downloadsDir(): string {
  const candidates = [app.getPath('downloads'), path.join(os.homedir(), 'Downloads')];
  for (const dir of candidates) {
    try {
      if (fs.existsSync(dir)) return dir;
    } catch {
      /* ignore */
    }
  }
  return os.tmpdir();
}

export function screenshotsDir(): string {
  const pictures = (() => {
    try {
      return app.getPath('pictures');
    } catch {
      return path.join(os.homedir(), 'Pictures');
    }
  })();
  return ensureDir(path.join(pictures, 'Kimmino Screenshots'));
}
