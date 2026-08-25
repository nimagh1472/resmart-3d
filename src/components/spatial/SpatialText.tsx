'use client';

import type { CSSProperties } from 'react';
import { Briefcase, ShoppingBag, Store, Truck } from 'lucide-react';
import type { SpatialBeat } from '@/lib/spatialManifest';
import type { LeadRole } from '@/types';

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/**
 * Dark radial scrim behind centered headline typography — lifts contrast
 * against busy baked-in imagery (network dashboards, hero logos/taglines)
 * without a hard-edged box. Opacity is passed in so it fades in/out in
 * lockstep with the text it sits behind.
 */
function TextScrim({ opacity }: { opacity: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'radial-gradient(ellipse 65% 40% at 50% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.28) 45%, transparent 75%)',
        opacity,
      }}
    />
  );
}

const PERSONAS: { label: string; role: LeadRole; description: string; icon: typeof ShoppingBag }[] = [
  { label: 'SHOP', role: 'shopper', description: 'AI-matched deals, nearby, in real time.', icon: ShoppingBag },
  { label: 'SELL', role: 'merchant', description: 'Get found by AI buyers. 0% commission.', icon: Store },
  { label: 'DRIVE', role: 'driver', description: 'AI-dispatched routes. Zero commission.', icon: Truck },
  { label: 'INVEST', role: 'investor', description: 'Confidential data room & seed model.', icon: Briefcase },
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
        <TextScrim opacity={opacity} />
        <p
          style={{
            position: 'relative',
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

  // Bridges Living Network's dashboard into the brand statement — fades out
  // just as brand-text fades in (0.7-1.0 here hands off to 0-0.3 there) so
  // the two headlines never show at once against the shared signature image.
  // The rise is held at 0 until beatProgress 0.16: SpatialLayer crossfades
  // the outgoing NETWORK_SLOT dashboard image on a real-time 1.6s CSS
  // transition (SpatialLayer.tsx), decoupled from scroll progress — this
  // delay gives that fade a moment to clear before new text starts rising,
  // so the baked "LIVING AI NETWORK" dashboard and this headline never
  // overlap.
  if (beat.key === 'signature') {
    const rise = beatProgress < 0.16 ? 0 : smoothstep((beatProgress - 0.16) / 0.3);
    const fall = beatProgress > 0.72 ? 1 - smoothstep((beatProgress - 0.72) / 0.28) : 1;
    const opacity = Math.min(rise, fall);
    return (
      <div style={containerStyle}>
        <TextScrim opacity={opacity} />
        <p
          style={{
            position: 'relative',
            fontFamily: 'ui-serif, Georgia, serif',
            color: 'rgba(248,250,252,0.85)',
            fontSize: 'clamp(1.4rem, 4vw, 2.5rem)',
            letterSpacing: '0.06em',
            opacity: opacity * 0.9,
            margin: 0,
            textAlign: 'center',
            padding: '0 24px',
          }}
        >
          ALREADY CONNECTED.
          <br />
          NOW MAKE IT INTELLIGENT.
        </p>
      </div>
    );
  }

  if (beat.overlay === 'brand-text') {
    const rise = smoothstep(beatProgress / 0.35);
    const fall = beatProgress > 0.82 ? 1 - smoothstep((beatProgress - 0.82) / 0.18) : 1;
    const opacity = Math.min(rise, fall);
    return (
      <div style={containerStyle}>
        <TextScrim opacity={opacity} />
        <p
          style={{
            position: 'relative',
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
              marginBottom: 'clamp(16px, 4vh, 28px)',
            }}
          >
            THE INTELLIGENCE LAYER FOR DUBAI COMMERCE.
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              rowGap: 'clamp(12px, 3vh, 18px)',
              columnGap: 12,
              padding: '0 24px',
              maxWidth: 720,
            }}
          >
            {PERSONAS.map(({ label, role, description, icon: Icon }, i) => (
              <button
                key={label}
                type="button"
                onClick={() => onSelectPersona?.(role)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'clamp(6px, 1.5vh, 8px)',
                  width: 156,
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 20,
                  padding: 'clamp(16px, 4vh, 22px) 16px',
                  color: '#F8FAFC',
                  background: 'rgba(13,17,23,0.55)',
                  backdropFilter: 'blur(6px)',
                  boxShadow: '0 20px 40px -16px rgba(0,0,0,0.55)',
                  opacity: smoothstep((beatProgress - i * 0.06) / 0.3),
                  transform: `translateY(${8 * (1 - smoothstep((beatProgress - i * 0.06) / 0.3))}px)`,
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  transition: 'border-color 0.2s ease, background 0.2s ease',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.borderColor = 'rgba(0,245,212,0.5)';
                  event.currentTarget.style.background = 'rgba(0,245,212,0.08)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)';
                  event.currentTarget.style.background = 'rgba(13,17,23,0.55)';
                }}
              >
                <Icon size={22} color="#00F5D4" />
                <span
                  style={{
                    fontFamily: 'ui-serif, Georgia, serif',
                    fontSize: '1rem',
                    letterSpacing: '0.08em',
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    lineHeight: 1.4,
                    color: 'rgba(248,250,252,0.6)',
                  }}
                >
                  {description}
                </span>
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
