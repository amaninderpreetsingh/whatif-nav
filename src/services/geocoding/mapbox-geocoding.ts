import type { GeocodingResult } from "./types";

const ENDPOINT = "https://api.mapbox.com/geocoding/v5/mapbox.places";

export async function searchAddresses(
  query: string,
  options?: { proximity?: { lat: number; lng: number }; limit?: number }
): Promise<GeocodingResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const token = process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN;
  if (!token) throw new Error("Mapbox token not configured");

  const params = new URLSearchParams({
    access_token: token,
    autocomplete: "true",
    limit: String(options?.limit ?? 6),
    language: "en",
    types: "address,place,locality,neighborhood,poi",
  });

  if (options?.proximity) {
    params.set("proximity", `${options.proximity.lng},${options.proximity.lat}`);
  }

  const url = `${ENDPOINT}/${encodeURIComponent(trimmed)}.json?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.status}`);
  }

  const data = await response.json();

  return (data.features || []).map((f: any): GeocodingResult => {
    const [lng, lat] = f.center || [0, 0];
    const text = f.text || f.place_name || "";
    const placeName = f.place_name || text;
    const context = placeName.startsWith(text + ",")
      ? placeName.slice(text.length + 2).trim()
      : (f.context || []).map((c: any) => c.text).join(", ");

    return {
      id: f.id || `${lat},${lng}`,
      placeName,
      text,
      context,
      coordinate: { lat, lng },
    };
  });
}
