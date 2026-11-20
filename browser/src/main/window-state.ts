import { JsonStore } from './store';
import type { Rect } from './window-bounds';

/**
 * Where the window was last time. Kept next to preferences but separate from
 * them: geometry belongs to this machine's screen layout, not to the profile
 * that gets synced between devices.
 */
export interface SavedWindowState {
  bounds: Rect | null;
  maximized: boolean;
}

const store = new JsonStore<SavedWindowState>('window-state.json', () => ({ bounds: null, maximized: false }));

export function savedWindowState(): SavedWindowState {
  const state = store.get();
  return {
    bounds: state && state.bounds ? state.bounds : null,
    maximized: Boolean(state?.maximized)
  };
}

/** Remember the normal (non-maximised) geometry, so restoring later is predictable. */
export function rememberWindowState(bounds: Rect | null, maximized: boolean): void {
  store.update((current) => ({
    bounds: bounds ?? current.bounds,
    maximized
  }));
}

export function forgetWindowState(): void {
  store.set({ bounds: null, maximized: false });
}
