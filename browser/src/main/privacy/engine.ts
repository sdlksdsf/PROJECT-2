/**
 * Kimmino network filter engine.
 *
 * A compact, dependency-free implementation of the parts of the Adblock Plus
 * filter syntax that matter for ad, tracker, malware and consent blocking:
 *
 *   ||example.com^            domain (suffix) matching
 *   @@||example.com^          site-wide exceptions
 *   /ads/banner*.gif          pattern matching (wildcards + `^` separator)
 *   example.com##.ad-slot     cosmetic (element hiding) rules
 *   $removeparam=utm_source   tracking parameter stripping
 *
 * The engine is deliberately allocation-light: domain rules live in Sets and
 * are resolved by walking the hostname's labels, pattern rules carry a literal
 * `needle` so the hot path is a native `String#includes` before any RegExp runs.
 */

export type BlockKind = 'ads' | 'trackers' | 'malware' | 'popups' | 'cookies';

export interface RuleGroup {
  domains: string[];
  patterns: string[];
}

export interface FilterBundleJson {
  version: number;
  generatedAt?: string;
  sources?: Array<{ id: string; group: string; size: number }>;
  ads: RuleGroup;
  trackers: RuleGroup;
  malware: RuleGroup;
  popups: RuleGroup;
  cookies: RuleGroup & { selectors?: string[] };
  allow: RuleGroup;
  removeparam: { params: string[]; byDomain: Record<string, string[]> };
  cosmetic: { generic: string[]; byDomain: Record<string, string[]> };
}

interface CompiledPattern {
  re: RegExp;
  needle: string;
}

interface Group {
  domains: Set<string>;
  patterns: CompiledPattern[];
}

export interface MatchResult {
  block: boolean;
  kind: BlockKind | null;
  /** True when an allowlist exception decided the outcome. */
  allowed?: boolean;
}

const TYPE_KEYWORD: Record<string, string> = {
  script: 'script',
  image: 'image',
  stylesheet: 'stylesheet',
  xmlhttprequest: 'xmlhttprequest',
  subFrame: 'subdocument',
  mainFrame: 'document',
  media: 'media',
  font: 'font',
  websocket: 'websocket',
  ping: 'ping',
  other: 'other'
};

