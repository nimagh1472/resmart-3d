import { DISTRICTS, FINANCIAL_METRICS, MARKET_METRICS, MERCHANT_NETWORK_TARGET } from '@/lib/pitchData';

const bestRouteEfficiency = Math.max(...DISTRICTS.map((d) => d.aiRouteEfficiencyPct));

const METRICS = [
  { value: 'AED 1.5B', label: MARKET_METRICS.dubaiTam.label },
  { value: 'AED 8.4M', label: FINANCIAL_METRICS.yearOneARR.label },
  { value: `${MERCHANT_NETWORK_TARGET}+`, label: 'Founding Merchant Network' },
  { value: `${bestRouteEfficiency}%`, label: 'Peak AI Route Efficiency' },
];

/**
 * Homepage V2 — Proof. Exactly the 4 real figures already used in the
 * production pitch data (src/lib/pitchData.ts) — no invented numbers,
 * no dense metric cards, just large type and negative space.
 */
export function Proof() {
  return (
    <section className="relative flex min-h-screen w-full items-center justify-center bg-[#050709] px-6 py-24">
      <div className="grid w-full max-w-4xl grid-cols-1 gap-16 text-center sm:grid-cols-2 sm:gap-x-10 sm:gap-y-20">
        {METRICS.map((metric) => (
          <div key={metric.label} className="flex flex-col items-center gap-3">
            <span style={{ fontFamily: 'ui-serif, Georgia, serif' }} className="text-4xl text-cyan-300 sm:text-5xl">
              {metric.value}
            </span>
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">{metric.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
