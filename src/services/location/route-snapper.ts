import type { Coordinate } from "../routing/types";
import { haversineDistance, findNearestSegmentIndex } from "../../utils/geo";

export class RouteSnapper {
  private polyline: Coordinate[];

  constructor(polyline: Coordinate[]) {
    this.polyline = polyline;
  }

  updatePolyline(polyline: Coordinate[]) {
    this.polyline = polyline;
  }

  snap(rawGps: Coordinate): Coordinate {
    return this.snapWithDistance(rawGps).snapped;
  }

  snapWithDistance(rawGps: Coordinate): {
    snapped: Coordinate;
    distanceFromRoute: number;
    segmentIndex: number;
  } {
    const segIndex = findNearestSegmentIndex(rawGps, this.polyline);
    const segA = this.polyline[segIndex];
    const segB = this.polyline[segIndex + 1];

    const dx = segB.lat - segA.lat;
    const dy = segB.lng - segA.lng;
    const lenSq = dx * dx + dy * dy;

    let t = 0;
    if (lenSq > 0) {
      t = Math.max(
        0,
        Math.min(
          1,
          ((rawGps.lat - segA.lat) * dx + (rawGps.lng - segA.lng) * dy) / lenSq
        )
      );
    }

    const snapped: Coordinate = {
      lat: segA.lat + t * dx,
      lng: segA.lng + t * dy,
    };

    return {
      snapped,
      distanceFromRoute: haversineDistance(rawGps, snapped),
      segmentIndex: segIndex,
    };
  }

  getProgress(position: Coordinate): number {
    if (this.polyline.length < 2) return 0;

    const segIndex = findNearestSegmentIndex(position, this.polyline);
    let distanceBefore = 0;
    let totalDistance = 0;

    for (let i = 0; i < this.polyline.length - 1; i++) {
      const segDist = haversineDistance(this.polyline[i], this.polyline[i + 1]);
      totalDistance += segDist;

      if (i < segIndex) {
        distanceBefore += segDist;
      } else if (i === segIndex) {
        distanceBefore += haversineDistance(this.polyline[i], position);
      }
    }

    return totalDistance === 0 ? 0 : distanceBefore / totalDistance;
  }
}
