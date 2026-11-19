import type { Preferences, ThemeDefinition } from './types';

export const APP_NAME = 'Kimmino';
export const APP_VERSION = '1.0.0';
export const APP_HOMEPAGE = 'https://kimmino.vercel.app';
export const APP_REPO = 'https://github.com/sdlksdsf/PROJECT-2';
export const PRIVACY_POLICY = 'https://kimmino.vercel.app/privacy';

export const WALLPAPERS = [
  { id: 'aurora', name: 'Aurora Ridge', kind: 'gradient', value: 'linear-gradient(135deg,#0b1220 0%,#17324a 38%,#2f6d6a 68%,#f0b37e 100%)' },
  { id: 'fjord', name: 'Quiet Fjord', kind: 'image', value: 'wallpapers/fjord.jpg' },
  { id: 'loft', name: 'Cabin Loft', kind: 'image', value: 'wallpapers/loft.jpg' },
  { id: 'dunes', name: 'Cold Dunes', kind: 'image', value: 'wallpapers/dunes.jpg' },
  { id: 'peak', name: 'Blue Peak', kind: 'image', value: 'wallpapers/peak.jpg' },
  { id: 'noir', name: 'Noir Mesh', kind: 'gradient', value: 'radial-gradient(120% 120% at 10% 10%,#1b1b25 0%,#0a0a0f 55%,#05050a 100%)' },
  { id: 'ember', name: 'Ember Dusk', kind: 'gradient', value: 'linear-gradient(160deg,#2b1020 0%,#5c2033 40%,#c4602f 75%,#f4c07a 100%)' },
  { id: 'mint', name: 'Mint Fade', kind: 'gradient', value: 'linear-gradient(150deg,#06231f 0%,#0f4a3f 45%,#7fd0b0 100%)' }
] as const;

export const SEARCH_ENGINES: Record<string, { name: string; url: string; suggest?: string }> = {
  kimmino: { name: 'Kimmino Search', url: 'https://search.brave.com/search?q=%s', suggest: 'https://search.brave.com/api/suggest?q=%s' },
  duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s', suggest: 'https://duckduckgo.com/ac/?q=%s&type=list' },
  google: { name: 'Google', url: 'https://www.google.com/search?q=%s', suggest: 'https://suggestqueries.google.com/complete/search?client=firefox&q=%s' },
  bing: { name: 'Bing', url: 'https://www.bing.com/search?q=%s' },
  brave: { name: 'Brave Search', url: 'https://search.brave.com/search?q=%s' },
  startpage: { name: 'Startpage', url: 'https://www.startpage.com/sp/search?query=%s' },
  ecosia: { name: 'Ecosia', url: 'https://www.ecosia.org/search?q=%s' },
  kagi: { name: 'Kagi', url: 'https://kagi.com/search?q=%s' },
  wikipedia: { name: 'Wikipedia', url: 'https://en.wikipedia.org/w/index.php?search=%s' },
  custom: { name: 'Custom', url: '' }
};

export const DEFAULT_DIALS = [
  { id: 'd1', title: 'YouTube', url: 'https://www.youtube.com', icon: null },
  { id: 'd2', title: 'GitHub', url: 'https://github.com', icon: null },
  { id: 'd3', title: 'Reddit', url: 'https://www.reddit.com', icon: null },
  { id: 'd4', title: 'Gmail', url: 'https://mail.google.com', icon: null },
  { id: 'd5', title: 'Notion', url: 'https://www.notion.so', icon: null },
  { id: 'd6', title: 'Figma', url: 'https://www.figma.com', icon: null },
  { id: 'd7', title: 'Spotify', url: 'https://open.spotify.com', icon: null },
  { id: 'd8', title: 'Wikipedia', url: 'https://www.wikipedia.org', icon: null }
];

export const BUILTIN_THEMES: ThemeDefinition[] = [
  {
    id: 'kimmino-light',
    name: 'Kimmino Light',
    author: 'Kimmino',
    version: '1.0.0',
    isDark: false,
    builtin: true,
    colors: {
      bg: '#f5f6f8',
      surface: '#ffffff',
      chrome: '#ffffff',
      text: '#101218',
      muted: '#5b6472',
      border: '#e3e6ec',
      accent: '#3b6ef6'
    }
  },
  {
    id: 'kimmino-dark',
    name: 'Kimmino Dark',
    author: 'Kimmino',
    version: '1.0.0',
    isDark: true,
    builtin: true,
    colors: {
      bg: '#0b0d12',
      surface: '#12151c',
      chrome: '#0e1016',
      text: '#eef1f7',
      muted: '#9aa4b6',
      border: '#232a36',
      accent: '#6d8cff'
    }
  }
];

export const DEFAULT_PREFERENCES: Preferences = {
  themeMode: 'dark',
  accent: '#6d8cff',
  uiScale: 1,
  pageScale: 1,
  fontFamily: 'Inter Variable',
  compactTabs: false,
  verticalTabs: false,
  showBookmarksBar: false,
  animations: true,
  acrylicBlur: true,
  customThemeId: null,

  startPage: {
    wallpaper: 'fjord',
    wallpaperBlur: 0,
    wallpaperDim: 22,
    liveWallpaper: true,
    showClock: true,
    showWeather: false,
    showSuggestions: true,
    showNews: false,
    layout: 'center',
    searchPosition: null,
    dials: DEFAULT_DIALS
  },

  privacy: {
    adBlocking: true,
    blockTrackers: true,
    blockThirdPartyCookies: true,
    autoDeclineConsent: true,
    fingerprintProtection: true,
    stripTrackingParams: true,
    spoofReferrer: true,
    blockWebRTC: true,
    blockLocation: true,
    blockNotifications: false,
    blockCameraMic: false,
    httpsOnly: true,
    blockCryptoMiners: true,
    doNotTrack: true,
    safeBrowsing: true,
    blockPopups: true,
    telemetry: false,
    strictMode: false
  },

  performance: {
    memorySaver: true,
    memorySaverMinutes: 20,
    backgroundThrottle: true,
    gamingMode: true,
    hardwareAcceleration: true,
    preloadPages: false
  },

  search: {
    engine: 'duckduckgo',
    customEngineUrl: '',
    suggestions: true,
    autocompleteHistory: true,
    openInNewTab: false,
    keyboardSounds: false,
    keyboardSoundVolume: 0.35
  },

  productivity: {
    splitViewEnabled: true,
    focusMode: { enabled: false, minutes: 25, maxTabs: 5, blocklist: [] },
    screenshotFormat: 'png',
    videoEnhancer: true,
    forceDarkMode: false,
    aiEnabled: false,
    aiProvider: 'off',
    aiEndpoint: '',
    aiModel: '',
    earlyBird: false
  },

  system: {
    language: 'en-US',
    launchOnStartup: false,
    defaultBrowserPrompt: true,
    downloadDir: '',
    askWhereToSave: false,
    spellcheck: true,
    syncEnabled: false
  },

  developer: {
    devToolsEnabled: true,
    enableRemoteDebugging: false,
    customUserAgent: '',
    showPerfOverlay: false
  },

  onboarded: false
};
