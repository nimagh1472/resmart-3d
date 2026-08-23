import { useCallback, useEffect, useRef } from 'react';
import { useRoleStore } from '@/hooks/useRoleStore';
import {
  ensureEngineNodes,
  getAudioContext,
  playChimeBurst,
  playCrashBurst,
  playTone,
  teardownEngineNodes,
  updateEngineTone,
} from '@/utils/audio';

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
 *
 * The actual oscillator/noise-buffer synthesis lives in utils/audio.ts —
 * this hook only owns the React-facing lifecycle (unlock/mute state) and
 * forwards into it.
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
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'running') {
      ctx.suspend().catch(() => undefined);
    }
  }, [setAudioEnabled]);

  useEffect(() => {
    unlockedRef.current = isAudioEnabled;
  }, [isAudioEnabled]);

  const play = useCallback((options: PlayToneOptions = {}) => {
    if (!unlockedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;
    playTone(ctx, options);
  }, []);

  /** Starts the persistent engine drone. Idempotent — safe to call every time audio is (re-)unlocked. */
  const startEngine = useCallback(() => {
    if (!unlockedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;
    ensureEngineNodes(ctx);
  }, []);

  /** Tears down the engine oscillator entirely (call on unmount / when the vehicle stops existing). */
  const stopEngine = useCallback(() => {
    teardownEngineNodes();
  }, []);

  /** Dynamic engine pitch: retunes the running drone from the vehicle's current speed fraction (0..1) every frame. */
  const updateEnginePitch = useCallback((speedFraction: number, isBoosting: boolean) => {
    if (!unlockedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const nodes = ensureEngineNodes(ctx);
    updateEngineTone(ctx, nodes, speedFraction, isBoosting);
  }, []);

  /** Crisp procedural impact: a short decaying burst of band-passed white noise, fired from Vehicle.tsx's onCollisionEnter. */
  const playCrash = useCallback(() => {
    if (!unlockedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;
    playCrashBurst(ctx);
  }, []);

  /** High-pitched dual-tone (880Hz -> 1760Hz) pickup chime for cashback gems / voucher checkpoints. */
  const playChime = useCallback(() => {
    if (!unlockedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;
    playChimeBurst(ctx);
  }, []);

  return { isAudioEnabled, unlock, mute, play, startEngine, stopEngine, updateEnginePitch, playCrash, playChime };
}
