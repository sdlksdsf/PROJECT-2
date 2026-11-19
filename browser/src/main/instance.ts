import { app } from 'electron';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { logStartup } from './log';

/**
 * Single-instance handling.
 *
 * The naive pattern — `if (!app.requestSingleInstanceLock()) app.quit()` — has a
 * nasty failure mode: a previous process that never managed to paint a window
 * (a crash inside `whenReady`, a killed renderer, a debugger session) keeps
 * holding the OS lock forever. Every later launch then quits silently, so the
 * app looks like it "does nothing" until the user reboots or finds it in Task
 * Manager.
 *
 * So the primary instance publishes a heartbeat file, and a second launch uses
 * it to decide between three outcomes:
 *
 *   1. the holder has a window        → it focuses itself, we exit (normal)
 *   2. the holder has had no window   → it is a zombie, we take the lock over
 *      for longer than the grace
 *   3. we cannot tell (older build,   → we ask, instead of vanishing
 *      or a corrupt state file)
 */

export interface InstanceState {
  pid: number;
  version: string;
  startedAt: number;
  heartbeat: number;
  windows: number;
  windowlessSince: number | null;
}

const STATE_FILE = 'instance.json';
const HEARTBEAT_MS = 2_000;
/** Older than this and the holder is presumed dead even if the lock is not. */
const STALE_MS = 15_000;
/** How long a live-but-windowless holder is tolerated before it is replaced. */
const WINDOWLESS_GRACE_MS = 12_000;
const TAKEOVER_WAIT_MS = 8_000;
const STALE_WAIT_MS = 3_000;

export type LockOutcome = 'primary' | 'takeover' | 'handoff' | 'unknown';

function statePath(): string {
  return path.join(app.getPath('userData'), STATE_FILE);
}

export function readInstanceState(): InstanceState | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath(), 'utf8')) as InstanceState;
    if (typeof parsed?.pid !== 'number' || typeof parsed?.heartbeat !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeState(state: InstanceState): void {
  const file = statePath();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state));
    fs.renameSync(tmp, file);
  } catch {
    // Diagnostics only: never let bookkeeping break a launch.
  }
}

export function clearInstanceState(): void {
  try {
    fs.rmSync(statePath(), { force: true });
  } catch {
    // ignored on purpose
  }
}

/** Heartbeat written by whichever process currently owns the profile. */
export class InstanceHeartbeat {
  private timer: NodeJS.Timeout | null = null;
  private readonly state: InstanceState;

  constructor(version: string) {
    this.state = {
      pid: process.pid,
      version,
      startedAt: Date.now(),
      heartbeat: Date.now(),
      windows: 0,
      windowlessSince: Date.now()
    };
  }

  start(): void {
    this.flush();
    this.timer = setInterval(() => this.flush(), HEARTBEAT_MS);
    this.timer.unref?.();
  }

  setWindows(count: number): void {
    if (count === this.state.windows) return;
    this.state.windows = count;
    this.state.windowlessSince = count === 0 ? Date.now() : null;
    this.flush();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private flush(): void {
    this.state.heartbeat = Date.now();
    writeState(this.state);
  }
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function tryLock(): boolean {
  try {
    return app.requestSingleInstanceLock();
  } catch (error) {
    logStartup(`requestSingleInstanceLock threw: ${String(error)}`);
    return false;
  }
}

async function waitForLock(ms: number): Promise<boolean> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    await delay(250);
    if (tryLock()) return true;
  }
  return false;
}

function killPid(pid: number): boolean {
  try {
    process.kill(pid);
    logStartup(`sent termination signal to pid ${pid}`);
    return true;
  } catch (error) {
    logStartup(`could not signal pid ${pid}: ${String(error)}`);
    return false;
  }
}

