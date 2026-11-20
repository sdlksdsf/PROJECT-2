import { useEffect, useState } from 'react';
import { SITE } from './site';

/**
 * Live release provenance for the download page.
 *
 * Installer file names embed the version (`Kimmino-1.1.2-win-x64.exe`), so a
 * hard-coded name silently keeps serving an old build after a new tag is cut.
 * Reading `releases/latest` from the GitHub API and matching assets by suffix
 * means every link always resolves to a file that actually exists in the newest
 * release — plus the exact publish time of the artifacts behind it.
 *
 * Everything degrades: if the API is rate-limited or offline, the page keeps
 * rendering with just the version number and the checksum link.
 */

const API = 'https://api.github.com/repos/sdlksdsf/PROJECT-2/releases/latest';
const CHECKSUMS = `${SITE.releases}/download/SHA256SUMS.txt`;

export interface ReleaseInfo {
  /** Release tag, once known (e.g. "v1.1.1"). */
  tag: string | null;
  /** Asset file name → size in bytes, straight from the release that is live. */
  assets: Record<string, number>;
  /** Human-readable publish time in UTC, once known. */
  publishedLabel: string | null;
  /** Always available: SHA-256 list next to the current release's assets. */
  checksumsUrl: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatUtc(date: Date): string {
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}, ${hours}:${minutes} UTC`;
}

export function useLatestRelease(): ReleaseInfo {
  const [info, setInfo] = useState<ReleaseInfo>({ tag: null, assets: {}, publishedLabel: null, checksumsUrl: CHECKSUMS });

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    fetch(API, { headers: { accept: 'application/vnd.github+json' }, signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data: unknown) => {
        if (!alive) return;
        const payload = data as {
          tag_name?: unknown;
          published_at?: unknown;
          assets?: Array<{ name?: unknown; size?: unknown }>;
        };
        const assets: Record<string, number> = {};
        for (const asset of payload.assets ?? []) {
          if (typeof asset.name === 'string' && typeof asset.size === 'number') assets[asset.name] = asset.size;
        }
        const published = typeof payload.published_at === 'string' ? new Date(payload.published_at) : null;
        setInfo({
          tag: typeof payload.tag_name === 'string' ? payload.tag_name : null,
          assets,
          publishedLabel: published && !Number.isNaN(published.valueOf()) ? formatUtc(published) : null,
          checksumsUrl: CHECKSUMS
        });
      })
      .catch(() => {
        // Rate limit, offline, or blocked: the static page is still correct.
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      alive = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, []);

  return info;
}

/** 118 MB, not "118.4 MB" — the precision nobody needs. */
export function formatBytes(bytes: number | undefined): string | null {
  if (!bytes || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  if (mb >= 100) return `${Math.round(mb)} MB`;
  return `${mb.toFixed(1)} MB`;
}

/**
 * The file name inside the release that is live *now*, matched on the stable
 * part of the name (`-win-x64.exe`) so a version bump needs no code change.
 * `fallback` is the name this repo publishes today — used only until the API
 * answers, or when it cannot be reached at all.
 */
export function assetName(suffix: string, fallback: string, assets: Record<string, number>): string {
  const match = Object.keys(assets).find((name) => name === suffix || name.endsWith(suffix));
  return match ?? fallback;
}

/** Absolute download URL on the newest release. */
export function assetUrl(suffix: string, fallback: string, assets: Record<string, number>): string {
  return `${SITE.releases}/download/${assetName(suffix, fallback, assets)}`;
}

/** Last measured sizes, keyed by the stable suffix, for the pre-API render. */
const FALLBACK_SIZES: Record<string, number> = {
  '-win-x64.exe': 118 * 1024 * 1024,
  '-win-arm64.exe': 112 * 1024 * 1024,
  '-mac-arm64.dmg': 108 * 1024 * 1024,
  '-mac-x64.dmg': 111 * 1024 * 1024,
  '-linux-x86_64.AppImage': 98.2 * 1024 * 1024,
  '_amd64.deb': 99 * 1024 * 1024
};

/** `Kimmino-1.1.2-win-x64.exe` → `-win-x64.exe`: the part that survives a version bump. */
export function nameSuffix(name: string): string {
  return name.replace(/^Kimmino-\d+\.\d+\.\d+/, '').replace(/^kimmino_\d+\.\d+\.\d+/, '');
}

/** Real installer size for the current release, matched by file-name suffix. */
export function sizeFor(url: string, assets: Record<string, number>): string | null {
  const suffix = nameSuffix(url.split('/').pop() ?? '');
  const live = Object.keys(assets).find((asset) => nameSuffix(asset) === suffix);
  return formatBytes(live ? assets[live] : undefined) ?? formatBytes(FALLBACK_SIZES[suffix]);
}
