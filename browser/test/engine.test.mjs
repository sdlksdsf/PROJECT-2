import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESSENTIAL_DOMAINS, FilterEngine } from '../src/main/privacy/engine.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const bundleFile = path.join(here, '..', 'resources', 'filters', 'default-filters.json');
const bundle = JSON.parse(fs.readFileSync(bundleFile, 'utf8'));
const engine = new FilterEngine(bundle);

const match = (url, resourceType = 'script', page = 'https://news.example.com/') =>
  engine.match(url, { firstParty: new URL(page).hostname, resourceType });

test('a top-level navigation is never blocked by an ad or tracker list', () => {
  const sites = [
    'google.com', 'www.google.com', 'youtube.com', 'www.youtube.com', 'm.youtube.com',
    'github.com', 'reddit.com', 'netflix.com', 'open.spotify.com', 'x.com', 'amazon.com',
    'chatgpt.com', 'linkedin.com', 'ebay.com', 'bing.com', 'duckduckgo.com', 'paypal.com',
    'dropbox.com', 'zoom.us', 'stackoverflow.com', 'wikipedia.org', 'mail.google.com',
    'accounts.google.com', 'drive.google.com', 'twitch.tv', 'discord.com', 'notion.so',
    'figma.com', 'medium.com', 'bbc.com', 'dawn.com'
  ];
  for (const site of sites) {
    const result = match(`https://${site}/`, 'mainFrame', `https://${site}/`);
    assert.equal(result.block, false, `${site} must load`);
  }
});

test('every never-block host survives every resource type', () => {
  for (const host of ESSENTIAL_DOMAINS) {
    for (const type of ['mainFrame', 'script', 'image', 'xhr', 'media', 'stylesheet']) {
      const result = match(`https://${host}/x`, type, 'https://news.example.com/');
      assert.equal(result.block, false, `${host} blocked as ${type}`);
    }
  }
});

test('a site can load its own files even if a list names its domain', () => {
  const cases = [
    ['https://www.reddit.com/static/app.js', 'https://www.reddit.com/'],
    ['https://www.amazon.com/assets/style.css', 'https://www.amazon.com/'],
    ['https://www.youtube.com/s/desktop/x/polymer.js', 'https://www.youtube.com/']
  ];
  for (const [url, page] of cases) {
    assert.equal(match(url, 'script', page).block, false, `${url} is first-party to ${page}`);
  }
});

test('third-party ads and trackers are still blocked', () => {
  const blocked = [
    ['https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', 'ads'],
    ['https://static.doubleclick.net/instream/ad_status.js', 'ads'],
    ['https://www.google-analytics.com/collect?v=1', 'trackers'],
    ['https://connect.facebook.net/en_US/fbevents.js', 'trackers'],
    ['https://cdn.taboola.com/libtrc/loader.js', 'ads'],
    ['https://sb.scorecardresearch.com/beacon.js', 'trackers']
  ];
  for (const [url, kind] of blocked) {
    const result = match(url, 'script');
    assert.equal(result.block, true, `${url} should be blocked`);
    assert.ok(result.kind, 'the block should carry a reason');
    assert.ok(
      result.kind === kind || result.kind === 'ads' || result.kind === 'trackers',
      `${url} blocked as ${result.kind}, expected ${kind}`
    );
  }
});

test('the allowlist protects the page you are on, not ad servers', () => {
  // ad.doubleclick.net appears in EasyList's allowlist as a narrow exception.
  // That must not turn into "doubleclick is fine everywhere".
  const result = match('https://ad.doubleclick.net/ddm/ad', 'image', 'https://news.example.com/');
  assert.equal(result.block, true, 'a third-party ad host must stay blocked');

  // A site that is allowlisted keeps working end to end.
  const allowedSite = 'https://www.google.com/recaptcha/api.js';
  assert.equal(match(allowedSite, 'script', 'https://www.google.com/').block, false);
});

test('malware blocks are exact: a listed host does not drag its neighbours down', () => {
  assert.ok(bundle.malware.domains.length > 0, 'the bundle should still carry a malware list');
  const synthetic = new FilterEngine({
    version: 1,
    ads: { domains: [], patterns: [] },
    trackers: { domains: [], patterns: [] },
    malware: { domains: ['bad.example'], patterns: [] },
    popups: { domains: [], patterns: [] },
    cookies: { domains: [], patterns: [] },
    allow: { domains: [], patterns: [] },
    removeparam: { params: [], byDomain: {} },
    cosmetic: { generic: [], byDomain: {} }
  });
  const nav = (url) => synthetic.match(url, { firstParty: 'news.example', resourceType: 'mainFrame' }).block;
  const sub = (url) => synthetic.match(url, { firstParty: 'news.example', resourceType: 'script' }).block;

  assert.equal(nav('https://bad.example/'), true, 'the listed host is blocked');
  assert.equal(nav('https://sub.bad.example/'), false, 'a subdomain guess must not brick a navigation');
  assert.equal(sub('https://sub.bad.example/x.js'), true, 'sub-resources of a listed host are still blocked');
  assert.equal(nav('https://good.example/'), false);
});

test('the shipped bundle cannot contradict the never-block list', () => {
  const essentials = new Set(ESSENTIAL_DOMAINS);
  const overlaps = [];
  for (const group of ['ads', 'trackers', 'malware', 'popups', 'cookies']) {
    for (const domain of bundle[group].domains) {
      if (essentials.has(domain)) overlaps.push(`${group}:${domain}`);
    }
  }
  assert.deepEqual(overlaps, [], `these hosts are both essential and blocked: ${overlaps.join(', ')}`);

  const both = [];
  const allow = new Set(bundle.allow.domains);
  for (const domain of bundle.ads.domains) if (allow.has(domain)) both.push(domain);
  assert.deepEqual(both, [], `domains that are both allowed and blocked: ${both.join(', ')}`);
});

test('tracking parameters are stripped, ordinary ones are kept', () => {
  const cleaned = engine.stripTrackingParams('https://shop.example/item?id=42&utm_source=news&fbclid=xyz');
  assert.ok(cleaned.includes('id=42'), 'a real parameter survives pid stripping');
  // Bare `id`, `ref`, `s` and friends appear in removeparam lists and must not
  // be touched: they are how ordinary pages address content.
  for (const keep of ['id', 'ref', 'source', 'page', 'q', 's', 't', 'v', 'list']) {
    const url = `https://shop.example/p?${keep}=keepme`;
    assert.ok(engine.stripTrackingParams(url).includes(`${keep}=keepme`), `${keep}= must survive`);
  }
  assert.ok(!cleaned.includes('utm_source'), 'utm_source is removed');
  assert.ok(!cleaned.includes('fbclid'), 'fbclid is removed');
});
