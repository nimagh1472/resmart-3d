'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Building2, Gauge, MapPin, TrendingUp } from 'lucide-react';
import { DISTRICTS, INVESTOR_SEED_CAPACITY, URGENCY_SPOTS } from '@/lib/pitchData';
import type { DistrictId, LeadRole } from '@/types';

type WaitlistRole = Exclude<LeadRole, 'investor'>;
const WAITLIST_ROLES: WaitlistRole[] = ['customer', 'merchant', 'driver'];

function formatGmv(value: number): string {
  return `AED ${(value / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
}

interface DistrictSelectorProps {
  selectedDistrict: DistrictId;
  onSelectDistrict: (id: DistrictId) => void;
}

/**
 * Neon district bar: switching districts updates the local metrics card;
 * below it, live "spots remaining" urgency counters per role (base pool
 * from pitchData.URGENCY_SPOTS, topped up by the best-effort in-memory
 * counter in app/api/waitlist/route.ts).
 */
export function DistrictSelector({ selectedDistrict, onSelectDistrict }: DistrictSelectorProps) {
  const [liveCounts, setLiveCounts] = useState<Partial<Record<LeadRole, number>>>({});

  useEffect(() => {
    let isMounted = true;
    fetch('/api/waitlist')
      .then((response) => response.json())
      .then((data) => {
        if (isMounted && data?.submissions) setLiveCounts(data.submissions);
      })
      .catch(() => {
        // Best-effort only — falls back to the static baseClaimed figures below.
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const activeDistrict = DISTRICTS.find((entry) => entry.id === selectedDistrict) ?? DISTRICTS[0];

  return (
    <section className="w-full px-4 py-10">
      <div className="glass-panel mx-auto w-full max-w-3xl rounded-3xl p-6 sm:p-8">
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-cyan-300">
          <MapPin size={13} /> Dubai Launch Districts
        </div>

        <div className="mx-auto mt-4 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
          {DISTRICTS.map((district) => (
            <button
              key={district.id}
              onClick={() => onSelectDistrict(district.id)}
              className={clsx(
                'rounded-full border px-3 py-2 text-xs font-medium transition',
                selectedDistrict === district.id
                  ? 'border-cyan-400/60 bg-cyan-400/10 text-white'
                  : 'border-white/10 bg-white/5 text-neutral-400 hover:border-white/20',
              )}
            >
              {district.label}
            </button>
          ))}
        </div>

        <div className="mx-auto mt-5 grid max-w-xl grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <Building2 size={16} className="mx-auto text-cyan-300" />
            <div className="mt-1 text-sm font-semibold text-white">{activeDistrict.merchantDensity}</div>
            <div className="text-[10px] uppercase tracking-wide text-neutral-500">Active Merchants</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <Gauge size={16} className="mx-auto text-cyan-300" />
            <div className="mt-1 text-sm font-semibold text-white">{activeDistrict.aiRouteEfficiencyPct}%</div>
            <div className="text-[10px] uppercase tracking-wide text-neutral-500">AI Route Efficiency</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <TrendingUp size={16} className="mx-auto text-cyan-300" />
            <div className="mt-1 text-sm font-semibold text-white">{formatGmv(activeDistrict.regionalGmvAed)}</div>
            <div className="text-[10px] uppercase tracking-wide text-neutral-500">Regional GMV</div>
          </div>
        </div>

        <div className="mx-auto mt-6 grid max-w-xl gap-2">
          {WAITLIST_ROLES.map((role) => {
            const pool = URGENCY_SPOTS[role];
            const claimed = pool.baseClaimed + (liveCounts[role] ?? 0);
            const remaining = Math.max(0, pool.totalSpots - claimed);
            return (
              <div key={role} className="flex items-center justify-between rounded-xl border border-gold/20 bg-gold/5 px-4 py-2.5 text-xs">
                <span className="text-neutral-300">
                  {remaining} / {pool.totalSpots} {pool.label} Remaining in {activeDistrict.label}
                </span>
                <span className="font-semibold text-gold">{remaining <= 10 ? 'Almost Full' : 'Open'}</span>
              </div>
            );
          })}
          <div className="flex items-center justify-between rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-2.5 text-xs">
            <span className="text-neutral-300">
              {INVESTOR_SEED_CAPACITY.label}: {INVESTOR_SEED_CAPACITY.reservedPct}% Reserved for{' '}
              {INVESTOR_SEED_CAPACITY.reservedForLabel}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
