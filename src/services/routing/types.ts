export interface Coordinate {
  lat: number;
  lng: number;
}

export type ManeuverType =
  | "turn"
  | "exit"
  | "merge"
  | "fork"
  | "ramp"
  | "roundabout"
  | "continue"
  | "depart"
  | "arrive"
  | "other";

export type ManeuverModifier =
  | "left"
  | "sharp-left"
  | "slight-left"
  | "right"
  | "sharp-right"
  | "slight-right"
  | "straight"
  | "uturn"
  | "none";

export interface Step {
  id: string;                    // unique within the route
  coordinate: Coordinate;        // location of the maneuver
  maneuverType: ManeuverType;
  modifier: ManeuverModifier;
  instruction: string;           // human-readable: "Turn left onto Oak St"
  durationToHere: number;        // seconds from route start to this maneuver
  distanceToHere: number;        // meters from route start
}

export interface Leg {
  startCoordinate: Coordinate;
  endCoordinate: Coordinate;
  duration: number; // seconds
  distance: number; // meters
  coordinates: Coordinate[]; // polyline points for this segment
  steps: Step[];
}

export type TrafficLevel = "low" | "moderate" | "heavy";

export interface NormalizedRoute {
  coordinates: Coordinate[]; // full polyline
  duration: number; // total seconds
  distance: number; // total meters
  legs: Leg[];
  trafficLevel: TrafficLevel;
}

export interface WhatIfWaypoint {
  id: string;
  coordinate: Coordinate;
  label: string; // auto-generated via reverse geocoding
  addedAt: number; // timestamp
  index: number; // position in chain
}

export interface WhatIfSession {
  originalRoute: NormalizedRoute;
  modifiedRoute: NormalizedRoute | null;
  waypoints: WhatIfWaypoint[];
  isActive: boolean;
}

export type RoutingProvider = "google" | "mapbox";

export interface RouteProvider {
  getRoute(
    origin: Coordinate,
    destination: Coordinate,
    waypoints?: Coordinate[]
  ): Promise<NormalizedRoute>;
  maxWaypoints: number;
}

export interface RouteRequest {
  origin: Coordinate;
  destination: Coordinate;
  waypoints?: Coordinate[];
}

export interface SavedRoute {
  id: string;
  userId: string;
  name: string;
  origin: { lat: number; lng: number; address: string };
  destination: { lat: number; lng: number; address: string };
  waypoints: { lat: number; lng: number; label: string }[];
  estimatedTime: number; // minutes
  distance: number; // meters
  createdAt: number;
  lastUsedAt: number;
}

export interface UserProfile {
  email: string;
  displayName: string;
  createdAt: number;
  routingProvider: RoutingProvider;
  apiUsage: {
    month: string; // "YYYY-MM"
    routeRequests: number;
  };
}
