import { NextResponse } from 'next/server';

interface LeadPayload {
  name?: string;
  email?: string;
  role?: string;
  wantsEarlyAccess?: boolean;
  source?: string | null;
}

/**
 * Logs a submitted lead server-side. There is no CRM/database wired up yet —
 * this is intentionally just a log sink; the client (LeadCaptureModal.tsx)
 * is responsible for the localStorage fallback so no lead is ever lost if
 * this call fails or is unavailable.
 */
export async function POST(request: Request) {
  let payload: LeadPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!payload.name?.trim() || !payload.email?.trim()) {
    return NextResponse.json({ ok: false, error: 'Name and email are required' }, { status: 400 });
  }

  console.log('[ReSmart AI] New lead captured:', {
    name: payload.name.trim(),
    email: payload.email.trim(),
    role: payload.role ?? 'Shopper',
    wantsEarlyAccess: Boolean(payload.wantsEarlyAccess),
    source: payload.source ?? null,
    receivedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
