import { create } from 'zustand';
import { BUILTIN_THEMES, DEFAULT_PREFERENCES, WALLPAPERS } from '@shared/defaults';
import type {
  Bookmark,
  DeepPartial,
  DownloadItem,
  ExtensionInfo,
  HistoryEntry,
  InternalPage,
  Preferences,
  ProfileSummary,
  SyncStatus,
  TabState,
  ThemeDefinition,
  WindowState
} from '@shared/types';
import { internalPageOf, internalUrl } from '@shared/types';
import { api, isNative } from './bridge';
import { engineName, toUrl } from './lib/url';

export interface Toast {
  id: number;
  kind: 'info' | 'success' | 'warn';
  message: string;
}

export interface ScreenshotPreview {
  dataUrl: string;
  path?: string;
}

interface Store {
  ready: boolean;
  prefs: Preferences;
  windowState: WindowState;
  profile: ProfileSummary;
  profiles: ProfileSummary[];
  bookmarks: Bookmark[];
  history: HistoryEntry[];
  downloads: DownloadItem[];
  extensions: ExtensionInfo[];
  themes: ThemeDefinition[];
  sync: SyncStatus;
  privacy: { ads: number; trackers: number; cookies: number; session: number };
  languages: Array<{ code: string; name: string }>;

  // UI
  internalPage: InternalPage | null;
  aiOpen: boolean;
  findOpen: boolean;
  paletteOpen: boolean;
  profileMenuOpen: boolean;
  downloadsOpen: boolean;
  shieldOpen: boolean;
  wallpaperSheetOpen: boolean;
  layoutEdit: boolean;
  focusSession: { endsAt: number } | null;
  screenshot: ScreenshotPreview | null;
  toasts: Toast[];
  freezeCount: number;
  frozenImage: string | null;
  omniboxFocusToken: number;

  // actions
  init: () => Promise<void>;
  setPrefs: (patch: DeepPartial<Preferences>) => Promise<void>;
  resetPrefs: (section?: keyof Preferences) => Promise<void>;
  reloadData: () => Promise<void>;
  toast: (message: string, kind?: Toast['kind']) => void;
  dismissToast: (id: number) => void;
  openInternal: (page: InternalPage) => Promise<void>;
  navigate: (input: string, tabId?: string) => Promise<void>;
  activeTab: () => TabState | null;
  setUI: (patch: Partial<Store>) => void;
  acquireFreeze: () => Promise<void>;
  releaseFreeze: () => void;
  focusOmnibox: () => void;
  startFocus: (minutes: number) => void;
  stopFocus: () => void;
}

let toastSeq = 0;

