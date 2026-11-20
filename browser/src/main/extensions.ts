import { dialog, type Session } from 'electron';
import AdmZip from 'adm-zip';
import fs from 'node:fs';
import path from 'node:path';
import { JsonStore } from './store';
import type { ExtensionInfo } from '../shared/types';

interface StoredExtension {
  id: string;
  name: string;
  version: string;
  description: string;
  path: string;
  enabled: boolean;
  permissions: string[];
  manifestVersion: number;
  icon: string | null;
}

/**
 * Extension support.
 *
 * Kimmino loads *unpacked* Chrome-extension-compatible add-ons through
 * Chromium's own extension runtime (the same engine Chrome uses). That covers
 * content scripts, declarativeNetRequest, storage and most toolbar actions.
 * Chromium's Manifest V3 service workers are still gated inside Electron, so
 * extensions that depend on a background service worker are flagged as
 * "limited" in the UI instead of silently failing.
 */
export interface LoadReport {
  loaded: string[];
  failed: Array<{ id: string; name: string; error: string }>;
}

const CHROME_STORE_PATTERN = /^https?:\/\/chromewebstore\.google\.com\/webstore\/detail\//i;

export class ExtensionService {
  private store: JsonStore<StoredExtension[]>;
  private loaded = new Set<string>();
  private errors = new Map<string, string>();

  constructor(private profileId: string, private extensionsDir: string) {
    this.store = new JsonStore<StoredExtension[]>('extensions.json', () => [], extensionsDir);
  }

  async list(): Promise<ExtensionInfo[]> {
    return this.store.get().map((ext) => ({
      ...ext,
      status: this.loaded.has(ext.id) ? 'running' : this.errors.has(ext.id) ? 'error' : 'idle',
      error: this.errors.get(ext.id) ?? null
    }));
  }

  /**
   * Load every enabled extension into the profile's session and unload anything
   * that was disabled or removed. Chromium forgets extensions between launches,
   * so this runs at start-up and again after every change.
   */
  async syncInto(ses: Session): Promise<LoadReport> {
    const report: LoadReport = { loaded: [], failed: [] };
    const api = (ses as unknown as { extensions?: { loadExtension: (p: string) => Promise<{ id: string; path: string }>; removeExtension: (id: string) => void; getAllExtensions: () => Array<{ id: string; path: string }> } }).extensions;
    if (!api?.loadExtension) {
      const error = 'This build was not compiled with extension support.';
      for (const ext of this.store.get()) this.errors.set(ext.id, error);
      return report;
    }

    const installed = this.store.get();
    const enabled = installed.filter((ext) => ext.enabled && fs.existsSync(ext.path));

    // Unload anything that is running but should not be.
    const keep = new Set(enabled.map((ext) => path.resolve(ext.path)));
    for (const running of api.getAllExtensions()) {
      if (!keep.has(path.resolve(running.path))) {
        try {
          api.removeExtension(running.id);
        } catch {
          /* already gone */
        }
      }
    }

    for (const ext of enabled) {
      if (this.loaded.has(ext.id)) continue;
      try {
        await api.loadExtension(ext.path);
        this.loaded.add(ext.id);
        this.errors.delete(ext.id);
        report.loaded.push(ext.id);
      } catch (err) {
        const message = explainLoadError(err, ext.path);
        console.warn('[kimmino:extensions] failed to load', ext.name, message);
        this.errors.set(ext.id, message);
        report.failed.push({ id: ext.id, name: ext.name, error: message });
      }
    }

    for (const ext of installed) {
      if (!ext.enabled) this.loaded.delete(ext.id);
    }
    return report;
  }

  errorFor(id: string): string | null {
    return this.errors.get(id) ?? null;
  }

