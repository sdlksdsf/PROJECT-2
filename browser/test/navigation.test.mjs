import test from 'node:test';
import assert from 'node:assert/strict';
import { engineName, isSearchQuery, searchUrl, toUrl } from '../src/shared/navigation.ts';
import { DEFAULT_SEARCH_ENGINE, SEARCH_ENGINES } from '../src/shared/defaults.ts';

const DDG = 'https://duckduckgo.com/?q=';
const GOOGLE = 'https://www.google.com/search?q=';

test('a typed address is loaded, never searched for', () => {
  const cases = [
    ['youtube.com', 'https://youtube.com'],
    ['www.youtube.com', 'https://www.youtube.com'],
    ['youtube.com/', 'https://youtube.com/'],
    ['youtube.com/watch?v=abc123&t=42s', 'https://youtube.com/watch?v=abc123&t=42s'],
    ['open.spotify.com/playlist/123', 'https://open.spotify.com/playlist/123'],
    ['mail.google.com', 'https://mail.google.com'],
    ['news.ycombinator.com#top', 'https://news.ycombinator.com#top'],
    ['example.com.', 'https://example.com.'],
    ['münchen.de', 'https://münchen.de'],
    ['//cdn.example.com/x.js', 'https://cdn.example.com/x.js']
  ];
  for (const [input, expected] of cases) {
    assert.equal(toUrl(input, 'duckduckgo', ''), expected, `${input} should load as a URL`);
    assert.equal(isSearchQuery(input), false, `${input} is not a search`);
  }
});

test('localhost and raw IPs with a port are addresses, not schemes', () => {
  assert.equal(toUrl('localhost:3000', 'duckduckgo', ''), 'https://localhost:3000');
  assert.equal(toUrl('127.0.0.1:8080/admin', 'duckduckgo', ''), 'https://127.0.0.1:8080/admin');
  assert.equal(toUrl('192.168.1.1', 'duckduckgo', ''), 'https://192.168.1.1');
  assert.equal(toUrl('http://localhost:3000/', 'duckduckgo', ''), 'http://localhost:3000/');
});

test('questions are searched, not loaded', () => {
  assert.equal(toUrl('how to make coffee', 'duckduckgo', ''), `${DDG}how%20to%20make%20coffee`);
  assert.equal(toUrl('kimmino browser', 'duckduckgo', ''), `${DDG}kimmino%20browser`);
  assert.equal(isSearchQuery('best laptop 2026'), true);
  // A bare word is a question; people type one and expect results.
  assert.equal(isSearchQuery('youtube'), true);
});

test('the chosen engine is the engine that answers', () => {
  for (const [id, engine] of Object.entries(SEARCH_ENGINES)) {
    if (id === 'custom') continue;
    assert.equal(searchUrl('cats', id, ''), engine.url.replace('%s', 'cats'), `${id} should answer its own searches`);
  }
  assert.equal(searchUrl('cats', 'google', ''), `${GOOGLE}cats`);
  assert.equal(searchUrl('cats', 'bing', ''), 'https://www.bing.com/search?q=cats');
});

test('an unusable engine never silently becomes DuckDuckGo by accident', () => {
  // Unknown id → the documented default, and engineName agrees with searchUrl.
  const fallback = SEARCH_ENGINES[DEFAULT_SEARCH_ENGINE];
  assert.equal(searchUrl('cats', 'nope', ''), fallback.url.replace('%s', 'cats'));
  assert.equal(engineName('nope'), fallback.name);

  // A custom engine with no template must not produce a broken URL.
  const custom = searchUrl('cats', 'custom', '');
  assert.ok(custom.startsWith('https://'), `custom-with-no-url produced ${custom}`);
  assert.ok(!custom.includes('%s'), 'the placeholder must be substituted');

  // A custom engine with a query already in it appends instead of mangling it.
  assert.equal(searchUrl('cats', 'custom', 'https://search.example/?q='), 'https://search.example/?q=&q=cats');
  assert.equal(searchUrl('cats', 'custom', 'https://search.example/s?q=%s'), 'https://search.example/s?q=cats');
});

test('the ? prefix forces a search even for something address-shaped', () => {
  assert.equal(toUrl('?youtube.com', 'google', ''), `${GOOGLE}youtube.com`);
  assert.equal(isSearchQuery('?youtube.com'), true);
});

test('inline text is cleaned before it is used', () => {
  assert.equal(toUrl('  github.com  ', 'duckduckgo', ''), 'https://github.com');
  assert.equal(toUrl('"github.com"', 'duckduckgo', ''), 'https://github.com');
  assert.equal(toUrl('(https://github.com)', 'duckduckgo', ''), 'https://github.com');
  assert.equal(toUrl('', 'duckduckgo', ''), 'kimmino://newtab');
  assert.equal(toUrl('kimmino://settings', 'duckduckgo', ''), 'kimmino://settings');
});

test('known schemes pass through untouched', () => {
  for (const url of ['https://a.example/x', 'http://a.example', 'about:blank', 'file:///tmp/x.png', 'data:text/plain,hi']) {
    assert.equal(toUrl(url, 'duckduckgo', ''), url);
  }
});
