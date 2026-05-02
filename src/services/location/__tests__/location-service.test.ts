import { LocationService } from "../location-service";
import type { Coordinate } from "../../routing/types";

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted" })
  ),
  requestBackgroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted" })
  ),
  watchPositionAsync: jest.fn((opts, callback) => {
    callback({
      coords: { latitude: 40.5, longitude: -74.0, speed: 30 },
      timestamp: Date.now(),
    });
    return Promise.resolve({ remove: jest.fn() });
  }),
  Accuracy: { BestForNavigation: 6, Balanced: 3 },
}));

describe("LocationService", () => {
  const polyline: Coordinate[] = [
    { lat: 40.0, lng: -74.0 },
    { lat: 40.5, lng: -74.0 },
    { lat: 41.0, lng: -74.0 },
  ];

  it("requests permissions on start", async () => {
    const service = new LocationService();
    const granted = await service.requestPermissions();
    expect(granted).toBe(true);
  });

  it("provides snapped position via callback", async () => {
    const service = new LocationService();
    await service.requestPermissions();

    const positions: Coordinate[] = [];
    await service.startTracking(polyline, (pos) => {
      positions.push(pos.snapped);
    });

    expect(positions.length).toBeGreaterThan(0);
    expect(positions[0].lat).toBeCloseTo(40.5, 1);
  });

  it("provides off-route status via callback", async () => {
    const service = new LocationService();
    await service.requestPermissions();

    let routeState = "ON_ROUTE";
    await service.startTracking(polyline, (pos) => {
      routeState = pos.routeState;
    });

    expect(routeState).toBe("ON_ROUTE");
  });
});
