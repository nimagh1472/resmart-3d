'use client';

import type { LeadRole } from '@/types';

// 128x128 fractal-noise tile, rendered once as a data URI so the grain never
// depends on a network asset — see .noise-cyan below for how it's applied.
const NOISE_DATA_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

interface BackgroundVideoProps {
  persona?: LeadRole;
  /** True while Scene 07 (Investor Terminal) is scrolled into view — see app/page.tsx. */
  investorSceneInView?: boolean;
}

/**
 * Fixed Pure Obsidian background for the conversion section (Join the
 * Network + forms + footer) — a solid #050709 base with a soft cyan radial
 * glow and subtle grain. Replaces the old looping perspective-tunnel video,
 * which read as too busy/repetitive behind the lead capture forms. The glow
 * shifts to a warm gold cast (the "Private Intelligence Terminal"
 * environment) when either the persona switcher is set to 'investor' OR the
 * visitor has scrolled into Scene 07 — vs. the default cyan cast otherwise.
 */
export function BackgroundVideo({ persona, investorSceneInView }: BackgroundVideoProps) {
  const isInvestor = persona === 'investor' || Boolean(investorSceneInView);

  return (
    <>
      <div className="fixed inset-0 z-0 bg-[#050709]" />
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.04] mix-blend-overlay"
        style={{ backgroundImage: NOISE_DATA_URI }}
      />
      <div
        className={
          isInvestor
            ? 'pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.14),transparent_60%)] transition-opacity duration-700'
            : 'pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,245,212,0.09),transparent_60%)] transition-opacity duration-700'
        }
      />
      <div
        className={
          isInvestor
            ? 'pointer-events-none fixed inset-0 z-10 bg-gradient-to-b from-black/70 via-transparent to-[#0A0D0F] transition-colors duration-700'
            : 'pointer-events-none fixed inset-0 z-10 bg-gradient-to-b from-black/60 via-transparent to-[#0A0D0F] transition-colors duration-700'
        }
      />
    </>
  );
}
