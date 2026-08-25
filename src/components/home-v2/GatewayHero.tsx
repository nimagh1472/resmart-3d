'use client';

import { useEffect, useRef } from 'react';
import { SPATIAL_ASSETS } from '@/lib/spatialAssets';
import { useIsDesktopViewport } from '@/hooks/useIsDesktopViewport';
import { useParallaxPointer } from '@/hooks/useParallaxPointer';
import type { LeadRole } from '@/types';

const ROLES: { label: string; role: LeadRole }[] = [
  { label: 'SHOP', role: 'shopper' },
  { label: 'SELL', role: 'merchant' },
  { label: 'DRIVE', role: 'driver' },
  { label: 'INVEST', role: 'investor' },
];

interface GatewayHeroProps {
  /** Wired to the homepage's real persona state + lead-capture/investor-modal flow in production; omitted (inert) in /lab/home-v2 QA. */
  onSelectPersona?: (role: LeadRole) => void;
}

/**
 * Homepage V2 Phase 1, Section 1 — a seamless visual continuation of
 * Spatial V2's Signature Dubai beat (same asset, same near-black grade),
 * so a visitor arriving here reads it as one world, not a new page.
 */
export function GatewayHero({ onSelectPersona }: GatewayHeroProps) {
  const isDesktop = useIsDesktopViewport();
  const pointer = useParallaxPointer();
  const parallaxRef = useRef<HTMLDivElement>(null);
  const url = SPATIAL_ASSETS.signature[isDesktop ? 'desktop' : 'mobile'];

  useEffect(() => {
    if (!isDesktop) return;
    let frame: number;
    const apply = () => {
      if (parallaxRef.current) {
        const x = pointer.current.x * 10;
        const y = pointer.current.y * 6;
        parallaxRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.04)`;
      }
      frame = requestAnimationFrame(apply);
    };
    frame = requestAnimationFrame(apply);
    return () => cancelAnimationFrame(frame);
  }, [isDesktop, pointer]);

  return (
    <section className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[#050709]">
      <div ref={parallaxRef} className="absolute inset-[-4%]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80" />

      <div className="relative z-10 flex flex-col items-center gap-10 px-6 text-center">
        <h1
          style={{ fontFamily: 'ui-serif, Georgia, serif', fontSize: 'clamp(2.625rem, 8vw, 6rem)' }}
          className="leading-tight text-white"
        >
          One city.
          <br />
          One intelligent commerce network.
        </h1>

        {/* Single glass element for this viewport — everything else here is typography/negative space. */}
        <nav className="glass-pill flex items-center gap-6 px-8 py-4 sm:gap-10">
          {ROLES.map(({ label, role }, i) => (
            <span key={label} className="flex items-center gap-6 sm:gap-10">
              <button
                type="button"
                onClick={() => onSelectPersona?.(role)}
                className="text-xs font-medium uppercase tracking-[0.25em] text-white/80 transition-colors hover:text-cyan-300"
              >
                {label}
              </button>
              {i < ROLES.length - 1 && <span className="h-3 w-px bg-white/20" aria-hidden />}
            </span>
          ))}
        </nav>
      </div>
    </section>
  );
}
