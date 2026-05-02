import {
  decodeGooglePolyline,
  coordinatesToGeoJSON,
  insertWaypointAtCorrectPosition,
} from "../polyline";
import type { Coordinate, WhatIfWaypoint } from "../../services/routing/types";

describe("decodeGooglePolyline", () => {
  it("decodes a known encoded polyline", () => {
    const coords = decodeGooglePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
    expect(coords).toHaveLength(3);
    expect(coords[0].lat).toBeCloseTo(38.5, 1);
    expect(coords[0].lng).toBeCloseTo(-120.2, 1);
  });

  it("returns empty array for empty string", () => {
    const coords = decodeGooglePolyline("");
    expect(coords).toHaveLength(0);
  });
});

describe("coordinatesToGeoJSON", () => {
  it("converts coordinates to GeoJSON LineString format", () => {
    const coords: Coordinate[] = [
      { lat: 40.0, lng: -74.0 },
      { lat: 41.0, lng: -73.0 },
    ];
    const geojson = coordinatesToGeoJSON(coords);
    expect(geojson.type).toBe("LineString");
    expect(geojson.coordinates).toEqual([
      [-74.0, 40.0],
      [-73.0, 41.0],
    ]);
  });
});

describe("insertWaypointAtCorrectPosition", () => {
  const makeWaypoint = (lat: number, lng: number, id: string): WhatIfWaypoint => ({
    id,
    coordinate: { lat, lng },
    label: "WP " + id,
    addedAt: Date.now(),
    index: 0,
  });

  it("inserts first waypoint at index 0", () => {
    const routePolyline: Coordinate[] = [
      { lat: 40.0, lng: -74.0 },
      { lat: 40.5, lng: -74.0 },
      { lat: 41.0, lng: -74.0 },
    ];
    const existing: WhatIfWaypoint[] = [];
    const newWp = makeWaypoint(40.25, -74.0, "1");
    const result = insertWaypointAtCorrectPosition(newWp, existing, routePolyline);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
    expect(result[0].index).toBe(0);
  });

  it("inserts waypoint before existing when geographically earlier", () => {
    const routePolyline: Coordinate[] = [
      { lat: 40.0, lng: -74.0 },
      { lat: 40.5, lng: -74.0 },
      { lat: 41.0, lng: -74.0 },
      { lat: 41.5, lng: -74.0 },
    ];
    const existingWp = makeWaypoint(41.0, -74.0, "1");
    existingWp.index = 0;
    const existing: WhatIfWaypoint[] = [existingWp];
    const newWp = makeWaypoint(40.25, -74.0, "2");
    const result = insertWaypointAtCorrectPosition(newWp, existing, routePolyline);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("2");
    expect(result[0].index).toBe(0);
    expect(result[1].id).toBe("1");
    expect(result[1].index).toBe(1);
  });

  it("inserts waypoint after existing when geographically later", () => {
    const routePolyline: Coordinate[] = [
      { lat: 40.0, lng: -74.0 },
      { lat: 40.5, lng: -74.0 },
      { lat: 41.0, lng: -74.0 },
      { lat: 41.5, lng: -74.0 },
    ];
    const existingWp = makeWaypoint(40.25, -74.0, "1");
    existingWp.index = 0;
    const existing: WhatIfWaypoint[] = [existingWp];
    const newWp = makeWaypoint(41.25, -74.0, "2");
    const result = insertWaypointAtCorrectPosition(newWp, existing, routePolyline);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("1");
    expect(result[1].id).toBe("2");
    expect(result[1].index).toBe(1);
  });
});
