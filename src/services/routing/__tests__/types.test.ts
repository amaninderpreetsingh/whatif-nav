import type {
  Coordinate,
  NormalizedRoute,
  Leg,
  Step,
  ManeuverType,
  ManeuverModifier,
  WhatIfWaypoint,
  WhatIfSession,
  RouteProvider,
  RoutingProvider,
} from "../types";

describe("routing types", () => {
  it("Coordinate has lat and lng", () => {
    const coord: Coordinate = { lat: 40.7128, lng: -74.006 };
    expect(coord.lat).toBe(40.7128);
    expect(coord.lng).toBe(-74.006);
  });

  it("Leg has required fields", () => {
    const leg: Leg = {
      startCoordinate: { lat: 40.7128, lng: -74.006 },
      endCoordinate: { lat: 40.758, lng: -73.9855 },
      duration: 600,
      distance: 5000,
      coordinates: [
        { lat: 40.7128, lng: -74.006 },
        { lat: 40.758, lng: -73.9855 },
      ],
      steps: [],
    };
    expect(leg.duration).toBe(600);
    expect(leg.coordinates).toHaveLength(2);
    expect(leg.steps).toHaveLength(0);
  });

  it("Step has required fields", () => {
    const maneuverType: ManeuverType = "turn";
    const modifier: ManeuverModifier = "left";
    const step: Step = {
      id: "g-0-40.7128--74.006",
      coordinate: { lat: 40.7128, lng: -74.006 },
      maneuverType,
      modifier,
      instruction: "Turn left onto Oak St",
      durationToHere: 30,
      distanceToHere: 200,
    };
    expect(step.maneuverType).toBe("turn");
    expect(step.modifier).toBe("left");
    expect(step.instruction).toContain("Oak");
  });

  it("NormalizedRoute has all fields", () => {
    const route: NormalizedRoute = {
      coordinates: [{ lat: 40.7128, lng: -74.006 }],
      duration: 2700,
      distance: 45000,
      legs: [],
      trafficLevel: "moderate",
    };
    expect(route.trafficLevel).toBe("moderate");
  });

  it("WhatIfWaypoint has required fields", () => {
    const wp: WhatIfWaypoint = {
      id: "wp-1",
      coordinate: { lat: 40.73, lng: -73.99 },
      label: "Exit 12",
      addedAt: Date.now(),
      index: 0,
    };
    expect(wp.id).toBe("wp-1");
  });

  it("WhatIfSession tracks original and modified routes", () => {
    const emptyRoute: NormalizedRoute = {
      coordinates: [],
      duration: 0,
      distance: 0,
      legs: [],
      trafficLevel: "low",
    };
    const session: WhatIfSession = {
      originalRoute: emptyRoute,
      modifiedRoute: null,
      waypoints: [],
      isActive: false,
    };
    expect(session.isActive).toBe(false);
    expect(session.modifiedRoute).toBeNull();
  });

  it("RoutingProvider enum has correct values", () => {
    const google: RoutingProvider = "google";
    const mapbox: RoutingProvider = "mapbox";
    expect(google).toBe("google");
    expect(mapbox).toBe("mapbox");
  });
});
