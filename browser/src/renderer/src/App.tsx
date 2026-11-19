import { useEffect, useLayoutEffect, useRef, type ComponentType } from 'react';
import { useStore } from './store';
import { api, isNative } from './bridge';
import { TitleBar } from './components/TitleBar';
import { Toolbar } from './components/Toolbar';
import { Sidebar, VerticalTabs } from './components/Sidebar';
import { StartPage } from './components/StartPage';
import { MockPage } from './components/MockPage';
import { AiPanel, CommandPalette, FindBar, FocusOverlay, Onboarding, ScreenshotPreview, Toasts } from './components/Overlays';
import { SettingsPage } from './pages/Settings';
import { AboutPage, BookmarksPage, DownloadsPage, ExtensionsPage, HistoryPage, PasswordsPage, ThemesPage } from './pages/Library';
import { resolveTheme, themeVars } from './lib/theme';
import { TabIcon } from './components/TabIcon';
import { X } from 'lucide-react';
import type { InternalPage } from '@shared/types';

const INTERNAL_PAGES: Record<InternalPage, ComponentType> = {
  newtab: StartPage,
  settings: SettingsPage,
  history: HistoryPage,
  downloads: DownloadsPage,
  bookmarks: BookmarksPage,
  extensions: ExtensionsPage,
  themes: ThemesPage,
  passwords: PasswordsPage,
  about: AboutPage
};

