import type { Coordinate } from "../services/routing/types";

const EARTH_RADIUS_METERS = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistance(a: Coordinate, b: Coordinate): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function pointToSegmentDistance(
  point: Coordinate,
  segA: Coordinate,
  segB: Coordinate
): number {
  const d = haversineDistance(segA, segB);
  if (d === 0) return haversineDistance(point, segA);

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.lat - segA.lat) * (segB.lat - segA.lat) +
        (point.lng - segA.lng) * (segB.lng - segA.lng)) /
        ((segB.lat - segA.lat) ** 2 + (segB.lng - segA.lng) ** 2)
    )
  );

  const projected: Coordinate = {
    lat: segA.lat + t * (segB.lat - segA.lat),
    lng: segA.lng + t * (segB.lng - segA.lng),
  };

  return haversineDistance(point, projected);
}

export function findNearestSegmentIndex(
  point: Coordinate,
  polyline: Coordinate[]
): number {
  let minDist = Infinity;
  let minIndex = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const dist = pointToSegmentDistance(point, polyline[i], polyline[i + 1]);
    if (dist < minDist) {
      minDist = dist;
      minIndex = i;
    }
  }

  return minIndex;
}

export function interpolateAlongPolyline(
  polyline: Coordinate[],
  fraction: number
): Coordinate {
  if (polyline.length === 0) return { lat: 0, lng: 0 };
  if (fraction <= 0) return polyline[0];
  if (fraction >= 1) return polyline[polyline.length - 1];

  let totalDist = 0;
  const segmentDists: number[] = [];
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = haversineDistance(polyline[i], polyline[i + 1]);
    segmentDists.push(d);
    totalDist += d;
  }

  const targetDist = fraction * totalDist;
  let accumulated = 0;

  for (let i = 0; i < segmentDists.length; i++) {
    if (accumulated + segmentDists[i] >= targetDist) {
      const segFraction =
        segmentDists[i] === 0
          ? 0
          : (targetDist - accumulated) / segmentDists[i];
      return {
        lat:
          polyline[i].lat +
          segFraction * (polyline[i + 1].lat - polyline[i].lat),
        lng:
          polyline[i].lng +
          segFraction * (polyline[i + 1].lng - polyline[i].lng),
      };
    }
    accumulated += segmentDists[i];
  }

  return polyline[polyline.length - 1];
}
