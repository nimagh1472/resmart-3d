'use client';

import { Building2, Search, Truck } from 'lucide-react';

// Equal-weight callout for all 3 sides of the business model, so a visitor
// grasps the mechanics (who pays whom, how) within seconds. Relocated out of
// Hero.tsx (which now only carries the 3-second-clarity wedge) to keep the
// hero decluttered, per the mobile stacking order's "Proof Cards" beat near
// the end of the page.
const HOW_IT_WORKS: Array<{ icon: typeof Search; label: string; description: string }> = [
  { icon: Search, label: 'Shoppers Search', description: 'AI-matched local deals and merchants, ranked instantly.' },
  {
    icon: Building2,
    label: 'Merchants Advertise',
    description: 'Monthly subscription + daily ad budget to feature in search, plus 4% affiliate on sales.',
  },
  { icon: Truck, label: 'Drivers Deliver', description: 'AI-optimized, zero-commission routes — a micro-fee per delivery.' },
];

export function HowItWorksCards() {
  return (
    <section className="w-full px-4 py-12 sm:py-16">
      <div className="glass-panel mx-auto w-full max-w-2xl rounded-3xl p-6 sm:p-8">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-cyan-300">How the Network Works</h2>
        <div className="mx-auto mt-4 grid gap-2.5 sm:grid-cols-3">
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
      </div>
    </section>
  );
}