export default function App() {
  const store = useStore();
  const {
    ready,
    prefs,
    windowState,
    internalPage,
    themes,
    bookmarks,
    aiOpen,
    findOpen,
    paletteOpen,
    freezeCount,
    frozenImage,
    focusSession,
    prefs: prefsValue
  } = store;

  const contentRef = useRef<HTMLDivElement>(null);
  const activeTab = windowState.tabs.find((tab) => tab.id === windowState.activeId) ?? null;
  const isInternal = !activeTab || activeTab.url.startsWith('kimmino://');
  const page = internalPage ?? (activeTab ? (activeTab.url.startsWith('kimmino://') ? 'newtab' : null) : 'newtab');
  const IncognitoBanner = windowState.incognito;

  /* ------------------------- initialise + events ------------------------ */
  useEffect(() => {
    void store.init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const offShortcut = api.app.onShortcut((action) => handleShortcut(action));
    const offInternal = api.app.onInternalNavigate(() => undefined);
    const offToast = api.app.onToast((toast) => useStore.getState().toast(toast.message, toast.kind));
    return () => {
      offShortcut();
      offInternal();
      offToast();
    };
  }, []);

  /* ------------------------------ theming ------------------------------ */
  const resolvedTheme = resolveTheme(prefs, themes);
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    const vars = themeVars(prefs, themes);
    for (const [key, value] of Object.entries(vars)) root.style.setProperty(key, value);
    document.body.classList.toggle('no-anim', !prefs.animations);
  }, [resolvedTheme, prefs, themes]);

  /* --------------------------- native layout --------------------------- */
  useLayoutEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    const send = () => {
      if (!isNative) return;
      const rect = element.getBoundingClientRect();
      const visible = !isInternal && freezeCount === 0;
      api.view.setContentBounds(
        { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
        null,
        visible
      );
    };

    send();
    const observer = new ResizeObserver(send);
    observer.observe(element);
    window.addEventListener('resize', send);
    const timer = setTimeout(send, 240);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', send);
      clearTimeout(timer);
    };
  }, [isInternal, freezeCount, prefs.verticalTabs, prefs.showBookmarksBar, findOpen, aiOpen, windowState.activeId]);

  useLayoutEffect(() => {
    if (!isNative) return;
    const timer = setTimeout(() => {
      const element = contentRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      api.view.setContentBounds({ x: rect.left, y: rect.top, width: rect.width, height: rect.height }, null, !isInternal && freezeCount === 0);
    }, 60);
    return () => clearTimeout(timer);
  }, [windowState.tabs.length, isInternal, freezeCount]);

  /* ----------------------------- shortcuts ----------------------------- */
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const meta = event.ctrlKey || event.metaKey;
      const state = useStore.getState();

      if (meta && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        state.setUI({ paletteOpen: !state.paletteOpen });
        return;
      }
      if (meta && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        state.focusOmnibox();
        return;
      }
      if (meta && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        state.setUI({ findOpen: !state.findOpen });
        return;
      }
      if (meta && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        const tab = state.activeTab();
        if (tab && !tab.url.startsWith('kimmino://')) {
          void api.bookmarks.add({ title: tab.title, url: tab.url }).then(() => {
            void state.reloadData();
            state.toast('Bookmark added', 'success');
          });
        }
        return;
      }
      if (meta && event.key.toLowerCase() === 'w' && !event.shiftKey) {
        const tab = state.activeTab();
        if (tab) {
          event.preventDefault();
          void api.tabs.close(tab.id);
        }
        return;
      }
      if (meta && event.key.toLowerCase() === 't' && !event.shiftKey) {
        event.preventDefault();
        void api.tabs.create('kimmino://newtab');
        return;
      }
      if (meta && event.shiftKey && event.key.toLowerCase() === 't') {
        event.preventDefault();
        void api.tabs.reopenClosed();
        return;
      }
      if (event.key === 'Escape') {
        const open = state.paletteOpen || state.shieldOpen || state.profileMenuOpen || state.downloadsOpen || state.aiOpen || state.findOpen || state.screenshot;
        if (open) {
          state.setUI({
            paletteOpen: false,
            shieldOpen: false,
            profileMenuOpen: false,
            downloadsOpen: false,
            aiOpen: false,
            findOpen: false,
            screenshot: null
          });
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!ready) {
    return (
      <div style={{ height: '100%', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
        <div className="spinner" />
      </div>
    );
  }

  const Page = page ? INTERNAL_PAGES[page] : null;

  return (
    <div className="app">
      <div className="app-body">
        <Sidebar />
        <div className="app-main">
          {!prefs.verticalTabs && <TitleBar />}
          {prefs.verticalTabs && (
            <div className="titlebar mac-strip" style={{ height: 34 }}>
              <div className="brand" style={{ height: 22 }} />
              <div style={{ flex: 1 }} />
            </div>
          )}
          <Toolbar />
          {prefs.showBookmarksBar && (
            <div className="bookmarks-bar">
              {bookmarks.slice(0, 14).map((bookmark) => (
                <button key={bookmark.id} className="bookmark-chip" onClick={() => void store.navigate(bookmark.url)} title={bookmark.url}>
                  <TabIcon url={bookmark.url} title={bookmark.title} size={13} />
                  {bookmark.title.slice(0, 24)}
                </button>
              ))}
            </div>
          )}
          {findOpen && <FindBar />}
          {IncognitoBanner && (
            <div className="infobar">
              <span className="badge">Private</span>
              <span>Pages you open in this window are not saved to history, and cookies disappear when you close it.</span>
              <span className="spacer" />
              <button className="icon-btn" onClick={() => api.window.close()}>
                <X size={14} />
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            <div className="content" ref={contentRef}>
              {Page ? <Page /> : activeTab ? <MockPage url={activeTab.url} title={activeTab.title} blocked={activeTab.blocked.ads + activeTab.blocked.trackers} /> : null}
              {freezeCount > 0 && frozenImage && <img className="content-frozen" src={frozenImage} alt="" />}
            </div>
            {aiOpen && <AiPanel />}
          </div>

          {focusSession && <FocusOverlay />}
        </div>
      </div>

      <CommandPalette />
      <ScreenshotPreview />
      <Onboarding />
      <Toasts />
      {prefsValue.verticalTabs && <VerticalTabsMount />}
    </div>
  );
}

function VerticalTabsMount() {
  // Rendered inside the rail column via portal-free absolute positioning.
  return (
    <div style={{ position: 'fixed', left: 56, top: 0, bottom: 0, zIndex: 4 }}>
      <VerticalTabs />
    </div>
  );
}

function handleShortcut(action: string) {
  const state = useStore.getState();
  const active = state.activeTab();
  switch (action) {
    case 'reload':
      api.tabs.reload();
      break;
    case 'hard-reload':
      api.tabs.reload(undefined, true);
      break;
    case 'stop':
      api.tabs.stop();
      break;
    case 'find':
      state.setUI({ findOpen: true });
      break;
    case 'find-next':
      void api.find.query('', true, true);
      break;
    case 'zoom-in':
      if (active) api.tabs.setZoom(active.id, Math.min(3, active.zoom + 0.1));
      break;
    case 'zoom-out':
      if (active) api.tabs.setZoom(active.id, Math.max(0.3, active.zoom - 0.1));
      break;
    case 'zoom-reset':
      if (active) api.tabs.setZoom(active.id, 1);
      break;
    case 'devtools':
      state.toast('DevTools open on the right', 'info');
      break;
    case 'split': {
      const other = state.windowState.tabs.find((tab) => tab.id !== active?.id);
      if (active && other) void api.tabs.split(active.id, active.splitWith ? null : other.id);
      break;
    }
    case 'screenshot':
      void api.screenshot.capture('visible').then((result) => {
        if (result.ok && result.dataUrl) state.setUI({ screenshot: { dataUrl: result.dataUrl, path: result.path } });
      });
      break;
    case 'screenshot-full':
      void api.screenshot.capture('fullpage').then((result) => {
        if (result.ok && result.dataUrl) state.setUI({ screenshot: { dataUrl: result.dataUrl, path: result.path } });
      });
      break;
    case 'screenshot-selection':
      void api.screenshot.capture('selection').then((result) => {
        if (result.ok && result.dataUrl) state.setUI({ screenshot: { dataUrl: result.dataUrl, path: result.path } });
      });
      break;
    case 'focus':
      if (state.focusSession) state.stopFocus();
      else state.startFocus(state.prefs.productivity.focusMode.minutes || 25);
      break;
    case 'ai':
      state.setUI({ aiOpen: !state.aiOpen });
      break;
    case 'ai-summarize':
      state.setUI({ aiOpen: true });
      void api.ai.summarizePage().then((result) => state.toast(result.text.slice(0, 160), 'info'));
      break;
    case 'bookmark':
      if (active && !active.url.startsWith('kimmino://')) {
        void api.bookmarks.add({ title: active.title, url: active.url }).then(() => {
          void state.reloadData();
          state.toast('Bookmark added', 'success');
        });
      }
      break;
    case 'toggle-sidebar':
    case 'toggle-vertical-tabs':
      void state.setPrefs({ verticalTabs: !state.prefs.verticalTabs });
      break;
    case 'next-tab': {
      const index = state.windowState.tabs.findIndex((tab) => tab.id === active?.id);
      const next = state.windowState.tabs[(index + 1) % state.windowState.tabs.length];
      if (next) void api.tabs.activate(next.id);
      break;
    }
    case 'prev-tab': {
      const index = state.windowState.tabs.findIndex((tab) => tab.id === active?.id);
      const prev = state.windowState.tabs[(index - 1 + state.windowState.tabs.length) % state.windowState.tabs.length];
      if (prev) void api.tabs.activate(prev.id);
      break;
    }
    case 'reopen-tab':
      void api.tabs.reopenClosed();
      break;
    case 'duplicate-tab':
      if (active) void api.tabs.duplicate(active.id);
      break;
    case 'clear-data':
      void state.openInternal('settings');
      state.toast('Scroll to “Clear browsing data”', 'info');
      break;
    case 'import':
      void api.import.fromBrowser().then((result) => {
        state.toast(result.message, result.ok ? 'success' : 'info');
        void state.reloadData();
      });
      break;
    case 'export-data':
      void api.data.export().then((json) => {
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'kimmino-backup.json';
        link.click();
        state.toast('Data exported', 'success');
      });
      break;
    case 'print':
      window.print();
      break;
    case 'fullscreen':
      api.window.setFullScreen(!state.windowState.fullscreen);
      break;
    case 'privacy-dashboard':
      void state.openInternal('settings');
      break;
    case 'shortcuts-help':
      void state.openInternal('settings');
      break;
    default: {
      const tabMatch = action.match(/^tab-(\d)$/);
      if (tabMatch) {
        const index = Number(tabMatch[1]) - 1;
        const tab = state.windowState.tabs[index];
        if (tab) void api.tabs.activate(tab.id);
      }
    }
  }
}
