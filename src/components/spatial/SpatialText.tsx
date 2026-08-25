'use client';

import type { CSSProperties } from 'react';
import type { SpatialBeat } from '@/lib/spatialManifest';
import type { LeadRole } from '@/types';

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

const PERSONAS: { label: string; role: LeadRole }[] = [
  { label: 'SHOP', role: 'shopper' },
  { label: 'SELL', role: 'merchant' },
  { label: 'DRIVE', role: 'driver' },
  { label: 'INVEST', role: 'investor' },
];

/**
 * Typographic beats — "THIS IS RESMART." and the closing persona choices.
 * The persona tiles call onSelectPersona (wired by SpatialStage to the
 * homepage's existing persona state/investor modal) — this is the one
 * point where Spatial V2 hands off into the real funnels.
 */
export function SpatialText({
  beat,
  beatProgress,
  onSelectPersona,
}: {
  beat: SpatialBeat;
  beatProgress: number;
  onSelectPersona?: (role: LeadRole) => void;
}) {
  if (beat.overlay === 'brand-text') {
    const rise = smoothstep(beatProgress / 0.3);
    const fall = beatProgress > 0.85 ? 1 - smoothstep((beatProgress - 0.85) / 0.15) : 1;
    const opacity = Math.min(rise, fall);
    return (
      <div style={containerStyle}>
        <p
          style={{
            fontFamily: 'ui-serif, Georgia, serif',
            color: '#F8FAFC',
            fontSize: 'clamp(2.625rem, 8vw, 6rem)',
            letterSpacing: '0.02em',
            opacity: opacity * 0.95,
            transform: `translateY(${8 * (1 - rise)}px) scale(${0.97 + 0.03 * rise})`,
            margin: 0,
            textAlign: 'center',
            padding: '0 24px',
          }}
        >
          THIS IS RESMART.
        </p>
      </div>
    );
  }

  if (beat.overlay === 'persona-grid') {
    const rise = smoothstep(beatProgress / 0.35);
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', opacity: rise, transform: `translateY(${10 * (1 - rise)}px)` }}>
          <p
            style={{
              fontFamily: 'ui-serif, Georgia, serif',
              color: 'rgba(248,250,252,0.7)',
              fontSize: '0.85rem',
              letterSpacing: '0.15em',
              marginBottom: 28,
            }}
          >
            THE INTELLIGENCE LAYER FOR DUBAI COMMERCE.
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 16,
              padding: '0 24px',
            }}
          >
            {PERSONAS.map(({ label, role }, i) => (
              <button
                key={label}
                type="button"
                onClick={() => onSelectPersona?.(role)}
                style={{
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: 999,
                  padding: '14px 30px',
                  color: '#F8FAFC',
                  fontFamily: 'ui-serif, Georgia, serif',
                  fontSize: '1rem',
                  letterSpacing: '0.08em',
                  background: 'rgba(5,7,9,0.35)',
                  backdropFilter: 'blur(4px)',
                  opacity: smoothstep((beatProgress - i * 0.06) / 0.3),
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

const containerStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
};
