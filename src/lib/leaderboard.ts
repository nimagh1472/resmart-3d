import type { LeaderboardEntry, ProfileRole } from '@/types';

const LEADERBOARD_STORAGE_KEY = 'resmart_leaderboard';
export const LEADERBOARD_SIZE = 50;

/** Reward badge unlocked for placing in a role's Top 50 — shown in Leaderboard.tsx. */
export const ROLE_BADGES: Record<ProfileRole, string> = {
  driver: '3 Months 0% Commission',
  customer: '500 AED Voucher',
  investor: 'Priority Seed Allocation Rights',
};

export const ROLE_LABELS: Record<ProfileRole, string> = {
  driver: 'Driver',
  customer: 'Customer',
  investor: 'Investor',
};

function readAllEntries(): LeaderboardEntry[] {
  try {
    const raw = window.localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LeaderboardEntry[]) : [];
  } catch {
    return [];
  }
}

function writeAllEntries(entries: LeaderboardEntry[]) {
  try {
    window.localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Best-effort only — localStorage can throw under private browsing / quota limits.
  }
}

/** Inserts/updates this email's best score for its role, then persists. One entry per (email, role) pair. */
export function upsertLeaderboardEntry(entry: LeaderboardEntry): LeaderboardEntry[] {
  const entries = readAllEntries();
  const existingIndex = entries.findIndex((candidate) => candidate.email === entry.email && candidate.role === entry.role);

  if (existingIndex === -1) {
    entries.push(entry);
  } else if (entry.score >= entries[existingIndex].score) {
    entries[existingIndex] = entry;
  }

  writeAllEntries(entries);
  return entries;
}

/** Top N (default 50) entries for a role, ranked by score descending. */
export function getTopForRole(role: ProfileRole, limit: number = LEADERBOARD_SIZE): LeaderboardEntry[] {
  return readAllEntries()
    .filter((entry) => entry.role === role)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** 1-based rank within the role's full (unclamped) leaderboard, or null if not present. */
export function getRankForEmail(role: ProfileRole, email: string): number | null {
  const ranked = readAllEntries()
    .filter((entry) => entry.role === role)
    .sort((a, b) => b.score - a.score);
  const index = ranked.findIndex((entry) => entry.email === email);
  return index === -1 ? null : index + 1;
}

/** j***@example.com — avoids showing full emails in a leaderboard visible to other players. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, 1);
  return `${visible}${'*'.repeat(Math.max(local.length - 1, 3))}@${domain}`;
}

export interface QualificationStatus {
  rank: number | null;
  isQualified: boolean;
  pointsToQualify: number | null;
}

/** Whether this email is currently inside its role's Top 50, and if not, how many more points it needs. */
export function getQualificationStatus(role: ProfileRole, email: string): QualificationStatus {
  const rank = getRankForEmail(role, email);
  const top = getTopForRole(role, LEADERBOARD_SIZE);

  if (rank === null) return { rank: null, isQualified: false, pointsToQualify: null };
  if (rank <= LEADERBOARD_SIZE) return { rank, isQualified: true, pointsToQualify: 0 };

  const myScore = readAllEntries().find((entry) => entry.role === role && entry.email === email)?.score ?? 0;
  const thresholdScore = top[top.length - 1]?.score ?? 0;
  return { rank, isQualified: false, pointsToQualify: Math.max(1, thresholdScore - myScore + 1) };
}

export interface RoleSummary {
  score: number;
  rank: number | null;
  isQualified: boolean;
}

const ALL_PROFILE_ROLES: ProfileRole[] = ['driver', 'customer', 'investor'];

/** This email's score/rank/qualification across all 3 personas at once — powers the Account Panel's side-by-side view. */
export function getAllRoleSummaries(email: string): Record<ProfileRole, RoleSummary> {
  const entries = readAllEntries();
  return ALL_PROFILE_ROLES.reduce((summary, role) => {
    const entry = entries.find((candidate) => candidate.role === role && candidate.email === email);
    const qualification = getQualificationStatus(role, email);
    summary[role] = { score: entry?.score ?? 0, rank: qualification.rank, isQualified: qualification.isQualified };
    return summary;
  }, {} as Record<ProfileRole, RoleSummary>);
}

export interface LeaderboardSubmission {
  email: string;
  role: ProfileRole;
  score: number;
  rank: number | null;
  timestamp: string;
}

/** Best-effort POST to /api/leaderboard — mirrors LeadCaptureModal's fire-and-forget
 * pattern against /api/lead. The localStorage entry above is the source of truth. */
export function submitScoreToServer(payload: LeaderboardSubmission) {
  fetch('/api/leaderboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Non-fatal — localStorage already has this score.
  });
}
