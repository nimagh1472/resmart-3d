import { create } from 'zustand';
import {
  BUSINESS_FEATURES,
  CAMPAIGN_COMPLETION_BONUS,
  CASHBACK_PICKUPS,
  FINANCIAL_METRICS,
  calculateVoucherReward,
  randomInRange,
} from '@/lib/pitchData';
import { useUserProfileStore } from '@/hooks/useUserProfileStore';
import type {
  AgentOrderStage,
  BusinessFeatureKey,
  FeaturePopup,
  PresentationMode,
  RoleType,
  StoryRoleKey,
  WalletTransaction,
} from '@/types';

const EXPRESS_ORDER_SECONDS = 118 * 60; // just under the 2-hour guarantee
const VERIFICATION_FEE_MIN = 15;
const VERIFICATION_FEE_MAX = 25;
const DROPOFF_BONUS = 12;
const FEATURE_POPUP_LIFETIME_MS = 4200;
const REWARD_POPUP_LIFETIME_MS = 2200;
const CHAPTERS_PER_CAMPAIGN = 3;
const TRANSACTION_HISTORY_LIMIT = 12;

// Leaderboard score awards — independent of the AED earnings/wallet figures
// above (those price the fictional business; these rank engagement). See
// useUserProfileStore.addScore / lib/leaderboard.ts.
const SCORE_STATION_CLEARED = 50;
const SCORE_CASHBACK_COLLECTED = 15;
const SCORE_VERIFICATION_COMPLETED = 25;
const SCORE_DROPOFF_COMPLETED = 40;
const SCORE_CAMPAIGN_COMPLETED = 200;
const SCORE_EASTER_EGG_FOUND = 100;

let nextPopupId = 1;
let nextTransactionId = 1;

interface RoleState {
  presentationMode: PresentationMode;
  activeRole: RoleType;
  hasEnteredExperience: boolean;
  completedStations: string[];
  earnings: number;
  isAudioEnabled: boolean;
  isWebGLError: boolean;
  cinematicZoneIndex: number;
  isQuickDeckOpen: boolean;
  speedBoostMultiplier: number;
  nearestZoneId: string | null;
  isLeadModalOpen: boolean;
  leadModalSource: string | null;
  hasSubmittedLead: boolean;
  hasFoundEasterEgg: boolean;

  // Customer loop
  customerWallet: number;
  collectedPickupIds: string[];
  activeOrderCountdownSeconds: number | null;

  // Agent loop
  driverEarnings: number;
  agentOrderStage: AgentOrderStage;

  // Story campaign progression, per role: 0 = not started, 3 = campaign complete.
  chapterIndex: Record<StoryRoleKey, number>;
  hasCampaignCompleted: Record<StoryRoleKey, boolean>;
  voucherCode: string | null;
  voucherCount: number;
  voucherValue: number;
  campaignTotalEarnings: number;

  // Business-feature HUD pop-ups
  shownFeatureKeys: BusinessFeatureKey[];
  featurePopupQueue: FeaturePopup[];

  // Market Engine HUD — real-time ledger of every AED earned/saved event.
  transactions: WalletTransaction[];
  pushTransaction: (label: string, amount: number) => void;

  completeStation: (id: string) => void;
  setPresentationMode: (mode: PresentationMode) => void;
  setRole: (role: RoleType) => void;
  enterExperience: () => void;
  backToHub: () => void;
  setWebGLError: (isError: boolean) => void;
  setAudioEnabled: (enabled: boolean) => void;
  setCinematicZoneIndex: (index: number) => void;
  setQuickDeckOpen: (isOpen: boolean) => void;
  activateSpeedBoost: (multiplier: number, durationMs: number) => void;
  setNearestZoneId: (zoneId: string | null) => void;
  openLeadModal: (source?: string) => void;
  closeLeadModal: () => void;
  markLeadSubmitted: () => void;
  unlockEasterEgg: () => void;

  collectCashback: (id: string, amount: number) => void;
  startExpressOrder: () => void;
  tickOrderCountdown: () => void;
  acceptDispatch: () => void;
  completeVerification: () => number;
  completeDropoff: () => number;

  advanceChapter: (role: StoryRoleKey, chapter: number) => void;
  completeCampaign: (role: StoryRoleKey) => void;

  pushFeaturePopup: (key: BusinessFeatureKey, rewardText?: string) => void;
  dismissFeaturePopup: (id: number) => void;
}

