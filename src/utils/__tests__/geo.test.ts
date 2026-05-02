import {
  haversineDistance,
  pointToSegmentDistance,
  findNearestSegmentIndex,
  interpolateAlongPolyline,
} from "../geo";
import type { Coordinate } from "../../services/routing/types";

describe("haversineDistance", () => {
  it("returns 0 for same point", () => {
    const p: Coordinate = { lat: 40.7128, lng: -74.006 };
    expect(haversineDistance(p, p)).toBe(0);
  });

  it("calculates known distance NYC to LA (~3944 km)", () => {
    const nyc: Coordinate = { lat: 40.7128, lng: -74.006 };
    const la: Coordinate = { lat: 34.0522, lng: -118.2437 };
    const dist = haversineDistance(nyc, la);
    expect(dist).toBeGreaterThan(3_900_000);
    expect(dist).toBeLessThan(4_000_000);
  });

  it("calculates short distance accurately", () => {
    const a: Coordinate = { lat: 40.0, lng: -74.0 };
    const b: Coordinate = { lat: 40.001, lng: -74.0 };
    const dist = haversineDistance(a, b);
    expect(dist).toBeGreaterThan(100);
    expect(dist).toBeLessThan(120);
  });
});

describe("pointToSegmentDistance", () => {
  it("returns 0 when point is on segment", () => {
    const point: Coordinate = { lat: 40.5, lng: -74.0 };
    const segA: Coordinate = { lat: 40.0, lng: -74.0 };
    const segB: Coordinate = { lat: 41.0, lng: -74.0 };
    const dist = pointToSegmentDistance(point, segA, segB);
    expect(dist).toBeLessThan(10);
  });

  it("returns perpendicular distance for offset point", () => {
    const point: Coordinate = { lat: 40.5, lng: -73.999 };
    const segA: Coordinate = { lat: 40.0, lng: -74.0 };
    const segB: Coordinate = { lat: 41.0, lng: -74.0 };
    const dist = pointToSegmentDistance(point, segA, segB);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(200);
  });
});

describe("findNearestSegmentIndex", () => {
  it("finds correct segment for point between second and third vertices", () => {
    const polyline: Coordinate[] = [
      { lat: 40.0, lng: -74.0 },
      { lat: 40.5, lng: -74.0 },
      { lat: 41.0, lng: -74.0 },
      { lat: 41.5, lng: -74.0 },
    ];
    const point: Coordinate = { lat: 40.75, lng: -74.0 };
    const index = findNearestSegmentIndex(point, polyline);
    expect(index).toBe(1);
  });

  it("returns 0 for point near start", () => {
    const polyline: Coordinate[] = [
      { lat: 40.0, lng: -74.0 },
      { lat: 40.5, lng: -74.0 },
      { lat: 41.0, lng: -74.0 },
    ];
    const point: Coordinate = { lat: 40.1, lng: -74.0 };
    const index = findNearestSegmentIndex(point, polyline);
    expect(index).toBe(0);
  });
});

describe("interpolateAlongPolyline", () => {
  it("returns start point at fraction 0", () => {
    const polyline: Coordinate[] = [
      { lat: 40.0, lng: -74.0 },
      { lat: 41.0, lng: -74.0 },
    ];
    const point = interpolateAlongPolyline(polyline, 0);
    expect(point.lat).toBeCloseTo(40.0, 2);
  });

  it("returns end point at fraction 1", () => {
    const polyline: Coordinate[] = [
      { lat: 40.0, lng: -74.0 },
      { lat: 41.0, lng: -74.0 },
    ];
    const point = interpolateAlongPolyline(polyline, 1);
    expect(point.lat).toBeCloseTo(41.0, 2);
  });

  it("returns midpoint at fraction 0.5", () => {
    const polyline: Coordinate[] = [
      { lat: 40.0, lng: -74.0 },
      { lat: 42.0, lng: -74.0 },
    ];
    const point = interpolateAlongPolyline(polyline, 0.5);
    expect(point.lat).toBeCloseTo(41.0, 1);
  });
});
