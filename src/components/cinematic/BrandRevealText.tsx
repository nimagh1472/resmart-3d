'use client';

// Matches Hero.tsx's existing STRUCTURAL_MOTTO exactly — direct continuity
// with the live business site's copy, not a new line invented here.
const STRUCTURAL_MOTTO = 'The intelligence layer for Dubai commerce.';

const BEATS = [
  { text: 'THIS IS RESMART.', from: 0, to: 0.4 },
  { text: 'Search. Match. Transact. Fulfill.', from: 0.4, to: 0.75 },
  { text: STRUCTURAL_MOTTO, from: 0.75, to: 1 },
];

/**
 * Scene 10's three-beat reveal — minimal typography, no visual clutter,
 * per the brief. Beats are driven by the scene's own progress (0-1) rather
 * than a separate timer, so it stays in lockstep with useCinematicClock
 * (including the ?cinematicTime QA override).
 */
export function BrandRevealText({ progress }: { progress: number }) {
  const activeBeat = BEATS.find((beat) => progress >= beat.from && progress < beat.to) ?? BEATS[BEATS.length - 1];

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
      <p
        key={activeBeat.text}
        style={{
          fontFamily: 'ui-serif, Georgia, serif',
          color: '#F8FAFC',
          fontSize: activeBeat === BEATS[0] ? '2.5rem' : '1.25rem',
          letterSpacing: activeBeat === BEATS[0] ? '0.02em' : '0.05em',
          opacity: 0.95,
          animation: 'cinematic-text-fade-in 0.6s ease',
          margin: 0,
        }}
      >
        {activeBeat.text}
      </p>
      <style>{`
        @keyframes cinematic-text-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 0.95; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