function listProcesses(): Promise<Array<{ pid: number; name: string }>> {
  const exe = path.basename(process.execPath);
  const command = process.platform === 'win32' ? 'tasklist' : 'ps';
  const args =
    process.platform === 'win32'
      ? ['/FI', `IMAGENAME eq ${exe}`, '/FO', 'CSV', '/NH']
      : ['-A', '-o', 'pid=,comm='];

  return new Promise((resolve) => {
    execFile(command, args, { windowsHide: true, timeout: 5_000 }, (error, stdout) => {
      if (error || !stdout) {
        resolve([]);
        return;
      }
      const rows: Array<{ pid: number; name: string }> = [];
      for (const line of stdout.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('INFO:')) continue;
        if (process.platform === 'win32') {
          // "Kimmino.exe","1234","Console","1","123,456 K"
          const match = trimmed.match(/^"([^"]+)","(\d+)"/);
          if (match) rows.push({ pid: Number(match[2]), name: match[1] });
        } else {
          const match = trimmed.match(/^(\d+)\s+(.+)$/);
          if (match) rows.push({ pid: Number(match[1]), name: path.basename(match[2]) });
        }
      }
      resolve(rows);
    });
  });
}

/** Other running copies of this app, excluding ourselves. */
export async function findOtherInstances(): Promise<Array<{ pid: number; name: string }>> {
  const rows = await listProcesses();
  const self = process.pid;
  const needle = path.basename(process.execPath).replace(/\.exe$/i, '').toLowerCase();
  return rows.filter((row) => row.pid !== self && row.name.toLowerCase().includes(needle));
}

/** Terminate leftover copies that are holding our profile without a window. */
export async function terminateOtherInstances(): Promise<number> {
  const others = await findOtherInstances();
  let killed = 0;
  for (const other of others) {
    if (killPid(other.pid)) killed += 1;
  }
  logStartup(`terminated ${killed} leftover instance(s) of ${others.length} found`);
  return killed;
}

/** Retry the lock for a bounded time (used after asking the user to restart). */
export async function retryLock(ms = TAKEOVER_WAIT_MS): Promise<boolean> {
  return waitForLock(ms);
}

/** Watch the holder until it paints a window, disowns the file, or dies. */
async function waitForHolderWindow(pid: number, ms: number): Promise<boolean> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    await delay(300);
    const state = readInstanceState();
    if (!state) return false;
    if (state.windows > 0) return true;
    if (state.pid !== pid) return false;
    if (Date.now() - state.heartbeat > STALE_MS) return false;
  }
  return false;
}

export async function acquireInstance(version: string): Promise<LockOutcome> {
  if (tryLock()) return 'primary';

  const holder = readInstanceState();
  const fresh = holder != null && Date.now() - holder.heartbeat < STALE_MS;

  // 1./2. A live holder: either it already has a window, or it is still starting.
  if (holder && fresh) {
    if (holder.windows > 0) return 'handoff';

    // Windowless. Give it the grace period — a double-click launch lands here
    // while the first process is still building its window.
    if (await waitForHolderWindow(holder.pid, WINDOWLESS_GRACE_MS)) return 'handoff';

    const latest = readInstanceState();
    const latestFresh = latest != null && Date.now() - latest.heartbeat < STALE_MS;
    if (latest && latestFresh && latest.windows === 0) {
      logStartup(
        `holder pid ${latest.pid} (v${latest.version}) has shown no window for ${Math.round(
          WINDOWLESS_GRACE_MS / 1000
        )}s — taking over`
      );
      if (killPid(latest.pid) && (await waitForLock(TAKEOVER_WAIT_MS))) return 'takeover';
    }
  }

  // 2b. No holder, or a stale heartbeat: the process died but the OS lock lingers.
  if (await waitForLock(STALE_WAIT_MS)) {
    logStartup(`reclaimed an orphaned single-instance lock (this instance is v${version})`);
    return 'takeover';
  }

  // 3. Locked by something we cannot identify (an older build has no heartbeat
  //    file, or the profile folder is not writable). Ask instead of vanishing.
  logStartup(
    `lock held by an unknown process; heartbeat: ${holder ? JSON.stringify(holder) : 'missing'} (this instance is v${version})`
  );
  return 'unknown';
}
