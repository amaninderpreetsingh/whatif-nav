import type { Coordinate } from "../routing/types";

export interface GeocodingResult {
  id: string;
  placeName: string;        // "Times Square, New York, NY, United States"
  text: string;             // "Times Square"
  context: string;          // "New York, NY, United States"
  coordinate: Coordinate;
}
