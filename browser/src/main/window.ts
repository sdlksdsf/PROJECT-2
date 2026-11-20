import { BaseWindow, WebContentsView, app, screen } from 'electron';
import type { WebContents } from 'electron';
import path from 'node:path';
import { TabManager } from './tabs';
import type { ProfileRuntime } from './profile-runtime';
import type { ContentRect, InternalPage, WindowState } from '../shared/types';
import { internalUrl } from '../shared/types';
import type { FilterEngine } from './privacy/engine';
import { logStartup } from './log';
import { centeredBounds, restoreBounds, type Rect } from './window-bounds';
import { rememberWindowState } from './window-state';

export interface KimminoWindowOptions {
  runtime: ProfileRuntime;
  engine: () => FilterEngine | null;
  preloads: { shell: string; tab: string };
  rendererUrl: string | null;
  rendererFile: string;
  onClose: () => void;
  onInternalNavigate: (page: InternalPage) => void;
  /** Geometry from the last run; validated against the current displays. */
  bounds?: Rect | null;
  maximized?: boolean;
}

/**
 * One browser window: a privileged UI shell (React) with native page views
 * layered into the content area by the main process.
 */
export class KimminoWindow {
  readonly win: BaseWindow;
  readonly shell: WebContentsView;
  readonly tabs: TabManager;
  private contentBounds: ContentRect = { x: 0, y: 0, width: 0, height: 0 };
  private splitBounds: ContentRect | null = null;
  private contentVisible = true;
  private destroyed = false;
  /** Last geometry in the normal (not maximised, not full-screen) state. */
  private normalBounds: Rect;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(private readonly opts: KimminoWindowOptions) {
    // A window larger than the screen puts the close button, the sidebar's lower
    // icons and the right end of the tab strip out of reach — and no drag brings
    // them back, because there is no position where the window fits. So the size
    // requested here is always the *fitted* size.
    const area = screen.getPrimaryDisplay().workArea;
    const bounds = this.clampToNearestDisplay(opts.bounds ?? centeredBounds(area));
    this.normalBounds = { ...bounds };
    this.win = new BaseWindow({
      ...bounds,
      minWidth: Math.min(720, area.width),
      minHeight: Math.min(480, area.height),
      show: false,
      frame: false,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
      trafficLightPosition: { x: 14, y: 14 },
      backgroundColor: '#0b0d12',
      title: 'Kimmino'
    });

    this.shell = new WebContentsView({
      webPreferences: {
        preload: opts.preloads.shell,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: false,
        backgroundThrottling: false
      }
    });
    this.shell.setBackgroundColor('#0b0d12');
    this.win.contentView.addChildView(this.shell);

    this.tabs = new TabManager({
      win: this.win,
      session: opts.runtime.ses,
      sessionId: opts.runtime.profile.id,
      incognito: opts.runtime.incognito,
      profileId: opts.runtime.profile.id,
      profileName: opts.runtime.profile.name,
      prefs: () => opts.runtime.prefs.all(),
      engine: opts.engine,
      library: opts.runtime.library,
      emit: () => this.pushState(),
      onInternalNavigate: opts.onInternalNavigate,
      isTrusted: (origin) => opts.runtime.exceptions.isTrusted(origin),
      preloadPath: opts.preloads.tab,
      appRoot: path.join(app.getPath('userData'), 'profiles', opts.runtime.profile.id),
      onView: (contents) => this.bindWindowShortcuts(contents)
    });

    this.bindWindowShortcuts(this.shell.webContents);
    this.loadShell();
    this.wireWindowEvents();
    if (opts.maximized) this.win.maximize();
  }

