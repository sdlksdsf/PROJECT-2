import { app, Notification, shell } from 'electron';
import type { Preferences } from '../shared/types';

/**
 * Two things that live outside the window: whether Kimmino starts with the
 * computer, and whether a newer release exists.
 */

/* --------------------------- launch on startup --------------------------- */

let loginItemApplied: boolean | null = null;

export function applyLoginItem(openAtLogin: boolean): void {
  if (!app.isPackaged) {
    // A dev build has no stable executable to register; the setting still
    // persists so a packaged run picks it up.
    return;
  }
  if (loginItemApplied === openAtLogin) return;
  try {
    app.setLoginItemSettings({
      openAtLogin,
      args: openAtLogin ? ['--startup'] : []
    });
    loginItemApplied = openAtLogin;
  } catch (err) {
    console.warn('[kimmino:startup] could not set login item', err);
  }
}

export function loginItemState(): boolean {
  try {
    return app.getLoginItemSettings().openAtLogin;
  } catch {
    return false;
  }
}

/* ------------------------------ update check ----------------------------- */

export interface UpdateState {
  current: string;
  latest: string | null;
  notesUrl: string | null;
  checkedAt: number | null;
  status: 'idle' | 'checking' | 'current' | 'available' | 'offline';
}

const REPO = 'sdlksdsf/PROJECT-2';
let last: UpdateState | null = null;

function compareVersions(a: string, b: string): number {
  const parse = (value: string) => value.replace(/^v/i, '').split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const left = parse(a);
  const right = parse(b);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Ask GitHub what the newest release is. This is the same public data the
 * download page reads — no telemetry, no identifier, and it is skipped entirely
 * when automatic updates are off.
 */
export async function checkForUpdates(
  prefs: Preferences,
  options: { interactive?: boolean; onAvailable?: (state: UpdateState) => void } = {}
): Promise<UpdateState> {
  const current = app.getVersion();
  const state: UpdateState = last ?? { current, latest: null, notesUrl: null, checkedAt: null, status: 'idle' };
  state.status = 'checking';
  last = state;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    // Early bird looks at the newest release including pre-releases.
    const endpoint = prefs.productivity.earlyBird
      ? `https://api.github.com/repos/${REPO}/releases?per_page=5`
      : `https://api.github.com/repos/${REPO}/releases/latest`;
    const response = await fetch(endpoint, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': `Kimmino/${current}` },
      signal: controller.signal
    }).finally(() => clearTimeout(timer));
    if (!response.ok) throw new Error(String(response.status));
    const payload = (await response.json()) as unknown;
    const list = (Array.isArray(payload) ? payload : [payload]) as Array<{
      tag_name?: string;
      html_url?: string;
      draft?: boolean;
    }>;
    const release = list.find((item) => item && !item.draft);
    const latest = release?.tag_name ?? null;
    const newer = latest ? compareVersions(latest, current) > 0 : false;
    const next: UpdateState = {
      current,
      latest,
      notesUrl: release?.html_url ?? null,
      checkedAt: Date.now(),
      status: newer ? 'available' : 'current'
    };
    last = next;
    if (newer && latest && prefs.updates.dismissedVersion !== latest) {
      options.onAvailable?.(next);
      if (options.interactive || prefs.updates.automatic) showUpdateNotification(next);
    }
    return next;
  } catch {
    const next: UpdateState = { ...state, status: 'offline', checkedAt: Date.now() };
    last = next;
    return next;
  }
}

function showUpdateNotification(state: UpdateState): void {
  if (!Notification.isSupported()) return;
  const notification = new Notification({
    title: `Kimmino ${state.latest} is available`,
    body: `You are on ${state.current}. Click to see what changed.`,
    silent: true
  });
  notification.on('click', () => {
    if (state.notesUrl) void shell.openExternal(state.notesUrl);
  });
  notification.show();
}

export function updateState(): UpdateState {
  return last ?? { current: app.getVersion(), latest: null, notesUrl: null, checkedAt: null, status: 'idle' };
}

/** Called once the first window exists, so a check never delays start-up. */
export function scheduleUpdateCheck(prefs: Preferences): void {
  setTimeout(() => {
    if (prefs.updates.automatic) void checkForUpdates(prefs);
  }, 12_000);
}
