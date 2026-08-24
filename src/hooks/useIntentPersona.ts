import { useEffect, useState } from 'react';
import type { LeadRole } from '@/types';

const DEFAULT_PERSONA: LeadRole = 'shopper';

function resolvePersonaFromSearch(search: string): LeadRole {
  const params = new URLSearchParams(search);
  if (params.has('inv')) return 'investor';
  if (params.has('ref')) return 'shopper';
  return DEFAULT_PERSONA;
}

/**
 * Dynamic intent routing: a visitor arriving via a WhatsApp/referral link
 * (`?ref=`) defaults into the Shopper funnel; a visitor arriving via a
 * LinkedIn/investor link (`?inv=`) defaults into the Investor fast-lane.
 * Client-only (like useCountdown) — returns the plain default on first
 * render to avoid an SSR/CSR hydration mismatch, then resolves from the URL
 * on mount.
 */
export function useIntentPersona(): LeadRole {
  const [persona, setPersona] = useState<LeadRole>(DEFAULT_PERSONA);

  useEffect(() => {
    setPersona(resolvePersonaFromSearch(window.location.search));
  }, []);

  return persona;
}
