'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Building2, Car, Clapperboard, Gem, MapPin, Search, Sparkles, Timer, Truck, UserRound } from 'lucide-react';
import { useRoleStore } from '@/hooks/useRoleStore';
import { useUserProfileStore } from '@/hooks/useUserProfileStore';
import { useSound } from '@/hooks/useSound';
import { ROLE_BADGES, ROLE_LABELS } from '@/lib/leaderboard';
import type { ProfileRole } from '@/types';

// 90 days out from launch of this build — fixed so every visitor sees the
// same countdown target rather than a rolling "90 days from now".
const LAUNCH_TIMESTAMP = new Date('2026-11-21T00:00:00Z').getTime();

interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getCountdownParts(now: number): CountdownParts {
  const remainingMs = Math.max(0, LAUNCH_TIMESTAMP - now);
  const totalSeconds = Math.floor(remainingMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

// Equal-weight callout for all 3 sides of the business model, so a visitor
// grasps the mechanics (who pays whom, how) within seconds — the prose
// paragraph below states the same thing but buries Merchants in a
// subordinate clause with no visual parity against Customers/Drivers.
const HOW_IT_WORKS: Array<{ icon: typeof Search; label: string; description: string }> = [
  { icon: Search, label: 'Customers Search', description: 'AI-matched local deals and merchants, ranked instantly.' },
  {
    icon: Building2,
    label: 'Merchants Advertise',
    description: 'Monthly subscription + daily ad budget to feature in search, plus 4% affiliate on sales.',
  },
  { icon: Truck, label: 'Drivers Deliver', description: 'AI-optimized, zero-commission routes — a micro-fee per delivery.' },
];

const CAMPAIGN_ROLES: Array<{ role: ProfileRole; icon: typeof Car; description: string }> = [
  { role: 'driver', icon: Car, description: 'Complete driver runs and rank in the Top 50 for 3 months of 0% commission.' },
  { role: 'customer', icon: UserRound, description: 'Shop AI-matched deals and rank in the Top 50 for a 500 AED voucher.' },
  { role: 'investor', icon: Clapperboard, description: 'Model the fleet ROI and rank in the Top 50 for early stock access.' },
];

/**
 * The very first thing a brand-new visitor sees — a glassmorphism landing
 * page introducing ReSmart AI before the RoleSelector onboarding modal
 * (email + role picker) ever appears. Gated in page.tsx on
 * useRoleStore.hasEnteredExperience; a returning visitor with a persisted
 * profile (useUserProfileStore.email) skips this entirely and resumes
 * straight into their prior role via RoleSelector's own resume effect.
 */
export function LandingOverlay() {
  const { unlock } = useSound();
  const activeRole = useRoleStore((state) => state.activeRole);
  const presentationMode = useRoleStore((state) => state.presentationMode);
  const hasEnteredExperience = useRoleStore((state) => state.hasEnteredExperience);
  const forceShowLanding = useRoleStore((state) => state.forceShowLanding);
  const enterExperience = useRoleStore((state) => state.enterExperience);
  const persistedEmail = useUserProfileStore((state) => state.email);
  const [countdown, setCountdown] = useState<CountdownParts | null>(null);

  // Computed client-side only (setState in an effect) to avoid an SSR/CSR
  // hydration mismatch on Date.now() — first paint shows the placeholder.
  useEffect(() => {
    setCountdown(getCountdownParts(Date.now()));
    const interval = setInterval(() => setCountdown(getCountdownParts(Date.now())), 1000);
    return () => clearInterval(interval);
  }, []);

  const isSessionActive = activeRole !== null || presentationMode === 'CINEMATIC';
  // Returning visitors (persistedEmail already set) skip straight to
  // RoleSelector's auto-resume — this only shows for a genuinely new visitor.
  // forceShowLanding (set by the Home nav button/logo, see useRoleStore.goHome)
  // overrides all of that so a returning visitor can explicitly get back here.
  if (!forceShowLanding && (isSessionActive || hasEnteredExperience || persistedEmail)) return null;

  const handleEnter = () => {
    unlock();
    enterExperience();
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 overflow-y-auto bg-asphalt">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.12),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(217,119,6,0.1),transparent_45%),radial-gradient(circle_at_50%_100%,rgba(168,85,247,0.12),transparent_55%)]" />

      <div className="animate-modal-in relative mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center px-4 py-10 sm:py-16">
        <div className="w-full rounded-3xl border border-white/15 bg-white/[0.06] p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur-2xl sm:p-10">
          <div className="flex items-center justify-center gap-2 text-amber-300">
            <Gem size={16} />
            <span className="text-xs font-semibold uppercase tracking-[0.25em]">ReSmart AI</span>
            <Gem size={16} />
          </div>

          <h1 className="mt-4 text-center text-2xl font-semibold leading-tight text-white sm:text-4xl">
            ReSmart AI — Dubai&apos;s AI Search Engine &amp; Smart Logistics Network
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-relaxed text-neutral-300 sm:text-base">
            Connecting Customers with AI-matched local merchant deals, enabling Merchants to advertise directly on the
            smart search network, and powering Drivers with zero-commission optimized delivery routes across Downtown
            Dubai.
          </p>

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
          <div className="mx-auto mt-6 max-w-md rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4">
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-widest text-amber-300">
              <Timer size={13} /> Official Dubai Grand Launching In
            </div>
            <div className="mt-2 flex items-center justify-center gap-2 font-mono text-2xl font-semibold text-white sm:text-3xl">
              {countdown ? (
                <>
                  <span>{countdown.days}D</span>
                  <span className="text-amber-300/60">:</span>
                  <span>{pad(countdown.hours)}H</span>
                  <span className="text-amber-300/60">:</span>
                  <span>{pad(countdown.minutes)}M</span>
                  <span className="text-amber-300/60">:</span>
                  <span>{pad(countdown.seconds)}S</span>
                </>
              ) : (
                <span className="text-neutral-500">--D : --H : --M : --S</span>
              )}
            </div>
          </div>

          {/* Campaign rules & rewards */}
          <div className="mt-8">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-neutral-400">
              <Sparkles size={13} className="text-purple-400" /> Top 50 Leaderboard Rewards
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {CAMPAIGN_ROLES.map(({ role, icon: Icon, description }) => (
                <div key={role} className="rounded-2xl border border-white/15 bg-white/5 p-4 text-left">
                  <Icon size={18} className="text-cyan-300" />
                  <div className="mt-2 text-sm font-semibold text-white">{ROLE_LABELS[role]}</div>
                  <div className="mt-1 text-xs font-medium text-emerald-300">{ROLE_BADGES[role]}</div>
                  <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleEnter}
            className="mx-auto mt-8 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-400 px-8 py-3 text-sm font-semibold text-neutral-950 shadow-lg shadow-cyan-500/20 transition hover:opacity-90 sm:text-base"
          >
            Enter 3D Dubai Experience <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
