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

export async function saveTripToHistory(trip: {
  userId: string;
  origin: { lat: number; lng: number; address: string };
  destination: { lat: number; lng: number; address: string };
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
  const docRef = await addDoc(tripsRef, { ...trip, routeKey });
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

  // Group by routeKey
  const groups = new Map<string, TripHistoryEntry[]>();
  for (const trip of trips) {
    const list = groups.get(trip.routeKey) || [];
    list.push(trip);
    groups.set(trip.routeKey, list);
  }

  return Array.from(groups.entries())
    .map(([routeKey, groupTrips]): TripHistoryGroup => {
      const durations = groupTrips.map((t) => t.duration);
      return {
        routeKey,
        originAddress: groupTrips[0].origin.address,
        destinationAddress: groupTrips[0].destination.address,
        origin: {
          lat: groupTrips[0].origin.lat,
          lng: groupTrips[0].origin.lng,
        },
        destination: {
          lat: groupTrips[0].destination.lat,
          lng: groupTrips[0].destination.lng,
        },
        trips: groupTrips,
        averageDuration:
          durations.reduce((a, b) => a + b, 0) / durations.length,
        fastestDuration: Math.min(...durations),
        slowestDuration: Math.max(...durations),
        tripCount: groupTrips.length,
        lastTripAt: Math.max(...groupTrips.map((t) => t.endedAt)),
      };
    })
    .sort((a, b) => b.lastTripAt - a.lastTripAt);
}
