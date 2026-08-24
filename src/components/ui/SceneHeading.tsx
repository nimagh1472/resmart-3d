'use client';

import clsx from 'clsx';

interface SceneHeadingProps {
  index: number;
  name: string;
  headline?: string;
  tagline?: string;
  accent?: 'teal' | 'gold';
}

/**
 * The recurring "SCENE 0X — NAME" eyebrow + headline/tagline block shared by
 * every scene in the 7-scene storyboard (app/page.tsx) except Scene 01
 * (Hero owns its own layout) and Scene 04/05, which pass a headline/tagline
 * through this same component inline.
 */
export function SceneHeading({ index, name, headline, tagline, accent = 'teal' }: SceneHeadingProps) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div
        className={clsx(
          'text-[10px] font-semibold uppercase tracking-[0.3em]',
          accent === 'gold' ? 'text-gold' : 'text-cyan-300',
        )}
      >
        Scene {String(index).padStart(2, '0')} — {name}
      </div>
      {headline && <h2 className="mt-3 font-serif text-2xl tracking-tight text-white sm:text-4xl">{headline}</h2>}
      {tagline && <p className="mx-auto mt-2 max-w-xl text-sm text-slate-300 sm:text-base">{tagline}</p>}
    </div>
  );
}
