'use client';

import { useEffect, useState } from 'react';

const LOW_FPS_THRESHOLD = 40;
const SAMPLE_FRAMES = 45; // ~0.75s at 60fps before making a call

/**
 * True when the heavier per-frame decorative effects (grain texture,
 * expanding pulse rings, animated route dashes — Spatial V2's "particle
 * trail"-ish accents) should be skipped: either the visitor has asked
 * for less motion, or a short rAF sample shows the device is actually
 * struggling to keep up. Checked once per mount, not continuously
 * re-measured, so a temporary stutter doesn't flip the UI back and forth.
 */
export function useReducedFx(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReduced(true);
      return;
    }

    let frame = 0;
    let rafId: number;
    const start = performance.now();
    const tick = () => {
      frame += 1;
      if (frame >= SAMPLE_FRAMES) {
        const elapsedSeconds = (performance.now() - start) / 1000;
        const fps = frame / elapsedSeconds;
        if (fps < LOW_FPS_THRESHOLD) setReduced(true);
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return reduced;
}
