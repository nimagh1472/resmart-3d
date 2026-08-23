import { useCallback, useEffect, useRef } from 'react';
import { useRoleStore } from '@/hooks/useRoleStore';

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (sharedContext) return sharedContext;

  const AudioContextClass = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
  if (!AudioContextClass) return null;

  sharedContext = new AudioContextClass();
  return sharedContext;
}

interface PlayToneOptions {
  frequency?: number;
  durationMs?: number;
  gain?: number;
}

/**
 * Manages Web Audio safely under browser autoplay policy: the AudioContext
 * is only created/resumed in response to a real user gesture, never on
 * mount. `unlock()` should be wired directly to a click/tap handler (e.g.
 * RoleSelector's buttons); `play()` is a no-op until that has happened, and
 * `mute()` suspends playback again without tearing the context down.
 */
export function useSound() {
  const isAudioEnabled = useRoleStore((state) => state.isAudioEnabled);
  const setAudioEnabled = useRoleStore((state) => state.setAudioEnabled);
  const unlockedRef = useRef(false);

  const unlock = useCallback(async () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => undefined);
    }

    unlockedRef.current = ctx.state === 'running';
    setAudioEnabled(unlockedRef.current);
  }, [setAudioEnabled]);

  const mute = useCallback(() => {
    unlockedRef.current = false;
    setAudioEnabled(false);
    if (sharedContext && sharedContext.state === 'running') {
      sharedContext.suspend().catch(() => undefined);
    }
  }, [setAudioEnabled]);

  useEffect(() => {
    unlockedRef.current = isAudioEnabled;
  }, [isAudioEnabled]);

  const play = useCallback(
    ({ frequency = 440, durationMs = 120, gain = 0.05 }: PlayToneOptions = {}) => {
      if (!unlockedRef.current) return;
      const ctx = getAudioContext();
      if (!ctx || ctx.state !== 'running') return;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.frequency.value = frequency;
      gainNode.gain.value = gain;

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start();
      oscillator.stop(ctx.currentTime + durationMs / 1000);
    },
    [],
  );

  return { isAudioEnabled, unlock, mute, play };
}
