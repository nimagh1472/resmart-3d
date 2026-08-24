'use client';

import clsx from 'clsx';
import { Building2, Route, Search } from 'lucide-react';
import { useInViewOnce } from '@/hooks/useInViewOnce';

const STORY_CARDS: Array<{ icon: typeof Search; title: string; description: string }> = [
  {
    icon: Search,
    title: 'AI-Powered Commerce Search in Dubai',
    description: 'Shoppers describe what they need in plain language — our AI matches them to the nearest local merchant instantly.',
  },
  {
    icon: Building2,
    title: 'Targeted Merchant Ad Engine',
    description: 'Merchants bid for placement in AI search results, reaching high-intent buyers exactly when they’re ready to purchase.',
  },
  {
    icon: Route,
    title: 'Autonomous Route Optimization for Drivers',
    description: 'AI-dispatched, zero-commission delivery routes keep drivers moving efficiently across every district.',
  },
];

function StoryCard({
  icon: Icon,
  title,
  description,
  index,
}: {
  icon: typeof Search;
  title: string;
  description: string;
  index: number;
}) {
  const { ref, isInView } = useInViewOnce<HTMLDivElement>();

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${index * 120}ms` }}
      className={clsx(
        'glass-panel rounded-2xl p-5 transition-all duration-700 ease-out sm:p-6',
        isInView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
        <Icon size={18} />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-white sm:text-base">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">{description}</p>
    </div>
  );
}

/**
 * The cinematic intro's storytelling overlay: 3 floating glassmorphism cards
 * that fade/slide in the first time each scrolls into view, as if surfacing
 * while the 3D backdrop's camera flies into Downtown Dubai behind them.
 */
export function StoryCards() {
  return (
    <section className="w-full px-4 py-12 sm:py-16">
      <div className="mx-auto grid w-full max-w-4xl gap-4 sm:grid-cols-3">
        {STORY_CARDS.map((card, index) => (
          <StoryCard key={card.title} icon={card.icon} title={card.title} description={card.description} index={index} />
        ))}
      </div>
    </section>
  );
}
