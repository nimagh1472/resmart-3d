/**
 * Lightweight procedural Web Audio API synthesizer — zero external mp3
 * assets, zero network/decode lag. Pure functions operating on an
 * AudioContext handed to them by the caller (see hooks/useSound.ts, which
 * owns the React-facing lifecycle: context creation/unlock behind a user
 * gesture, mute/suspend, and wiring these into the game loop).
 */

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

let sharedContext: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (sharedContext) return sharedContext;

  const AudioContextClass = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
  if (!AudioContextClass) return null;

  sharedContext = new AudioContextClass();
  return sharedContext;
}

export interface EngineNodes {
  oscillator: OscillatorNode;
  filter: BiquadFilterNode;
  gain: GainNode;
}

// Module-level (not per-caller) so every consumer drives the same single
// engine tone rather than each mounting its own oscillator.
let engineNodes: EngineNodes | null = null;

/** Creates (or returns the already-running) persistent engine drone oscillator. */
export function ensureEngineNodes(ctx: AudioContext): EngineNodes {
  if (engineNodes) return engineNodes;

  const oscillator = ctx.createOscillator();
  oscillator.type = 'sawtooth';
  oscillator.frequency.value = ENGINE_MIN_FREQUENCY;

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

/** Tears down the engine oscillator entirely (vehicle unmount / audio disabled). */
export function teardownEngineNodes(): void {
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

// Dynamic engine pitch range: idle-to-flat-out oscillates the drone's
// fundamental frequency across this band, tied directly to vehicle velocity.
export const ENGINE_MIN_FREQUENCY = 60;
export const ENGINE_MAX_FREQUENCY = 240;
export const ENGINE_BOOST_MAX_FREQUENCY = 280;

/**
 * Smoothly retunes the running engine drone's pitch/growl/volume from a
 * 0..1 fraction of top speed — setTargetAtTime glides the change instead of
 * stepping it, avoiding audible clicks every frame this is called from.
 */
export function updateEngineTone(ctx: AudioContext, nodes: EngineNodes, speedFraction: number, isBoosting: boolean): void {
  const clamped = Math.min(1, Math.max(0, speedFraction));
  const maxFrequency = isBoosting ? ENGINE_BOOST_MAX_FREQUENCY : ENGINE_MAX_FREQUENCY;
  const targetFrequency = ENGINE_MIN_FREQUENCY + clamped * (maxFrequency - ENGINE_MIN_FREQUENCY);
  const targetFilterFrequency = 300 + clamped * (isBoosting ? 1600 : 1100);
  const targetGain = clamped > 0.01 ? 0.025 + clamped * 0.05 : 0;

  nodes.oscillator.frequency.setTargetAtTime(targetFrequency, ctx.currentTime, 0.05);
  nodes.filter.frequency.setTargetAtTime(targetFilterFrequency, ctx.currentTime, 0.08);
  nodes.gain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.08);
}

interface PlayToneOptions {
  frequency?: number;
  durationMs?: number;
  gain?: number;
}

/** One-shot plain sine blip. */
export function playTone(ctx: AudioContext, { frequency = 440, durationMs = 120, gain = 0.05 }: PlayToneOptions = {}): void {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.frequency.value = frequency;
  gainNode.gain.value = gain;

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + durationMs / 1000);
}

/** Crash impact: a short exponentially-decaying burst of band-passed white noise. */
export function playCrashBurst(ctx: AudioContext): void {
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
}

// Checkpoint / voucher pickup chime: an octave-jump dual-tone sine sweep.
const CHIME_FREQUENCIES = [880, 1760];

/** High-pitched dual-tone sine chime (880Hz -> 1760Hz) for checkpoint/voucher pickups. */
export function playChimeBurst(ctx: AudioContext): void {
  CHIME_FREQUENCIES.forEach((frequency, index) => {
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
}
