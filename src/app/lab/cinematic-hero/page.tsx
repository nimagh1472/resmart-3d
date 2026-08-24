'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// ssr:false here isn't about bundle size (no heavy WebGL, unlike the
// archived 3D work) — it avoids a hydration mismatch. The ?cinematicTime=
// QA override reads window.location.search during render (via
// useCinematicClock's useRef initializer), which necessarily differs
// between an SSR pass (no window) and the client — server-rendering this
// component at all would reproduce that mismatch on every QA screenshot.
const CinematicStage = dynamic(
  () => import('@/components/cinematic/CinematicStage').then((mod) => mod.CinematicStage),
  { ssr: false }
);

/**
 * Isolated QA route for the authored-imagery cinematic pivot — NOT linked
 * from the live site's navigation, matching this repo's existing
 * isolation convention (see the archived /lab/cinematic-slice).
 */
export default function CinematicHeroPage() {
  const [isComplete, setIsComplete] = useState(false);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      {!isComplete && <CinematicStage onComplete={() => setIsComplete(true)} />}
      {isComplete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#050709',
            color: '#F8FAFC',
            fontFamily: 'monospace',
            fontSize: 14,
          }}
        >
          Cinematic complete — business site would mount here.
        </div>
      )}
    </div>
  );
}
