/**
 * On-device site reputation. Nothing here leaves the machine: the score is
 * derived from the local filter lists, URL shape heuristics and the site's
 * transport security — no network call, no telemetry.
 */
import type { FilterEngine } from './engine';

export interface SiteRating {
  score: number; // 0 (hostile) … 100 (trusted)
  level: 'safe' | 'caution' | 'risky';
  reasons: string[];
  host: string;
}

const TRUSTED_HOSTS = new Set([
  'wikipedia.org', 'github.com', 'mozilla.org', 'python.org', 'nodejs.org', 'developer.mozilla.org',
  'google.com', 'youtube.com', 'w3.org', 'ietf.org', 'archive.org', 'stackoverflow.com'
]);

const PHISH_PATTERNS: Array<{ re: RegExp; reason: string; weight: number }> = [
  { re: /(verify|secure|update|confirm|unlock|recover|signin)[-_]?(account|wallet|identity|bank)/i, reason: 'Credential-phishing wording', weight: 22 },
  { re: /[a-z0-9-]{2,}\.(?:com|net|org|io|co)\.(?:[a-z]{2,})\.[a-z]{2,}/i, reason: 'Deeply nested domain', weight: 12 },
  { re: /(paypal|apple|microsoft|netflix|amazon|binance|metamask)[.-](?!com$)/i, reason: 'Brand name on an unrelated domain', weight: 26 },
  { re: /(free|win|claim|prize|gift)[-_]?(robux|vbucks|giftcard|crypto|btc|airdrop)/i, reason: 'Prize / giveaway bait', weight: 20 },
  { re: /\d{1,3}(?:\.\d{1,3}){3}/i, reason: 'Raw IP address instead of a domain', weight: 18 }
];

const SHADY_TLDS = new Set(['zip', 'mov', 'top', 'xyz', 'click', 'gq', 'tk', 'cf', 'work', 'rest', 'cfd', 'buzz', 'sbs']);

export function rateSite(rawUrl: string, engine: FilterEngine | null): SiteRating {
  const reasons: string[] = [];
  let score = 100;
  let host = '';
  let url: URL | null = null;
  try {
    url = new URL(rawUrl);
    host = url.hostname.toLowerCase();
  } catch {
    return { score: 50, level: 'caution', reasons: ['Unparseable address'], host: '' };
  }

  if (url.protocol === 'https:') {
    reasons.push('Encrypted connection (HTTPS)');
  } else if (url.protocol === 'http:') {
    score -= 25;
    reasons.push('Not encrypted — traffic can be read or altered');
  }

  if (engine?.isMalwareHost(host)) {
    score -= 70;
    reasons.push('Listed in the malware / phishing blocklist');
  }

  if (TRUSTED_HOSTS.has(host.replace(/^www\./, '')) || [...TRUSTED_HOSTS].some((t) => host.endsWith(`.${t}`))) {
    score += 10;
    reasons.push('Well-known publisher');
  }

  const tld = host.split('.').pop() ?? '';
  if (SHADY_TLDS.has(tld)) {
    score -= 15;
    reasons.push(`Frequently abused TLD (`.concat(tld, ')'));
  }

  if (host.includes('xn--')) {
    score -= 20;
    reasons.push('Punycode domain — could be an impostor script');
  }

  const probe = `${host}${url.pathname}${url.search}`;
  for (const rule of PHISH_PATTERNS) {
    if (rule.re.test(probe)) {
      score -= rule.weight;
      reasons.push(rule.reason);
    }
  }

  const labels = host.split('.').length;
  if (labels >= 5) {
    score -= 8;
    reasons.push('Unusually many subdomains');
  }
  if (url.port && !['80', '443', ''].includes(url.port)) {
    score -= 6;
    reasons.push(`Non-standard port ${url.port}`);
  }
  if (/@/.test(rawUrl.slice(rawUrl.indexOf('//') + 2).split('/')[0])) {
    score -= 30;
    reasons.push('Credentials hidden in the URL');
  }
  if (url.search.length > 300) {
    score -= 5;
    reasons.push('Very long tracking query string');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const level: SiteRating['level'] = score >= 75 ? 'safe' : score >= 45 ? 'caution' : 'risky';
  if (!reasons.length) reasons.push('No issues found in URL or blocklists');
  return { score, level, reasons, host };
}
