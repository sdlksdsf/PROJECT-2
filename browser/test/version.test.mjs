import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_VERSION } from '../src/shared/defaults.ts';

/**
 * One version, or none.
 *
 * 1.0.0 was shipped for months while the download page kept handing out the same
 * `Kimmino-1.0.0-*.exe` name, so a "new" download could silently be an old build.
 * These checks fail the moment the version drifts between the app, the installers
 * electron-builder produces, the website and the docs.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (...parts) => fs.readFileSync(path.join(here, ...parts), 'utf8');
const json = (...parts) => JSON.parse(read(...parts));

const SEMVER = /^\d+\.\d+\.\d+$/;

test('the shared version is a plain release version', () => {
  assert.match(APP_VERSION, SEMVER);
});

test('the app package version matches the shared constant', () => {
  assert.equal(json('..', 'package.json').version, APP_VERSION);
});

test('the root and website packages carry the same version', () => {
  assert.equal(json('..', '..', 'package.json').version, APP_VERSION);
  assert.equal(json('..', '..', 'website', 'package.json').version, APP_VERSION);
});

test('the website advertises the version the app reports', () => {
  const site = read('..', '..', 'website', 'src', 'lib', 'site.ts');
  assert.match(site, new RegExp(`version: '${APP_VERSION.replaceAll('.', '\\.')}'`));
});

test('installer names derived from the version exist in the download page', () => {
  const page = read('..', '..', 'website', 'src', 'pages', 'Download.tsx');
  // Every installer is resolved by its stable suffix against the newest release,
  // so a version bump never leaves a dead file name behind.
  for (const suffix of ['-win-x64.exe', '-win-arm64.exe', '-mac-arm64.dmg', '-mac-x64.dmg', '-linux-x86_64.AppImage', '_amd64.deb']) {
    assert.ok(page.includes(`'${suffix}'`), `${suffix} must be resolved against the live release`);
  }
  assert.ok(!/Kimmino-1\.0\.\d-/.test(page), 'the download page must not pin an old file name');
});

test('the docs quote the current installer version', () => {
  const files = [
    ['..', '..', 'README.md'],
    ['..', '..', 'docs', 'BUILD.md'],
    ['..', '..', 'docs', 'INSTALL.md']
  ];
  for (const parts of files) {
    const text = read(...parts);
    const quoted = [...text.matchAll(/Kimmino-(\d+\.\d+\.\d+)-/g)].map((m) => m[1]);
    for (const version of quoted) {
      assert.equal(version, APP_VERSION, `${parts.at(-1)} still quotes ${version}`);
    }
  }
});

test('the release workflow publishes the version the app reports', () => {
  const workflow = read('..', '..', '.github', 'workflows', 'release.yml');
  // Tags are the only trigger, so the tag has to be `v<version>` from package.json.
  assert.match(workflow, /tags:/);
});
