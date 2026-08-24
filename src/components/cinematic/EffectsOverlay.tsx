'use client';

import type { CSSProperties } from 'react';
import { SCENES, type SceneDefinition } from '@/lib/cinematicManifest';

const TEAL = '0, 245, 212';

// Every scene cut where the underlying media slot actually changes (NOT
// every scene.start — Scene 07→08 and Scene 09→10 share the same slot and
// are meant to read as one unbroken shot, so they're deliberately excluded
// here; a darkening pulse in the middle of those would itself be the
// "obvious transition" this is meant to avoid). Used to place a brief,
// subtle darkening "breath" across each real transition — a cheap stand-in
// for a camera exposure/focus settle that helps disguise the joint between
// two differently-lit source images, instead of a bare hard dissolve.
const SCENE_BOUNDARIES = SCENES.slice(1)
  .filter((scene, i) => {
    const prevIds = new Set(SCENES[i].media.map((m) => m.id));
    const currIds = new Set(scene.media.map((m) => m.id));
    return prevIds.size !== currIds.size || Array.from(currIds).some((id) => !prevIds.has(id));
  })
  .map((scene) => scene.start);

// Approximate on-frame positions (% of viewport) of a handful of the
// living-ai-network.png's baked node icons, eyeballed from the artwork —
// intentionally a subset ("only selected major paths/nodes", per brief),
// not all ten, so the network doesn't get more UI than the art already
// carries. Each glow "activates" in sequence as Scene 07 plays, so the
// city visibly becomes the network progressively rather than all at once.
const NETWORK_GLOW_NODES = [
  { x: 22.8, y: 18.9, activateAt: 0 }, // Merchants
  { x: 77.5, y: 23.9, activateAt: 0.14 }, // Customers
  { x: 10, y: 35, activateAt: 0.28 }, // Smart Delivery
  { x: 13.1, y: 48.9, activateAt: 0.42 }, // Drivers
  { x: 86.6, y: 41.7, activateAt: 0.56 }, // Cashback & Rewards
];

// A few slow, faint drifting motes for pseudo-depth — atmosphere, not
// decoration. Fixed/deterministic layout (not Math.random()) so it's
// reproducible across renders. Confined to the sequence's energetic body
// (Scenes 02-06); switched off for the network/climax (which have their
// own glow system) and the quiet black/silence/brand-reveal beats.
const PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  x: 12 + ((i * 41) % 80),
  y: 15 + ((i * 67) % 70),
  size: 2 + (i % 3),
  duration: 14 + (i % 5) * 3,
  delay: -(i * 2.3),
}));

const PARTICLE_SCENES = new Set(['dubai-reveal', 'vehicle', 'shopper-intent', 'merchant-activation', 'delivery']);

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

const NETWORK_WINDOW_START = SCENES.find((s) => s.key === 'living-network')!.start; // 20
const NETWORK_WINDOW_END = SCENES.find((s) => s.key === 'climax')!.end; // 25

/**
 * Network envelope across the combined Scene 07+08 window (0..1): rises as
 * nodes activate through Scene 07, holds through most of Climax, then
 * collapses to 0 in Climax's final stretch — "network energy
 * collapses/fades" right before the cut to Silence, rather than the glow
 * simply vanishing with the hard scene cut.
 */
function networkEnvelope(windowT: number): number {
  if (windowT < 0.6) return smoothstep(windowT / 0.6);
  if (windowT < 0.82) return 1;
  return 1 - smoothstep((windowT - 0.82) / 0.18);
}

/**
 * A persistent film-grade layer (vignette + fine grain + transition
 * "breath") plus a couple of restrained per-scene accents. The 7 approved
 * renders already bake in their own UI/branding (search halo, merchant
 * dashboard, network graph) — so most of this overlay's job is unifying
 * disparate AI-generated frames into one continuous "film" rather than
 * re-drawing on top of art that already has it.
 */
export function EffectsOverlay({
  scene,
  progress,
  elapsed,
}: {
  scene: SceneDefinition;
  progress: number;
  elapsed: number;
}) {
  if (scene.key === 'black') return null;

  const nearestBoundaryDistance = Math.min(...SCENE_BOUNDARIES.map((t) => Math.abs(t - elapsed)));
  const transitionBreath = 1 - smoothstep(nearestBoundaryDistance / 0.7);

  const isNetworkMoment = scene.key === 'living-network' || scene.key === 'climax';
  const networkWindowT = isNetworkMoment
    ? clamp01((elapsed - NETWORK_WINDOW_START) / (NETWORK_WINDOW_END - NETWORK_WINDOW_START))
    : 0;
  const envelope = isNetworkMoment ? networkEnvelope(networkWindowT) : 0;

  return (
    <>
      <div style={vignetteStyle} />
      <div style={{ ...overlayStyle, background: '#000', opacity: transitionBreath * 0.16 }} />

      {/* width/height="100%" attributes are required here, not just the CSS
          inset:0 in overlayStyle — an <svg> without them is a replaced
          element that falls back to its intrinsic 300x150 default box
          instead of stretching, silently clipping the grain to a
          top-left corner. */}
      <svg width="100%" height="100%" style={overlayStyle} aria-hidden>
        <filter id="cinematic-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#cinematic-grain)" opacity="0.035" />
      </svg>

      {PARTICLE_SCENES.has(scene.key) &&
        PARTICLES.map((p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.5)',
              filter: 'blur(0.5px)',
              pointerEvents: 'none',
              animation: `cinematic-drift ${p.duration}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        ))}

      {isNetworkMoment &&
        NETWORK_GLOW_NODES.map((node, i) => {
          const localOpacity = envelope * smoothstep((networkWindowT - node.activateAt) / 0.16) * 0.4;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${node.x}%`,
                top: `${node.y}%`,
                width: 34,
                height: 34,
                marginLeft: -17,
                marginTop: -17,
                borderRadius: '50%',
                background: `radial-gradient(circle, rgba(${TEAL},${localOpacity}) 0%, transparent 72%)`,
                filter: 'blur(1.5px)',
                mixBlendMode: 'screen',
                pointerEvents: 'none',
              }}
            />
          );
        })}

      {scene.key === 'climax' && (
        <div
          style={{
            ...overlayStyle,
            background: `radial-gradient(circle at 50% 42%, rgba(255,255,255,${0.14 * Math.sin(progress * Math.PI) * envelope}) 0%, transparent 60%)`,
            mixBlendMode: 'screen',
          }}
        />
      )}

      {scene.key === 'silence' && (
        <div
          style={{
            ...overlayStyle,
            background: '#050709',
            opacity: 0.5 * smoothstep(progress),
          }}
        />
      )}

      <style>{`
        @keyframes cinematic-drift {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 0.5; }
          90% { opacity: 0.5; }
          100% { transform: translateY(-26px) translateX(6px); opacity: 0; }
        }
      `}</style>
    </>
  );
}

const overlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
};

const vignetteStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  background:
    'radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,0.55) 100%), linear-gradient(rgba(0,0,0,0.25), transparent 20%, transparent 75%, rgba(0,0,0,0.45))',
};
