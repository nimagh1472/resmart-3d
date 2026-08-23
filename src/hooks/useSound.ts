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

interface EngineNodes {
  oscillator: OscillatorNode;
  filter: BiquadFilterNode;
  gain: GainNode;
}

// Module-level (not per-hook-instance) so every useSound() caller drives the
// same single engine tone rather than each mounting its own oscillator.
let engineNodes: EngineNodes | null = null;

function ensureEngineNodes(ctx: AudioContext): EngineNodes {
  if (engineNodes) return engineNodes;

  const oscillator = ctx.createOscillator();
  oscillator.type = 'sawtooth';
  oscillator.frequency.value = 55;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 300;

  const gain = ctx.createGain();
  gain.gain.value = 0;

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();

  engineNodes = { oscillator, filter, gain };
  return engineNodes;
}

function teardownEngineNodes() {
  if (!engineNodes) return;
  const { oscillator, filter, gain } = engineNodes;
  try {
    oscillator.stop();
  } catch {
    // already stopped — nothing to clean up
  }
  oscillator.disconnect();
  filter.disconnect();
  gain.disconnect();
  engineNodes = null;
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

  /**
   * Smoothly retunes the running engine drone's pitch/growl/volume from a
   * 0..1 fraction of top speed — setTargetAtTime glides the change instead
   * of stepping it, avoiding audible clicks every frame.
   */
  const updateEnginePitch = useCallback((speedFraction: number, isBoosting: boolean) => {
    if (!unlockedRef.current || !engineNodes) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const clamped = Math.min(1, Math.max(0, speedFraction));
    const targetFrequency = 55 + clamped * (isBoosting ? 260 : 170);
    const targetFilterFrequency = 300 + clamped * (isBoosting ? 1600 : 1100);
    const targetGain = clamped > 0.01 ? 0.025 + clamped * 0.05 : 0;

    engineNodes.oscillator.frequency.setTargetAtTime(targetFrequency, ctx.currentTime, 0.05);
    engineNodes.filter.frequency.setTargetAtTime(targetFilterFrequency, ctx.currentTime, 0.08);
    engineNodes.gain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.08);
  }, []);

  /** Crisp procedural impact: a short decaying burst of band-passed white noise. */
  const playCrash = useCallback(() => {
    if (!unlockedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    const durationSeconds = 0.18;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * durationSeconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 850;
    filter.Q.value = 0.6;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSeconds);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + durationSeconds);
  }, []);

  /** High-pitched two-note pickup chime for cashback gems / voucher checkpoints. */
  const playChime = useCallback(() => {
    if (!unlockedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    [1400, 1900].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;

      const gainNode = ctx.createGain();
      const startTime = ctx.currentTime + index * 0.08;
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.12, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.22);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.25);
    });
  }, []);

  return { isAudioEnabled, unlock, mute, play, startEngine, stopEngine, updateEnginePitch, playCrash, playChime };
}
