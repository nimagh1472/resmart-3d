import { NextResponse } from 'next/server';
import type { LeadRole } from '@/types';

/**
 * Lightweight, best-effort waitlist counters — module-level in-memory state,
 * NOT a database. It lives only as long as this server instance stays warm
 * and resets on redeploy/cold-start. That's an intentional, disclosed
 * trade-off (matching this codebase's existing "API routes are log sinks,
 * localStorage is the real source of truth" pattern) rather than standing up
 * real persistent storage for a pre-launch demo.
 */
const submissionCountsByRole = new Map<LeadRole, number>();
const invitesByReferralCode = new Map<string, number>();
const countedSubmissionKeys = new Set<string>();

interface WaitlistPostBody {
  role?: LeadRole;
  email?: string;
  referredByCode?: string | null;
}

export async function POST(request: Request) {
  let body: WaitlistPostBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.role || !body.email?.trim()) {
    return NextResponse.json({ ok: false, error: 'role and email are required' }, { status: 400 });
  }

  const submissionKey = `${body.role}:${body.email.trim().toLowerCase()}`;
  if (!countedSubmissionKeys.has(submissionKey)) {
    countedSubmissionKeys.add(submissionKey);
    submissionCountsByRole.set(body.role, (submissionCountsByRole.get(body.role) ?? 0) + 1);
  }

  if (body.referredByCode?.trim()) {
    const code = body.referredByCode.trim();
    invitesByReferralCode.set(code, (invitesByReferralCode.get(code) ?? 0) + 1);
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  return NextResponse.json({
    ok: true,
    submissions: Object.fromEntries(submissionCountsByRole),
    invitesForCode: code ? invitesByReferralCode.get(code) ?? 0 : null,
  });
}
