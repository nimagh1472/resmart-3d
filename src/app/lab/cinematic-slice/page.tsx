'use client';

import dynamic from 'next/dynamic';

// ssr:false + dynamic import — the R3F/Three.js bundle never loads on the
// production homepage (src/app/page.tsx), and never blocks it. This route
// exists solely for the Phase 04 visual-quality-gate review; it is not
// linked from anywhere in the live site's navigation.
const CinematicSlice = dynamic(() => import('@/components/three/CinematicSlice').then((mod) => mod.CinematicSlice), {
  ssr: false,
  loading: () => <div style={{ position: 'fixed', inset: 0, background: '#050709' }} />,
});

export default function CinematicSlicePage() {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <CinematicSlice />
    </div>
  );
}
