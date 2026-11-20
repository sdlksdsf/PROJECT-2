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
  const [info, setInfo] = useState<ReleaseInfo>({ tag: null, publishedLabel: null, checksumsUrl: CHECKSUMS });

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    fetch(API, { headers: { accept: 'application/vnd.github+json' }, signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data: unknown) => {
        if (!alive) return;
        const payload = data as { tag_name?: unknown; published_at?: unknown };
        const published = typeof payload.published_at === 'string' ? new Date(payload.published_at) : null;
        setInfo({
          tag: typeof payload.tag_name === 'string' ? payload.tag_name : null,
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
