'use client';

import { useLayoutEffect, useState } from 'react';

const SEEN_STORAGE_KEY = 'resmart_cinematic_seen';
const SKIP_CONTROL_DELAY_MS = 4000;

/**
 * Four visitor paths, per the Cinematic Pivot directive:
 *   1. Intent-routed (?ref=/?inv=, same convention as useIntentPersona.ts)
 *      — skip immediately, straight to the relevant funnel.
 *   2. Returning (localStorage flag already set) — skip immediately.
 *   3. prefers-reduced-motion — skip immediately. The intro is decorative
 *      (a skippable pre-roll, not the product), so honoring the OS-level
 *      preference by bypassing it entirely is simpler and more reliable
 *      than maintaining a second, motion-free rendering path for a ~30s
 *      film built entirely out of pan/zoom/parallax.
 *   4. First-time organic/direct — full cinematic, with a restrained Skip
 *      control appearing after a few seconds (never a tutorial wall, never
 *      trapping the visitor).
 * Runs in useLayoutEffect (not useEffect) so the skip decision lands before
 * the browser paints the newly-mounted (dynamically-imported) stage —
 * returning visitors shouldn't see even a one-frame flash of it.
 *
 * `hadSeenOnLoad` is captured once via a lazy useState initializer (reading
 * localStorage during render, before this component's own effect has ever
 * had a chance to write it) rather than re-read inside the effect. Reading
 * it inside the effect instead would self-sabotage under React 18 Strict
 * Mode's dev-only double effect invocation: the first invocation writes the
 * "seen" flag, and the second invocation (same mount) would then read its
 * own write back and wrongly conclude this first-time visitor is returning.
 */
export function useCinematicSkip() {
  const [hadSeenOnLoad] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem(SEEN_STORAGE_KEY) === 'true'
  );
  const [shouldAutoSkip, setShouldAutoSkip] = useState(false);
  const [isSkipControlVisible, setIsSkipControlVisible] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);

  useLayoutEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isIntentRouted = params.has('ref') || params.has('inv');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isIntentRouted || hadSeenOnLoad || prefersReducedMotion) {
      setShouldAutoSkip(true);
      setIsSkipped(true);
      return;
    }

    window.localStorage.setItem(SEEN_STORAGE_KEY, 'true');
    const timer = setTimeout(() => setIsSkipControlVisible(true), SKIP_CONTROL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hadSeenOnLoad]);

  const skip = () => setIsSkipped(true);

  return { shouldAutoSkip, isSkipControlVisible, isSkipped, skip };
}
