'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Gem, MessageCircle, Share2, X } from 'lucide-react';
import { useUserProfileStore } from '@/hooks/useUserProfileStore';
import type { LeadRole } from '@/types';

type WaitlistRole = Exclude<LeadRole, 'investor'>;

const ROLE_LABELS: Record<WaitlistRole, string> = {
  customer: 'Customer',
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
 * Post-submit share card for Customer/Merchant/Driver — never shown to
 * Investor leads (those are confidential, no public sharing per the brief).
 * Each share action jumps the visitor's waitlist position by 10 (capped
 * server-side in useUserProfileStore); an interval poll against
 * /api/waitlist's best-effort invite counter credits +5 per successful
 * invite once it reports new signups against this visitor's referral code.
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

        <div className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-center text-xs text-emerald-300">
          {entry.shareBoostCount >= 3
            ? 'Max share boost reached — invite friends for more.'
            : `Share for an instant +10 jump (${3 - entry.shareBoostCount} left) — every invite adds +5 more.`}
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
            className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-gold px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:opacity-90"
          >
            <Share2 size={14} /> Share My Spot
          </button>
          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => applyShareBoost(role)}
            aria-disabled={!whatsappShareUrl}
            className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
          >
            <MessageCircle size={14} /> Share on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
