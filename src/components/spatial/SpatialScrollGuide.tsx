'use client';

import { ChevronDown } from 'lucide-react';

/**
 * A one-time nudge for the pure-black opening beat (Act 0 "Black / Pulse"
 * gives no visual cue that the page is interactive) — fades out over the
 * same 0-0.05 global scroll window the pulse beat occupies, so it's gone
 * by the time Act 1 "Dubai" is actually on screen instead of overlapping it.
 */
export function SpatialScrollGuide({ progress }: { progress: number }) {
  const opacity = Math.max(0, 1 - progress / 0.05);
  if (opacity <= 0) return null;

  return (
    <div
      style={{ opacity, transition: 'opacity 0.3s ease' }}
      className="pointer-events-none absolute bottom-8 left-1/2 z-40 -translate-x-1/2"
    >
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-widest text-white/70 backdrop-blur-md">
        <span>Scroll to Explore</span>
        <ChevronDown size={13} className="animate-pulse text-[#00F5D4]" />
      </div>
    </div>
  );
}
