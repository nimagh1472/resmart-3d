'use client';

import { Briefcase, Sparkles } from 'lucide-react';
import { LAUNCH_TIMESTAMP, padCountdownValue, useCountdown } from '@/hooks/useCountdown';

interface StickyHeaderProps {
  onOpenDataRoom: () => void;
}

/**
 * Minimalist glassmorphism top bar: wordmark, a compact launch countdown,
 * and the Investor Data Room CTA — always reachable regardless of scroll
 * position.
 */
export function StickyHeader({ onOpenDataRoom }: StickyHeaderProps) {
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
        onClick={onOpenDataRoom}
        className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-gold px-3 py-1.5 text-xs font-semibold text-neutral-950 transition hover:opacity-90"
      >
        <Briefcase size={13} />
        <span className="hidden sm:inline">Investor Data Room</span>
        <span className="sm:hidden">Data Room</span>
      </button>
    </header>
  );
}
