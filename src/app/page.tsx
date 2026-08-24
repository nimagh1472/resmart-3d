'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { StickyHeader } from '@/components/ui/StickyHeader';
import { Hero } from '@/components/ui/Hero';
import { LeadCaptureCard } from '@/components/ui/LeadCaptureCard';
import { DistrictSelector } from '@/components/ui/DistrictSelector';
import { InvestorDataRoomModal } from '@/components/ui/InvestorDataRoomModal';
import { Footer } from '@/components/ui/Footer';
import { DEFAULT_DISTRICT_ID } from '@/lib/pitchData';
import type { DistrictId } from '@/types';

const AmbientScene = dynamic(() => import('@/components/3d/AmbientScene').then((mod) => mod.AmbientScene), {
  ssr: false,
  loading: () => null,
});

/**
 * Single continuous landing page — no more "session"/role gating. The
 * ambient 3D skyline is a fixed, non-interactive backdrop behind the actual
 * content (header, hero, lead-capture card, district/urgency bar, footer),
 * with the Investor Data Room as the one modal, reachable from three places.
 */
export default function Home() {
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictId>(DEFAULT_DISTRICT_ID);
  const [isDataRoomOpen, setIsDataRoomOpen] = useState(false);
  const openDataRoom = () => setIsDataRoomOpen(true);

  return (
    <main className="relative z-10 min-h-screen w-full overflow-x-hidden bg-asphalt">
      <ErrorBoundary>
        <div className="pointer-events-none fixed inset-0 z-0 h-screen w-screen">
          <AmbientScene />
        </div>
      </ErrorBoundary>

      <div className="relative z-10 flex flex-col items-center">
        <StickyHeader onOpenDataRoom={openDataRoom} />
        <Hero onOpenDataRoom={openDataRoom} />
        <LeadCaptureCard selectedDistrict={selectedDistrict} onOpenDataRoom={openDataRoom} />
        <DistrictSelector selectedDistrict={selectedDistrict} onSelectDistrict={setSelectedDistrict} />
        <Footer />
      </div>

      <InvestorDataRoomModal isOpen={isDataRoomOpen} onClose={() => setIsDataRoomOpen(false)} />
    </main>
  );
}
