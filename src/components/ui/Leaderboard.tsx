'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Award, Car, TrendingUp, UserRound, X } from 'lucide-react';
import { useUserProfileStore } from '@/hooks/useUserProfileStore';
import { getTopForRole, maskEmail, ROLE_BADGES, ROLE_LABELS } from '@/lib/leaderboard';
import type { ProfileRole } from '@/types';

const TABS: Array<{ role: ProfileRole; icon: typeof UserRound }> = [
  { role: 'driver', icon: Car },
  { role: 'customer', icon: UserRound },
  { role: 'investor', icon: TrendingUp },
];

/**
 * Top-50 leaderboard, one tab per persona (Driver / Customer / Investor),
 * each qualifying for a distinct reward badge. Reads directly from
 * lib/leaderboard.ts's localStorage-backed store (recomputed on every open
 * rather than cached, since any player's session may have just updated it).
 * Opened via useUserProfileStore.isLeaderboardOpen (Overlay's trophy button).
 */
export function Leaderboard() {
  const isOpen = useUserProfileStore((state) => state.isLeaderboardOpen);
  const closeLeaderboard = useUserProfileStore((state) => state.closeLeaderboard);
  const currentEmail = useUserProfileStore((state) => state.email);
  const currentRole = useUserProfileStore((state) => state.role);

  const [activeTab, setActiveTab] = useState<ProfileRole>(currentRole ?? 'driver');

  const entries = useMemo(() => (isOpen ? getTopForRole(activeTab) : []), [isOpen, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-asphalt/70 backdrop-blur-sm">
      <div className="animate-modal-in relative w-full max-w-lg rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur-2xl">
        <button
          onClick={closeLeaderboard}
          aria-label="Close leaderboard"
          className="absolute right-4 top-4 text-neutral-400 transition hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 text-cyan-300">
          <Award size={18} />
          <span className="text-xs font-semibold uppercase tracking-widest">Top 50 Leaderboard</span>
        </div>

        <div className="mt-4 flex gap-1 rounded-full border border-white/15 bg-white/5 p-1">
          {TABS.map(({ role, icon: Icon }) => (
            <button
              key={role}
              onClick={() => setActiveTab(role)}
              className={clsx(
                'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition',
                activeTab === role ? 'bg-cyan-500/90 text-neutral-950' : 'text-neutral-300 hover:bg-white/10',
              )}
            >
              <Icon size={13} />
              {ROLE_LABELS[role]}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
          <Award size={13} />
          Top 50 {ROLE_LABELS[activeTab]}s qualify for: <span className="font-semibold">{ROLE_BADGES[activeTab]}</span>
        </div>

        <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto pr-1">
          {entries.length === 0 && (
            <li className="py-8 text-center text-sm text-neutral-400">No scores yet — be the first to rank.</li>
          )}
          {entries.map((entry, index) => {
            const isCurrentUser = entry.email === currentEmail && entry.role === currentRole;
            return (
              <li
                key={`${entry.role}-${entry.email}`}
                className={clsx(
                  'flex items-center justify-between rounded-xl px-3 py-2 text-sm',
                  isCurrentUser ? 'border border-cyan-400/50 bg-cyan-500/10 text-white' : 'text-neutral-300',
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={clsx(
                      'w-6 shrink-0 text-center font-semibold',
                      index === 0 && 'text-amber-300',
                      index === 1 && 'text-neutral-200',
                      index === 2 && 'text-orange-400',
                    )}
                  >
                    #{index + 1}
                  </span>
                  <span>{isCurrentUser ? 'You' : maskEmail(entry.email)}</span>
                </span>
                <span className="font-semibold text-emerald-300">{entry.score.toLocaleString()} pts</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
