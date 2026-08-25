'use client';

import { SPATIAL_ASSETS } from '@/lib/spatialAssets';
import { useIsDesktopViewport } from '@/hooks/useIsDesktopViewport';

interface InvestorStoryProps {
  /** Wired to the homepage's real InvestorAccessModal in production; omitted (inert) in /lab/home-v2 QA. */
  onOpenInvestorAccess?: () => void;
}

/**
 * Homepage V2 — Investor. Copy matches Hero.tsx's existing investor
 * persona content verbatim (no invented financial claims); the CTA opens
 * the homepage's existing InvestorAccessModal in production. Background
 * is Signature Dubai again — the same asset that opened Homepage V2 at
 * the Gateway, now under a much darker treatment for the closing beat.
 */
export function InvestorStory({ onOpenInvestorAccess }: InvestorStoryProps) {
  const isDesktop = useIsDesktopViewport();
  const url = SPATIAL_ASSETS.signature[isDesktop ? 'desktop' : 'mobile'];

  return (
    <section className="relative flex h-screen w-full flex-col items-center justify-center gap-10 overflow-hidden bg-[#050709] px-6 text-center">
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="h-full w-full object-cover opacity-40" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/75 to-black" />

      <p className="relative z-10 text-xs font-medium uppercase tracking-[0.3em] text-white/50">Investor</p>
      <h2
        style={{ fontFamily: 'ui-serif, Georgia, serif', fontSize: 'clamp(2.625rem, 7vw, 5rem)' }}
        className="relative z-10 max-w-3xl leading-snug text-white"
      >
        The AI commerce &amp; logistics infrastructure for Dubai.
      </h2>
      <button
        type="button"
        onClick={() => onOpenInvestorAccess?.()}
        className="glass-pill relative z-10 px-8 py-4 text-xs font-medium uppercase tracking-[0.25em] text-cyan-300"
      >
        Request Private Data Room Access
      </button>
    </section>
  );
}
