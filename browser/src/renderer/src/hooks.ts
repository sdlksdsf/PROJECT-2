import { useEffect, useRef, useState } from 'react';
import { useStore } from './store';
import { playKeySound } from './lib/sound';

/** Snapshots the native page so HTML popovers can be drawn on top of it. */
export function useFreeze(active: boolean): void {
  const acquireFreeze = useStore((state) => state.acquireFreeze);
  const releaseFreeze = useStore((state) => state.releaseFreeze);

  useEffect(() => {
    if (!active) return;
    let released = false;
    void acquireFreeze();
    return () => {
      if (released) return;
      released = true;
      releaseFreeze();
    };
  }, [active, acquireFreeze, releaseFreeze]);
}

export function useOutsideClick<T extends HTMLElement>(onOutside: () => void): React.RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onOutside();
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [onOutside]);
  return ref;
}

/** Soft synthesised typing sound, opt-in in Settings → Search. */
export function useKeySound() {
  const prefs = useStore((state) => state.prefs);
  return (variant: 'key' | 'enter' | 'back' = 'key') => {
    if (!prefs.search.keyboardSounds) return;
    playKeySound(prefs.search.keyboardSoundVolume, variant);
  };
}

export function useInterval(callback: () => void, delay: number | null): void {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  }, [callback]);
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

export function useClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useInterval(() => setNow(new Date()), 1000);
  return now;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const list = window.matchMedia(query);
    const handler = () => setMatches(list.matches);
    list.addEventListener('change', handler);
    return () => list.removeEventListener('change', handler);
  }, [query]);
  return matches;
}
