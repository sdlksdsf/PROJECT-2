import type { Preferences, ThemeDefinition } from '@shared/types';

export const ACCENTS = ['#6d8cff', '#33d6a6', '#ff8f5e', '#c084fc', '#f472b6', '#facc15', '#38bdf8', '#f87171'];

export function resolveTheme(prefs: Preferences, themes: ThemeDefinition[]): string {
  if (prefs.themeMode === 'system') {
    const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches;
    return prefersDark ? 'light' : 'dark';
  }
  return prefs.themeMode;
}

/** Inline CSS custom properties for a user theme, or null for the built-in one. */
export function themeVars(prefs: Preferences, themes: ThemeDefinition[]): Record<string, string> {
  const base: Record<string, string> = {
    '--accent': prefs.accent,
    '--ui-scale': String(prefs.uiScale)
  };
  if (prefs.fontFamily) base['--font-ui'] = `'${prefs.fontFamily}', system-ui, sans-serif`;

  const custom = prefs.customThemeId ? themes.find((theme) => theme.id === prefs.customThemeId) : null;
  if (!custom) return base;

  const c = custom.colors;
  return {
    ...base,
    '--bg': c.bg,
    '--chrome': c.chrome,
    '--chrome-2': c.surface,
    '--surface': c.surface,
    '--surface-2': mix(c.surface, c.text, 0.06),
    '--surface-3': mix(c.surface, c.text, 0.12),
    '--text': c.text,
    '--text-dim': c.muted,
    '--text-faint': mix(c.muted, c.bg, 0.35),
    '--border': withAlpha(c.border, 0.9),
    '--accent': c.accent,
    '--glass': withAlpha(c.surface, 0.82)
  };
}

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const value = Number.parseInt(full.slice(0, 6), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')}`;
}

export function mix(a: string, b: string, amount: number): string {
  try {
    const ca = parseHex(a);
    const cb = parseHex(b);
    return toHex([ca[0] + (cb[0] - ca[0]) * amount, ca[1] + (cb[1] - ca[1]) * amount, ca[2] + (cb[2] - ca[2]) * amount]);
  } catch {
    return a;
  }
}

function withAlpha(hex: string, alpha: number): string {
  try {
    const [r, g, b] = parseHex(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return hex;
  }
}
