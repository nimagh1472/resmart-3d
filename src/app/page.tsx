'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
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

// Client-only + code-split: the intro's assets/logic never enter the
// initial bundle, and (via ssr:false) never render on the server — first
// paint for a returning/intent-routed visitor is the real site, with no
// server-rendered flash of the intro to hydrate away.
const SpatialStage = dynamic(
  () => import('@/components/spatial/SpatialStage').then((mod) => mod.SpatialStage),
  { ssr: false }
);

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
  const homeContentRef = useRef<HTMLDivElement>(null);

  // Spatial V2 is normal in-flow page content (a tall sticky-stage scroll
  // sequence), not a fixed overlay — "skip" and "choose a persona" don't
  // unmount anything, they just scroll straight past it into this ref'd
  // section, which is what makes the handoff seamless instead of a cut.
  const scrollPastIntro = () => homeContentRef.current?.scrollIntoView({ behavior: 'smooth' });
  const handlePersonaFromIntro = (role: LeadRole) => {
    setPersona(role);
    if (role === 'investor') setIsInvestorAccessOpen(true);
  };

  return (
    <>
      <SpatialStage onSkip={scrollPastIntro} onSelectPersona={handlePersonaFromIntro} />

      <div ref={homeContentRef}>
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
      </div>
    </>
  );
}
