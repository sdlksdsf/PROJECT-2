import { app, BrowserWindow, dialog, net, protocol, session, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { KimminoWindow } from './window';
import { ProfileManager } from './profiles';
import { ProfileRuntime } from './profile-runtime';
import { FiltersService } from './privacy/filters';
import { registerIpc, type AppBridge } from './ipc';
import { buildMenu } from './menu';
import { internalUrl, type DeepPartial, type InternalPage, type Preferences } from '../shared/types';
import { APP_HOMEPAGE } from '../shared/defaults';
import type { FilterEngine } from './privacy/engine';

/**
 * Kimmino bootstrap.
 *
 * Privacy-relevant Chromium features are switched off *before* the first window
 * exists. Everything else happens in ProfileRuntime (per identity) and
 * KimminoWindow (per window).
 */

// ---- Privacy / performance switches (must run before app is ready) --------
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-domain-reliability');
app.commandLine.appendSwitch('disable-sync');
app.commandLine.appendSwitch('no-pings');
app.commandLine.appendSwitch('no-default-browser-check');
app.commandLine.appendSwitch('metrics-recording-only');
app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'default_public_interface_only');
app.commandLine.appendSwitch('webrtc-ip-handling-policy', 'default_public_interface_only');
app.commandLine.appendSwitch(
  'disable-features',
  [
    'Translate',
    'MediaRouter',
    'OptimizationHints',
    'InterestFeedContentSuggestions',
    'AutofillServerCommunication',
    'CalculateNativeWinOcclusion',
    'PrivacySandboxSettings4',
    'InterestCohortAPI',
    'FedCm',
    'ThirdPartyStoragePartitioning'
  ].join(',')
);
app.commandLine.appendSwitch('enable-features', 'BackForwardCache:TimeToLiveInBackForwardCache/0');

app.setName('Kimmino');

// Honour a hardware-acceleration opt-out before the GPU process is created.
try {
  const gpuFile = path.join(app.getPath('userData'), 'gpu-state.json');
  if (fs.existsSync(gpuFile)) {
    const state = JSON.parse(fs.readFileSync(gpuFile, 'utf8')) as { hardwareAcceleration?: boolean };
    if (state.hardwareAcceleration === false) app.disableHardwareAcceleration();
  }
} catch {
  // A corrupt or missing marker means "use the default", never a crash loop.
}

const isDev = !app.isPackaged;
const rendererDevUrl = process.env.ELECTRON_RENDERER_URL ?? null;

class KimminoApp {
  readonly profiles = new ProfileManager();
  readonly filters = new FiltersService(app.getAppPath());
  private readonly windows = new Map<number, KimminoWindow>();
  private readonly runtimes = new Map<string, ProfileRuntime>();
  private stats = { ads: 0, trackers: 0, cookies: 0, session: 0 };
  private quitting = false;

  boot(): void {
    this.filters.load();
    void this.filters.refreshIfStale();
    this.registerAssetProtocol();
    this.registerIpc();
    this.wireAppLifecycle();
    this.createWindow({ profileId: this.profiles.currentId(), incognito: false });
    buildMenu({
      newTab: () => this.windows.forEach((win) => win.tabs.create(internalUrl('newtab'))),
      newWindow: () => this.createWindow(),
      newIncognito: () => this.createWindow({ incognito: true }),
      openPage: (page: InternalPage) => this.activeWindow()?.tabs.create(internalUrl(page), { active: true }),
      shortcut: (action: string) => this.broadcast('shortcut', action),
      openExternal: (url: string) => {
        void shell.openExternal(url);
      },
      quit: () => {
        this.quitting = true;
        app.quit();
      }
    });
  }

