'use client';

import { useState } from 'react';
import { Clock3, MapPin, Sparkles } from 'lucide-react';

const PLACEHOLDER = 'Find Italian dining under AED 250 in Downtown Dubai within 10 mins...';

const ILLUSTRATIVE_MATCHES = [
  { name: 'Trattoria Al Bahr', category: 'Italian · Fine Dining', eta: '6 min', price: 'AED 180' },
  { name: 'Nonna’s Downtown', category: 'Italian · Casual', eta: '9 min', price: 'AED 95' },
  { name: 'Vino & Vine', category: 'Italian · Wine Bar', eta: '10 min', price: 'AED 220' },
];

/**
 * The tangible face of "AI Commerce Search" — an intent-driven search bar,
 * not a chat bubble. Focus reveals a spatial preview of how a shopper's
 * intent resolves to merchant inventory; this is illustrative UI only (no
 * real search backend/merchant database exists behind this demo).
 */
export function AiIntentSearch() {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative mx-auto mt-5 w-full max-w-md">
      <div className="tier-1-nav flex items-center gap-2 rounded-2xl px-4 py-3">
        <Sparkles size={15} className="shrink-0 text-cyan-300" />
        <input
          type="text"
          placeholder={PLACEHOLDER}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full min-w-0 bg-transparent text-xs text-white outline-none placeholder:text-neutral-500 sm:text-sm"
        />
      </div>

      {isFocused && (
        <div className="glass-panel absolute inset-x-0 top-full z-40 mt-2 rounded-2xl p-2">
          <div className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
            Illustrative Spatial Preview — Matched Merchant Inventory
          </div>
          <ul className="mt-1 space-y-1">
            {ILLUSTRATIVE_MATCHES.map((match) => (
              <li key={match.name} className="flex items-center justify-between gap-2 rounded-xl px-2 py-2 hover:bg-white/5">
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-white">{match.name}</div>
                  <div className="truncate text-[10px] text-neutral-500">{match.category}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-[10px] text-cyan-300">
                  <span className="flex items-center gap-0.5">
                    <Clock3 size={10} /> {match.eta}
                  </span>
                  <span className="flex items-center gap-0.5 font-mono">
                    <MapPin size={10} /> {match.price}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
