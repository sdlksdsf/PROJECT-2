import { SEARCH_ENGINES } from '@shared/defaults';

const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const HOST_LIKE = /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/.*)?$/i;

/** Turn whatever the user typed into a URL, or a search query. */
export function toUrl(input: string, engineId: string, customEngineUrl: string): string {
  const value = input.trim();
  if (!value) return 'kimmino://newtab';
  if (value.startsWith('kimmino://')) return value;
  if (SCHEME_RE.test(value)) return value;

  const looksLikeHost =
    HOST_LIKE.test(value) ||
    value.startsWith('localhost') ||
    /^\d{1,3}(\.\d{1,3}){3}(:\d+)?/.test(value);
  if (looksLikeHost && !value.includes(' ')) {
    return `https://${value}`;
  }
  return searchUrl(value, engineId, customEngineUrl);
}

export function searchUrl(query: string, engineId: string, customEngineUrl: string): string {
  const engine = SEARCH_ENGINES[engineId] ?? SEARCH_ENGINES.duckduckgo;
  const template = engineId === 'custom' && customEngineUrl ? customEngineUrl : engine.url;
  return (template || 'https://duckduckgo.com/?q=%s').replace('%s', encodeURIComponent(query));
}

export function prettyUrl(rawUrl: string): { host: string; path: string; secure: boolean } {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, '');
    const path = `${url.pathname}${url.search}`.replace(/\/$/, '') || '/';
    return { host, path: path === '/' ? '' : path, secure: url.protocol === 'https:' };
  } catch {
    return { host: rawUrl, path: '', secure: false };
  }
}

export function hostOf(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return '';
  }
}

export function letterOf(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return '•';
  return trimmed[0].toUpperCase();
}

/** Deterministic, pleasant gradient from any string (used for favicon fallbacks). */
export function gradientFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  const a = hash;
  const b = (hash + 48) % 360;
  return `linear-gradient(135deg, hsl(${a} 68% 55%), hsl(${b} 72% 45%))`;
}

export function faviconFor(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    // Ask the site itself — never a third-party favicon service.
    return `${url.origin}/favicon.ico`;
  } catch {
    return null;
  }
}

export function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return 'Still up?';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  if (hour < 22) return 'Good evening';
  return 'Good night';
}

export function domainLabel(rawUrl: string): string {
  const host = hostOf(rawUrl);
  return host.replace(/^www\./, '') || rawUrl;
}
