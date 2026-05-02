import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAuth } from "./middleware/auth";
import { checkRateLimit } from "./middleware/rate-limit";
import { incrementUsage } from "./middleware/usage-tracker";

interface Coordinate {
  lat: number;
  lng: number;
}

interface RouteRequest {
  origin: Coordinate;
  destination: Coordinate;
  waypoints?: Coordinate[];
  provider: "google" | "mapbox";
}

export const calculateRoute = onCall(async (request) => {
  const userId = requireAuth(request);
  checkRateLimit(userId);

  const { origin, destination, waypoints, provider } =
    request.data as RouteRequest;

  if (!origin || !destination) {
    throw new HttpsError(
      "invalid-argument",
      "Origin and destination are required."
    );
  }

  await incrementUsage(userId);

  if (provider === "google") {
    return await callGoogleRoutes(origin, destination, waypoints);
  } else {
    return await callMapboxDirections(origin, destination, waypoints);
  }
});

async function callGoogleRoutes(
  origin: Coordinate,
  destination: Coordinate,
  waypoints?: Coordinate[]
) {
  const apiKey = process.env.GOOGLE_ROUTES_API_KEY;
  if (!apiKey) throw new HttpsError("internal", "Google API key not configured");

  const body: any = {
    origin: {
      location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
    },
    destination: {
      location: {
        latLng: { latitude: destination.lat, longitude: destination.lng },
      },
    },
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    computeAlternativeRoutes: false,
    languageCode: "en-US",
  };

  if (waypoints && waypoints.length > 0) {
    body.intermediates = waypoints.map((wp) => ({
      location: { latLng: { latitude: wp.lat, longitude: wp.lng } },
    }));
  }

  const response = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs,routes.travelAdvisory",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new HttpsError("internal", `Google Routes API error: ${err}`);
  }

  const data = await response.json();
  const route = data.routes?.[0];

  if (!route) {
    throw new HttpsError("not-found", "No route found");
  }

  return {
    provider: "google",
    encodedPolyline: route.polyline?.encodedPolyline || "",
    duration: parseInt(route.duration?.replace("s", "") || "0", 10),
    distance: route.distanceMeters || 0,
    legs: (route.legs || []).map((leg: any) => ({
      duration: parseInt(leg.duration?.replace("s", "") || "0", 10),
      distance: leg.distanceMeters || 0,
      startLat: leg.startLocation?.latLng?.latitude || 0,
      startLng: leg.startLocation?.latLng?.longitude || 0,
      endLat: leg.endLocation?.latLng?.latitude || 0,
      endLng: leg.endLocation?.latLng?.longitude || 0,
      encodedPolyline: leg.polyline?.encodedPolyline || "",
    })),
    trafficLevel: categorizeTraffic(route),
  };
}

async function callMapboxDirections(
  origin: Coordinate,
  destination: Coordinate,
  waypoints?: Coordinate[]
) {
  const token = process.env.MAPBOX_SECRET_TOKEN;
  if (!token) throw new HttpsError("internal", "Mapbox token not configured");

  const allPoints = [origin, ...(waypoints || []), destination];
  const coordString = allPoints
    .map((p) => `${p.lng},${p.lat}`)
    .join(";");

  const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordString}?access_token=${token}&geometries=geojson&overview=full&steps=false`;

  const response = await fetch(url);

  if (!response.ok) {
    const err = await response.text();
    throw new HttpsError("internal", `Mapbox Directions error: ${err}`);
  }

  const data = await response.json();
  const route = data.routes?.[0];

  if (!route) {
    throw new HttpsError("not-found", "No route found");
  }

  const coords = route.geometry?.coordinates || [];

  return {
    provider: "mapbox",
    coordinates: coords.map(([lng, lat]: [number, number]) => ({ lat, lng })),
    duration: Math.round(route.duration || 0),
    distance: Math.round(route.distance || 0),
    legs: (route.legs || []).map((leg: any) => ({
      duration: Math.round(leg.duration || 0),
      distance: Math.round(leg.distance || 0),
      startLat: coords[0]?.[1] || 0,
      startLng: coords[0]?.[0] || 0,
      endLat: coords[coords.length - 1]?.[1] || 0,
      endLng: coords[coords.length - 1]?.[0] || 0,
      coordinates: (leg.steps || []).flatMap((step: any) =>
        (step.geometry?.coordinates || []).map(
          ([lng, lat]: [number, number]) => ({ lat, lng })
        )
      ),
    })),
    trafficLevel: route.duration && route.duration_typical
      ? categorizeDurationRatio(route.duration / route.duration_typical)
      : "moderate",
  };
}

function categorizeTraffic(route: any): "low" | "moderate" | "heavy" {
  // Google doesn't give a single traffic level — infer from travel advisory
  const delay = route.travelAdvisory?.speedReadingIntervals?.filter(
    (s: any) => s.speed === "SLOW" || s.speed === "TRAFFIC_JAM"
  );
  if (!delay || delay.length === 0) return "low";
  if (delay.length > 3) return "heavy";
  return "moderate";
}

function categorizeDurationRatio(ratio: number): "low" | "moderate" | "heavy" {
  if (ratio < 1.1) return "low";
  if (ratio < 1.3) return "moderate";
  return "heavy";
}
