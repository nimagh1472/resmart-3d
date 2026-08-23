'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import clsx from 'clsx';
import { Car, Clapperboard, FileText, Sparkles, Trophy, Volume2, VolumeX } from 'lucide-react';
import { useRoleStore } from '@/hooks/useRoleStore';
import { useUserProfileStore } from '@/hooks/useUserProfileStore';
import { useSound } from '@/hooks/useSound';
import type { PresentationMode, RoleType, StoryRoleKey } from '@/types';
import { MiniMap } from '@/components/ui/MiniMap';
import { MarketEngineHUD } from '@/components/ui/MarketEngineHUD';

// nipplejs (used by TouchControls) touches `window` as a module-level side
// effect, which crashes Next's server-side prerendering — load it client-only.
const TouchControls = dynamic(() => import('@/components/ui/TouchControls').then((mod) => mod.TouchControls), {
  ssr: false,
});

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'AED',
  maximumFractionDigits: 0,
});

function getRoleLabel(activeRole: RoleType, presentationMode: PresentationMode): string {
  if (activeRole === 'AGENT') return 'Driver';
  if (activeRole === 'CUSTOMER') return 'Customer';
  if (presentationMode === 'CINEMATIC') return 'Investor Tour';
  return 'Guest';
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/**
 * Top HUD header (logo, mode toggle, role indicator, earnings, audio mute,
 * PDF/pitch-deck link) plus the MiniMap and TouchControls overlays. All
 * figures/labels are derived from useRoleStore and lib/pitchData rather
 * than hard-coded.
 */
export function Overlay() {
  const presentationMode = useRoleStore((state) => state.presentationMode);
  const activeRole = useRoleStore((state) => state.activeRole);
  const setPresentationMode = useRoleStore((state) => state.setPresentationMode);
  const setQuickDeckOpen = useRoleStore((state) => state.setQuickDeckOpen);
  const chapterIndex = useRoleStore((state) => (activeRole ? state.chapterIndex[activeRole as StoryRoleKey] : null));
  const customerWallet = useRoleStore((state) => state.customerWallet);
  const driverEarnings = useRoleStore((state) => state.driverEarnings);
  const activeOrderCountdownSeconds = useRoleStore((state) => state.activeOrderCountdownSeconds);
  const tickOrderCountdown = useRoleStore((state) => state.tickOrderCountdown);
  const openLeaderboard = useUserProfileStore((state) => state.openLeaderboard);
  const { isAudioEnabled, unlock, mute } = useSound();

  useEffect(() => {
    if (activeOrderCountdownSeconds === null) return;
    const interval = setInterval(tickOrderCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeOrderCountdownSeconds, tickOrderCountdown]);

  const toggleAudio = () => {
    if (isAudioEnabled) mute();
    else unlock();
  };

  const isCustomer = activeRole === 'CUSTOMER';
  const isAgent = activeRole === 'AGENT';

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex flex-wrap items-start justify-between gap-2 p-4">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-[rgba(0,240,255,0.25)] bg-[rgba(10,16,26,0.8)] backdrop-blur-[16px] px-4 py-2 text-sm font-medium text-neutral-100 shadow-2xl shadow-cyan-500/10">
          <Sparkles size={14} className="text-purple-400" />
          <span className="font-semibold text-white">ReSmart AI</span>
          <span className="text-white/10">|</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-neutral-300">
            {getRoleLabel(activeRole, presentationMode)}
          </span>
          {chapterIndex !== null && (
            <>
              <span className="text-white/10">|</span>
              <span className="text-neutral-300">Chapter {Math.min(chapterIndex + 1, 3)} / 3</span>
            </>
          )}
          <span className="text-white/10">|</span>
          <span className="text-emerald-300">
            {isAgent ? currencyFormatter.format(driverEarnings) : currencyFormatter.format(customerWallet)}
            <span className="text-neutral-400">{isAgent ? ' earned' : ' wallet'}</span>
          </span>
          {(isCustomer || isAgent) && activeOrderCountdownSeconds !== null && (
            <>
              <span className="text-white/10">|</span>
              <span className="font-semibold text-green-400">ETA {formatCountdown(activeOrderCountdownSeconds)}</span>
            </>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-[rgba(0,240,255,0.25)] bg-[rgba(10,16,26,0.8)] backdrop-blur-[16px] p-1 shadow-2xl shadow-cyan-500/10">
          <button
            onClick={() => setPresentationMode('INTERACTIVE')}
            className={clsx(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition',
              presentationMode === 'INTERACTIVE'
                ? 'bg-cyan-500/90 text-neutral-950'
                : 'text-neutral-300 hover:bg-white/10',
            )}
          >
            <Car size={14} />
            3D Drive
          </button>
          <button
            onClick={() => setPresentationMode('CINEMATIC')}
            className={clsx(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition',
              presentationMode === 'CINEMATIC'
                ? 'bg-cyan-500/90 text-neutral-950'
                : 'text-neutral-300 hover:bg-white/10',
            )}
          >
            <Clapperboard size={14} />
            Cinematic Tour
          </button>
          <button
            onClick={toggleAudio}
            aria-label={isAudioEnabled ? 'Mute audio' : 'Unmute audio'}
            className="flex items-center rounded-full p-2 text-neutral-300 transition hover:bg-white/10"
          >
            {isAudioEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
          <button
            onClick={() => setQuickDeckOpen(true)}
            aria-label="Open pitch deck PDF"
            className="flex items-center rounded-full p-2 text-neutral-300 transition hover:bg-white/10"
          >
            <FileText size={14} />
          </button>
          <button
            onClick={openLeaderboard}
            aria-label="Open Top 50 leaderboard"
            className="flex items-center rounded-full p-2 text-neutral-300 transition hover:bg-white/10"
          >
            <Trophy size={14} />
          </button>
        </div>
      </div>

      <MarketEngineHUD />
      <MiniMap />
      <TouchControls />
    </>
  );
}
