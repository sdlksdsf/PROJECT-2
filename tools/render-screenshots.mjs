#!/usr/bin/env node
/**
 * Renders the Kimmino screenshot set from the same design tokens the app uses.
 *
 * Why a renderer instead of a screenshot tool: CI sandboxes have no display, and
 * Electron cannot boot headlessly here. This script draws the interface in SVG
 * (fonts, palettes, spacing and content are the real ones) and rasterises it with
 * resvg, so the images in /assets/screenshots stay in sync with the UI by editing
 * this file — no design file, no binary blobs to maintain.
 *
 *   node tools/render-screenshots.mjs
 *
 * Fonts: run `bash tools/fonts-setup.sh` once first (requires python3 + fonttools).
 */
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONT_DIR = path.join(ROOT, 'tools/.fonts');
const OUT_DIR = path.join(ROOT, 'assets/screenshots');
const WEB_DIR = path.join(ROOT, 'website/public');

const W = 1600;
const H = 1000;

const C = {
  bg: '#0b0e14',
  chrome: '#0a0d13',
  rail: '#090c12',
  surface: '#111722',
  surfaceAlt: '#161d2a',
  line: '#1b2331',
  lineSoft: '#161c27',
  text: '#eef2f8',
  dim: '#9aa5b6',
  faint: '#6b7688',
  accent: '#7c97ff',
  accent2: '#33d6a6',
  danger: '#ff7a7a',
  white: '#ffffff'
};

const esc = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const FONT_INTER = 'InterVar';
const FONT_SPACE = 'Space Grotesk Var';

/** text */
function t(x, y, text, opts = {}) {
  const {
    size = 14,
    weight = 400,
    fill = C.text,
    family = FONT_INTER,
    anchor = 'start',
    opacity = 1,
    spacing = 0
  } = opts;
  return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}"${
    anchor !== 'start' ? ` text-anchor="${anchor}"` : ''
  }${opacity !== 1 ? ` opacity="${opacity}"` : ''}${
    spacing ? ` letter-spacing="${spacing}"` : ''
  }>${esc(text)}</text>`;
}

function rect(x, y, w, h, opts = {}) {
  const { r = 0, fill = 'none', stroke = 'none', sw = 1, opacity = 1 } = opts;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"${
    stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${sw}"` : ''
  }${opacity !== 1 ? ` opacity="${opacity}"` : ''}/>`;
}

function circle(cx, cy, r, opts = {}) {
  const { fill = 'none', stroke = 'none', sw = 1, opacity = 1 } = opts;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${
    stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${sw}"` : ''
  }${opacity !== 1 ? ` opacity="${opacity}"` : ''}/>`;
}

function line(x1, y1, x2, y2, opts = {}) {
  const { stroke = C.line, sw = 1, opacity = 1 } = opts;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"${
    opacity !== 1 ? ` opacity="${opacity}"` : ''
  }/>`;
}

