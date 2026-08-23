'use client';

import dynamic from 'next/dynamic';
import { ErrorBoundary, PitchDeckFallback } from '@/components/ui/ErrorBoundary';
import { useRoleStore } from '@/hooks/useRoleStore';
import { Overlay } from '@/components/ui/Overlay';
import { RoleSelector } from '@/components/ui/RoleSelector';
import { LandingOverlay } from '@/components/ui/LandingOverlay';
import { AccountPanel } from '@/components/ui/AccountPanel';
import { ShareRankCard } from '@/components/ui/ShareRankCard';
import { QuickDeck } from '@/components/ui/QuickDeck';
import { CinematicBar } from '@/components/ui/CinematicBar';
import { LeadCaptureModal } from '@/components/ui/LeadCaptureModal';
import { FeaturePopupHUD } from '@/components/ui/FeaturePopupHUD';
import { StoryHUD } from '@/components/ui/StoryHUD';
import { Leaderboard } from '@/components/ui/Leaderboard';
import { InvestorGame } from '@/components/games/InvestorGame';

const Experience = dynamic(() => import('@/components/3d/Experience').then((mod) => mod.Experience), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-neutral-950 text-sm text-neutral-400">
      Loading ReSmart AI experience…
    </div>
  ),
});

const DriverGame = dynamic(() => import('@/components/games/DriverGame').then((mod) => mod.DriverGame), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-neutral-950 text-sm text-neutral-400">
      Loading Driver Challenge…
    </div>
  ),
});

const CustomerGame = dynamic(() => import('@/components/games/CustomerGame').then((mod) => mod.CustomerGame), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-neutral-950 text-sm text-neutral-400">
      Loading Customer Challenge…
    </div>
  ),
});

export default function Home() {
  const isWebGLError = useRoleStore((state) => state.isWebGLError);
  const activeRole = useRoleStore((state) => state.activeRole);
  // Driver and Customer personas each fully replace the open-city pitch
  // experience with their own self-contained mini-game (see
  // components/games/) — the rest of the pitch HUD
  // (Overlay/StoryHUD/MarketEngineHUD/etc.) assumes the open-city AGENT/
  // CUSTOMER loops, so it's swapped out for both too. Only the Investor
  // cinematic tour still uses the main Experience.
  const isDriverGame = activeRole === 'AGENT';
  const isCustomerGame = activeRole === 'CUSTOMER';
  const isMiniGame = isDriverGame || isCustomerGame;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-neutral-950">
      <ErrorBoundary>
        {isDriverGame ? <DriverGame /> : isCustomerGame ? <CustomerGame /> : <Experience />}
      </ErrorBoundary>

      {!isWebGLError && (
        <>
          {!isMiniGame && (
            <>
              <Overlay />
              <CinematicBar />
              <QuickDeck />
              <LeadCaptureModal />
              <FeaturePopupHUD />
              <StoryHUD />
              <InvestorGame />
            </>
          )}
          <LandingOverlay />
          <RoleSelector />
          <Leaderboard />
          <AccountPanel />
          <ShareRankCard />
        </>
      )}

      {isWebGLError && (
        <div className="absolute inset-0 z-40">
          <PitchDeckFallback />
        </div>
      )}
    </main>
  );
}
