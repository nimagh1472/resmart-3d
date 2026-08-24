'use client';

import { ArrowRight, Gem, MapPin, Timer } from 'lucide-react';
import { LAUNCH_TIMESTAMP, padCountdownValue, useCountdown } from '@/hooks/useCountdown';
import { PersonaSwitcher } from '@/components/ui/PersonaSwitcher';
import type { LeadRole } from '@/types';

const JOIN_NETWORK_CTA = 'JOIN THE FOUNDING NETWORK';
const INVESTOR_CTA = 'INVESTOR ACCESS';

function scrollToLeadCapture() {
  document.getElementById('lead-capture')?.scrollIntoView({ behavior: 'smooth' });
}

interface HeroProps {
  persona: LeadRole;
  onSelectPersona: (role: LeadRole) => void;
  onOpenInvestorAccess: () => void;
}

/**
 * The top-of-page "3-second clarity" wedge: headline, launch countdown, the
 * unified primary CTA, and the persona switcher that drives both the CTA's
 * label/behavior and the lead-capture form's active tab (owned by
 * app/page.tsx's shared `persona` state). The old 3-up "how it works"
 * explainer has moved to its own section (HowItWorksCards.tsx) to keep this
 * decluttered.
 */
export function Hero({ persona, onSelectPersona, onOpenInvestorAccess }: HeroProps) {
  const countdown = useCountdown(LAUNCH_TIMESTAMP);
  const isInvestor = persona === 'investor';

  const handlePrimaryCtaClick = () => {
    if (isInvestor) onOpenInvestorAccess();
    else scrollToLeadCapture();
  };

  const handleSelectPersona = (role: LeadRole) => {
    onSelectPersona(role);
    if (role === 'investor') onOpenInvestorAccess();
    else scrollToLeadCapture();
  };

  return (
    <section className="relative flex w-full flex-col items-center px-4 py-10 sm:py-16">
      <div className="glass-panel w-full max-w-3xl rounded-3xl p-6 sm:p-10">
        <div className="flex items-center justify-center gap-2 text-gold">
          <Gem size={16} />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">ReSmart AI</span>
          <Gem size={16} />
        </div>

        <h1 className="mt-4 text-center text-2xl font-semibold leading-tight text-white sm:text-4xl">
          Dubai&apos;s AI Commerce &amp; Logistics Network
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-center text-base font-medium text-cyan-200 sm:text-lg">
          Search Smarter. Buy Locally. Deliver Intelligently.
        </p>

        <div className="mx-auto mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-[11px] font-semibold uppercase tracking-widest text-cyan-300">
          <span className="rounded-full border border-cyan-400/25 bg-cyan-400/5 px-3 py-1">AI COMMERCE SEARCH</span>
          <span className="text-neutral-500">·</span>
          <span className="rounded-full border border-cyan-400/25 bg-cyan-400/5 px-3 py-1">MERCHANT ADS</span>
          <span className="text-neutral-500">·</span>
          <span className="rounded-full border border-cyan-400/25 bg-cyan-400/5 px-3 py-1">SMART LOGISTICS</span>
        </div>

        <div className="mx-auto mt-2 flex items-center justify-center gap-1.5 text-xs text-cyan-300/80">
          <MapPin size={12} /> Downtown Dubai · Sheikh Mohammed bin Rashid Boulevard
        </div>

        {/* Countdown */}
        <div className="mx-auto mt-6 max-w-md rounded-2xl border border-gold/25 bg-gold/5 p-4">
          <div className="flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-widest text-gold">
            <Timer size={13} /> Official Dubai Grand Launching In
          </div>
          <div className="mt-2 flex items-center justify-center gap-2 font-mono text-2xl font-semibold text-white sm:text-3xl">
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
              <span className="text-neutral-500">--D : --H : --M : --S</span>
            )}
          </div>
        </div>

        <div className="mx-auto mt-8 flex justify-center">
          <button
            onClick={handlePrimaryCtaClick}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-gold px-8 py-3 text-sm font-semibold text-neutral-950 shadow-lg shadow-cyan-500/20 transition hover:opacity-90 sm:text-base"
          >
            {isInvestor ? INVESTOR_CTA : JOIN_NETWORK_CTA} <ArrowRight size={16} />
          </button>
        </div>

        <PersonaSwitcher persona={persona} onSelectPersona={handleSelectPersona} />

        <p className="mx-auto mt-6 max-w-md text-center text-[11px] leading-relaxed text-neutral-500">
          ReSmart AI Launchpad Demo. Not an offer of securities.
        </p>
      </div>
    </section>
  );
}
