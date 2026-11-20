/**
 * Shared contract between the main process (privileged) and the renderer (UI).
 * Everything here is plain data — no `electron` imports — so the UI can also run
 * in a browser (see `renderer/src/bridge.mock.ts`) for design previews and docs.
 */

export type InternalPage =
  | 'newtab'
  | 'settings'
  | 'history'
  | 'downloads'
  | 'bookmarks'
  | 'extensions'
  | 'themes'
  | 'passwords'
  | 'about';

export const INTERNAL_SCHEME = 'kimmino';

export function internalUrl(page: InternalPage): string {
  return `${INTERNAL_SCHEME}://${page}`;
}

export function isInternalUrl(url: string): boolean {
  return url.startsWith(`${INTERNAL_SCHEME}://`);
}

export function internalPageOf(url: string): InternalPage | null {
  if (!isInternalUrl(url)) return null;
  const page = url.slice(`${INTERNAL_SCHEME}://`.length).split(/[/?#]/)[0];
  return (page || 'newtab') as InternalPage;
}

export interface TabState {
  id: string;
  url: string;
  title: string;
  favicon: string | null;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  isPinned: boolean;
  isMuted: boolean;
  audible: boolean;
  /** View is destroyed to reclaim RAM; clicking the tab restores it. */
  discarded: boolean;
  /** Reading-list / tab group id, if any. */
  groupId: string | null;
  /** Tab id this tab is split-screened with. */
  splitWith: string | null;
  /** Whether this tab owns the left/right half of a split. */
  splitSide: 'left' | 'right' | null;
  /** Per-tab privacy counters for the shield badge. */
  blocked: { ads: number; trackers: number; cookies: number };
  /** 0-100 suspicion score from the on-device site healer. */
  trust: number;
  secure: boolean;
  zoom: number;
  createdAt: number;
  lastActiveAt: number;
}

export interface WindowState {
  tabs: TabState[];
  activeId: string | null;
  incognito: boolean;
  profileId: string;
  profileName: string;
  maximized: boolean;
  fullscreen: boolean;
}

export type ContentRect = { x: number; y: number; width: number; height: number };

export type ThemeMode = 'system' | 'light' | 'dark' | 'oled';

export interface Preferences {
  // Appearance
  themeMode: ThemeMode;
  accent: string;
  uiScale: number;
  pageScale: number;
  fontFamily: string;
  compactTabs: boolean;
  verticalTabs: boolean;
  showBookmarksBar: boolean;
  animations: boolean;
  acrylicBlur: boolean;
  customThemeId: string | null;

  // Start page
  startPage: {
    wallpaper: string;
    wallpaperBlur: number;
    wallpaperDim: number;
    liveWallpaper: boolean;
    showClock: boolean;
    showSuggestions: boolean;
    searchPosition: { x: number; y: number } | null;
    /** Tile size for the speed dial, so the start page fits any screen. */
    tileSize: 'small' | 'medium' | 'large';
    dials: Array<{ id: string; title: string; url: string; icon: string | null }>;
  };

  // Privacy
  privacy: {
    adBlocking: boolean;
    blockTrackers: boolean;
    blockThirdPartyCookies: boolean;
    autoDeclineConsent: boolean;
    fingerprintProtection: boolean;
    stripTrackingParams: boolean;
    spoofReferrer: boolean;
    blockWebRTC: boolean;
    blockLocation: boolean;
    blockNotifications: boolean;
    blockCameraMic: boolean;
    httpsOnly: boolean;
    blockCryptoMiners: boolean;
    doNotTrack: boolean;
    safeBrowsing: boolean;
    blockPopups: boolean;
    strictMode: boolean;
  };

  // Performance
  performance: {
    memorySaver: boolean;
    memorySaverMinutes: number;
    backgroundThrottle: boolean;
    gamingMode: boolean;
    hardwareAcceleration: boolean;
  };

  // Search
  search: {
    engine: string;
    customEngineUrl: string;
    suggestions: boolean;
    autocompleteHistory: boolean;
    openInNewTab: boolean;
    keyboardSounds: boolean;
    keyboardSoundVolume: number;
  };

  // Productivity
  productivity: {
    splitViewEnabled: boolean;
    focusMode: { enabled: boolean; minutes: number; maxTabs: number; blocklist: string[] };
    screenshotFormat: 'png' | 'jpeg';
    videoEnhancer: boolean;
    forceDarkMode: boolean;
    aiEnabled: boolean;
    /** `kimmino` uses the built-in proxy; the rest are self-hosted or BYO endpoints. */
    aiProvider: 'off' | 'kimmino' | 'openai' | 'ollama' | 'custom';
    aiEndpoint: string;
    aiModel: string;
    /** Send the current page (URL, title, visible text) with a question. Off by default. */
    aiPageContext: boolean;
    earlyBird: boolean;
  };

  // System
  system: {
    language: string;
    launchOnStartup: boolean;
    defaultBrowserPrompt: boolean;
    downloadDir: string;
    askWhereToSave: boolean;
    spellcheck: boolean;
  };

  // Updates & extras
  updates: {
    automatic: boolean;
    /** Version the user dismissed, so the banner does not reappear. */
    dismissedVersion: string | null;
  };

  // Developer
  developer: {
    devToolsEnabled: boolean;
    customUserAgent: string;
    showPerfOverlay: boolean;
  };

  // Onboarding
  onboarded: boolean;
}

export interface ProfileSummary {
  id: string;
  name: string;
  color: string;
  avatar: string | null;
  email: string | null;
  incognito: boolean;
  createdAt: number;
  isDefault: boolean;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  folder: string;
  createdAt: number;
}

export interface HistoryEntry {
  id: string;
  title: string;
  url: string;
  visitedAt: number;
  visitCount: number;
}

export interface DownloadItem {
  id: string;
  filename: string;
  url: string;
  path: string;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
  receivedBytes: number;
  totalBytes: number;
  startedAt: number;
  paused: boolean;
}

export interface UpdateState {
  current: string;
  latest: string | null;
  notesUrl: string | null;
  checkedAt: number | null;
  status: 'idle' | 'checking' | 'current' | 'available' | 'offline';
}

export interface InstallResult {
  ok: boolean;
  message: string;
  extension: ExtensionInfo | null;
}

export interface ExtensionInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  path: string;
  enabled: boolean;
  icon: string | null;
  permissions: string[];
  manifestVersion: number;
  /** running = Chromium has it loaded; error = it is installed but did not load. */
  status?: 'running' | 'idle' | 'error';
  error?: string | null;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  author: string;
  version: string;
  colors: Record<string, string>;
  fontFamily?: string;
  isDark: boolean;
  builtin: boolean;
}

export interface SyncStatus {
  state: 'signed-out' | 'syncing' | 'synced' | 'error' | 'offline';
  email: string | null;
  lastSyncedAt: number | null;
  pendingChanges: number;
  message?: string;
}

export interface AiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  at: number;
}

