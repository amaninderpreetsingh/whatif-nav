import { create } from "zustand";
import type { NormalizedRoute, WhatIfWaypoint } from "../services/routing/types";

interface WhatIfState {
  isActive: boolean;
  originalRoute: NormalizedRoute | null;
  modifiedRoute: NormalizedRoute | null;
  waypoints: WhatIfWaypoint[];

  startSession: (originalRoute: NormalizedRoute) => void;
  endSession: () => void;
  setWaypoints: (waypoints: WhatIfWaypoint[]) => void;
  setModifiedRoute: (route: NormalizedRoute) => void;
  removeWaypoint: (id: string) => void;
  undoLast: () => void;
  getTimeDifference: () => number;
  reset: () => void;
}

const initialState = {
  isActive: false,
  originalRoute: null as NormalizedRoute | null,
  modifiedRoute: null as NormalizedRoute | null,
  waypoints: [] as WhatIfWaypoint[],
};

export const useWhatIfStore = create<WhatIfState>((set, get) => ({
  ...initialState,

  startSession: (originalRoute) =>
    set({ isActive: true, originalRoute, modifiedRoute: null, waypoints: [] }),

  endSession: () => set(initialState),

  setWaypoints: (waypoints) => set({ waypoints }),

  setModifiedRoute: (route) => set({ modifiedRoute: route }),

  removeWaypoint: (id) =>
    set((state) => ({
      waypoints: state.waypoints
        .filter((wp) => wp.id !== id)
        .map((wp, i) => ({ ...wp, index: i })),
    })),

  undoLast: () =>
    set((state) => {
      if (state.waypoints.length === 0) return state;
      const sorted = [...state.waypoints].sort((a, b) => b.addedAt - a.addedAt);
      const toRemove = sorted[0].id;
      return {
        waypoints: state.waypoints
          .filter((wp) => wp.id !== toRemove)
          .map((wp, i) => ({ ...wp, index: i })),
      };
    }),

  getTimeDifference: () => {
    const { originalRoute, modifiedRoute } = get();
    if (!originalRoute || !modifiedRoute) return 0;
    return modifiedRoute.duration - originalRoute.duration;
  },

  reset: () => set(initialState),
}));
