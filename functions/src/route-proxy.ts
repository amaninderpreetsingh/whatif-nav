import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { requireAuth } from "./middleware/auth";
import { checkRateLimit } from "./middleware/rate-limit";
import { incrementUsage } from "./middleware/usage-tracker";

const googleRoutesApiKey = defineSecret("GOOGLE_ROUTES_API_KEY");
const mapboxSecretToken = defineSecret("MAPBOX_SECRET_TOKEN");

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

type ManeuverType =
  | "turn"
  | "exit"
  | "merge"
  | "fork"
  | "ramp"
  | "roundabout"
  | "continue"
  | "depart"
  | "arrive"
  | "other";

type ManeuverModifier =
  | "left"
  | "sharp-left"
  | "slight-left"
  | "right"
  | "sharp-right"
  | "slight-right"
  | "straight"
  | "uturn"
  | "none";

export const calculateRoute = onCall(
  { secrets: [googleRoutesApiKey, mapboxSecretToken] },
  async (request) => {
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
}
);

function mapGoogleManeuver(
  m: string | undefined
): { type: ManeuverType; modifier: ManeuverModifier } {
  if (!m) return { type: "other", modifier: "none" };
  const upper = m.toUpperCase();
  // Turn
  if (upper.includes("TURN_SHARP_LEFT")) return { type: "turn", modifier: "sharp-left" };
  if (upper.includes("TURN_SHARP_RIGHT")) return { type: "turn", modifier: "sharp-right" };
  if (upper.includes("TURN_SLIGHT_LEFT")) return { type: "turn", modifier: "slight-left" };
  if (upper.includes("TURN_SLIGHT_RIGHT")) return { type: "turn", modifier: "slight-right" };
  if (upper.includes("TURN_LEFT")) return { type: "turn", modifier: "left" };
  if (upper.includes("TURN_RIGHT")) return { type: "turn", modifier: "right" };
  if (upper.includes("UTURN")) return { type: "turn", modifier: "uturn" };
  // Exits / ramps
  if (upper.includes("OFF_RAMP_LEFT")) return { type: "exit", modifier: "left" };
  if (upper.includes("OFF_RAMP_RIGHT")) return { type: "exit", modifier: "right" };
  if (upper.includes("OFF_RAMP")) return { type: "exit", modifier: "none" };
  if (upper.includes("ON_RAMP_LEFT")) return { type: "ramp", modifier: "left" };
  if (upper.includes("ON_RAMP_RIGHT")) return { type: "ramp", modifier: "right" };
  if (upper.includes("ON_RAMP")) return { type: "ramp", modifier: "none" };
  // Merge / fork
  if (upper.includes("MERGE_LEFT")) return { type: "merge", modifier: "left" };
  if (upper.includes("MERGE_RIGHT")) return { type: "merge", modifier: "right" };
  if (upper.includes("MERGE")) return { type: "merge", modifier: "none" };
  if (upper.includes("FORK_LEFT")) return { type: "fork", modifier: "left" };
  if (upper.includes("FORK_RIGHT")) return { type: "fork", modifier: "right" };
  // Roundabout
  if (upper.includes("ROUNDABOUT")) return { type: "roundabout", modifier: "none" };
  // Default
  if (upper === "STRAIGHT") return { type: "continue", modifier: "straight" };
  if (upper === "DEPART") return { type: "depart", modifier: "none" };
  if (upper === "DESTINATION" || upper === "ARRIVE") return { type: "arrive", modifier: "none" };
  return { type: "other", modifier: "none" };
}

