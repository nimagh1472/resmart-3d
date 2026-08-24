import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { URGENCY_SPOTS } from '@/lib/pitchData';
import type { LeadRole } from '@/types';

/** Only Customer/Merchant/Driver have a waitlist position + share mechanic — Investor is a confidential request, never gamified/shared. */
type WaitlistRole = Exclude<LeadRole, 'investor'>;

const MAX_SHARE_BOOSTS_PER_ROLE = 3;
const SHARE_BOOST_JUMP = 10;
const INVITE_CREDIT_JUMP = 5;

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

/** Seeds a starting position somewhere within the still-open pool, so every visitor's "line" feels distinct rather than everyone starting at the same number. */
function seedWaitlistPosition(role: WaitlistRole): number {
  const pool = URGENCY_SPOTS[role];
  const openSlots = Math.max(1, pool.totalSpots - pool.baseClaimed);
  return 1 + Math.floor(Math.random() * openSlots);
}

/**
 * Landing-page identity store: the email captured at lead submission plus a
 * per-role waitlist position that improves via WhatsApp/link sharing (+10,
 * capped) and successful invites (+5 each, reported back by the lightweight
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
        if (!entry || entry.shareBoostCount >= MAX_SHARE_BOOSTS_PER_ROLE) return;
        set((state) => ({
          waitlist: {
            ...state.waitlist,
            [role]: {
              ...entry,
              shareBoostCount: entry.shareBoostCount + 1,
              waitlistPosition: Math.max(1, entry.waitlistPosition - SHARE_BOOST_JUMP),
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
              waitlistPosition: Math.max(1, entry.waitlistPosition - newInvites * INVITE_CREDIT_JUMP),
            },
          },
        }));
      },
    }),
    { name: 'resmart_user_profile' },
  ),
);
