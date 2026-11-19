#!/usr/bin/env node
/**
 * Renders the application icon (PNG, 1024²) from the same vector definition the
 * website ships, so installer, dock and taskbar art never drift apart.
 *
 *   node tools/render-icon.mjs
 */
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SIZE = 1024;
const INSET = 64;
const R = 224;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="g" x1="96" y1="72" x2="944" y2="960" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#7c97ff"/>
      <stop offset=".52" stop-color="#5b8dfb"/>
      <stop offset="1" stop-color="#33d6a6"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".28"/>
      <stop offset=".55" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="drop" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="26" stdDeviation="30" flood-color="#0b1220" flood-opacity=".45"/>
    </filter>
  </defs>
  <g filter="url(#drop)">
    <rect x="${INSET}" y="${INSET}" width="${SIZE - INSET * 2}" height="${SIZE - INSET * 2}" rx="${R}" fill="url(#g)"/>
    <rect x="${INSET}" y="${INSET}" width="${SIZE - INSET * 2}" height="${SIZE - INSET * 2}" rx="${R}" fill="url(#shine)"/>
  </g>
  <g transform="translate(${INSET} ${INSET}) scale(${(SIZE - INSET * 2) / 48})">
    <path d="M17.4 12.6v22.8" stroke="#0a1220" stroke-width="4.1" stroke-linecap="round"/>
    <path d="M33.8 11.6 25.6 23.6l8.2 12.8" stroke="#0a1220" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;

const png = new Resvg(svg, { fitTo: { mode: 'width', value: SIZE }, background: 'rgba(0,0,0,0)' })
  .render()
  .asPng();

const targets = [
  path.join(ROOT, 'browser/resources/icon.png'),
  path.join(ROOT, 'browser/resources/icon-1024.png'),
  path.join(ROOT, 'website/public/icon.png')
];
for (const target of targets) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, png);
  console.log(`wrote ${path.relative(ROOT, target)} (${Math.round(png.length / 1024)} KB)`);
}
fs.writeFileSync(path.join(ROOT, 'browser/resources/icon.svg'), svg);
fs.writeFileSync(path.join(ROOT, 'website/public/icon.svg'), svg);
