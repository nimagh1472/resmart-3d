'use client';

import type { CSSProperties } from 'react';
import type { SceneDefinition } from '@/lib/cinematicManifest';

/**
 * A persistent film-grade layer (vignette + fine grain) plus a couple of
 * restrained per-scene accents. The 7 approved renders already bake in
 * their own UI/branding (search halo, merchant dashboard, network graph) —
 * so this overlay's job is unifying disparate AI-generated frames into one
 * continuous "film" (consistent edge darkening + grain across every scene)
 * rather than re-drawing on top of art that already has it, which is what
 * would make the intro read as a slideshow of separate images.
 */
export function EffectsOverlay({ scene, progress }: { scene: SceneDefinition; progress: number }) {
  if (scene.key === 'black') return null;

  return (
    <>
      <div style={vignetteStyle} />
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

      {scene.key === 'climax' && (
        <div
          style={{
            ...overlayStyle,
            background: `radial-gradient(circle at 50% 42%, rgba(${255},${255},${255},${0.12 * Math.sin(progress * Math.PI)}) 0%, transparent 60%)`,
            mixBlendMode: 'screen',
          }}
        />
      )}

      {scene.key === 'silence' && (
        <div
          style={{
            ...overlayStyle,
            background: '#050709',
            opacity: 0.35 * progress,
          }}
        />
      )}
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
