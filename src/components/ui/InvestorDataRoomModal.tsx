'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { CalendarClock, FileDown, Layers, ShieldCheck, X } from 'lucide-react';
import { useUserProfileStore } from '@/hooks/useUserProfileStore';
import {
  DEFAULT_INVESTOR_ROI_INPUTS,
  INVESTOR_ROI_INPUT_RANGES,
  PITCH_DECK_PATH,
  PITCH_METRICS,
  REVENUE_STREAMS,
  calculateInvestorRoi,
} from '@/lib/pitchData';
import type { InvestorLeadPayload, InvestorRoiInputs, TicketSizeBand } from '@/types';

const LEADS_STORAGE_KEY = 'resmart_leads';
const BOOKING_MAILTO = 'mailto:invest@resmartai.com?subject=ReSmart%20AI%20Investor%20Call';

const TICKET_SIZE_OPTIONS: Array<{ value: TicketSizeBand; label: string }> = [
  { value: '100k-250k', label: 'AED 100k – 250k' },
  { value: '250k-500k', label: 'AED 250k – 500k' },
  { value: '500k-1m', label: 'AED 500k – 1M' },
  { value: '1m-plus', label: 'AED 1M+' },
];

const SLIDER_LABELS: Record<keyof InvestorRoiInputs, string> = {
  dailyTargetOrders: 'Daily Target Orders',
  staffOpsCostAed: 'Daily Staff/Ops Cost (AED)',
  fleetSize: 'Fleet Size (drivers)',
  efficiencyPct: 'Routing Efficiency (%)',
};

