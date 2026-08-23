'use client';

import { Building2, Clapperboard, UserRound } from 'lucide-react';
import { useRoleStore } from '@/hooks/useRoleStore';
import { useSound } from '@/hooks/useSound';
import type { RoleType } from '@/types';

const ROLE_OPTIONS: Array<{ role: Exclude<RoleType, null>; label: string; description: string; icon: typeof UserRound }> = [
  {
    role: 'CUSTOMER',
    label: 'Play as Customer',
    description: 'Explore how ReSmart AI finds and matches you with the right opportunity.',
    icon: UserRound,
  },
  {
    role: 'AGENT',
    label: 'Play as Agent',
    description: 'See the market, the business model, and what the seed round unlocks.',
    icon: Building2,
  },
];

/**
 * Entry-point modal: the pitch tailors which zones are visible based on the
 * selected persona. Renders nothing once a role has been chosen, or once the
 * investor fast-path has kicked the presentation into CINEMATIC mode.
 *
 * Every button here calls unlock() directly in its click handler — this is
 * the first real user gesture in the experience, so it's the safe place to
 * create/resume the Web Audio context under the browser autoplay policy.
 */
export function RoleSelector() {
  const activeRole = useRoleStore((state) => state.activeRole);
  const presentationMode = useRoleStore((state) => state.presentationMode);
  const setRole = useRoleStore((state) => state.setRole);
  const setPresentationMode = useRoleStore((state) => state.setPresentationMode);
  const { unlock } = useSound();

  if (activeRole !== null || presentationMode === 'CINEMATIC') return null;

  const chooseRole = (role: Exclude<RoleType, null>) => {
    unlock();
    setRole(role);
  };

  const chooseInvestorTour = () => {
    unlock();
    setPresentationMode('CINEMATIC');
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-neutral-950/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
        <h2 className="text-xl font-semibold text-neutral-900">Welcome to ReSmart AI</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Choose how you&apos;d like to experience the pitch.
        </p>

        <div className="mt-6 grid gap-3">
          {ROLE_OPTIONS.map(({ role, label, description, icon: Icon }) => (
            <button
              key={role}
              onClick={() => chooseRole(role)}
              className="flex items-start gap-3 rounded-xl border border-neutral-200 p-4 text-left transition hover:border-neutral-900 hover:shadow-sm"
            >
              <Icon size={22} className="mt-0.5 shrink-0 text-neutral-700" />
              <span>
                <span className="block font-medium text-neutral-900">{label}</span>
                <span className="block text-sm text-neutral-500">{description}</span>
              </span>
            </button>
          ))}

          <button
            onClick={chooseInvestorTour}
            className="flex items-start gap-3 rounded-xl border-2 border-neutral-900 bg-neutral-900 p-4 text-left transition hover:bg-neutral-800"
          >
            <Clapperboard size={22} className="mt-0.5 shrink-0 text-white" />
            <span>
              <span className="block font-medium text-white">Investor / Fast Cinematic Pitch</span>
              <span className="block text-sm text-neutral-300">
                Skip the driving — sit back for an automated tour of the pitch.
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
