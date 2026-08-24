'use client';

import { ArrowRight, Building2, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import type { LeadRole } from '@/types';

interface ContextStat {
  label: string;
  value: string;
}

interface PersonaContext {
  icon: typeof ShoppingBag;
  heading: string;
  stats: ContextStat[];
}

const PERSONA_CONTEXT: Record<Exclude<LeadRole, 'investor'>, PersonaContext> = {
  shopper: {
    icon: ShoppingBag,
    heading: 'AI-Matched Stores Nearby',
    stats: [
      { label: 'Silk Boutique', value: '4 min' },
      { label: 'Bay Bites Café', value: '6 min' },
      { label: 'TechHub Downtown', value: '9 min' },
    ],
  },
  merchant: {
    icon: Building2,
    heading: 'Demand Heatmap — Downtown Dubai',
    stats: [
      { label: 'AI Search Demand', value: 'High · 72/hr' },
      { label: 'Avg. Sponsored CPC', value: 'AED 2.10' },
      { label: 'Open Ad Placements', value: '6' },
    ],
  },
  driver: {
    icon: Truck,
    heading: 'Live Route Density',
    stats: [
      { label: 'Active Zero-Commission Routes', value: '14' },
      { label: 'Avg. Dispatch Time', value: '3.2 min' },
      { label: 'District Coverage', value: '4 zones' },
    ],
  },
};

interface PersonaContextPanelProps {
  persona: LeadRole;
  onOpenInvestorAccess: () => void;
}

/**
 * Spatial persona navigation — switching the persona switcher above this
 * doesn't just relabel the CTA, it swaps this panel's context entirely, so
 * the page reads as re-orienting around the visitor's role. Figures here
 * are illustrative (no live map/geo backend); Investor swaps to a distinct
 * "Private Intelligence Terminal" teaser instead of the Shopper/Merchant/
 * Driver stat format, reinforcing that it's a different environment tier.
 */
export function PersonaContextPanel({ persona, onOpenInvestorAccess }: PersonaContextPanelProps) {
  if (persona === 'investor') {
    return (
      <div className="tier-3-panel mx-auto mt-4 w-full max-w-md rounded-2xl p-4">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gold">
          <ShieldCheck size={13} /> Private Intelligence Terminal
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
          TAM/SAM · Network Flywheel · 5-Stream Revenue Model · Confidential Data Room.
        </p>
        <button
          type="button"
          onClick={onOpenInvestorAccess}
          className="mt-3 flex items-center gap-1 text-xs font-semibold text-gold hover:underline"
        >
          Enter Terminal <ArrowRight size={13} />
        </button>
      </div>
    );
  }

  const context = PERSONA_CONTEXT[persona];
  const Icon = context.icon;

  return (
    <div className="glass-panel mx-auto mt-4 w-full max-w-md rounded-2xl p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
        <Icon size={13} /> {context.heading}
      </div>
      <ul className="mt-2 space-y-1.5">
        {context.stats.map((stat) => (
          <li key={stat.label} className="flex items-center justify-between gap-2 text-xs">
            <span className="min-w-0 truncate text-slate-300">{stat.label}</span>
            <span className="shrink-0 font-mono text-white">{stat.value}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[9px] font-semibold uppercase tracking-wider text-slate-500">Illustrative Preview</p>
    </div>
  );
}
