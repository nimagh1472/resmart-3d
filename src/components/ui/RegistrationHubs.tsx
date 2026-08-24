'use client';

import { Briefcase, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import type { LeadRole } from '@/types';

/**
 * The 3 registration-hub teaser cards from the original single "pick your
 * path" section — now split into standalone exports so each can sit inline
 * within its own narrative scene (Commerce, Logistics, Investor Terminal in
 * app/page.tsx) instead of one combined mid-page grid. Copy is unchanged
 * from the original RegistrationHubs; only placement moved.
 */

interface HubCardProps {
  onSelectPersona: (role: LeadRole) => void;
}

export function DriverHubCard({ onSelectPersona }: HubCardProps) {
  const handleClick = () => {
    onSelectPersona('driver');
    document.getElementById('lead-capture-driver')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <button type="button" onClick={handleClick} className="glass-panel group rounded-2xl p-6 text-left transition hover:border-cyan-400/40">
      <Truck size={22} className="text-cyan-300" />
      <h3 className="mt-3 text-sm font-semibold text-white sm:text-base">Driver Registration</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">
        Vehicle selection, license check &amp; zero-commission founding slots for AI-dispatched routes.
      </p>
      <span className="mt-3 inline-block text-xs font-semibold text-cyan-300 group-hover:underline">
        Register as a Driver →
      </span>
    </button>
  );
}

export function ShopperMerchantHubCard({ onSelectPersona }: HubCardProps) {
  const handleClick = (role: 'shopper' | 'merchant') => {
    onSelectPersona(role);
    document.getElementById('lead-capture')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <button type="button" onClick={() => handleClick('shopper')} className="glass-panel group rounded-2xl p-6 text-left transition hover:border-cyan-400/40">
      <ShoppingBag size={22} className="text-cyan-300" />
      <h3 className="mt-3 text-sm font-semibold text-white sm:text-base">Shopper &amp; Merchant Registration</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">
        AI-matched local deals for shoppers, AI-targeted discovery for merchants — pick your tab below.
      </p>
      <span className="mt-3 inline-block text-xs font-semibold text-cyan-300 group-hover:underline">
        Join as Shopper or Merchant →
      </span>
    </button>
  );
}

interface InvestorHubCardProps {
  onOpenInvestorAccess: () => void;
}

export function InvestorHubCard({ onOpenInvestorAccess }: InvestorHubCardProps) {
  return (
    <button
      type="button"
      onClick={onOpenInvestorAccess}
      className="tier-3-panel group rounded-2xl p-6 text-left transition hover:border-gold/50"
    >
      <Briefcase size={22} className="text-gold" />
      <h3 className="mt-3 text-sm font-semibold text-white sm:text-base">Investor Pitch &amp; Confidential Data Room</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">
        Unlock TAM/SAM/ARR metrics, the 5-stream revenue model &amp; the Seed Scenario Model.
      </p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gold group-hover:underline">
        <ShieldCheck size={12} /> Unlock Investor Access →
      </span>
    </button>
  );
}