  private loadShell(): void {
    const { rendererUrl, rendererFile } = this.opts;
    const target = rendererUrl ?? rendererFile;
    // A shell that never loads is a black window with no explanation, so both
    // failure modes are logged and surfaced rather than swallowed.
    this.shell.webContents.on('did-fail-load', (_event, code, description, url) => {
      logStartup(`shell failed to load (${code} ${description}) ${url}`);
    });
    this.shell.webContents.on('render-process-gone', (_event, details) => {
      logStartup(`shell renderer gone: ${details.reason} (exit ${details.exitCode})`);
    });
    this.shell.webContents.on('console-message', (_event, level, message, line, source) => {
      if (level >= 2) logStartup(`shell console(${level}) ${source}:${line} ${message}`);
    });
    const loaded = rendererUrl ? this.shell.webContents.loadURL(rendererUrl) : this.shell.webContents.loadFile(rendererFile);
    void loaded.catch((error: unknown) => logStartup(`shell load threw for ${target}: ${String(error)}`));
  }

  private wireWindowEvents(): void {
    this.win.on('resize', () => this.applyLayout());
    this.win.on('resized', () => this.applyLayout());
    this.win.on('show', () => this.applyLayout());
    this.win.on('restore', () => {
      this.applyLayout();
      this.pushState();
    });
    this.win.on('maximize', () => this.applyLayout());
    this.win.on('unmaximize', () => this.applyLayout());
    this.win.on('enter-full-screen', () => this.applyLayout());
    this.win.on('leave-full-screen', () => this.applyLayout());
    // Remember geometry so the next launch opens where this one was left.
    const remember = () => this.scheduleRemember();
    this.win.on('resized', remember);
    this.win.on('moved', remember);
    this.win.on('maximize', remember);
    this.win.on('unmaximize', remember);
    this.win.on('maximize', () => this.pushState());
    this.win.on('unmaximize', () => this.pushState());
    this.win.on('enter-full-screen', () => this.pushState());
    this.win.on('leave-full-screen', () => this.pushState());
    this.win.on('blur', () => {
      this.shell.webContents.send('k:window-blur', true);
    });
    this.win.on('focus', () => {
      this.shell.webContents.send('k:window-blur', false);
    });
    this.win.on('close', () => {
      if (this.saveTimer) clearTimeout(this.saveTimer);
      if (!this.win.isMaximized() && !this.win.isFullScreen()) this.normalBounds = { ...this.win.getBounds() };
      rememberWindowState(this.normalBounds, this.win.isMaximized());
      this.destroyed = true;
      this.tabs.destroy();
      this.opts.onClose();
    });
    this.shell.webContents.on('did-finish-load', () => {
      this.pushState();
      this.applyLayout();
    });
  }

