import { useWhatIfStore } from "../whatif-store";
import type { NormalizedRoute, WhatIfWaypoint } from "../../services/routing/types";

const mockRoute: NormalizedRoute = {
  coordinates: [{ lat: 40.0, lng: -74.0 }, { lat: 41.0, lng: -73.0 }],
  duration: 2700,
  distance: 45000,
  legs: [],
  trafficLevel: "moderate",
};

const makeWaypoint = (id: string, lat: number): WhatIfWaypoint => ({
  id,
  coordinate: { lat, lng: -74.0 },
  label: `WP ${id}`,
  addedAt: Date.now(),
  index: 0,
});

describe("whatif store", () => {
  beforeEach(() => { useWhatIfStore.getState().reset(); });

  it("starts inactive with no waypoints", () => {
    const state = useWhatIfStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.waypoints).toHaveLength(0);
  });

  it("startSession freezes original route", () => {
    useWhatIfStore.getState().startSession(mockRoute);
    const state = useWhatIfStore.getState();
    expect(state.isActive).toBe(true);
    expect(state.originalRoute).toEqual(mockRoute);
  });

  it("setWaypoints updates waypoints list", () => {
    useWhatIfStore.getState().startSession(mockRoute);
    useWhatIfStore.getState().setWaypoints([makeWaypoint("1", 40.5)]);
    expect(useWhatIfStore.getState().waypoints).toHaveLength(1);
  });

  it("setModifiedRoute updates modified route", () => {
    useWhatIfStore.getState().startSession(mockRoute);
    useWhatIfStore.getState().setModifiedRoute({ ...mockRoute, duration: 3200 });
    expect(useWhatIfStore.getState().modifiedRoute?.duration).toBe(3200);
  });

  it("removeWaypoint removes by id", () => {
    useWhatIfStore.getState().startSession(mockRoute);
    useWhatIfStore.getState().setWaypoints([
      makeWaypoint("1", 40.3), makeWaypoint("2", 40.6),
    ]);
    useWhatIfStore.getState().removeWaypoint("1");
    const wps = useWhatIfStore.getState().waypoints;
    expect(wps).toHaveLength(1);
    expect(wps[0].id).toBe("2");
  });

  it("undoLast removes most recently added waypoint", () => {
    useWhatIfStore.getState().startSession(mockRoute);
    const wp1 = makeWaypoint("1", 40.3);
    wp1.addedAt = 1000;
    const wp2 = makeWaypoint("2", 40.6);
    wp2.addedAt = 2000;
    useWhatIfStore.getState().setWaypoints([wp1, wp2]);
    useWhatIfStore.getState().undoLast();
    const wps = useWhatIfStore.getState().waypoints;
    expect(wps).toHaveLength(1);
    expect(wps[0].id).toBe("1");
  });

  it("endSession clears everything", () => {
    useWhatIfStore.getState().startSession(mockRoute);
    useWhatIfStore.getState().setWaypoints([makeWaypoint("1", 40.5)]);
    useWhatIfStore.getState().endSession();
    const state = useWhatIfStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.waypoints).toHaveLength(0);
    expect(state.originalRoute).toBeNull();
    expect(state.modifiedRoute).toBeNull();
  });

  it("getTimeDifference returns difference in seconds", () => {
    useWhatIfStore.getState().startSession(mockRoute);
    useWhatIfStore.getState().setModifiedRoute({ ...mockRoute, duration: 3200 });
    expect(useWhatIfStore.getState().getTimeDifference()).toBe(500);
  });
});
