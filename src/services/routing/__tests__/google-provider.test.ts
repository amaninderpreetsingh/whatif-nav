import { GoogleRouteProvider } from "../google-provider";
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

describe("GoogleRouteProvider", () => {
  const provider = new GoogleRouteProvider();
  const origin: Coordinate = { lat: 40.7128, lng: -74.006 };
  const dest: Coordinate = { lat: 40.758, lng: -73.9855 };

  beforeEach(() => { jest.clearAllMocks(); });

  it("has maxWaypoints of 25", () => {
    expect(provider.maxWaypoints).toBe(25);
  });

  it("calls Cloud Function with correct params", async () => {
    mockCallable.mockResolvedValue({
      data: {
        provider: "google",
        encodedPolyline: "_p~iF~ps|U_ulLnnqC",
        duration: 900,
        distance: 5000,
        legs: [],
        trafficLevel: "low",
      },
    });
    const route = await provider.getRoute(origin, dest);
    expect(mockCallable).toHaveBeenCalledWith({
      origin, destination: dest, waypoints: undefined, provider: "google",
    });
    expect(route.duration).toBe(900);
    expect(route.distance).toBe(5000);
    expect(route.trafficLevel).toBe("low");
  });

  it("passes waypoints when provided", async () => {
    const waypoints: Coordinate[] = [{ lat: 40.73, lng: -73.99 }];
    mockCallable.mockResolvedValue({
      data: {
        provider: "google",
        encodedPolyline: "_p~iF~ps|U_ulLnnqC",
        duration: 1200,
        distance: 7000,
        legs: [],
        trafficLevel: "moderate",
      },
    });
    await provider.getRoute(origin, dest, waypoints);
    expect(mockCallable).toHaveBeenCalledWith({
      origin, destination: dest, waypoints, provider: "google",
    });
  });

  it("normalizes Google response with encoded polyline into coordinates", async () => {
    mockCallable.mockResolvedValue({
      data: {
        provider: "google",
        encodedPolyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
        duration: 600,
        distance: 3000,
        legs: [
          {
            duration: 600,
            distance: 3000,
            startLat: 38.5, startLng: -120.2,
            endLat: 43.252, endLng: -126.453,
            encodedPolyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
          },
        ],
        trafficLevel: "low",
      },
    });
    const route = await provider.getRoute(origin, dest);
    expect(route.coordinates.length).toBeGreaterThan(0);
    expect(route.coordinates[0].lat).toBeCloseTo(38.5, 1);
    expect(route.legs).toHaveLength(1);
    expect(route.legs[0].startCoordinate.lat).toBe(38.5);
  });
});
