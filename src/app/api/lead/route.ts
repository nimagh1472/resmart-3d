import { NextResponse } from 'next/server';
import type { LeadPayload } from '@/types';

interface LeadRequestBody {
  lead?: LeadPayload;
  referredByCode?: string | null;
}

function isValidLead(lead: unknown): lead is LeadPayload {
  if (!lead || typeof lead !== 'object') return false;
  const candidate = lead as Record<string, unknown>;
  switch (candidate.role) {
    case 'customer':
      return typeof candidate.email === 'string' && candidate.email.trim().length > 0;
    case 'merchant':
      return typeof candidate.businessEmail === 'string' && candidate.businessEmail.trim().length > 0 && typeof candidate.district === 'string';
    case 'driver':
      return typeof candidate.email === 'string' && candidate.email.trim().length > 0 && typeof candidate.vehicleType === 'string';
    case 'investor':
      return typeof candidate.name === 'string' && candidate.name.trim().length > 0 && typeof candidate.fundOrEntity === 'string';
    default:
      return false;
  }
}

/**
 * Logs a submitted lead server-side. There is no CRM/database wired up yet —
 * this is intentionally just a log sink; the client (LeadCaptureCard.tsx) is
 * responsible for the localStorage fallback so no lead is ever lost if this
 * call fails or is unavailable.
 */
export async function POST(request: Request) {
  let body: LeadRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isValidLead(body.lead)) {
    return NextResponse.json({ ok: false, error: 'Invalid or incomplete lead payload' }, { status: 400 });
  }

  console.log('[ReSmart AI] New lead captured:', {
    lead: body.lead,
    referredByCode: body.referredByCode ?? null,
    receivedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
