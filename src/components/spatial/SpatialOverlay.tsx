'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import type { SpatialBeat } from '@/lib/spatialManifest';
import { useReducedFx } from '@/hooks/useReducedFx';

const TEAL = '0, 245, 212';

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/**
 * viewBox="0 0 100 100" with preserveAspectRatio="none" (needed so % coords
 * line up with screen %) stretches X and Y independently — a plain SVG
 * <circle> renders as an ellipse unless its radius is pre-corrected for the
 * container's actual aspect ratio. ry = rx * aspect makes it round again.
 */
function useViewportAspect(): number {
  const [aspect, setAspect] = useState(16 / 9);
  useEffect(() => {
    const update = () => setAspect(window.innerWidth / window.innerHeight);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return aspect;
}

interface Point {
  desktop: [number, number];
  mobile: [number, number];
}

function pick(point: Point, isDesktop: boolean): [number, number] {
  return isDesktop ? point.desktop : point.mobile;
}

// Approximate on-frame positions (% of frame), eyeballed from the actual
// artwork per breakpoint — each asset's mobile composition is a distinct
// authored recrop, not the desktop image cropped, so these deliberately
// differ rather than sharing one set of coordinates.
const INTENT_POINT: Point = { desktop: [42, 68], mobile: [55, 68] };
const SEARCH_POINT: Point = { desktop: [42, 68], mobile: [55, 68] };
const TRANSACTION_PATH = {
  desktop: [[35, 69], [57, 55]] as [[number, number], [number, number]],
  // Phone (bottom-left, screen ~32%,59%) to the CONFIRMED card's left edge (~54%,50%).
  mobile: [[32, 59], [54, 50]] as [[number, number], [number, number]],
};
const DELIVERY_PATH = {
  desktop: [[26, 69], [64, 32]] as [[number, number], [number, number]],
  // Car/driver handoff point (~58%,58%) to the DELIVERY CONFIRMED card (~46%,44%).
  mobile: [[58, 58], [46, 44]] as [[number, number], [number, number]],
};
const LIVE_BADGE: Point = { desktop: [95, 6], mobile: [82, 5.5] };

/**
 * Per-beat live accent layers. Several of the 9 approved renders already
 * bake in their own status UI (CONFIRMED cards, delivery beams, the
 * network dashboard) — this overlay's job is to add restrained motion
 * cues where the artwork is clean (Shopper Intent/Search have no baked
 * UI at all) and a touch of "it's alive" energy where the artwork
 * already carries the payoff (a traveling pulse along an already-baked
 * beam, not a second duplicate card).
 */
export function SpatialOverlay({
  beat,
  beatProgress,
  isDesktop,
}: {
  beat: SpatialBeat;
  beatProgress: number;
  isDesktop: boolean;
}) {
  const aspect = useViewportAspect();
  const reduceFx = useReducedFx();

  return (
    <>
      <div style={vignetteStyle} />
      {!reduceFx && (
        <svg width="100%" height="100%" style={overlayStyle} aria-hidden>
          <filter id="spatial-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#spatial-grain)" opacity="0.035" />
        </svg>
      )}

      {beat.overlay === 'pulse' && <PulseLayer beatProgress={beatProgress} aspect={aspect} reduceFx={reduceFx} />}
      {beat.overlay === 'intent' && (
        <GlowPoint point={pick(INTENT_POINT, isDesktop)} opacity={0.5 * smoothstep(beatProgress)} />
      )}
      {beat.overlay === 'search' && (
        <SearchRings point={pick(SEARCH_POINT, isDesktop)} beatProgress={beatProgress} aspect={aspect} reduceFx={reduceFx} />
      )}
      {beat.overlay === 'match-glow' && (
        <div
          style={{
            ...overlayStyle,
            background: `radial-gradient(circle at ${isDesktop ? '54% 18%' : '70% 27%'}, rgba(${TEAL},${0.22 * smoothstep(beatProgress)}) 0%, transparent 40%)`,
          }}
        />
      )}
      {beat.overlay === 'transaction-pulse' && (
        <TravelingPulse
          from={(isDesktop ? TRANSACTION_PATH.desktop : TRANSACTION_PATH.mobile)[0]}
          to={(isDesktop ? TRANSACTION_PATH.desktop : TRANSACTION_PATH.mobile)[1]}
          beatProgress={beatProgress}
          aspect={aspect}
        />
      )}
      {beat.overlay === 'chase-route' && (
        <ChaseRoute isDesktop={isDesktop} beatProgress={beatProgress} reduceFx={reduceFx} />
      )}
      {beat.overlay === 'delivery-pulse' && (
        <TravelingPulse
          from={(isDesktop ? DELIVERY_PATH.desktop : DELIVERY_PATH.mobile)[0]}
          to={(isDesktop ? DELIVERY_PATH.desktop : DELIVERY_PATH.mobile)[1]}
          beatProgress={beatProgress}
          aspect={aspect}
        />
      )}
      {beat.overlay === 'network-live' && <LiveBadgeDot point={pick(LIVE_BADGE, isDesktop)} beatProgress={beatProgress} />}
    </>
  );
}

function PulseLayer({
  beatProgress,
  aspect,
  reduceFx,
}: {
  beatProgress: number;
  aspect: number;
  reduceFx: boolean;
}) {
  // Three rings, phase-offset — a scroll-position-driven heartbeat rather
  // than an autoplay CSS keyframe loop, so it stays genuinely scroll-driven.
  // Skipped under reduceFx: a static glow reads as calmer anyway, and it's
  // the closest thing in this overlay set to a "particle trail" effect.
  const rings = reduceFx ? [] : [0, 0.34, 0.67].map((phase) => (beatProgress + phase) % 1);
  return (
    <svg width="100%" height="100%" style={overlayStyle} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <ellipse cx="50" cy="50" rx="1.4" ry={1.4 * aspect} fill={`rgba(${TEAL}, ${0.7 * smoothstep(beatProgress)})`} />
      {rings.map((r, i) => {
        const rx = 2 + r * 22;
        return (
          <ellipse
            key={i}
            cx="50"
            cy="50"
            rx={rx}
            ry={rx * aspect}
            fill="none"
            stroke={`rgba(${TEAL}, ${0.35 * (1 - r) * smoothstep(beatProgress)})`}
            strokeWidth="0.25"
          />
        );
      })}
    </svg>
  );
}

function GlowPoint({ point, opacity }: { point: [number, number]; opacity: number }) {
  const [x, y] = point;
  return (
    <div
      style={{
        ...overlayStyle,
        background: `radial-gradient(circle at ${x}% ${y}%, rgba(${TEAL},${opacity}) 0%, transparent 12%)`,
      }}
    />
  );
}

function SearchRings({
  point,
  beatProgress,
  aspect,
  reduceFx,
}: {
  point: [number, number];
  beatProgress: number;
  aspect: number;
  reduceFx: boolean;
}) {
  const [x, y] = point;
  const rings = reduceFx ? [] : [0, 0.5].map((phase) => (beatProgress + phase) % 1);
  return (
    <svg width="100%" height="100%" style={overlayStyle} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <ellipse cx={x} cy={y} rx="0.8" ry={0.8 * aspect} fill={`rgba(${TEAL}, ${0.6 * smoothstep(beatProgress)})`} />
      {rings.map((r, i) => {
        const rx = 0.8 + r * 6;
        return (
          <ellipse
            key={i}
            cx={x}
            cy={y}
            rx={rx}
            ry={rx * aspect}
            fill="none"
            stroke={`rgba(${TEAL}, ${0.4 * (1 - r) * smoothstep(beatProgress)})`}
            strokeWidth="0.15"
          />
        );
      })}
    </svg>
  );
}

function TravelingPulse({
  from,
  to,
  beatProgress,
  aspect,
}: {
  from: [number, number];
  to: [number, number];
  beatProgress: number;
  aspect: number;
}) {
  const t = smoothstep(beatProgress);
  const x = from[0] + (to[0] - from[0]) * t;
  const y = from[1] + (to[1] - from[1]) * t;
  return (
    <svg width="100%" height="100%" style={overlayStyle} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <ellipse
        cx={x}
        cy={y}
        rx="0.9"
        ry={0.9 * aspect}
        fill={`rgba(${TEAL}, 0.85)`}
        opacity={t > 0.02 && t < 0.98 ? 1 : 0}
      />
    </svg>
  );
}

function ChaseRoute({
  isDesktop,
  beatProgress,
  reduceFx,
}: {
  isDesktop: boolean;
  beatProgress: number;
  reduceFx: boolean;
}) {
  // Traces the open, visibly-empty road to the car's left (desktop) or
  // ahead of it (mobile) — not through the vehicle itself. The dash
  // offset animates continuously under normal conditions (a moving
  // "trail"); frozen under reduceFx to a static route line instead.
  const d = isDesktop ? 'M 18 96 Q 26 78 34 52' : 'M 22 96 Q 28 78 34 58';
  return (
    <svg width="100%" height="100%" style={overlayStyle} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <path
        d={d}
        fill="none"
        stroke={`rgba(${TEAL}, 0.55)`}
        strokeWidth="0.3"
        strokeDasharray="1.2 1.6"
        strokeDashoffset={reduceFx ? 0 : -beatProgress * 12}
      />
    </svg>
  );
}

function LiveBadgeDot({ point, beatProgress }: { point: [number, number]; beatProgress: number }) {
  const [x, y] = point;
  const blink = 0.5 + 0.5 * Math.sin(beatProgress * 26);
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: `rgba(52, 211, 153, ${0.5 + 0.5 * blink})`,
        boxShadow: `0 0 6px rgba(52,211,153,${0.6 * blink})`,
        pointerEvents: 'none',
      }}
    />
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
    'radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,0.5) 100%), linear-gradient(rgba(0,0,0,0.2), transparent 20%, transparent 75%, rgba(0,0,0,0.4))',
};
