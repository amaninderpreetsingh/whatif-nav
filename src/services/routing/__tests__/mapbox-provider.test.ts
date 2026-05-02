import { MapboxRouteProvider } from "../mapbox-provider";
import type { Coordinate } from "../types";

const mockCallable = jest.fn();
jest.mock("firebase/functions", () => ({
  getFunctions: jest.fn(),
  httpsCallable: jest.fn(() => mockCallable),
}));
jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
}));
jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
}));
jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(),
}));
jest.mock("../../firebase/config", () => ({
  functions: {},
}));

describe("MapboxRouteProvider", () => {
  const provider = new MapboxRouteProvider();
  const origin: Coordinate = { lat: 40.7128, lng: -74.006 };
  const dest: Coordinate = { lat: 40.758, lng: -73.9855 };

  beforeEach(() => { jest.clearAllMocks(); });

  it("has maxWaypoints of 25", () => {
    expect(provider.maxWaypoints).toBe(25);
  });

  it("calls Cloud Function with mapbox provider", async () => {
    mockCallable.mockResolvedValue({
      data: {
        provider: "mapbox",
        coordinates: [
          { lat: 40.7128, lng: -74.006 },
          { lat: 40.758, lng: -73.9855 },
        ],
        duration: 850,
        distance: 4800,
        legs: [],
        trafficLevel: "low",
      },
    });
    const route = await provider.getRoute(origin, dest);
    expect(mockCallable).toHaveBeenCalledWith({
      origin, destination: dest, waypoints: undefined, provider: "mapbox",
    });
    expect(route.duration).toBe(850);
    expect(route.coordinates).toHaveLength(2);
  });

  it("normalizes Mapbox response coordinates directly", async () => {
    mockCallable.mockResolvedValue({
      data: {
        provider: "mapbox",
        coordinates: [
          { lat: 40.0, lng: -74.0 },
          { lat: 40.5, lng: -73.5 },
          { lat: 41.0, lng: -73.0 },
        ],
        duration: 1200,
        distance: 8000,
        legs: [
          {
            duration: 1200, distance: 8000,
            startLat: 40.0, startLng: -74.0,
            endLat: 41.0, endLng: -73.0,
            coordinates: [
              { lat: 40.0, lng: -74.0 },
              { lat: 41.0, lng: -73.0 },
            ],
          },
        ],
        trafficLevel: "moderate",
      },
    });
    const route = await provider.getRoute(origin, dest);
    expect(route.coordinates).toHaveLength(3);
    expect(route.legs[0].startCoordinate.lat).toBe(40.0);
    expect(route.trafficLevel).toBe("moderate");
  });
});
