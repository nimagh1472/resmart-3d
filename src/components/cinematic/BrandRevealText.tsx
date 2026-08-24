'use client';

// Matches Hero.tsx's existing STRUCTURAL_MOTTO exactly — direct continuity
// with the live business site's copy, not a new line invented here.
const STRUCTURAL_MOTTO = 'The intelligence layer for Dubai commerce.';

const BEATS = [
  { text: 'THIS IS RESMART.', from: 0, to: 0.4 },
  { text: 'Search. Match. Transact. Fulfill.', from: 0.4, to: 0.75 },
  { text: STRUCTURAL_MOTTO, from: 0.75, to: 1 },
];

// Crossfade half-width, in scene-progress units (~0.4s on the 4s scene) —
// beat i's fade-out and beat i+1's fade-in are centered on the same
// boundary, so one dissolves into the next instead of hard-cutting.
const RAMP = 0.1;

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function computeBeatState(beat: (typeof BEATS)[number], isFirst: boolean, isLast: boolean, progress: number) {
  const riseStart = isFirst ? beat.from : beat.from - RAMP;
  const riseEnd = beat.from + RAMP;
  const rise = smoothstep((progress - riseStart) / (riseEnd - riseStart));
  let opacity = rise;
  if (!isLast) {
    const fallStart = beat.to - RAMP;
    const fallEnd = beat.to + RAMP;
    const fall = 1 - smoothstep((progress - fallStart) / (fallEnd - fallStart));
    opacity = Math.min(rise, fall);
  }
  return { opacity, translateY: 8 * (1 - rise), scale: 0.97 + 0.03 * rise };
}

/**
 * Scene 10's three-beat reveal — minimal typography, no visual clutter,
 * per the brief. Beats are driven by the scene's own progress (0-1) rather
 * than a separate timer, so it stays in lockstep with useCinematicClock
 * (including the ?cinematicTime QA override). All three beats render
 * simultaneously (stacked, opacity-driven) rather than key-swapping the
 * active one, so consecutive beats cross-dissolve instead of the outgoing
 * line vanishing instantly while the incoming one fades in.
 */
export function BrandRevealText({ progress }: { progress: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '0 24px',
        pointerEvents: 'none',
      }}
    >
      {BEATS.map((beat, i) => {
        const isFirst = i === 0;
        const isLast = i === BEATS.length - 1;
        const { opacity, translateY, scale } = computeBeatState(beat, isFirst, isLast, progress);
        if (opacity <= 0.001) return null;
        return (
          <p
            key={beat.text}
            style={{
              position: 'absolute',
              fontFamily: 'ui-serif, Georgia, serif',
              color: '#F8FAFC',
              fontSize: isFirst ? '2.5rem' : '1.25rem',
              letterSpacing: isFirst ? '0.02em' : '0.05em',
              opacity: opacity * 0.95,
              transform: `translateY(${translateY}px) scale(${scale})`,
              margin: 0,
            }}
          >
            {beat.text}
          </p>
        );
      })}
    </div>
  );
}
