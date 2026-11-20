import type { Preferences, ThemeDefinition } from './types';

export const APP_NAME = 'Kimmino';
export const APP_VERSION = '1.0.0';
export const APP_HOMEPAGE = 'https://kimmino.vercel.app';
export const APP_REPO = 'https://github.com/sdlksdsf/PROJECT-2';
export const PRIVACY_POLICY = 'https://kimmino.vercel.app/privacy';

/**
 * Where the assistant sends questions. The keys live on that server, never in
 * the installer, so a leaked build cannot leak a provider key.
 */
export const AI_PROXY_URL = 'https://kimmino.vercel.app/api/ai';

export const AI_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'Google', hint: 'Fast answers' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'Google', hint: 'Harder questions' },
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', provider: 'Groq', hint: 'Long conversations' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', provider: 'Groq', hint: 'Instant replies' }
] as const;

export const DEFAULT_AI_MODEL = AI_MODELS[0].id;

export const WALLPAPERS = [
  // 3840 × 2160
  { id: 'nightfall', name: 'Nightfall', kind: 'image', value: 'wallpapers/nightfall.jpg', tone: 'dark' },
  { id: 'parchment', name: 'Parchment', kind: 'image', value: 'wallpapers/parchment.jpg', tone: 'light' },
  { id: 'sakura-night', name: 'Sakura Night', kind: 'image', value: 'wallpapers/sakura-night.jpg', tone: 'dark' },
  { id: 'ember-grid', name: 'Ember Grid', kind: 'image', value: 'wallpapers/ember-grid.jpg', tone: 'dark' },
  // 1920 × 1072
  { id: 'fjord', name: 'Quiet Fjord', kind: 'image', value: 'wallpapers/fjord.jpg', tone: 'dark' },
  { id: 'loft', name: 'Cabin Loft', kind: 'image', value: 'wallpapers/loft.jpg', tone: 'dark' },
  { id: 'dunes', name: 'Cold Dunes', kind: 'image', value: 'wallpapers/dunes.jpg', tone: 'dark' },
  { id: 'peak', name: 'Blue Peak', kind: 'image', value: 'wallpapers/peak.jpg', tone: 'dark' },
  // Gradients: resolution-independent, so they stay sharp on a 4K panel.
  { id: 'aurora', name: 'Aurora Ridge', kind: 'gradient', value: 'linear-gradient(135deg,#0b1220 0%,#17324a 38%,#2f6d6a 68%,#f0b37e 100%)', tone: 'dark' },
  { id: 'noir', name: 'Noir Mesh', kind: 'gradient', value: 'radial-gradient(120% 120% at 10% 10%,#1b1b25 0%,#0a0a0f 55%,#05050a 100%)', tone: 'dark' },
  { id: 'ember', name: 'Ember Dusk', kind: 'gradient', value: 'linear-gradient(160deg,#2b1020 0%,#5c2033 40%,#c4602f 75%,#f4c07a 100%)', tone: 'dark' },
  { id: 'mint', name: 'Mint Fade', kind: 'gradient', value: 'linear-gradient(150deg,#06231f 0%,#0f4a3f 45%,#7fd0b0 100%)', tone: 'dark' },
  { id: 'violet', name: 'Violet Drift', kind: 'gradient', value: 'radial-gradient(120% 100% at 20% 0%,#2a1b4d 0%,#140f26 55%,#08060f 100%)', tone: 'dark' },
  { id: 'abyss', name: 'Abyss', kind: 'gradient', value: 'radial-gradient(140% 120% at 50% 110%,#103049 0%,#08131f 60%,#03070c 100%)', tone: 'dark' },
  { id: 'citrus', name: 'Citrus Morning', kind: 'gradient', value: 'linear-gradient(140deg,#fff5e6 0%,#ffe0b8 45%,#ffc59a 100%)', tone: 'light' },
  { id: 'linen', name: 'Linen', kind: 'gradient', value: 'linear-gradient(160deg,#fbfaf7 0%,#f0ece4 60%,#e2ddd2 100%)', tone: 'light' },
  { id: 'sky', name: 'Clear Sky', kind: 'gradient', value: 'linear-gradient(150deg,#eaf3ff 0%,#cfe3fb 55%,#b6d4f7 100%)', tone: 'light' },
  { id: 'sakura', name: 'Sakura', kind: 'gradient', value: 'linear-gradient(150deg,#fff2f7 0%,#ffd9e7 50%,#f5bede 100%)', tone: 'light' },
  { id: 'graphite', name: 'Graphite', kind: 'gradient', value: 'linear-gradient(180deg,#15161a 0%,#0d0e11 100%)', tone: 'dark' },
  { id: 'mono', name: 'Mono', kind: 'gradient', value: 'linear-gradient(180deg,#ffffff 0%,#f2f2f2 100%)', tone: 'light' }
] as const;

