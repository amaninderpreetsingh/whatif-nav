import * as Crypto from "expo-crypto";
import type { GeocodingResult } from "./types";

const AUTOCOMPLETE_ENDPOINT =
  "https://maps.googleapis.com/maps/api/place/autocomplete/json";
const DETAILS_ENDPOINT =
  "https://maps.googleapis.com/maps/api/place/details/json";

let currentSessionToken: string | null = null;

function getSessionToken(): string {
  if (!currentSessionToken) {
    currentSessionToken = Crypto.randomUUID();
  }
  return currentSessionToken;
}

function endSession(): void {
  currentSessionToken = null;
}

interface AutocompletePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
}

/**
 * Returns Place Autocomplete predictions for the user's query.
 * Coordinates are NOT included — call fetchPlaceDetails(id) once the user picks one.
 */
export async function searchAddresses(
  query: string,
  options?: { proximity?: { lat: number; lng: number }; limit?: number }
): Promise<GeocodingResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_ROUTES_FALLBACK_KEY;
  if (!apiKey) {
    throw new Error("Google Places API key not configured");
  }

  const params = new URLSearchParams({
    input: trimmed,
    key: apiKey,
    sessiontoken: getSessionToken(),
    types: "geocode",
  });

  if (options?.proximity) {
    params.set(
      "location",
      `${options.proximity.lat},${options.proximity.lng}`
    );
    params.set("radius", "50000");
  }

  const response = await fetch(`${AUTOCOMPLETE_ENDPOINT}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Places autocomplete failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.status === "ZERO_RESULTS") return [];
  if (data.status !== "OK") {
    throw new Error(
      `Places API error: ${data.status} ${data.error_message || ""}`
    );
  }

  const predictions: AutocompletePrediction[] = data.predictions || [];

  return predictions
    .slice(0, options?.limit ?? 6)
    .map((p): GeocodingResult => ({
      id: p.place_id,
      placeName: p.description,
      text: p.structured_formatting?.main_text || p.description,
      context: p.structured_formatting?.secondary_text || "",
      coordinate: { lat: 0, lng: 0 }, // populated via fetchPlaceDetails
    }));
}

/**
 * Fetches the full place data including coordinates. Closes the autocomplete
 * session token afterwards so the next search starts a fresh billable session.
 */
export async function fetchPlaceDetails(
  placeId: string
): Promise<GeocodingResult> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_ROUTES_FALLBACK_KEY;
  if (!apiKey) {
    throw new Error("Google Places API key not configured");
  }

  const sessionToken = getSessionToken();
  endSession();

  const params = new URLSearchParams({
    place_id: placeId,
    key: apiKey,
    sessiontoken: sessionToken,
    fields: "geometry/location,name,formatted_address",
  });

  const response = await fetch(`${DETAILS_ENDPOINT}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Place details failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.status !== "OK") {
    throw new Error(
      `Place details error: ${data.status} ${data.error_message || ""}`
    );
  }

  const result = data.result;
  const location = result.geometry?.location;
  if (!location) {
    throw new Error("Place details missing coordinates");
  }

  const placeName: string = result.formatted_address || result.name || "";
  const name: string = result.name || "";
  const context: string = name && placeName.startsWith(name + ",")
    ? placeName.slice(name.length + 2).trim()
    : placeName;

  return {
    id: placeId,
    placeName,
    text: name || placeName,
    context,
    coordinate: { lat: location.lat, lng: location.lng },
  };
}
