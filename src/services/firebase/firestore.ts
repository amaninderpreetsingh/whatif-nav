import {
  doc,
  collection,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "./config";
import type {
  UserProfile,
  RoutingProvider,
  SavedRoute,
  TripHistoryEntry,
  TripHistoryGroup,
  TripHistoryVariant,
} from "../routing/types";

export async function createUserProfile(
  userId: string,
  email: string,
  displayName: string
): Promise<void> {
  const userRef = doc(db, "users", userId);
  const profile: UserProfile = {
    email,
    displayName,
    createdAt: Date.now(),
    routingProvider: "google",
    apiUsage: {
      month: new Date().toISOString().slice(0, 7),
      routeRequests: 0,
    },
  };
  await setDoc(userRef, profile);
}

export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function updateRoutingProvider(
  userId: string,
  provider: RoutingProvider
): Promise<void> {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, { routingProvider: provider });
}

export async function saveRoute(route: {
  userId: string;
  name: string;
  origin: { lat: number; lng: number; address: string };
  destination: { lat: number; lng: number; address: string };
  waypoints: { lat: number; lng: number; label: string }[];
  estimatedTime: number;
  distance: number;
}): Promise<string> {
  const routesRef = collection(db, "savedRoutes");
  const now = Date.now();
  const docRef = await addDoc(routesRef, {
    ...route,
    createdAt: now,
    lastUsedAt: now,
  });
  return docRef.id;
}

export async function getSavedRoutes(userId: string): Promise<SavedRoute[]> {
  const routesRef = collection(db, "savedRoutes");
  const q = query(
    routesRef,
    where("userId", "==", userId),
    orderBy("lastUsedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SavedRoute));
}

export async function deleteSavedRoute(routeId: string): Promise<void> {
  await deleteDoc(doc(db, "savedRoutes", routeId));
}

export async function updateLastUsedAt(routeId: string): Promise<void> {
  await updateDoc(doc(db, "savedRoutes", routeId), {
    lastUsedAt: Date.now(),
  });
}

function computeRouteKey(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): string {
  const round = (n: number) => n.toFixed(3); // ~110m precision
  return `${round(origin.lat)},${round(origin.lng)}|${round(destination.lat)},${round(destination.lng)}`;
}

/**
 * Hashes the route variant by sampling 8 evenly-spaced points along the polyline
 * and rounding each to ~110m precision. Two trips on the same physical roads
 * produce the same key; trips on different roads (highway vs backstreets) differ.
 */
function computeVariantKey(
  coordinates: { lat: number; lng: number }[]
): string {
  if (!coordinates || coordinates.length === 0) return "empty";
  const SAMPLE_COUNT = 8;
  const samples: string[] = [];
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const fraction = SAMPLE_COUNT === 1 ? 0 : i / (SAMPLE_COUNT - 1);
    const idx = Math.round(fraction * (coordinates.length - 1));
    const c = coordinates[idx];
    samples.push(`${c.lat.toFixed(3)},${c.lng.toFixed(3)}`);
  }
  return samples.join("|");
}

export async function saveTripToHistory(trip: {
  userId: string;
  origin: { lat: number; lng: number; address: string };
  destination: { lat: number; lng: number; address: string };
  routeCoordinates: { lat: number; lng: number }[];
  startedAt: number;
  endedAt: number;
  duration: number;
  distance: number;
  estimatedDuration: number;
  waypoints: { lat: number; lng: number; label: string }[];
  arrivedAtDestination: boolean;
}): Promise<string> {
  const tripsRef = collection(db, "tripHistory");
  const routeKey = computeRouteKey(trip.origin, trip.destination);
  const variantKey = computeVariantKey(trip.routeCoordinates);
  // Don't persist the full polyline -- just the keys we need for grouping
  const { routeCoordinates: _, ...rest } = trip;
  const docRef = await addDoc(tripsRef, { ...rest, routeKey, variantKey });
  return docRef.id;
}

export async function getTripHistory(
  userId: string
): Promise<TripHistoryGroup[]> {
  const tripsRef = collection(db, "tripHistory");
  const q = query(
    tripsRef,
    where("userId", "==", userId),
    orderBy("endedAt", "desc")
  );
  const snap = await getDocs(q);
  const trips: TripHistoryEntry[] = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as TripHistoryEntry
  );

  // First level: group by routeKey (origin+destination)
  const byRoute = new Map<string, TripHistoryEntry[]>();
  for (const trip of trips) {
    const list = byRoute.get(trip.routeKey) || [];
    list.push(trip);
    byRoute.set(trip.routeKey, list);
  }

  return Array.from(byRoute.entries())
    .map(([routeKey, routeTrips]): TripHistoryGroup => {
      // Second level: group by variantKey (route taken)
      const byVariant = new Map<string, TripHistoryEntry[]>();
      for (const trip of routeTrips) {
        const key = trip.variantKey || "legacy";
        const list = byVariant.get(key) || [];
        list.push(trip);
        byVariant.set(key, list);
      }

      const variants = Array.from(byVariant.entries())
        .map(([variantKey, variantTrips]): TripHistoryVariant => {
          const durations = variantTrips.map((t) => t.duration);
          const distances = variantTrips.map((t) => t.distance);
          return {
            variantKey,
            trips: variantTrips,
            averageDuration:
              durations.reduce((a, b) => a + b, 0) / durations.length,
            fastestDuration: Math.min(...durations),
            slowestDuration: Math.max(...durations),
            averageDistance:
              distances.reduce((a, b) => a + b, 0) / distances.length,
            tripCount: variantTrips.length,
            lastTripAt: Math.max(...variantTrips.map((t) => t.endedAt)),
          };
        })
        .sort((a, b) => b.lastTripAt - a.lastTripAt);

      const allDurations = routeTrips.map((t) => t.duration);
      return {
        routeKey,
        originAddress: routeTrips[0].origin.address,
        destinationAddress: routeTrips[0].destination.address,
        origin: {
          lat: routeTrips[0].origin.lat,
          lng: routeTrips[0].origin.lng,
        },
        destination: {
          lat: routeTrips[0].destination.lat,
          lng: routeTrips[0].destination.lng,
        },
        variants,
        totalTrips: routeTrips.length,
        averageDuration:
          allDurations.reduce((a, b) => a + b, 0) / allDurations.length,
        fastestDuration: Math.min(...allDurations),
        slowestDuration: Math.max(...allDurations),
        lastTripAt: Math.max(...routeTrips.map((t) => t.endedAt)),
      };
    })
    .sort((a, b) => b.lastTripAt - a.lastTripAt);
}