export interface SearchSuggestion {
  type: 'search' | 'history' | 'bookmark' | 'url';
  title: string;
  url: string;
}

export type CaptureMode = 'visible' | 'fullpage' | 'selection';

export interface CaptureResult {
  ok: boolean;
  path?: string;
  dataUrl?: string;
  /** False when the image was saved but the clipboard was unavailable. */
  copied?: boolean;
  error?: string;
}

/* ------------------------------------------------------------------ */
/* IPC surface                                                         */
/* ------------------------------------------------------------------ */

export interface DisplayInfo {
  windowBounds: { x: number; y: number; width: number; height: number } | null;
  contentSize: [number, number] | null;
  maximized: boolean;
  workArea: { x: number; y: number; width: number; height: number };
  displaySize: { width: number; height: number };
  scaleFactor: number;
  viewport: { innerWidth: number; innerHeight: number; availWidth: number; availHeight: number; devicePixelRatio: number } | null;
  platform: string;
}

export interface KimminoApi {
  platform: NodeJS.Platform | 'web';
  version: string;
  isNative: boolean;

  window: {
    minimize(): void;
    toggleMaximize(): void;
    close(): void;
    setFullScreen(on: boolean): void;
    newWindow(): void;
    newIncognitoWindow(): void;
    focus(): void;
    /** Centre the window on the current screen and shrink it to fit. */
    resetBounds(): void;
    /** Report the renderer's CSS-pixel viewport so the main process can spot a window bigger than the display. */
    reportViewport(metrics: { innerWidth: number; innerHeight: number; availWidth: number; availHeight: number; devicePixelRatio: number }): void;
  };

  tabs: {
    create(url?: string, options?: { active?: boolean }): Promise<string>;
    close(id: string): Promise<void>;
    activate(id: string): Promise<void>;
    reorder(id: string, index: number): Promise<void>;
    navigate(url: string, id?: string): Promise<void>;
    back(id?: string): void;
    forward(id?: string): void;
    reload(id?: string, hard?: boolean): void;
    stop(id?: string): void;
    duplicate(id: string): Promise<string>;
    setPinned(id: string, pinned: boolean): Promise<void>;
    setMuted(id: string, muted: boolean): Promise<void>;
    setZoom(id: string, zoom: number): void;
    split(id: string, otherId: string | null): Promise<void>;
    openInternal(page: InternalPage): Promise<string>;
    closeOthers(id: string): Promise<void>;
    reopenClosed(): Promise<void>;
    snapshot(): Promise<WindowState>;
    onChanged(cb: (state: WindowState) => void): () => void;
  };

  find: {
    query(text: string, forward?: boolean, findNext?: boolean): Promise<{ matches: number; active: number } | null>;
    stop(): void;
  };

  view: {
    setContentBounds(rect: ContentRect, splitRect?: ContentRect | null, visible?: boolean): void;
    setSidebarWidth(width: number): void;
    /** Snapshots the visible page so HTML overlays can be drawn above it. */
    freeze(): Promise<string | null>;
    unfreeze(): void;
  };

