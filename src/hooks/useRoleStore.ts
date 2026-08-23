import { create } from 'zustand';
import { BUSINESS_FEATURES, FINANCIAL_METRICS, randomInRange } from '@/lib/pitchData';
import type { AgentOrderStage, BusinessFeatureKey, FeaturePopup, PresentationMode, RoleType } from '@/types';

const EXPRESS_ORDER_SECONDS = 118 * 60; // just under the 2-hour guarantee
const VERIFICATION_FEE_MIN = 15;
const VERIFICATION_FEE_MAX = 25;
const DROPOFF_BONUS = 12;
const FEATURE_POPUP_LIFETIME_MS = 4200;
const REWARD_POPUP_LIFETIME_MS = 2200;

let nextPopupId = 1;

interface RoleState {
  presentationMode: PresentationMode;
  activeRole: RoleType;
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

  // Customer loop
  customerWallet: number;
  collectedPickupIds: string[];
  activeOrderCountdownSeconds: number | null;

  // Agent loop
  driverEarnings: number;
  agentOrderStage: AgentOrderStage;

  // Business-feature HUD pop-ups
  shownFeatureKeys: BusinessFeatureKey[];
  featurePopupQueue: FeaturePopup[];

  completeStation: (id: string) => void;
  setPresentationMode: (mode: PresentationMode) => void;
  setRole: (role: RoleType) => void;
  setWebGLError: (isError: boolean) => void;
  setAudioEnabled: (enabled: boolean) => void;
  setCinematicZoneIndex: (index: number) => void;
  setQuickDeckOpen: (isOpen: boolean) => void;
  activateSpeedBoost: (multiplier: number, durationMs: number) => void;
  setNearestZoneId: (zoneId: string | null) => void;
  openLeadModal: (source?: string) => void;
  closeLeadModal: () => void;
  markLeadSubmitted: () => void;

  collectCashback: (id: string, amount: number) => void;
  startExpressOrder: () => void;
  tickOrderCountdown: () => void;
  acceptDispatch: () => void;
  completeVerification: () => number;
  completeDropoff: () => number;

  pushFeaturePopup: (key: BusinessFeatureKey, rewardText?: string) => void;
  dismissFeaturePopup: (id: number) => void;
}

export const useRoleStore = create<RoleState>((set, get) => ({
  presentationMode: 'INTERACTIVE',
  activeRole: null,
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

  customerWallet: 0,
  collectedPickupIds: [],
  activeOrderCountdownSeconds: null,

  driverEarnings: 0,
  agentOrderStage: 'IDLE',

  shownFeatureKeys: [],
  featurePopupQueue: [],

  completeStation: (id) => {
    if (get().completedStations.includes(id)) return;
    set((state) => ({
      completedStations: [...state.completedStations, id],
      earnings: state.earnings + FINANCIAL_METRICS.netMarginPerOrder.value,
    }));
  },

  setPresentationMode: (mode) =>
    set((state) => ({
      presentationMode: mode,
      // Restarting the cinematic tour should always begin at the first zone.
      cinematicZoneIndex: mode === 'CINEMATIC' ? 0 : state.cinematicZoneIndex,
    })),
  setRole: (role) => set({ activeRole: role }),
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

  collectCashback: (id, amount) => {
    if (get().collectedPickupIds.includes(id)) return;
    const isFirstEver = get().collectedPickupIds.length === 0;
    set((state) => ({
      collectedPickupIds: [...state.collectedPickupIds, id],
      customerWallet: state.customerWallet + amount,
    }));
    if (isFirstEver) {
      get().pushFeaturePopup('CASHBACK_REWARDS');
    } else {
      get().pushFeaturePopup('CASHBACK_REWARDS', `+$${amount.toFixed(0)} cashback`);
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
  },

  completeVerification: () => {
    if (get().agentOrderStage !== 'DISPATCHED') return 0;
    const fee = randomInRange(VERIFICATION_FEE_MIN, VERIFICATION_FEE_MAX);
    set((state) => ({ agentOrderStage: 'VERIFIED', driverEarnings: state.driverEarnings + fee }));
    return fee;
  },

  completeDropoff: () => {
    if (get().agentOrderStage !== 'VERIFIED') return 0;
    set((state) => ({ agentOrderStage: 'IDLE', driverEarnings: state.driverEarnings + DROPOFF_BONUS }));
    return DROPOFF_BONUS;
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
