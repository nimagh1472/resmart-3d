'use client';

import { CreditCard, Layers, Megaphone, Repeat, Truck } from 'lucide-react';

const REVENUE_PILLARS: Array<{ icon: typeof CreditCard; label: string; mechanism: string; description: string }> = [
  {
    icon: CreditCard,
    label: 'Merchant SaaS',
    mechanism: 'Subscription',
    description: 'Monthly/annual membership tier every local store pays to stay listed and discoverable.',
  },
  {
    icon: Megaphone,
    label: 'Sponsored Search',
    mechanism: 'Merchant Ad Bids',
    description: 'Merchants bid for placement in AI search results, reaching high-intent shoppers first.',
  },
  {
    icon: Repeat,
    label: 'Transaction Network',
    mechanism: 'Affiliate Fee',
    description: 'A commission on every completed sale routed through the AI-matched marketplace.',
  },
  {
    icon: Truck,
    label: 'Intelligent Fulfillment',
    mechanism: 'Delivery Micro-Fee',
    description: 'A per-order fee on every AI-dispatched, zero-commission driver route.',
  },
];

/**
 * VC-facing business model architecture: the 4 concurrent revenue pillars
 * behind FINANCIAL_METRICS.yearOneARR (see lib/pitchData.ts), surfaced
 * inline on the page rather than gated behind Investor Access — a
 * qualitative "how it monetizes" overview, not the financial specifics
 * (those stay in the gated Seed Raise Details).
 */
export function RevenueEngine() {
  return (
    <section className="w-full px-4 py-12 sm:py-16">
      <div className="glass-panel mx-auto w-full max-w-4xl rounded-3xl p-6 sm:p-8">
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-cyan-300">
          <Layers size={13} /> Revenue Engine — 4-Pillar Business Model
        </div>

        <div className="mx-auto mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {REVENUE_PILLARS.map(({ icon: Icon, label, mechanism, description }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                <Icon size={16} />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-white">{label}</h3>
              <span className="mt-0.5 inline-block rounded-full border border-cyan-400/25 bg-cyan-400/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-cyan-300">
                {mechanism}
              </span>
              <p className="mt-2 text-[11px] leading-relaxed text-neutral-400">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
