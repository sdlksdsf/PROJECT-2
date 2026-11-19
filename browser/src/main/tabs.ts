import { Menu, WebContentsView, clipboard, shell, type BaseWindow, type Session, type WebContents } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { Library } from './library';
import type { FilterEngine } from './privacy/engine';
import type { ContentRect, InternalPage, Preferences, TabState, WindowState } from '../shared/types';
import { internalUrl, isInternalUrl } from '../shared/types';
import { safeOrigin } from './permissions';

export interface TabManagerOptions {
  win: BaseWindow;
  session: Session;
  sessionId: string;
  incognito: boolean;
  profileId: string;
  profileName: string;
  prefs: () => Preferences;
  engine: () => FilterEngine | null;
  library: Library;
  emit: () => void;
  onInternalNavigate: (page: InternalPage) => void;
  isTrusted: (origin: string) => boolean;
  preloadPath: string;
  appRoot: string;
}

interface Tab {
  id: string;
  view: WebContentsView | null;
  url: string;
  title: string;
  favicon: string | null;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  isPinned: boolean;
  isMuted: boolean;
  audible: boolean;
  discarded: boolean;
  groupId: string | null;
  splitWith: string | null;
  splitSide: 'left' | 'right' | null;
  blocked: { ads: number; trackers: number; cookies: number };
  trust: number;
  zoom: number;
  createdAt: number;
  lastActiveAt: number;
  crashed: boolean;
}

const CONTEXT_MENU_ITEMS = [
  { id: 'back', label: 'Back' },
  { id: 'forward', label: 'Forward' },
  { id: 'reload', label: 'Reload' },
  { id: 'sep', type: 'separator' as const },
  { id: 'newtab', label: 'Open link in new tab' },
  { id: 'newsplit', label: 'Open link in split view' },
  { id: 'copy', label: 'Copy link address' },
  { id: 'sep', type: 'separator' as const },
  { id: 'screenshot', label: 'Capture area…' },
  { id: 'inspector', label: 'Inspect element' }
];

export class TabManager {
  readonly tabs = new Map<string, Tab>();
  order: string[] = [];
  activeId: string | null = null;
  private closedStack: Array<{ url: string; title: string }> = [];
  private bounds: ContentRect = { x: 0, y: 0, width: 0, height: 0 };
  private splitBounds: ContentRect | null = null;
  private contentVisible = true;
  private saverTimer: NodeJS.Timeout | null = null;
  private lastPersist = 0;

  constructor(private readonly opts: TabManagerOptions) {
    this.saverTimer = setInterval(() => this.runMemorySaver(), 60_000);
    this.saverTimer.unref?.();
  }

  /* ------------------------------------------------------------------ */
  /* Creation                                                           */
  /* ------------------------------------------------------------------ */

