import { DEFAULT_SEARCH_ENGINE, SEARCH_ENGINES } from './defaults.ts';

/**
 * Address-bar decisions, kept free of Electron and React so they can be tested
 * directly: is this text a place or a question, and which search engine answers
 * it when it is a question.
 */

/**
 * Schemes we hand to Chromium untouched. Anything else that merely *looks* like
 * a scheme is treated as text: `localhost:3000` and `example.com:8080` are
 * addresses, not protocols, and used to be navigated to verbatim.
 */
const KNOWN_SCHEMES = new Set([
  'http', 'https', 'file', 'ftp', 'ftps', 'about', 'data', 'blob', 'view-source',
  'mailto', 'tel', 'ws', 'wss', 'chrome', 'chrome-extension', 'kimmino', 'devtools'
]);

function schemeOf(value: string): string | null {
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(value);
  return match ? match[1].toLowerCase() : null;
}

/** Trim, drop wrapping quotes and stray characters pasted from chats. */
export function normalizeInput(input: string): string {
  return input
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/^[\s"'`(<[]+/, '')
    .replace(/[\s"'`)>]+$/, '')
    .trim();
}

/**
 * Does this look like an address rather than a question?
 *
 * Delegated to the URL parser so IDNs, IPv6 literals, ports, userinfo and
 * query strings all behave the way Chromium will treat them.
 */
function looksLikeAddress(value: string): boolean {
  if (!value || /\s/.test(value)) return false;
  if (value.includes('://')) return false;
  try {
    const url = new URL(`https://${value}`);
    const host = url.hostname;
    if (!host) return false;
    if (host === 'localhost' || host.endsWith('.localhost')) return true;
    // IPv4, IPv6 (bracketed) or anything with a dot and a real-looking TLD.
    if (/^\[?[0-9a-f:.]+\]?$/i.test(host)) return true;
    return /^[^\s.]+(\.[^\s.]+)+\.?$/.test(host);
  } catch {
    return false;
  }
}

/** Turn whatever the user typed into a URL, or a search query. */
export function toUrl(input: string, engineId: string, customEngineUrl: string): string {
  const value = normalizeInput(input);
  if (!value) return 'kimmino://newtab';
  if (value.startsWith('kimmino://')) return value;

  // A leading `?` is the explicit "search this, even though it looks like an
  // address" escape hatch, same as other address bars.
  if (value.startsWith('?')) return searchUrl(value.slice(1).trim(), engineId, customEngineUrl);

  if (value.startsWith('//')) return `https:${value}`;

  const scheme = schemeOf(value);
  if (scheme && KNOWN_SCHEMES.has(scheme)) return value;

  if (looksLikeAddress(value)) return `https://${value}`;

  return searchUrl(value, engineId, customEngineUrl);
}

/**
 * Build a search URL for the engine the user picked.
 *
 * A missing or half-configured engine falls back to the default engine — never
 * silently to one hardcoded provider, which is what made a changed setting look
 * like it was being ignored.
 */
export function searchUrl(query: string, engineId: string, customEngineUrl: string): string {
  const encoded = encodeURIComponent(query);
  if (engineId === 'custom' && customEngineUrl.trim()) {
    return customEngineUrl.includes('%s')
      ? customEngineUrl.replace('%s', encoded)
      : `${customEngineUrl}${customEngineUrl.includes('?') ? '&' : '?'}q=${encoded}`;
  }
  // `custom` with no template is a half-finished setting, not a search engine.
  const template = SEARCH_ENGINES[engineId]?.url || SEARCH_ENGINES[DEFAULT_SEARCH_ENGINE].url;
  return template.replace('%s', encoded);
}

/** Display name for an engine id, falling back to the default engine's name. */
export function engineName(engineId: string): string {
  const engine = SEARCH_ENGINES[engineId];
  if (engineId === 'custom' || !engine?.url) return SEARCH_ENGINES[DEFAULT_SEARCH_ENGINE].name;
  return engine.name;
}

/** True when `input` would be sent to a search engine rather than loaded. */
export function isSearchQuery(input: string): boolean {
  const value = normalizeInput(input);
  if (!value) return false;
  if (value.startsWith('?')) return true;
  if (value.startsWith('kimmino://') || value.startsWith('//')) return false;
  const scheme = schemeOf(value);
  if (scheme && KNOWN_SCHEMES.has(scheme)) return false;
  return !looksLikeAddress(value);
}
