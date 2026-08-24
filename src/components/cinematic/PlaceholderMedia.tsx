'use client';

import type { MediaSlot } from '@/lib/cinematicManifest';

/**
 * Stands in for a media slot that hasn't been authored/supplied yet.
 * Deliberately unmistakable as a placeholder — a diagonal hazard-stripe
 * pattern plus the exact slot id/dimensions/format needed — never a
 * generic gray box that could be mistaken for a real, if minimal, design
 * choice. Same honesty principle as the archived 3D work's
 * MissingAssetBoundary: report the gap, don't disguise it.
 */
export function PlaceholderMedia({ slot }: { slot: MediaSlot }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background:
          'repeating-linear-gradient(45deg, #1a1500 0, #1a1500 14px, #2a2200 14px, #2a2200 28px)',
      }}
    >
      <div
        style={{
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#ffcc00',
          background: 'rgba(5,7,9,0.85)',
          border: '1px solid rgba(255,204,0,0.5)',
          borderRadius: '6px',
          padding: '8px 14px',
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        <div>MEDIA PENDING — {slot.id}</div>
        <div style={{ color: '#94a3b8' }}>
          {slot.layer} · {slot.kind} · {slot.recommendedDimensions}
        </div>
        {slot.optional && <div style={{ color: '#64748b' }}>(optional layer)</div>}
      </div>
    </div>
  );
}
