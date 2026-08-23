'use client';

import { ChevronLeft, Home, IdCard, Sparkles } from 'lucide-react';
import { useRoleStore } from '@/hooks/useRoleStore';
import { useUserProfileStore } from '@/hooks/useUserProfileStore';

/**
 * Sticky top-left HUD nav pill shown during Driver/Customer mini-gameplay
 * (Overlay.tsx has its own equivalent buttons in its top-right pill for the
 * main Experience/Investor tour). The "ReSmart AI" brand label and the
 * explicit Home icon both call useRoleStore.goHome, forcing LandingOverlay
 * back open. "Hub / Change Role" unmounts the current mini-game via
 * useRoleStore.backToHub, returning to RoleSelector without touching
 * useUserProfileStore's persisted score/rank. "My Profile" opens the
 * AccountPanel modal on top of the game.
 */
export function GameNavBar() {
  const backToHub = useRoleStore((state) => state.backToHub);
  const goHome = useRoleStore((state) => state.goHome);
  const openAccountPanel = useUserProfileStore((state) => state.openAccountPanel);

  return (
    <div className="pointer-events-auto absolute left-4 top-4 z-30 flex items-center gap-1 rounded-full border border-neonCyan/25 bg-darkGlass/75 p-1 shadow-2xl shadow-cyan-500/10 backdrop-blur-[16px]">
      <button
        onClick={goHome}
        aria-label="Return to the ReSmart AI home screen"
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
      >
        <Sparkles size={13} className="text-purple-400" /> <span className="hidden sm:inline">ReSmart AI</span>
      </button>
      <span className="text-white/10">|</span>
      <button
        onClick={backToHub}
        aria-label="Back to hub / change role"
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-neutral-200 transition hover:bg-white/10"
      >
        <ChevronLeft size={14} /> <span className="hidden sm:inline">Hub / Change Role</span>
      </button>
      <button
        onClick={goHome}
        aria-label="Return to home screen"
        className="flex items-center rounded-full p-2 text-neutral-200 transition hover:bg-white/10"
      >
        <Home size={14} />
      </button>
      <button
        onClick={openAccountPanel}
        aria-label="Open my ReSmart profile"
        className="flex items-center rounded-full p-2 text-neutral-200 transition hover:bg-white/10"
      >
        <IdCard size={14} />
      </button>
    </div>
  );
}