  private registerAssetProtocol(): void {
    if (!protocol.isProtocolRegistered?.('kimmino-asset')) {
      protocol.registerSchemesAsPrivileged([
        { scheme: 'kimmino-asset', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true } }
      ]);
    }
    app.whenReady().then(() => {
      protocol.handle('kimmino-asset', (request) => {
        try {
          const url = new URL(request.url);
          // kimmino-asset://wallpapers/<file>
          const relative = `${url.hostname}${url.pathname}`.replace(/^\/+/, '');
          const baseDir = path.join(app.getPath('userData'), 'wallpapers');
          const file = path.join(baseDir, path.basename(decodeURIComponent(url.pathname)));
          void relative;
          if (!file.startsWith(baseDir) || !fs.existsSync(file)) {
            return new Response('Not found', { status: 404 });
          }
          return net.fetch(pathToFileURL(file).toString());
        } catch {
          return new Response('Bad request', { status: 400 });
        }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Runtimes & windows                                                 */
  /* ------------------------------------------------------------------ */

  private engine(): FilterEngine | null {
    return this.filters.engine;
  }

  private runtimeFor(profileId: string, incognito: boolean): ProfileRuntime {
    const key = `${profileId}::${incognito ? 'incognito' : 'normal'}`;
    const existing = this.runtimes.get(key);
    if (existing) return existing;
    const profile = this.profiles.get(profileId) ?? this.profiles.current();
    const runtime = new ProfileRuntime(
      profile,
      incognito,
      () => this.engine(),
      (channel, payload) => this.handleRuntimeEvent(channel, payload)
    );
    this.runtimes.set(key, runtime);
    return runtime;
  }

  private handleRuntimeEvent(channel: string, payload: unknown): void {
    if (channel === 'block') {
      const data = payload as { kind: 'ads' | 'trackers' | 'cookies' | 'malware' | 'popups' };
      if (data.kind === 'ads' || data.kind === 'popups') this.stats.ads += 1;
      else if (data.kind === 'cookies') this.stats.cookies += 1;
      else this.stats.trackers += 1;
      this.stats.session += 1;
      return;
    }
    this.broadcast(channel, payload);
  }

  createWindow(options: { profileId?: string; incognito?: boolean } = {}): void {
    const profileId = options.profileId ?? this.profiles.currentId();
    const incognito = options.incognito ?? false;
    const runtime = this.runtimeFor(profileId, incognito);

    const win = new KimminoWindow({
      runtime,
      engine: () => this.engine(),
      preloads: {
        shell: path.join(__dirname, '../preload/index.js'),
        tab: path.join(__dirname, '../preload/tab.js')
      },
      rendererUrl: rendererDevUrl,
      rendererFile: path.join(__dirname, '../renderer/index.html'),
      onClose: () => {
        this.windows.delete(win.id);
        if (!this.windows.size && !this.quitting && process.platform !== 'darwin') {
          if (BrowserWindow.getAllWindows().length === 0) app.quit();
        }
      },
      onInternalNavigate: (page: InternalPage) => {
        win.send('internal', page);
      }
    });

    this.windows.set(win.id, win);
    win.boot(!incognito && this.shouldRestoreSession());
    win.win.on('closed', () => {
      this.windows.delete(win.id);
    });

    setTimeout(() => {
      void this.maybeOfferDefaultBrowser(win);
    }, 2600);
  }

  private shouldRestoreSession(): boolean {
    const prefs = this.runtimes.get(`${this.profiles.currentId()}::normal`)?.prefs.all();
    return Boolean(prefs?.onboarded);
  }

  private async maybeOfferDefaultBrowser(win: KimminoWindow): Promise<void> {
    const runtime = this.runtimeFor(this.profiles.currentId(), false);
    if (!runtime.prefs.all().system.defaultBrowserPrompt) return;
    if (app.isDefaultProtocolClient('https')) return;
    const { response } = await dialog.showMessageBox({
      type: 'question',
      title: 'Make Kimmino your default browser?',
      message: 'Make Kimmino your default browser?',
      detail: 'Kimmino will open links from other apps. You can change this any time in Settings → System.',
      buttons: ['Make default', 'Not now'],
      defaultId: 0,
      cancelId: 1,
      noLink: true
    });
    if (response === 0) {
      app.setAsDefaultProtocolClient('http');
      app.setAsDefaultProtocolClient('https');
    } else {
      runtime.prefs.set({ system: { defaultBrowserPrompt: false } });
    }
    void win;
  }

  private activeWindow(): KimminoWindow | null {
    const focused = BrowserWindow.getFocusedWindow();
    if (focused) {
      const found = [...this.windows.values()].find((win) => win.id === focused.webContents.id);
      if (found) return found;
    }
    return [...this.windows.values()][0] ?? null;
  }

  broadcast(channel: string, payload: unknown): void {
    for (const win of this.windows.values()) win.send(channel, payload);
  }

  async switchProfile(profileId: string): Promise<void> {
    this.profiles.setLast(profileId);
    for (const win of [...this.windows.values()]) win.close();
    this.windows.clear();
    setTimeout(() => this.createWindow({ profileId, incognito: false }), 120);
  }

  restart(): void {
    this.quitting = true;
    app.relaunch();
    app.quit();
  }

  /* ------------------------------------------------------------------ */
  /* Wiring                                                             */
  /* ------------------------------------------------------------------ */

  private registerIpc(): void {
    const bridge: AppBridge = {
      profiles: this.profiles,
      filters: this.filters,
      engine: () => this.engine(),
      sessionStats: () => ({ ...this.stats }),
      broadcast: (channel, payload) => this.broadcast(channel, payload),
      openWindow: (options) => this.createWindow(options),
      switchProfile: (id) => this.switchProfile(id),
      restart: () => this.restart(),
      windowFor: (event) => {
        const id = event.sender.id;
        for (const win of this.windows.values()) if (win.id === id) return win;
        return null;
      },
      runtimeFor: (win) => {
        if (!win) return null;
        return this.runtimeFor(win.tabs.snapshot().profileId, win.tabs.snapshot().incognito);
      }
    };
    registerIpc(bridge);
  }

  private wireAppLifecycle(): void {
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit();
    });
    app.on('activate', () => {
      if (!this.windows.size) this.createWindow();
    });
    app.on('before-quit', () => {
      this.quitting = true;
      for (const runtime of this.runtimes.values()) runtime.dispose();
      this.profiles.flush();
    });
    // Open external links in a Kimmino tab instead of handing them to another browser.
    app.on('second-instance', (_event, argv) => {
      const url = argv.find((arg) => /^https?:\/\//.test(arg));
      const win = this.activeWindow();
      if (url && win) win.tabs.create(url, { active: true });
      else win?.focus();
    });
    session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  }

  setPrefsForActiveProfile(patch: DeepPartial<Preferences>): void {
    const win = this.activeWindow();
    const runtime = win ? this.runtimeFor(win.tabs.snapshot().profileId, win.tabs.snapshot().incognito) : null;
    runtime?.prefs.set(patch);
  }
}

/* ---------------------------------------------------------------------- */

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  const kimmino = new KimminoApp();

  app.whenReady().then(() => {
    if (process.platform === 'win32') app.setAppUserModelId('com.kimmino.browser');
    if (process.platform === 'darwin') {
      app.setAboutPanelOptions({ applicationName: 'Kimmino', applicationVersion: app.getVersion(), website: APP_HOMEPAGE });
    }
    kimmino.boot();
  });

  // Focus the address bar when a new window opens on a supported platform.
  app.on('browser-window-focus', () => undefined);
  void isDev;
  void session;
}
