/**
 * Window geometry, kept purely functional so it can be tested without Electron.
 *
 * A frameless window that opens bigger than the monitor cannot be rescued by the
 * user: the window controls, part of the sidebar and the bottom of the tab strip
 * all sit outside the screen, and no drag position brings them back. So every
 * rectangle that reaches `BaseWindow` goes through here first, and the same maths
 * re-runs whenever a display is added, removed or resized.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const MIN_WINDOW_WIDTH = 720;
export const MIN_WINDOW_HEIGHT = 480;
export const DEFAULT_WINDOW_WIDTH = 1320;
export const DEFAULT_WINDOW_HEIGHT = 860;

/** How much of the window must stay on screen for saved geometry to be reused. */
const MIN_VISIBLE_WIDTH = 200;
const MIN_VISIBLE_HEIGHT = 120;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

/** Largest size that fits the work area while respecting the minimum usable size. */
export function fitSize(width: number, height: number, area: Rect): { width: number; height: number } {
  const minWidth = Math.min(MIN_WINDOW_WIDTH, Math.max(1, area.width));
  const minHeight = Math.min(MIN_WINDOW_HEIGHT, Math.max(1, area.height));
  return {
    width: clamp(Math.round(width), minWidth, Math.max(minWidth, area.width)),
    height: clamp(Math.round(height), minHeight, Math.max(minHeight, area.height))
  };
}

/** A window that fills most of the screen, centred, never bigger than it. */
export function centeredBounds(area: Rect, width = DEFAULT_WINDOW_WIDTH, height = DEFAULT_WINDOW_HEIGHT): Rect {
  const size = fitSize(width, height, area);
  return {
    width: size.width,
    height: size.height,
    x: Math.round(area.x + (area.width - size.width) / 2),
    y: Math.round(area.y + (area.height - size.height) / 2)
  };
}

/**
 * Saved geometry, made safe for the display it now lands on.
 *
 * Shrinks a window that no longer fits, pulls it back inside the work area, and
 * throws the saved position away entirely when too little of it is visible to
 * grab — that is exactly the state a monitor downgrade leaves behind.
 */
export function restoreBounds(saved: Rect | null | undefined, area: Rect): Rect {
  if (
    !saved ||
    ![saved.x, saved.y, saved.width, saved.height].every((value) => Number.isFinite(value)) ||
    saved.width <= 0 ||
    saved.height <= 0
  ) {
    return centeredBounds(area);
  }
  const size = fitSize(saved.width, saved.height, area);
  const visibleWidth = Math.min(saved.x + size.width, area.x + area.width) - Math.max(saved.x, area.x);
  const visibleHeight = Math.min(saved.y + size.height, area.y + area.height) - Math.max(saved.y, area.y);
  if (visibleWidth < Math.min(MIN_VISIBLE_WIDTH, size.width) || visibleHeight < Math.min(MIN_VISIBLE_HEIGHT, size.height)) {
    return centeredBounds(area);
  }
  return {
    width: size.width,
    height: size.height,
    x: clamp(saved.x, area.x, area.x + area.width - size.width),
    y: clamp(saved.y, area.y, area.y + area.height - size.height)
  };
}

/** True when the rect already fits inside the work area without being moved. */
export function fitsIn(rect: Rect, area: Rect): boolean {
  const fixed = restoreBounds(rect, area);
  return fixed.x === rect.x && fixed.y === rect.y && fixed.width === rect.width && fixed.height === rect.height;
}

/**
 * Small screens get a maximised window.
 *
 * Windows/macOS size a maximised window to the display themselves, which is the
 * one measurement that stays correct under every DPI-scaling arrangement —
 * including the ones where the values reported to a frameless Electron window
 * are larger than the pixels actually on screen. A floating 1320×860 window on a
 * 1280-wide display would be clipped no matter what; a maximised one cannot be.
 */
export function shouldStartMaximized(area: Rect): boolean {
  return area.width <= 1366 || area.height <= 820;
}

/**
 * The first window after an install or an update opens maximised.
 *
 * Nothing in the app can confirm that the work area it was told matches the
 * pixels on the monitor, so the safest first move is to let the window manager
 * place and size it: a maximised window is always exactly the screen. Once the
 * user resizes it, their geometry is stored (schema 2) and reused from then on.
 */
export function shouldOpenMaximized(hasSavedBounds: boolean, area: Rect): boolean {
  return !hasSavedBounds || shouldStartMaximized(area);
}
