import type { Coordinate, NormalizedRoute, RouteProvider, RoutingProvider } from "./types";

interface CacheEntry {
  route: NormalizedRoute;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const COORDINATE_PRECISION = 3;

function roundCoord(c: Coordinate): string {
  return `${c.lat.toFixed(COORDINATE_PRECISION)},${c.lng.toFixed(COORDINATE_PRECISION)}`;
}

function cacheKey(origin: Coordinate, destination: Coordinate, waypoints?: Coordinate[]): string {
  const parts = [roundCoord(origin), roundCoord(destination)];
  if (waypoints) parts.push(...waypoints.map(roundCoord));
  return parts.join("|");
}

export class RoutingService {
  private google: RouteProvider;
  private mapbox: RouteProvider;
  private activeProvider: RoutingProvider = "google";
  private cache = new Map<string, CacheEntry>();
  private currentRequestId = 0;
  private pendingRejecters: Map<number, (reason: Error) => void> = new Map();

  constructor(google: RouteProvider, mapbox: RouteProvider) {
    this.google = google;
    this.mapbox = mapbox;
  }

  setActiveProvider(provider: RoutingProvider) {
    this.activeProvider = provider;
  }

  getActiveProvider(): RoutingProvider {
    return this.activeProvider;
  }

  async getRoute(
    origin: Coordinate,
    destination: Coordinate,
    waypoints?: Coordinate[]
  ): Promise<NormalizedRoute> {
    const primary = this.activeProvider === "google" ? this.google : this.mapbox;
    const fallback = this.activeProvider === "google" ? this.mapbox : this.google;

    if (waypoints && waypoints.length > primary.maxWaypoints) {
      throw new Error(`Maximum ${primary.maxWaypoints} waypoints allowed.`);
    }

    const key = cacheKey(origin, destination, waypoints);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.route;
    }

    // Cancel any pending in-flight requests
    for (const [, reject] of this.pendingRejecters) {
      reject(new Error("Request cancelled"));
    }
    this.pendingRejecters.clear();

    const requestId = ++this.currentRequestId;

    const cancellationPromise = new Promise<never>((_, reject) => {
      this.pendingRejecters.set(requestId, reject);
    });

    const isCancelled = () => requestId !== this.currentRequestId;

    try {
      const route = await Promise.race([
        primary.getRoute(origin, destination, waypoints),
        cancellationPromise,
      ]);

      if (isCancelled()) throw new Error("Request cancelled");

      this.pendingRejecters.delete(requestId);
      this.cache.set(key, { route, expiresAt: Date.now() + CACHE_TTL_MS });
      return route;
    } catch (err) {
      if ((err as Error).message === "Request cancelled") {
        this.pendingRejecters.delete(requestId);
        throw err;
      }

      try {
        if (isCancelled()) throw new Error("Request cancelled");

        const route = await Promise.race([
          fallback.getRoute(origin, destination, waypoints),
          cancellationPromise,
        ]);

        if (isCancelled()) throw new Error("Request cancelled");

        this.pendingRejecters.delete(requestId);
        this.cache.set(key, { route, expiresAt: Date.now() + CACHE_TTL_MS });
        return route;
      } catch (fallbackErr) {
        this.pendingRejecters.delete(requestId);
        if ((fallbackErr as Error).message === "Request cancelled") throw fallbackErr;
        throw err;
      }
    }
  }

  clearCache() {
    this.cache.clear();
  }
}
