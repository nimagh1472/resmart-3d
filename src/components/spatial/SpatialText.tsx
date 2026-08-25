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
  // A held breath under the reveal — quiet, small, not a headline moment.
  if (beat.key === 'dubai') {
    const opacity = smoothstep((beatProgress - 0.35) / 0.3) * (1 - smoothstep((beatProgress - 0.85) / 0.15));
    return (
      <div style={containerStyle}>
        <p
          style={{
            fontFamily: 'ui-serif, Georgia, serif',
            fontStyle: 'italic',
            color: 'rgba(248,250,252,0.75)',
            fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
            opacity,
            margin: 0,
            textAlign: 'center',
            padding: '0 24px',
          }}
        >
          Someone wants something.
        </p>
      </div>
    );
  }

  // A restrained HUD-style match readout, not a dashboard card — sits near
  // the storefront glow this beat's overlay already highlights.
  if (beat.key === 'merchant-match') {
    const opacity = smoothstep(beatProgress / 0.4);
    return (
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '30%',
          transform: 'translate(-50%, 0)',
          textAlign: 'center',
          opacity,
          pointerEvents: 'none',
        }}
      >
        <p
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            color: '#00F5D4',
            fontSize: '0.9rem',
            letterSpacing: '0.15em',
            margin: 0,
          }}
        >
          FOUND.
        </p>
        <p
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            color: 'rgba(248,250,252,0.75)',
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
            margin: '4px 0 0',
          }}
        >
          MATCH 01 · 1.2 KM · IN STOCK
        </p>
      </div>
    );
  }

  // The scale statement bridging one transaction into the city-wide network
  // — placed on Pullback only, before Living Network's own dense dashboard.
  if (beat.key === 'pullback') {
    const rise = smoothstep(beatProgress / 0.3);
    const fall = beatProgress > 0.8 ? 1 - smoothstep((beatProgress - 0.8) / 0.2) : 1;
    const opacity = Math.min(rise, fall);
    return (
      <div style={containerStyle}>
        <p
          style={{
            fontFamily: 'ui-serif, Georgia, serif',
            color: '#F8FAFC',
            fontSize: 'clamp(1.5rem, 4vw, 2.75rem)',
            letterSpacing: '0.01em',
            opacity: opacity * 0.95,
            margin: 0,
            textAlign: 'center',
            padding: '0 24px',
          }}
        >
          One request. One of thousands.
        </p>
      </div>
    );
  }

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