  prefs: {
    get(): Promise<Preferences>;
    set(patch: DeepPartial<Preferences>): Promise<Preferences>;
    reset(section?: keyof Preferences): Promise<Preferences>;
    onChanged(cb: (prefs: Preferences) => void): () => void;
  };

  privacy: {
    stats(): Promise<{ ads: number; trackers: number; cookies: number; session: number }>;
    allowForSite(host: string, allow: boolean): Promise<void>;
    trustingDomains(): Promise<string[]>;
    rateSite(url: string): Promise<{ score: number; reasons: string[]; level: 'safe' | 'caution' | 'risky' }>;
  };

  profiles: {
    list(): Promise<ProfileSummary[]>;
    create(input: { name: string; color: string; avatar?: string | null }): Promise<ProfileSummary>;
    switch(id: string): Promise<void>;
    remove(id: string): Promise<void>;
    rename(id: string, name: string): Promise<void>;
    current(): Promise<ProfileSummary>;
  };

  bookmarks: {
    list(): Promise<Bookmark[]>;
    add(input: { title: string; url: string; folder?: string }): Promise<Bookmark>;
    remove(id: string): Promise<void>;
    update(id: string, patch: Partial<Bookmark>): Promise<void>;
  };

  history: {
    list(query?: string): Promise<HistoryEntry[]>;
    remove(id: string): Promise<void>;
    clear(range: 'hour' | 'day' | 'week' | 'all'): Promise<void>;
  };

  downloads: {
    list(): Promise<DownloadItem[]>;
    open(id: string): void;
    showInFolder(id: string): void;
    cancel(id: string): void;
    pause(id: string): void;
    resume(id: string): void;
    remove(id: string): Promise<void>;
    onChanged(cb: (items: DownloadItem[]) => void): () => void;
  };

  extensions: {
    list(): Promise<ExtensionInfo[]>;
    installFromFolder(): Promise<InstallResult>;
    installFromUrl(url: string): Promise<InstallResult>;
    installFromFile(): Promise<InstallResult>;
    setEnabled(id: string, enabled: boolean): Promise<void>;
    remove(id: string): Promise<void>;
  };

  updates: {
    state(): Promise<UpdateState>;
    check(): Promise<UpdateState>;
    dismiss(version: string): Promise<Preferences | null>;
  };

  themes: {
    list(): Promise<ThemeDefinition[]>;
    apply(id: string | null): Promise<void>;
    importFile(): Promise<ThemeDefinition | null>;
    exportCurrent(): Promise<string | null>;
    save(theme: ThemeDefinition): Promise<void>;
    remove(id: string): Promise<void>;
  };

  sync: {
    status(): Promise<SyncStatus>;
    signIn(email: string, password: string): Promise<{ ok: boolean; message: string }>;
    signUp(email: string, password: string): Promise<{ ok: boolean; message: string }>;
    signOut(): Promise<void>;
    syncNow(): Promise<SyncStatus>;
    exportData(): Promise<string>;
    importData(json: string): Promise<void>;
    onChanged(cb: (status: SyncStatus) => void): () => void;
  };

  ai: {
    ask(prompt: string, context?: string): Promise<{ ok: boolean; text: string }>;
    summarizePage(): Promise<{ ok: boolean; text: string }>;
    clear(): Promise<void>;
  };

  screenshot: {
    capture(mode: CaptureMode): Promise<CaptureResult>;
    saveSelection(dataUrl: string): Promise<CaptureResult>;
  };

  import: {
    fromBrowser(): Promise<{ ok: boolean; bookmarks: number; message: string }>;
  };

  data: {
    clear(options: {
      cookies?: boolean;
      cache?: boolean;
      history?: boolean;
      downloads?: boolean;
      passwords?: boolean;
      siteData?: boolean;
      since?: 'hour' | 'day' | 'week' | 'all';
    }): Promise<void>;
    export(): Promise<string>;
  };

  system: {
    isDefaultBrowser(): Promise<boolean>;
    setDefaultBrowser(): Promise<boolean>;
    openExternal(url: string): void;
    showItemInFolder(path: string): void;
    pickWallpaper(): Promise<string | null>;
    pickDirectory(): Promise<string | null>;
    setHardwareAcceleration(on: boolean): Promise<void>;
    restart(): void;
    languages(): Promise<Array<{ code: string; name: string }>>;
    memory(): Promise<{ private: number; shared: number; total: number }>;
    /** Geometry the app is actually working with — used by Settings → About. */
    displayInfo(): Promise<DisplayInfo>;
  };

  app: {
    onInternalNavigate(cb: (page: InternalPage) => void): () => void;
    onShortcut(cb: (action: string) => void): () => void;
    onToast(cb: (toast: { kind: 'info' | 'success' | 'warn'; message: string }) => void): () => void;
  };
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? (T[K] extends Array<unknown> ? T[K] : DeepPartial<T[K]>) : T[K];
};
