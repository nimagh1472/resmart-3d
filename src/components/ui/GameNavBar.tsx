'use client';

import { ChevronLeft, IdCard } from 'lucide-react';
import { useRoleStore } from '@/hooks/useRoleStore';
import { useUserProfileStore } from '@/hooks/useUserProfileStore';

/**
 * Sticky top-left HUD nav pill shown during Driver/Customer mini-gameplay
 * (Overlay.tsx has its own equivalent buttons in its top-right pill for the
 * main Experience/Investor tour). "Back to Hub" unmounts the current
 * mini-game via useRoleStore.backToHub, returning to RoleSelector without
 * touching useUserProfileStore's persisted score/rank. "My Profile" opens
 * the AccountPanel modal on top of the game.
 */
export function GameNavBar() {
  const backToHub = useRoleStore((state) => state.backToHub);
  const openAccountPanel = useUserProfileStore((state) => state.openAccountPanel);

  return (
    <div className="pointer-events-auto absolute left-4 top-4 z-30 flex items-center gap-1 rounded-full border border-[rgba(0,240,255,0.25)] bg-[rgba(10,16,26,0.8)] p-1 shadow-2xl shadow-cyan-500/10 backdrop-blur-[16px]">
      <button
        onClick={backToHub}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-neutral-200 transition hover:bg-white/10"
      >
        <ChevronLeft size={14} /> Hub / Change Role
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
