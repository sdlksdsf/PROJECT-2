import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const bundle = () => {
  const file = path.join(root, 'resources/filters/default-filters.json');
  assert.ok(fs.existsSync(file), 'resources/filters/default-filters.json is missing — run node tools/build-filters.mjs');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

test('filter bundle exists and is structurally sound', () => {
  const data = bundle();
  assert.equal(data.version, 1);
  assert.ok(data.ads.domains.length > 10_000, `expected a substantial ad domain list, got ${data.ads.domains.length}`);
  assert.ok(data.ads.patterns.length > 100, 'ad URL patterns are suspiciously small');
  assert.ok(data.trackers.domains.length > 100, 'tracker list is suspiciously small');
  assert.ok(Object.keys(data.cosmetic.byDomain).length > 1000, 'cosmetic rules are suspiciously small');
  assert.ok(data.cosmetic.generic.length > 100, 'generic cosmetic rules are suspiciously small');
  assert.ok(data.removeparam.params.length > 10, 'tracking parameters should be stripped');
  assert.ok(data.sources.length >= 5, 'the bundle should record where its lists came from');
});

test('every filter domain is a bare hostname', () => {
  const data = bundle();
  const domains = [...data.ads.domains, ...data.trackers.domains];
  const bad = domains.filter((domain) => typeof domain !== 'string' || /[\s/]/.test(domain));
  assert.equal(bad.length, 0, `found ${bad.length} malformed domains, e.g. ${bad[0]}`);
});

test('packaging config produces the advertised artifact names', () => {
  const yml = fs.readFileSync(path.join(root, 'electron-builder.yml'), 'utf8');
  assert.match(yml, /appId: com\.kimmino\.browser/);
  assert.match(yml, /productName: Kimmino/);
  assert.match(yml, /artifactName: Kimmino-\$\{version\}-\$\{os\}-\$\{arch\}\.\$\{ext\}/);
  assert.match(yml, /nsis:/, 'Windows builds must ship an NSIS installer');
  assert.match(yml, /oneClick: false/, 'the installer must be interactive, not a silent one-click stub');
  assert.match(yml, /allowToChangeInstallationDirectory: true/);
});

test('the privacy engine refuses to ship a permissive default', () => {
  const defaults = fs.readFileSync(path.join(root, 'src/shared/defaults.ts'), 'utf8');
  // There is no telemetry preference to disable: the code path simply does not
  // exist. These are the protections a user can actually feel.
  for (const expected of ['adBlocking: true', 'blockTrackers: true', 'blockThirdPartyCookies: true', 'blockLocation: true', 'fingerprintProtection: true', 'blockCryptoMiners: true']) {
    assert.match(defaults, new RegExp(expected), `${expected} must exist in DEFAULT_PREFERENCES`);
  }
  const permissive = /adBlocking:\s*false|blockTrackers:\s*false|blockThirdPartyCookies:\s*false|telemetry:\s*true/;
  assert.doesNotMatch(defaults, permissive, 'protections must default to enabled');
});

test('no telemetry endpoints are referenced anywhere in the source', () => {
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', 'out', 'release', 'dist', '.git'].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx|mjs|js)$/.test(entry.name)) continue;
      // The filter engine names these hosts in order to block them; that is the
      // opposite of reporting to them.
      if (path.relative(root, full) === path.join('src', 'main', 'privacy', 'engine.ts')) continue;
      const source = fs.readFileSync(full, 'utf8');
      for (const needle of ['google-analytics.com', 'googletagmanager.com', 'sentry.io', 'segment.io', 'mixpanel.com', 'posthog.com', 'amplitude.com']) {
        if (source.includes(needle)) offenders.push(`${path.relative(root, full)} → ${needle}`);
      }
    }
  };
  walk(path.join(root, 'src'));
  assert.deepEqual(offenders, [], `telemetry endpoints found: ${offenders.join(', ')}`);
});

test('the assistant proxy keeps its keys on the server', () => {
  const fn = fs.readFileSync(path.join(root, '..', 'website', 'api', 'ai.ts'), 'utf8');
  assert.match(fn, /process\.env\.GEMINI_API_KEY/, 'the proxy must read its key from the environment');
  assert.match(fn, /process\.env\.GROQ_API_KEY/);
  // No key material in the function itself, and no browser-side key handling.
  assert.doesNotMatch(fn, /AIza[0-9A-Za-z_-]{10,}/, 'no Google key may be committed');
  assert.doesNotMatch(fn, /gsk_[0-9A-Za-z]{10,}/, 'no Groq key may be committed');
});
