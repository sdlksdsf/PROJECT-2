import { JsonStore, profileDir } from './store';
import type { Bookmark, DownloadItem, HistoryEntry } from '../shared/types';

const HISTORY_CAP = 20_000;

/** Bookmarks, history and download records for one profile. */
export class Library {
  private bookmarksStore: JsonStore<Bookmark[]>;
  private historyStore: JsonStore<HistoryEntry[]>;
  private downloadsStore: JsonStore<DownloadItem[]>;

  constructor(private profileId: string) {
    const dir = profileDir(profileId);
    this.bookmarksStore = new JsonStore<Bookmark[]>('bookmarks.json', () => [], dir);
    this.historyStore = new JsonStore<HistoryEntry[]>('history.json', () => [], dir);
    this.downloadsStore = new JsonStore<DownloadItem[]>('downloads.json', () => [], dir);
  }

  /* ---------------------------------------------------------------- */
  /* Bookmarks                                                        */
  /* ---------------------------------------------------------------- */

  bookmarks(): Bookmark[] {
    return this.bookmarksStore.get();
  }

  addBookmark(input: { title: string; url: string; folder?: string }): Bookmark {
    const existing = this.bookmarks().find((b) => b.url === input.url);
    if (existing) return existing;
    const bookmark: Bookmark = {
      id: `b_${Date.now().toString(36)}`,
      title: input.title || input.url,
      url: input.url,
      folder: input.folder ?? 'Bookmarks',
      createdAt: Date.now()
    };
    this.bookmarksStore.update((list) => [bookmark, ...list]);
    this.bookmarksStore.flush();
    return bookmark;
  }

  removeBookmark(id: string): void {
    this.bookmarksStore.update((list) => list.filter((b) => b.id !== id));
    this.bookmarksStore.flush();
  }

  updateBookmark(id: string, patch: Partial<Bookmark>): void {
    this.bookmarksStore.update((list) => list.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    this.bookmarksStore.flush();
  }

  /* ---------------------------------------------------------------- */
  /* History                                                          */
  /* ---------------------------------------------------------------- */

  history(query?: string): HistoryEntry[] {
    const list = this.historyStore.get();
    if (!query) return list.slice(0, 500);
    const q = query.toLowerCase();
    return list.filter((h) => h.url.toLowerCase().includes(q) || h.title.toLowerCase().includes(q)).slice(0, 300);
  }

  addVisit(url: string, title: string): void {
    if (!url || url.startsWith('kimmino://')) return;
    if (/^(chrome-error|about|data|blob|devtools):/.test(url)) return;
    let host = '';
    try {
      host = new URL(url).hostname;
    } catch {
      return;
    }
    if (!host) return;
    const list = this.historyStore.get();
    const found = list.find((h) => h.url === url);
    if (found) {
      found.visitedAt = Date.now();
      found.visitCount += 1;
      if (title) found.title = title;
      this.historyStore.set([found, ...list.filter((h) => h.url !== url)].slice(0, HISTORY_CAP));
    } else {
      this.historyStore.set(
        [
          {
            id: `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
            title: title || host,
            url,
            visitedAt: Date.now(),
            visitCount: 1
          },
          ...list
        ].slice(0, HISTORY_CAP)
      );
    }
  }

  removeHistory(id: string): void {
    this.historyStore.update((list) => list.filter((h) => h.id !== id));
    this.historyStore.flush();
  }

  clearHistory(range: 'hour' | 'day' | 'week' | 'all'): void {
    const cutoffs: Record<string, number> = {
      hour: Date.now() - 3_600_000,
      day: Date.now() - 86_400_000,
      week: Date.now() - 604_800_000,
      all: Number.POSITIVE_INFINITY
    };
    const cutoff = cutoffs[range];
    this.historyStore.update((list) => list.filter((h) => h.visitedAt > cutoff));
    this.historyStore.flush();
  }

  topSites(limit = 8): Array<{ url: string; title: string; visits: number }> {
    const byHost = new Map<string, { url: string; title: string; visits: number }>();
    for (const entry of this.history()) {
      let host: string;
      try {
        host = new URL(entry.url).hostname;
      } catch {
        continue;
      }
      const current = byHost.get(host);
      if (current) current.visits += entry.visitCount;
      else byHost.set(host, { url: entry.url, title: entry.title, visits: entry.visitCount });
    }
    return [...byHost.values()].sort((a, b) => b.visits - a.visits).slice(0, limit);
  }

  /* ---------------------------------------------------------------- */
  /* Downloads                                                        */
  /* ---------------------------------------------------------------- */

  downloads(): DownloadItem[] {
    return this.downloadsStore.get();
  }

  upsertDownload(item: DownloadItem): void {
    this.downloadsStore.update((list) => {
      const index = list.findIndex((d) => d.id === item.id);
      if (index === -1) return [item, ...list].slice(0, 200);
      const next = [...list];
      next[index] = item;
      return next;
    });
  }

  removeDownload(id: string): void {
    this.downloadsStore.update((list) => list.filter((d) => d.id !== id));
    this.downloadsStore.flush();
  }

  flush(): void {
    this.bookmarksStore.flush();
    this.historyStore.flush();
    this.downloadsStore.flush();
  }
}
