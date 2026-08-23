'use client';

import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useRoleStore } from '@/hooks/useRoleStore';
import { useUserProfileStore } from '@/hooks/useUserProfileStore';
import { CINEMATIC_DWELL_SECONDS, STATIONS } from '@/lib/pitchData';

// Investor leaderboard score awarded for completing one full lap of the
// cinematic tour — investors have no AED earnings loop of their own, so this
// is the stand-in engagement score for their leaderboard bucket.
const SCORE_INVESTOR_TOUR_LAP = 500;

/**
 * Letterbox bars, per-zone progress segments (Instagram-story style — the
 * active segment animates over exactly CINEMATIC_DWELL_SECONDS, matching
 * CameraRig's actual dwell time), the investor caption, and a "Return to
 * Interactive Drive" button. Shown only during the automated CINEMATIC
 * tour; caption/segments always reflect the zone the camera is currently
 * orbiting, driven by the shared cinematicZoneIndex.
 *
 * Also fires the lead-capture modal exactly once, the first time the tour
 * completes a full lap through all zones (cinematicZoneIndex wrapping from
 * the last zone back to 0) — the tour itself loops forever, so this must
 * only trigger on that first wrap, not every lap.
 */
export function CinematicBar() {
  const presentationMode = useRoleStore((state) => state.presentationMode);
  const cinematicZoneIndex = useRoleStore((state) => state.cinematicZoneIndex);
  const setPresentationMode = useRoleStore((state) => state.setPresentationMode);
  const openLeadModal = useRoleStore((state) => state.openLeadModal);

  const previousZoneIndex = useRef(cinematicZoneIndex);
  const hasCompletedTour = useRef(false);
  const addScore = useUserProfileStore((state) => state.addScore);

  useEffect(() => {
    const justWrapped = previousZoneIndex.current === STATIONS.length - 1 && cinematicZoneIndex === 0;
    if (justWrapped) {
      // Score awarded every lap (replay-friendly); the lead modal itself
      // still only opens once per session, tracked separately below.
      addScore(SCORE_INVESTOR_TOUR_LAP);
      if (!hasCompletedTour.current) {
        hasCompletedTour.current = true;
        openLeadModal('cinematic_complete');
      }
    }
    previousZoneIndex.current = cinematicZoneIndex;
  }, [cinematicZoneIndex, openLeadModal, addScore]);

  if (presentationMode !== 'CINEMATIC') return null;

  const zone = STATIONS[cinematicZoneIndex];

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between">
      <div className="flex h-[8vh] w-full flex-col justify-center gap-3 bg-black px-6">
        <div className="flex gap-1.5">
          {STATIONS.map((tourZone, index) => (
            <div key={tourZone.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
              <div
                key={index === cinematicZoneIndex ? `active-${cinematicZoneIndex}` : `idle-${tourZone.id}`}
                className={clsx('h-full rounded-full bg-white', index < cinematicZoneIndex && 'w-full')}
                style={
                  index === cinematicZoneIndex
                    ? {
                        animationName: 'cinematic-progress-fill',
                        animationDuration: `${CINEMATIC_DWELL_SECONDS}s`,
                        animationTimingFunction: 'linear',
                        animationFillMode: 'forwards',
                      }
                    : undefined
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 items-end justify-center pb-10">
        <div className="max-w-2xl px-6 text-center">
          <p className="text-xs uppercase tracking-widest text-white/60">{zone.title}</p>
          <p className="mt-2 text-xl font-medium text-white drop-shadow-lg">{zone.investorPitchLine.text}</p>
        </div>
      </div>

      <div className="flex h-[8vh] w-full items-center justify-center bg-black">
        <button
          onClick={() => setPresentationMode('INTERACTIVE')}
          className="pointer-events-auto rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
        >
          Return to Interactive Drive
        </button>
      </div>
    </div>
  );
}
