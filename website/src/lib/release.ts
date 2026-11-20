import { useEffect, useState } from 'react';
import { SITE } from './site';

/**
 * Live release provenance for the download page.
 *
 * The installers keep a stable filename (`Kimmino-1.0.0-win-x64.exe`) across
 * rebuilds, so "which build am I actually getting?" cannot be answered from the
 * page's static copy. Reading `releases/latest` from the GitHub API answers it
 * with the release that is live right now — including the exact publish time of
 * the artifacts behind every download link.
 *
 * Everything degrades: if the API is rate-limited or offline, the page keeps
 * rendering with just the version number and the checksum link.
 */

const API = 'https://api.github.com/repos/sdlksdsf/PROJECT-2/releases/latest';
const CHECKSUMS = `${SITE.releases}/download/SHA256SUMS.txt`;

export interface ReleaseInfo {
  /** Release tag, once known (e.g. "v1.0.0"). */
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

/** 123 MB, not "123.4 MB" — the precision nobody needs. */
export function formatBytes(bytes: number | undefined): string | null {
  if (!bytes || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  if (mb >= 100) return `${Math.round(mb)} MB`;
  return `${mb.toFixed(1)} MB`;
}

/**
 * Real installer sizes for the current release, keyed by the download URL's
 * file name. Falls back to the measured Windows build so the page never shows a
 * made-up number before the API answers.
 */
export const MEASURED_SIZES: Record<string, number> = {
  'Kimmino-1.0.0-win-x64.exe': 123 * 1024 * 1024
};

export function sizeFor(url: string, assets: Record<string, number>): string | null {
  const name = url.split('/').pop() ?? '';
  return formatBytes(assets[name]) ?? formatBytes(MEASURED_SIZES[name]);
}
