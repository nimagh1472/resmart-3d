import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getRankForEmail, submitScoreToServer, upsertLeaderboardEntry } from '@/lib/leaderboard';
import type { ProfileRole } from '@/types';

interface UserProfileState {
  email: string;
  role: ProfileRole | null;
  score: number;
  rank: number;
  referralCode: string;
  isLeaderboardOpen: boolean;
  isAccountPanelOpen: boolean;
  isShareCardOpen: boolean;
  shareCardRole: ProfileRole | null;
  hasSharedForBoost: boolean;

  setProfile: (email: string, role: ProfileRole) => void;
  addScore: (points: number) => void;
  openLeaderboard: () => void;
  closeLeaderboard: () => void;
  openAccountPanel: () => void;
  closeAccountPanel: () => void;
  openShareCard: (role: ProfileRole) => void;
  closeShareCard: () => void;
  applyShareBoost: () => void;
}

/**
 * Short, non-identifying `?ref=` code shared in referral links — a
 * deterministic (not random) hash of the email, so the same visitor always
 * gets the same code across devices/sessions without the raw address ever
 * appearing in a shared URL.
 */
function hashEmailToReferralCode(email: string): string {
  let hash = 0;
  for (let index = 0; index < email.length; index += 1) {
    hash = (hash * 31 + email.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36).toUpperCase();
}

/** Recomputes rank + syncs the shared leaderboard (localStorage + best-effort API) for the current profile. */
function syncLeaderboard(email: string, role: ProfileRole, score: number): number {
  const timestamp = new Date().toISOString();
  upsertLeaderboardEntry({ email, role, score, updatedAt: timestamp });
  const rank = getRankForEmail(role, email) ?? 0;
  submitScoreToServer({ email, role, score, rank, timestamp });
  return rank;
}

/**
 * Unified user-profile store: the email + role captured at onboarding
 * (RoleSelector.tsx), and the score/rank driving the Top-50 Leaderboard.
 * Deliberately independent of useRoleStore's earnings/wallet figures (those
 * price the pitch's fictional business; score is a pure engagement/ranking
 * number). Persisted to localStorage so a returning visitor in the same
 * browser resumes their session instead of re-onboarding.
 */
export const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set, get) => ({
      email: '',
      role: null,
      score: 0,
      rank: 0,
      referralCode: '',
      isLeaderboardOpen: false,
      isAccountPanelOpen: false,
      isShareCardOpen: false,
      shareCardRole: null,
      hasSharedForBoost: false,

      setProfile: (email, role) => {
        set((state) => ({ email, role, referralCode: state.referralCode || hashEmailToReferralCode(email) }));
        const rank = syncLeaderboard(email, role, get().score);
        set({ rank });
      },

      addScore: (points) => {
        const { email, role } = get();
        const score = get().score + points;
        set({ score });
        if (!email || !role) return;
        const rank = syncLeaderboard(email, role, score);
        set({ rank });
      },

      openLeaderboard: () => set({ isLeaderboardOpen: true }),
      closeLeaderboard: () => set({ isLeaderboardOpen: false }),
      openAccountPanel: () => set({ isAccountPanelOpen: true }),
      closeAccountPanel: () => set({ isAccountPanelOpen: false }),

      openShareCard: (role) => set({ isShareCardOpen: true, shareCardRole: role }),
      closeShareCard: () => set({ isShareCardOpen: false }),

      // One-time +10% score boost for copying/sharing the referral link (see
      // ShareRankCard.tsx) — guarded by hasSharedForBoost (persisted below)
      // so re-sharing repeatedly can't be farmed for repeat boosts.
      applyShareBoost: () => {
        if (get().hasSharedForBoost) return;
        set({ hasSharedForBoost: true });
        const boost = Math.round(get().score * 0.1);
        if (boost > 0) get().addScore(boost);
      },
    }),
    {
      name: 'resmart_user_profile',
      partialize: (state) => ({
        email: state.email,
        role: state.role,
        score: state.score,
        rank: state.rank,
        referralCode: state.referralCode,
        hasSharedForBoost: state.hasSharedForBoost,
      }),
    },
  ),
);
