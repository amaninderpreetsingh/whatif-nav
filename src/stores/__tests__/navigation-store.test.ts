import { useNavigationStore } from "../navigation-store";
import type { NormalizedRoute, Coordinate } from "../../services/routing/types";

const mockRoute: NormalizedRoute = {
  coordinates: [{ lat: 40.0, lng: -74.0 }, { lat: 41.0, lng: -73.0 }],
  duration: 2700,
  distance: 45000,
  legs: [],
  trafficLevel: "moderate",
};

describe("navigation store", () => {
  beforeEach(() => { useNavigationStore.getState().reset(); });

  it("starts with no active route", () => {
    const state = useNavigationStore.getState();
    expect(state.activeRoute).toBeNull();
    expect(state.isNavigating).toBe(false);
    expect(state.startedAt).toBeNull();
  });

  it("startNavigation sets route and navigating flag", () => {
    const origin: Coordinate = { lat: 40.0, lng: -74.0 };
    const dest: Coordinate = { lat: 41.0, lng: -73.0 };
    const before = Date.now();
    useNavigationStore.getState().startNavigation(mockRoute, origin, dest);
    const after = Date.now();
    const state = useNavigationStore.getState();
    expect(state.activeRoute).toEqual(mockRoute);
    expect(state.isNavigating).toBe(true);
    expect(state.origin).toEqual(origin);
    expect(state.destination).toEqual(dest);
    expect(typeof state.startedAt).toBe("number");
    expect(state.startedAt).toBeGreaterThanOrEqual(before);
    expect(state.startedAt).toBeLessThanOrEqual(after);
  });

  it("updateETA updates remaining time", () => {
    useNavigationStore.getState().startNavigation(
      mockRoute, { lat: 40, lng: -74 }, { lat: 41, lng: -73 }
    );
    useNavigationStore.getState().updateETA(1800);
    expect(useNavigationStore.getState().remainingDuration).toBe(1800);
  });

  it("updatePosition updates current position", () => {
    const pos: Coordinate = { lat: 40.5, lng: -73.5 };
    useNavigationStore.getState().updatePosition(pos);
    expect(useNavigationStore.getState().currentPosition).toEqual(pos);
  });

  it("stopNavigation clears everything", () => {
    useNavigationStore.getState().startNavigation(
      mockRoute, { lat: 40, lng: -74 }, { lat: 41, lng: -73 }
    );
    useNavigationStore.getState().stopNavigation();
    const state = useNavigationStore.getState();
    expect(state.activeRoute).toBeNull();
    expect(state.isNavigating).toBe(false);
    expect(state.startedAt).toBeNull();
  });

  it("reset clears startedAt", () => {
    useNavigationStore.getState().startNavigation(
      mockRoute, { lat: 40, lng: -74 }, { lat: 41, lng: -73 }
    );
    expect(useNavigationStore.getState().startedAt).not.toBeNull();
    useNavigationStore.getState().reset();
    expect(useNavigationStore.getState().startedAt).toBeNull();
  });

  it("replaceRoute swaps active route", () => {
    useNavigationStore.getState().startNavigation(
      mockRoute, { lat: 40, lng: -74 }, { lat: 41, lng: -73 }
    );
    const newRoute = { ...mockRoute, duration: 3000 };
    useNavigationStore.getState().replaceRoute(newRoute);
    expect(useNavigationStore.getState().activeRoute?.duration).toBe(3000);
  });
});
