import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/config";
import type { RouteProvider, Coordinate, NormalizedRoute, Leg, TrafficLevel } from "./types";

interface CloudFunctionResponse {
  provider: "mapbox";
  coordinates: Coordinate[];
  duration: number;
  distance: number;
  legs: {
    duration: number;
    distance: number;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    coordinates: Coordinate[];
  }[];
  trafficLevel: TrafficLevel;
}

export class MapboxRouteProvider implements RouteProvider {
  maxWaypoints = 25;

  private callable = httpsCallable(functions, "calculateRoute");

  async getRoute(
    origin: Coordinate,
    destination: Coordinate,
    waypoints?: Coordinate[]
  ): Promise<NormalizedRoute> {
    const result = await this.callable({
      origin, destination, waypoints, provider: "mapbox",
    });

    const data = result.data as CloudFunctionResponse;

    const legs: Leg[] = data.legs.map((leg) => ({
      startCoordinate: { lat: leg.startLat, lng: leg.startLng },
      endCoordinate: { lat: leg.endLat, lng: leg.endLng },
      duration: leg.duration,
      distance: leg.distance,
      coordinates: leg.coordinates || [],
    }));

    return {
      coordinates: data.coordinates,
      duration: data.duration,
      distance: data.distance,
      legs,
      trafficLevel: data.trafficLevel,
    };
  }
}