  /**
   * Escape hatches that do not depend on seeing the interface.
   *
   * When a window ends up awkwardly placed (a monitor was unplugged, a projector
   * was disconnected, the resolution changed) the buttons needed to fix it can be
   * the ones that are missing. These work from any web contents in the window.
   */
  private bindWindowShortcuts(contents: WebContents): void {
    contents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;
      const mod = process.platform === 'darwin' ? input.meta : input.control;
      if (!mod) return;
      const key = input.key.toLowerCase();
      if (input.shift && input.alt && (key === 'r' || key === '0')) {
        // Cmd/Ctrl+Shift+Alt+R — the "I cannot see my window" rescue.
        this.resetBounds();
        event.preventDefault();
        return;
      }
      if (input.shift && key === 'm') {
        this.toggleMaximize();
        event.preventDefault();
      }
    });
  }

  /** Put the window back in the middle of the current screen at a size that fits. */
  resetBounds(): void {
    const area = screen.getDisplayMatching(this.win.getBounds()).workArea;
    if (this.win.isFullScreen()) this.win.setFullScreen(false);
    if (this.win.isMaximized()) this.win.unmaximize();
    const bounds = centeredBounds(area);
    this.win.setBounds(bounds);
    this.normalBounds = { ...bounds };
    this.applyLayout();
    rememberWindowState(bounds, false);
    logStartup(`window reset to ${bounds.width}x${bounds.height} at ${bounds.x},${bounds.y}`);
  }

  /** Pull the window back inside the screens that exist right now. */
  ensureOnScreen(): void {
    if (this.destroyed) return;
    if (this.win.isMaximized() || this.win.isFullScreen()) {
      // Maximised/full-screen windows follow their display automatically.
      this.applyLayout();
      return;
    }
    const current = this.win.getBounds();
    const area = screen.getDisplayMatching(current).workArea;
    const next = restoreBounds(current, area);
    if (next.x !== current.x || next.y !== current.y || next.width !== current.width || next.height !== current.height) {
      this.win.setBounds(next);
      this.normalBounds = { ...next };
      this.applyLayout();
      rememberWindowState(next, false);
      logStartup(`window pulled back on screen to ${next.width}x${next.height} at ${next.x},${next.y}`);
    }
  }

  toggleMaximize(): void {
    if (this.win.isMaximized()) this.win.unmaximize();
    else this.win.maximize();
  }

  private clampToNearestDisplay(rect: Rect | null): Rect {
    if (!rect) return centeredBounds(screen.getPrimaryDisplay().workArea);
    const area = screen.getDisplayMatching(rect).workArea;
    return restoreBounds(rect, area);
  }

  private scheduleRemember(): void {
    if (this.destroyed) return;
    const maximized = this.win.isMaximized();
    if (!maximized && !this.win.isFullScreen()) this.normalBounds = { ...this.win.getBounds() };
    if (this.saveTimer) clearTimeout(this.saveTimer);
    // One write per drag, not one per pixel.
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      if (this.destroyed) return;
      rememberWindowState(this.normalBounds, this.win.isMaximized());
    }, 400);
    this.saveTimer.unref?.();
  }

  boot(restoreSession: boolean): void {
    // Paint first, populate second: if restoring tabs throws, the user still gets
    // a visible window (and a readable error) instead of an invisible process.
    this.win.show();
    logStartup('window shown');
    const restored = restoreSession ? this.tabs.restore() : false;
    if (!restored) this.tabs.create(internalUrl('newtab'), { active: true });
    this.applyLayout();
    this.pushState();
    logStartup(`window ready — ${restored ? 'session restored' : 'new tab'} (chrome ${process.versions.chrome})`);
  }

  /** Called by the renderer whenever the chrome layout changes size. */
  setContentBounds(rect: ContentRect, splitRect: ContentRect | null, visible: boolean): void {
    this.contentBounds = rect;
    this.splitBounds = splitRect;
    this.contentVisible = visible;
    this.tabs.setContentBounds(rect, splitRect, visible);
  }

  applyLayout(): void {
    // The shell must always cover exactly the window: if it keeps a stale size,
    // the chrome is laid out wider than the visible area and the right/bottom of
    // the interface is cut off with no way to reach it.
    const [width, height] = this.win.getContentSize();
    this.shell.setBounds({ x: 0, y: 0, width: Math.max(1, width), height: Math.max(1, height) });
    // Resize page views only when the window geometry actually changed.
    if (this.contentBounds.width && this.contentBounds.height) {
      this.tabs.setContentBounds(this.contentBounds, this.splitBounds, this.contentVisible);
    }
  }

  pushState(): void {
    if (this.destroyed) return;
    const state: WindowState = this.tabs.snapshot();
    if (!this.shell.webContents.isDestroyed()) {
      this.shell.webContents.send('k:state', state);
    }
  }

  send(channel: string, payload: unknown): void {
    if (!this.shell.webContents.isDestroyed()) this.shell.webContents.send(`k:${channel}`, payload);
  }

  get id(): number {
    return this.shell.webContents.id;
  }

  focus(): void {
    this.win.focus();
  }

  close(): void {
    this.win.close();
  }

  isDestroyed(): boolean {
    return this.destroyed;
  }

  shellRendererPath(): string {
    return path.dirname(this.opts.rendererFile);
  }
}
