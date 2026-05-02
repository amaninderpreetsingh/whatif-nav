import { RoutingService } from "../routing-service";
import type { Coordinate, NormalizedRoute, RouteProvider } from "../types";

const mockRoute: NormalizedRoute = {
  coordinates: [{ lat: 40.0, lng: -74.0 }, { lat: 41.0, lng: -73.0 }],
  duration: 900,
  distance: 5000,
  legs: [],
  trafficLevel: "low",
};

describe("RoutingService", () => {
  let service: RoutingService;
  let mockGoogleProvider: RouteProvider;
  let mockMapboxProvider: RouteProvider;
  const origin: Coordinate = { lat: 40.7128, lng: -74.006 };
  const dest: Coordinate = { lat: 40.758, lng: -73.9855 };

  beforeEach(() => {
    mockGoogleProvider = {
      maxWaypoints: 25,
      getRoute: jest.fn(() => Promise.resolve(mockRoute)),
    };
    mockMapboxProvider = {
      maxWaypoints: 25,
      getRoute: jest.fn(() => Promise.resolve({ ...mockRoute, duration: 950 })),
    };
    service = new RoutingService(mockGoogleProvider, mockMapboxProvider);
    service.setActiveProvider("google");
  });

  it("uses Google provider by default", async () => {
    const route = await service.getRoute(origin, dest);
    expect(mockGoogleProvider.getRoute).toHaveBeenCalled();
    expect(route.duration).toBe(900);
  });

  it("switches to Mapbox when configured", async () => {
    service.setActiveProvider("mapbox");
    const route = await service.getRoute(origin, dest);
    expect(mockMapboxProvider.getRoute).toHaveBeenCalled();
    expect(route.duration).toBe(950);
  });

  it("falls back to secondary provider on error", async () => {
    (mockGoogleProvider.getRoute as jest.Mock).mockRejectedValueOnce(
      new Error("Google API error")
    );
    const route = await service.getRoute(origin, dest);
    expect(mockMapboxProvider.getRoute).toHaveBeenCalled();
    expect(route.duration).toBe(950);
  });

  it("returns cached result for same params within TTL", async () => {
    await service.getRoute(origin, dest);
    await service.getRoute(origin, dest);
    expect(mockGoogleProvider.getRoute).toHaveBeenCalledTimes(1);
  });

  it("does not cache when waypoints differ", async () => {
    await service.getRoute(origin, dest);
    await service.getRoute(origin, dest, [{ lat: 40.73, lng: -73.99 }]);
    expect(mockGoogleProvider.getRoute).toHaveBeenCalledTimes(2);
  });

  it("enforces waypoint limit", async () => {
    const tooManyWaypoints = Array.from({ length: 26 }, (_, i) => ({
      lat: 40 + i * 0.01, lng: -74,
    }));
    await expect(
      service.getRoute(origin, dest, tooManyWaypoints)
    ).rejects.toThrow("waypoint");
  });

  it("cancels pending request when new one arrives", async () => {
    let resolveFirst: (v: NormalizedRoute) => void;
    (mockGoogleProvider.getRoute as jest.Mock).mockImplementationOnce(
      () => new Promise<NormalizedRoute>((resolve) => { resolveFirst = resolve; })
    );
    const firstRequest = service.getRoute(origin, dest);
    const secondRequest = service.getRoute({ lat: 41, lng: -73 }, dest);
    await expect(firstRequest).rejects.toThrow("cancelled");
    resolveFirst!(mockRoute);
    await secondRequest; // ensure no unhandled rejection
  });
});
