'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Award, Car, Check, Copy, IdCard, Mail, MessageCircle, Share2, TrendingUp, UserRound, X } from 'lucide-react';
import { useUserProfileStore } from '@/hooks/useUserProfileStore';
import { getAllRoleSummaries, ROLE_BADGES, ROLE_LABELS } from '@/lib/leaderboard';
import type { ProfileRole } from '@/types';

const ROLE_ICONS: Record<ProfileRole, typeof Car> = {
  driver: Car,
  customer: UserRound,
  investor: TrendingUp,
};

const ALL_ROLES: ProfileRole[] = ['driver', 'customer', 'investor'];

/**
 * "My ReSmart Profile" account panel — email, side-by-side score/rank/
 * qualification across all 3 personas (a player only actively plays one role
 * per session, but lib/leaderboard.ts tracks all 3 independently by email),
 * and a referral link to invite friends. Opened via
 * useUserProfileStore.isAccountPanelOpen from Overlay's top-right button and
 * GameNavBar's "My Profile" button during gameplay.
 */
export function AccountPanel() {
  const isOpen = useUserProfileStore((state) => state.isAccountPanelOpen);
  const closeAccountPanel = useUserProfileStore((state) => state.closeAccountPanel);
  const email = useUserProfileStore((state) => state.email);
  const currentRole = useUserProfileStore((state) => state.role);
  const referralCode = useUserProfileStore((state) => state.referralCode);
  const openShareCard = useUserProfileStore((state) => state.openShareCard);
  const profileRank = useUserProfileStore((state) => state.rank);
  const applyShareBoost = useUserProfileStore((state) => state.applyShareBoost);

  const [copied, setCopied] = useState(false);

  const summaries = useMemo(() => (isOpen && email ? getAllRoleSummaries(email) : null), [isOpen, email]);

  if (!isOpen) return null;

  const referralLink =
    typeof window !== 'undefined' && referralCode
      ? `${window.location.origin}${window.location.pathname}?ref=${referralCode}`
      : '';

  const handleShare = async () => {
    if (!referralLink) return;
    const shareData = {
      title: 'ReSmart AI — Dubai Grand Launching',
      text: 'Play ReSmart AI with me and climb the Top 50 leaderboard for real launch-day rewards.',
      url: referralLink,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // Fall through to clipboard copy — user may have dismissed the share sheet.
    }
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable/denied — the link is still visible in the input below.
    }
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-asphalt/70 backdrop-blur-sm">
      <div className="animate-modal-in relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur-2xl">
        <button
          onClick={closeAccountPanel}
          aria-label="Close account panel"
          className="absolute right-2 top-2 flex min-h-[44px] min-w-[44px] items-center justify-center text-neutral-400 transition hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 text-cyan-300">
          <IdCard size={18} />
          <span className="text-xs font-semibold uppercase tracking-widest">My ReSmart Profile</span>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-neutral-200">
          <Mail size={14} className="shrink-0 text-neutral-400" />
          <span className="truncate">{email || 'No email on file'}</span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {ALL_ROLES.map((role) => {
            const Icon = ROLE_ICONS[role];
            const summary = summaries?.[role];
            const isActive = role === currentRole;
            return (
              <div
                key={role}
                className={clsx(
                  'rounded-2xl border p-3 text-left',
                  isActive ? 'border-cyan-400/50 bg-cyan-500/10' : 'border-white/15 bg-white/5',
                )}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-neutral-300">
                  <Icon size={13} className="text-cyan-300" /> {ROLE_LABELS[role]}
                </div>
                <div className="mt-2 text-lg font-semibold text-white">{(summary?.score ?? 0).toLocaleString()}</div>
                <div className="text-[11px] text-neutral-400">pts · rank {summary?.rank ? `#${summary.rank}` : '—'}</div>
                <div
                  className={clsx(
                    'mt-2 flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium',
                    summary?.isQualified
                      ? 'bg-emerald-400/15 text-emerald-300'
                      : 'bg-white/10 text-neutral-400',
                  )}
                >
                  <Award size={10} />
                  {summary?.isQualified ? 'Top 50 Qualified' : ROLE_BADGES[role]}
                </div>
                <button
                  onClick={() => openShareCard(role)}
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[10px] font-medium text-cyan-200 transition hover:bg-cyan-400/20"
                >
                  <Share2 size={10} /> Share Rank
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-5">
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-300">
            <Share2 size={12} /> Invite Friends &amp; Boost Your Ranking
          </label>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={referralLink}
              onFocus={(event) => event.target.select()}
              className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 outline-none"
            />
            <button
              onClick={handleShare}
              className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Share'}
            </button>
          </div>
          <a
            href={
              referralLink
                ? `https://wa.me/?text=${encodeURIComponent(
                    `I am ranked ${profileRank ? `#${profileRank}` : 'in'} ReSmart AI Dubai Launch! Join me: ${referralLink}`,
                  )}`
                : undefined
            }
            target="_blank"
            rel="noopener noreferrer"
            onClick={applyShareBoost}
            aria-disabled={!referralLink}
            className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
          >
            <MessageCircle size={13} /> Share on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
