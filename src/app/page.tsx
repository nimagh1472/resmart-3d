'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { StickyHeader } from '@/components/ui/StickyHeader';
import { Hero } from '@/components/ui/Hero';
import { StoryCards } from '@/components/ui/StoryCards';
import { RegistrationHubs } from '@/components/ui/RegistrationHubs';
import { NetworkFlowStrip } from '@/components/ui/NetworkFlowStrip';
import { LeadCaptureCard } from '@/components/ui/LeadCaptureCard';
import { DistrictSelector } from '@/components/ui/DistrictSelector';
import { HowItWorksCards } from '@/components/ui/HowItWorksCards';
import { InvestorAccessModal } from '@/components/ui/InvestorAccessModal';
import { Footer } from '@/components/ui/Footer';
import { DEFAULT_DISTRICT_ID } from '@/lib/pitchData';
import { useIntentPersona } from '@/hooks/useIntentPersona';
import type { DistrictId, LeadRole } from '@/types';

const AmbientScene = dynamic(() => import('@/components/3d/AmbientScene').then((mod) => mod.AmbientScene), {
  ssr: false,
  loading: () => null,
});

/**
 * Single continuous landing page. The ambient 3D skyline is a fixed,
 * non-interactive backdrop (a cinematic fly-in over neon Sheikh Zayed Road
 * traffic, settling into an orbit around the Burj Khalifa-style tower)
 * behind the actual content (header, hero, storytelling cards,
 * registration hubs, network-pulse strip, lead-capture card, district
 * selector, how-it-works cards, footer). A single shared `persona` state
 * (seeded by useIntentPersona's ?ref=/?inv= dynamic intent routing) drives
 * Hero's CTA + persona switcher, RegistrationHubs, and LeadCaptureCard's
 * active tab together; Investor Access is a hard-gated modal reachable from
 * the header button, the Hero CTA/persona switcher, or RegistrationHubs'
 * Investor card.
 */
export default function Home() {
  const initialPersona = useIntentPersona();
  const [persona, setPersona] = useState<LeadRole>(initialPersona);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictId>(DEFAULT_DISTRICT_ID);
  const [hoveredDistrict, setHoveredDistrict] = useState<DistrictId | null>(null);
  const [isInvestorAccessOpen, setIsInvestorAccessOpen] = useState(false);
  const openInvestorAccess = () => setIsInvestorAccessOpen(true);

  return (
    <main className="relative z-10 min-h-screen w-full overflow-x-hidden bg-asphalt">
      <ErrorBoundary>
        <div className="fixed inset-0 z-0 pointer-events-none">
          <AmbientScene selectedDistrict={selectedDistrict} hoveredDistrict={hoveredDistrict} />
        </div>
      </ErrorBoundary>

      <div className="relative z-10 flex flex-col items-center">
        <StickyHeader onOpenInvestorAccess={openInvestorAccess} />
        <Hero persona={persona} onSelectPersona={setPersona} onOpenInvestorAccess={openInvestorAccess} />
        <StoryCards />
        <RegistrationHubs onSelectPersona={setPersona} onOpenInvestorAccess={openInvestorAccess} />
        <NetworkFlowStrip />
        <LeadCaptureCard persona={persona} onSelectPersona={setPersona} selectedDistrict={selectedDistrict} />
        <DistrictSelector
          selectedDistrict={selectedDistrict}
          onSelectDistrict={setSelectedDistrict}
          onHoverDistrict={setHoveredDistrict}
        />
        <HowItWorksCards />
        <Footer />
      </div>

      <InvestorAccessModal isOpen={isInvestorAccessOpen} onClose={() => setIsInvestorAccessOpen(false)} />
    </main>
  );
}
