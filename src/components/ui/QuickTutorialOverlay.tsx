'use client';

import { useEffect, useState } from 'react';
import { Gamepad2 } from 'lucide-react';

const TUTORIAL_DURATION_MS = 5000;

interface QuickTutorialOverlayProps {
  message: string;
  /** Bump this (e.g. a mini-game's own "runKey") to re-trigger the 5-second window on replay. */
  triggerKey: number | string;
}

/**
 * Brief, transparent, self-dismissing controller-guide overlay shown for
 * TUTORIAL_DURATION_MS whenever a mini-game (re)starts — mounted by
 * DriverGame/CustomerGame/InvestorGame, each passing their own runKey/mount
 * as triggerKey so a "Play Again" re-shows it too.
 */
export function QuickTutorialOverlay({ message, triggerKey }: QuickTutorialOverlayProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    setIsVisible(true);
    const timeout = setTimeout(() => setIsVisible(false), TUTORIAL_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [triggerKey]);

  if (!isVisible) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-20 z-20 flex justify-center px-4">
      <div className="flex items-center gap-2 rounded-full border border-cyan-400/30 bg-black/50 px-4 py-2 text-center text-xs font-medium text-white shadow-lg backdrop-blur-md">
        <Gamepad2 size={14} className="shrink-0 text-cyan-300" />
        {message}
      </div>
    </div>
  );
}