  async installFromFolder(): Promise<ExtensionInfo | null> {
    const result = await dialog.showOpenDialog({
      title: 'Select an unpacked extension folder',
      properties: ['openDirectory'],
      buttonLabel: 'Install'
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return this.installPath(result.filePaths[0]);
  }

  /** Pick a .zip or .crx and install it. */
  async installFromFile(): Promise<ExtensionInfo | null> {
    const result = await dialog.showOpenDialog({
      title: 'Select an extension archive',
      properties: ['openFile'],
      filters: [{ name: 'Extension', extensions: ['zip', 'crx'] }],
      buttonLabel: 'Install'
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return this.installFromZipFile(result.filePaths[0]);
  }

  /** Install from a .zip or unpacked directory that already sits on disk. */
  async installPath(sourcePath: string, name?: string): Promise<ExtensionInfo | null> {
    const manifestPath = path.join(sourcePath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) throw new Error('That folder has no manifest.json — pick the unpacked extension root.');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
      name?: string;
      version?: string;
      description?: string;
      permissions?: string[];
      manifest_version?: number;
      action?: { default_icon?: unknown };
      icons?: Record<string, string>;
    };

    const id = `ext_${Date.now().toString(36)}`;
    const entry: StoredExtension = {
      id,
      name: name || manifest.name || path.basename(sourcePath),
      version: manifest.version ?? '0.0.0',
      description: manifest.description ?? '',
      path: sourcePath,
      enabled: true,
      permissions: manifest.permissions ?? [],
      manifestVersion: manifest.manifest_version ?? 3,
      icon: pickIcon(sourcePath, manifest)
    };
    this.store.update((list) => [...list, entry]);
    this.store.flush();
    this.errors.delete(id);
    return { ...entry, status: 'idle', error: null };
  }

  /** Install from an extension folder URL (zip) or a local .zip/.crx file. */
  async installFromZipFile(filePath: string): Promise<ExtensionInfo | null> {
    const targetDir = path.join(this.extensionsDir, `ext-${Date.now().toString(36)}`);
    fs.mkdirSync(targetDir, { recursive: true });
    const zip = new AdmZip(filePath);
    zip.extractAllTo(targetDir, true);
    const candidate = findManifestRoot(targetDir);
    if (!candidate) throw new Error('No manifest.json found inside the archive.');
    return this.installPath(candidate);
  }

  async installFromUrl(url: string): Promise<ExtensionInfo | null> {
    if (CHROME_STORE_PATTERN.test(url)) {
      throw new Error(
        'Chrome Web Store links cannot be installed directly — Google blocks downloads from other browsers. Use the developer\'s own .crx/.zip, or “Load unpacked”.'
      );
    }
    const res = await fetch(url, { headers: { 'user-agent': 'kimmino-extensions/1.0' } });
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const tmp = path.join(this.extensionsDir, `download-${Date.now()}.zip`);
    fs.mkdirSync(this.extensionsDir, { recursive: true });
    // .crx files carry a header before the zip payload — find the zip signature.
    const zipStart = buffer.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    fs.writeFileSync(tmp, zipStart > 0 ? buffer.subarray(zipStart) : buffer);
    return this.installFromZipFile(tmp);
  }

  async setEnabled(id: string, enabled: boolean): Promise<void> {
    this.store.update((list) => list.map((ext) => (ext.id === id ? { ...ext, enabled } : ext)));
    this.store.flush();
  }

  async remove(id: string): Promise<void> {
    const ext = this.store.get().find((e) => e.id === id);
    this.store.update((list) => list.filter((e) => e.id !== id));
    this.store.flush();
    this.loaded.delete(id);
    this.errors.delete(id);
    if (ext && ext.path.startsWith(this.extensionsDir)) {
      fs.rmSync(ext.path, { recursive: true, force: true });
    }
  }
}

function pickIcon(root: string, manifest: { action?: { default_icon?: unknown }; icons?: Record<string, string> }): string | null {
  const candidates: string[] = [];
  if (manifest.icons) {
    for (const value of Object.values(manifest.icons)) candidates.push(value);
  }
  const actionIcon = manifest.action?.default_icon;
  if (typeof actionIcon === 'string') candidates.push(actionIcon);
  else if (actionIcon && typeof actionIcon === 'object') {
    for (const value of Object.values(actionIcon as Record<string, string>)) candidates.push(value);
  }
  for (const rel of candidates) {
    const full = path.join(root, rel);
    if (fs.existsSync(full)) {
      try {
        const data = fs.readFileSync(full);
        const ext = path.extname(full).replace('.', '') || 'png';
        return `data:image/${ext};base64,${data.toString('base64')}`;
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

function findManifestRoot(dir: string, depth = 0): string | null {
  if (depth > 3) return null;
  if (fs.existsSync(path.join(dir, 'manifest.json'))) return dir;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const found = findManifestRoot(path.join(dir, entry.name), depth + 1);
    if (found) return found;
  }
  return null;
}

/** Chromium's load errors are terse; add the reason and the fix. */
function explainLoadError(err: unknown, extensionPath: string): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/Manifest file is missing or unreadable|Could not load manifest/i.test(raw)) {
    return `No readable manifest.json in ${extensionPath}. Pick the folder that contains manifest.json itself.`;
  }
  if (/Manifest version 2 is deprecated|unsupported manifest version/i.test(raw)) {
    return 'This extension is Manifest V2, which current Chromium no longer runs. Look for an updated release.';
  }
  if (/already loaded|Duplicate extension ID/i.test(raw)) {
    return 'Chromium already has an extension with this ID loaded. Remove the other copy first.';
  }
  if (/non-persistent|in-memory/i.test(raw)) {
    return 'Incognito and temporary sessions cannot host extensions.';
  }
  if (/Extension.*not found|ENOENT/i.test(raw)) {
    return 'The extension folder moved or was deleted. Reinstall it from its new location.';
  }
  return raw;
}
