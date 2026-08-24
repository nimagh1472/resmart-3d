'use client';

import { FileDown, Layers, X } from 'lucide-react';
import { useRoleStore } from '@/hooks/useRoleStore';
import { PITCH_DECK_PATH, PITCH_METRICS, REVENUE_STREAMS } from '@/lib/pitchData';

function formatValue(value: number | string): string {
  if (typeof value !== 'number') return value;
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })}M`;
  if (value >= 1_000) return `AED ${(value / 1_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}K`;
  return `AED ${value.toLocaleString()}`;
}

/**
 * 2D pitch deck modal surfacing every pitch metric with its source and
 * assumption, plus a link to the full deck. All figures come from
 * lib/pitchData — nothing here is hard-coded. Visibility is controlled by
 * useRoleStore's isQuickDeckOpen (opened via Overlay's header PDF button)
 * rather than local state, so it can be triggered from the HUD. Clicking
 * the PDF link itself also opens the lead-capture modal.
 */
export function QuickDeck() {
  const isOpen = useRoleStore((state) => state.isQuickDeckOpen);
  const setQuickDeckOpen = useRoleStore((state) => state.setQuickDeckOpen);
  const openLeadModal = useRoleStore((state) => state.openLeadModal);

  if (!isOpen) return null;

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-asphalt/60 backdrop-blur-sm">
      <div className="animate-modal-in max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900">Key Figures</h3>
          <button
            onClick={() => setQuickDeckOpen(false)}
            aria-label="Close quick pitch deck"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-neutral-500 transition hover:text-neutral-900"
          >
            <X size={16} />
          </button>
        </div>

        <ul className="mt-3 max-h-64 space-y-3 overflow-y-auto">
          {Object.values(PITCH_METRICS).map((metric) => (
            <li key={metric.label} className="border-b border-neutral-100 pb-2 last:border-none">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-sm text-neutral-700">{metric.label}</span>
                <span className="shrink-0 text-sm font-semibold text-neutral-900">{formatValue(metric.value)}</span>
              </div>
              {/* text-neutral-500/600 (not the -400/-300 this used to be) — those fail WCAG contrast on this white card. */}
              <p className="mt-0.5 text-xs text-neutral-500">{metric.assumption}</p>
              <p className="text-[10px] uppercase tracking-wide text-neutral-500">{metric.source}</p>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-neutral-500">
          <Layers size={13} />
          Multi-Stream Revenue Model
        </div>
        <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
          {REVENUE_STREAMS.map((stream) => (
            <li key={stream.key} className="rounded-lg bg-neutral-50 px-3 py-2">
              <div className="text-xs font-semibold text-neutral-900">{stream.label}</div>
              <div className="text-[11px] text-neutral-500">{stream.description}</div>
            </li>
          ))}
        </ul>

        <a
          href={PITCH_DECK_PATH}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => openLeadModal('pdf_download')}
          className="mt-4 flex items-center justify-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-neutral-700"
        >
          <FileDown size={14} />
          Full Pitch Deck (PDF)
        </a>
      </div>
    </div>
  );
}
