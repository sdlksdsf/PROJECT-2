import type { Bookmark, DownloadItem, ExtensionInfo, HistoryEntry, ThemeDefinition } from '@shared/types';

export const SEED_BOOKMARKS: Bookmark[] = [
  { id: 'b1', title: 'GitHub', url: 'https://github.com', folder: 'Bookmarks', createdAt: Date.now() - 86_400_000 },
  { id: 'b2', title: 'Kimmino release notes', url: 'https://kimmino.vercel.app/blog', folder: 'Bookmarks', createdAt: Date.now() - 3_600_000 },
  { id: 'b3', title: 'MDN Web Docs', url: 'https://developer.mozilla.org', folder: 'Bookmarks', createdAt: Date.now() - 7_200_000 },
  { id: 'b4', title: 'UBlock Origin filter syntax', url: 'https://github.com/gorhill/uBlock/wiki', folder: 'Bookmarks', createdAt: Date.now() - 12_000_000 },
  { id: 'b5', title: 'Hacker News', url: 'https://news.ycombinator.com', folder: 'Bookmarks', createdAt: Date.now() - 40_000_000 },
  { id: 'b6', title: 'Are.na', url: 'https://www.are.na', folder: 'Bookmarks', createdAt: Date.now() - 90_000_000 }
];

export const SEED_HISTORY: HistoryEntry[] = [
  { id: 'h1', title: 'Kimmino — a browser that minds its own business', url: 'https://kimmino.vercel.app', visitedAt: Date.now() - 600_000, visitCount: 14 },
  { id: 'h2', title: 'Electron · WebContentsView API', url: 'https://www.electronjs.org/docs/latest/api/web-contents-view', visitedAt: Date.now() - 2_400_000, visitCount: 5 },
  { id: 'h3', title: 'EasyList — The most popular ad blocking list', url: 'https://easylist.to', visitedAt: Date.now() - 5_400_000, visitCount: 3 },
  { id: 'h4', title: 'MDN — Canvas fingerprinting', url: 'https://developer.mozilla.org/en-US/docs/Glossary/Fingerprinting', visitedAt: Date.now() - 9_000_000, visitCount: 2 },
  { id: 'h5', title: 'Hacker News — Show HN: Kimmino', url: 'https://news.ycombinator.com', visitedAt: Date.now() - 22_000_000, visitCount: 8 },
  { id: 'h6', title: 'The Case Against Third-Party Cookies', url: 'https://web.dev/articles/third-party-cookies', visitedAt: Date.now() - 46_000_000, visitCount: 1 },
  { id: 'h7', title: 'uBlock Origin — Filter syntax', url: 'https://github.com/gorhill/uBlock/wiki/Static-filter-syntax', visitedAt: Date.now() - 90_000_000, visitCount: 4 }
];

export const SEED_DOWNLOADS: DownloadItem[] = [
  {
    id: 'dl1',
    filename: 'kimmino-wallpaper-pack.zip',
    url: 'https://kimmino.vercel.app/wallpapers.zip',
    path: '/Users/you/Downloads/kimmino-wallpaper-pack.zip',
    state: 'completed',
    receivedBytes: 24_900_000,
    totalBytes: 24_900_000,
    startedAt: Date.now() - 3_600_000,
    paused: false
  },
  {
    id: 'dl2',
    filename: 'annual-report-2026.pdf',
    url: 'https://example.com/report.pdf',
    path: '/Users/you/Downloads/annual-report-2026.pdf',
    state: 'progressing',
    receivedBytes: 3_400_000,
    totalBytes: 8_100_000,
    startedAt: Date.now() - 40_000,
    paused: false
  }
];

export const SEED_EXTENSIONS: ExtensionInfo[] = [
  {
    id: 'ext1',
    name: 'Bitwarden',
    version: '2026.4.1',
    description: 'Open-source password manager with end-to-end encryption.',
    path: '',
    enabled: true,
    icon: null,
    permissions: ['storage', 'activeTab'],
    manifestVersion: 3
  },
  {
    id: 'ext2',
    name: 'Dark Reader',
    version: '4.9.112',
    description: 'Forces every website to render in a comfortable dark theme.',
    path: '',
    enabled: true,
    icon: null,
    permissions: ['storage', 'scripting'],
    manifestVersion: 3
  },
  {
    id: 'ext3',
    name: 'SponsorBlock',
    version: '5.8.3',
    description: 'Skips sponsor segments in videos using a community database.',
    path: '',
    enabled: false,
    icon: null,
    permissions: ['storage'],
    manifestVersion: 3
  }
];

export const SEED_CUSTOM_THEME: ThemeDefinition = {
  id: 'custom_midnight_mint',
  name: 'Midnight Mint',
  author: 'community',
  version: '1.0.0',
  isDark: true,
  builtin: false,
  colors: {
    bg: '#08110f',
    surface: '#0d1a17',
    chrome: '#091412',
    text: '#e8fff8',
    muted: '#84a89c',
    border: '#173029',
    accent: '#3ddc97'
  }
};

export const MOCK_PAGE_TEXT =
  'Kimmino is a desktop web browser built for people who are tired of being the product. It blocks ads and trackers by default using the same community filter lists that power uBlock Origin, refuses third-party cookies, and randomises the fingerprint signals that advertising networks use to recognise you. The browser is built on Chromium so that websites keep working, but almost every Chromium service that phones home has been switched off. There is no telemetry, no crash reporting and no account required. Settings, history and bookmarks live in plain JSON files you can read, copy or delete. Kimmino is open source under the Mozilla Public License and the whole interface is written in React so the community can shape it.';
