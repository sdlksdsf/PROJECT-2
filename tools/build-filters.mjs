#!/usr/bin/env node
/**
 * Kimmino filter compiler.
 *
 * Downloads open-source filter lists (EasyList, uBlock Origin uAssets) from
 * GitHub, strips them down to the rules the Kimmino engine understands, and
 * writes a compact JSON bundle to browser/resources/filters/.
 *
 * Sources are GPLv3/CC-BY-SA licensed; see browser/resources/filters/NOTICE.md.
 *
 * Usage: node tools/build-filters.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const ESSENTIAL = JSON.parse(
  await fs.readFile(path.join(REPO_ROOT, 'browser', 'src', 'shared', 'essential-hosts.json'), 'utf8')
);
const OUT_DIR = path.join(REPO_ROOT, 'browser', 'resources', 'filters');

const SOURCES = [
  // ---- Ad blocking -------------------------------------------------------
  { id: 'easylist-adservers', group: 'ads', repo: 'easylist/easylist', file: 'easylist/easylist_adservers.txt', ref: 'master' },
  { id: 'easylist-general', group: 'ads', repo: 'easylist/easylist', file: 'easylist/easylist_general_block.txt', ref: 'master' },
  { id: 'easylist-specific', group: 'ads', repo: 'easylist/easylist', file: 'easylist/easylist_specific_block.txt', ref: 'master' },
  { id: 'easylist-thirdparty', group: 'ads', repo: 'easylist/easylist', file: 'easylist/easylist_thirdparty.txt', ref: 'master' },
  { id: 'easylist-popup', group: 'popups', repo: 'easylist/easylist', file: 'easylist/easylist_specific_block_popup.txt', ref: 'master' },
  { id: 'ubo-general', group: 'ads', repo: 'uBlockOrigin/uAssets', file: 'filters/filters-general.txt', ref: 'master' },
  { id: 'ubo-filters', group: 'ads', repo: 'uBlockOrigin/uAssets', file: 'filters/filters.txt', ref: 'master' },
  { id: 'ubo-2025', group: 'ads', repo: 'uBlockOrigin/uAssets', file: 'filters/filters-2025.txt', ref: 'master' },
  { id: 'ubo-2026', group: 'ads', repo: 'uBlockOrigin/uAssets', file: 'filters/filters-2026.txt', ref: 'master' },
  { id: 'ubo-quickfixes', group: 'ads', repo: 'uBlockOrigin/uAssets', file: 'filters/quick-fixes.txt', ref: 'master' },

  // ---- Trackers / privacy ------------------------------------------------
  { id: 'ubo-privacy', group: 'trackers', repo: 'uBlockOrigin/uAssets', file: 'filters/privacy.txt', ref: 'master' },
  { id: 'ubo-badware', group: 'malware', repo: 'uBlockOrigin/uAssets', file: 'filters/badware.txt', ref: 'master' },
  { id: 'ubo-removeparam', group: 'removeparam', repo: 'uBlockOrigin/uAssets', file: 'filters/privacy-removeparam.txt', ref: 'master' },

  // ---- Cookie / consent annoyances --------------------------------------
  { id: 'ubo-cookies', group: 'cookies', repo: 'uBlockOrigin/uAssets', file: 'filters/annoyances-cookies.txt', ref: 'master' },

  // ---- Exceptions (keeps sites working) ----------------------------------
  { id: 'ubo-unbreak', group: 'allow', repo: 'uBlockOrigin/uAssets', file: 'filters/unbreak.txt', ref: 'master' },
  { id: 'easylist-allowlist', group: 'allow', repo: 'easylist/easylist', file: 'easylist/easylist_allowlist.txt', ref: 'master' },

  // ---- Cosmetic rules ----------------------------------------------------
  { id: 'easylist-general-hide', group: 'cosmetic', repo: 'easylist/easylist', file: 'easylist/easylist_general_hide.txt', ref: 'master' },
  { id: 'easylist-specific-hide', group: 'cosmetic', repo: 'easylist/easylist', file: 'easylist/easylist_specific_hide.txt', ref: 'master' }
];

const COSMETIC_DOMAIN_CAP = 60_000;
const PATH_RULE_CAP = 26_000;
const MAX_REGEX_SOURCE = 180;

/**
 * GitHub contents API, fetched with Node's fetch and falling back to curl.
 * Node ships its own CA store, so a machine behind a TLS-inspecting proxy (a
 * corporate laptop, a sandbox) fails certificate verification even though the
 * system trusts it. curl uses the system store, so the second attempt works.
 */