  create(url = internalUrl('newtab'), options: { active?: boolean; index?: number; background?: boolean } = {}): string {
    const id = `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const tab: Tab = {
      id,
      view: null,
      url,
      title: isInternalUrl(url) ? internalTitle(url) : url,
      favicon: null,
      loading: false,
      canGoBack: false,
      canGoForward: false,
      isPinned: false,
      isMuted: false,
      audible: false,
      discarded: false,
      groupId: null,
      splitWith: null,
      splitSide: null,
      blocked: { ads: 0, trackers: 0, cookies: 0 },
      trust: 100,
      zoom: 1,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      crashed: false
    };
    this.tabs.set(id, tab);
    const index = options.index ?? this.order.length;
    this.order.splice(Math.max(0, Math.min(index, this.order.length)), 0, id);

    if (!isInternalUrl(url)) this.ensureView(tab, url);

    if (options.active !== false) this.activate(id);
    else {
      this.layout();
      this.emitChange();
    }
    this.persistSoon();
    return id;
  }

  private ensureView(tab: Tab, url?: string): WebContentsView {
    if (tab.view) return tab.view;
    const prefs = this.opts.prefs();
    const view = new WebContentsView({
      webPreferences: {
        session: this.opts.session,
        preload: this.opts.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        spellcheck: prefs.system.spellcheck,
        backgroundThrottling: prefs.performance.backgroundThrottle,
        safeDialogs: true,
        additionalArguments: [
          `--kimmino-config=${encodeURIComponent(
            JSON.stringify({
              fingerprint: prefs.privacy.fingerprintProtection,
              blockWebRTC: prefs.privacy.blockWebRTC,
              blockLocation: prefs.privacy.blockLocation,
              autoDeclineConsent: prefs.privacy.autoDeclineConsent,
              forceDark: prefs.productivity.forceDarkMode,
              videoEnhancer: prefs.productivity.videoEnhancer,
              language: prefs.system.language
            })
          )}`
        ]
      }
    });
    view.setBackgroundColor(prefs.themeMode === 'light' ? '#ffffff' : '#0b0d12');
    this.opts.win.contentView.addChildView(view);
    tab.view = view;
    tab.discarded = false;
    tab.crashed = false;
    this.wireTab(tab, view.webContents);
    if (url || tab.url) void view.webContents.loadURL(url ?? tab.url).catch(() => {});
    this.layout();
    return view;
  }

  private wireTab(tab: Tab, wc: WebContents): void {
    wc.setZoomFactor(tab.zoom);
    wc.setAudioMuted(tab.isMuted);

    const setUrl = (url: string) => {
      if (tab.url === url) return;
      tab.url = url;
      this.emitChange();
      this.persistSoon();
    };

    wc.on('did-start-navigation', (_e, url, _inPlace, isMainFrame) => {
      if (!isMainFrame) return;
      tab.loading = true;
      setUrl(url);
      this.emitChange();
    });

    wc.on('did-navigate', (_e, url) => {
      tab.canGoBack = wc.navigationHistory?.canGoBack?.() ?? false;
      tab.canGoForward = wc.navigationHistory?.canGoForward?.() ?? false;
      setUrl(url);
      this.emitChange();
    });

    wc.on('did-navigate-in-page', (_e, url, isMainFrame) => {
      if (!isMainFrame) return;
      setUrl(url);
      this.emitChange();
    });

    wc.on('did-finish-load', () => {
      tab.loading = false;
      tab.trust = this.opts.engine() ? rateLocally(tab.url, this.opts.engine()!) : 100;
      if (!this.opts.incognito) this.opts.library.addVisit(tab.url, tab.title);
      this.emitChange();
    });

    wc.on('did-stop-loading', () => {
      tab.loading = false;
      this.emitChange();
    });

    wc.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame || errorCode === -3) return;
      tab.loading = false;
      void this.showErrorPage(tab, validatedURL, errorCode, errorDescription);
    });

    wc.on('page-title-updated', (_e, title) => {
      tab.title = title || tab.url;
      this.emitChange();
    });

    wc.on('page-favicon-updated', (_e, favicons) => {
      if (favicons.length) {
        tab.favicon = favicons[0];
        this.emitChange();
      }
    });

    wc.on('media-started-playing', () => {
      tab.audible = true;
      this.emitChange();
    });
    wc.on('media-paused', () => {
      tab.audible = false;
      this.emitChange();
    });

    wc.on('render-process-gone', () => {
      tab.crashed = true;
      tab.loading = false;
      this.emitChange();
    });

    wc.on('will-navigate', (event, url) => {
      if (isInternalUrl(url)) {
        event.preventDefault();
        this.navigate(url, tab.id);
      }
    });

    wc.setWindowOpenHandler(({ url, disposition }) => {
      if (this.opts.prefs().privacy.blockPopups && disposition === 'new-window') {
        this.create(url, { active: false });
        return { action: 'deny' };
      }
      this.create(url, { active: true });
      return { action: 'deny' };
    });

    wc.on('context-menu', (_e, params) => {
      const menu = Menu.buildFromTemplate([
        {
          id: 'back',
          label: 'Back',
          enabled: tab.canGoBack,
          click: () => this.back(tab.id)
        },
        {
          id: 'forward',
          label: 'Forward',
          enabled: tab.canGoForward,
          click: () => this.forward(tab.id)
        },
        { id: 'reload', label: 'Reload', click: () => this.reload(tab.id) },
        { type: 'separator' },
        ...(params.linkURL
          ? [
              {
                id: 'newtab',
                label: 'Open link in new tab',
                click: () => this.create(params.linkURL, { active: false })
              },
              {
                id: 'newsplit',
                label: 'Open link in split view',
                click: () => {
                  const other = this.create(params.linkURL, { active: false });
                  this.split(tab.id, other);
                }
              },
              { id: 'copy', label: 'Copy link address', click: () => clipboard.writeText(params.linkURL) },
              { type: 'separator' as const }
            ]
          : []),
        ...(params.isEditable
          ? [
              { role: 'cut' as const },
              { role: 'copy' as const },
              { role: 'paste' as const },
              { role: 'selectAll' as const },
              { type: 'separator' as const }
            ]
          : [{ role: 'copy' as const }, { type: 'separator' as const }]),
        {
          label: 'Add to reading list',
          click: () => this.opts.library.addBookmark({ title: tab.title, url: params.linkURL || tab.url })
        },
        {
          label: 'Capture screenshot',
          click: () => wc.send('kimmino:shortcut', 'screenshot')
        },
        { type: 'separator' },
        ...(this.opts.prefs().developer.devToolsEnabled
          ? [{ label: 'Inspect element', click: () => wc.inspectElement(params.x, params.y) }]
          : [])
      ]);
      menu.popup({ window: this.opts.win as never });
    });

    wc.on('enter-html-full-screen', () => this.emitChange());
    void CONTEXT_MENU_ITEMS;
  }

  private async showErrorPage(tab: Tab, url: string, code: number, description: string): Promise<void> {
    const html = errorPageHtml(url, code, description, this.opts.prefs().themeMode !== 'light');
    await tab.view?.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`).catch(() => {});
    tab.title = 'Page not available';
    this.emitChange();
  }

  /* ------------------------------------------------------------------ */
  /* Navigation                                                         */
  /* ------------------------------------------------------------------ */

  activate(id: string): void {
    const tab = this.tabs.get(id);
    if (!tab) return;
    this.activeId = id;
    tab.lastActiveAt = Date.now();
    if (tab.discarded && !isInternalUrl(tab.url)) this.ensureView(tab, tab.url);
    this.layout();
    this.emitChange();
    this.persistSoon();
  }

  navigate(rawUrl: string, id?: string): void {
    const tab = this.tabs.get(id ?? this.activeId ?? '');
    if (!tab) {
      this.create(rawUrl, { active: true });
      return;
    }
    const url = rawUrl;
    tab.url = url;
    tab.title = isInternalUrl(url) ? internalTitle(url) : url;
    tab.canGoBack = false;
    tab.canGoForward = false;
    tab.discarded = false;

    if (isInternalUrl(url)) {
      // Internal pages are painted by the shell renderer, so drop the web view.
      if (tab.view) {
        this.opts.win.contentView.removeChildView(tab.view);
        tab.view.webContents.close();
        tab.view = null;
      }
      const page = url.replace('kimmino://', '').split(/[/?#]/)[0] as InternalPage;
      this.opts.onInternalNavigate(page);
      this.layout();
      this.emitChange();
      return;
    }

    const view = this.ensureView(tab, url);
    void view.webContents.loadURL(url).catch(() => {});
    this.layout();
    this.emitChange();
    this.persistSoon();
  }

  back(id?: string): void {
    const tab = this.tabs.get(id ?? this.activeId ?? '');
    if (tab?.view?.webContents.navigationHistory?.canGoBack()) tab.view.webContents.navigationHistory.goBack();
    else tab?.view?.webContents.goBack();
  }

  forward(id?: string): void {
    const tab = this.tabs.get(id ?? this.activeId ?? '');
    if (tab?.view?.webContents.navigationHistory?.canGoForward()) tab.view.webContents.navigationHistory.goForward();
    else tab?.view?.webContents.goForward();
  }

  reload(id?: string, hard = false): void {
    const tab = this.tabs.get(id ?? this.activeId ?? '');
    if (!tab) return;
    if (!tab.view) {
      if (!isInternalUrl(tab.url)) this.ensureView(tab, tab.url);
      return;
    }
    if (hard) tab.view.webContents.reloadIgnoringCache();
    else tab.view.webContents.reload();
  }

  stop(id?: string): void {
    const tab = this.tabs.get(id ?? this.activeId ?? '');
    tab?.view?.webContents.stop();
  }

  close(id: string): void {
    const tab = this.tabs.get(id);
    if (!tab) return;
    if (this.order.length === 1) {
      // Never leave the window empty — reset the last tab to the start page.
      this.navigate(internalUrl('newtab'), id);
      return;
    }
    if (!isInternalUrl(tab.url)) this.closedStack.push({ url: tab.url, title: tab.title });
    if (this.closedStack.length > 25) this.closedStack.shift();

    if (tab.view) {
      this.opts.win.contentView.removeChildView(tab.view);
      tab.view.webContents.close();
      tab.view = null;
    }
    const index = this.order.indexOf(id);
    this.order = this.order.filter((t) => t !== id);
    this.tabs.delete(id);

    if (tab.splitWith) {
      const other = this.tabs.get(tab.splitWith);
      if (other) {
        other.splitWith = null;
        other.splitSide = null;
      }
    }

    if (this.activeId === id) {
      const next = this.order[Math.min(index, this.order.length - 1)];
      this.activeId = next ?? null;
      if (next) {
        const nextTab = this.tabs.get(next);
        if (nextTab) nextTab.lastActiveAt = Date.now();
      }
    }
    this.layout();
    this.emitChange();
    this.persistSoon();
  }

  closeOthers(id: string): void {
    for (const other of [...this.order]) if (other !== id) this.close(other);
    this.activate(id);
  }

  reopenClosed(): void {
    const last = this.closedStack.pop();
    if (last) this.create(last.url, { active: true });
  }

  duplicate(id: string): string {
    const tab = this.tabs.get(id);
    if (!tab) return this.create();
    return this.create(tab.url, { active: true, index: this.order.indexOf(id) + 1 });
  }

  reorder(id: string, index: number): void {
    const current = this.order.indexOf(id);
    if (current === -1) return;
    this.order.splice(current, 1);
    this.order.splice(Math.max(0, Math.min(index, this.order.length)), 0, id);
    this.emitChange();
    this.persistSoon();
  }

  setPinned(id: string, pinned: boolean): void {
    const tab = this.tabs.get(id);
    if (!tab) return;
    tab.isPinned = pinned;
    // Pinned tabs float to the front of the strip.
    this.order = [...this.order.filter((t) => t !== id)];
    const pinnedCount = [...this.tabs.values()].filter((t) => t.isPinned && t.id !== id).length;
    this.order.splice(pinned ? pinnedCount : this.order.length, 0, id);
    this.emitChange();
    this.persistSoon();
  }

  setMuted(id: string, muted: boolean): void {
    const tab = this.tabs.get(id);
    if (!tab) return;
    tab.isMuted = muted;
    tab.view?.webContents.setAudioMuted(muted);
    this.emitChange();
  }

  setZoom(id: string, zoom: number): void {
    const tab = this.tabs.get(id);
    if (!tab) return;
    tab.zoom = Math.min(3, Math.max(0.3, zoom));
    tab.view?.webContents.setZoomFactor(tab.zoom);
    this.emitChange();
  }

  split(id: string, otherId: string | null): void {
    const tab = this.tabs.get(id);
    if (!tab) return;
    if (!otherId) {
      const partner = tab.splitWith ? this.tabs.get(tab.splitWith) : null;
      tab.splitWith = null;
      tab.splitSide = null;
      if (partner) {
        partner.splitWith = null;
        partner.splitSide = null;
      }
      this.layout();
      this.emitChange();
      return;
    }
    const other = this.tabs.get(otherId);
    if (!other || other.id === tab.id) return;
    tab.splitWith = other.id;
    tab.splitSide = 'left';
    other.splitWith = tab.id;
    other.splitSide = 'right';
    this.activeId = tab.id;
    this.layout();
    this.emitChange();
  }

  toggleSplit(otherId?: string): void {
    const active = this.tabs.get(this.activeId ?? '');
    if (!active) return;
    if (active.splitWith) {
      this.split(active.id, null);
      return;
    }
    const partner = otherId ?? this.order.find((t) => t !== active.id && !this.tabs.get(t)?.splitWith);
    if (partner) this.split(active.id, partner);
  }

  /* ------------------------------------------------------------------ */
  /* Layout                                                             */
  /* ------------------------------------------------------------------ */

  setContentBounds(rect: ContentRect, splitRect: ContentRect | null, visible: boolean): void {
    this.bounds = rect;
    this.splitBounds = splitRect;
    this.contentVisible = visible;
    this.layout();
  }

  private layout(): void {
    const active = this.tabs.get(this.activeId ?? '');
    if (!active) return;
    const partner = active.splitWith ? this.tabs.get(active.splitWith) : null;
    const b = this.bounds;
    const width = Math.max(1, b.width);
    const leftRect: ContentRect = { x: b.x, y: b.y, width: Math.floor(width / 2), height: b.height };
    const rightRect: ContentRect = { x: b.x + Math.floor(width / 2), y: b.y, width: Math.ceil(width / 2), height: b.height };

    for (const tab of this.tabs.values()) {
      if (!tab.view) continue;
      const isActive = tab.id === active.id;
      const isPartner = partner ? tab.id === partner.id : false;
      const shouldShow = this.contentVisible && (isActive || isPartner);
      tab.view.setVisible(shouldShow);
      if (!shouldShow) continue;
      if (partner) {
        tab.view.setBounds(roundRect(tab.splitSide === 'right' ? rightRect : leftRect));
      } else {
        tab.view.setBounds(roundRect(b));
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Memory saver                                                       */
  /* ------------------------------------------------------------------ */

  runMemorySaver(): void {
    const prefs = this.opts.prefs();
    if (!prefs.performance.memorySaver) return;
    const limitMs = Math.max(1, prefs.performance.memorySaverMinutes) * 60_000;
    const now = Date.now();
    for (const tab of this.tabs.values()) {
      if (tab.id === this.activeId) continue;
      if (tab.isPinned || tab.audible || tab.discarded || !tab.view) continue;
      if (tab.url.startsWith('kimmino://')) continue;
      if (now - tab.lastActiveAt < limitMs) continue;
      this.discard(tab.id);
    }
  }

  discard(id: string): void {
    const tab = this.tabs.get(id);
    if (!tab?.view) return;
    const wc = tab.view.webContents;
    this.opts.win.contentView.removeChildView(tab.view);
    wc.close();
    tab.view = null;
    tab.discarded = true;
    tab.loading = false;
    tab.audible = false;
    this.emitChange();
  }

  discardAllInactive(): number {
    let count = 0;
    for (const tab of this.tabs.values()) {
      if (tab.id === this.activeId || !tab.view || tab.isPinned) continue;
      this.discard(tab.id);
      count += 1;
    }
    return count;
  }

  /* ------------------------------------------------------------------ */
  /* Counters & helpers                                                 */
  /* ------------------------------------------------------------------ */

  noteBlock(tabWebContentsId: number | undefined, kind: 'ads' | 'trackers' | 'malware' | 'popups' | 'cookies'): void {
    if (!tabWebContentsId) return;
    for (const tab of this.tabs.values()) {
      if (tab.view?.webContents.id === tabWebContentsId) {
        if (kind === 'cookies') tab.blocked.cookies += 1;
        else if (kind === 'ads' || kind === 'popups') tab.blocked.ads += 1;
        else tab.blocked.trackers += 1;
        this.emitChange();
        return;
      }
    }
  }

  noteCookieBlocked(tabWebContentsId: number | undefined): void {
    this.noteBlock(tabWebContentsId, 'cookies');
  }

  activeTab(): Tab | undefined {
    return this.tabs.get(this.activeId ?? '');
  }

  activeWebContents(): WebContents | null {
    return this.activeTab()?.view?.webContents ?? null;
  }

  snapshot(): WindowState {
    return {
      tabs: this.order.map((id) => this.tabState(this.tabs.get(id)!)),
      activeId: this.activeId,
      incognito: this.opts.incognito,
      profileId: this.opts.profileId,
      profileName: this.opts.profileName,
      maximized: (this.opts.win as unknown as { isMaximized?: () => boolean }).isMaximized?.() ?? false,
      fullscreen: (this.opts.win as unknown as { isFullScreen?: () => boolean }).isFullScreen?.() ?? false
    };
  }

  private tabState(tab: Tab): TabState {
    return {
      id: tab.id,
      url: tab.url,
      title: tab.title,
      favicon: tab.favicon,
      loading: tab.loading,
      canGoBack: tab.canGoBack,
      canGoForward: tab.canGoForward,
      isPinned: tab.isPinned,
      isMuted: tab.isMuted,
      audible: tab.audible,
      discarded: tab.discarded,
      groupId: tab.groupId,
      splitWith: tab.splitWith,
      splitSide: tab.splitSide,
      blocked: { ...tab.blocked },
      trust: tab.trust,
      secure: tab.url.startsWith('https://'),
      zoom: tab.zoom,
      createdAt: tab.createdAt,
      lastActiveAt: tab.lastActiveAt
    };
  }

  private emitChange(): void {
    this.opts.emit();
  }

  private persistSoon(): void {
    const now = Date.now();
    if (now - this.lastPersist < 400) return;
    this.lastPersist = now;
    const data = this.order
      .map((id) => this.tabs.get(id))
      .filter((t): t is Tab => Boolean(t))
      .map((t) => ({ url: t.url, title: t.title, pinned: t.isPinned }))
      .filter((t) => !t.url.startsWith('data:'));
    try {
      const dir = path.dirname(this.sessionFile());
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.sessionFile(), JSON.stringify({ tabs: data, savedAt: Date.now() }, null, 2), 'utf8');
    } catch {
      /* ignore */
    }
  }

  private sessionFile(): string {
    return path.join(this.opts.appRoot, 'session.json');
  }

  restore(): boolean {
    try {
      const raw = JSON.parse(fs.readFileSync(this.sessionFile(), 'utf8')) as {
        tabs: Array<{ url: string; title: string; pinned: boolean }>;
      };
      if (!raw?.tabs?.length) return false;
      for (const entry of raw.tabs.slice(0, 30)) {
        const id = this.create(entry.url, { active: false });
        const tab = this.tabs.get(id);
        if (tab) {
          tab.isPinned = Boolean(entry.pinned);
          if (entry.title) tab.title = entry.title;
        }
      }
      const firstPinned = raw.tabs.findIndex((t) => t.pinned);
      this.activate(this.order[firstPinned >= 0 ? firstPinned : 0]);
      return true;
    } catch {
      return false;
    }
  }

  destroy(): void {
    if (this.saverTimer) clearInterval(this.saverTimer);
    for (const tab of this.tabs.values()) {
      if (tab.view) {
        this.opts.win.contentView.removeChildView(tab.view);
        tab.view.webContents.close();
        tab.view = null;
      }
    }
    this.tabs.clear();
    this.order = [];
  }

  toggleDevTools(id?: string): void {
    const wc = this.tabs.get(id ?? this.activeId ?? '')?.view?.webContents;
    if (!wc) return;
    if (wc.isDevToolsOpened()) wc.closeDevTools();
    else wc.openDevTools({ mode: 'right' });
  }

  async runFind(text: string, options: { forward?: boolean; findNext?: boolean } = {}): Promise<Electron.FoundInPageResult | null> {
    const wc = this.activeWebContents();
    if (!wc || !text) return null;
    const result = (await wc.findInPage(text, { forward: options.forward ?? true, findNext: options.findNext ?? false })) as unknown;
    return (result as Electron.FoundInPageResult) ?? null;
  }

  stopFind(): void {
    this.activeWebContents()?.stopFindInPage('clearSelection');
  }

  async captureActive(): Promise<Electron.NativeImage | null> {
    const wc = this.activeWebContents();
    if (!wc) return null;
    return wc.capturePage();
  }

  hideAll(visible: boolean): void {
    this.contentVisible = visible;
    this.layout();
  }

  async openDevToolsForActive(): Promise<void> {
    this.toggleDevTools();
  }

  async openExternal(url: string): Promise<void> {
    await shell.openExternal(url);
  }

  trustedOrigins(): string[] {
    return [...this.tabs.values()].map((t) => safeOrigin(t.url)).filter(Boolean);
  }
}

function roundRect(rect: ContentRect): ContentRect {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.max(0, Math.round(rect.width)),
    height: Math.max(0, Math.round(rect.height))
  };
}

export function internalTitle(url: string): string {
  const page = url.replace('kimmino://', '').split(/[/?#]/)[0];
  const map: Record<string, string> = {
    newtab: 'New tab',
    settings: 'Settings',
    history: 'History',
    downloads: 'Downloads',
    bookmarks: 'Bookmarks',
    extensions: 'Extensions',
    themes: 'Themes',
    passwords: 'Passwords',
    about: 'About Kimmino'
  };
  return map[page] ?? 'Kimmino';
}

function rateLocally(url: string, engine: FilterEngine): number {
  try {
    const host = new URL(url).hostname;
    if (engine.isMalwareHost(host)) return 5;
    return url.startsWith('https://') ? 90 : 55;
  } catch {
    return 50;
  }
}

function errorPageHtml(url: string, code: number, description: string, dark: boolean): string {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Page not available</title>
<style>
  :root{color-scheme:${dark ? 'dark' : 'light'}}
  body{margin:0;height:100vh;display:grid;place-items:center;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;
    background:${dark ? '#0b0d12' : '#f5f6f8'};color:${dark ? '#eef1f7' : '#101218'}}
  .card{max-width:520px;padding:40px;text-align:center}
  .mark{width:56px;height:56px;border-radius:16px;margin:0 auto 22px;display:grid;place-items:center;
    background:linear-gradient(135deg,#6d8cff,#33d6a6);color:#fff;font-weight:700;font-size:22px}
  h1{font-size:22px;margin:0 0 8px;letter-spacing:-.02em}
  p{color:${dark ? '#9aa4b6' : '#5b6472'};font-size:14px;line-height:1.6;margin:0 0 18px}
  code{background:${dark ? '#1a1f2a' : '#e9ecf2'};padding:2px 6px;border-radius:6px;font-size:12px}
  button{border:0;border-radius:999px;padding:11px 20px;font:inherit;font-weight:600;cursor:pointer;
    background:${dark ? '#eef1f7' : '#101218'};color:${dark ? '#0b0d12' : '#fff'}}
</style></head><body><div class="card">
  <div class="mark">K</div>
  <h1>This page couldn&rsquo;t load</h1>
  <p>Kimmino could not reach <code>${esc(url)}</code><br>${esc(description || 'Network error')} (${code})</p>
  <button onclick="location.href='${esc(url)}'">Try again</button>
</div></body></html>`;
}
