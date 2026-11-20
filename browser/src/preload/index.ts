import { contextBridge, ipcRenderer } from 'electron';
import { APP_VERSION } from '../shared/defaults';
import type {
  AiMessage,
  Bookmark,
  CaptureMode,
  CaptureResult,
  ContentRect,
  DeepPartial,
  DownloadItem,
  ExtensionInfo,
  InstallResult,
  HistoryEntry,
  InternalPage,
  KimminoApi,
  Preferences,
  UpdateState,
  ProfileSummary,
  SyncStatus,
  ThemeDefinition,
  WindowState
} from '../shared/types';

const invoke = <T>(channel: string, ...args: unknown[]): Promise<T> =>
  ipcRenderer.invoke(`k:${channel}`, ...args) as Promise<T>;

const send = (channel: string, ...args: unknown[]): void => {
  ipcRenderer.send(`k:${channel}`, ...args);
};

function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => callback(payload);
  ipcRenderer.on(`k:${channel}`, listener);
  return () => {
    ipcRenderer.removeListener(`k:${channel}`, listener);
  };
}

const api: KimminoApi = {
  platform: process.platform,
  version: process.env.KIMMINO_VERSION ?? APP_VERSION,
  isNative: true,

  window: {
    minimize: () => send('window:minimize'),
    toggleMaximize: () => send('window:toggle-maximize'),
    close: () => send('window:close'),
    setFullScreen: (on: boolean) => send('window:fullscreen', on),
    newWindow: () => send('window:new'),
    newIncognitoWindow: () => send('window:new-incognito'),
    focus: () => send('window:focus'),
    resetBounds: () => send('window:reset-bounds')
  },

  tabs: {
    create: (url?: string, options?: { active?: boolean }) => invoke<string>('tabs:create', url, options),
    close: (id: string) => invoke<void>('tabs:close', id),
    activate: (id: string) => invoke<void>('tabs:activate', id),
    reorder: (id: string, index: number) => invoke<void>('tabs:reorder', id, index),
    navigate: (url: string, id?: string) => invoke<void>('tabs:navigate', url, id),
    back: (id?: string) => send('tabs:back', id),
    forward: (id?: string) => send('tabs:forward', id),
    reload: (id?: string, hard?: boolean) => send('tabs:reload', id, hard),
    stop: (id?: string) => send('tabs:stop', id),
    duplicate: (id: string) => invoke<string>('tabs:duplicate', id),
    setPinned: (id: string, pinned: boolean) => invoke<void>('tabs:set-pinned', id, pinned),
    setMuted: (id: string, muted: boolean) => invoke<void>('tabs:set-muted', id, muted),
    setZoom: (id: string, zoom: number) => send('tabs:set-zoom', id, zoom),
    split: (id: string, otherId: string | null) => invoke<void>('tabs:split', id, otherId),
    openInternal: (page: InternalPage) => invoke<string>('tabs:open-internal', page),
    closeOthers: (id: string) => invoke<void>('tabs:close-others', id),
    reopenClosed: () => invoke<void>('tabs:reopen-closed'),
    snapshot: () => invoke<WindowState>('tabs:snapshot'),
    onChanged: (cb: (state: WindowState) => void) => subscribe<WindowState>('state', cb)
  },

  find: {
    query: (text: string, forward?: boolean, findNext?: boolean) =>
      invoke<{ matches: number; active: number } | null>('find:query', text, forward, findNext),
    stop: () => send('find:stop')
  },

  view: {
    setContentBounds: (rect: ContentRect, splitRect?: ContentRect | null, visible?: boolean) =>
      send('view:bounds', rect, splitRect ?? null, visible ?? true),
    setSidebarWidth: (width: number) => send('view:sidebar', width),
    freeze: () => invoke<string | null>('view:freeze'),
    unfreeze: () => invoke<void>('view:unfreeze')
  },

  prefs: {
    get: () => invoke<Preferences>('prefs:get'),
    set: (patch: DeepPartial<Preferences>) => invoke<Preferences>('prefs:set', patch),
    reset: (section) => invoke<Preferences>('prefs:reset', section),
    onChanged: (cb: (prefs: Preferences) => void) => subscribe<Preferences>('prefs', cb)
  },

  privacy: {
    stats: () => invoke<{ ads: number; trackers: number; cookies: number; session: number }>('privacy:stats'),
    allowForSite: (host: string, allow: boolean) => invoke<void>('privacy:allow-site', host, allow),
    trustingDomains: () => invoke<string[]>('privacy:trusted'),
    rateSite: (url: string) => invoke<{ score: number; reasons: string[]; level: 'safe' | 'caution' | 'risky' }>('privacy:rate', url)
  },

  profiles: {
    list: () => invoke<ProfileSummary[]>('profiles:list'),
    create: (input) => invoke<ProfileSummary>('profiles:create', input),
    switch: (id: string) => invoke<void>('profiles:switch', id),
    remove: (id: string) => invoke<void>('profiles:remove', id),
    rename: (id: string, name: string) => invoke<void>('profiles:rename', id, name),
    current: () => invoke<ProfileSummary>('profiles:current')
  },

  bookmarks: {
    list: () => invoke<Bookmark[]>('bookmarks:list'),
    add: (input) => invoke<Bookmark>('bookmarks:add', input),
    remove: (id: string) => invoke<void>('bookmarks:remove', id),
    update: (id: string, patch) => invoke<void>('bookmarks:update', id, patch)
  },

  history: {
    list: (query?: string) => invoke<HistoryEntry[]>('history:list', query),
    remove: (id: string) => invoke<void>('history:remove', id),
    clear: (range) => invoke<void>('history:clear', range)
  },

  downloads: {
    list: () => invoke<DownloadItem[]>('downloads:list'),
    open: (id: string) => send('downloads:open', id),
    showInFolder: (id: string) => send('downloads:reveal', id),
    cancel: (id: string) => send('downloads:cancel', id),
    pause: (id: string) => send('downloads:pause', id),
    resume: (id: string) => send('downloads:resume', id),
    remove: (id: string) => invoke<void>('downloads:remove', id),
    onChanged: (cb: (items: DownloadItem[]) => void) => subscribe<DownloadItem[]>('downloads', cb)
  },

  extensions: {
    list: () => invoke<ExtensionInfo[]>('extensions:list'),
    installFromFolder: () => invoke<InstallResult>('extensions:install-folder'),
    installFromUrl: (url: string) => invoke<InstallResult>('extensions:install-url', url),
    installFromFile: () => invoke<InstallResult>('extensions:install-file'),
    setEnabled: (id: string, enabled: boolean) => invoke<void>('extensions:set-enabled', id, enabled),
    remove: (id: string) => invoke<void>('extensions:remove', id)
  },

  updates: {
    state: () => invoke<UpdateState>('updates:state'),
    check: () => invoke<UpdateState>('updates:check'),
    dismiss: (version: string) => invoke<Preferences | null>('updates:dismiss', version)
  },

  themes: {
    list: () => invoke<ThemeDefinition[]>('themes:list'),
    apply: (id: string | null) => invoke<void>('themes:apply', id),
    importFile: () => invoke<ThemeDefinition | null>('themes:import'),
    exportCurrent: () => invoke<string | null>('themes:export'),
    save: (theme: ThemeDefinition) => invoke<void>('themes:save', theme),
    remove: (id: string) => invoke<void>('themes:remove', id)
  },

  sync: {
    status: () => invoke<SyncStatus>('sync:status'),
    signIn: (email: string, password: string) => invoke<{ ok: boolean; message: string }>('sync:sign-in', email, password),
    signUp: (email: string, password: string) => invoke<{ ok: boolean; message: string }>('sync:sign-up', email, password),
    signOut: () => invoke<void>('sync:sign-out'),
    syncNow: () => invoke<SyncStatus>('sync:now'),
    exportData: () => invoke<string>('sync:export'),
    importData: (json: string) => invoke<void>('sync:import', json),
    onChanged: (cb: (status: SyncStatus) => void) => subscribe<SyncStatus>('sync', cb)
  },

  ai: {
    ask: (prompt: string, context?: string) => invoke<{ ok: boolean; text: string }>('ai:ask', prompt, context),
    summarizePage: () => invoke<{ ok: boolean; text: string }>('ai:summarize'),
    clear: () => invoke<void>('ai:clear')
  },

  screenshot: {
    capture: (mode: CaptureMode) => invoke<CaptureResult>('shot:capture', mode),
    saveSelection: (dataUrl: string) => invoke<CaptureResult>('shot:save-selection', dataUrl)
  },

  import: {
    fromBrowser: () => invoke<{ ok: boolean; bookmarks: number; message: string }>('import:browser')
  },

  data: {
    clear: (options) => invoke<void>('data:clear', options),
    export: () => invoke<string>('data:export')
  },

  system: {
    isDefaultBrowser: () => invoke<boolean>('system:is-default'),
    setDefaultBrowser: () => invoke<boolean>('system:set-default'),
    openExternal: (url: string) => send('system:open-external', url),
    showItemInFolder: (path: string) => send('system:reveal', path),
    pickWallpaper: () => invoke<string | null>('system:pick-wallpaper'),
    pickDirectory: () => invoke<string | null>('system:pick-directory'),
    setHardwareAcceleration: (on: boolean) => invoke<void>('system:hardware-acceleration', on),
    restart: () => send('system:restart'),
    languages: () => invoke<Array<{ code: string; name: string }>>('system:languages'),
    memory: () => invoke<{ private: number; shared: number; total: number }>('system:memory')
  },

  app: {
    onInternalNavigate: (cb: (page: InternalPage) => void) => subscribe<InternalPage>('internal', cb),
    onShortcut: (cb: (action: string) => void) => subscribe<string>('shortcut', cb),
    onToast: (cb: (toast: { kind: 'info' | 'success' | 'warn'; message: string }) => void) => subscribe('toast', cb)
  }
};

export type { AiMessage };

contextBridge.exposeInMainWorld('kimmino', api);
