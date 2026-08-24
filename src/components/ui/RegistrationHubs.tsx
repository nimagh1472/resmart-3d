'use client';

import { Briefcase, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import type { LeadRole } from '@/types';

function scrollToLeadCapture() {
  document.getElementById('lead-capture')?.scrollIntoView({ behavior: 'smooth' });
}

interface RegistrationHubsProps {
  onSelectPersona: (role: LeadRole) => void;
  onOpenInvestorAccess: () => void;
}

/**
 * The transition from cinematic storytelling into action: 3 registration
 * hubs — Driver, Shopper & Merchant, and the hard-gated Investor Pitch &
 * Confidential Data Room. The first two set the shared `persona` state and
 * scroll down to LeadCaptureCard's tabbed form; Investor opens the modal
 * directly, matching its hard-gated pattern everywhere else on the page.
 */
export function RegistrationHubs({ onSelectPersona, onOpenInvestorAccess }: RegistrationHubsProps) {
  const handleHubClick = (role: Exclude<LeadRole, 'investor'>) => {
    onSelectPersona(role);
    scrollToLeadCapture();
  };

  return (
    <section className="w-full px-4 py-12 sm:py-16">
      <div className="mx-auto grid w-full max-w-4xl gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => handleHubClick('driver')}
          className="glass-panel group rounded-2xl p-6 text-left transition hover:border-cyan-400/40"
        >
          <Truck size={22} className="text-cyan-300" />
          <h3 className="mt-3 text-sm font-semibold text-white sm:text-base">Driver Registration</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">
            Vehicle selection, license check &amp; zero-commission founding slots for AI-dispatched routes.
          </p>
          <span className="mt-3 inline-block text-xs font-semibold text-cyan-300 group-hover:underline">
            Register as a Driver →
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleHubClick('shopper')}
          className="glass-panel group rounded-2xl p-6 text-left transition hover:border-cyan-400/40"
        >
          <ShoppingBag size={22} className="text-cyan-300" />
          <h3 className="mt-3 text-sm font-semibold text-white sm:text-base">Shopper &amp; Merchant Registration</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">
            AI-matched local deals for shoppers, AI-targeted discovery for merchants — pick your tab below.
          </p>
          <span className="mt-3 inline-block text-xs font-semibold text-cyan-300 group-hover:underline">
            Join as Shopper or Merchant →
          </span>
        </button>

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
      </div>
    </section>
  );
}
