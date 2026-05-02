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
