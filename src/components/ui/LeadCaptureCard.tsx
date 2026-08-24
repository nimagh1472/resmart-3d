'use client';

import { useState, type FormEvent } from 'react';
import clsx from 'clsx';
import confetti from 'canvas-confetti';
import { Bike, Building2, Car, CheckCircle2, Clapperboard, Mail, Truck, UserRound, Zap } from 'lucide-react';
import { useUserProfileStore } from '@/hooks/useUserProfileStore';
import { DISTRICTS, URGENCY_SPOTS, VOUCHER_CONVERSION } from '@/lib/pitchData';
import { ShareSuccessModal } from '@/components/ui/ShareSuccessModal';
import type { DistrictId, LeadPayload, LeadRole, VehicleType } from '@/types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LEADS_STORAGE_KEY = 'resmart_leads';

type WaitlistRole = Exclude<LeadRole, 'investor'>;

const ROLE_TABS: Array<{ role: LeadRole; label: string; icon: typeof UserRound }> = [
  { role: 'customer', label: 'Customer', icon: UserRound },
  { role: 'merchant', label: 'Merchant', icon: Building2 },
  { role: 'driver', label: 'Driver', icon: Truck },
  { role: 'investor', label: 'Investor', icon: Clapperboard },
];

const VEHICLE_OPTIONS: Array<{ value: VehicleType; label: string; icon: typeof Bike }> = [
  { value: 'motorcycle', label: 'Motorcycle', icon: Bike },
  { value: 'ev', label: 'EV', icon: Zap },
  { value: 'sedan', label: 'Sedan', icon: Car },
];

function saveLeadLocally(lead: LeadPayload) {
  try {
    const existingRaw = window.localStorage.getItem(LEADS_STORAGE_KEY);
    const existing: Array<LeadPayload & { submittedAt: string }> = existingRaw ? JSON.parse(existingRaw) : [];
    existing.push({ ...lead, submittedAt: new Date().toISOString() });
    window.localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // Best-effort only — localStorage can throw under private browsing / quota limits.
  }
}

function getReferredByCode(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('ref');
}

async function submitLead(lead: LeadPayload) {
  saveLeadLocally(lead);
  const referredByCode = getReferredByCode();

  try {
    await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead, referredByCode }),
    });
  } catch {
    // Non-fatal — the localStorage fallback above already has this lead.
  }

  const email = 'email' in lead ? lead.email : 'businessEmail' in lead ? lead.businessEmail : undefined;
  if (email) {
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: lead.role, email, referredByCode }),
      });
    } catch {
      // Non-fatal — this only feeds the "spots remaining" display, not the lead record itself.
    }
  }

  confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 }, colors: ['#22c55e', '#D4AF37', '#00E5FF'] });
}

interface LeadCaptureCardProps {
  selectedDistrict: DistrictId;
  onOpenDataRoom: () => void;
}

/**
 * The page's actual conversion engine: a role-tabbed lead form (Customer /
 * Merchant / Driver / Investor), each with its own field set and copy.
 * Investor doesn't collect anything here — it hands off straight to the
 * Data Room modal, since Investor leads are a confidential request with no
 * public sharing mechanics (unlike the other three roles, which unlock a
 * WhatsApp/referral share flow after submitting).
 */
