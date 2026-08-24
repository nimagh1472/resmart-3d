'use client';

import { useEffect, useRef, useState } from 'react';
import { TOTAL_DURATION_SECONDS } from '@/lib/cinematicManifest';

/**
 * QA instrument, ported from the archived src/components/three/SceneTimeline.tsx
 * (?cinematicTime=7 jumps straight to a timeline second for reference-frame
 * capture, instead of waiting on real playback). Absent by default — normal
 * playback is untouched.
 */
function readTimeOverride(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('cinematicTime');
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

interface CinematicClockOptions {
  /** Scroll can accelerate/scrub progression once past the autoplay intro — off by default until wired up. */
  scrollScrubEnabled?: boolean;
  paused?: boolean;
}

/**
 * Single elapsed-time source of truth for the whole cinematic — every
 * scene/media/effects layer derives its state from this one number, same
 * architecture as the archived 3D SceneTimeline (proven pattern, just
 * driving DOM/CSS layers instead of a Three.js camera now).
 */
export function useCinematicClock({ scrollScrubEnabled = false, paused = false }: CinematicClockOptions = {}) {
  const override = useRef(readTimeOverride());
  const [elapsed, setElapsed] = useState(override.current ?? 0);
  const startedAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (override.current !== null) return; // frozen at the QA-specified time, no autoplay
    if (paused) return;

    const tick = (now: number) => {
      if (startedAtRef.current === null) startedAtRef.current = now - elapsed * 1000;
      const next = Math.min(TOTAL_DURATION_SECONDS, (now - startedAtRef.current) / 1000);
      setElapsed(next);
      if (next < TOTAL_DURATION_SECONDS) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  useEffect(() => {
    if (!scrollScrubEnabled || override.current !== null) return;
    const handleScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return;
      const scrollProgress = window.scrollY / maxScroll;
      setElapsed(scrollProgress * TOTAL_DURATION_SECONDS);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollScrubEnabled]);

  return elapsed;
}
