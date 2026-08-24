'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const AssetInspector = dynamic(() => import('@/components/three/AssetInspector').then((mod) => mod.AssetInspector), {
  ssr: false,
});

const MODELS = {
  burj: '/assets/3d-source/the_burj_khalifa.glb',
  ocean: '/assets/3d-source/dubai_skyscraper.glb',
};

/** Diagnostic-only route — see AssetInspector.tsx. Not linked from the live site. */
export default function AssetInspectorPage() {
  const [modelKey, setModelKey] = useState<keyof typeof MODELS>('burj');

  // Reading the URL param post-mount (not as a lazy useState initializer)
  // avoids a server/client hydration mismatch — window is undefined during
  // SSR, so an initializer that reads it renders 'burj' server-side and
  // possibly 'ocean' client-side, which React logs as a prop mismatch and
  // silently discards the fix (this was the actual bug behind the blank
  // canvas — the DOM stayed server-rendered on 'burj' while state read
  // correctly as 'ocean', decoupling render from the Canvas's `key`).
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('model');
    if (param === 'ocean') setModelKey('ocean');
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, display: 'flex', gap: 8 }}>
        {Object.keys(MODELS).map((key) => (
          <button
            key={key}
            onClick={() => setModelKey(key as keyof typeof MODELS)}
            style={{ padding: '6px 12px', background: modelKey === key ? '#00F5D4' : '#222', color: modelKey === key ? '#000' : '#fff' }}
          >
            {key}
          </button>
        ))}
      </div>
      <AssetInspector key={modelKey} path={MODELS[modelKey]} />
    </div>
  );
}
