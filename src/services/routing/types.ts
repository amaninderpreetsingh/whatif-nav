export interface Coordinate {
  lat: number;
  lng: number;
}

export interface Leg {
  startCoordinate: Coordinate;
  endCoordinate: Coordinate;
  duration: number; // seconds
  distance: number; // meters
  coordinates: Coordinate[]; // polyline points for this segment
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
