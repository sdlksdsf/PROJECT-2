import { BUILTIN_THEMES, DEFAULT_PREFERENCES, WALLPAPERS } from '@shared/defaults';
import type {
  Bookmark,
  DownloadItem,
  ExtensionInfo,
  HistoryEntry,
  KimminoApi,
  Preferences,
  ProfileSummary,
  SyncStatus,
  TabState,
  ThemeDefinition,
  WindowState
} from '@shared/types';
import { SEED_BOOKMARKS, SEED_CUSTOM_THEME, SEED_DOWNLOADS, SEED_EXTENSIONS, SEED_HISTORY, MOCK_PAGE_TEXT } from './lib/mock-data';
import { offlineSummary } from './lib/summary';

/**
 * Browser-side implementation of the Kimmino API.
 *
 * It exists so the exact same React interface can be previewed, reviewed,
 * screenshotted and embedded on the website without the native runtime. It
 * persists to localStorage so interactions feel real, and it never pretends to
 * do things it cannot (screenshots, native imports) — those report honestly.
 */
const LS_PREFIX = 'kimmino.mock.';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}_${(idCounter += 1)}_${Math.random().toString(36).slice(2, 6)}`;

function titleFor(url: string): string {
  if (url.startsWith('kimmino://')) {
    const page = url.replace('kimmino://', '');
    return page === 'newtab' ? 'New tab' : page.charAt(0).toUpperCase() + page.slice(1);
  }
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function createMockApi(): KimminoApi {
  let prefs: Preferences = { ...structuredClone(DEFAULT_PREFERENCES), ...load('prefs', {}) };
  prefs = mergeDeep(structuredClone(DEFAULT_PREFERENCES), prefs);
  prefs.onboarded = true;

  let profiles: ProfileSummary[] = load('profiles', [
    { id: 'default', name: 'Personal', color: '#6d8cff', avatar: null, email: null, incognito: false, createdAt: Date.now(), isDefault: true }
  ]);
  let bookmarks: Bookmark[] = load('bookmarks', SEED_BOOKMARKS);
  let history: HistoryEntry[] = load('history', SEED_HISTORY);
  let downloads: DownloadItem[] = load('downloads', SEED_DOWNLOADS);
  let extensions: ExtensionInfo[] = load('extensions', SEED_EXTENSIONS);
  let themes: ThemeDefinition[] = load('themes', [SEED_CUSTOM_THEME]);
  let sync: SyncStatus = { state: 'signed-out', email: null, lastSyncedAt: null, pendingChanges: 0 };

  const stateListeners = new Set<(state: WindowState) => void>();
  const prefsListeners = new Set<(prefs: Preferences) => void>();
  const downloadListeners = new Set<(items: DownloadItem[]) => void>();
  const syncListeners = new Set<(status: SyncStatus) => void>();

  const tabs: TabState[] = [];
  let activeId: string | null = null;

  const makeTab = (url: string): TabState => ({
    id: nextId('t'),
    url,
    title: titleFor(url),
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
    blocked: { ads: 6 + Math.floor(Math.random() * 20), trackers: 2 + Math.floor(Math.random() * 9), cookies: 1 + Math.floor(Math.random() * 4) },
    trust: url.startsWith('https') ? 92 : 60,
    secure: url.startsWith('https'),
    zoom: 1,
    createdAt: Date.now(),
    lastActiveAt: Date.now()
  });

  const snapshot = (): WindowState => ({
    tabs: tabs.map((tab) => ({ ...tab })),
    activeId,
    incognito: false,
    profileId: profiles[0]?.id ?? 'default',
    profileName: profiles[0]?.name ?? 'Personal',
    maximized: false,
    fullscreen: false
  });

  const emit = () => {
    const snap = snapshot();
    stateListeners.forEach((fn) => fn(snap));
  };

  // Seed the default session: a start page, a docs tab and a settings tab.
  tabs.push(makeTab('kimmino://newtab'));
  activeId = tabs[0].id;

  const delay = (ms = 260) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const api: KimminoApi = {
    platform: 'web',
    version: '1.0.0',
    isNative: false,

    window: {
      minimize: () => undefined,
      toggleMaximize: () => undefined,
      close: () => undefined,
      setFullScreen: () => undefined,
      newWindow: () => undefined,
      newIncognitoWindow: () => undefined,
      focus: () => undefined
    },

    tabs: {
      create: async (url = 'kimmino://newtab', options) => {
        const tab = makeTab(url);
        tabs.push(tab);
        if (options?.active !== false) activeId = tab.id;
        emit();
        return tab.id;
      },
      close: async (id) => {
        const index = tabs.findIndex((tab) => tab.id === id);
        if (index === -1) return;
        tabs.splice(index, 1);
        if (!tabs.length) {
          const fresh = makeTab('kimmino://newtab');
          tabs.push(fresh);
          activeId = fresh.id;
        } else if (activeId === id) {
          activeId = tabs[Math.max(0, index - 1)].id;
        }
        emit();
      },
      activate: async (id) => {
        activeId = id;
        const tab = tabs.find((t) => t.id === id);
        if (tab) tab.lastActiveAt = Date.now();
        emit();
      },
      reorder: async (id, index) => {
        const current = tabs.findIndex((tab) => tab.id === id);
        if (current === -1) return;
        const [tab] = tabs.splice(current, 1);
        tabs.splice(index, 0, tab);
        emit();
      },
      navigate: async (url, id) => {
        const tab = tabs.find((t) => t.id === (id ?? activeId));
        if (!tab) return;
        tab.url = url;
        tab.title = titleFor(url);
        tab.loading = !url.startsWith('kimmino://');
        emit();
        if (tab.loading) {
          await delay(420);
          tab.loading = false;
          tab.canGoBack = true;
          if (!url.startsWith('kimmino://')) {
            history = [{ id: nextId('h'), title: tab.title, url, visitedAt: Date.now(), visitCount: 1 }, ...history].slice(0, 200);
            save('history', history);
          }
          emit();
        }
      },
      back: () => undefined,
      forward: () => undefined,
      reload: (id) => {
        const tab = tabs.find((t) => t.id === (id ?? activeId));
        if (!tab) return;
        tab.loading = true;
        emit();
        setTimeout(() => {
          tab.loading = false;
          emit();
        }, 500);
      },
      stop: () => undefined,
      duplicate: async (id) => {
        const tab = tabs.find((t) => t.id === id);
        return api.tabs.create(tab?.url ?? 'kimmino://newtab');
      },
      setPinned: async (id, pinned) => {
        const tab = tabs.find((t) => t.id === id);
        if (tab) tab.isPinned = pinned;
        emit();
      },
      setMuted: async (id, muted) => {
        const tab = tabs.find((t) => t.id === id);
        if (tab) tab.isMuted = muted;
        emit();
      },
      setZoom: () => undefined,
      split: async (id, otherId) => {
        const tab = tabs.find((t) => t.id === id);
        if (!tab) return;
        if (!otherId) {
          if (tab.splitWith) {
            const partner = tabs.find((t) => t.id === tab.splitWith);
            if (partner) {
              partner.splitWith = null;
              partner.splitSide = null;
            }
          }
          tab.splitWith = null;
          tab.splitSide = null;
          emit();
          return;
        }
        const partner = tabs.find((t) => t.id === otherId);
        if (!partner) return;
        tab.splitWith = partner.id;
        tab.splitSide = 'left';
        partner.splitWith = tab.id;
        partner.splitSide = 'right';
        emit();
      },
      openInternal: async (page) => api.tabs.create(`kimmino://${page}`),
      closeOthers: async (id) => {
        for (const tab of [...tabs]) if (tab.id !== id) await api.tabs.close(tab.id);
        await api.tabs.activate(id);
      },
      reopenClosed: async () => {
        await api.tabs.create('kimmino://newtab');
      },
      snapshot: async () => snapshot(),
      onChanged: (cb) => {
        stateListeners.add(cb);
        return () => stateListeners.delete(cb);
      }
    },

    find: {
      query: async (text) => ({ matches: text ? 3 : 0, active: text ? 1 : 0 }),
      stop: () => undefined
    },

    view: {
      setContentBounds: () => undefined,
      setSidebarWidth: () => undefined,
      freeze: async () => null,
      unfreeze: () => undefined
    },

    prefs: {
      get: async () => prefs,
      set: async (patch) => {
        prefs = mergeDeep(prefs, patch);
        save('prefs', prefs);
        prefsListeners.forEach((fn) => fn(prefs));
        return prefs;
      },
      reset: async (section) => {
        prefs = section
          ? { ...prefs, [section]: structuredClone(DEFAULT_PREFERENCES)[section] }
          : structuredClone(DEFAULT_PREFERENCES);
        save('prefs', prefs);
        prefsListeners.forEach((fn) => fn(prefs));
        return prefs;
      },
      onChanged: (cb) => {
        prefsListeners.add(cb);
        return () => prefsListeners.delete(cb);
      }
    },

    privacy: {
      stats: async () => ({
        ads: 1284 + tabs.reduce((sum, tab) => sum + tab.blocked.ads, 0),
        trackers: 412 + tabs.reduce((sum, tab) => sum + tab.blocked.trackers, 0),
        cookies: 96 + tabs.reduce((sum, tab) => sum + tab.blocked.cookies, 0),
        session: 42
      }),
      allowForSite: async () => undefined,
      trustingDomains: async () => [],
      rateSite: async (url) => {
        const secure = url.startsWith('https');
        return {
          score: secure ? 88 : 52,
          level: secure ? 'safe' : 'caution',
          reasons: secure ? ['Encrypted connection (HTTPS)', 'No issues found in URL or blocklists'] : ['Not encrypted — traffic can be read or altered']
        };
      }
    },

    profiles: {
      list: async () => profiles,
      create: async (input) => {
        const profile: ProfileSummary = {
          id: nextId('p'),
          name: input.name,
          color: input.color,
          avatar: input.avatar ?? null,
          email: null,
          incognito: false,
          createdAt: Date.now(),
          isDefault: false
        };
        profiles = [...profiles, profile];
        save('profiles', profiles);
        return profile;
      },
      switch: async () => undefined,
      remove: async (id) => {
        profiles = profiles.filter((profile) => profile.id !== id);
        save('profiles', profiles);
      },
      rename: async (id, name) => {
        profiles = profiles.map((profile) => (profile.id === id ? { ...profile, name } : profile));
        save('profiles', profiles);
      },
      current: async () => profiles[0]
    },

    bookmarks: {
      list: async () => bookmarks,
      add: async (input) => {
        const bookmark: Bookmark = {
          id: nextId('b'),
          title: input.title,
          url: input.url,
          folder: input.folder ?? 'Bookmarks',
          createdAt: Date.now()
        };
        bookmarks = [bookmark, ...bookmarks];
        save('bookmarks', bookmarks);
        return bookmark;
      },
      remove: async (id) => {
        bookmarks = bookmarks.filter((bookmark) => bookmark.id !== id);
        save('bookmarks', bookmarks);
      },
      update: async (id, patch) => {
        bookmarks = bookmarks.map((bookmark) => (bookmark.id === id ? { ...bookmark, ...patch } : bookmark));
        save('bookmarks', bookmarks);
      }
    },

    history: {
      list: async (query) =>
        query
          ? history.filter((entry) => `${entry.title}${entry.url}`.toLowerCase().includes(query.toLowerCase()))
          : history,
      remove: async (id) => {
        history = history.filter((entry) => entry.id !== id);
        save('history', history);
      },
      clear: async () => {
        history = [];
        save('history', history);
      }
    },

    downloads: {
      list: async () => downloads,
      open: () => undefined,
      showInFolder: () => undefined,
      cancel: (id) => {
        downloads = downloads.map((item) => (item.id === id ? { ...item, state: 'cancelled' } : item));
        downloadListeners.forEach((fn) => fn(downloads));
      },
      pause: (id) => {
        downloads = downloads.map((item) => (item.id === id ? { ...item, paused: true } : item));
        downloadListeners.forEach((fn) => fn(downloads));
      },
      resume: (id) => {
        downloads = downloads.map((item) => (item.id === id ? { ...item, paused: false } : item));
        downloadListeners.forEach((fn) => fn(downloads));
      },
      remove: async (id) => {
        downloads = downloads.filter((item) => item.id !== id);
        downloadListeners.forEach((fn) => fn(downloads));
      },
      onChanged: (cb) => {
        downloadListeners.add(cb);
        return () => downloadListeners.delete(cb);
      }
    },

    extensions: {
      list: async () => extensions,
      installFromFolder: async () => ({
        ok: false,
        message: 'Preview mode has no extension runtime — install in the desktop app.',
        extension: null
      }),
      installFromUrl: async () => ({
        ok: false,
        message: 'Preview mode has no extension runtime — install in the desktop app.',
        extension: null
      }),
      installFromFile: async () => ({
        ok: false,
        message: 'Preview mode has no extension runtime — install in the desktop app.',
        extension: null
      }),
      setEnabled: async (id, enabled) => {
        extensions = extensions.map((ext) => (ext.id === id ? { ...ext, enabled } : ext));
        save('extensions', extensions);
      },
      remove: async (id) => {
        extensions = extensions.filter((ext) => ext.id !== id);
        save('extensions', extensions);
      }
    },

    updates: {
      state: async () => ({
        current: '1.0.0',
        latest: '1.0.0',
        notesUrl: null,
        checkedAt: Date.now(),
        status: 'current'
      }),
      check: async () => ({
        current: '1.0.0',
        latest: '1.0.0',
        notesUrl: null,
        checkedAt: Date.now(),
        status: 'current'
      }),
      dismiss: async () => null
    },

    themes: {
      list: async () => [...BUILTIN_THEMES, ...themes],
      apply: async (id) => {
        await api.prefs.set({ customThemeId: id });
      },
      importFile: async () => null,
      exportCurrent: async () => null,
      remove: async (id: string) => {
        themes = themes.filter((theme) => theme.id !== id);
        save('themes', themes);
      },
      save: async (theme) => {
        themes = [...themes.filter((item) => item.id !== theme.id), theme];
        save('themes', themes);
      }
    },

    sync: {
      status: async () => sync,
      signIn: async (email, password) => {
        if (password.length < 6) return { ok: false, message: 'Preview mode: use at least 6 characters.' };
        sync = { state: 'synced', email, lastSyncedAt: Date.now(), pendingChanges: 0 };
        syncListeners.forEach((fn) => fn(sync));
        return { ok: true, message: 'Signed in (preview).' };
      },
      signUp: async (email, password) => {
        if (password.length < 6) return { ok: false, message: 'Preview mode: use at least 6 characters.' };
        sync = { state: 'synced', email, lastSyncedAt: Date.now(), pendingChanges: 0 };
        syncListeners.forEach((fn) => fn(sync));
        return { ok: true, message: 'Account created (preview).' };
      },
      signOut: async () => {
        sync = { state: 'signed-out', email: null, lastSyncedAt: null, pendingChanges: 0 };
        syncListeners.forEach((fn) => fn(sync));
      },
      syncNow: async () => {
        sync = { ...sync, state: 'syncing' };
        syncListeners.forEach((fn) => fn(sync));
        await delay(700);
        sync = { ...sync, state: 'synced', lastSyncedAt: Date.now() };
        syncListeners.forEach((fn) => fn(sync));
        return sync;
      },
      exportData: async () => JSON.stringify({ format: 'kimmino-backup', version: 1, preferences: prefs, bookmarks }, null, 2),
      importData: async () => undefined,
      onChanged: (cb) => {
        syncListeners.add(cb);
        return () => syncListeners.delete(cb);
      }
    },

    ai: {
      ask: async (prompt) => {
        await delay(420);
        const lower = prompt.toLowerCase();
        if (lower.includes('summar')) return { ok: true, text: offlineSummary(MOCK_PAGE_TEXT) };
        if (lower.includes('privacy') || lower.includes('track')) {
          return {
            ok: true,
            text: 'In this session Kimmino blocked 1,284 ads, 412 trackers and 96 third-party cookies. Fingerprint randomisation is on, location and WebRTC are refused, and no telemetry is sent anywhere.'
          };
        }
        return {
          ok: true,
          text: `This is the preview build of Kimmino AI. In the desktop app I can read the page you are on and answer questions about it, or hand your prompt to the model you configured.\n\nYou asked: “${prompt}”`
        };
      },
      summarizePage: async () => ({ ok: true, text: offlineSummary(MOCK_PAGE_TEXT) }),
      clear: async () => undefined
    },

    screenshot: {
      capture: async () => ({ ok: false, error: 'Screenshots are captured by the native app — download Kimmino to try it.' }),
      saveSelection: async () => ({ ok: false, error: 'Not available in the preview.' })
    },

    import: {
      fromBrowser: async () => ({ ok: false, bookmarks: 0, message: 'Importing runs in the desktop app — it reads your Chrome, Edge, Brave or Opera profile directly.' })
    },

    data: {
      clear: async (options) => {
        if (options.history) history = [];
        if (options.downloads) downloads = [];
        if (options.cookies || options.siteData) {
          for (const tab of tabs) tab.blocked = { ads: 0, trackers: 0, cookies: 0 };
        }
        save('history', history);
        emit();
      },
      export: async () => JSON.stringify({ format: 'kimmino-backup', preferences: prefs, bookmarks, history }, null, 2)
    },

    system: {
      isDefaultBrowser: async () => false,
      setDefaultBrowser: async () => false,
      openExternal: (url) => {
        window.open(url, '_blank', 'noopener,noreferrer');
      },
      showItemInFolder: () => undefined,
      pickWallpaper: async () => null,
      pickDirectory: async () => null,
      setHardwareAcceleration: async () => undefined,
      restart: () => undefined,
      languages: async () => [
        { code: 'en-US', name: 'English (United States)' },
        { code: 'en-GB', name: 'English (United Kingdom)' },
        { code: 'ur-PK', name: 'اردو (پاکستان)' },
        { code: 'ar-SA', name: 'العربية' },
        { code: 'hi-IN', name: 'हिन्दी' },
        { code: 'es-ES', name: 'Español' },
        { code: 'fr-FR', name: 'Français' },
        { code: 'de-DE', name: 'Deutsch' },
        { code: 'pt-BR', name: 'Português (Brasil)' },
        { code: 'ru-RU', name: 'Русский' },
        { code: 'zh-CN', name: '中文 (简体)' },
        { code: 'ja-JP', name: '日本語' }
      ],
      memory: async () => ({ private: 128, shared: 42, total: 170 })
    },

    app: {
      onInternalNavigate: () => () => undefined,
      onShortcut: () => () => undefined,
      onToast: () => () => undefined
    }
  };

  void WALLPAPERS;
  return api;
}

function mergeDeep<T>(base: T, patch: unknown): T {
  if (Array.isArray(base) || typeof base !== 'object' || base === null) return (patch ?? base) as T;
  if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    const current = (base as Record<string, unknown>)[key];
    out[key] = current && typeof current === 'object' && !Array.isArray(current) ? mergeDeep(current, value) : value;
  }
  return out as T;
}
