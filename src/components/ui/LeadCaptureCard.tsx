'use client';

import { useEffect, useState, type FormEvent } from 'react';
import clsx from 'clsx';
import confetti from 'canvas-confetti';
import { Bike, Building2, Car, CheckCircle2, Mail, MessageCircle, Store, Truck, UserRound, Zap } from 'lucide-react';
import { useUserProfileStore } from '@/hooks/useUserProfileStore';
import { DISTRICTS, VOUCHER_CONVERSION } from '@/lib/pitchData';
import { ShareSuccessModal } from '@/components/ui/ShareSuccessModal';
import type { DistrictId, LeadPayload, LeadRole, VehicleType } from '@/types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s-]{7,}$/;
const LEADS_STORAGE_KEY = 'resmart_leads';

/** The 3 form-driven funnels — Investor is handled entirely via the header button / Hero CTA, never a tab here. */
type FormRole = Exclude<LeadRole, 'investor'>;

const ROLE_TABS: Array<{ role: FormRole; label: string; icon: typeof UserRound }> = [
  { role: 'shopper', label: 'Shopper', icon: UserRound },
  { role: 'merchant', label: 'Merchant', icon: Building2 },
  { role: 'driver', label: 'Driver', icon: Truck },
];

const VEHICLE_OPTIONS: Array<{ value: VehicleType; label: string; icon: typeof Bike }> = [
  { value: 'motorcycle', label: 'Motorcycle', icon: Bike },
  { value: 'ev', label: 'EV', icon: Zap },
  { value: 'sedan', label: 'Sedan', icon: Car },
];

function isValidBusinessContact(value: string): boolean {
  const trimmed = value.trim();
  return EMAIL_PATTERN.test(trimmed) || PHONE_PATTERN.test(trimmed);
}

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

  const email = 'email' in lead ? lead.email : 'businessContact' in lead ? lead.businessContact : undefined;
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
  persona: LeadRole;
  onSelectPersona: (role: LeadRole) => void;
  selectedDistrict: DistrictId;
}

/**
 * The page's actual conversion engine: a persona-tabbed lead form (Shopper /
 * Merchant / Driver). The active tab is driven by the shared `persona`
 * state from app/page.tsx (also set by Hero's persona switcher) — clicking a
 * tab here calls back up through `onSelectPersona` so both controls stay in
 * sync. Investor has no tab here at all; it's a confidential request handled
 * entirely by the header button / Hero CTA opening the Investor Access modal.
 */
export function LeadCaptureCard({ persona, onSelectPersona, selectedDistrict }: LeadCaptureCardProps) {
  const [lastFormRole, setLastFormRole] = useState<FormRole>('shopper');
  const [email, setEmail] = useState('');
  const [storeName, setStoreName] = useState('');
  const [businessContact, setBusinessContact] = useState('');
  const [district, setDistrict] = useState<DistrictId>(selectedDistrict);
  const [vehicleType, setVehicleType] = useState<VehicleType>('motorcycle');
  const [licenseConfirmed, setLicenseConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareModalRole, setShareModalRole] = useState<FormRole | null>(null);

  useEffect(() => {
    if (persona !== 'investor') setLastFormRole(persona);
  }, [persona]);

  const activeTab: FormRole = persona === 'investor' ? lastFormRole : persona;

  const recordSubmission = useUserProfileStore((state) => state.recordSubmission);
  const hasSubmitted = useUserProfileStore((state) => state.hasSubmitted);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    let lead: LeadPayload;
    let identityEmail: string;

    if (activeTab === 'shopper') {
      if (!EMAIL_PATTERN.test(email.trim())) return setError('Enter a valid email address.');
      lead = { role: 'shopper', email: email.trim() };
      identityEmail = lead.email;
    } else if (activeTab === 'merchant') {
      if (!storeName.trim()) return setError('Enter your store name.');
      if (!isValidBusinessContact(businessContact)) return setError('Enter a valid business email or WhatsApp number.');
      lead = { role: 'merchant', storeName: storeName.trim(), businessContact: businessContact.trim(), district };
      identityEmail = lead.businessContact;
    } else {
      if (!EMAIL_PATTERN.test(email.trim())) return setError('Enter a valid email address.');
      if (!licenseConfirmed) return setError('Please confirm you hold a valid UAE driving license.');
      lead = { role: 'driver', email: email.trim(), vehicleType, licenseConfirmed };
      identityEmail = lead.email;
    }

    setIsSubmitting(true);
    await submitLead(lead);
    recordSubmission(lead.role, identityEmail);
    setIsSubmitting(false);
    setShareModalRole(activeTab);
  };

  return (
    <section id="lead-capture" className="w-full px-4 py-10">
      <div className="glass-panel mx-auto w-full max-w-2xl rounded-3xl p-6 sm:p-8">
        <h2 className="text-center text-xl font-semibold text-white sm:text-2xl">Join the ReSmart AI Launch</h2>
        <p className="mt-1 text-center text-sm text-neutral-400">
          Pick how you&apos;d like to join Dubai&apos;s first AI commerce &amp; logistics network.
        </p>

        <div className="mx-auto mt-5 grid max-w-md grid-cols-3 gap-1.5">
          {ROLE_TABS.map(({ role, label, icon: Icon }) => (
            <button
              key={role}
              type="button"
              onClick={() => onSelectPersona(role)}
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
              <p className="text-sm text-emerald-200">You&apos;re on the list — share your link to jump the queue.</p>
              <button
                onClick={() => setShareModalRole(activeTab)}
                className="rounded-full bg-gradient-to-r from-cyan-400 to-gold px-5 py-2 text-xs font-semibold text-neutral-950 transition hover:opacity-90"
              >
                Open My Share Link
              </button>
            </div>
          ) : activeTab === 'shopper' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-neutral-400">
                Unlock a AED {VOUCHER_CONVERSION.shopperVoucherValueAed} Founding Member Voucher &amp; early access.
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
                Get Found by AI Buyers in Dubai. 0% Commission for your first 3 months.
              </p>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-300">
                  <Store size={12} /> Store Name
                </label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(event) => setStoreName(event.target.value)}
                  placeholder="Your Store"
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
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-300">
                  <MessageCircle size={12} /> Business WhatsApp or Email
                </label>
                <input
                  type="text"
                  required
                  value={businessContact}
                  onChange={(event) => setBusinessContact(event.target.value)}
                  placeholder="owner@yourstore.ae or +971 5X XXX XXXX"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                />
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
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-neutral-400">
                Drive More. Keep More. 0% Commission Founding Slots &amp; AI Route Dispatch.
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
          )}
        </div>
      </div>

      {shareModalRole && (
        <ShareSuccessModal role={shareModalRole} isOpen={Boolean(shareModalRole)} onClose={() => setShareModalRole(null)} />
      )}
    </section>
  );
}
