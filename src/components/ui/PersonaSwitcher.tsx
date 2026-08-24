'use client';

import clsx from 'clsx';
import { Briefcase, Building2, Truck, UserRound } from 'lucide-react';
import type { LeadRole } from '@/types';

const PERSONA_TABS: Array<{ role: LeadRole; label: string; icon: typeof UserRound }> = [
  { role: 'shopper', label: 'Shopper', icon: UserRound },
  { role: 'merchant', label: 'Merchant', icon: Building2 },
  { role: 'driver', label: 'Driver', icon: Truck },
  { role: 'investor', label: 'Investor', icon: Briefcase },
];

interface PersonaSwitcherProps {
  persona: LeadRole;
  onSelectPersona: (role: LeadRole) => void;
}

/**
 * Hero's "I am a..." persona row — the single control that drives the
 * primary CTA's label/behavior and the lead-capture form's active tab
 * below it (see app/page.tsx, which owns the shared `persona` state).
 */
export function PersonaSwitcher({ persona, onSelectPersona }: PersonaSwitcherProps) {
  return (
    <div className="mx-auto mt-5 flex flex-col items-center gap-2">
      <span className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">I am a...</span>
      <div className="grid grid-cols-4 gap-1.5">
        {PERSONA_TABS.map(({ role, label, icon: Icon }) => (
          <button
            key={role}
            type="button"
            onClick={() => onSelectPersona(role)}
            aria-pressed={persona === role}
            className={clsx(
              'flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl border px-3 py-2 text-[11px] font-medium transition',
              persona === role
                ? 'border-cyan-400/60 bg-cyan-400/10 text-white'
                : 'border-white/10 bg-white/5 text-neutral-400 hover:border-white/20',
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
