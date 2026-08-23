'use client';

import { useState } from 'react';
import { Award, Check, Copy, Gem, Share2, X } from 'lucide-react';
import { useUserProfileStore } from '@/hooks/useUserProfileStore';
import { getAllRoleSummaries, ROLE_LABELS } from '@/lib/leaderboard';

/**
 * "Share Rank" modal — a pre-styled dark-cyan shareable card previewing the
 * player's current rank for one role, plus a `?ref=<hash of their email>`
 * referral link (see useUserProfileStore.hashEmailToReferralCode) that
 * awards a one-time +10% score boost the first time it's copied or shared
 * (useUserProfileStore.applyShareBoost). Opened via
 * useUserProfileStore.openShareCard from AccountPanel.tsx and each
 * game-over screen (DriverGame/CustomerGame/InvestorGame).
 */
export function ShareRankCard() {
  const isOpen = useUserProfileStore((state) => state.isShareCardOpen);
  const role = useUserProfileStore((state) => state.shareCardRole);
  const closeShareCard = useUserProfileStore((state) => state.closeShareCard);
  const email = useUserProfileStore((state) => state.email);
  const referralCode = useUserProfileStore((state) => state.referralCode);
  const hasSharedForBoost = useUserProfileStore((state) => state.hasSharedForBoost);
  const applyShareBoost = useUserProfileStore((state) => state.applyShareBoost);

  const [copied, setCopied] = useState(false);

  if (!isOpen || !role) return null;

  const summary = getAllRoleSummaries(email)[role];
  const rankLabel = summary.rank ? `#${summary.rank}` : 'Unranked';
  const referralLink =
    typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?ref=${referralCode}` : '';

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable/denied — the link is still visible in the input below.
    }
    applyShareBoost();
  };

  const handleNativeShare = async () => {
    if (!referralLink) return;
    const shareData = {
      title: 'ReSmart AI — Dubai Grand Launching',
      text: `I am ranked ${rankLabel} in ReSmart AI Dubai Launch!`,
      url: referralLink,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        applyShareBoost();
        return;
      }
    } catch {
      // User dismissed the native share sheet — fall through to a clipboard copy instead.
    }
    handleCopy();
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-[70] flex items-center justify-center bg-asphalt/80 backdrop-blur-sm">
      <div className="animate-modal-in relative w-full max-w-sm rounded-3xl border border-white/15 bg-asphalt p-5 shadow-2xl shadow-cyan-500/20">
        <button
          onClick={closeShareCard}
          aria-label="Close share card"
          className="absolute right-4 top-4 text-neutral-400 transition hover:text-white"
        >
          <X size={18} />
        </button>

        {/* The shareable "card" preview itself — dark-cyan, screenshot/social-ready. */}
        <div className="overflow-hidden rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-[#03141c] via-[#04222c] to-[#031017] p-6 shadow-[0_0_40px_rgba(34,211,238,0.15)]">
          <div className="flex items-center justify-center gap-2 text-cyan-300">
            <Gem size={16} />
            <span className="text-xs font-semibold uppercase tracking-[0.25em]">ReSmart AI</span>
            <Gem size={16} />
          </div>
          <p className="mt-4 text-center text-lg font-semibold leading-snug text-white">
            I am ranked <span className="text-cyan-300">{rankLabel}</span> in ReSmart AI Dubai Launch!
          </p>
          <div className="mx-auto mt-3 flex w-fit items-center gap-1.5 rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
            <Award size={12} /> {ROLE_LABELS[role]} · {summary.score.toLocaleString()} pts
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-center text-xs text-emerald-300">
          {hasSharedForBoost
            ? 'Share boost already claimed — thanks for spreading the word!'
            : 'Copy or share your link for an instant +10% score boost.'}
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={referralLink}
              onFocus={(event) => event.target.select()}
              className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 outline-none"
            />
            <button
              onClick={handleCopy}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy Link'}
            </button>
          </div>
          <button
            onClick={handleNativeShare}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Share2 size={14} /> Share Rank
          </button>
        </div>
      </div>
    </div>
  );
}
