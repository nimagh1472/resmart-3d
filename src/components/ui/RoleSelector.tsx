'use client';

import { useEffect, useState, type FormEvent } from 'react';
import clsx from 'clsx';
import { Building2, Clapperboard, TrendingUp, UserRound } from 'lucide-react';
import { useRoleStore } from '@/hooks/useRoleStore';
import { useUserProfileStore } from '@/hooks/useUserProfileStore';
import { useSound } from '@/hooks/useSound';
import type { ProfileRole, RoleType } from '@/types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RoleOption {
  profileRole: ProfileRole;
  label: string;
  description: string;
  icon: typeof UserRound;
}

const GAMEPLAY_ROLE_OPTIONS: Array<RoleOption & { gameplayRole: Exclude<RoleType, null> }> = [
  {
    profileRole: 'customer',
    gameplayRole: 'CUSTOMER',
    label: 'Customer Mode',
    description: 'Hunt AI-matched deals, collect cashback around the city, and checkout with a 2-hour delivery guarantee.',
    icon: UserRound,
  },
  {
    profileRole: 'driver',
    gameplayRole: 'AGENT',
    label: 'Driver Mode',
    description: 'Dispatch orders, verify gadgets for a testing fee, and race the drop-off ramp to bank your earnings.',
    icon: Building2,
  },
];

const INVESTOR_OPTION: RoleOption = {
  profileRole: 'investor',
  label: 'Investor / Fast Cinematic Pitch',
  description: 'Skip the driving — sit back for an automated tour of the pitch.',
  icon: Clapperboard,
};

/**
 * Onboarding gate: a single glassmorphism modal that both captures the
 * player's email and lets them pick a persona (Driver / Customer /
 * Investor), writing to useUserProfileStore (email/role/score/rank — the
 * Leaderboard's source of truth) as well as useRoleStore (the existing
 * gameplay role / presentation-mode switch, unchanged).
 *
 * A returning visitor whose profile was already persisted to localStorage
 * skips straight past this gate on mount, resuming their prior role.
 *
 * Every option here calls unlock() directly in its click handler — this is
 * the first real user gesture in the experience, so it's the safe place to
 * create/resume the Web Audio context under the browser autoplay policy.
 */
export function RoleSelector() {
  const activeRole = useRoleStore((state) => state.activeRole);
  const presentationMode = useRoleStore((state) => state.presentationMode);
  const setRole = useRoleStore((state) => state.setRole);
  const setPresentationMode = useRoleStore((state) => state.setPresentationMode);
  const { unlock } = useSound();

  const persistedEmail = useUserProfileStore((state) => state.email);
  const persistedRole = useUserProfileStore((state) => state.role);
  const setProfile = useUserProfileStore((state) => state.setProfile);

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasResumed, setHasResumed] = useState(false);

  const isSessionActive = activeRole !== null || presentationMode === 'CINEMATIC';

  // Returning visitor: a persisted profile means they've already onboarded
  // in this browser, so resume their prior persona instead of re-prompting.
  useEffect(() => {
    if (hasResumed || isSessionActive || !persistedEmail || !persistedRole) return;
    setHasResumed(true);
    if (persistedRole === 'investor') {
      setPresentationMode('CINEMATIC');
    } else {
      setRole(persistedRole === 'driver' ? 'AGENT' : 'CUSTOMER');
    }
  }, [hasResumed, isSessionActive, persistedEmail, persistedRole, setPresentationMode, setRole]);

  // Deliberately keyed only on isSessionActive, not on the persisted profile
  // existing: a returning visitor is auto-resumed into their prior role by
  // the effect above (one-frame flash, acceptable — persisted state isn't
  // available during SSR anyway, so gating visibility on it directly would
  // itself be a hydration mismatch). Gating on persistedEmail/persistedRole
  // here as well would make this permanently hidden once any profile exists,
  // which would strand anyone who explicitly backs out of a role (e.g.
  // DriverGame's "Back to Menu") with no way back to role selection.
  if (isSessionActive) return null;

  const validateEmail = (): boolean => {
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Enter a valid email address to continue.');
      return false;
    }
    setError(null);
    return true;
  };

  const chooseGameplayRole = (option: (typeof GAMEPLAY_ROLE_OPTIONS)[number]) => (event: FormEvent) => {
    event.preventDefault();
    if (!validateEmail()) return;
    unlock();
    setProfile(email.trim(), option.profileRole);
    setRole(option.gameplayRole);
  };

  const chooseInvestorTour = (event: FormEvent) => {
    event.preventDefault();
    if (!validateEmail()) return;
    unlock();
    setProfile(email.trim(), INVESTOR_OPTION.profileRole);
    setPresentationMode('CINEMATIC');
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-neutral-950/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-3xl border border-white/15 bg-white/10 p-8 shadow-2xl shadow-cyan-500/10 backdrop-blur-2xl">
        <div className="flex items-center gap-2 text-cyan-300">
          <TrendingUp size={16} />
          <span className="text-xs font-semibold uppercase tracking-widest">ReSmart AI</span>
        </div>
        <h2 className="mt-2 text-xl font-semibold text-white">Welcome to the ReSmart AI Pitch</h2>
        <p className="mt-1 text-sm text-neutral-300">
          Enter your email and choose how you&apos;d like to experience the pitch. Your score feeds the Top 50
          Leaderboard.
        </p>

        <div className="mt-5">
          <label className="mb-1 block text-xs font-medium text-neutral-300">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError(null);
            }}
            placeholder="jane@example.com"
            className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-cyan-400"
          />
          {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
        </div>

        <div className="mt-5 grid gap-3">
          {GAMEPLAY_ROLE_OPTIONS.map((option) => (
            <button
              key={option.profileRole}
              onClick={chooseGameplayRole(option)}
              className={clsx(
                'flex items-start gap-3 rounded-xl border border-white/15 bg-white/5 p-4 text-left transition',
                'hover:border-cyan-400/60 hover:bg-white/10',
              )}
            >
              <option.icon size={22} className="mt-0.5 shrink-0 text-cyan-300" />
              <span>
                <span className="block font-medium text-white">{option.label}</span>
                <span className="block text-sm text-neutral-400">{option.description}</span>
              </span>
            </button>
          ))}

          <button
            onClick={chooseInvestorTour}
            className="flex items-start gap-3 rounded-xl border-2 border-cyan-400/60 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 p-4 text-left transition hover:from-cyan-500/30 hover:to-purple-500/30"
          >
            <INVESTOR_OPTION.icon size={22} className="mt-0.5 shrink-0 text-white" />
            <span>
              <span className="block font-medium text-white">{INVESTOR_OPTION.label}</span>
              <span className="block text-sm text-neutral-300">{INVESTOR_OPTION.description}</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
