'use client';

interface InvestorStoryProps {
  /** Wired to the homepage's real InvestorAccessModal in production; omitted (inert) in /lab/home-v2 QA. */
  onOpenInvestorAccess?: () => void;
}

/**
 * Homepage V2 — Investor. Copy matches Hero.tsx's existing investor
 * persona content verbatim (no invented financial claims); the CTA opens
 * the homepage's existing InvestorAccessModal in production.
 */
export function InvestorStory({ onOpenInvestorAccess }: InvestorStoryProps) {
  return (
    <section className="relative flex h-screen w-full flex-col items-center justify-center gap-10 bg-[#050709] px-6 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-white/50">Investor</p>
      <h2
        style={{ fontFamily: 'ui-serif, Georgia, serif' }}
        className="max-w-2xl text-2xl leading-snug text-white sm:text-4xl"
      >
        The AI commerce &amp; logistics infrastructure for Dubai.
      </h2>
      <button
        type="button"
        onClick={() => onOpenInvestorAccess?.()}
        className="glass-pill px-8 py-4 text-xs font-medium uppercase tracking-[0.25em] text-cyan-300"
      >
        Request Private Data Room Access
      </button>
    </section>
  );
}