export const useRoleStore = create<RoleState>((set, get) => ({
  presentationMode: 'INTERACTIVE',
  activeRole: null,
  hasEnteredExperience: false,
  completedStations: [],
  earnings: 0,
  isAudioEnabled: false,
  isWebGLError: false,
  cinematicZoneIndex: 0,
  isQuickDeckOpen: false,
  speedBoostMultiplier: 1,
  nearestZoneId: null,
  isLeadModalOpen: false,
  leadModalSource: null,
  hasSubmittedLead: false,
  hasFoundEasterEgg: false,

  customerWallet: 0,
  collectedPickupIds: [],
  activeOrderCountdownSeconds: null,

  driverEarnings: 0,
  agentOrderStage: 'IDLE',

  chapterIndex: { CUSTOMER: 0, AGENT: 0 },
  hasCampaignCompleted: { CUSTOMER: false, AGENT: false },
  voucherCode: null,
  voucherCount: 0,
  voucherValue: 0,
  campaignTotalEarnings: 0,

  shownFeatureKeys: [],
  featurePopupQueue: [],

  transactions: [],
  pushTransaction: (label, amount) =>
    set((state) => ({
      transactions: [
        { id: nextTransactionId++, label, amount, timestamp: Date.now() },
        ...state.transactions,
      ].slice(0, TRANSACTION_HISTORY_LIMIT),
    })),

  completeStation: (id) => {
    if (get().completedStations.includes(id)) return;
    set((state) => ({
      completedStations: [...state.completedStations, id],
      earnings: state.earnings + FINANCIAL_METRICS.netMarginPerOrder.value,
    }));
    get().pushTransaction(`Station cleared: ${id.replace(/_/g, ' ')}`, FINANCIAL_METRICS.netMarginPerOrder.value);
    useUserProfileStore.getState().addScore(SCORE_STATION_CLEARED);

    if (id === 'CUSTOMER_STORE') get().advanceChapter('CUSTOMER', 1);
    if (id === 'CUSTOMER_EXPRESS') {
      get().advanceChapter('CUSTOMER', 3);
      get().completeCampaign('CUSTOMER');
    }
  },

  setPresentationMode: (mode) =>
    set((state) => ({
      presentationMode: mode,
      // Restarting the cinematic tour should always begin at the first zone.
      cinematicZoneIndex: mode === 'CINEMATIC' ? 0 : state.cinematicZoneIndex,
    })),
  setRole: (role) => set({ activeRole: role }),
  enterExperience: () => set({ hasEnteredExperience: true }),
  // Returns to the Role Selection hub from mid-gameplay without touching
  // useUserProfileStore's persisted score/rank — scores are never stored on
  // this store, so leaving a run in progress simply abandons it.
  backToHub: () => set({ activeRole: null, presentationMode: 'INTERACTIVE' }),
  setWebGLError: (isError) => set({ isWebGLError: isError }),
  setAudioEnabled: (enabled) => set({ isAudioEnabled: enabled }),
  setCinematicZoneIndex: (index) => set({ cinematicZoneIndex: index }),
  setQuickDeckOpen: (isOpen) => set({ isQuickDeckOpen: isOpen }),

  activateSpeedBoost: (multiplier, durationMs) => {
    set({ speedBoostMultiplier: multiplier });
    setTimeout(() => set({ speedBoostMultiplier: 1 }), durationMs);
  },

  setNearestZoneId: (zoneId) => set({ nearestZoneId: zoneId }),

  openLeadModal: (source) => {
    // Once a lead has been captured this session, don't keep re-prompting.
    if (get().hasSubmittedLead) return;
    set({ isLeadModalOpen: true, leadModalSource: source ?? null });
  },
  closeLeadModal: () => set({ isLeadModalOpen: false }),
  markLeadSubmitted: () => set({ hasSubmittedLead: true, isLeadModalOpen: false }),

  unlockEasterEgg: () => {
    if (get().hasFoundEasterEgg) return;
    set({ hasFoundEasterEgg: true });
    get().pushFeaturePopup('SECRET_VOUCHER');
    useUserProfileStore.getState().addScore(SCORE_EASTER_EGG_FOUND);
  },

  collectCashback: (id, amount) => {
    if (get().collectedPickupIds.includes(id)) return;
    const isFirstEver = get().collectedPickupIds.length === 0;
    set((state) => ({
      collectedPickupIds: [...state.collectedPickupIds, id],
      customerWallet: state.customerWallet + amount,
    }));
    get().pushTransaction('Cashback Gem collected', amount);
    useUserProfileStore.getState().addScore(SCORE_CASHBACK_COLLECTED);
    if (isFirstEver) {
      get().pushFeaturePopup('CASHBACK_REWARDS');
    } else {
      get().pushFeaturePopup('CASHBACK_REWARDS', `+AED ${amount.toFixed(0)} cashback`);
    }

    if (get().collectedPickupIds.length >= CASHBACK_PICKUPS.length) {
      get().advanceChapter('CUSTOMER', 2);
    }
  },

  startExpressOrder: () => set({ activeOrderCountdownSeconds: EXPRESS_ORDER_SECONDS }),

  tickOrderCountdown: () =>
    set((state) => ({
      activeOrderCountdownSeconds:
        state.activeOrderCountdownSeconds === null ? null : Math.max(0, state.activeOrderCountdownSeconds - 1),
    })),

  acceptDispatch: () => {
    if (get().agentOrderStage !== 'IDLE') return;
    set({ agentOrderStage: 'DISPATCHED' });
    get().advanceChapter('AGENT', 1);
    get().startExpressOrder();
  },

  completeVerification: () => {
    if (get().agentOrderStage !== 'DISPATCHED') return 0;
    const fee = randomInRange(VERIFICATION_FEE_MIN, VERIFICATION_FEE_MAX);
    set((state) => ({ agentOrderStage: 'VERIFIED', driverEarnings: state.driverEarnings + fee }));
    get().pushTransaction('Merchant test fee', fee);
    get().advanceChapter('AGENT', 2);
    useUserProfileStore.getState().addScore(SCORE_VERIFICATION_COMPLETED);
    return fee;
  },

  completeDropoff: () => {
    if (get().agentOrderStage !== 'VERIFIED') return 0;
    set((state) => ({ agentOrderStage: 'IDLE', driverEarnings: state.driverEarnings + DROPOFF_BONUS }));
    get().pushTransaction('Delivery bonus', DROPOFF_BONUS);
    get().advanceChapter('AGENT', 3);
    get().completeCampaign('AGENT');
    useUserProfileStore.getState().addScore(SCORE_DROPOFF_COMPLETED);
    return DROPOFF_BONUS;
  },

  advanceChapter: (role, chapter) =>
    set((state) => ({
      chapterIndex: {
        ...state.chapterIndex,
        [role]: Math.max(state.chapterIndex[role], Math.min(chapter, CHAPTERS_PER_CAMPAIGN)),
      },
    })),

  completeCampaign: (role) => {
    if (get().hasCampaignCompleted[role]) return;
    const walletTotal = role === 'CUSTOMER' ? get().customerWallet : get().driverEarnings;
    const totalEarnings = walletTotal + CAMPAIGN_COMPLETION_BONUS[role];
    const reward = calculateVoucherReward(totalEarnings);
    useUserProfileStore.getState().addScore(SCORE_CAMPAIGN_COMPLETED);

    set((state) => ({
      hasCampaignCompleted: { ...state.hasCampaignCompleted, [role]: true },
      voucherCode: reward.code,
      voucherCount: reward.voucherCount,
      voucherValue: reward.voucherValue,
      campaignTotalEarnings: totalEarnings,
      // Bypasses openLeadModal's "already submitted" guard — the campaign
      // finale voucher screen must always show, even for a returning player
      // who gave their email earlier via the PDF/cinematic-tour lead form.
      isLeadModalOpen: true,
      leadModalSource: 'campaign_complete',
    }));
  },

  pushFeaturePopup: (key, rewardText) => {
    const alreadyShown = get().shownFeatureKeys.includes(key);
    const id = nextPopupId++;

    if (!alreadyShown) {
      const feature = BUSINESS_FEATURES[key];
      set((state) => ({
        shownFeatureKeys: [...state.shownFeatureKeys, key],
        featurePopupQueue: [
          ...state.featurePopupQueue,
          { id, kind: 'FEATURE', title: feature.title, description: feature.description },
        ],
      }));
      setTimeout(() => get().dismissFeaturePopup(id), FEATURE_POPUP_LIFETIME_MS);
      return;
    }

    if (!rewardText) return;
    set((state) => ({
      featurePopupQueue: [...state.featurePopupQueue, { id, kind: 'REWARD', title: rewardText }],
    }));
    setTimeout(() => get().dismissFeaturePopup(id), REWARD_POPUP_LIFETIME_MS);
  },

  dismissFeaturePopup: (id) =>
    set((state) => ({ featurePopupQueue: state.featurePopupQueue.filter((popup) => popup.id !== id) })),
}));
