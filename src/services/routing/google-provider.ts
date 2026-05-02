import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/config";
import { decodeGooglePolyline } from "../../utils/polyline";
import type { RouteProvider, Coordinate, NormalizedRoute, Leg, TrafficLevel } from "./types";

interface CloudFunctionResponse {
  provider: "google";
  encodedPolyline: string;
  duration: number;
  distance: number;
  legs: {
    duration: number;
    distance: number;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    encodedPolyline: string;
  }[];
  trafficLevel: TrafficLevel;
}

export class GoogleRouteProvider implements RouteProvider {
  maxWaypoints = 25;

  private callable = httpsCallable(functions, "calculateRoute");

  async getRoute(
    origin: Coordinate,
    destination: Coordinate,
    waypoints?: Coordinate[]
  ): Promise<NormalizedRoute> {
    const result = await this.callable({
      origin, destination, waypoints, provider: "google",
    });

    const data = result.data as CloudFunctionResponse;

    const coordinates = decodeGooglePolyline(data.encodedPolyline);

    const legs: Leg[] = data.legs.map((leg) => ({
      startCoordinate: { lat: leg.startLat, lng: leg.startLng },
      endCoordinate: { lat: leg.endLat, lng: leg.endLng },
      duration: leg.duration,
      distance: leg.distance,
      coordinates: leg.encodedPolyline ? decodeGooglePolyline(leg.encodedPolyline) : [],
    }));

    return {
      coordinates,
      duration: data.duration,
      distance: data.distance,
      legs,
      trafficLevel: data.trafficLevel,
    };
  }
}
