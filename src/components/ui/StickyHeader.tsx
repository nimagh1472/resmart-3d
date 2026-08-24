'use client';

import { Briefcase, Sparkles } from 'lucide-react';
import { LAUNCH_TIMESTAMP, padCountdownValue, useCountdown } from '@/hooks/useCountdown';

interface StickyHeaderProps {
  onOpenInvestorAccess: () => void;
}

/**
 * Minimalist glassmorphism top bar: wordmark, a compact launch countdown,
 * and the "Investor Access" CTA — the single header-level entry point into
 * the Investor Access modal, always reachable regardless of scroll position.
 */
export function StickyHeader({ onOpenInvestorAccess }: StickyHeaderProps) {
  const countdown = useCountdown(LAUNCH_TIMESTAMP);

  return (
    <header className="glass-pill pointer-events-auto sticky top-4 z-30 mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-2 sm:mx-4">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
        <Sparkles size={15} className="text-gold" />
        ReSmart AI
      </div>

      <div className="hidden items-center gap-1 font-mono text-xs text-neutral-300 sm:flex">
        {countdown ? (
          <>
            <span>{countdown.days}D</span>
            <span className="text-gold/60">:</span>
            <span>{padCountdownValue(countdown.hours)}H</span>
            <span className="text-gold/60">:</span>
            <span>{padCountdownValue(countdown.minutes)}M</span>
            <span className="text-gold/60">:</span>
            <span>{padCountdownValue(countdown.seconds)}S</span>
          </>
        ) : (
          <span className="text-neutral-500">--:--:--</span>
        )}
      </div>

      <button
        onClick={onOpenInvestorAccess}
        className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-gradient-to-r from-gold/90 to-gold px-3 py-1.5 text-xs font-semibold text-neutral-950 shadow-[0_0_14px_2px_rgba(212,175,55,0.45)] transition hover:opacity-90"
      >
        <Briefcase size={13} />
        <span className="hidden sm:inline">INVESTOR ACCESS</span>
        <span className="sm:hidden">INVESTOR</span>
      </button>
    </header>
  );
}