export type WallpaperTone = 'light' | 'dark';

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

/**
 * Engine used when a preference is missing or points at an engine that no
 * longer exists. Kept as one constant so the app, the address bar and the
 * start page cannot disagree about it.
 */
export const DEFAULT_SEARCH_ENGINE = 'duckduckgo';

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

function theme(
  id: string,
  name: string,
  isDark: boolean,
  colors: { bg: string; surface: string; chrome: string; text: string; muted: string; border: string; accent: string }
): ThemeDefinition {
  return { id, name, author: 'Kimmino', version: '1.1.0', isDark, builtin: true, colors };
}

/**
 * Built-in themes. Each one sets every surface token, so a theme never borrows
 * a colour from the theme next to it.
 */
export const BUILTIN_THEMES: ThemeDefinition[] = [
  theme('kimmino-light', 'Kimmino Light', false, {
    bg: '#f5f6f8', surface: '#ffffff', chrome: '#ffffff', text: '#101218', muted: '#5b6472', border: '#e3e6ec', accent: '#3b6ef6'
  }),
  theme('kimmino-dark', 'Kimmino Dark', true, {
    bg: '#0b0d12', surface: '#12151c', chrome: '#0e1016', text: '#eef1f7', muted: '#9aa4b6', border: '#232a36', accent: '#6d8cff'
  }),
  theme('paper', 'Paper', false, {
    bg: '#faf8f4', surface: '#ffffff', chrome: '#f3f0ea', text: '#1d1a16', muted: '#6b6357', border: '#e2ddd3', accent: '#b45309'
  }),
  theme('ivory', 'Ivory', false, {
    bg: '#f7f6f2', surface: '#fdfdfb', chrome: '#f1efe8', text: '#26241f', muted: '#736f66', border: '#e5e2d9', accent: '#4d7c0f'
  }),
  theme('sand', 'Sand', false, {
    bg: '#f6efe4', surface: '#fffaf1', chrome: '#efe5d6', text: '#2a2318', muted: '#7a6a55', border: '#e3d6c2', accent: '#c2410c'
  }),
  theme('fog', 'Fog', false, {
    bg: '#f2f4f7', surface: '#ffffff', chrome: '#eaeef3', text: '#1b2430', muted: '#5d6b7a', border: '#dbe1e8', accent: '#0e7490'
  }),
  theme('contrast-light', 'High Contrast Light', false, {
    bg: '#ffffff', surface: '#ffffff', chrome: '#f2f2f2', text: '#000000', muted: '#3f3f3f', border: '#000000', accent: '#0033cc'
  }),
  theme('solarized-light', 'Solarized Light', false, {
    bg: '#fdf6e3', surface: '#fffbf0', chrome: '#eee8d5', text: '#073642', muted: '#657b83', border: '#ded8c4', accent: '#268bd2'
  }),
  theme('sepia', 'Sepia', false, {
    bg: '#f4ecd8', surface: '#fbf5e6', chrome: '#ece2c9', text: '#3a2f1d', muted: '#7d6b4f', border: '#ddcfae', accent: '#8a5a12'
  }),
  theme('slate', 'Slate', true, {
    bg: '#151a21', surface: '#1c232c', chrome: '#171d25', text: '#e6ecf3', muted: '#93a1b1', border: '#2a333e', accent: '#7dd3fc'
  }),
  theme('midnight', 'Midnight', true, {
    bg: '#0b0d12', surface: '#12151c', chrome: '#0e1016', text: '#eef1f7', muted: '#9aa4b6', border: '#232a36', accent: '#818cf8'
  }),
  theme('carbon', 'Carbon', true, {
    bg: '#121212', surface: '#1a1a1a', chrome: '#151515', text: '#ededed', muted: '#a0a0a0', border: '#2a2a2a', accent: '#f59e0b'
  }),
  theme('graphite', 'Graphite', true, {
    bg: '#17181c', surface: '#1f2126', chrome: '#1a1c20', text: '#e9eaee', muted: '#9b9fa8', border: '#2c2f36', accent: '#94a3b8'
  }),
  theme('obsidian', 'Obsidian', true, {
    bg: '#0a0a0c', surface: '#111114', chrome: '#0d0d10', text: '#f2f2f5', muted: '#9d9da6', border: '#212127', accent: '#a78bfa'
  }),
  theme('oled-black', 'OLED Black', true, {
    bg: '#000000', surface: '#070707', chrome: '#000000', text: '#ffffff', muted: '#9c9c9c', border: '#1a1a1a', accent: '#22d3ee'
  }),
  theme('amoled-blue', 'AMOLED Blue', true, {
    bg: '#000010', surface: '#05051f', chrome: '#00000a', text: '#e8e9ff', muted: '#8f93c4', border: '#14143a', accent: '#4f7cff'
  }),
  theme('ink', 'Ink', true, {
    bg: '#08090c', surface: '#0e1014', chrome: '#0a0b0f', text: '#dfe3ea', muted: '#89909c', border: '#1b1e25', accent: '#60a5fa'
  }),
  theme('night-owl', 'Night Owl', true, {
    bg: '#011627', surface: '#062b41', chrome: '#011526', text: '#d6deeb', muted: '#7f93a8', border: '#0d3a53', accent: '#82aaff'
  }),
  theme('deep-sea', 'Deep Sea', true, {
    bg: '#06232f', surface: '#0a2f3f', chrome: '#051f29', text: '#dff6f9', muted: '#83aab5', border: '#0d3a49', accent: '#2dd4bf'
  }),
  theme('moss', 'Moss', true, {
    bg: '#12201a', surface: '#182a22', chrome: '#0f1b16', text: '#e3f0e6', muted: '#8fae97', border: '#20382c', accent: '#4ade80'
  }),
  theme('forest', 'Forest', true, {
    bg: '#0c1b14', surface: '#12251b', chrome: '#0a1710', text: '#e0f0e4', muted: '#86a892', border: '#173024', accent: '#65a30d'
  }),
  theme('espresso', 'Espresso', true, {
    bg: '#1d1512', surface: '#251b17', chrome: '#191210', text: '#f0e6e0', muted: '#b09a8d', border: '#33241e', accent: '#ea8c55'
  }),
  theme('wine', 'Wine', true, {
    bg: '#1e0f16', surface: '#27131c', chrome: '#190c12', text: '#f6e5ec', muted: '#bb8fa0', border: '#361a25', accent: '#fb7185'
  }),
  theme('rosewood', 'Rosewood', true, {
    bg: '#1b1013', surface: '#241518', chrome: '#170d10', text: '#f5e6e7', muted: '#b08e91', border: '#31191d', accent: '#f472b6'
  }),
  theme('ember', 'Ember', true, {
    bg: '#1a0f0c', surface: '#231410', chrome: '#150c0a', text: '#f7e8e2', muted: '#b08e80', border: '#301a14', accent: '#f97316'
  }),
  theme('cyber', 'Cyber', true, {
    bg: '#070d14', surface: '#0d1621', chrome: '#060b11', text: '#dff1ff', muted: '#7f9ab0', border: '#12212f', accent: '#22d3ee'
  }),
  theme('neon-grid', 'Neon Grid', true, {
    bg: '#0a0713', surface: '#120c1f', chrome: '#08050f', text: '#f1e7ff', muted: '#9c8dbb', border: '#1d1330', accent: '#e879f9'
  }),
  theme('terminal', 'Terminal', true, {
    bg: '#04120a', surface: '#061a0f', chrome: '#030d07', text: '#c8ffd8', muted: '#6fa981', border: '#0d2a18', accent: '#22c55e'
  }),
  // Cats
  theme('cat-cream', 'Cat Cream', false, {
    bg: '#fdf6ec', surface: '#fffdf8', chrome: '#f7ecdd', text: '#2b2016', muted: '#7d6a55', border: '#ebdcc6', accent: '#d97706'
  }),
  theme('cat-ginger', 'Cat Ginger', false, {
    bg: '#fbe9d7', surface: '#fff5ea', chrome: '#f4dcc4', text: '#33200f', muted: '#8a6a4c', border: '#e7c9a9', accent: '#c2410c'
  }),
  theme('cat-tuxedo', 'Tuxedo Cat', true, {
    bg: '#14151a', surface: '#1c1e25', chrome: '#111217', text: '#f4f4f6', muted: '#a5a7b2', border: '#282b33', accent: '#fbbf24'
  }),
  theme('cat-calico', 'Calico', false, {
    bg: '#fdf3ea', surface: '#fffaf4', chrome: '#f6e6d7', text: '#2c1f16', muted: '#82695a', border: '#e9d3bf', accent: '#e05d0e'
  }),
  // Anime
  theme('anime-sakura', 'Sakura Day', false, {
    bg: '#fdf2f8', surface: '#fff8fc', chrome: '#fae4f1', text: '#2d1626', muted: '#86607a', border: '#f0d3e5', accent: '#db2777'
  }),
  theme('anime-dusk', 'Anime Dusk', true, {
    bg: '#150d1f', surface: '#1d122b', chrome: '#110a1a', text: '#f0e6ff', muted: '#a493bd', border: '#281a3a', accent: '#a855f7'
  }),
  theme('anime-mint', 'Anime Mint', false, {
    bg: '#eefaf6', surface: '#f7fffd', chrome: '#ddf5ee', text: '#10261f', muted: '#4f7d70', border: '#c9ebe1', accent: '#0d9488'
  }),
  theme('anime-neon', 'Anime Neon', true, {
    bg: '#0d0716', surface: '#150c22', chrome: '#0a0510', text: '#ffe9fb', muted: '#b48fc0', border: '#22102f', accent: '#ff2e97'
  })
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
    showSuggestions: true,
    searchPosition: null,
    tileSize: 'medium',
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
    strictMode: false
  },

  performance: {
    memorySaver: true,
    memorySaverMinutes: 20,
    backgroundThrottle: true,
    gamingMode: true,
    hardwareAcceleration: true
  },

  search: {
    engine: DEFAULT_SEARCH_ENGINE,
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
    aiPageContext: false,
    earlyBird: false
  },

  system: {
    language: 'en-US',
    launchOnStartup: false,
    defaultBrowserPrompt: true,
    downloadDir: '',
    askWhereToSave: false,
    spellcheck: true
  },

  updates: {
    automatic: true,
    dismissedVersion: null
  },

  developer: {
    devToolsEnabled: true,
    customUserAgent: '',
    showPerfOverlay: false
  },

  onboarded: false
};
