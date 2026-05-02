import { create } from "zustand";
import type { NormalizedRoute, Coordinate } from "../services/routing/types";

interface NavigationState {
  activeRoute: NormalizedRoute | null;
  origin: Coordinate | null;
  destination: Coordinate | null;
  currentPosition: Coordinate | null;
  isNavigating: boolean;
  remainingDuration: number;
  remainingDistance: number;

  startNavigation: (route: NormalizedRoute, origin: Coordinate, destination: Coordinate) => void;
  stopNavigation: () => void;
  replaceRoute: (route: NormalizedRoute) => void;
  updatePosition: (position: Coordinate) => void;
  updateETA: (remainingSeconds: number) => void;
  updateRemainingDistance: (meters: number) => void;
  reset: () => void;
}

const initialState = {
  activeRoute: null,
  origin: null,
  destination: null,
  currentPosition: null,
  isNavigating: false,
  remainingDuration: 0,
  remainingDistance: 0,
};

export const useNavigationStore = create<NavigationState>((set) => ({
  ...initialState,

  startNavigation: (route, origin, destination) =>
    set({
      activeRoute: route,
      origin,
      destination,
      isNavigating: true,
      remainingDuration: route.duration,
      remainingDistance: route.distance,
    }),

  stopNavigation: () => set(initialState),

  replaceRoute: (route) =>
    set({
      activeRoute: route,
      remainingDuration: route.duration,
      remainingDistance: route.distance,
    }),

  updatePosition: (position) => set({ currentPosition: position }),
  updateETA: (remainingSeconds) => set({ remainingDuration: remainingSeconds }),
  updateRemainingDistance: (meters) => set({ remainingDistance: meters }),
  reset: () => set(initialState),
}));
