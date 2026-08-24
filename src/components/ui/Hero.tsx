'use client';

import { Building2, FileText, Gem, MapPin, Search, Sparkles, Timer, Truck } from 'lucide-react';
import { LAUNCH_TIMESTAMP, padCountdownValue, useCountdown } from '@/hooks/useCountdown';

// Equal-weight callout for all 3 sides of the business model, so a visitor
// grasps the mechanics (who pays whom, how) within seconds.
const HOW_IT_WORKS: Array<{ icon: typeof Search; label: string; description: string }> = [
  { icon: Search, label: 'Customers Search', description: 'AI-matched local deals and merchants, ranked instantly.' },
  {
    icon: Building2,
    label: 'Merchants Advertise',
    description: 'Monthly subscription + daily ad budget to feature in search, plus 4% affiliate on sales.',
  },
  { icon: Truck, label: 'Drivers Deliver', description: 'AI-optimized, zero-commission routes — a micro-fee per delivery.' },
];

function scrollToLeadCapture() {
  document.getElementById('lead-capture')?.scrollIntoView({ behavior: 'smooth' });
}

interface HeroProps {
  onOpenDataRoom: () => void;
}

/**
 * The top-of-page hero: headline, launch countdown, and the 3-way business
 * model explainer. Always rendered (no onboarding gate — the whole site is
 * now one continuous landing page, not a dismissible splash before "entering"
 * a 3D experience).
 */
export function Hero({ onOpenDataRoom }: HeroProps) {
  const countdown = useCountdown(LAUNCH_TIMESTAMP);

  return (
    <section className="relative flex w-full flex-col items-center px-4 py-10 sm:py-16">
      <div className="glass-panel w-full max-w-3xl rounded-3xl p-6 sm:p-10">
        <div className="flex items-center justify-center gap-2 text-gold">
          <Gem size={16} />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">ReSmart AI</span>
          <Gem size={16} />
        </div>

        <h1 className="mt-4 text-center text-2xl font-semibold leading-tight text-white sm:text-4xl">ReSmart AI</h1>
        <p className="mx-auto mt-2 max-w-xl text-center text-base font-medium text-cyan-200 sm:text-lg">
          Dubai&apos;s AI Commerce &amp; Autonomous Logistics Network
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

        {/* How it works — Customer / Merchant / Driver at equal visual weight */}
        <div className="mx-auto mt-5 grid max-w-2xl gap-2.5 sm:grid-cols-3">
          {HOW_IT_WORKS.map(({ icon: Icon, label, description }) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                <Icon size={14} className="shrink-0" />
                <span className="truncate">{label}</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">{description}</p>
            </div>
          ))}
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

        <div className="mx-auto mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={scrollToLeadCapture}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-gold px-8 py-3 text-sm font-semibold text-neutral-950 shadow-lg shadow-cyan-500/20 transition hover:opacity-90 sm:text-base"
          >
            <Sparkles size={16} /> Secure Your Spot
          </button>
          <button
            onClick={onOpenDataRoom}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-neutral-200 transition hover:bg-white/10"
          >
            <FileText size={14} /> Investor Data Room
          </button>
        </div>

        <p className="mx-auto mt-6 max-w-md text-center text-[11px] leading-relaxed text-neutral-500">
          ReSmart AI Launchpad Demo. Not an offer of securities.
        </p>
      </div>
    </section>
  );
}
