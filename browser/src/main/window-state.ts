import { JsonStore } from './store';
import type { Rect } from './window-bounds';

/**
 * Where the window was last time. Kept next to preferences but separate from
 * them: geometry belongs to this machine's screen layout, not to the profile
 * that gets synced between devices.
 */
export interface SavedWindowState {
  /**
   * Bumped whenever geometry written by an older, less careful version should be
   * ignored. 1.1.2 and earlier could store a window that was larger than the
   * screen, so that geometry is not worth restoring.
   */
  schema: number;
  bounds: Rect | null;
  maximized: boolean;
}

export const WINDOW_STATE_SCHEMA = 2;

const store = new JsonStore<SavedWindowState>('window-state.json', () => ({
  schema: WINDOW_STATE_SCHEMA,
  bounds: null,
  maximized: false
}));

export function savedWindowState(): SavedWindowState {
  const state = store.get();
  // Unknown or older schema: start from a clean slate rather than a rectangle
  // that was measured by a build which could not see the whole screen.
  if (!state || state.schema !== WINDOW_STATE_SCHEMA) {
    return { schema: WINDOW_STATE_SCHEMA, bounds: null, maximized: false };
  }
  return {
    schema: WINDOW_STATE_SCHEMA,
    bounds: state.bounds ?? null,
    maximized: Boolean(state.maximized)
  };
}

/** Remember the normal (non-maximised) geometry, so restoring later is predictable. */
export function rememberWindowState(bounds: Rect | null, maximized: boolean): void {
  store.update((current) => ({
    schema: WINDOW_STATE_SCHEMA,
    bounds: bounds ?? (current.schema === WINDOW_STATE_SCHEMA ? current.bounds : null),
    maximized
  }));
}

export function forgetWindowState(): void {
  store.set({ schema: WINDOW_STATE_SCHEMA, bounds: null, maximized: false });
}
