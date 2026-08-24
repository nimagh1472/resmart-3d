'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { CalendarClock, ChevronDown, FileDown, Layers, ShieldCheck, X } from 'lucide-react';
import { useUserProfileStore } from '@/hooks/useUserProfileStore';
import {
  DEFAULT_SEED_SCENARIO_INPUTS,
  METHODOLOGY_NOTE,
  PITCH_DECK_PATH,
  PITCH_METRICS,
  REVENUE_STREAMS,
  SEED_SCENARIO_INPUT_RANGES,
  calculateSeedScenario,
} from '@/lib/pitchData';
import type { InvestorLeadPayload, SeedScenarioInputs, TicketSizeBand } from '@/types';

const LEADS_STORAGE_KEY = 'resmart_leads';
const BOOKING_MAILTO = 'mailto:invest@resmartai.com?subject=ReSmart%20AI%20Investor%20Call';

const TICKET_SIZE_OPTIONS: Array<{ value: TicketSizeBand; label: string }> = [
  { value: '100k-500k', label: 'AED 100k – 500k' },
  { value: '500k-1m', label: 'AED 500k – 1M' },
  { value: '1m-2m', label: 'AED 1M – 2M' },
  { value: '2m-3.5m', label: 'AED 2M – 3.5M' },
  { value: '3.5m-plus', label: 'AED 3.5M+' },
];

const SLIDER_LABELS: Record<keyof SeedScenarioInputs, string> = {
  seedAllocationAed: 'Seed Allocation (AED)',
  projectedMerchantScale: 'Projected Merchant Scale',
};

function formatValue(value: number | string): string {
  if (typeof value !== 'number') return value;
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })}M`;
  if (value >= 1_000) return `AED ${(value / 1_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}K`;
  return `AED ${value.toLocaleString()}`;
}

function formatAed(value: number): string {
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })}M`;
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

interface InvestorAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The Investor Access fast-lane — a hard-gated single entry point (opened
 * only from StickyHeader's "Investor Access →" button or Hero's CTA/persona
 * switcher when persona === 'investor'). Before submission this renders
 * nothing but a one-line teaser and the qualification form: Name,
 * Fund/Entity, Ticket Size, Work Email/LinkedIn. Only after submitting does
 * it reveal the market/financial metrics, the 5-stream revenue model, the
 * interactive Seed Scenario Model, the deck download, and the meeting link.
 */
export function InvestorAccessModal({ isOpen, onClose }: InvestorAccessModalProps) {
  const [inputs, setInputs] = useState<SeedScenarioInputs>(DEFAULT_SEED_SCENARIO_INPUTS);
  const [name, setName] = useState('');
  const [fundOrEntity, setFundOrEntity] = useState('');
  const [ticketSizeBand, setTicketSizeBand] = useState<TicketSizeBand>('100k-500k');
  const [workEmailOrLinkedIn, setWorkEmailOrLinkedIn] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);

  const hasSubmitted = useUserProfileStore((state) => state.hasSubmitted('investor'));
  const recordSubmission = useUserProfileStore((state) => state.recordSubmission);

  const scenarioResult = useMemo(() => calculateSeedScenario(inputs), [inputs]);

  if (!isOpen) return null;

  const updateInput = (key: keyof SeedScenarioInputs) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setInputs((prev) => ({ ...prev, [key]: Number(event.target.value) }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !fundOrEntity.trim() || !workEmailOrLinkedIn.trim()) {
      setError('Name, Fund/Entity, and Work Email or LinkedIn are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const lead: InvestorLeadPayload = {
      role: 'investor',
      name: name.trim(),
      fundOrEntity: fundOrEntity.trim(),
      ticketSizeBand,
      workEmailOrLinkedIn: workEmailOrLinkedIn.trim(),
    };

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
          <h3 className="text-sm font-semibold text-white">Investor Access</h3>
          <button
            onClick={onClose}
            aria-label="Close investor access"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-neutral-400 transition hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {!hasSubmitted ? (
          <>
            <p className="mt-2 text-xs text-neutral-400">
              Private Seed Access — for qualified VCs &amp; Angels. Submit your details to unlock the confidential
              investment teaser, the Seed Scenario Model, and the full pitch deck.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                Qualification
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
              <input
                type="text"
                required
                value={workEmailOrLinkedIn}
                onChange={(event) => setWorkEmailOrLinkedIn(event.target.value)}
                placeholder="Work Email or LinkedIn URL"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-gold px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting…' : 'Unlock Investment Teaser →'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-center text-xs text-emerald-300">
              Request received — confidential investment teaser unlocked below.
            </div>

            <ul className="mt-4 space-y-3">
              {Object.values(PITCH_METRICS).map((metric) => (
                <li key={metric.label} className="border-b border-white/10 pb-2 last:border-none">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-sm text-neutral-300">{metric.label}</span>
                    <span className="shrink-0 text-sm font-semibold text-white">{formatValue(metric.value)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-400">{metric.assumption}</p>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setIsMethodologyOpen((prev) => !prev)}
              className="mt-2 flex items-center gap-1 text-[11px] font-medium text-cyan-300 underline-offset-2 hover:underline"
            >
              Assumptions &amp; Sources
              <ChevronDown size={12} className={isMethodologyOpen ? 'rotate-180 transition' : 'transition'} />
            </button>
            {isMethodologyOpen && <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">{METHODOLOGY_NOTE}</p>}

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
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Seed Scenario Model</div>
              <div className="mt-3 space-y-3">
                {(Object.keys(SEED_SCENARIO_INPUT_RANGES) as Array<keyof SeedScenarioInputs>).map((key) => {
                  const range = SEED_SCENARIO_INPUT_RANGES[key];
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
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white/5 p-2">
                  <div className="text-[10px] uppercase tracking-wide text-neutral-400">Projected ARR</div>
                  <div className="text-sm font-semibold text-white">{formatAed(scenarioResult.projectedArrAed)}</div>
                </div>
                <div className="rounded-lg bg-white/5 p-2">
                  <div className="text-[10px] uppercase tracking-wide text-neutral-400">Est. Runway</div>
                  <div className="text-sm font-semibold text-white">{scenarioResult.estimatedRunwayMonths.toFixed(1)} mo</div>
                </div>
                <div className="rounded-lg bg-white/5 p-2">
                  <div className="text-[10px] uppercase tracking-wide text-neutral-400">ARR Coverage</div>
                  <div className="text-sm font-semibold text-gold">{scenarioResult.arrCoverageMultiple.toFixed(1)}x</div>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-2">
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
                <CalendarClock size={14} /> Request a Meeting
              </a>
            </div>
          </>
        )}

        <div className="mt-5 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[11px] leading-relaxed text-neutral-500">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-neutral-400" />
          <p>
            This is not an offer of securities. Submitting this form reflects interest only and grants Priority Seed
            Access — priority access to participate in a future funding round, subject to definitive documentation,
            due diligence, and applicable UAE regulatory frameworks. No investment decision should be made without
            independent legal and financial advice.
          </p>
        </div>
      </div>
    </div>
  );
}
