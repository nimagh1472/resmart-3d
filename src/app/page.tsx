'use client';

import dynamic from 'next/dynamic';
import { ErrorBoundary, PitchDeckFallback } from '@/components/ui/ErrorBoundary';
import { useRoleStore } from '@/hooks/useRoleStore';
import { Overlay } from '@/components/ui/Overlay';
import { RoleSelector } from '@/components/ui/RoleSelector';
import { QuickDeck } from '@/components/ui/QuickDeck';
import { CinematicBar } from '@/components/ui/CinematicBar';
import { LeadCaptureModal } from '@/components/ui/LeadCaptureModal';
import { FeaturePopupHUD } from '@/components/ui/FeaturePopupHUD';
import { StoryHUD } from '@/components/ui/StoryHUD';

const Experience = dynamic(() => import('@/components/3d/Experience').then((mod) => mod.Experience), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-neutral-950 text-sm text-neutral-400">
      Loading ReSmart AI experience…
    </div>
  ),
});

export default function Home() {
  const isWebGLError = useRoleStore((state) => state.isWebGLError);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-neutral-950">
      <ErrorBoundary>
        <Experience />
      </ErrorBoundary>

      {!isWebGLError && (
        <>
          <Overlay />
          <CinematicBar />
          <QuickDeck />
          <RoleSelector />
          <LeadCaptureModal />
          <FeaturePopupHUD />
          <StoryHUD />
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
