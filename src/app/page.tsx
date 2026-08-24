'use client';

import { useState } from 'react';
import { BackgroundVideo } from '@/components/ui/BackgroundVideo';
import { StickyHeader } from '@/components/ui/StickyHeader';
import { Hero } from '@/components/ui/Hero';
import { SceneProblem } from '@/components/ui/scenes/SceneProblem';
import { SceneAiLayer } from '@/components/ui/scenes/SceneAiLayer';
import { SceneCommerce } from '@/components/ui/scenes/SceneCommerce';
import { SceneLogistics } from '@/components/ui/scenes/SceneLogistics';
import { SceneNetwork } from '@/components/ui/scenes/SceneNetwork';
import { SceneInvestor } from '@/components/ui/scenes/SceneInvestor';
import { InvestorAccessModal } from '@/components/ui/InvestorAccessModal';
import { Footer } from '@/components/ui/Footer';
import { DEFAULT_DISTRICT_ID } from '@/lib/pitchData';
import { useIntentPersona } from '@/hooks/useIntentPersona';
import type { DistrictId, LeadRole } from '@/types';

/**
 * A 7-scene scroll-driven storyboard (Dubai -> Problem -> AI Layer ->
 * Commerce -> Logistics -> Network Effect -> Investor Terminal), each scene
 * living in its own components/ui/scenes/*.tsx file. A fixed, full-viewport
 * looping background video (components/ui/BackgroundVideo.tsx) sits behind
 * every scene, tinting gold when either the persona switcher is set to
 * 'investor' or Scene 07 is scrolled into view (tracked here via
 * `isInvestorSceneInView`, reported up by SceneInvestor's IntersectionObserver).
 * A single shared `persona` state (seeded by useIntentPersona's ?ref=/?inv=
 * dynamic intent routing) drives Hero's CTA + persona switcher and both
 * LeadCaptureCard instances (Scene 04's Shopper/Merchant tabs, Scene 05's
 * Driver-only instance); Investor Access is a hard-gated modal reachable
 * from the header badge, Hero's CTA/persona switcher, or Scene 07's card/CTA.
 */
export default function Home() {
  const initialPersona = useIntentPersona();
  const [persona, setPersona] = useState<LeadRole>(initialPersona);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictId>(DEFAULT_DISTRICT_ID);
  const [isInvestorAccessOpen, setIsInvestorAccessOpen] = useState(false);
  const [isInvestorSceneInView, setIsInvestorSceneInView] = useState(false);
  const openInvestorAccess = () => setIsInvestorAccessOpen(true);

  return (
    <>
      <BackgroundVideo persona={persona} investorSceneInView={isInvestorSceneInView} />

      <main className="relative z-20 min-h-screen w-full overflow-x-hidden">
        <div className="flex flex-col items-center">
          <StickyHeader onOpenInvestorAccess={openInvestorAccess} />

          {/* Scene 01 — Dubai */}
          <Hero persona={persona} onSelectPersona={setPersona} onOpenInvestorAccess={openInvestorAccess} />

          {/* Scene 02 — Problem */}
          <SceneProblem />

          {/* Scene 03 — AI Layer */}
          <SceneAiLayer />

          {/* Scene 04 — Commerce */}
          <SceneCommerce persona={persona} onSelectPersona={setPersona} selectedDistrict={selectedDistrict} />

          {/* Scene 05 — Logistics */}
          <SceneLogistics persona={persona} onSelectPersona={setPersona} selectedDistrict={selectedDistrict} />

          {/* Scene 06 — Network Effect */}
          <SceneNetwork selectedDistrict={selectedDistrict} onSelectDistrict={setSelectedDistrict} />

          {/* Scene 07 — Investor Terminal */}
          <SceneInvestor onOpenInvestorAccess={openInvestorAccess} onVisibilityChange={setIsInvestorSceneInView} />

          <Footer />
        </div>

        <InvestorAccessModal isOpen={isInvestorAccessOpen} onClose={() => setIsInvestorAccessOpen(false)} />
      </main>
    </>
  );
}
