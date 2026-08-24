import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SHOPPER_RANK_CONFIG, URGENCY_SPOTS } from '@/lib/pitchData';
import type { LeadRole } from '@/types';

/** Only Shopper/Merchant/Driver have a waitlist position + share mechanic — Investor is a confidential request, never gamified/shared. */
type WaitlistRole = Exclude<LeadRole, 'investor'>;

interface WaitlistEntry {
  waitlistPosition: number;
  shareBoostCount: number;
  inviteCredits: number;
}

interface UserProfileState {
  email: string;
  submittedRoles: LeadRole[];
  waitlist: Partial<Record<WaitlistRole, WaitlistEntry>>;
  referralCode: string;

  /** Records a lead submission for a role (idempotent for the waitlist roles — resubmitting doesn't reset an existing position). */
  recordSubmission: (role: LeadRole, email: string) => void;
  hasSubmitted: (role: LeadRole) => boolean;
  applyShareBoost: (role: WaitlistRole) => void;
  applyInviteCredit: (role: WaitlistRole, newInvites: number) => void;
}

/**
 * Short, non-identifying referral code — a deterministic (not random) hash
 * of the email, so the same visitor always gets the same code across
 * devices/sessions without the raw address ever appearing in a shared URL.
 */
function hashEmailToReferralCode(email: string): string {
  let hash = 0;
  for (let index = 0; index < email.length; index += 1) {
    hash = (hash * 31 + email.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36).toUpperCase();
}

/**
 * Seeds a starting position somewhere within the still-open pool, so every
 * visitor's "line" feels distinct rather than everyone starting at the same
 * number. Shopper uses the large-scale rank model (SHOPPER_RANK_CONFIG);
 * Merchant/Driver use the small 50-slot URGENCY_SPOTS pools.
 */
function seedWaitlistPosition(role: WaitlistRole): number {
  if (role === 'shopper') {
    const { seedRangeMin, seedRangeMax } = SHOPPER_RANK_CONFIG;
    return seedRangeMin + Math.floor(Math.random() * (seedRangeMax - seedRangeMin + 1));
  }
  const pool = URGENCY_SPOTS[role];
  const openSlots = Math.max(1, pool.totalSpots - pool.baseClaimed);
  return 1 + Math.floor(Math.random() * openSlots);
}

function shareBoostJump(role: WaitlistRole): number {
  return role === 'shopper' ? SHOPPER_RANK_CONFIG.pointsPerShare : 10;
}

function inviteCreditJump(role: WaitlistRole): number {
  return role === 'shopper' ? SHOPPER_RANK_CONFIG.pointsPerInvite : 5;
}

function maxShareBoosts(role: WaitlistRole): number {
  return role === 'shopper' ? SHOPPER_RANK_CONFIG.maxShareBoosts : 3;
}

/**
 * Landing-page identity store: the email captured at lead submission plus a
 * per-role waitlist position that improves via WhatsApp/link sharing
 * (capped) and successful invites (reported back by the lightweight
 * server-side counter in app/api/waitlist/route.ts). Persisted to
 * localStorage so a returning visitor resumes their position instead of
 * losing progress.
 */
export const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set, get) => ({
      email: '',
      submittedRoles: [],
      waitlist: {},
      referralCode: '',

      recordSubmission: (role, email) => {
        set((state) => ({
          email,
          referralCode: state.referralCode || hashEmailToReferralCode(email),
          submittedRoles: state.submittedRoles.includes(role) ? state.submittedRoles : [...state.submittedRoles, role],
        }));

        if (role === 'investor') return;
        if (get().waitlist[role]) return; // already has a position — don't reset it on resubmit
        set((state) => ({
          waitlist: {
            ...state.waitlist,
            [role]: { waitlistPosition: seedWaitlistPosition(role), shareBoostCount: 0, inviteCredits: 0 },
          },
        }));
      },

      hasSubmitted: (role) => get().submittedRoles.includes(role),

      applyShareBoost: (role) => {
        const entry = get().waitlist[role];
        if (!entry || entry.shareBoostCount >= maxShareBoosts(role)) return;
        set((state) => ({
          waitlist: {
            ...state.waitlist,
            [role]: {
              ...entry,
              shareBoostCount: entry.shareBoostCount + 1,
              waitlistPosition: Math.max(1, entry.waitlistPosition - shareBoostJump(role)),
            },
          },
        }));
      },

      applyInviteCredit: (role, newInvites) => {
        if (newInvites <= 0) return;
        const entry = get().waitlist[role];
        if (!entry) return;
        set((state) => ({
          waitlist: {
            ...state.waitlist,
            [role]: {
              ...entry,
              inviteCredits: entry.inviteCredits + newInvites,
              waitlistPosition: Math.max(1, entry.waitlistPosition - newInvites * inviteCreditJump(role)),
            },
          },
        }));
      },
    }),
    { name: 'resmart_user_profile' },
  ),
);