export function LeadCaptureCard({ selectedDistrict, onOpenDataRoom }: LeadCaptureCardProps) {
  const [activeTab, setActiveTab] = useState<LeadRole>('customer');
  const [email, setEmail] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [district, setDistrict] = useState<DistrictId>(selectedDistrict);
  const [vehicleType, setVehicleType] = useState<VehicleType>('motorcycle');
  const [licenseConfirmed, setLicenseConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareModalRole, setShareModalRole] = useState<WaitlistRole | null>(null);

  const recordSubmission = useUserProfileStore((state) => state.recordSubmission);
  const hasSubmitted = useUserProfileStore((state) => state.hasSubmitted);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    let lead: LeadPayload;
    let identityEmail: string;

    if (activeTab === 'customer') {
      if (!EMAIL_PATTERN.test(email.trim())) return setError('Enter a valid email address.');
      lead = { role: 'customer', email: email.trim() };
      identityEmail = lead.email;
    } else if (activeTab === 'merchant') {
      if (!EMAIL_PATTERN.test(businessEmail.trim())) return setError('Enter a valid business email address.');
      lead = { role: 'merchant', businessEmail: businessEmail.trim(), district };
      identityEmail = lead.businessEmail;
    } else if (activeTab === 'driver') {
      if (!EMAIL_PATTERN.test(email.trim())) return setError('Enter a valid email address.');
      if (!licenseConfirmed) return setError('Please confirm you hold a valid UAE driving license.');
      lead = { role: 'driver', email: email.trim(), vehicleType, licenseConfirmed };
      identityEmail = lead.email;
    } else {
      return; // Investor tab has no form here — handled by the CTA below.
    }

    setIsSubmitting(true);
    await submitLead(lead);
    recordSubmission(lead.role, identityEmail);
    setIsSubmitting(false);
    setShareModalRole(lead.role);
  };

  return (
    <section id="lead-capture" className="w-full px-4 py-10">
      <div className="glass-panel mx-auto w-full max-w-2xl rounded-3xl p-6 sm:p-8">
        <h2 className="text-center text-xl font-semibold text-white sm:text-2xl">Join the ReSmart AI Launch</h2>
        <p className="mt-1 text-center text-sm text-neutral-400">
          Pick how you&apos;d like to join Dubai&apos;s first AI commerce &amp; logistics network.
        </p>

        <div className="mx-auto mt-5 grid max-w-lg grid-cols-4 gap-1.5">
          {ROLE_TABS.map(({ role, label, icon: Icon }) => (
            <button
              key={role}
              type="button"
              onClick={() => setActiveTab(role)}
              className={clsx(
                'flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition',
                activeTab === role
                  ? 'border-cyan-400/60 bg-cyan-400/10 text-white'
                  : 'border-white/10 bg-white/5 text-neutral-400 hover:border-white/20',
              )}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {hasSubmitted(activeTab) ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-6 text-center">
              <CheckCircle2 size={28} className="text-emerald-300" />
              <p className="text-sm text-emerald-200">
                You&apos;re on the list{activeTab !== 'investor' ? ' — share your link to jump the queue.' : '.'}
              </p>
              {activeTab !== 'investor' && (
                <button
                  onClick={() => setShareModalRole(activeTab as WaitlistRole)}
                  className="rounded-full bg-gradient-to-r from-cyan-400 to-gold px-5 py-2 text-xs font-semibold text-neutral-950 transition hover:opacity-90"
                >
                  Open My Share Link
                </button>
              )}
            </div>
          ) : activeTab === 'customer' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-neutral-400">
                Rank in the Top {URGENCY_SPOTS.customer.totalSpots} for a AED {VOUCHER_CONVERSION.customerVoucherValueAed}{' '}
                launch voucher &amp; instant cashback.
              </p>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-300">
                  <Mail size={12} /> Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="jane@example.com"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-gold px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting…' : 'Secure My Voucher Spot'}
              </button>
            </form>
          ) : activeTab === 'merchant' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-neutral-400">
                Unlock 3 months at 0% commission &amp; priority AI ad search placement in your district.
              </p>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-300">
                  <Mail size={12} /> Business Email
                </label>
                <input
                  type="email"
                  required
                  value={businessEmail}
                  onChange={(event) => setBusinessEmail(event.target.value)}
                  placeholder="owner@yourstore.ae"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-300">Store District</label>
                <select
                  value={district}
                  onChange={(event) => setDistrict(event.target.value as DistrictId)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                >
                  {DISTRICTS.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-gold px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting…' : 'Claim Founding Merchant Slot'}
              </button>
            </form>
          ) : activeTab === 'driver' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-neutral-400">Unlock priority route dispatch &amp; zero-commission delivery slots.</p>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-300">
                  <Mail size={12} /> Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-300">Vehicle Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {VEHICLE_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setVehicleType(value)}
                      className={clsx(
                        'flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition',
                        vehicleType === value
                          ? 'border-cyan-400/60 bg-cyan-400/10 text-white'
                          : 'border-neutral-700 text-neutral-400 hover:border-neutral-500',
                      )}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-start gap-2 text-xs text-neutral-300">
                <input
                  type="checkbox"
                  checked={licenseConfirmed}
                  onChange={(event) => setLicenseConfirmed(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-neutral-600 bg-neutral-900 text-cyan-500 focus:ring-cyan-500"
                />
                I confirm I hold a valid UAE driving license.
              </label>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-gold px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting…' : 'Claim Zero-Commission Slot'}
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-gold/25 bg-gold/5 p-6 text-center">
              <Clapperboard size={24} className="text-gold" />
              <p className="text-sm text-neutral-300">
                Confidential — request access to the full Investor Data Room: market model, 5-stream revenue
                breakdown, and an interactive ROI calculator.
              </p>
              <button
                onClick={onOpenDataRoom}
                className="rounded-full bg-gradient-to-r from-cyan-400 to-gold px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:opacity-90"
              >
                Request Data Room Access
              </button>
            </div>
          )}
        </div>
      </div>

      {shareModalRole && (
        <ShareSuccessModal role={shareModalRole} isOpen={Boolean(shareModalRole)} onClose={() => setShareModalRole(null)} />
      )}
    </section>
  );
}
