'use client';

import { useEffect, useRef, useState } from 'react';
import { SOUND_CUES } from '@/lib/soundCues';

/**
 * Sound ARCHITECTURE only — no audio files exist yet (see soundCues.ts).
 * Respects browser autoplay policy: starts muted, and only ever attempts
 * to unmute/play after a real user gesture (click/keydown/touchstart),
 * never on mount. Enhances the experience without being necessary to
 * understand it — this hook's absence of real audio files today should
 * not visibly degrade anything.
 */
export function useCinematicAudio(activeSceneKey: string) {
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    const markInteracted = () => setHasUserInteracted(true);
    window.addEventListener('click', markInteracted, { once: true });
    window.addEventListener('keydown', markInteracted, { once: true });
    window.addEventListener('touchstart', markInteracted, { once: true });
    return () => {
      window.removeEventListener('click', markInteracted);
      window.removeEventListener('keydown', markInteracted);
      window.removeEventListener('touchstart', markInteracted);
    };
  }, []);

  useEffect(() => {
    if (!hasUserInteracted || isMuted) return;
    const cue = SOUND_CUES.find((candidate) => candidate.scenes.includes(activeSceneKey));
    if (!cue) return;
    // No audio source is wired up yet — this only logs which cue WOULD
    // play, so the architecture is verifiable ahead of real files landing.
    console.info(`[cinematic-audio] would play cue "${cue.id}" (${cue.label}) for scene "${activeSceneKey}"`);
  }, [activeSceneKey, hasUserInteracted, isMuted]);

  const toggleMute = () => setIsMuted((prev) => !prev);

  return { hasUserInteracted, isMuted, toggleMute, audioElementsRef };
}
