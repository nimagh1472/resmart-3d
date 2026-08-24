'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Gem, MessageCircle, Share2, X } from 'lucide-react';
import { useUserProfileStore } from '@/hooks/useUserProfileStore';
import { SHOPPER_RANK_CONFIG } from '@/lib/pitchData';
import type { LeadRole } from '@/types';

type WaitlistRole = Exclude<LeadRole, 'investor'>;

const ROLE_LABELS: Record<WaitlistRole, string> = {
  shopper: 'Shopper',
  merchant: 'Merchant',
  driver: 'Driver',
};

const INVITE_POLL_INTERVAL_MS = 15_000;

interface ShareSuccessModalProps {
  role: WaitlistRole;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Post-submit share card for Shopper/Merchant/Driver — never shown to
 * Investor leads (those are confidential, no public sharing per the brief).
 * For Shopper specifically, also renders the invite-to-rank growth-loop
 * progress bar ("Invite N more friends -> Unlock Top 50 Rank"), computed
 * live off SHOPPER_RANK_CONFIG + the store's real share/invite counters.
 * WhatsApp is the primary share action (per the brief's growth-loop spec);
 * native share/copy-link is secondary. An interval poll against
 * /api/waitlist's best-effort invite counter credits real invites once it
 * reports new signups against this visitor's referral code.
 */
export function ShareSuccessModal({ role, isOpen, onClose }: ShareSuccessModalProps) {
  const referralCode = useUserProfileStore((state) => state.referralCode);
  const entry = useUserProfileStore((state) => state.waitlist[role]);
  const applyShareBoost = useUserProfileStore((state) => state.applyShareBoost);
  const applyInviteCredit = useUserProfileStore((state) => state.applyInviteCredit);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !referralCode) return;

    const pollInvites = async () => {
      try {
        const response = await fetch(`/api/waitlist?code=${encodeURIComponent(referralCode)}`);
        const data = await response.json();
        const serverTotal = typeof data.invitesForCode === 'number' ? data.invitesForCode : 0;
        const alreadyCredited = entry?.inviteCredits ?? 0;
        if (serverTotal > alreadyCredited) applyInviteCredit(role, serverTotal - alreadyCredited);
      } catch {
        // Best-effort only — never block the share UI on a network failure.
      }
    };

    pollInvites();
    const interval = setInterval(pollInvites, INVITE_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, referralCode, role]);

  if (!isOpen || !entry) return null;

  const positionLabel = `#${entry.waitlistPosition}`;
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
    applyShareBoost(role);
  };

  const handleNativeShare = async () => {
    if (!referralLink) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'ReSmart AI — Dubai Grand Launching',
          text: `I'm ${positionLabel} in line for ReSmart AI's Dubai launch!`,
          url: referralLink,
        });
        applyShareBoost(role);
        return;
      }
    } catch {
      // User dismissed the native share sheet — fall through to a clipboard copy instead.
    }
    handleCopy();
  };

  const whatsappShareUrl = referralLink
    ? `https://wa.me/?text=${encodeURIComponent(
        `I'm ${positionLabel} in line for ReSmart AI's Dubai launch! Join me: ${referralLink}`,
      )}`
    : '';

  const handleWhatsappShareClick = () => applyShareBoost(role);

  // Shopper-only growth-loop math: how many more invites close the gap to
  // the Top 50 tier, and where that would land the visitor's rank.
  const { topTierRank, topTierLabel, pointsPerInvite } = SHOPPER_RANK_CONFIG;
  const invitesNeeded = Math.max(0, Math.ceil((entry.waitlistPosition - topTierRank) / pointsPerInvite));
  const projectedPosition = Math.max(1, entry.waitlistPosition - invitesNeeded * pointsPerInvite);
  const hasReachedTopTier = entry.waitlistPosition <= topTierRank;

  return (
    <div className="pointer-events-auto hud-scrim absolute inset-0 z-50 flex items-center justify-center p-4">
      <div className="animate-modal-in glass-panel relative w-full max-w-sm rounded-3xl p-5">
        <button
          onClick={onClose}
          aria-label="Close share card"
          className="absolute right-2 top-2 flex min-h-[44px] min-w-[44px] items-center justify-center text-neutral-400 transition hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="overflow-hidden rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-[#03141c] via-[#04222c] to-[#031017] p-6 shadow-[0_0_40px_rgba(34,211,238,0.15)]">
          <div className="flex items-center justify-center gap-2 text-cyan-300">
            <Gem size={16} />
            <span className="text-xs font-semibold uppercase tracking-[0.25em]">ReSmart AI</span>
            <Gem size={16} />
          </div>
          <p className="mt-4 text-center text-lg font-semibold leading-snug text-white">
            You&apos;re <span className="text-cyan-300">{positionLabel}</span> in line for the Dubai launch!
          </p>
          <div className="mx-auto mt-3 flex w-fit items-center gap-1.5 rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
            {ROLE_LABELS[role]}
          </div>
        </div>

        {role === 'shopper' && (
          <div className="mt-4 rounded-xl border border-gold/25 bg-gold/5 p-3">
            <p className="text-center text-xs font-medium text-gold">
              {hasReachedTopTier
                ? `You're in the ${topTierLabel} rank!`
                : `Invite ${invitesNeeded} more friend${invitesNeeded === 1 ? '' : 's'} → Unlock ${topTierLabel} Rank (#${entry.waitlistPosition} → #${projectedPosition})`}
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-gold transition-all"
                style={{
                  width: `${Math.min(100, Math.max(4, (1 - entry.waitlistPosition / SHOPPER_RANK_CONFIG.seedRangeMax) * 100))}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-center text-xs text-emerald-300">
          {entry.shareBoostCount >= SHOPPER_RANK_CONFIG.maxShareBoosts
            ? 'Max share boost reached — invite friends for more.'
            : `Share for an instant rank boost (${SHOPPER_RANK_CONFIG.maxShareBoosts - entry.shareBoostCount} left) — every invite moves you further.`}
        </div>

        <div className="mt-4">
          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleWhatsappShareClick}
            aria-disabled={!whatsappShareUrl}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-gold px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:opacity-90"
          >
            <MessageCircle size={14} /> Share on WhatsApp
          </a>
          <button
            onClick={handleNativeShare}
            className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-white/10"
          >
            <Share2 size={14} /> Share My Spot
          </button>
          <div className="mt-2 flex items-center gap-2">
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
        </div>
      </div>
    </div>
  );
}
