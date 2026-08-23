'use client';

import { Component, type ReactNode } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import { useRoleStore } from '@/hooks/useRoleStore';
import { PITCH_DECK_PATH, PITCH_METRICS } from '@/lib/pitchData';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches WebGL/Canvas rendering failures anywhere in the 3D tree and falls
 * back to a clean 2D pitch deck summary so the pitch never hard-crashes.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    useRoleStore.getState().setWebGLError(true);
    console.error('WebGL/Canvas render failure, falling back to 2D pitch deck:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return <PitchDeckFallback />;
    }
    return this.props.children;
  }
}

/**
 * The 2D fallback view, shared by the render-error boundary below and by
 * app/page.tsx for the softer "WebGL context lost" case.
 */
export function PitchDeckFallback() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-neutral-950 p-8 text-center text-neutral-100">
      <div className="max-w-xl space-y-6">
        <h1 className="text-2xl font-semibold">ReSmart AI</h1>
        <p className="text-neutral-400">
          Your device or browser could not render the interactive 3D experience, so here is the
          pitch in summary form instead.
        </p>

        <dl className="grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
          {Object.values(PITCH_METRICS).map((metric) => (
            <div key={metric.label} className="rounded-lg border border-neutral-800 p-4">
              <dt className="text-xs uppercase tracking-wide text-neutral-500">{metric.label}</dt>
              <dd className="text-lg font-semibold">
                {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href={PITCH_DECK_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
          >
            <FileText size={16} />
            Download Pitch Deck
          </a>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-5 py-2.5 text-sm font-medium text-neutral-100 transition hover:border-neutral-500"
          >
            <RefreshCw size={16} />
            Retry 3D Experience
          </button>
        </div>
      </div>
    </div>
  );
}
