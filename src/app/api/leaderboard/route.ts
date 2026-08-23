import { NextResponse } from 'next/server';

interface LeaderboardPayload {
  email?: string;
  role?: string;
  score?: number;
  rank?: number | null;
  timestamp?: string;
}

/**
 * Logs a leaderboard score update server-side. No database is wired up yet —
 * intentionally a log sink, mirroring api/lead/route.ts. The client
 * (lib/leaderboard.ts) ranks against localStorage as the source of truth, so
 * no score is ever lost if this call fails or is unavailable.
 */
export async function POST(request: Request) {
  let payload: LeaderboardPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!payload.email?.trim() || !payload.role?.trim()) {
    return NextResponse.json({ ok: false, error: 'Email and role are required' }, { status: 400 });
  }

  console.log('[ReSmart AI] Leaderboard score update:', {
    email: payload.email.trim(),
    role: payload.role,
    score: payload.score ?? 0,
    rank: payload.rank ?? null,
    timestamp: payload.timestamp ?? new Date().toISOString(),
    receivedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
