import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/config";
import type {
  RouteProvider,
  Coordinate,
  NormalizedRoute,
  Leg,
  Step,
  TrafficLevel,
  ManeuverType,
  ManeuverModifier,
} from "./types";

interface CloudFunctionStep {
  id: string;
  coordinate: Coordinate;
  maneuverType: ManeuverType;
  modifier: ManeuverModifier;
  instruction: string;
  durationToHere: number;
  distanceToHere: number;
}

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
    steps?: CloudFunctionStep[];
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

    const legs: Leg[] = data.legs.map((leg) => {
      const steps: Step[] = (leg.steps || []).map((step) => ({
        id: step.id,
        coordinate: step.coordinate,
        maneuverType: step.maneuverType,
        modifier: step.modifier,
        instruction: step.instruction,
        durationToHere: step.durationToHere,
        distanceToHere: step.distanceToHere,
      }));

      return {
        startCoordinate: { lat: leg.startLat, lng: leg.startLng },
        endCoordinate: { lat: leg.endLat, lng: leg.endLng },
        duration: leg.duration,
        distance: leg.distance,
        coordinates: leg.coordinates || [],
        steps,
      };
    });

    return {
      coordinates: data.coordinates,
      duration: data.duration,
      distance: data.distance,
      legs,
      trafficLevel: data.trafficLevel,
    };
  }
}
