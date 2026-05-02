import type { Coordinate, WhatIfWaypoint } from "../services/routing/types";
import { findNearestSegmentIndex } from "./geo";

export function decodeGooglePolyline(encoded: string): Coordinate[] {
  const points: Coordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

export function coordinatesToGeoJSON(coords: Coordinate[]): {
  type: "LineString";
  coordinates: [number, number][];
} {
  return {
    type: "LineString",
    coordinates: coords.map((c) => [c.lng, c.lat]),
  };
}

export function insertWaypointAtCorrectPosition(
  newWaypoint: WhatIfWaypoint,
  existing: WhatIfWaypoint[],
  routePolyline: Coordinate[]
): WhatIfWaypoint[] {
  const newSegIndex = findNearestSegmentIndex(newWaypoint.coordinate, routePolyline);

  const waypointsWithSegIndex = existing.map((wp) => ({
    wp,
    segIndex: findNearestSegmentIndex(wp.coordinate, routePolyline),
  }));

  let insertAt = waypointsWithSegIndex.length;
  for (let i = 0; i < waypointsWithSegIndex.length; i++) {
    if (newSegIndex <= waypointsWithSegIndex[i].segIndex) {
      insertAt = i;
      break;
    }
  }

  const result = [...existing];
  result.splice(insertAt, 0, newWaypoint);

  return result.map((wp, i) => ({ ...wp, index: i }));
}
