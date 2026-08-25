'use client';

import { useState } from 'react';
import { useIsDesktopViewport } from '@/hooks/useIsDesktopViewport';
import type { LeadRole } from '@/types';

const ROLES: { label: string; role: LeadRole; desc: string }[] = [
  { label: 'SHOP', role: 'shopper', desc: 'Discover curated deals, matched to you by AI.' },
  { label: 'SELL', role: 'merchant', desc: 'Reach thousands of AI-matched shoppers, commission-free.' },
  { label: 'DRIVE', role: 'driver', desc: "Join Dubai's smartest AI-dispatched delivery network." },
  { label: 'INVEST', role: 'investor', desc: 'Back the intelligence layer for Dubai commerce.' },
];

interface RoleSelectorProps {
  /** Wired to the homepage's real persona state + lead-capture/investor-modal flow in production; omitted (inert) in /lab/home-v2 QA. */
  onSelectPersona?: (role: LeadRole) => void;
}

/**
 * Homepage V2 Phase 1, Section 2 — the four roles get room to breathe (one
 * per row, strong negative space) instead of a card grid. The single glass/
 * intelligence element is the cyan indicator line, which tracks the hovered
 * row on desktop and simply marks each row statically on mobile (no pointer
 * effects there, per the brief).
 */
export function RoleSelector({ onSelectPersona }: RoleSelectorProps) {
  const isDesktop = useIsDesktopViewport();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <section className="relative flex min-h-screen w-full flex-col items-center justify-center gap-14 bg-[#050709] px-6 py-24">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-white/50">Choose your path</p>

      <ul className="flex w-full max-w-xl flex-col">
        {ROLES.map((role, i) => {
          const isActive = isDesktop ? activeIndex === i : true;
          return (
            <li
              key={role.label}
              className="border-t border-white/10 py-6 first:border-t-0"
              onMouseEnter={isDesktop ? () => setActiveIndex(i) : undefined}
              onMouseLeave={isDesktop ? () => setActiveIndex(null) : undefined}
            >
              <button
                type="button"
                onClick={() => onSelectPersona?.(role.role)}
                className="group flex w-full flex-col gap-2 text-left"
              >
                <span className="flex items-center gap-4">
                  <span
                    className="h-px w-6 bg-cyan-300 transition-all duration-300"
                    style={{ width: isDesktop && isActive ? 32 : 24, opacity: isDesktop ? (isActive ? 1 : 0.35) : 0.6 }}
                    aria-hidden
                  />
                  <span
                    style={{ fontFamily: 'ui-serif, Georgia, serif' }}
                    className="text-2xl text-white/90 transition-colors group-hover:text-white sm:text-3xl"
                  >
                    {role.label}
                  </span>
                </span>
                <span className="pl-10 text-sm text-white/50">{role.desc}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
