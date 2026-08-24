'use client';

import { RefreshCw } from 'lucide-react';

const FLYWHEEL_STEPS = [
  { label: 'More Shoppers', top: 12, left: 50 },
  { label: 'More Local Data', top: 31, left: 83 },
  { label: 'Higher Merchant ROI', top: 69, left: 83 },
  { label: 'Denser Delivery Network', top: 88, left: 50 },
  { label: 'Faster AI Fulfillment', top: 69, left: 17 },
  { label: 'Better Shopper Retention', top: 31, left: 17 },
];

const PARTICLE_PATH = 'M 350,200 A 150,150 0 1 1 349.99,200.01 A 150,150 0 1 1 350,200';

/**
 * The compounding-growth story behind the SEARCH -> MATCH -> TRANSACT ->
 * FULFILL pipeline (NetworkFlowStrip): each stage of ReSmart AI's flywheel
 * feeds the next, looping back to "More Shoppers" — a defensible network
 * effect, not just a linear funnel. The glow ring + SVG-native
 * <animateMotion> particles need no JS animation loop; node labels are
 * plain percentage-positioned divs so the hexagon layout scales with the
 * container at any width.
 */
export function GrowthFlywheel() {
  return (
    <section className="w-full px-4 py-12 sm:py-16">
      <div className="glass-panel mx-auto w-full max-w-2xl rounded-3xl p-6 sm:p-8">
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-cyan-300">
          <RefreshCw size={13} /> ReSmart Growth Flywheel Loop
        </div>
        <p className="mx-auto mt-2 max-w-md text-center text-[11px] leading-relaxed text-neutral-500">
          Each stage compounds the next — a self-reinforcing network effect, not a one-time funnel.
        </p>

        <div className="relative mx-auto mt-6 aspect-square w-full max-w-sm">
          <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <radialGradient id="flywheel-particle-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#00E5FF" stopOpacity="1" />
                <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
              </radialGradient>
            </defs>

            <circle
              cx="200"
              cy="200"
              r="150"
              fill="none"
              stroke="#00E5FF"
              strokeOpacity="0.25"
              strokeWidth="1.5"
              strokeDasharray="4 10"
              className="flywheel-ring"
            />

            {[0, 1, 2].map((index) => (
              <circle key={index} r="5" fill="url(#flywheel-particle-glow)">
                <animateMotion path={PARTICLE_PATH} dur="9s" begin={`${-index * 3}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </svg>

          {FLYWHEEL_STEPS.map((step, index) => (
            <div
              key={step.label}
              style={{ top: `${step.top}%`, left: `${step.left}%` }}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-cyan-400/40 bg-neutral-950/80 text-[10px] font-semibold text-cyan-300">
                {index + 1}
              </span>
              <span className="glass-pill max-w-[7.5rem] px-2 py-1 text-center text-[9px] font-semibold uppercase leading-tight tracking-wide text-white sm:text-[10px]">
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
