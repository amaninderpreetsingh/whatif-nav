import { RouteSnapper } from "../route-snapper";
import type { Coordinate } from "../../routing/types";

describe("RouteSnapper", () => {
  const polyline: Coordinate[] = [
    { lat: 40.0, lng: -74.0 },
    { lat: 40.5, lng: -74.0 },
    { lat: 41.0, lng: -74.0 },
  ];

  it("snaps GPS point to nearest route point", () => {
    const snapper = new RouteSnapper(polyline);
    const rawGps: Coordinate = { lat: 40.25, lng: -73.999 };
    const snapped = snapper.snap(rawGps);
    expect(snapped.lat).toBeCloseTo(40.25, 1);
    expect(snapped.lng).toBeCloseTo(-74.0, 2);
  });

  it("returns distance from route", () => {
    const snapper = new RouteSnapper(polyline);
    const rawGps: Coordinate = { lat: 40.25, lng: -73.999 };
    const result = snapper.snapWithDistance(rawGps);
    expect(result.snapped.lat).toBeCloseTo(40.25, 1);
    expect(result.distanceFromRoute).toBeLessThan(200);
  });

  it("reports large distance for far-off point", () => {
    const snapper = new RouteSnapper(polyline);
    const farOff: Coordinate = { lat: 40.25, lng: -73.99 };
    const result = snapper.snapWithDistance(farOff);
    expect(result.distanceFromRoute).toBeGreaterThan(500);
  });

  it("calculates progress along route", () => {
    const snapper = new RouteSnapper(polyline);
    const midpoint: Coordinate = { lat: 40.5, lng: -74.0 };
    const progress = snapper.getProgress(midpoint);
    expect(progress).toBeCloseTo(0.5, 1);
  });

  it("returns 0 progress at start", () => {
    const snapper = new RouteSnapper(polyline);
    const progress = snapper.getProgress(polyline[0]);
    expect(progress).toBeCloseTo(0, 1);
  });

  it("returns ~1 progress at end", () => {
    const snapper = new RouteSnapper(polyline);
    const progress = snapper.getProgress(polyline[polyline.length - 1]);
    expect(progress).toBeCloseTo(1, 1);
  });

  it("updatePolyline replaces the route", () => {
    const snapper = new RouteSnapper(polyline);
    const newPolyline: Coordinate[] = [
      { lat: 42.0, lng: -74.0 },
      { lat: 43.0, lng: -74.0 },
    ];
    snapper.updatePolyline(newPolyline);
    const snapped = snapper.snap({ lat: 42.5, lng: -74.0 });
    expect(snapped.lat).toBeCloseTo(42.5, 1);
  });
});
