'use client';

import { useRef } from 'react';
import { useSpatialProgress } from '@/hooks/useSpatialProgress';

const BEATS = ['MATCHED', 'ROUTED', 'DELIVERED'];
const STEP = 1 / BEATS.length;
const NODES: { key: 'Shopper' | 'Merchant' | 'Driver'; x: number; y: number }[] = [
  { key: 'Shopper', x: 20, y: 30 },
  { key: 'Merchant', x: 50, y: 68 },
  { key: 'Driver', x: 80, y: 30 },
];

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/**
 * Homepage V2 — the shopper/merchant/driver threads converge. No
 * photographic background here: a near-black live UI (thin cyan lines
 * drawing between three labeled nodes) is the "one transaction" itself,
 * distinct from the photographic story beats around it.
 */
export function OneTransaction() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progress = useSpatialProgress(wrapperRef);
  const activeIndex = Math.min(BEATS.length - 1, Math.floor(progress / STEP));

  // Line 1 (Shopper -> Merchant) draws during MATCHED, line 2 (Merchant ->
  // Driver) during ROUTED; both stay fully drawn once DELIVERED lights up.
  const line1 = smoothstep(progress / (STEP * 1.1));
  const line2 = smoothstep((progress - STEP) / (STEP * 1.1));
  const delivered = smoothstep((progress - STEP * 1.7) / (STEP * 1.1));

  return (
    <div ref={wrapperRef} style={{ position: 'relative', height: '300vh' }}>
      <section className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden bg-[#050709]">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0" aria-hidden>
          <line
            x1={NODES[0].x}
            y1={NODES[0].y}
            x2={NODES[1].x}
            y2={NODES[1].y}
            stroke="rgba(0,245,212,0.7)"
            strokeWidth="0.25"
            strokeDasharray="60"
            strokeDashoffset={60 - 60 * line1}
          />
          <line
            x1={NODES[1].x}
            y1={NODES[1].y}
            x2={NODES[2].x}
            y2={NODES[2].y}
            stroke="rgba(0,245,212,0.7)"
            strokeWidth="0.25"
            strokeDasharray="60"
            strokeDashoffset={60 - 60 * line2}
          />
          {NODES.map((node) => (
            <circle key={node.key} cx={node.x} cy={node.y} r="0.8" fill="rgba(255,255,255,0.85)" />
          ))}
        </svg>

        {NODES.map((node) => (
          <span
            key={node.key}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.2em] text-white/60"
            style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, calc(-50% - 18px))' }}
          >
            {node.key}
          </span>
        ))}

        <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
          <h2 style={{ fontFamily: 'ui-serif, Georgia, serif' }} className="text-2xl text-white sm:text-4xl">
            One transaction. Three roles. One network.
          </h2>

          <div className="flex items-center gap-4 sm:gap-8">
            {BEATS.map((beat, i) => {
              const isFinal = i === BEATS.length - 1;
              const opacity = smoothstep(1 - Math.abs(activeIndex - i));
              return (
                <span key={beat} className="flex items-center gap-4 sm:gap-8">
                  <span
                    style={{ opacity: i <= activeIndex ? (isFinal ? delivered || opacity : opacity) : 0.15 }}
                    className={
                      isFinal
                        ? 'glass-pill px-5 py-2 text-sm font-medium uppercase tracking-[0.2em] text-cyan-300'
                        : 'text-sm font-medium uppercase tracking-[0.2em] text-white/70'
                    }
                  >
                    {beat}
                  </span>
                  {i < BEATS.length - 1 && <span className="h-px w-6 bg-white/20" aria-hidden />}
                </span>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