function formatValue(value: number | string): string {
  if (typeof value !== 'number') return value;
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })}M`;
  if (value >= 1_000) return `AED ${(value / 1_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}K`;
  return `AED ${value.toLocaleString()}`;
}

function formatAed(value: number): string {
  return `AED ${Math.round(value).toLocaleString()}`;
}

function saveLeadLocally(lead: InvestorLeadPayload) {
  try {
    const existingRaw = window.localStorage.getItem(LEADS_STORAGE_KEY);
    const existing: Array<InvestorLeadPayload & { submittedAt: string }> = existingRaw ? JSON.parse(existingRaw) : [];
    existing.push({ ...lead, submittedAt: new Date().toISOString() });
    window.localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // Best-effort only — localStorage can throw under private browsing / quota limits.
  }
}

interface InvestorDataRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The Investor Data Room: market/financial metrics, the 5-stream revenue
 * model, a live ROI calculator, and — gating the deck download/booking
 * link — a confidential investor request form. No public sharing mechanics
 * here (unlike Customer/Merchant/Driver), per the brief's explicit
 * "no social sharing for Investors."
 */
export function InvestorDataRoomModal({ isOpen, onClose }: InvestorDataRoomModalProps) {
  const [inputs, setInputs] = useState<InvestorRoiInputs>(DEFAULT_INVESTOR_ROI_INPUTS);
  const [name, setName] = useState('');
  const [fundOrEntity, setFundOrEntity] = useState('');
  const [ticketSizeBand, setTicketSizeBand] = useState<TicketSizeBand>('100k-250k');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasSubmitted = useUserProfileStore((state) => state.hasSubmitted('investor'));
  const recordSubmission = useUserProfileStore((state) => state.recordSubmission);

  const roiResult = useMemo(() => calculateInvestorRoi(inputs), [inputs]);

  if (!isOpen) return null;

  const updateInput = (key: keyof InvestorRoiInputs) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setInputs((prev) => ({ ...prev, [key]: Number(event.target.value) }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !fundOrEntity.trim()) {
      setError('Name and Fund/Entity are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const lead: InvestorLeadPayload = { role: 'investor', name: name.trim(), fundOrEntity: fundOrEntity.trim(), ticketSizeBand };

    saveLeadLocally(lead);
    try {
      await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead, referredByCode: null }),
      });
    } catch {
      // Non-fatal — the localStorage fallback above already has this lead.
    }

    recordSubmission('investor', lead.name);
    setIsSubmitting(false);
  };

  return (
    <div className="pointer-events-auto hud-scrim absolute inset-0 z-50 flex items-center justify-center p-4">
      <div className="animate-modal-in glass-panel max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Investor Data Room</h3>
          <button
            onClick={onClose}
            aria-label="Close investor data room"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-neutral-400 transition hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <ul className="mt-3 space-y-3">
          {Object.values(PITCH_METRICS).map((metric) => (
            <li key={metric.label} className="border-b border-white/10 pb-2 last:border-none">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-sm text-neutral-300">{metric.label}</span>
                <span className="shrink-0 text-sm font-semibold text-white">{formatValue(metric.value)}</span>
              </div>
              <p className="mt-0.5 text-xs text-neutral-400">{metric.assumption}</p>
              <p className="text-[10px] uppercase tracking-wide text-neutral-400">{metric.source}</p>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-neutral-400">
          <Layers size={13} />
          5-Stream Revenue Model
        </div>
        <ul className="mt-2 space-y-2">
          {REVENUE_STREAMS.map((stream) => (
            <li key={stream.key} className="rounded-lg bg-white/5 px-3 py-2">
              <div className="text-xs font-semibold text-white">{stream.label}</div>
              <div className="text-[11px] text-neutral-400">{stream.description}</div>
            </li>
          ))}
        </ul>

        <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Interactive ROI Calculator</div>
          <div className="mt-3 space-y-3">
            {(Object.keys(INVESTOR_ROI_INPUT_RANGES) as Array<keyof InvestorRoiInputs>).map((key) => {
              const range = INVESTOR_ROI_INPUT_RANGES[key];
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-[11px] text-neutral-300">
                    <span>{SLIDER_LABELS[key]}</span>
                    <span className="font-semibold text-white">{inputs[key].toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min={range.min}
                    max={range.max}
                    step={range.step}
                    value={inputs[key]}
                    onChange={updateInput(key)}
                    className="mt-1 w-full accent-cyan-400"
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-[10px] uppercase tracking-wide text-neutral-400">Orders Fulfilled</div>
              <div className="text-sm font-semibold text-white">{roiResult.ordersFulfilled.toLocaleString()}</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-[10px] uppercase tracking-wide text-neutral-400">Net Profit</div>
              <div className={roiResult.netProfitAed >= 0 ? 'text-sm font-semibold text-emerald-300' : 'text-sm font-semibold text-red-400'}>
                {formatAed(roiResult.netProfitAed)}
              </div>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-[10px] uppercase tracking-wide text-neutral-400">Net Margin</div>
              <div className="text-sm font-semibold text-white">{roiResult.netMarginPct.toFixed(1)}%</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-[10px] uppercase tracking-wide text-neutral-400">ROI</div>
              <div className="text-sm font-semibold text-gold">{roiResult.roiPct.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {hasSubmitted ? (
          <div className="mt-5 space-y-2">
            <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-center text-xs text-emerald-300">
              Request received — full access unlocked below.
            </div>
            <a
              href={PITCH_DECK_PATH}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-gold px-4 py-2.5 text-xs font-semibold text-neutral-950 transition hover:opacity-90"
            >
              <FileDown size={14} /> Full Pitch Deck (PDF)
            </a>
            <a
              href={BOOKING_MAILTO}
              className="flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-medium text-neutral-200 transition hover:bg-white/10"
            >
              <CalendarClock size={14} /> Book a Call
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Confidential Data Room Request
            </div>
            <input
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Full Name"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
            />
            <input
              type="text"
              required
              value={fundOrEntity}
              onChange={(event) => setFundOrEntity(event.target.value)}
              placeholder="Fund / Entity"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
            />
            <select
              value={ticketSizeBand}
              onChange={(event) => setTicketSizeBand(event.target.value as TicketSizeBand)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
            >
              {TICKET_SIZE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Ticket Size: {option.label}
                </option>
              ))}
            </select>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-gold px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting…' : 'Request Data Room Access'}
            </button>
          </form>
        )}

        <div className="mt-5 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[11px] leading-relaxed text-neutral-500">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-neutral-400" />
          <p>
            This is not an offer of securities. Submitting this form reflects interest only and grants Priority Seed
            Allocation Rights — priority access to participate in a future funding round, subject to definitive
            documentation, due diligence, and applicable UAE/DIFC regulations. No investment decision should be made
            without independent legal and financial advice.
          </p>
        </div>
      </div>
    </div>
  );
}