export const useStore = create<Store>((set, get) => ({
  ready: false,
  prefs: DEFAULT_PREFERENCES,
  windowState: { tabs: [], activeId: null, incognito: false, profileId: 'default', profileName: 'Personal', maximized: false, fullscreen: false },
  profile: { id: 'default', name: 'Personal', color: '#6d8cff', avatar: null, email: null, incognito: false, createdAt: Date.now(), isDefault: true },
  profiles: [],
  bookmarks: [],
  history: [],
  downloads: [],
  extensions: [],
  themes: BUILTIN_THEMES,
  sync: { state: 'signed-out', email: null, lastSyncedAt: null, pendingChanges: 0 },
  privacy: { ads: 0, trackers: 0, cookies: 0, session: 0 },
  languages: [],

  internalPage: null,
  aiOpen: false,
  findOpen: false,
  paletteOpen: false,
  profileMenuOpen: false,
  downloadsOpen: false,
  shieldOpen: false,
  wallpaperSheetOpen: false,
  layoutEdit: false,
  focusSession: null,
  screenshot: null,
  toasts: [],
  freezeCount: 0,
  frozenImage: null,
  omniboxFocusToken: 0,

  init: async () => {
    const [prefs, state, profiles, bookmarks, history, downloads, extensions, themes, sync] = await Promise.all([
      api.prefs.get(),
      api.tabs.snapshot(),
      api.profiles.list(),
      api.bookmarks.list(),
      api.history.list(),
      api.downloads.list(),
      api.extensions.list(),
      api.themes.list(),
      api.sync.status()
    ]);

    const activeTab = state.tabs.find((tab) => tab.id === state.activeId) ?? null;
    set({
      ready: true,
      prefs,
      windowState: state,
      profile: profiles.find((p) => p.isDefault) ?? profiles[0],
      profiles,
      bookmarks,
      history,
      downloads,
      extensions,
      themes,
      sync,
      internalPage: activeTab ? internalPageOf(activeTab.url) : 'newtab',
      languages: await api.system.languages(),
      privacy: await api.privacy.stats()
    });

    api.tabs.onChanged((next) => {
      const active = next.tabs.find((tab) => tab.id === next.activeId) ?? null;
      const page = active ? internalPageOf(active.url) : null;
      set((current) => ({
        windowState: next,
        internalPage: page ?? (current.internalPage && active && active.url.startsWith('kimmino://') ? current.internalPage : null)
      }));
    });
    api.prefs.onChanged((next) => set({ prefs: next }));
    api.downloads.onChanged((items) => set({ downloads: items }));
    api.sync.onChanged((next) => set({ sync: next }));

    setInterval(async () => {
      try {
        const [privacy, downloads] = await Promise.all([api.privacy.stats(), api.downloads.list()]);
        set({ privacy, downloads });
      } catch {
        /* ignore */
      }
    }, 5000);
  },

  setPrefs: async (patch) => {
    const next = await api.prefs.set(patch);
    set({ prefs: next });
  },

  resetPrefs: async (section) => {
    const next = await api.prefs.reset(section);
    set({ prefs: next });
    get().toast(section ? `${section} settings restored to defaults` : 'All settings restored to defaults', 'success');
  },

  reloadData: async () => {
    const [bookmarks, history, downloads, extensions, themes, profiles] = await Promise.all([
      api.bookmarks.list(),
      api.history.list(),
      api.downloads.list(),
      api.extensions.list(),
      api.themes.list(),
      api.profiles.list()
    ]);
    set({ bookmarks, history, downloads, extensions, themes, profiles });
  },

  toast: (message, kind = 'info') => {
    const id = (toastSeq += 1);
    set((state) => ({ toasts: [...state.toasts, { id, kind, message }].slice(-4) }));
    setTimeout(() => get().dismissToast(id), 3400);
  },

  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),

  openInternal: async (page) => {
    const current = get().activeTab();
    if (current && current.url.startsWith('kimmino://') && !current.splitWith) {
      await api.tabs.navigate(internalUrl(page), current.id);
    } else {
      await api.tabs.create(internalUrl(page), { active: true });
    }
    set({ internalPage: page });
  },

  navigate: async (input, tabId) => {
    const { prefs } = get();
    const url = toUrl(input, prefs.search.engine, prefs.search.customEngineUrl);
    // "Open search results in a new tab" applies to searches, not to addresses
    // typed as URLs and not to internal pages — those always reuse the tab.
    const isSearch = prefs.search.openInNewTab && !tabId && /^https?:\/\//.test(url) && !/^https?:\/\/[^/]+\.[^/]+/.test(input.trim());
    if (isSearch) {
      await api.tabs.create(url, { active: true });
    } else {
      await api.tabs.navigate(url, tabId);
    }
    if (prefs.search.autocompleteHistory && !url.startsWith('kimmino://')) {
      void get().reloadData();
    }
  },

  activeTab: () => {
    const { windowState } = get();
    return windowState.tabs.find((tab) => tab.id === windowState.activeId) ?? null;
  },

  setUI: (patch) => set(patch as Partial<Store>),

  acquireFreeze: async () => {
    const { freezeCount } = get();
    if (freezeCount > 0) {
      set({ freezeCount: freezeCount + 1 });
      return;
    }
    const image = isNative ? await api.view.freeze() : null;
    set({ freezeCount: 1, frozenImage: image });
  },

  releaseFreeze: () => {
    const { freezeCount } = get();
    const next = Math.max(0, freezeCount - 1);
    if (next === 0 && isNative) api.view.unfreeze();
    set({ freezeCount: next, frozenImage: next === 0 ? null : get().frozenImage });
  },

  focusOmnibox: () => set((state) => ({ omniboxFocusToken: state.omniboxFocusToken + 1 })),

  startFocus: (minutes) => set({ focusSession: { endsAt: Date.now() + minutes * 60_000 } }),
  stopFocus: () => set({ focusSession: null })
}));

export const searchEngineName = engineName;
export const wallpapers = WALLPAPERS;
export const builtinThemes = BUILTIN_THEMES;
