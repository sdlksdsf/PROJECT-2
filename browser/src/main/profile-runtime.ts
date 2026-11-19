import { app, session, type Session } from 'electron';
import path from 'node:path';
import { PrefsManager } from './prefs';
import { Library } from './library';
import { ExtensionService } from './extensions';
import { SiteExceptions } from './site-exceptions';
import { SyncService } from './sync';
import { ThemeService } from './themes';
import { AiService } from './ai';
import { applyNetworkPrivacy } from './privacy/network';
import { configurePermissions } from './permissions';
import { attachDownloads } from './downloads';
import { profileDir } from './store';
import type { FilterEngine } from './privacy/engine';
import type { ProfileSummary } from '../shared/types';

/**
 * Everything that belongs to one identity: its cookie jar, settings, history,
 * extensions, exceptions and sync session. Windows of the same profile share a
 * runtime; a second profile is a completely separate sandbox.
 */
export class ProfileRuntime {
  readonly ses: Session;
  readonly prefs: PrefsManager;
  readonly library: Library;
  readonly extensions: ExtensionService;
  readonly exceptions: SiteExceptions;
  readonly sync: SyncService;
  readonly themes: ThemeService;
  readonly ai: AiService;

  constructor(
    readonly profile: ProfileSummary,
    readonly incognito: boolean,
    readonly engine: () => FilterEngine | null,
    private readonly notify: (channel: string, payload: unknown) => void
  ) {
    const dir = incognito ? path.join(app.getPath('temp'), 'kimmino-incognito') : profileDir(profile.id);
    this.ses = incognito
      ? session.fromPartition(`kimmino-incognito-${Date.now().toString(36)}`)
      : session.fromPartition(`persist:kimmino-${profile.id}`);

    this.prefs = new PrefsManager(profile.id);
    this.library = new Library(profile.id);
    this.extensions = new ExtensionService(profile.id, path.join(dir, 'extensions'));
    this.exceptions = new SiteExceptions(dir);
    this.themes = new ThemeService(dir);
    this.sync = new SyncService(dir, this.library, this.prefs, profile.id);
    this.ai = new AiService(() => this.prefs.all());

    this.wireSession();
  }

  private wireSession(): void {
    const prefs = () => this.prefs.all();
    const ua = prefs().developer.customUserAgent;
    if (ua) this.ses.setUserAgent(ua);

    applyNetworkPrivacy(this.ses, {
      prefs,
      engine: this.engine,
      onBlock: (_wcId, kind, url, host) => {
        this.notify('block', { kind, url, host });
      },
      onCookieBlocked: (_wcId, host) => {
        this.notify('cookie-blocked', { host });
      },
      isExempt: (host) => this.exceptions.isExempt(host)
    });

    configurePermissions(this.ses, prefs, {
      isTrusted: (origin) => this.exceptions.isTrusted(origin),
      onDenied: (origin, permission) => this.notify('permission-denied', { origin, permission })
    });

    attachDownloads(
      this.ses,
      this.library,
      prefs,
      (items) => this.notify('downloads', items)
    );

    void this.extensions.syncInto(this.ses);

    if (prefs().system.spellcheck) {
      this.ses.setSpellCheckerLanguages(['en-US']);
    }
    this.ses.setSpellCheckerEnabled(prefs().system.spellcheck);

    this.sync.onChange((status) => this.notify('sync', status));
    this.notify('sync', this.sync.statusOf());
  }

  /** Applies preference changes that need session-level action. */
  onPrefsChanged(): void {
    const prefs = this.prefs.all();
    this.ses.setSpellCheckerEnabled(prefs.system.spellcheck);
    if (prefs.developer.customUserAgent) this.ses.setUserAgent(prefs.developer.customUserAgent);
  }

  async clearData(options: {
    cookies?: boolean;
    cache?: boolean;
    history?: boolean;
    downloads?: boolean;
    passwords?: boolean;
    siteData?: boolean;
    since?: 'hour' | 'day' | 'week' | 'all';
  }): Promise<void> {
    if (options.cookies || options.siteData) await this.ses.clearStorageData({ storages: ['cookies'] });
    if (options.siteData) {
      await this.ses.clearStorageData({
        storages: ['localstorage', 'indexdb', 'cachestorage', 'serviceworkers', 'shadercache']
      });
    }
    if (options.cache) await this.ses.clearCache();
    if (options.history) this.library.clearHistory(options.since ?? 'all');
    if (options.downloads) {
      for (const item of this.library.downloads()) this.library.removeDownload(item.id);
    }
  }

  dispose(): void {
    this.sync.destroy();
    this.prefs.flush();
    this.library.flush();
  }
}
