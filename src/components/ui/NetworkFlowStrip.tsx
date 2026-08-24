'use client';

import { ArrowRight } from 'lucide-react';

const NETWORK_STEPS = ['SEARCH', 'MATCH', 'TRANSACT', 'FULFILL'];

/**
 * Lightweight DOM/CSS stand-in for the 3D backdrop's NetworkPulse
 * (components/3d/World.tsx) — a 6s-looping dot travelling the same
 * SEARCH -> MATCH -> TRANSACT -> FULFILL sequence, rendered in-flow so the
 * concept reads even on small screens where the fixed 3D canvas is mostly
 * background texture rather than a legible diagram.
 */
export function NetworkFlowStrip() {
  return (
    <section className="w-full px-4 py-6">
      <div className="glass-panel network-flow-strip mx-auto flex w-full max-w-2xl items-center justify-between gap-1 rounded-2xl px-4 py-4 sm:gap-2 sm:px-6">
        {NETWORK_STEPS.map((step, index) => (
          <div key={step} className="flex flex-1 items-center gap-1 sm:gap-2">
            <div className="flex flex-1 flex-col items-center gap-1">
              <span
                className="network-flow-node h-2 w-2 rounded-full bg-cyan-400"
                style={{ animationDelay: `${index * 1.5}s` }}
              />
              <span className="text-center text-[10px] font-semibold uppercase tracking-widest text-neutral-400 sm:text-[11px]">
                {step}
              </span>
            </div>
            {index < NETWORK_STEPS.length - 1 && (
              <ArrowRight size={13} className="mb-4 shrink-0 text-neutral-600" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
