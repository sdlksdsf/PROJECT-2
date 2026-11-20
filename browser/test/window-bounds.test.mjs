import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { centeredBounds, fitSize, fitsIn, restoreBounds } from '../src/main/window-bounds.ts';

/**
 * The first 1.1.0 window opened at 1320×860 no matter what the screen was. On a
 * 1024×728 display that put the close button, the right end of the tab strip and
 * the bottom of the sidebar off screen — with no drag position that brings them
 * back. These tests pin the geometry rules that make that impossible.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (...parts) => fs.readFileSync(path.join(here, ...parts), 'utf8');

const SMALL = { x: 0, y: 0, width: 1024, height: 728 };
const LAPTOP = { x: 0, y: 0, width: 1920, height: 1040 };
const SECOND = { x: 1920, y: 0, width: 1920, height: 1040 };

test('a large default never exceeds the screen', () => {
  const bounds = centeredBounds(SMALL);
  assert.equal(bounds.width, SMALL.width);
  assert.equal(bounds.height, SMALL.height);
  assert.equal(bounds.x, 0);
  assert.equal(bounds.y, 0);
});

test('the default window is centred, and untouched, on a roomy screen', () => {
  const bounds = centeredBounds(LAPTOP);
  assert.ok(bounds.width <= LAPTOP.width && bounds.height <= LAPTOP.height);
  assert.equal(bounds.x, Math.round((LAPTOP.width - bounds.width) / 2));
  assert.equal(bounds.y, Math.round((LAPTOP.height - bounds.height) / 2));
});

test('a window saved on a bigger monitor is shrunk instead of clipped', () => {
  const saved = { x: 40, y: 30, width: 1600, height: 1000 };
  const bounds = restoreBounds(saved, SMALL);
  assert.ok(bounds.width <= SMALL.width);
  assert.ok(bounds.height <= SMALL.height);
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= SMALL.width);
  assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= SMALL.height);
});

test('saved geometry that is entirely off screen is replaced by a centred window', () => {
  for (const saved of [
    { x: 4000, y: 300, width: 1200, height: 800 },
    { x: -3000, y: -2000, width: 1200, height: 800 },
    { x: 10, y: 5000, width: 1200, height: 800 }
  ]) {
    const bounds = restoreBounds(saved, SMALL);
    assert.deepEqual(bounds, centeredBounds(SMALL));
  }
});

test('saved geometry from a second monitor is respected, not snapped back to the primary', () => {
  const saved = { x: 2100, y: 100, width: 1200, height: 800 };
  assert.deepEqual(restoreBounds(saved, SECOND), saved);
});

test('a normal window on the same screen keeps its position', () => {
  const saved = { x: 120, y: 80, width: 900, height: 600 };
  assert.deepEqual(restoreBounds(saved, LAPTOP), saved);
});

test('nonsense geometry never reaches the window manager', () => {
  for (const saved of [
    null,
    undefined,
    { x: Number.NaN, y: 0, width: 800, height: 600 },
    { x: 0, y: 0, width: 0, height: 0 },
    { x: 0, y: 0, width: -500, height: -500 }
  ]) {
    const bounds = restoreBounds(saved, SMALL);
    assert.ok(Number.isFinite(bounds.x) && Number.isFinite(bounds.y));
    assert.ok(bounds.width > 0 && bounds.height > 0);
    assert.ok(fitsIn(bounds, SMALL));
  }
});

test('a screen smaller than the minimum size still gets a usable window', () => {
  const tiny = { x: 0, y: 0, width: 640, height: 480 };
  const bounds = centeredBounds(tiny);
  assert.deepEqual(bounds, { x: 0, y: 0, width: 640, height: 480 });
  const size = fitSize(200, 200, tiny);
  assert.deepEqual(size, { width: 640, height: 480 });
});

test('fitsIn reports the states that need rescuing', () => {
  assert.equal(fitsIn({ x: 10, y: 10, width: 900, height: 600 }, SMALL), true);
  assert.equal(fitsIn({ x: 900, y: 600, width: 900, height: 600 }, SMALL), false);
  assert.equal(fitsIn({ x: 0, y: 0, width: 1600, height: 900 }, SMALL), false);
});

test('the window is never created at a hard-coded size outside the fitted bounds', () => {
  const source = read('..', 'src', 'main', 'window.ts');
  assert.match(source, /centeredBounds|restoreBounds/, 'window geometry must go through window-bounds');
  assert.doesNotMatch(source, /width:\s*1320/, 'the 1320×860 default must not be passed to BaseWindow directly');
  // Escapes that work even when the interface is off screen.
  assert.match(source, /resetBounds\(\)/);
  assert.match(source, /before-input-event/);
  const index = read('..', 'src', 'main', 'index.ts');
  assert.match(index, /display-metrics-changed/);
  assert.match(index, /--reset-window/);
});
