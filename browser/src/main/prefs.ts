import { app } from 'electron';
import path from 'node:path';
import { JsonStore, deepMerge, profileDir } from './store';
import { DEFAULT_PREFERENCES } from '../shared/defaults';
import type { DeepPartial, Preferences } from '../shared/types';

/**
 * Preferences are stored *per profile*, so two people (or one person with a
 * work and a personal identity) never share settings, wallpapers or privacy
 * decisions.
 */
export class PrefsManager {
  private store: JsonStore<Preferences>;
  private readonly listeners = new Set<(prefs: Preferences) => void>();

  constructor(private profileId: string) {
    this.store = new JsonStore<Preferences>(
      'preferences.json',
      () => structuredClone(DEFAULT_PREFERENCES),
      profileDir(profileId)
    );
    this.store.set(deepMerge(structuredClone(DEFAULT_PREFERENCES), this.store.get()));
  }

  all(): Preferences {
    return this.store.get();
  }

  set(patch: DeepPartial<Preferences>): Preferences {
    this.store.set(deepMerge(this.store.get(), patch));
    this.store.flush();
    const next = this.store.get();
    this.listeners.forEach((fn) => fn(next));
    return next;
  }

  reset(section?: keyof Preferences): Preferences {
    const defaults = structuredClone(DEFAULT_PREFERENCES);
    if (!section) {
      this.store.set(defaults);
    } else {
      this.store.update((current) => ({ ...current, [section]: defaults[section] }));
    }
    this.store.flush();
    const next = this.store.get();
    this.listeners.forEach((fn) => fn(next));
    return next;
  }

  onChange(fn: (prefs: Preferences) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  get file(): string {
    return path.join(profileDir(this.profileId), 'preferences.json');
  }

  flush(): void {
    this.store.flush();
  }
}