function mapMapboxManeuver(
  type: string | undefined,
  modifier: string | undefined
): { type: ManeuverType; modifier: ManeuverModifier } {
  const t = (type || "").toLowerCase();
  const m = (modifier || "").toLowerCase().replace(" ", "-");

  const modMap: Record<string, ManeuverModifier> = {
    "left": "left",
    "right": "right",
    "sharp-left": "sharp-left",
    "sharp-right": "sharp-right",
    "slight-left": "slight-left",
    "slight-right": "slight-right",
    "straight": "straight",
    "uturn": "uturn",
  };
  const normalizedMod = modMap[m] || "none";

  if (t === "turn") return { type: "turn", modifier: normalizedMod };
  if (t === "off ramp" || t === "off-ramp") return { type: "exit", modifier: normalizedMod };
  if (t === "on ramp" || t === "on-ramp") return { type: "ramp", modifier: normalizedMod };
  if (t === "merge") return { type: "merge", modifier: normalizedMod };
  if (t === "fork") return { type: "fork", modifier: normalizedMod };
  if (t === "roundabout" || t === "rotary") return { type: "roundabout", modifier: "none" };
  if (t === "depart") return { type: "depart", modifier: "none" };
  if (t === "arrive") return { type: "arrive", modifier: "none" };
  if (t === "continue") return { type: "continue", modifier: normalizedMod };
  return { type: "other", modifier: normalizedMod };
}

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
          "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs,routes.legs.steps,routes.travelAdvisory",
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

  let cumulativeDuration = 0;
  let cumulativeDistance = 0;

  const legs = (route.legs || []).map((leg: any) => {
    const stepsRaw = leg.steps || [];
    const steps = stepsRaw.map((step: any, i: number) => {
      const stepDuration = parseInt(
        step.staticDuration?.replace("s", "") ||
          step.duration?.replace("s", "") ||
          "0",
        10
      );
      const stepDistance = step.distanceMeters || 0;
      const lat = step.endLocation?.latLng?.latitude || 0;
      const lng = step.endLocation?.latLng?.longitude || 0;
      const maneuver = mapGoogleManeuver(step.navigationInstruction?.maneuver);
      const instruction = step.navigationInstruction?.instructions || "";

      const result = {
        id: `g-${i}-${lat.toFixed(5)}-${lng.toFixed(5)}`,
        coordinate: { lat, lng },
        maneuverType: maneuver.type,
        modifier: maneuver.modifier,
        instruction,
        durationToHere: cumulativeDuration + stepDuration,
        distanceToHere: cumulativeDistance + stepDistance,
      };
      cumulativeDuration += stepDuration;
      cumulativeDistance += stepDistance;
      return result;
    });

    return {
      duration: parseInt(leg.duration?.replace("s", "") || "0", 10),
      distance: leg.distanceMeters || 0,
      startLat: leg.startLocation?.latLng?.latitude || 0,
      startLng: leg.startLocation?.latLng?.longitude || 0,
      endLat: leg.endLocation?.latLng?.latitude || 0,
      endLng: leg.endLocation?.latLng?.longitude || 0,
      encodedPolyline: leg.polyline?.encodedPolyline || "",
      steps,
    };
  });

  return {
    provider: "google",
    encodedPolyline: route.polyline?.encodedPolyline || "",
    duration: parseInt(route.duration?.replace("s", "") || "0", 10),
    distance: route.distanceMeters || 0,
    legs,
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

  const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordString}?access_token=${token}&geometries=geojson&overview=full&steps=true`;

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

  let cumulativeDuration = 0;
  let cumulativeDistance = 0;

  const legs = (route.legs || []).map((leg: any) => {
    const stepsRaw = leg.steps || [];
    const steps = stepsRaw.map((step: any, i: number) => {
      const [lng, lat] = step.maneuver?.location || [0, 0];
      const stepDuration = Math.round(step.duration || 0);
      const stepDistance = Math.round(step.distance || 0);
      const maneuver = mapMapboxManeuver(
        step.maneuver?.type,
        step.maneuver?.modifier
      );
      const instruction = step.maneuver?.instruction || step.name || "";

      const result = {
        id: `m-${i}-${lat.toFixed(5)}-${lng.toFixed(5)}`,
        coordinate: { lat, lng },
        maneuverType: maneuver.type,
        modifier: maneuver.modifier,
        instruction,
        durationToHere: cumulativeDuration + stepDuration,
        distanceToHere: cumulativeDistance + stepDistance,
      };
      cumulativeDuration += stepDuration;
      cumulativeDistance += stepDistance;
      return result;
    });

    return {
      duration: Math.round(leg.duration || 0),
      distance: Math.round(leg.distance || 0),
      startLat: coords[0]?.[1] || 0,
      startLng: coords[0]?.[0] || 0,
      endLat: coords[coords.length - 1]?.[1] || 0,
      endLng: coords[coords.length - 1]?.[0] || 0,
      coordinates: (leg.steps || []).flatMap((s: any) =>
        (s.geometry?.coordinates || []).map(
          ([lng, lat]: [number, number]) => ({ lat, lng })
        )
      ),
      steps,
    };
  });

  return {
    provider: "mapbox",
    coordinates: coords.map(([lng, lat]: [number, number]) => ({ lat, lng })),
    duration: Math.round(route.duration || 0),
    distance: Math.round(route.distance || 0),
    legs,
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
