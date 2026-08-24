'use client';

import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches WebGL/Canvas rendering failures in the ambient 3D backdrop and
 * falls back to a static gradient instead of the starfield/skyline. Scoped
 * tightly around <AmbientScene/> only (see app/page.tsx) — a 3D failure
 * should never take down the lead-capture forms, which are the actual point
 * of the page and render as plain DOM regardless of WebGL support.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Ambient 3D backdrop render failure, falling back to a static background:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_20%,rgba(0,229,255,0.08),transparent_60%),linear-gradient(to_bottom,#0B0F12,#05070a)]" />;
    }
    return this.props.children;
  }
}
