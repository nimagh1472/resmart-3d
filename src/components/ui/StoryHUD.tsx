'use client';

import { BookOpen, CheckCircle2 } from 'lucide-react';
import { useRoleStore } from '@/hooks/useRoleStore';
import { CAMPAIGN_TITLES, STORY_CHAPTERS } from '@/lib/pitchData';
import type { StoryRoleKey } from '@/types';

/**
 * Quest-journal-style card driving the story campaign: shows the active
 * role's campaign title, the current chapter's guide dialogue, and its
 * objective. Reads chapterIndex straight from useRoleStore, which is
 * advanced by the existing station/order actions (completeStation,
 * collectCashback, acceptDispatch, completeVerification, completeDropoff —
 * see useRoleStore.ts) — this component only ever displays state, it never
 * mutates it. Remounts (via the `key` on chapterIndex) on every chapter
 * change to replay the shared `animate-feature-pop` entrance.
 */
export function StoryHUD() {
  const activeRole = useRoleStore((state) => state.activeRole);
  const presentationMode = useRoleStore((state) => state.presentationMode);
  const chapterIndex = useRoleStore((state) => (activeRole ? state.chapterIndex[activeRole as StoryRoleKey] : 0));
  const hasCampaignCompleted = useRoleStore((state) =>
    activeRole ? state.hasCampaignCompleted[activeRole as StoryRoleKey] : false,
  );

  if (!activeRole || presentationMode === 'CINEMATIC' || hasCampaignCompleted) return null;

  const chapters = STORY_CHAPTERS[activeRole as StoryRoleKey];
  // chapterIndex counts completed chapters, so it doubles as the array index
  // of the chapter now in progress (0 = Chapter 1 not yet done, ...).
  const currentChapter = chapters[Math.min(chapterIndex, chapters.length - 1)];

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center px-4 md:bottom-6 md:justify-start md:pl-6">
      <div
        key={chapterIndex}
        className="animate-feature-pop pointer-events-auto max-w-sm rounded-2xl border border-white/10 bg-neutral-950/80 p-4 shadow-2xl backdrop-blur"
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-300">
          <BookOpen size={14} />
          {CAMPAIGN_TITLES[activeRole as StoryRoleKey]}
        </div>
        <p className="mt-1 text-sm font-semibold text-white">{currentChapter.title}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-neutral-300">{currentChapter.guideDialogue}</p>
        <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-emerald-300">
          <CheckCircle2 size={13} className="text-neutral-500" />
          {currentChapter.objective}
        </div>
      </div>
    </div>
  );
}
