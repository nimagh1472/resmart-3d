'use client';

import { useEffect } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { SceneHeading } from '@/components/ui/SceneHeading';
import { InvestorHubCard } from '@/components/ui/RegistrationHubs';
import { RevenueEngine } from '@/components/ui/RevenueEngine';
import { useInViewport } from '@/hooks/useInViewport';
import { INVESTOR_SEED_CAPACITY } from '@/lib/pitchData';

interface SceneInvestorProps {
  onOpenInvestorAccess: () => void;
  onVisibilityChange: (isInView: boolean) => void;
}

/**
 * Scene 07 — INVESTOR TERMINAL. The final beat shifts to the Tier 3
 * obsidian+gold material exclusively (see globals.css .tier-3-panel) and
 * reports its own viewport visibility up to app/page.tsx via
 * `onVisibilityChange`, which BackgroundVideo uses to apply the same
 * gold-tinted "Private Intelligence Terminal" backdrop that persona ===
 * 'investor' already triggers — so scrolling into this scene reads as
 * entering a distinct environment even if the visitor never touched the
 * persona switcher.
 */
export function SceneInvestor({ onOpenInvestorAccess, onVisibilityChange }: SceneInvestorProps) {
  const { ref, isInView } = useInViewport<HTMLElement>();

  useEffect(() => {
    onVisibilityChange(isInView);
  }, [isInView, onVisibilityChange]);

  return (
    <section ref={ref} className="flex w-full flex-col items-center px-4 py-16 sm:py-24">
      <SceneHeading
        index={7}
        name="Investor Terminal"
        headline="Own a stake in Dubai's AI Infrastructure Layer."
        accent="gold"
      />

      <div className="tier-3-panel mx-auto mt-6 flex items-center gap-2 rounded-full px-4 py-2">
        <ShieldCheck size={14} className="text-gold" />
        <span className="text-xs text-slate-300">
          {INVESTOR_SEED_CAPACITY.label}: <span className="font-mono font-semibold text-gold">{INVESTOR_SEED_CAPACITY.reservedPct}%</span>{' '}
          Reserved for {INVESTOR_SEED_CAPACITY.reservedForLabel}
        </span>
      </div>

      <div className="mx-auto mt-6 w-full max-w-2xl px-4">
        <InvestorHubCard onOpenInvestorAccess={onOpenInvestorAccess} />
      </div>

      <RevenueEngine />

      <button
        type="button"
        onClick={onOpenInvestorAccess}
        className="mt-4 flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold/90 to-gold px-8 py-3 text-sm font-semibold text-neutral-950 shadow-lg shadow-[0_0_20px_rgba(212,175,55,0.35)] transition hover:opacity-90 sm:text-base"
      >
        INVESTOR ACCESS <ArrowRight size={16} /> Unlock Confidential Data Room
      </button>
    </section>
  );
}
