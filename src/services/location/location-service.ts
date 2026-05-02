import * as Location from "expo-location";
import type { Coordinate } from "../routing/types";
import { RouteSnapper } from "./route-snapper";
import { OffRouteDetector } from "./off-route";

export interface LocationUpdate {
  raw: Coordinate;
  snapped: Coordinate;
  distanceFromRoute: number;
  routeState: "ON_ROUTE" | "OFF_ROUTE";
  speed: number;
  progress: number;
  timestamp: number;
}

type LocationCallback = (update: LocationUpdate) => void;

export class LocationService {
  private snapper: RouteSnapper | null = null;
  private offRouteDetector = new OffRouteDetector();
  private subscription: Location.LocationSubscription | null = null;

  async requestPermissions(): Promise<boolean> {
    const { status: foreground } =
      await Location.requestForegroundPermissionsAsync();
    if (foreground !== "granted") return false;

    await Location.requestBackgroundPermissionsAsync();
    return true;
  }

  async startTracking(
    polyline: Coordinate[],
    callback: LocationCallback
  ): Promise<void> {
    this.snapper = new RouteSnapper(polyline);
    this.offRouteDetector.reset();

    this.subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 5,
      },
      (location) => {
        if (!this.snapper) return;

        const raw: Coordinate = {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        };

        const { snapped, distanceFromRoute } =
          this.snapper.snapWithDistance(raw);
        this.offRouteDetector.update(distanceFromRoute, location.timestamp);

        const update: LocationUpdate = {
          raw,
          snapped,
          distanceFromRoute,
          routeState: this.offRouteDetector.getState(),
          speed: location.coords.speed ?? 0,
          progress: this.snapper.getProgress(snapped),
          timestamp: location.timestamp,
        };

        callback(update);
      }
    );
  }

  updatePolyline(polyline: Coordinate[]) {
    if (this.snapper) this.snapper.updatePolyline(polyline);
    this.offRouteDetector.reset();
  }

  stopTracking() {
    this.subscription?.remove();
    this.subscription = null;
    this.snapper = null;
    this.offRouteDetector.reset();
  }
}
