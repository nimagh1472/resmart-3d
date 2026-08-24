'use client';

import { useState } from 'react';
import type { LeadRole } from '@/types';

const VIDEO_SRC = '/assets/cyber-dubai-loop.mp4';

interface BackgroundVideoProps {
  persona?: LeadRole;
  /** True while Scene 07 (Investor Terminal) is scrolled into view — see app/page.tsx. */
  investorSceneInView?: boolean;
}

/**
 * Full-viewport looping background video — replaces the old Three.js ambient
 * skyline canvas. Falls back to a static gradient if the source is missing
 * or fails to load. The vignette overlay's tint shifts to a warm gold cast
 * (the "Private Intelligence Terminal" environment) when either the
 * persona switcher is set to 'investor' OR the visitor has scrolled into
 * Scene 07 — vs. the default teal-tinted obsidian cast otherwise.
 */
export function BackgroundVideo({ persona, investorSceneInView }: BackgroundVideoProps) {
  const [hasError, setHasError] = useState(false);
  const isInvestor = persona === 'investor' || Boolean(investorSceneInView);

  return (
    <>
      {hasError ? (
        <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_20%,rgba(0,245,212,0.08),transparent_60%),linear-gradient(to_bottom,#0B0F12,#05070a)]" />
      ) : (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          // iOS Safari ignores the camelCase `playsInline` prop on some
          // versions unless the lowercase webkit attribute is also present.
          webkit-playsinline="true"
          disablePictureInPicture
          className="fixed inset-0 z-0 h-full w-full object-cover pointer-events-none opacity-60"
          onError={() => setHasError(true)}
        >
          <source src={VIDEO_SRC} type="video/mp4" />
        </video>
      )}
      <div
        className={
          isInvestor
            ? 'pointer-events-none fixed inset-0 z-10 bg-gradient-to-b from-black/70 via-transparent to-[#0A0D0F] transition-colors duration-700'
            : 'pointer-events-none fixed inset-0 z-10 bg-gradient-to-b from-black/60 via-transparent to-[#0A0D0F] transition-colors duration-700'
        }
      />
      {isInvestor && (
        <div className="pointer-events-none fixed inset-0 z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.12),transparent_55%)] transition-opacity duration-700" />
      )}
    </>
  );
}
