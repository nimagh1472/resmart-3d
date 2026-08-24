'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';

type Lang = 'en' | 'ar';

/**
 * Bilingual readiness scaffold — toggles `<html lang/dir>` so RTL layout
 * mirroring is structurally wired up ahead of an actual Arabic translation
 * pass. Page copy itself stays English for now; this only proves the
 * direction-switching mechanism works end to end.
 */
export function LanguageSwitcher() {
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  return (
    <div className="tier-1-nav flex items-center gap-0.5 p-0.5 text-[10px] font-semibold uppercase tracking-wider">
      <button
        type="button"
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        className={clsx(
          'rounded-full px-2 py-1 transition',
          lang === 'en' ? 'bg-cyan-400/10 text-white' : 'text-neutral-500 hover:text-neutral-300',
        )}
      >
        EN
      </button>
      <span className="text-neutral-600">|</span>
      <button
        type="button"
        onClick={() => setLang('ar')}
        aria-pressed={lang === 'ar'}
        className={clsx(
          'rounded-full px-2 py-1 transition',
          lang === 'ar' ? 'bg-cyan-400/10 text-white' : 'text-neutral-500 hover:text-neutral-300',
        )}
      >
        عربي
      </button>
    </div>
  );
}
