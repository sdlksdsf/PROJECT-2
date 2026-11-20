import { app, dialog, ipcMain, shell, systemPreferences, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { capture, saveSelection } from './screenshot';
import { importFromBrowser } from './importer';
import { controlDownload, openDownload, revealDownload } from './downloads';
import { rateSite } from './privacy/site-rating';
import { internalUrl } from '../shared/types';
import type { DeepPartial, ExtensionInfo, InternalPage, Preferences } from '../shared/types';
import type { KimminoWindow } from './window';
import type { ProfileRuntime } from './profile-runtime';
import type { FilterEngine } from './privacy/engine';
import type { ProfileManager } from './profiles';
import type { FiltersService } from './privacy/filters';
import { ensureDir } from './store';
import { applyLoginItem, checkForUpdates, updateState } from './app-level';

export interface AppBridge {
  windowFor(event: IpcMainEvent | IpcMainInvokeEvent): KimminoWindow | null;
  runtimeFor(win: KimminoWindow | null): ProfileRuntime | null;
  openWindow(options?: { profileId?: string; incognito?: boolean }): void;
  switchProfile(profileId: string): Promise<void>;
  restart(): void;
  profiles: ProfileManager;
  filters: FiltersService;
  engine(): FilterEngine | null;
  sessionStats(): { ads: number; trackers: number; cookies: number; session: number };
  broadcast(channel: string, payload: unknown): void;
}

const LANGUAGES = [
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
  { code: 'ja-JP', name: '日本語' },
  { code: 'ko-KR', name: '한국어' },
  { code: 'tr-TR', name: 'Türkçe' },
  { code: 'id-ID', name: 'Bahasa Indonesia' }
];

export function registerIpc(bridge: AppBridge): void {
  const handle = <T>(channel: string, fn: (event: IpcMainInvokeEvent, ...args: never[]) => T | Promise<T>) => {
    ipcMain.handle(`k:${channel}`, fn as never);
  };
  const on = (channel: string, fn: (event: IpcMainEvent, ...args: never[]) => void) => {
    ipcMain.on(`k:${channel}`, fn as never);
  };
  const win = (event: IpcMainEvent | IpcMainInvokeEvent) => bridge.windowFor(event);
  const rt = (event: IpcMainEvent | IpcMainInvokeEvent) => bridge.runtimeFor(win(event));

  /* ---------------------------- window ---------------------------- */
  on('window:minimize', (event) => {
    (win(event)?.win as unknown as { minimize: () => void })?.minimize();
  });
  on('window:toggle-maximize', (event) => {
    const target = win(event)?.win as unknown as { isMaximized: () => boolean; maximize: () => void; unmaximize: () => void };
    if (!target) return;
    if (target.isMaximized()) target.unmaximize();
    else target.maximize();
  });
  on('window:close', (event) => win(event)?.close());
  on('window:fullscreen', (event, value: boolean) => {
    (win(event)?.win as unknown as { setFullScreen: (v: boolean) => void })?.setFullScreen(Boolean(value));
  });
  on('window:new', () => bridge.openWindow());
  on('window:new-incognito', () => bridge.openWindow({ incognito: true }));
  on('window:focus', (event) => win(event)?.focus());

  /* ----------------------------- tabs ----------------------------- */
  handle('tabs:create', (event, url?: string, options?: { active?: boolean }) =>
    win(event)?.tabs.create(url ?? internalUrl('newtab'), options ?? { active: true })
  );
  handle('tabs:close', (event, id: string) => win(event)?.tabs.close(id));
  handle('tabs:activate', (event, id: string) => win(event)?.tabs.activate(id));
  handle('tabs:reorder', (event, id: string, index: number) => win(event)?.tabs.reorder(id, index));
  handle('tabs:navigate', (event, url: string, id?: string) => win(event)?.tabs.navigate(url, id));
  on('tabs:back', (event, id?: string) => win(event)?.tabs.back(id));
  on('tabs:forward', (event, id?: string) => win(event)?.tabs.forward(id));
  on('tabs:reload', (event, id?: string, hard?: boolean) => win(event)?.tabs.reload(id, hard));
  on('tabs:stop', (event, id?: string) => win(event)?.tabs.stop(id));
  handle('tabs:duplicate', (event, id: string) => win(event)?.tabs.duplicate(id));
  handle('tabs:set-pinned', (event, id: string, pinned: boolean) => win(event)?.tabs.setPinned(id, pinned));
  handle('tabs:set-muted', (event, id: string, muted: boolean) => win(event)?.tabs.setMuted(id, muted));
  on('tabs:set-zoom', (event, id: string, zoom: number) => win(event)?.tabs.setZoom(id, zoom));
  handle('tabs:split', (event, id: string, otherId: string | null) => win(event)?.tabs.split(id, otherId));
  handle('tabs:open-internal', (event, page: InternalPage) => win(event)?.tabs.create(internalUrl(page), { active: true }));
  handle('tabs:close-others', (event, id: string) => win(event)?.tabs.closeOthers(id));
  handle('tabs:reopen-closed', (event) => win(event)?.tabs.reopenClosed());
  handle('tabs:snapshot', (event) => win(event)?.tabs.snapshot());

  /* ----------------------------- find ----------------------------- */
  handle('find:query', async (event, text: string, forward?: boolean, findNext?: boolean) => {
    const result = await win(event)?.tabs.runFind(text, { forward, findNext });
    if (!result) return null;
    return { matches: result.matches ?? 0, active: result.activeMatchOrdinal ?? 0 };
  });
  on('find:stop', (event) => win(event)?.tabs.stopFind());

  /* ---------------------------- layout ---------------------------- */
  on('view:bounds', (event, rect, splitRect, visible) => {
    win(event)?.setContentBounds(rect, splitRect ?? null, visible ?? true);
  });
  on('view:sidebar', () => {
    /* sidebar width is handled in the renderer's rect maths */
  });
  handle('view:freeze', async (event) => {
    const win = event && bridge.windowFor(event);
    const image = await win?.tabs.captureActive();
    win?.tabs.hideAll(false);
    return image ? `data:image/png;base64,${image.toPNG().toString('base64')}` : null;
  });
  handle('view:unfreeze', (event) => {
    bridge.windowFor(event)?.tabs.hideAll(true);
  });

  /* ---------------------------- prefs ----------------------------- */
  handle('prefs:get', (event) => rt(event)?.prefs.all());
  handle('prefs:set', (event, patch: DeepPartial<Preferences>) => {
    const runtime = rt(event);
    if (!runtime) return null;
    const next = runtime.prefs.set(patch);
    runtime.onPrefsChanged();
    applyLoginItem(next.system.launchOnStartup);
    bridge.broadcast('prefs', next);
    return next;
  });
  handle('prefs:reset', (event, section?: keyof Preferences) => {
    const runtime = rt(event);
    if (!runtime) return null;
    const next = runtime.prefs.reset(section);
    applyLoginItem(next.system.launchOnStartup);
    bridge.broadcast('prefs', next);
    return next;
  });

  /* --------------------------- privacy ---------------------------- */
  handle('privacy:stats', () => ({
    ...bridge.sessionStats(),
    engine: bridge.filters.stats()
  }));
  handle('privacy:allow-site', (event, host: string, allow: boolean) => {
    rt(event)?.exceptions.setExempt(host, allow);
    rt(event)?.exceptions.setTrusted(`https://${host}`, allow);
  });
  handle('privacy:trusted', (event) => rt(event)?.exceptions.all().trustedOrigins ?? []);
  handle('privacy:rate', (event, url: string) => rateSite(url, bridge.engine()));

  /* --------------------------- profiles --------------------------- */
  handle('profiles:list', () => bridge.profiles.list());
  handle('profiles:create', (event, input: { name: string; color: string; avatar?: string | null }) => {
    void event;
    return bridge.profiles.create(input);
  });
  handle('profiles:switch', async (event, id: string) => {
    void event;
    await bridge.switchProfile(id);
  });
  handle('profiles:remove', async (event, id: string) => {
    void event;
    await bridge.profiles.remove(id);
  });
  handle('profiles:rename', (event, id: string, name: string) => {
    void event;
    bridge.profiles.rename(id, name);
  });
  handle('profiles:current', () => bridge.profiles.current());

  /* -------------------------- bookmarks --------------------------- */
  handle('bookmarks:list', (event) => rt(event)?.library.bookmarks() ?? []);
  handle('bookmarks:add', (event, input: { title: string; url: string; folder?: string }) => {
    const runtime = rt(event);
    const bookmark = runtime?.library.addBookmark(input);
    runtime?.sync.markDirty();
    return bookmark;
  });
  handle('bookmarks:remove', (event, id: string) => {
    const runtime = rt(event);
    runtime?.library.removeBookmark(id);
    runtime?.sync.markDirty();
  });
  handle('bookmarks:update', (event, id: string, patch) => rt(event)?.library.updateBookmark(id, patch));

  /* --------------------------- history ---------------------------- */
  handle('history:list', (event, query?: string) => rt(event)?.library.history(query) ?? []);
  handle('history:remove', (event, id: string) => rt(event)?.library.removeHistory(id));
  handle('history:clear', (event, range: 'hour' | 'day' | 'week' | 'all') => rt(event)?.library.clearHistory(range));

  /* -------------------------- downloads --------------------------- */
  handle('downloads:list', (event) => rt(event)?.library.downloads() ?? []);
  on('downloads:open', (event, id: string) => {
    const record = rt(event)?.library.downloads().find((d) => d.id === id);
    if (record) openDownload(record);
  });
  on('downloads:reveal', (event, id: string) => {
    const record = rt(event)?.library.downloads().find((d) => d.id === id);
    if (record) revealDownload(record);
  });
  on('downloads:cancel', (_event, id: string) => controlDownload(id, 'cancel'));
  on('downloads:pause', (_event, id: string) => controlDownload(id, 'pause'));
  on('downloads:resume', (_event, id: string) => controlDownload(id, 'resume'));
  handle('downloads:remove', (event, id: string) => rt(event)?.library.removeDownload(id));

  /* ------------------------- extensions --------------------------- */
  handle('extensions:list', async (event) => (await rt(event)?.extensions.list()) ?? []);
  handle('extensions:install-folder', async (event) => {
    const runtime = rt(event);
    if (!runtime) return { ok: false, message: 'No profile', extension: null };
    return installExtension(runtime, () => runtime.extensions.installFromFolder());
  });
  handle('extensions:install-file', async (event) => {
    const runtime = rt(event);
    if (!runtime) return { ok: false, message: 'No profile', extension: null };
    return installExtension(runtime, () => runtime.extensions.installFromFile());
  });
  handle('extensions:install-url', async (event, url: string) => {
    const runtime = rt(event);
    if (!runtime) return { ok: false, message: 'No profile', extension: null };
    return installExtension(runtime, () => runtime.extensions.installFromUrl(url));
  });
  handle('extensions:set-enabled', async (event, id: string, enabled: boolean) => {
    const runtime = rt(event);
    if (!runtime) return;
    await runtime.extensions.setEnabled(id, enabled);
    await runtime.extensions.syncInto(runtime.ses);
  });
  handle('extensions:remove', async (event, id: string) => {
    const runtime = rt(event);
    if (!runtime) return;
    await runtime.extensions.remove(id);
    await runtime.extensions.syncInto(runtime.ses);
  });

  /* ---------------------------- updates --------------------------- */
  handle('updates:state', () => updateState());
  handle('updates:check', async (event) => {
    const runtime = rt(event);
    return checkForUpdates(runtime?.prefs.all() ?? ({} as Preferences), { interactive: true });
  });
  handle('updates:dismiss', (event, version: string) => {
    const runtime = rt(event);
    if (!runtime) return null;
    return runtime.prefs.set({ updates: { dismissedVersion: version } });
  });

  /* ---------------------------- themes ---------------------------- */
  handle('themes:list', (event) => rt(event)?.themes.list() ?? []);
  handle('themes:apply', (event, id: string | null) => rt(event)?.prefs.set({ customThemeId: id }));
  handle('themes:import', async (event) => {
    const theme = await rt(event)?.themes.importFile();
    return theme ?? null;
  });
  handle('themes:export', async (event) => {
    const runtime = rt(event);
    if (!runtime) return null;
    const current = runtime.themes.get(runtime.prefs.all().customThemeId ?? 'kimmino-dark') ?? runtime.themes.list()[0];
    return runtime.themes.exportCurrent(current);
  });
  handle('themes:save', (event, theme) => rt(event)?.themes.save(theme));
  handle('themes:remove', (event, id: string) => {
    const runtime = rt(event);
    if (!runtime) return;
    runtime.themes.remove(id);
    if (runtime.prefs.all().customThemeId === id) runtime.prefs.set({ customThemeId: null });
  });

  /* ----------------------------- sync ----------------------------- */
  handle('sync:status', (event) => rt(event)?.sync.statusOf());
  handle('sync:sign-in', async (event, email: string, password: string) =>
    (await rt(event)?.sync.signIn(email, password)) ?? { ok: false, message: 'No profile' }
  );
  handle('sync:sign-up', async (event, email: string, password: string) =>
    (await rt(event)?.sync.signUp(email, password)) ?? { ok: false, message: 'No profile' }
  );
  handle('sync:sign-out', async (event) => rt(event)?.sync.signOut());
  handle('sync:now', async (event) => (await rt(event)?.sync.syncNow()) ?? null);
  handle('sync:export', (event) => rt(event)?.sync.exportData());
  handle('sync:import', (event, json: string) => rt(event)?.sync.importData(json));

  /* ------------------------------ ai ------------------------------ */
  handle('ai:ask', async (event, prompt: string, context?: string) => {
    const runtime = rt(event);
    if (!runtime) return { ok: false, text: 'No profile' };
    const pageText = context ?? (await readActivePageText(win(event)));
    const window = win(event);
    return runtime.ai.ask({
      prompt,
      pageText,
      pageUrl: window?.tabs.activeTab()?.url,
      pageTitle: window?.tabs.activeTab()?.title,
      browserContext: describeBrowser(runtime, window, bridge)
    });
  });
  handle('ai:summarize', async (event) => {
    const runtime = rt(event);
    if (!runtime) return { ok: false, text: 'No profile' };
    const pageText = await readActivePageText(win(event));
    return runtime.ai.summarizePage(pageText, win(event)?.tabs.activeTab()?.title);
  });
  handle('ai:clear', () => undefined);

  /* -------------------------- screenshots ------------------------- */
  handle('shot:capture', async (event, mode) => {
    const runtime = rt(event);
    const wc = win(event)?.tabs.activeWebContents();
    if (!runtime || !wc) return { ok: false, error: 'Nothing to capture on this tab' };
    return capture(wc, mode, runtime.prefs.all());
  });
  handle('shot:save-selection', async (event, dataUrl: string) => {
    const runtime = rt(event);
    if (!runtime) return { ok: false };
    return saveSelection(dataUrl, runtime.prefs.all());
  });

  /* ---------------------------- import ---------------------------- */
  handle('import:browser', async (event) => {
    const runtime = rt(event);
    if (!runtime) return { ok: false, bookmarks: 0, message: 'No profile' };
    const result = await importFromBrowser(runtime.library);
    runtime.sync.markDirty();
    return result;
  });

  /* ----------------------------- data ----------------------------- */
  handle('data:clear', async (event, options) => {
    const runtime = rt(event);
    await runtime?.clearData(options);
  });
  handle('data:export', (event) => rt(event)?.sync.exportData() ?? '{}');

  /* ---------------------------- system ---------------------------- */
  handle('system:is-default', () => app.isDefaultProtocolClient('http') && app.isDefaultProtocolClient('https'));
  handle('system:set-default', () => {
    if (process.platform === 'win32' || process.platform === 'linux') {
      return app.setAsDefaultProtocolClient('http') && app.setAsDefaultProtocolClient('https');
    }
    void shell.openExternal('x-apple.systempreferences:com.apple.preference.general');
    return false;
  });
  on('system:open-external', (_event, url: string) => {
    if (/^https?:/i.test(url)) void shell.openExternal(url);
  });
  on('system:reveal', (_event, target: string) => shell.showItemInFolder(target));
  handle('system:pick-wallpaper', async (event) => {
    const runtime = rt(event);
    const result = await dialog.showOpenDialog({
      title: 'Choose a wallpaper',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'] }]
    });
    if (result.canceled || !result.filePaths[0] || !runtime) return null;
    const source = result.filePaths[0];
    const dir = ensureDir(path.join(app.getPath('userData'), 'wallpapers'));
    const target = path.join(dir, `${Date.now()}-${path.basename(source).replace(/[^\w.-]/g, '_')}`);
    fs.copyFileSync(source, target);
    const id = `user-${path.basename(target)}`;
    runtime.prefs.set({ startPage: { wallpaper: `kimmino-asset://wallpapers/${path.basename(target)}` } });
    void id;
    return `kimmino-asset://wallpapers/${path.basename(target)}`;
  });
  handle('system:pick-directory', async () => {
    const result = await dialog.showOpenDialog({ title: 'Choose a download folder', properties: ['openDirectory', 'createDirectory'] });
    return result.canceled ? null : result.filePaths[0];
  });
  handle('system:hardware-acceleration', async (_event, enabled: boolean) => {
    // The GPU process starts before any window exists, so this cannot take
    // effect immediately: persist the choice and let the next launch apply it
    // in index.ts before `app.whenReady()`.
    const file = path.join(app.getPath('userData'), 'gpu-state.json');
    ensureDir(path.dirname(file));
    fs.writeFileSync(
      file,
      JSON.stringify({ hardwareAcceleration: Boolean(enabled), savedAt: Date.now() }, null, 2),
      'utf8'
    );
    return { ok: true, requiresRestart: true };
  });
  on('system:restart', () => bridge.restart());
  handle('system:languages', () => LANGUAGES);
  handle('system:memory', () => {
    const metrics = app.getAppMetrics();
    const total = metrics.reduce((sum, metric) => sum + metric.memory.workingSetSize, 0);
    return {
      private: Math.round(total / 1024),
      shared: 0,
      total: Math.round(total / 1024)
    };
  });

  void systemPreferences;
}

async function readActivePageText(win: KimminoWindow | null): Promise<string> {
  const wc = win?.tabs.activeWebContents();
  if (!wc) return '';
  try {
    const text = (await wc.executeJavaScript(
      `(() => {
        const article = document.querySelector('article, main, [role="main"]') || document.body;
        if (!article) return '';
        const clone = article.cloneNode(true);
        clone.querySelectorAll('script,style,nav,footer,aside,form,iframe,noscript').forEach((el) => el.remove());
        return (clone.innerText || '').replace(/\\s+/g, ' ').slice(0, 20000);
      })()`,
      true
    )) as string;
    return text ?? '';
  } catch {
    return '';
  }
}

/**
 * A short, factual picture of the session for the assistant: which page, what
 * was blocked, how many tabs, and the protections that are actually on. Without
 * this the model can only guess when someone asks "why is this page broken?".
 */
function describeBrowser(runtime: ProfileRuntime, window: KimminoWindow | null, bridge: AppBridge): string {
  const prefs = runtime.prefs.all();
  const stats = bridge.sessionStats();
  const rules = bridge.filters.stats().counts;
  const tabs = window?.tabs.snapshot().tabs ?? [];
  const privacy = prefs.privacy;
  const on = (value: boolean) => (value ? 'on' : 'off');
  return [
    `Browser session: ${tabs.length} tab${tabs.length === 1 ? '' : 's'} open.`,
    `Blocked this session: ${stats.ads} ads, ${stats.trackers} trackers, ${stats.cookies} third-party cookies.`,
    `Protections: ad blocking ${on(privacy.adBlocking)}, tracker blocking ${on(privacy.blockTrackers)}, third-party cookies refused ${on(privacy.blockThirdPartyCookies)}, fingerprint randomisation ${on(privacy.fingerprintProtection)}, HTTPS-only ${on(privacy.httpsOnly)}, strict mode ${on(privacy.strictMode)}.`,
    `Filter bundle: ${rules.ads} ad rules, ${rules.trackers} tracker rules, ${rules.malware} malware rules. Site exceptions: ${runtime.exceptions.all().trustedOrigins.length} trusted origins.`,
    `Other settings: interface scale ${prefs.uiScale}×, search engine ${prefs.search.engine}, language ${prefs.system.language}, theme ${prefs.customThemeId ?? 'default'}.`
  ].join('\n');
}

/**
 * Install then actually load. Installing alone is not enough: Chromium only
 * loads extensions when asked, so a silent failure here looks like "it did
 * nothing" — the result says exactly what happened.
 */
async function installExtension(
  runtime: ProfileRuntime,
  installer: () => Promise<ExtensionInfo | null>
): Promise<{ ok: boolean; message: string; extension: ExtensionInfo | null }> {
  let info: ExtensionInfo | null = null;
  try {
    info = await installer();
  } catch (err) {
    return { ok: false, message: (err as Error).message, extension: null };
  }
  if (!info) return { ok: false, message: 'Cancelled.', extension: null };
  const report = await runtime.extensions.syncInto(runtime.ses);
  if (report.failed.some((failure) => failure.id === info!.id)) {
    const failure = report.failed.find((item) => item.id === info!.id)!;
    return { ok: false, message: `${info.name} installed but Chromium refused to load it: ${failure.error}`, extension: { ...info, status: 'error', error: failure.error } };
  }
  return { ok: true, message: `${info.name} is installed and running.`, extension: { ...info, status: 'running', error: null } };
}
