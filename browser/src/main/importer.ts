import { dialog } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Library } from './library';

interface ImportResult {
  ok: boolean;
  bookmarks: number;
  message: string;
}

interface ChromeBookmarkNode {
  type: 'url' | 'folder';
  name: string;
  url?: string;
  children?: ChromeBookmarkNode[];
}

const CHROMIUM_PROFILES: Array<{ name: string; base: string }> = [
  { name: 'Google Chrome', base: 'Google/Chrome/User Data' },
  { name: 'Microsoft Edge', base: 'Microsoft Edge/User Data' },
  { name: 'Brave', base: 'BraveSoftware/Brave-Browser/User Data' },
  { name: 'Vivaldi', base: 'Vivaldi/User Data' },
  { name: 'Opera', base: 'Opera Software/Opera Stable' },
  { name: 'Opera GX', base: 'Opera Software/Opera GX Stable' },
  { name: 'Chromium', base: 'Chromium/User Data' }
];

function appDataRoots(): string[] {
  const home = os.homedir();
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA ?? path.join(home, 'AppData', 'Roaming');
    const localAppData = process.env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local');
    return [appData, localAppData];
  }
  if (process.platform === 'darwin') {
    return [path.join(home, 'Library', 'Application Support')];
  }
  const config = process.env.XDG_CONFIG_HOME ?? path.join(home, '.config');
  return [config, path.join(home, '.var', 'app')];
}

function findChromiumBookmarkFiles(): Array<{ browser: string; file: string }> {
  const found: Array<{ browser: string; file: string }> = [];
  for (const root of appDataRoots()) {
    for (const browser of CHROMIUM_PROFILES) {
      const baseDir = path.join(root, browser.base);
      if (!fs.existsSync(baseDir)) continue;
      const direct = path.join(baseDir, 'Bookmarks');
      if (fs.existsSync(direct)) found.push({ browser: browser.name, file: direct });
      try {
        for (const entry of fs.readdirSync(baseDir)) {
          if (!/^(Default|Profile \d+)$/.test(entry)) continue;
          const file = path.join(baseDir, entry, 'Bookmarks');
          if (fs.existsSync(file)) found.push({ browser: `${browser.name} (${entry})`, file });
        }
      } catch {
        /* ignore */
      }
    }
  }
  return found;
}

function walkChromeBookmarks(node: ChromeBookmarkNode | undefined, folder: string, out: Array<{ title: string; url: string; folder: string }>): void {
  if (!node) return;
  if (node.type === 'url' && node.url) {
    out.push({ title: node.name || node.url, url: node.url, folder });
    return;
  }
  const nextFolder = node.type === 'folder' ? `${folder}/${node.name}` : folder;
  for (const child of node.children ?? []) walkChromeBookmarks(child, nextFolder, out);
}

/** Parses the Netscape bookmark HTML that every browser can export. */
function parseBookmarkHtml(html: string): Array<{ title: string; url: string; folder: string }> {
  const out: Array<{ title: string; url: string; folder: string }> = [];
  const lines = html.split(/\r?\n/);
  let folder = 'Imported';
  const folderStack: string[] = [];
  for (const line of lines) {
    const dl = line.match(/<DT><H3[^>]*>(.*?)<\/H3>/i);
    if (dl) {
      folderStack.push(dl[1].trim());
      folder = folderStack.join('/');
      continue;
    }
    if (/<\/DL>/i.test(line) && folderStack.length) {
      folderStack.pop();
      folder = folderStack.join('/') || 'Imported';
      continue;
    }
    const anchor = line.match(/<DT><A[^>]*HREF="([^"]+)"[^>]*>(.*?)<\/A>/i);
    if (anchor) {
      out.push({
        title: anchor[2].replace(/<[^>]+>/g, '').trim() || anchor[1],
        url: decodeHtmlEntities(anchor[1]),
        folder: folder || 'Imported'
      });
    }
  }
  return out;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * One-click import from every major browser. Chromium-family bookmarks are read
 * straight out of their profile folders; Firefox, Safari and anything else can
 * be imported from the HTML file those browsers export.
 */
export async function importFromBrowser(library: Library): Promise<ImportResult> {
  const candidates = findChromiumBookmarkFiles();
  const options: Array<{ label: string; file: string | null; browser: string }> = candidates.map((candidate) => ({
    label: `${candidate.browser}`,
    file: candidate.file,
    browser: candidate.browser
  }));
  options.push({ label: 'Import from an HTML file…', file: null, browser: 'HTML file' });

  const { response } = await dialog.showMessageBox({
    type: 'question',
    title: 'Import bookmarks & settings',
    message: candidates.length
      ? 'Choose the browser to import bookmarks from:'
      : 'No browser profiles detected automatically. You can import an HTML bookmarks file instead.',
    buttons: [...options.map((o) => o.label), 'Cancel'],
    cancelId: options.length
  });
  if (response >= options.length) return { ok: false, bookmarks: 0, message: 'Import cancelled.' };

  const choice = options[response];
  let entries: Array<{ title: string; url: string; folder: string }> = [];

  if (choice.file) {
    const raw = JSON.parse(fs.readFileSync(choice.file, 'utf8')) as { roots?: Record<string, ChromeBookmarkNode> };
    for (const root of Object.values(raw.roots ?? {})) {
      walkChromeBookmarks(root, choice.browser, entries);
    }
  } else {
    const picked = await dialog.showOpenDialog({
      title: 'Choose a bookmarks HTML file',
      filters: [{ name: 'Bookmarks', extensions: ['html', 'htm'] }],
      properties: ['openFile']
    });
    if (picked.canceled || !picked.filePaths[0]) return { ok: false, bookmarks: 0, message: 'Import cancelled.' };
    entries = parseBookmarkHtml(fs.readFileSync(picked.filePaths[0], 'utf8'));
  }

  // De-duplicate against what we already have.
  const existing = new Set(library.bookmarks().map((bookmark) => bookmark.url));
  let imported = 0;
  for (const entry of entries) {
    if (!entry.url || existing.has(entry.url)) continue;
    if (!/^https?:|^ftp:/.test(entry.url)) continue;
    library.addBookmark({ title: entry.title, url: entry.url, folder: entry.folder || choice.browser });
    existing.add(entry.url);
    imported += 1;
  }

  return {
    ok: true,
    bookmarks: imported,
    message: imported ? `Imported ${imported} bookmarks from ${choice.browser}.` : `No new bookmarks found in ${choice.browser}.`
  };
}
