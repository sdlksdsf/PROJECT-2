import { app, dialog, shell, type Session, type WebContents } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { Library } from './library';
import type { Preferences } from '../shared/types';
import type { DownloadItem as KimminoDownload } from '../shared/types';
import { downloadsDir } from './profiles';

const active = new Map<string, Electron.DownloadItem>();

export function attachDownloads(
  ses: Session,
  library: Library,
  prefs: () => Preferences,
  notify: (items: KimminoDownload[]) => void
): void {
  ses.on('will-download', (_event, item, webContents: WebContents | undefined) => {
    const id = `dl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    active.set(id, item);
    const settings = prefs().system;
    if (settings.askWhereToSave) {
      const suggestion = path.join(settings.downloadDir || downloadsDir(), item.getFilename());
      const choice = dialog.showSaveDialogSync({
        title: 'Save download',
        defaultPath: suggestion,
        buttonLabel: 'Save'
      });
      if (!choice) {
        // The user cancelled before anything was written: drop the item rather
        // than leaving a phantom row in the download list.
        item.cancel();
        return;
      }
      item.setSavePath(choice);
    }
    const targetDir = settings.downloadDir || downloadsDir();
    const filename = settings.askWhereToSave ? item.getSavePath() : uniquePath(path.join(targetDir, item.getFilename()));
    if (!settings.askWhereToSave) item.setSavePath(filename);

    const record: KimminoDownload = {
      id,
      filename: path.basename(filename),
      url: item.getURL(),
      path: filename,
      state: 'progressing',
      receivedBytes: 0,
      totalBytes: item.getTotalBytes(),
      startedAt: Date.now(),
      paused: false
    };
    library.upsertDownload(record);
    notify(library.downloads());

    item.on('updated', (_e, state) => {
      const current = library.downloads().find((d) => d.id === id);
      if (!current) return;
      const next: KimminoDownload = {
        ...current,
        receivedBytes: item.getReceivedBytes(),
        totalBytes: item.getTotalBytes() || current.totalBytes,
        paused: item.isPaused(),
        state: state === 'interrupted' ? 'interrupted' : state === 'progressing' ? 'progressing' : current.state
      };
      library.upsertDownload(next);
      notify(library.downloads());
    });

    item.once('done', (_e, state) => {
      const current = library.downloads().find((d) => d.id === id);
      if (current) {
        library.upsertDownload({
          ...current,
          state: state === 'completed' ? 'completed' : state === 'cancelled' ? 'cancelled' : 'interrupted',
          receivedBytes: item.getReceivedBytes()
        });
      }
      active.delete(id);
      notify(library.downloads());
      if (state === 'completed' && webContents) {
        webContents.send('kimmino:toast', { kind: 'success', message: `Downloaded ${path.basename(filename)}` });
      }
    });
  });
}

export function controlDownload(id: string, action: 'pause' | 'resume' | 'cancel'): void {
  const item = active.get(id);
  if (!item) return;
  if (action === 'pause') item.pause();
  if (action === 'resume') item.resume();
  if (action === 'cancel') item.cancel();
}

export function openDownload(record: KimminoDownload): void {
  if (fs.existsSync(record.path)) void shell.openPath(record.path);
}

export function revealDownload(record: KimminoDownload): void {
  if (fs.existsSync(record.path)) shell.showItemInFolder(record.path);
}

function uniquePath(target: string): string {
  if (!fs.existsSync(target)) return target;
  const dir = path.dirname(target);
  const ext = path.extname(target);
  const base = path.basename(target, ext);
  for (let i = 1; i < 500; i += 1) {
    const candidate = path.join(dir, `${base} (${i})${ext}`);
    if (!fs.existsSync(candidate)) return candidate;
  }
  return path.join(app.getPath('temp'), `${base}-${Date.now()}${ext}`);
}
