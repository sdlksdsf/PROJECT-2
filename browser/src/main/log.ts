import { app, dialog } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Startup diagnostics.
 *
 * A packaged desktop app has no visible console: if the main process dies while
 * booting, the user just sees "nothing happens". Everything that can go wrong
 * before the first window paints is written to `<userData>/startup.log`, and
 * fatal errors also get a native message box.
 */
export function startupLogPath(): string {
  try {
    return path.join(app.getPath('userData'), 'startup.log');
  } catch {
    return '';
  }
}

export function describeError(error: unknown): string {
  if (error instanceof Error) return error.stack ?? `${error.name}: ${error.message}`;
  return String(error);
}

export function logStartup(message: string): void {
  const file = startupLogPath();
  const line = `${new Date().toISOString()} [${process.platform}/${process.arch}] ${message}\n`;
  if (file) {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.appendFileSync(file, line);
      if (fs.statSync(file).size > 256 * 1024) {
        const kept = fs.readFileSync(file, 'utf8').split('\n').slice(-400).join('\n');
        fs.writeFileSync(file, kept);
      }
    } catch {
      // Logging must never be the reason the app fails to start.
    }
  }
  process.stderr.write(`[kimmino] ${line}`);
}

let fatalReported = false;

/** Record a fatal problem and tell the user, instead of exiting into silence. */
export function reportStartupError(where: string, error: unknown): void {
  const detail = `${where}: ${describeError(error)}`;
  logStartup(`ERROR ${detail}`);
  if (fatalReported) return;
  fatalReported = true;
  try {
    if (app.isReady()) {
      dialog.showErrorBox(
        'Kimmino could not start',
        `${detail}\n\nA log was written to:\n${startupLogPath() || '(unavailable)'}`
      );
    }
  } catch {
    // No dialog available (yet) — the log above is the fallback.
  }
}
