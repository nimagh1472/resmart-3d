'use client';

import { SceneHeading } from '@/components/ui/SceneHeading';
import { StoryCards } from '@/components/ui/StoryCards';

/**
 * Scene 03 — AI LAYER. StoryCards' existing 3 cards (AI Commerce Search,
 * Targeted Merchant Ad Engine, Autonomous Route Optimization) already match
 * this scene's "AI Commerce Search, Targeted Merchant Ads, Smart Logistics"
 * brief exactly — unchanged, just given this scene's heading.
 */
export function SceneAiLayer() {
  return (
    <section className="flex w-full flex-col items-center px-4 pt-16 sm:pt-24">
      <SceneHeading index={3} name="AI Layer" headline="ReSmart connects the signals" />
      <StoryCards />
    </section>
  );
}
