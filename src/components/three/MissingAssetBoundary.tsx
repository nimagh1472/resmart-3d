'use client';

import { Component, Suspense, type ReactNode } from 'react';
import { Html } from '@react-three/drei';

interface MissingAssetLabelProps {
  label: string;
  note?: string;
}

/**
 * Rendered in place of a hero asset that hasn't been provided yet. This is a
 * flat, unmistakably-a-placeholder text label — never geometry — because
 * Phase 04's explicit rule is "if a required asset is unavailable, STOP and
 * report the missing asset," not "invent a primitive substitute." A box or
 * cylinder standing in for Burj Khalifa would be exactly the failure this
 * vertical slice exists to avoid.
 */
function MissingAssetLabel({ label, note }: MissingAssetLabelProps) {
  return (
    <Html center distanceFactor={40} style={{ pointerEvents: 'none' }}>
      <div
        style={{
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#ff6b6b',
          background: 'rgba(5,7,9,0.85)',
          border: '1px solid rgba(255,107,107,0.4)',
          borderRadius: '6px',
          padding: '6px 10px',
          whiteSpace: 'nowrap',
        }}
      >
        ASSET PENDING — {label}
        {note && <div style={{ color: '#94a3b8', marginTop: 2 }}>{note}</div>}
      </div>
    </Html>
  );
}

interface MissingAssetBoundaryProps {
  label: string;
  note?: string;
  children: ReactNode;
}

interface BoundaryState {
  hasError: boolean;
}

/**
 * Catches the load error `useGLTF`/`useLoader` throw when a source file
 * (e.g. the manually-provided Sketchfab GLBs, staged in
 * public/assets/3d-source/) doesn't exist yet, and renders
 * MissingAssetLabel instead of crashing the scene or silently rendering
 * nothing unexplained.
 */
class MissingAssetErrorBoundary extends Component<MissingAssetBoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn(`[cinematic-slice] Missing hero asset: ${this.props.label}`, error);
  }

  render() {
    if (this.state.hasError) return <MissingAssetLabel label={this.props.label} note={this.props.note} />;
    return this.props.children;
  }
}

export function MissingAssetBoundary({ label, note, children }: MissingAssetBoundaryProps) {
  return (
    <MissingAssetErrorBoundary label={label} note={note}>
      <Suspense fallback={<MissingAssetLabel label={label} note="loading…" />}>{children}</Suspense>
    </MissingAssetErrorBoundary>
  );
}