async function fetchJson(url) {
  try {
    const res = await fetch(url, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'kimmino-filter-compiler' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    try {
      const out = execFileSync('curl', ['-sSL', '--max-time', '90', '-H', 'user-agent: kimmino-filter-compiler', url], {
        maxBuffer: 64 * 1024 * 1024,
        encoding: 'utf8'
      });
      return JSON.parse(out);
    } catch {
      throw new Error(`${error && error.message ? error.message : String(error)} (curl fallback failed too)`);
    }
  }
}

async function fetchList(source) {
  const url = `https://api.github.com/repos/${source.repo}/contents/${source.file}?ref=${source.ref}`;
  const json = await fetchJson(url);
  if (!json.content) throw new Error(`${source.id}: no content`);
  const text = Buffer.from(json.content, 'base64').toString('utf8');
  return { text, size: json.size };
}

const looksLikeDomain = (s) => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(s);

function normalizeDomain(d) {
  return d.replace(/^\*\./, '').replace(/\.$/, '').toLowerCase();
}

/** Convert an ABP pattern into an anchored-ish RegExp source (or null). */
function patternToRegex(pattern) {
  if (pattern.length > MAX_REGEX_SOURCE) return null;
  if (/[$@]/.test(pattern)) return null;
  let src = '';
  for (const ch of pattern) {
    if (ch === '*') src += '[^/]*';
    else if (ch === '^') src += '(?:[^\\w\\-.%]|$)';
    else src += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return src;
}

function splitOptions(rule) {
  const idx = rule.lastIndexOf('$');
  if (idx === -1) return { pattern: rule, options: '' };
  const options = rule.slice(idx + 1);
  // A `$` can legitimately appear inside a regex rule: /foo$bar/
  if (!/^[a-z0-9_\-=~,.*|]+$/i.test(options)) return { pattern: rule, options: '' };
  return { pattern: rule.slice(0, idx), options };
}

function isSupportedOptions(options) {
  if (!options) return true;
  if (/domain=|csp=|redirect|replace=|csp|header=|rewrite|permissions=|method=/i.test(options)) return false;
  if (/badfilter|elemhide|specifichide|generichide|genericblock/.test(options)) return false;
  return true;
}

function addPathRule(bucket, pattern) {
  if (bucket.size >= PATH_RULE_CAP) return;
  const source = patternToRegex(pattern);
  if (!source || source.length < 4) return;
  bucket.add(source);
}

async function main() {
  const started = Date.now();
  const bundle = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sources: [],
    ads: { domains: new Set(), patterns: new Set() },
    trackers: { domains: new Set(), patterns: new Set() },
    malware: { domains: new Set(), patterns: new Set() },
    popups: { domains: new Set(), patterns: new Set() },
    cookies: { domains: new Set(), patterns: new Set(), selectors: new Set() },
    allow: { domains: new Set(), patterns: new Set() },
    removeparam: { params: new Set(), byDomain: new Map() },
    cosmetic: { selectors: new Map(), generic: new Set() }
  };

  const failed = [];
  for (const source of SOURCES) {
    let text;
    try {
      const res = await fetchList(source);
      text = res.text;
      bundle.sources.push({ id: source.id, group: source.group, size: res.size });
      process.stdout.write(`  ok  ${source.id.padEnd(24)} ${(res.size / 1024).toFixed(0)} kB\n`);
    } catch (err) {
      process.stdout.write(`  !!  ${source.id}: ${err.message}\n`);
      failed.push(source.id);
      continue;
    }

    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('!') || line.startsWith('[')) continue;
      if (line.startsWith('#') && !/^#@?[#%]/.test(line)) continue;

      // --- cosmetic ------------------------------------------------------
      const cosmeticMatch = line.match(/^([^#]*?)#@?([#%])(.+)$/);
      if (cosmeticMatch) {
        if (line.includes('#@#')) continue; // we do not need un-break cosmetics
        const [, domains, marker, selector] = cosmeticMatch;
        if (marker === '%') continue; // snippet filters
        const cleanSelector = selector.trim();
        if (!cleanSelector || cleanSelector.length > 240) continue;
        if (!domains) {
          if (bundle.cosmetic.generic.size < 4000) bundle.cosmetic.generic.add(cleanSelector);
          continue;
        }
        if (bundle.cosmetic.selectors.size >= COSMETIC_DOMAIN_CAP) continue;
        for (const d of domains.split(',')) {
          const domain = d.trim();
          if (!domain || domain.startsWith('~')) continue;
          const key = normalizeDomain(domain);
          if (!looksLikeDomain(key)) continue;
          const existing = bundle.cosmetic.selectors.get(key);
          if (existing) {
            if (existing.length < 40) existing.push(cleanSelector);
          } else {
            bundle.cosmetic.selectors.set(key, [cleanSelector]);
          }
        }
        continue;
      }

      // --- network -------------------------------------------------------
      const isException = line.startsWith('@@');
      const body = isException ? line.slice(2) : line;
      const { pattern, options } = splitOptions(body);

      if (options.includes('removeparam')) {
        const value = options.split(',').find((o) => o.startsWith('removeparam='))?.slice('removeparam='.length) ?? '';
        if (isException) continue;
        if (!value) continue; // bare $removeparam strips all tracking — handled by heuristics
        const domainOpt = options.split(',').find((o) => o.startsWith('domain='));
        const params = value.split('|').filter(Boolean);
        if (domainOpt) {
          for (const d of domainOpt.slice('domain='.length).split('|')) {
            const domain = normalizeDomain(d.replace(/^~/, ''));
            if (!looksLikeDomain(domain)) continue;
            const set = bundle.removeparam.byDomain.get(domain) ?? new Set();
            params.forEach((p) => set.add(p.toLowerCase()));
            bundle.removeparam.byDomain.set(domain, set);
          }
        } else {
          params.forEach((p) => bundle.removeparam.params.add(p.toLowerCase()));
        }
        continue;
      }

      if (!isSupportedOptions(options)) continue;

      const groupBucket = bundle[source.group];
      const bucket = isException ? bundle.allow : (groupBucket && groupBucket.domains ? groupBucket : bundle.ads);
      const isDomainRule = pattern.startsWith('||');
      if (isDomainRule) {
        const hostPart = pattern.slice(2).split(/[\^/$|]/)[0];
        if (!hostPart || hostPart.includes('*')) {
          addPathRule(bucket.patterns, pattern);
          continue;
        }
        if (hostPart.includes('/')) {
          addPathRule(bucket.patterns, pattern);
          continue;
        }
        const domain = normalizeDomain(hostPart);
        if (!looksLikeDomain(domain)) {
          addPathRule(bucket.patterns, pattern);
          continue;
        }
        // `||host^` means "block this host". Options narrow that meaning: a
        // `$popup` or `$doc` rule covers popups or documents only, and
        // promoting it to a whole-host block is how `||youtube.com^$popup`
        // used to take YouTube offline. Only honour options that mean exactly
        // the same thing as a plain block.
        const optionList = options ? options.split(',').map((o) => o.trim().toLowerCase()).filter(Boolean) : [];
        const wholeHost = optionList.length === 0 || optionList.every((o) => o === 'third-party' || o === '3p');
        // An exception with options is narrower than "this whole host is
        // safe": `@@||ad.doubleclick.net^$domain=a.com` only exempts that one
        // site. Treating it as a global allow is how ad servers ended up on the
        // allowlist. Only bare rules become host-level decisions.
        if (!wholeHost) continue;
        bucket.domains.add(domain);
      } else if (pattern.startsWith('|') || pattern.includes('*')) {
        addPathRule(bucket.patterns, pattern.replace(/^\|/, '').replace(/\|$/, ''));
      } else if (pattern.includes('/')) {
        addPathRule(bucket.patterns, pattern);
      }
    }
  }

  // Refuse to overwrite a good bundle with a gutted one: a filtered-down list
  // is worse than no update, because it silently stops blocking anything.
  if (failed.length) {
    throw new Error(`${failed.length} filter source(s) could not be downloaded (${failed.join(', ')}) — nothing written`);
  }
  if (!bundle.ads.domains.size || !bundle.trackers.domains.size) {
    throw new Error('compiled bundle is empty — refusing to overwrite default-filters.json');
  }

  // A site may not be both allowed and blocked, and the hosts the browser has to
  // be able to reach are off limits to every list.
  const essential = ESSENTIAL.neverBlock;
  const conflicts = [];
  const isReserved = (domain) => essential.some((host) => domain === host || domain.endsWith(`.${host}`));
  for (const group of ['ads', 'trackers', 'malware', 'popups', 'cookies']) {
    for (const domain of [...bundle[group].domains]) {
      if (isReserved(domain) || bundle.allow.domains.has(domain)) {
        bundle[group].domains.delete(domain);
        conflicts.push(`${group}:${domain}`);
      }
    }
  }
  if (conflicts.length) {
    console.log(`\nDropped ${conflicts.length} rule(s) that would have broken a site:`);
    for (const entry of conflicts.slice(0, 20)) console.log(`  - ${entry}`);
    if (conflicts.length > 20) console.log(`  … ${conflicts.length - 20} more`);
  }

  const out = {
    version: bundle.version,
    generatedAt: bundle.generatedAt,
    sources: bundle.sources,
    ads: { domains: [...bundle.ads.domains].sort(), patterns: [...bundle.ads.patterns] },
    trackers: { domains: [...bundle.trackers.domains].sort(), patterns: [...bundle.trackers.patterns] },
    malware: { domains: [...bundle.malware.domains].sort(), patterns: [...bundle.malware.patterns] },
    popups: { domains: [...bundle.popups.domains].sort(), patterns: [...bundle.popups.patterns] },
    cookies: {
      domains: [...bundle.cookies.domains].sort(),
      patterns: [...bundle.cookies.patterns],
      selectors: [...bundle.cookies.selectors].slice(0, 2000)
    },
    allow: { domains: [...bundle.allow.domains].sort(), patterns: [...bundle.allow.patterns] },
    removeparam: {
      params: [...bundle.removeparam.params].sort(),
      byDomain: Object.fromEntries([...bundle.removeparam.byDomain].map(([k, v]) => [k, [...v]]))
    },
    cosmetic: {
      generic: [...bundle.cosmetic.generic],
      byDomain: Object.fromEntries([...bundle.cosmetic.selectors].map(([k, v]) => [k, v]))
    }
  };

  // Fail the build rather than ship a bundle that bricks a top site.
  for (const host of essential) {
    for (const group of ['ads', 'trackers', 'malware', 'popups']) {
      if (out[group].domains.includes(host)) {
        throw new Error(`${host} is on the never-block list but ended up in the ${group} list`);
      }
    }
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  const json = JSON.stringify(out);
  await fs.writeFile(path.join(OUT_DIR, 'default-filters.json'), json);
  await fs.writeFile(
    path.join(OUT_DIR, 'NOTICE.md'),
    [
      '# Filter list notices',
      '',
      '`default-filters.json` is compiled by `tools/build-filters.mjs` from these upstream lists at build/release time.',
      'Kimmino does not modify the intent of the rules; it only strips constructs the engine does not evaluate.',
      '',
      '| List | Project | Licence |',
      '| --- | --- | --- |',
      '| EasyList, EasyList Allowlist, EasyList element hiding | [easylist/easylist](https://github.com/easylist/easylist) | GPLv3 / CC BY-SA 3.0 |',
      '| uBlock Origin filters, privacy, badware, annoyances-cookies, unbreak | [uBlockOrigin/uAssets](https://github.com/uBlockOrigin/uAssets) | GPLv3 |',
      '',
      'These lists are community maintained. If you redistribute Kimmino, keep this notice.'
    ].join('\n')
  );

  const kb = (Buffer.byteLength(json) / 1024).toFixed(0);
  console.log(`\nWrote ${path.relative(REPO_ROOT, path.join(OUT_DIR, 'default-filters.json'))} (${kb} kB)`);
  console.log(`  ads      ${out.ads.domains.length} domains / ${out.ads.patterns.length} patterns`);
  console.log(`  trackers ${out.trackers.domains.length} domains / ${out.trackers.patterns.length} patterns`);
  console.log(`  malware  ${out.malware.domains.length} domains`);
  console.log(`  allow    ${out.allow.domains.length} domains`);
  console.log(`  cosmetic ${Object.keys(out.cosmetic.byDomain).length} sites / ${out.cosmetic.generic.length} generic`);
  console.log(`  removeparam ${out.removeparam.params.length} global params`);
  console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
