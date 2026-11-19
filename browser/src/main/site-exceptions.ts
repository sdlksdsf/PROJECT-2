import { JsonStore } from './store';
import { hostSuffixes } from './privacy/engine';

interface ExceptionsFile {
  /** Sites where blocking is switched off because a login or video broke. */
  adblockExceptions: string[];
  /** Origins the user trusted for camera, microphone or notifications. */
  trustedOrigins: string[];
  /** Sites the user never wants dark-mode forced on. */
  darkModeExceptions: string[];
}

/**
 * Per-site exceptions. Stored per profile so one person's "allow on this site"
 * never leaks into another profile.
 */
export class SiteExceptions {
  private store: JsonStore<ExceptionsFile>;

  constructor(dir: string) {
    this.store = new JsonStore<ExceptionsFile>(
      'site-exceptions.json',
      () => ({ adblockExceptions: [], trustedOrigins: [], darkModeExceptions: [] }),
      dir
    );
  }

  all(): ExceptionsFile {
    return this.store.get();
  }

  isExempt(host: string): boolean {
    const list = this.store.get().adblockExceptions;
    return hostSuffixes(host).some((suffix) => list.includes(suffix));
  }

  isTrusted(origin: string): boolean {
    return this.store.get().trustedOrigins.includes(origin);
  }

  setExempt(host: string, exempt: boolean): void {
    this.store.update((current) => {
      const set = new Set(current.adblockExceptions);
      if (exempt) set.add(host);
      else set.delete(host);
      return { ...current, adblockExceptions: [...set] };
    });
    this.store.flush();
  }

  setTrusted(origin: string, trusted: boolean): void {
    this.store.update((current) => {
      const set = new Set(current.trustedOrigins);
      if (trusted) set.add(origin);
      else set.delete(origin);
      return { ...current, trustedOrigins: [...set] };
    });
    this.store.flush();
  }

  darkModeExempt(host: string): boolean {
    return this.store.get().darkModeExceptions.includes(host);
  }
}
