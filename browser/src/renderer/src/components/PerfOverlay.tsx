import { useEffect, useRef, useState } from 'react';

/**
 * The performance overlay from Settings → Advanced. A rAF probe gives frame
 * time; Chromium's own heap numbers come from performance.memory where the
 * browser exposes it, which is the same figure DevTools shows.
 */
export function PerfOverlay() {
  const [fps, setFps] = useState(60);
  const [frame, setFrame] = useState(16.7);
  const [heap, setHeap] = useState<number | null>(null);
  const frames = useRef<number[]>([]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const delta = now - last;
      last = now;
      frames.current.push(delta);
      if (frames.current.length > 30) {
        const recent = frames.current.slice(-30);
        const average = recent.reduce((sum, value) => sum + value, 0) / recent.length;
        setFrame(average);
        setFps(Math.round(1000 / Math.max(average, 1)));
        frames.current = recent;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    const heapTimer = setInterval(() => {
      if (memory) setHeap(memory.usedJSHeapSize / (1024 * 1024));
    }, 1000);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(heapTimer);
    };
  }, []);

  return (
    <div className="perf-overlay" role="status" aria-live="off">
      <span className={fps < 30 ? 'perf-bad' : fps < 50 ? 'perf-warn' : 'perf-good'}>{fps} fps</span>
      <span>{frame.toFixed(1)} ms</span>
      {heap !== null && <span>{heap.toFixed(0)} MB heap</span>}
    </div>
  );
}