function compilePattern(source: string): CompiledPattern | null {
  // Longest literal run doubles as the prefilter needle.
  const literals = source.match(/[a-z0-9]{4,}/gi) ?? [];
  const needle = literals.sort((a, b) => b.length - a.length)[0]?.toLowerCase();
  if (!needle) return null;
  let body = '';
  for (const ch of source) {
    if (ch === '*') body += '[^/]*';
    else if (ch === '^') body += '(?:[^\\w\\-.%]|$)';
    else body += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  try {
    return { re: new RegExp(body, 'i'), needle };
  } catch {
    return null;
  }
}

function compileGroup(group: RuleGroup | undefined): Group {
  const domains = new Set<string>();
  const patterns: CompiledPattern[] = [];
  if (group) {
    for (const d of group.domains ?? []) domains.add(d.toLowerCase());
    for (const p of group.patterns ?? []) {
      const compiled = compilePattern(p);
      if (compiled) patterns.push(compiled);
    }
  }
  return { domains, patterns };
}

/** All hostname suffixes of a host, longest first: a.b.c → a.b.c, b.c, c */
export function hostSuffixes(host: string): string[] {
  const out: string[] = [];
  let index = 0;
  const lower = host.toLowerCase();
  while (index < lower.length) {
    out.push(lower.slice(index));
    const dot = lower.indexOf('.', index);
    if (dot === -1) break;
    index = dot + 1;
  }
  return out;
}

export class FilterEngine {
  readonly ads: Group;
  readonly trackers: Group;
  readonly malware: Group;
  readonly popups: Group;
  readonly cookieRules: Group;
  readonly allow: Group;
  readonly cosmeticByDomain: Map<string, string[]>;
  readonly cosmeticGeneric: string;
  readonly removeParams: Set<string>;
  readonly removeParamsByDomain: Map<string, string[]>;
  readonly meta: { generatedAt: string | null; rules: number };
  private cosmeticCache = new Map<string, string>();
  private allowCache = new Map<string, boolean>();

  constructor(json: FilterBundleJson) {
    this.ads = compileGroup(json.ads);
    this.trackers = compileGroup(json.trackers);
    this.malware = compileGroup(json.malware);
    this.popups = compileGroup(json.popups);
    this.cookieRules = compileGroup(json.cookies);
    this.allow = compileGroup(json.allow);
    this.cosmeticByDomain = new Map(Object.entries(json.cosmetic?.byDomain ?? {}));
    this.cosmeticGeneric = (json.cosmetic?.generic ?? []).join(',\n');
    this.removeParams = new Set((json.removeparam?.params ?? []).map((p) => p.toLowerCase()));
    this.removeParamsByDomain = new Map(Object.entries(json.removeparam?.byDomain ?? {}));
    this.meta = {
      generatedAt: json.generatedAt ?? null,
      rules:
        this.ads.domains.size +
        this.trackers.domains.size +
        this.malware.domains.size +
        this.allow.domains.size +
        this.cosmeticByDomain.size
    };
  }

  /** Is the page itself exempted by an allowlist rule (`@@`)? */
  isAllowedSite(host: string, pageUrl = ''): boolean {
    const cached = this.allowCache.get(host);
    if (cached !== undefined) return cached;
    let allowed = false;
    for (const suffix of hostSuffixes(host)) {
      if (this.allow.domains.has(suffix)) {
        allowed = true;
        break;
      }
    }
    if (!allowed) {
      const probe = `${host}${pageUrl}`;
      allowed = this.allow.patterns.some((p) => probe.toLowerCase().includes(p.needle) && p.re.test(probe));
    }
    if (this.allowCache.size > 500) this.allowCache.clear();
    this.allowCache.set(host, allowed);
    return allowed;
  }

  private domainHit(group: Group, host: string): boolean {
    for (const suffix of hostSuffixes(host)) {
      if (group.domains.has(suffix)) return true;
    }
    return false;
  }

  private patternHit(group: Group, probe: string): boolean {
    const lower = probe.toLowerCase();
    for (const p of group.patterns) {
      if (lower.includes(p.needle) && p.re.test(probe)) return true;
    }
    return false;
  }

  /**
   * Decide whether a sub-resource or navigation should be blocked.
   * `firstParty` is the page's registrable host.
   */
  match(rawUrl: string, options: { firstParty?: string; resourceType?: string } = {}): MatchResult {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return { block: false, kind: null };
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return { block: false, kind: null };

    const host = url.hostname.toLowerCase();
    if (!host) return { block: false, kind: null };

    if (this.isAllowedSite(host)) return { block: false, kind: null, allowed: true };
    if (options.firstParty && this.isAllowedSite(options.firstParty.toLowerCase())) {
      return { block: false, kind: null, allowed: true };
    }

    const probe = `${host}${url.pathname}${url.search}`;

    // Malware / phishing hosts always win.
    if (this.domainHit(this.malware, host) || this.patternHit(this.malware, probe)) {
      return { block: true, kind: 'malware' };
    }

    if (this.domainHit(this.ads, host)) return { block: true, kind: 'ads' };
    if (this.domainHit(this.trackers, host)) return { block: true, kind: 'trackers' };
    if (this.domainHit(this.cookieRules, host)) return { block: true, kind: 'cookies' };

    const thirdParty = options.firstParty ? !this.sameSite(host, options.firstParty) : true;
    if (thirdParty) {
      if (this.patternHit(this.ads, probe)) return { block: true, kind: 'ads' };
      if (this.patternHit(this.trackers, probe)) return { block: true, kind: 'trackers' };
      if (this.patternHit(this.popups, probe)) return { block: true, kind: 'popups' };
      if (this.patternHit(this.cookieRules, probe)) return { block: true, kind: 'cookies' };
    }

    return { block: false, kind: null };
  }

  /** True if both hosts share the same registrable domain (naive eTLD+1). */
  sameSite(a: string, b: string): boolean {
    return registrableDomain(a) === registrableDomain(b);
  }

  /** CSS to hide ad containers on this host. */
  cosmeticCss(host: string): string {
    const cached = this.cosmeticCache.get(host);
    if (cached !== undefined) return cached;
    const selectors: string[] = [];
    for (const suffix of hostSuffixes(host)) {
      const found = this.cosmeticByDomain.get(suffix);
      if (found) selectors.push(...found);
    }
    const scoped = selectors.length ? `${selectors.join(',\n')}{display:none!important}` : '';
    const generic = this.cosmeticGeneric ? `${this.cosmeticGeneric}{display:none!important}` : '';
    const css = `${scoped}\n${generic}`.trim();
    if (this.cosmeticCache.size > 300) this.cosmeticCache.clear();
    this.cosmeticCache.set(host, css);
    return css;
  }

  /** Remove tracking parameters (utm_*, fbclid, gclid, …) from a URL. */
  stripTrackingParams(rawUrl: string): string {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return rawUrl;
    }
    const globalParams = this.removeParams;
    const domainParams = new Set<string>();
    for (const suffix of hostSuffixes(url.hostname)) {
      const found = this.removeParamsByDomain.get(suffix);
      if (found) found.forEach((p) => domainParams.add(p.toLowerCase()));
    }
    if (!globalParams.size && !domainParams.size) return rawUrl;

    let changed = false;
    for (const key of [...url.searchParams.keys()]) {
      const lower = key.toLowerCase();
      const shouldStrip = globalParams.has(lower) || domainParams.has(lower) || /^(utm_|ga_|mc_|_hs|vero_|igshid|fbclid|gclid|dclid|msclkid|twclid|ttclid|yclid|oicd|wickedid|oly_enc_id)/.test(lower);
      if (shouldStrip) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    return changed ? url.toString() : rawUrl;
  }

  /** Hosts in the malware list — used by the offline safe-browsing check. */
  isMalwareHost(host: string): boolean {
    return this.domainHit(this.malware, host.toLowerCase());
  }

  get counts() {
    return {
      ads: this.ads.domains.size + this.ads.patterns.length,
      trackers: this.trackers.domains.size + this.trackers.patterns.length,
      malware: this.malware.domains.size,
      cosmetic: this.cosmeticByDomain.size,
      allow: this.allow.domains.size,
      removeParams: this.removeParams.size
    };
  }
}

const MULTI_PART_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'co.jp', 'co.kr', 'com.au', 'net.au', 'org.au',
  'com.br', 'com.tr', 'com.pk', 'com.cn', 'com.mx', 'co.in', 'co.nz', 'co.za', 'com.sa',
  'com.ar', 'com.sg', 'com.my', 'co.id', 'com.ph', 'com.vn', 'com.ua', 'com.pl', 'co.il'
]);

/** Minimal eTLD+1 without shipping the full public suffix list. */
export function registrableDomain(host: string): string {
  const parts = host.toLowerCase().split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  const lastTwo = parts.slice(-2).join('.');
  if (MULTI_PART_SUFFIXES.has(lastTwo)) return parts.slice(-3).join('.');
  return lastTwo;
}

export function resourceKeyword(type: string | undefined): string {
  return (type && TYPE_KEYWORD[type]) || 'other';
}
