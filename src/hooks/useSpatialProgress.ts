'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Scroll-driven progress (0-1) across a tall wrapper containing a
 * `position: sticky; top: 0` stage — the standard scrollytelling formula:
 * progress = -wrapperTop / (wrapperHeight - viewportHeight), clamped.
 * Polled every animation frame (not a scroll listener) so it stays in
 * sync with the browser's own scroll-driven compositing and naturally
 * picks up resize without a separate listener.
 *
 * The raw value is additionally lerped toward on each frame rather than
 * applied 1:1 — a bare 1:1 mapping reads as scroll-jacking; trailing
 * slightly behind the actual scroll position is what makes the camera
 * feel like it has real momentum rather than being glued to the wheel.
 */
export function useSpatialProgress(wrapperRef: RefObject<HTMLElement>) {
  const [progress, setProgress] = useState(0);
  const smoothedRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const el = wrapperRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const scrollable = rect.height - window.innerHeight;
        const raw = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;
        smoothedRef.current += (raw - smoothedRef.current) * 0.15;
        // Snap once close enough so it actually settles at exactly 0/1
        // instead of asymptotically approaching and never quite arriving.
        if (Math.abs(raw - smoothedRef.current) < 0.0005) smoothedRef.current = raw;
        setProgress(smoothedRef.current);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [wrapperRef]);

  return progress;
}
