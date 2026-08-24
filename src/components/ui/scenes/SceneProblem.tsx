'use client';

import { AlertTriangle } from 'lucide-react';
import { SceneHeading } from '@/components/ui/SceneHeading';

/**
 * Scene 02 — PROBLEM. The fragmentation thesis, previously only surfaced
 * inside the gated Investor Access modal's pre-submission teaser — promoted
 * here to the main scroll narrative since it's qualitative market context,
 * not a financial specific (those stay gated). The modal keeps its own copy
 * of this line too, for visitors who open Investor Access directly without
 * scrolling the page first.
 */
export function SceneProblem() {
  return (
    <section className="flex w-full flex-col items-center px-4 py-16 sm:py-24">
      <SceneHeading index={2} name="Problem" tagline="Demand is fragmented." />
      <div className="glass-panel mx-auto mt-6 w-full max-w-xl rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-red-300/80">
          <AlertTriangle size={13} /> The Problem
        </div>
        <p className="mt-2 text-sm leading-relaxed text-neutral-400">
          Dubai&apos;s local commerce is fragmented across WhatsApp groups and delivery apps taking 20-30%
          commissions — merchants overpay for discovery, drivers idle between disconnected platforms, and shoppers
          can&apos;t find what&apos;s nearby in real time.
        </p>
      </div>
    </section>
  );
}
