import { create } from 'zustand';
import { FINANCIAL_METRICS } from '@/lib/pitchData';
import type { PresentationMode, RoleType } from '@/types';

interface RoleState {
  presentationMode: PresentationMode;
  activeRole: RoleType;
  completedZones: string[];
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
  completeZone: (id: string) => void;
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
}

export const useRoleStore = create<RoleState>((set, get) => ({
  presentationMode: 'INTERACTIVE',
  activeRole: null,
  completedZones: [],
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

  completeZone: (id) => {
    if (get().completedZones.includes(id)) return;
    set((state) => ({
      completedZones: [...state.completedZones, id],
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
}));
