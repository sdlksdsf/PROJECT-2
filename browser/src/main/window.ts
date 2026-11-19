import { BaseWindow, WebContentsView, app } from 'electron';
import path from 'node:path';
import { TabManager } from './tabs';
import type { ProfileRuntime } from './profile-runtime';
import type { ContentRect, InternalPage, WindowState } from '../shared/types';
import { internalUrl } from '../shared/types';
import type { FilterEngine } from './privacy/engine';

export interface KimminoWindowOptions {
  runtime: ProfileRuntime;
  engine: () => FilterEngine | null;
  preloads: { shell: string; tab: string };
  rendererUrl: string | null;
  rendererFile: string;
  onClose: () => void;
  onInternalNavigate: (page: InternalPage) => void;
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

  constructor(private readonly opts: KimminoWindowOptions) {
    this.win = new BaseWindow({
      width: 1320,
      height: 860,
      minWidth: 720,
      minHeight: 480,
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
      appRoot: path.join(app.getPath('userData'), 'profiles', opts.runtime.profile.id)
    });

    this.loadShell();
    this.wireWindowEvents();
  }

  private loadShell(): void {
    const { rendererUrl, rendererFile } = this.opts;
    if (rendererUrl) void this.shell.webContents.loadURL(rendererUrl);
    else void this.shell.webContents.loadFile(rendererFile);
  }

  private wireWindowEvents(): void {
    this.win.on('resize', () => this.applyLayout());
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
      this.destroyed = true;
      this.tabs.destroy();
      this.opts.onClose();
    });
    this.shell.webContents.on('did-finish-load', () => {
      this.pushState();
      this.applyLayout();
    });
  }

  boot(restoreSession: boolean): void {
    const restored = restoreSession ? this.tabs.restore() : false;
    if (!restored) this.tabs.create(internalUrl('newtab'), { active: true });
    this.win.show();
    this.applyLayout();
    this.pushState();
  }

  /** Called by the renderer whenever the chrome layout changes size. */
  setContentBounds(rect: ContentRect, splitRect: ContentRect | null, visible: boolean): void {
    this.contentBounds = rect;
    this.splitBounds = splitRect;
    this.contentVisible = visible;
    this.tabs.setContentBounds(rect, splitRect, visible);
  }

  applyLayout(): void {
    const [width, height] = this.win.getContentSize();
    this.shell.setBounds({ x: 0, y: 0, width, height });
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