/** Lucide-style 24×24 stroke icons, drawn as inline paths. */
const ICONS = {
  back: ['m12 19-7-7 7-7', 'M19 12H5'],
  forward: ['M5 12h14', 'm12 5 7 7-7 7'],
  reload: ['M21 12a9 9 0 1 1-9-9c2.5 0 4.9 1 6.7 2.7L21 8', 'M21 3v5h-5'],
  home: ['m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  star: ['M11.5 2.6 14.3 8.3l6.3.9-4.6 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3L2.4 9.2l6.3-.9z'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  shieldCheck: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'm8.5 11.5 2.5 2.5 4.5-5'],
  lock: ['M6 10V7a6 6 0 0 1 12 0v3', 'M5 10h14v11H5z'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'm21 21-4.3-4.3'],
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3'],
  camera: ['M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z', 'M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  settings: ['M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.4 8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4V3.8a2 2 0 1 1 4 0V4a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11h.2a2 2 0 1 1 0 4H21z'],
  globe: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M3 12h18', 'M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z'],
  plus: ['M12 5v14', 'M5 12h14'],
  close: ['M18 6 6 18', 'm6 6 12 12'],
  minimize: ['M5 12h14'],
  maximize: ['M5 5h14v14H5z'],
  palette: ['M12 21a9 9 0 1 1 9-9c0 2-1.5 3-3 3h-2a2 2 0 0 0-1 3.7A2 2 0 0 1 12 21z', 'M7.5 10.5h.01', 'M12 7.5h.01', 'M16.5 10.5h.01'],
  sparkles: ['m12 3 1.9 4.6 4.6 1.9-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z', 'm18 15 .9 2.1 2.1.9-2.1.9L18 21l-.9-2.1-2.1-.9 2.1-.9z'],
  columns: ['M4 4h16v16H4z', 'M12 4v16'],
  blocks: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  history: ['M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 3v5h5', 'M12 8v5l3 2'],
  eyeOff: ['M3 3l18 18', 'M10.6 10.6a2 2 0 0 0 2.8 2.8', 'M9.9 5.2A9.7 9.7 0 0 1 21 12a17 17 0 0 1-2.2 3.3', 'M6.2 6.2A17 17 0 0 0 3 12a9.7 9.7 0 0 0 6.8 5.2'],
  cookie: ['M12 21a9 9 0 1 1 8.5-12 4 4 0 0 1-5 5 4 4 0 0 0 5 5A9 9 0 0 1 12 21z', 'M9 9h.01', 'M14 14h.01', 'M9.5 14.5h.01'],
  fingerprint: ['M12 10a2 2 0 0 1 2 2v4', 'M8 12a4 4 0 0 1 8 0v3', 'M5 12a7 7 0 0 1 14 0v2', 'M12 21v-2'],
  cpu: ['M6 6h12v12H6z', 'M9 9h6v6H9z', 'M12 2v4', 'M12 18v4', 'M2 12h4', 'M18 12h4'],
  focus: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2']
};

function icon(name, x, y, size = 16, color = C.dim, sw = 1.7) {
  const paths = ICONS[name];
  if (!paths) throw new Error(`unknown icon ${name}`);
  const scale = size / 24;
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke="${color}" stroke-width="${
    sw / scale > 3 ? sw : sw
  }" stroke-linecap="round" stroke-linejoin="round">${paths
    .map((d) => `<path d="${d}"/>`)
    .join('')}</g>`;
}

function toggle(x, y, on = true, w = 40, h = 23) {
  const knob = 17;
  return [
    rect(x, y, w, h, { r: h / 2, fill: on ? 'url(#grad)' : C.surfaceAlt, stroke: on ? 'none' : C.line }),
    circle(on ? x + w - h / 2 : x + h / 2, y + h / 2, knob / 2, { fill: on ? '#ffffff' : '#8d98a8' })
  ].join('');
}

function logoMark(x, y, size) {
  const s = size / 48;
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <rect width="48" height="48" rx="13" fill="url(#grad)"/>
    <path d="M17.4 12.6v22.8" stroke="#0a1220" stroke-width="4.1" stroke-linecap="round"/>
    <path d="M33.8 11.6 25.6 23.6l8.2 12.8" stroke="#0a1220" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

function defs(images = {}) {
  const imageDefs = Object.entries(images)
    .map(([id, file]) => {
      const data = fs.readFileSync(file).toString('base64');
      return `<image id="img-${id}" href="data:image/jpeg;base64,${data}" width="1920" height="1072" preserveAspectRatio="xMidYMid slice"/>`;
    })
    .join('');
  return `<defs>
    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7c97ff"/><stop offset=".55" stop-color="#5b8dfb"/><stop offset="1" stop-color="#33d6a6"/>
    </linearGradient>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#05080e" stop-opacity=".55"/>
      <stop offset=".45" stop-color="#05080e" stop-opacity=".35"/>
      <stop offset="1" stop-color="#05080e" stop-opacity=".82"/>
    </linearGradient>
    <linearGradient id="fade-r" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0f141d" stop-opacity="0"/><stop offset="1" stop-color="#0f141d" stop-opacity=".9"/>
    </linearGradient>
    <radialGradient id="glow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#7c97ff" stop-opacity=".5"/><stop offset="1" stop-color="#7c97ff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#33d6a6" stop-opacity=".4"/><stop offset="1" stop-color="#33d6a6" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="26"/></filter>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#000" flood-opacity=".55"/>
    </filter>
    ${imageDefs}
  </defs>`;
}

/* ------------------------------------------------------------------ */
/* Shared window chrome                                                */
/* ------------------------------------------------------------------ */

const TABS = [
  { title: 'New tab', accent: true, active: true },
  { title: 'GitHub — sdlksdsf', active: false },
  { title: 'Kimmino Docs', active: false },
  { title: 'YouTube', active: false }
];

function chrome({ activeTab = 0, tabs = TABS, omnibox = 'Search Kimmino or type a URL', url = false, urlPath = 'kimmino://settings/privacy', blocked = '1,284' }) {
  const parts = [];
  parts.push(rect(0, 0, W, H, { fill: C.bg }));
  // title bar
  parts.push(rect(0, 0, W, 44, { fill: C.chrome }));
  parts.push(line(0, 44, W, 44, { stroke: C.lineSoft }));

  // traffic-light style profile chip
  parts.push(circle(22, 22, 5.5, { fill: '#ff5f57' }));
  parts.push(circle(40, 22, 5.5, { fill: '#febc2e' }));
  parts.push(circle(58, 22, 5.5, { fill: '#28c840' }));

  let x = 84;
  tabs.forEach((tab, index) => {
    const isActive = index === activeTab;
    const w = isActive ? 214 : 186;
    if (isActive) {
      parts.push(rect(x, 7, w, 32, { r: 9, fill: '#141b26', stroke: '#232c3b' }));
    }
    parts.push(
      rect(x + 11, 17, 12, 12, { r: 4, fill: tab.accent ? 'url(#grad)' : index === 1 ? '#e6edf3' : index === 2 ? '#7c97ff' : '#ff4d4d' })
    );
    parts.push(t(x + 31, 26, tab.title, { size: 12, weight: isActive ? 500 : 400, fill: isActive ? C.text : C.dim }));
    if (isActive) parts.push(icon('close', x + w - 24, 16, 12, C.faint, 2));
    if (index === 0) parts.push(icon('plus', x + w + 12, 16, 14, C.faint, 2));
    x += w + 6;
  });

  // window controls
  [0, 1, 2].forEach((index) => {
    const cx = 1508 + index * 34;
    if (index === 2) parts.push(rect(cx - 14, 8, 30, 28, { r: 7, fill: 'none' }));
    const glyph = index === 0 ? 'minimize' : index === 1 ? 'maximize' : 'close';
    parts.push(icon(glyph, cx - 8, 14, 14, index === 2 ? '#ff8a8a' : C.faint, 1.6));
  });

  // toolbar
  parts.push(rect(0, 44, W, 54, { fill: C.chrome }));
  parts.push(line(0, 98, W, 98, { stroke: C.lineSoft }));
  ['back', 'forward', 'reload', 'home'].forEach((name, index) => {
    const bx = 14 + index * 34;
    parts.push(rect(bx, 54, 30, 30, { r: 8, fill: 'none' }));
    parts.push(icon(name, bx + 8, 62, 14, index === 1 ? '#3d4554' : C.dim, 1.8));
  });

  const ox = 164;
  const ow = 1186;
  parts.push(rect(ox, 55, ow, 34, { r: 17, fill: '#131a24', stroke: '#212a38' }));
  parts.push(icon(url ? 'lock' : 'search', ox + 14, 64, 13, url ? C.accent2 : C.faint, 1.8));
  if (url) {
    const [scheme, ...rest] = urlPath.split('://');
    parts.push(t(ox + 34, 76, scheme, { size: 12.5, fill: C.text }));
    parts.push(t(ox + 34 + scheme.length * 6.6, 76, '://' + rest.join('://'), { size: 12.5, fill: C.faint }));
  } else {
    parts.push(t(ox + 34, 76, omnibox, { size: 12.5, fill: C.faint }));
  }
  // shield chip
  const chipW = 84;
  const chipX = ox + ow - chipW - 8;
  parts.push(rect(chipX, 61, chipW, 22, { r: 11, fill: 'rgba(51,214,166,.14)' }));
  parts.push(icon('shieldCheck', chipX + 8, 66, 12, C.accent2, 1.9));
  parts.push(t(chipX + 25, 77, blocked, { size: 11, weight: 600, fill: '#54e0b4' }));

  const rightIcons = ['sparkles', 'star', 'download', 'columns'];
  rightIcons.forEach((name, index) => {
    const bx = 1368 + index * 38;
    parts.push(icon(name, bx, 63, 15, C.dim, 1.7));
  });
  parts.push(logoMark(1528, 61, 22));
  parts.push(icon('settings', 1568, 63, 15, C.dim, 1.7));
  parts.push(t(1600, 0, '', { size: 0 }));

  // rail
  parts.push(rect(0, 98, 64, H - 98, { fill: C.rail }));
  parts.push(line(64, 98, 64, H, { stroke: C.lineSoft }));
  const railIcons = ['home', 'star', 'globe', 'history', 'download', 'blocks', 'palette'];
  railIcons.forEach((name, index) => {
    const ry = 116 + index * 42;
    if (index === 0) {
      parts.push(rect(15, ry, 34, 34, { r: 10, fill: '#141b26' }));
      parts.push(logoMark(23, ry + 8, 18));
    } else {
      parts.push(icon(name, 23, ry + 9, 16, C.faint, 1.7));
    }
  });
  parts.push(rect(15, H - 148, 34, 34, { r: 10, fill: '#141b26' }));
  parts.push(icon('shieldCheck', 23, H - 139, 16, C.accent2, 1.8));
  parts.push(icon('settings', 23, H - 96, 16, C.dim, 1.7));

  return parts.join('');
}

const contentW = W - 64;
const contentH = H - 98;

/* ------------------------------------------------------------------ */
/* Scene 1 — start page                                                */
/* ------------------------------------------------------------------ */

function startPage() {
  const parts = [];
  const clip = 'clip-content';
  parts.push(`<clipPath id="${clip}"><rect x="64" y="98" width="${contentW}" height="${contentH}"/></clipPath>`);
  parts.push(
    `<g clip-path="url(#${clip})"><use href="#img-fjord" x="64" y="98" width="${contentW}" height="${contentH}"/>`
  );
  parts.push(rect(64, 98, contentW, contentH, { fill: 'url(#scrim)' }));
  parts.push(`</g>`);

  // clock block
  parts.push(t(112, 208, '21:14', { size: 62, weight: 500, family: FONT_SPACE, fill: '#ffffff' }));
  parts.push(t(114, 240, 'Good evening, Shayan', { size: 15, weight: 400, fill: 'rgba(255,255,255,.78)' }));
  parts.push(
    t(114, 262, 'Friday, 19 November · Karachi', { size: 12, weight: 500, fill: 'rgba(255,255,255,.5)' })
  );

  // privacy chip top right
  parts.push(rect(1136, 132, 356, 54, { r: 14, fill: 'rgba(9,13,20,.55)', stroke: 'rgba(255,255,255,.12)' }));
  parts.push(icon('shieldCheck', 1156, 148, 20, C.accent2, 1.7));
  parts.push(t(1186, 156, 'Protected by Kimmino', { size: 13, weight: 600, fill: '#ffffff' }));
  parts.push(t(1186, 173, '1,284 ads · 412 trackers blocked today', { size: 11, fill: 'rgba(255,255,255,.62)' }));

  // search pill
  const sw = 660;
  const sx = 64 + (contentW - sw) / 2;
  const sy = 398;
  parts.push(rect(sx + 4, sy + 14, sw, 62, { r: 31, fill: '#000000', opacity: 0.28 }));
  parts.push(rect(sx, sy, sw, 62, { r: 31, fill: '#ffffff' }));
  parts.push(logoMark(sx + 16, sy + 15, 32));
  parts.push(t(sx + 62, sy + 38, 'Search Kimmino or type a URL', { size: 15, weight: 400, fill: '#7d8798' }));
  parts.push(icon('search', sx + sw - 42, sy + 21, 20, '#9aa3b2', 2));
  parts.push(line(sx + sw - 60, sy + 16, sx + sw - 60, sy + 46, { stroke: '#e6e9ef' }));

  // dials
  const dialY = 530;
  const items = [
    ['YouTube', 'Y', '#ff2d55'],
    ['GitHub', 'G', '#24292f'],
    ['Gmail', 'M', '#ea4335'],
    ['Figma', 'F', '#a259ff'],
    ['Reddit', 'R', '#ff4500'],
    ['Wikipedia', 'W', '#3b6ef6']
  ];
  const tile = 78;
  const gap = 30;
  const totalW = items.length * tile + (items.length - 1) * gap;
  const startX = 64 + (contentW - totalW) / 2;
  items.forEach(([label, letter, color], index) => {
    const ix = startX + index * (tile + gap);
    parts.push(rect(ix + 2, dialY + 6, tile, tile, { r: 22, fill: '#000', opacity: 0.22 }));
    parts.push(rect(ix, dialY, tile, tile, { r: 22, fill: '#ffffff' }));
    parts.push(
      t(ix + tile / 2, dialY + tile / 2 + 12, letter, {
        size: 30,
        weight: 700,
        family: FONT_SPACE,
        fill: color,
        anchor: 'middle'
      })
    );
    parts.push(
      t(ix + tile / 2, dialY + tile + 24, label, { size: 12, weight: 500, fill: 'rgba(255,255,255,.85)', anchor: 'middle' })
    );
  });

  // quick actions row
  const actions = [
    ['focus', 'Focus mode'],
    ['camera', 'Screenshot'],
    ['sparkles', 'Ask Kimmino'],
    ['clock', 'History']
  ];
  const actionY = 690;
  let ax = 64 + (contentW - 4 * 176) / 2 + 6;
  actions.forEach(([ic, label]) => {
    parts.push(rect(ax, actionY, 164, 44, { r: 12, fill: 'rgba(9,13,20,.42)', stroke: 'rgba(255,255,255,.12)' }));
    parts.push(icon(ic === 'clock' ? 'history' : ic, ax + 16, actionY + 14, 16, 'rgba(255,255,255,.8)', 1.7));
    parts.push(t(ax + 42, actionY + 28, label, { size: 12, weight: 500, fill: 'rgba(255,255,255,.85)' }));
    ax += 176;
  });

  // footer hint
  parts.push(
    t(64 + contentW / 2, 900, 'Customise this page — right-click anywhere', {
      size: 12,
      fill: 'rgba(255,255,255,.55)',
      anchor: 'middle'
    })
  );
  return parts.join('');
}

/* ------------------------------------------------------------------ */
/* Scene 2 — privacy settings                                          */
/* ------------------------------------------------------------------ */

const SETTINGS_GROUPS = [
  ['Privacy & security', ['Privacy & security', 'Cookies & site data', 'Permissions', 'Site exceptions']],
  ['Browsing', ['Appearance', 'Start page', 'Search engine', 'Downloads', 'Languages']],
  ['Performance', ['Memory saver', 'Hardware acceleration', 'Gaming mode']],
  ['Advanced', ['Extensions', 'Sync & account', 'Shortcuts', 'Developer', 'About']]
];

function settingsShell({ active, activeGroup = 0, children, urlPath = 'kimmino://settings/privacy' }) {
  const parts = [];
  parts.push(chrome({ activeTab: 3, url: true, urlPath, blocked: '1,284', tabs: [...TABS.slice(0, 3), { title: 'Settings', accent: false, active: true }] }));
  // settings nav
  parts.push(rect(64, 98, 286, contentH, { fill: '#0a0e15' }));
  parts.push(line(350, 98, 350, H, { stroke: C.lineSoft }));
  parts.push(t(92, 134, 'Settings', { size: 17, weight: 600, family: FONT_SPACE }));

  parts.push(rect(92, 150, 230, 34, { r: 10, fill: '#131a24', stroke: '#212a38' }));
  parts.push(icon('search', 104, 160, 13, C.faint, 1.8));
  parts.push(t(126, 171, 'Search settings…', { size: 12, fill: C.faint }));

  let y = 208;
  SETTINGS_GROUPS.forEach(([group, items], groupIndex) => {
    parts.push(t(94, y, group.toUpperCase(), { size: 9.5, weight: 600, fill: C.faint, spacing: 1.2 }));
    y += 12;
    items.forEach((item) => {
      const isActive = item === active;
      if (isActive) parts.push(rect(88, y - 1, 238, 30, { r: 8, fill: '#161e2b' }));
      if (isActive) parts.push(rect(88, y + 5, 2.5, 18, { r: 2, fill: 'url(#grad)' }));
      parts.push(
        t(102, y + 19, item, { size: 12.5, weight: isActive ? 600 : 400, fill: isActive ? C.text : C.dim })
      );
      y += 32;
    });
    y += 10;
    if (groupIndex === 0) parts.push(line(92, y - 12, 320, y - 12, { stroke: C.lineSoft }));
  });

  parts.push(children);
  return parts.join('');
}

function statCard(x, y, value, label, accentColor = C.text) {
  return [
    rect(x, y, 236, 88, { r: 14, fill: C.surface, stroke: C.line }),
    t(x + 20, y + 40, value, { size: 26, weight: 600, family: FONT_SPACE, fill: accentColor }),
    t(x + 20, y + 62, label, { size: 11.5, fill: C.faint })
  ].join('');
}

const PROTECTIONS = [
  ['shield', 'Block ads', 'EasyList + uAssets · 47,000 domains', true],
  ['eyeOff', 'Block trackers', 'Analytics beacons, ad pixels, cross-site IDs', true],
  ['cookie', 'Refuse third-party cookies', 'Dropped before they are written', true],
  ['fingerprint', 'Randomise fingerprint', 'Canvas, WebGL, audio, fonts, screen metrics', true],
  ['globe', 'Hide my location', 'Geolocation API answers with nothing', true],
  ['lock', 'Force HTTPS', 'Upgrade every insecure request', false]
];

function privacySettings() {
  let rowY = 316;
  const rows = PROTECTIONS.map(([ic, title, desc, on]) => {
    const item = [
      rect(368, rowY, 1196, 74, { r: 12, fill: '#0f141d', stroke: C.lineSoft }),
      rect(388, rowY + 19, 36, 36, { r: 10, fill: 'rgba(124,151,255,.12)' }),
      icon(ic, 399, rowY + 30, 15, C.accent, 1.7),
      t(440, rowY + 31, title, { size: 13.5, weight: 600 }),
      t(440, rowY + 51, desc, { size: 11.5, fill: C.faint }),
      toggle(1488, rowY + 26, on),
      on
        ? t(1440, rowY + 42, 'On', { size: 11, weight: 600, fill: C.accent2, anchor: 'end' })
        : t(1440, rowY + 42, 'Off', { size: 11, fill: C.faint, anchor: 'end' })
    ].join('');
    rowY += 82;
    return item;
  });

  const summaryY = rowY + 6;
  return settingsShell({
    active: 'Privacy & security',
    children: [
      t(368, 148, 'Privacy & security', { size: 26, weight: 600, family: FONT_SPACE }),
      t(368, 174, 'Protective by default. Nothing on this page requires an account.', { size: 12.5, fill: C.faint }),
      rect(1256, 128, 200, 36, { r: 10, fill: 'none', stroke: C.line }),
      t(1356, 151, 'Erase browsing data', { size: 12, weight: 500, fill: C.dim, anchor: 'middle' }),
      statCard(368, 198, '1,284', 'ads blocked this session', C.accent),
      statCard(620, 198, '412', 'trackers blocked', C.accent2),
      statCard(872, 198, '96', 'third-party cookies refused'),
      statCard(1124, 198, '37', 'cookie prompts auto-denied'),
      t(368, 302, 'ACTIVE PROTECTIONS', { size: 9.5, weight: 600, fill: C.faint, spacing: 1.2 }),
      rows.join(''),
      rect(368, summaryY, 1196, 66, { r: 12, fill: 'rgba(51,214,166,.06)', stroke: 'rgba(51,214,166,.2)' }),
      icon('shieldCheck', 390, summaryY + 25, 16, C.accent2, 1.8),
      t(418, summaryY + 27, 'This profile has blocked 18,204 requests in total.', { size: 12.5, weight: 500 }),
      t(418, summaryY + 47, 'Filter lists updated 3 hours ago · next automatic update in 21 hours', { size: 11, fill: C.faint }),
      t(1520, summaryY + 39, 'View log', { size: 11.5, weight: 600, fill: C.accent, anchor: 'end' })
    ].join('')
  });
}

/* ------------------------------------------------------------------ */
/* Scene 3 — split view                                                */
/* ------------------------------------------------------------------ */

function splitView() {
  const parts = [];
  const leftX = 64;
  const splitX = 832;
  const paneTop = 138;
  const paneH = H - paneTop;

  parts.push(chrome({ activeTab: 1, blocked: '2,041', tabs: [
    { title: 'Deploying to a fleet', accent: false, active: true },
    { title: 'Kimmino — YouTube', accent: false, active: true },
    { title: 'GitHub', accent: false, active: false }
  ] }));

  // tab strip for split panes
  parts.push(rect(64, 98, contentW, 40, { fill: '#0a0e15' }));
  parts.push(line(64, 138, W, 138, { stroke: C.lineSoft }));
  parts.push(rect(78, 106, 300, 26, { r: 7, fill: '#141b26' }));
  parts.push(rect(86, 113, 11, 11, { r: 3, fill: C.accent }));
  parts.push(t(104, 124, 'Deploying to a fleet · docs', { size: 11, fill: C.text }));
  parts.push(rect(388, 106, 330, 26, { r: 7, fill: '#0f151f' }));
  parts.push(rect(396, 113, 11, 11, { r: 3, fill: '#ff4d4d' }));
  parts.push(t(414, 124, 'Kimmino — YouTube', { size: 11, fill: C.dim }));
  parts.push(icon('columns', 748, 111, 14, C.faint, 1.7));
  parts.push(t(770, 123, 'Split view', { size: 11, weight: 600, fill: C.accent }));

  // ---- left page: docs site
  parts.push(rect(leftX, paneTop, splitX - leftX, paneH, { fill: '#f7f8fa' }));
  parts.push(rect(leftX, paneTop, splitX - leftX, 52, { fill: '#ffffff' }));
  parts.push(line(leftX, paneTop + 52, splitX, paneTop + 52, { stroke: '#e6e9ef' }));
  parts.push(logoMark(leftX + 18, paneTop + 15, 22));
  parts.push(t(leftX + 48, paneTop + 31, 'Northwind', { size: 13, weight: 700, family: FONT_SPACE, fill: '#101623' }));
  ['Docs', 'Guides', 'API', 'Changelog'].forEach((item, index) => {
    parts.push(t(leftX + 140 + index * 66, paneTop + 31, item, { size: 11.5, fill: '#5d6675' }));
  });
  parts.push(rect(splitX - 118, paneTop + 15, 96, 24, { r: 7, fill: '#101623' }));
  parts.push(t(splitX - 70, paneTop + 31, 'Get started', { size: 10.5, weight: 600, fill: '#ffffff', anchor: 'middle' }));

  // sidebar
  parts.push(rect(leftX, paneTop + 52, 168, paneH - 52, { fill: '#fbfcfd' }));
  parts.push(line(leftX + 168, paneTop + 52, leftX + 168, H, { stroke: '#eceff4' }));
  parts.push(t(leftX + 22, paneTop + 88, 'GETTING STARTED', { size: 8.5, weight: 700, fill: '#9aa3b2', spacing: 0.8 }));
  ['Install', 'First run', 'Profiles', 'Privacy engine', 'Focus mode', 'Sync'].forEach((item, index) => {
    const y = paneTop + 108 + index * 26;
    if (index === 3) {
      parts.push(rect(leftX + 12, y - 15, 144, 24, { r: 6, fill: '#eef1f8' }));
      parts.push(t(leftX + 22, y + 2, item, { size: 11.5, weight: 600, fill: '#2b3a9e' }));
    } else {
      parts.push(t(leftX + 22, y + 2, item, { size: 11.5, fill: '#5d6675' }));
    }
  });

  // article
  const ax = leftX + 196;
  parts.push(t(ax, paneTop + 100, 'GUIDES / DEPLOYMENT', { size: 8.5, weight: 700, fill: '#9aa3b2', spacing: 0.8 }));
  parts.push(t(ax, paneTop + 146, 'Deploying Kimmino', { size: 30, weight: 600, family: FONT_SPACE, fill: '#0e1420' }));
  parts.push(t(ax, paneTop + 182, 'to a fleet', { size: 30, weight: 600, family: FONT_SPACE, fill: '#0e1420' }));
  parts.push(t(ax, paneTop + 210, 'Roll out a hardened browser to 400 machines without a domain controller.', { size: 11.5, fill: '#69707e' }));
  // paragraph bars
  let ly = paneTop + 236;
  [0.97, 0.93, 0.99, 0.62].forEach((w) => {
    parts.push(rect(ax, ly, 380 * w, 7, { r: 4, fill: '#e3e7ee' }));
    ly += 17;
  });
  // code block
  parts.push(rect(ax, ly + 8, 380, 92, { r: 10, fill: '#0f1520' }));
  ['$ kimmino --profile fleet --policy hardened', '  --import /srv/chrome/bookmarks.json', '  --sync https://sync.example.dev'].forEach((codeLine, index) => {
    parts.push(t(ax + 16, ly + 34 + index * 21, codeLine, { size: 9.5, fill: index === 0 ? '#54e0b4' : '#c3cede', family: 'monospace' }));
  });
  ly += 116;
  parts.push(t(ax, ly + 14, 'Step 1 — build a profile template', { size: 13, weight: 600, family: FONT_SPACE, fill: '#0e1420' }));
  [0.99, 0.95, 0.88, 0.66].forEach((w) => {
    parts.push(rect(ax, ly + 28, 380 * w, 7, { r: 4, fill: '#e3e7ee' }));
    ly += 17;
  });
  parts.push(rect(ax, ly + 12, 380, 54, { r: 10, fill: '#eef2ff', stroke: '#dbe3ff' }));
  parts.push(icon('shieldCheck', ax + 14, ly + 30, 16, '#4155c9', 1.8));
  parts.push(t(ax + 40, ly + 34, 'Kimmino ships with blocking enabled — no extra policy needed.', { size: 10, weight: 500, fill: '#33407a' }));
  parts.push(t(ax + 40, ly + 50, 'Verify with kimmino://privacy after rollout.', { size: 9.5, fill: '#5b6796' }));

  // divider
  parts.push(rect(splitX - 3, paneTop, 7, paneH, { fill: 'transparent' }));
  parts.push(line(splitX, paneTop, splitX, H, { stroke: '#2a3444' }));
  parts.push(rect(splitX - 7, 540, 14, 44, { r: 7, fill: '#1a2230', stroke: '#2f3b4d' }));
  [0, 1, 2].forEach((i) => parts.push(circle(splitX, 554 + i * 9, 1.4, { fill: '#6b7688' })));

  // ---- right page: video site
  const rx = splitX;
  const rw = W - splitX;
  parts.push(rect(rx, paneTop, rw, paneH, { fill: '#0f0f0f' }));
  parts.push(rect(rx, paneTop, rw, 52, { fill: '#0f0f0f' }));
  parts.push(rect(rx + 18, paneTop + 18, 30, 20, { r: 6, fill: '#ff0033' }));
  parts.push(`<path d="M${rx + 30} ${paneTop + 23} L${rx + 39} ${paneTop + 28} L${rx + 30} ${paneTop + 33} Z" fill="#ffffff"/>`);
  parts.push(t(rx + 54, paneTop + 33, 'YouTube', { size: 14, weight: 700, family: FONT_SPACE, fill: '#ffffff', spacing: -0.4 }));
  parts.push(rect(rx + 110, paneTop + 16, 260, 22, { r: 11, fill: '#1b1b1b', stroke: '#2a2a2a' }));
  parts.push(icon('search', rx + 122, paneTop + 21, 12, '#8a8a8a', 1.8));
  parts.push(t(rx + 142, paneTop + 31, 'Search', { size: 10.5, fill: '#8a8a8a' }));

  // player
  const px = rx + 16;
  const py = paneTop + 62;
  const pw = rw - 32;
  const ph = 300;
  parts.push(rect(px, py, pw, ph, { r: 12, fill: '#050505' }));
  // video-ish gradient
  parts.push(`<g clip-path="url(#videoClip)">`);
  parts.push(rect(px, py, pw, ph, { r: 12, fill: '#0a1220' }));
  parts.push(circle(px + pw * 0.34, py + ph * 0.4, 150, { fill: 'url(#glow)' }));
  parts.push(circle(px + pw * 0.7, py + ph * 0.62, 130, { fill: 'url(#glow2)' }));
  parts.push(`</g>`);
  parts.push(`<clipPath id="videoClip"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="12"/></clipPath>`);
  // mountain silhouette
  parts.push(
    `<path d="M${px} ${py + 250} L${px + 120} ${py + 150} L${px + 210} ${py + 226} L${px + 330} ${py + 120} L${px + 470} ${py + 260} L${px} ${py + 260} Z" fill="#0d1b2a" opacity=".9"/>`
  );
  parts.push(circle(px + pw / 2, py + ph / 2, 34, { fill: 'rgba(0,0,0,.45)' }));
  parts.push(`<path d="M${px + pw / 2 - 10} ${py + ph / 2 - 16} L${px + pw / 2 + 18} ${py + ph / 2} L${px + pw / 2 - 10} ${py + ph / 2 + 16} Z" fill="#ffffff"/>`);
  // controls
  parts.push(rect(px, py + ph - 34, pw, 34, { fill: '#000000', opacity: 0.4 }));
  parts.push(rect(px + 12, py + ph - 8, pw - 24, 3, { r: 2, fill: 'rgba(255,255,255,.25)' }));
  parts.push(rect(px + 12, py + ph - 8, (pw - 24) * 0.38, 3, { r: 2, fill: '#ff0033' }));
  parts.push(circle(px + 12 + (pw - 24) * 0.38, py + ph - 6.5, 4.5, { fill: '#ff0033' }));

  // title + meta
  const ty = py + ph + 26;
  parts.push(t(px, ty, 'Kimmino 1.0 — a browser that minds its own business', { size: 15.5, weight: 600, fill: '#f1f1f1' }));
  parts.push(t(px, ty + 20, '142,880 views · 2 days ago', { size: 10.5, fill: '#8a8a8a' }));
  parts.push(circle(px + 14, ty + 48, 14, { fill: 'url(#grad)' }));
  parts.push(t(px + 38, ty + 45, 'Kimmino', { size: 11.5, weight: 600, fill: '#f1f1f1' }));
  parts.push(t(px + 38, ty + 59, '18.4K subscribers', { size: 9.5, fill: '#8a8a8a' }));
  parts.push(rect(px + pw - 96, ty + 34, 84, 28, { r: 14, fill: '#f1f1f1' }));
  parts.push(t(px + pw - 54, ty + 52, 'Subscribe', { size: 10.5, weight: 600, fill: '#0f0f0f', anchor: 'middle' }));

  // up next list
  parts.push(line(px, ty + 78, px + pw, ty + 78, { stroke: '#1f1f1f' }));
  parts.push(t(px, ty + 100, 'Up next', { size: 12, weight: 600, fill: '#f1f1f1' }));
  ['Split view is not a gimmick', 'How our filter engine works', 'Kimmino themes in 4 minutes'].forEach((label, index) => {
    const iy = ty + 112 + index * 62;
    parts.push(rect(px, iy, 96, 54, { r: 8, fill: index === 0 ? '#16202e' : index === 1 ? '#1a1a24' : '#101a18' }));
    parts.push(circle(px + 48, iy + 27, 12, { fill: index === 0 ? '#7c97ff' : index === 1 ? '#33d6a6' : '#5b8dfb', opacity: 0.45 }));
    parts.push(t(px + 110, iy + 22, label, { size: 11, weight: 500, fill: '#f1f1f1' }));
    parts.push(t(px + 110, iy + 38, 'Kimmino · ' + (index + 1) * 21 + 'K views', { size: 9.5, fill: '#8a8a8a' }));
  });

  return parts.join('');
}

/* ------------------------------------------------------------------ */
/* Scene 4 — themes gallery                                            */
/* ------------------------------------------------------------------ */

const THEMES = [
  { name: 'Kimmino Dark', colors: ['#0b0e14', '#141b26', '#7c97ff', '#eef2f8'], active: true },
  { name: 'OLED Black', colors: ['#000000', '#0a0a0a', '#5b8dfb', '#f2f2f2'], active: false },
  { name: 'Midnight Mint', colors: ['#08110f', '#0f1d1a', '#33d6a6', '#eaf6f2'], active: false },
  { name: 'Paper', colors: ['#faf8f4', '#efece4', '#b3703f', '#20180f'], active: false },
  { name: 'Nord', colors: ['#2e3440', '#3b4252', '#88c0d0', '#eceff4'], active: false },
  { name: 'Gruvbox', colors: ['#282828', '#3c3836', '#fabd2f', '#ebdbb2'], active: false },
  { name: 'Rose Pine', colors: ['#191724', '#1f1d2e', '#c4a7e7', '#e0def4'], active: false },
  { name: 'Solar', colors: ['#fdf6e3', '#eee8d5', '#268bd2', '#073642'], active: false }
];

function themesPage() {
  const parts = [];
  const cards = THEMES.map((theme, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = 368 + col * 404;
    const y = 262 + row * 224;
    const [bg, surface, accent, text] = theme.colors;
    return [
      rect(x, y, 384, 204, { r: 14, fill: theme.active ? '#121a26' : '#0f141d', stroke: theme.active ? C.accent : C.lineSoft }),
      rect(x + 14, y + 14, 356, 128, { r: 10, fill: bg }),
      // mini window
      rect(x + 26, y + 26, 44, 104, { r: 7, fill: surface }),
      rect(x + 26, y + 26, 44, 14, { r: 7, fill: surface }),
      circle(x + 40, y + 39, 3.5, { fill: accent }),
      rect(x + 82, y + 26, 276, 16, { r: 6, fill: surface }),
      rect(x + 90, y + 31, 80, 6, { r: 3, fill: text, opacity: 0.5 }),
      rect(x + 82, y + 50, 168, 52, { r: 8, fill: surface }),
      rect(x + 90, y + 60, 96, 6, { r: 3, fill: text, opacity: 0.75 }),
      rect(x + 90, y + 74, 140, 5, { r: 3, fill: text, opacity: 0.3 }),
      rect(x + 90, y + 85, 110, 5, { r: 3, fill: text, opacity: 0.3 }),
      rect(x + 258, y + 50, 100, 52, { r: 8, fill: accent, opacity: 0.22 }),
      rect(x + 82, y + 110, 120, 8, { r: 4, fill: accent }),
      theme.active ? rect(x + 268, y + 26, 76, 20, { r: 10, fill: 'rgba(124,151,255,.18)' }) : '',
      theme.active ? t(x + 306, y + 40, 'Active', { size: 9.5, weight: 600, fill: '#a9b8ff', anchor: 'middle' }) : '',
      t(x + 18, y + 172, theme.name, { size: 13, weight: 600 }),
      t(x + 18, y + 190, theme.active ? 'Built in · this profile' : 'Built in', { size: 10.5, fill: C.faint }),
      rect(x + 300, y + 160, 66, 24, { r: 7, fill: 'none', stroke: C.line }),
      t(x + 333, y + 176, 'Apply', { size: 10, weight: 500, fill: C.dim, anchor: 'middle' })
    ].join('');
  });

  parts.push(
    settingsShell({
      active: 'Appearance',
      children: [
        t(368, 148, 'Themes', { size: 26, weight: 600, family: FONT_SPACE }),
        t(368, 174, '20 built-in palettes. Import a .kimmino-theme file to add your own.', { size: 12.5, fill: C.faint }),
        rect(1216, 128, 160, 36, { r: 10, fill: 'none', stroke: C.line }),
        t(1296, 151, 'Import theme', { size: 12, weight: 500, fill: C.dim, anchor: 'middle' }),
        rect(1392, 128, 172, 36, { r: 10, fill: 'url(#grad)' }),
        t(1478, 151, 'Theme studio', { size: 12, weight: 600, fill: '#08111a', anchor: 'middle' }),
        rect(368, 200, 1196, 38, { r: 10, fill: C.surface, stroke: C.lineSoft }),
        icon('search', 382, 211, 14, C.faint, 1.8),
        t(406, 224, 'Search themes', { size: 11.5, fill: C.faint }),
        t(1544, 224, '8 of 20', { size: 11, fill: C.faint, anchor: 'end' }),
        cards.join('')
      ].join(''),
      urlPath: 'kimmino://settings/themes'
    })
  );
  return parts.join('');
}

/* ------------------------------------------------------------------ */
/* Scene 5 — social card                                               */
/* ------------------------------------------------------------------ */

function socialCard() {
  const w = 1200;
  const h = 630;
  const parts = [];
  parts.push(rect(0, 0, w, h, { fill: '#06080d' }));
  parts.push(circle(190, 90, 320, { fill: 'url(#glow)', opacity: 0.55 }));
  parts.push(circle(1080, 560, 300, { fill: 'url(#glow2)', opacity: 0.45 }));
  // grid lines
  for (let gx = 0; gx <= w; gx += 60) parts.push(line(gx, 0, gx, h, { stroke: '#ffffff', opacity: 0.03 }));
  for (let gy = 0; gy <= h; gy += 60) parts.push(line(0, gy, w, gy, { stroke: '#ffffff', opacity: 0.03 }));

  parts.push(logoMark(72, 64, 56));
  parts.push(t(142, 104, 'Kimmino', { size: 26, weight: 600, family: FONT_SPACE, fill: '#f2f5fa' }));

  parts.push(t(72, 246, 'Private by default.', { size: 66, weight: 600, family: FONT_SPACE, fill: '#f2f5fa' }));
  parts.push(t(72, 320, 'Light by design.', { size: 66, weight: 600, family: FONT_SPACE, fill: 'url(#grad)' }));
  parts.push(t(74, 372, 'Ads and trackers blocked before they load. No telemetry, no account, no bloat.', { size: 20, fill: '#a2adbf' }));

  const chips = [
    ['shieldCheck', '47,000 blockers'],
    ['lock', 'No telemetry'],
    ['blocks', 'Open source'],
    ['cpu', 'Light on RAM']
  ];
  let cx = 74;
  chips.forEach(([ic, label]) => {
    const cw = label.length * 8.2 + 54;
    parts.push(rect(cx, 408, cw, 42, { r: 21, fill: 'rgba(255,255,255,.05)', stroke: 'rgba(255,255,255,.13)' }));
    parts.push(icon(ic, cx + 16, 419, 17, '#7fd6ff', 1.6));
    parts.push(t(cx + 42, 434, label, { size: 14, weight: 500, fill: '#d6deea' }));
    cx += cw + 12;
  });

  // app frame, top right
  parts.push(rect(762, 108, 366, 186, { r: 16, fill: '#0b0e14', stroke: 'rgba(255,255,255,.14)' }));
  parts.push(rect(762, 108, 366, 30, { r: 16, fill: '#0e131c' }));
  parts.push(rect(762, 124, 366, 14, { fill: '#0e131c' }));
  [0, 1, 2].forEach((i) => parts.push(circle(780 + i * 14, 123, 3.5, { fill: ['#ff5f57', '#febc2e', '#28c840'][i] })));
  parts.push(rect(828, 116, 104, 14, { r: 7, fill: '#161e2b' }));
  parts.push(t(838, 127, 'New tab', { size: 8, fill: '#9aa5b6' }));
  parts.push(`<clipPath id="ogClip"><rect x="762" y="138" width="366" height="156" rx="0"/></clipPath>`);
  parts.push(`<g clip-path="url(#ogClip)"><use href="#img-peak" x="762" y="138" width="366" height="156"/>`);
  parts.push(rect(762, 138, 366, 156, { fill: '#05080e', opacity: 0.5 }));
  parts.push(`</g>`);
  parts.push(rect(852, 188, 186, 30, { r: 15, fill: '#ffffff' }));
  parts.push(t(945, 207, 'Search Kimmino', { size: 11, fill: '#8a93a3', anchor: 'middle' }));
  [0, 1, 2, 3, 4].forEach((i) => {
    parts.push(rect(846 + i * 41, 230, 31, 31, { r: 9, fill: '#ffffff', opacity: 0.94 }));
  });

  parts.push(t(72, 566, 'kimmino.app', { size: 15, weight: 500, fill: '#7c97ff' }));
  parts.push(t(1128, 566, 'Windows · macOS · Linux', { size: 13, fill: '#6d7889', anchor: 'end' }));
  return parts.join('');
}

/* ------------------------------------------------------------------ */
/* Render                                                              */
/* ------------------------------------------------------------------ */

const FONT_FILES = fs
  .readdirSync(FONT_DIR)
  .filter((file) => file.endsWith('.ttf'))
  .map((file) => path.join(FONT_DIR, file));

const IMAGES = {
  fjord: path.join(ROOT, 'browser/src/renderer/public/wallpapers/fjord.jpg'),
  loft: path.join(ROOT, 'browser/src/renderer/public/wallpapers/loft.jpg'),
  peak: path.join(ROOT, 'browser/src/renderer/public/wallpapers/peak.jpg'),
  dunes: path.join(ROOT, 'browser/src/renderer/public/wallpapers/dunes.jpg')
};

function render(name, body, { width = W, height = H, scale = 1 } = {}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${defs(IMAGES)}
    ${body}
  </svg>`;
  const resvg = new Resvg(svg, {
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: FONT_INTER },
    fitTo: { mode: 'width', value: Math.round(width * scale) },
    background: C.bg
  });
  const png = resvg.render().asPng();
  const file = path.join(OUT_DIR, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, png);
  console.log(`  ${name.padEnd(26)} ${Math.round(png.length / 1024)} KB`);
  return file;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
console.log('Rendering Kimmino screenshots…');

render('01-start-page.png', chrome({ activeTab: 0 }) + startPage());
render('02-privacy-settings.png', privacySettings());
render('03-split-view.png', splitView());
render('04-themes.png', themesPage());
const og = render('05-social-card.png', socialCard(), { width: 1200, height: 630 });

// website copies
fs.mkdirSync(path.join(WEB_DIR, 'screenshots'), { recursive: true });
for (const file of fs.readdirSync(OUT_DIR)) {
  if (file === '05-social-card.png') continue;
  fs.copyFileSync(path.join(OUT_DIR, file), path.join(WEB_DIR, 'screenshots', file));
}
fs.copyFileSync(og, path.join(WEB_DIR, 'og.png'));
console.log('Done.');
