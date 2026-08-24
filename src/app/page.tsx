'use client';

import { useState } from 'react';
import { BackgroundVideo } from '@/components/ui/BackgroundVideo';
import { StickyHeader } from '@/components/ui/StickyHeader';
import { Hero } from '@/components/ui/Hero';
import { StoryCards } from '@/components/ui/StoryCards';
import { RegistrationHubs } from '@/components/ui/RegistrationHubs';
import { NetworkFlowStrip } from '@/components/ui/NetworkFlowStrip';
import { GrowthFlywheel } from '@/components/ui/GrowthFlywheel';
import { RevenueEngine } from '@/components/ui/RevenueEngine';
import { LeadCaptureCard } from '@/components/ui/LeadCaptureCard';
import { DistrictSelector } from '@/components/ui/DistrictSelector';
import { HowItWorksCards } from '@/components/ui/HowItWorksCards';
import { InvestorAccessModal } from '@/components/ui/InvestorAccessModal';
import { Footer } from '@/components/ui/Footer';
import { DEFAULT_DISTRICT_ID } from '@/lib/pitchData';
import { useIntentPersona } from '@/hooks/useIntentPersona';
import type { DistrictId, LeadRole } from '@/types';

/**
 * Single continuous landing page. A fixed, full-viewport looping background
 * video (see components/ui/BackgroundVideo.tsx) sits behind the actual
 * content (header, hero, storytelling cards, registration hubs,
 * network-pulse strip, growth flywheel loop, revenue engine, lead-capture
 * card, district selector, how-it-works cards, footer). A single shared
 * `persona` state (seeded by
 * useIntentPersona's ?ref=/?inv= dynamic intent routing) drives Hero's CTA +
 * persona switcher, RegistrationHubs, and LeadCaptureCard's active tab
 * together; Investor Access is a hard-gated modal reachable from the header
 * button, the Hero CTA/persona switcher, or RegistrationHubs' Investor card.
 */
export default function Home() {
  const initialPersona = useIntentPersona();
  const [persona, setPersona] = useState<LeadRole>(initialPersona);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictId>(DEFAULT_DISTRICT_ID);
  const [isInvestorAccessOpen, setIsInvestorAccessOpen] = useState(false);
  const openInvestorAccess = () => setIsInvestorAccessOpen(true);

  return (
    <>
      <BackgroundVideo />

      <main className="relative z-20 min-h-screen w-full overflow-x-hidden">
        <div className="flex flex-col items-center">
          <StickyHeader onOpenInvestorAccess={openInvestorAccess} />
          <Hero persona={persona} onSelectPersona={setPersona} onOpenInvestorAccess={openInvestorAccess} />
          <StoryCards />
          <RegistrationHubs onSelectPersona={setPersona} onOpenInvestorAccess={openInvestorAccess} />
          <NetworkFlowStrip />
          <GrowthFlywheel />
          <RevenueEngine />
          <LeadCaptureCard persona={persona} onSelectPersona={setPersona} selectedDistrict={selectedDistrict} />
          <DistrictSelector selectedDistrict={selectedDistrict} onSelectDistrict={setSelectedDistrict} />
          <HowItWorksCards />
          <Footer />
        </div>

        <InvestorAccessModal isOpen={isInvestorAccessOpen} onClose={() => setIsInvestorAccessOpen(false)} />
      </main>
    </>
  );
}
