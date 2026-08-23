'use client';

import { useState, type FormEvent } from 'react';
import clsx from 'clsx';
import confetti from 'canvas-confetti';
import { Gift, Mail, PartyPopper, User, X, Zap } from 'lucide-react';
import { useRoleStore } from '@/hooks/useRoleStore';

type LeadRole = 'Investor' | 'Shopper' | 'ReSmart Agent';

const ROLE_OPTIONS: LeadRole[] = ['Investor', 'Shopper', 'ReSmart Agent'];
const LEADS_STORAGE_KEY = 'resmart_leads';
const CAMPAIGN_COMPLETE_SOURCE = 'campaign_complete';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

interface StoredLead {
  name: string;
  email: string;
  role: LeadRole;
  wantsEarlyAccess: boolean;
  source: string | null;
  submittedAt: string;
  voucherCode?: string | null;
  totalGameEarnings?: number;
}

function saveLeadLocally(lead: StoredLead) {
  try {
    const existingRaw = window.localStorage.getItem(LEADS_STORAGE_KEY);
    const existing: StoredLead[] = existingRaw ? JSON.parse(existingRaw) : [];
    existing.push(lead);
    window.localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // Best-effort only — localStorage can throw under private browsing / quota limits.
  }
}

/**
 * Lead capture modal, opened via useRoleStore's openLeadModal() from three
 * places: the cinematic tour completing, the pitch deck PDF being
 * downloaded, and the Express Delivery zone completing. Every submission is
 * written to localStorage first (so no lead is ever lost even if the
 * network call below fails) and then best-effort POSTed to /api/lead.
 */
export function LeadCaptureModal() {
  const isOpen = useRoleStore((state) => state.isLeadModalOpen);
  const leadModalSource = useRoleStore((state) => state.leadModalSource);
  const closeLeadModal = useRoleStore((state) => state.closeLeadModal);
  const markLeadSubmitted = useRoleStore((state) => state.markLeadSubmitted);
  const voucherCode = useRoleStore((state) => state.voucherCode);
  const voucherCount = useRoleStore((state) => state.voucherCount);
  const voucherValue = useRoleStore((state) => state.voucherValue);
  const campaignTotalEarnings = useRoleStore((state) => state.campaignTotalEarnings);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<LeadRole>('Shopper');
  const [wantsEarlyAccess, setWantsEarlyAccess] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isCampaignComplete = leadModalSource === CAMPAIGN_COMPLETE_SOURCE;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const lead: StoredLead = {
      name: name.trim(),
      email: email.trim(),
      role,
      wantsEarlyAccess,
      source: leadModalSource,
      submittedAt: new Date().toISOString(),
      ...(isCampaignComplete ? { voucherCode, totalGameEarnings: campaignTotalEarnings } : {}),
    };

    saveLeadLocally(lead);

    try {
      await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
    } catch {
      // Non-fatal — the localStorage fallback above already has this lead.
    }

    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#22c55e', '#a855f7', '#7dd3fc'],
    });

    setIsSubmitting(false);
    setName('');
    setEmail('');
    markLeadSubmitted();
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-[60] flex items-center justify-center bg-neutral-950/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-purple-500/30 bg-gradient-to-b from-neutral-900 to-neutral-950 p-6 shadow-2xl shadow-purple-500/20">
        <button
          onClick={closeLeadModal}
          aria-label="Close early access form"
          className="absolute right-4 top-4 text-neutral-400 transition hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 text-purple-400">
          {isCampaignComplete ? <PartyPopper size={18} /> : <Zap size={18} />}
          <span className="text-xs font-semibold uppercase tracking-widest">ReSmart AI</span>
        </div>
        <h2 className="mt-2 text-xl font-semibold text-white">
          {isCampaignComplete ? 'Campaign Completed!' : 'Get VIP Early Access'}
        </h2>
        <p className="mt-1 text-sm text-neutral-400">
          {isCampaignComplete
            ? "You finished the full campaign — here's what you earned."
            : "Leave your details and we'll follow up with early access and a free delivery voucher."}
        </p>

        {isCampaignComplete && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-emerald-300">Total Game Earnings</span>
              <span className="text-lg font-semibold text-white">{currencyFormatter.format(campaignTotalEarnings)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-emerald-500/20 pt-2">
              <span className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-emerald-300">
                <Gift size={12} /> Real Off Voucher
              </span>
              <span className="text-sm font-semibold text-white">
                {voucherCount > 0 ? `$${voucherValue} off` : 'Keep earning — $1,000 unlocks $5 off'}
              </span>
            </div>
            {voucherCode && (
              <p className="mt-2 rounded-lg bg-neutral-950/60 px-3 py-2 text-center font-mono text-sm tracking-widest text-amber-300">
                {voucherCode}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-300">
              <User size={12} /> Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-300">
              <Mail size={12} /> Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
              placeholder="jane@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-300">I am a...</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRole(option)}
                  className={clsx(
                    'rounded-lg border px-2 py-2 text-xs font-medium transition',
                    role === option
                      ? 'border-purple-500 bg-purple-500/20 text-white'
                      : 'border-neutral-700 text-neutral-400 hover:border-neutral-500',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-2 text-xs text-neutral-300">
            <input
              type="checkbox"
              checked={wantsEarlyAccess}
              onChange={(event) => setWantsEarlyAccess(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-neutral-600 bg-neutral-900 text-green-500 focus:ring-green-500"
            />
            Get VIP Early Access &amp; Free Delivery Voucher
          </label>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-gradient-to-r from-purple-500 to-green-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting…' : isCampaignComplete ? 'Claim Your Voucher' : 'Claim Early Access'}
          </button>
        </form>
      </div>
    </div>
  );
}
