import { useEffect, useRef, useState } from 'react';

export const SITE = {
  name: 'Kimmino',
  version: '1.1.0',
  repo: 'https://github.com/sdlksdsf/PROJECT-2',
  releases: 'https://github.com/sdlksdsf/PROJECT-2/releases/latest',
  discord: 'https://github.com/sdlksdsf/PROJECT-2/discussions',
  email: 'hello@kimmino.app',
  security: 'security@kimmino.app'
};

const V = SITE.version;

/** Canonical names for the build this site ships. Callers should resolve through
 * `assetUrl()` in `lib/release.ts`, which follows the newest GitHub release. */
export const DOWNLOADS = {
  windows: `${SITE.releases}/download/Kimmino-${V}-win-x64.exe`,
  windowsArm: `${SITE.releases}/download/Kimmino-${V}-win-arm64.exe`,
  mac: `${SITE.releases}/download/Kimmino-${V}-mac-arm64.dmg`,
  macIntel: `${SITE.releases}/download/Kimmino-${V}-mac-x64.dmg`,
  linux: `${SITE.releases}/download/Kimmino-${V}-linux-x86_64.AppImage`,
  linuxDeb: `${SITE.releases}/download/kimmino_${V}_amd64.deb`
};

export type Platform = 'windows' | 'mac' | 'linux' | 'unknown';

export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac')) return 'mac';
  if (ua.includes('linux') || ua.includes('x11')) return 'linux';
  return 'unknown';
}

export function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>('unknown');
  useEffect(() => setPlatform(detectPlatform()), []);
  return platform;
}

export const PLATFORM_LABEL: Record<Platform, string> = {
  windows: 'Windows',
  mac: 'macOS',
  linux: 'Linux',
  unknown: 'your computer'
};

export function downloadFor(platform: Platform): string {
  if (platform === 'windows') return DOWNLOADS.windows;
  if (platform === 'mac') return DOWNLOADS.mac;
  if (platform === 'linux') return DOWNLOADS.linux;
  return SITE.releases;
}

/** Adds `is-visible` once the element scrolls into view (CSS does the rest). */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return ref;
}

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = window.localStorage.getItem('kimmino-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('kimmino-theme', theme);
  }, [theme]);
  return { theme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') };
}
