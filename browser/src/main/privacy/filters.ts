import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { FilterEngine, type FilterBundleJson } from './engine';

/**
 * Loads the compiled filter bundle that ships with the app, and (optionally)
 * refreshes it from the network on a slow cadence. Everything stays local:
 * the updater only ever *downloads* rules, it never uploads anything.
 */
const FILTER_URL = 'https://raw.githubusercontent.com/sdlksdsf/PROJECT-2/main/browser/resources/filters/default-filters.json';
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

export class FiltersService {
  engine: FilterEngine | null = null;
  private state: { lastChecked: number; version: string | null; source: 'bundled' | 'updated' | 'none' } = {
    lastChecked: 0,
    version: null,
    source: 'none'
  };

  constructor(private readonly appRoot: string) {}

  private cachePath(): string {
    return path.join(app.getPath('userData'), 'filters', 'default-filters.json');
  }

  private bundledPath(): string {
    // resources/filters lives next to the app source in dev and under
    // resources/ in a packaged build (see electron-builder.yml extraResources).
    const candidates = [
      path.join(this.appRoot, 'resources', 'filters', 'default-filters.json'),
      path.join(process.resourcesPath ?? '', 'filters', 'default-filters.json'),
      path.join(app.getAppPath(), 'resources', 'filters', 'default-filters.json')
    ];
    return candidates.find((candidate) => {
      try {
        return fs.existsSync(candidate);
      } catch {
        return false;
      }
    }) ?? candidates[0];
  }

  load(): FilterEngine | null {
    const reads: Array<{ file: string; source: 'updated' | 'bundled' }> = [
      { file: this.cachePath(), source: 'updated' },
      { file: this.bundledPath(), source: 'bundled' }
    ];
    for (const read of reads) {
      try {
        if (!fs.existsSync(read.file)) continue;
        const json = JSON.parse(fs.readFileSync(read.file, 'utf8')) as FilterBundleJson;
        this.engine = new FilterEngine(json);
        this.state = { ...this.state, version: json.generatedAt ?? null, source: read.source };
        return this.engine;
      } catch (err) {
        console.warn('[kimmino:filters] could not load', read.file, err);
      }
    }
    console.warn('[kimmino:filters] no filter bundle found — running without ad blocking data');
    return null;
  }

  stats() {
    return {
      ...this.state,
      counts: this.engine?.counts ?? { ads: 0, trackers: 0, malware: 0, cosmetic: 0, allow: 0, removeParams: 0 }
    };
  }

  async refreshIfStale(): Promise<boolean> {
    if (Date.now() - this.state.lastChecked < REFRESH_MS) return false;
    this.state.lastChecked = Date.now();
    try {
      const res = await fetch(FILTER_URL, { headers: { 'user-agent': 'kimmino-filters/1.0' } });
      if (!res.ok) return false;
      const json = (await res.json()) as FilterBundleJson;
      const dir = path.dirname(this.cachePath());
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.cachePath(), JSON.stringify(json), 'utf8');
      this.engine = new FilterEngine(json);
      this.state = { lastChecked: Date.now(), version: json.generatedAt ?? null, source: 'updated' };
      return true;
    } catch {
      return false;
    }
  }
}
