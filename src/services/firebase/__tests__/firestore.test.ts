import {
  createUserProfile,
  getUserProfile,
  updateRoutingProvider,
  saveRoute,
  getSavedRoutes,
  deleteSavedRoute,
  updateLastUsedAt,
  saveTripToHistory,
  getTripHistory,
} from "../firestore";

const mockSetDoc = jest.fn(() => Promise.resolve());
const mockGetDoc = jest.fn(() =>
  Promise.resolve({
    exists: () => true,
    data: () => ({
      email: "test@test.com",
      displayName: "Test User",
      createdAt: Date.now(),
      routingProvider: "google",
      apiUsage: { month: "2026-05", routeRequests: 0 },
    }),
  })
);
const mockUpdateDoc = jest.fn(() => Promise.resolve());
const mockAddDoc = jest.fn(() => Promise.resolve({ id: "route-123" }));
const mockDeleteDoc = jest.fn(() => Promise.resolve());
const mockGetDocs = jest.fn(() =>
  Promise.resolve({
    docs: [
      {
        id: "route-1",
        data: () => ({
          userId: "uid-1",
          name: "Home to Work",
          origin: { lat: 40.7, lng: -74.0, address: "Home" },
          destination: { lat: 40.8, lng: -73.9, address: "Work" },
          waypoints: [],
          estimatedTime: 30,
          distance: 15000,
          createdAt: Date.now(),
          lastUsedAt: Date.now(),
        }),
      },
    ],
  })
);

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  collection: jest.fn(),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  addDoc: (...args: any[]) => mockAddDoc(...args),
  deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(() => "SERVER_TIMESTAMP"),
}));

jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
}));

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
}));

jest.mock("firebase/functions", () => ({
  getFunctions: jest.fn(),
}));

jest.mock("../config", () => ({
  db: {},
}));

describe("firestore service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("createUserProfile calls setDoc", async () => {
    await createUserProfile("uid-1", "test@test.com", "Test User");
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
  });

  it("getUserProfile returns user data", async () => {
    const profile = await getUserProfile("uid-1");
    expect(profile).not.toBeNull();
    expect(profile?.email).toBe("test@test.com");
    expect(profile?.routingProvider).toBe("google");
  });

  it("updateRoutingProvider calls updateDoc", async () => {
    await updateRoutingProvider("uid-1", "mapbox");
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
  });

  it("saveRoute calls addDoc and returns route id", async () => {
    const id = await saveRoute({
      userId: "uid-1",
      name: "Test Route",
      origin: { lat: 40.7, lng: -74.0, address: "A" },
      destination: { lat: 40.8, lng: -73.9, address: "B" },
      waypoints: [],
      estimatedTime: 25,
      distance: 12000,
    });
    expect(id).toBe("route-123");
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
  });

  it("getSavedRoutes returns array", async () => {
    const routes = await getSavedRoutes("uid-1");
    expect(routes).toHaveLength(1);
    expect(routes[0].name).toBe("Home to Work");
  });

  it("deleteSavedRoute calls deleteDoc", async () => {
    await deleteSavedRoute("route-1");
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });

  it("saveTripToHistory calls addDoc with routeKey", async () => {
    const id = await saveTripToHistory({
      userId: "uid-1",
      origin: { lat: 40.7128, lng: -74.006, address: "Origin" },
      destination: { lat: 40.7484, lng: -73.9857, address: "Dest" },
      startedAt: 1000,
      endedAt: 2200,
      duration: 1200,
      distance: 5000,
      estimatedDuration: 1100,
      waypoints: [],
      arrivedAtDestination: true,
    });
    expect(id).toBe("route-123");
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const calls = mockAddDoc.mock.calls as any[];
    const writtenDoc = calls[0][1];
    expect(writtenDoc).toHaveProperty("routeKey");
    expect(writtenDoc.routeKey).toBe("40.713,-74.006|40.748,-73.986");
    expect(writtenDoc.userId).toBe("uid-1");
    expect(writtenDoc.arrivedAtDestination).toBe(true);
  });

  it("getTripHistory groups trips by routeKey and computes stats", async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        {
          id: "trip-1",
          data: () => ({
            userId: "uid-1",
            routeKey: "A",
            origin: { lat: 40.7, lng: -74.0, address: "Home" },
            destination: { lat: 40.8, lng: -73.9, address: "Work" },
            startedAt: 1000,
            endedAt: 2000,
            duration: 1000,
            distance: 5000,
            estimatedDuration: 900,
            waypoints: [],
            arrivedAtDestination: true,
          }),
        },
        {
          id: "trip-2",
          data: () => ({
            userId: "uid-1",
            routeKey: "A",
            origin: { lat: 40.7, lng: -74.0, address: "Home" },
            destination: { lat: 40.8, lng: -73.9, address: "Work" },
            startedAt: 3000,
            endedAt: 4500,
            duration: 1500,
            distance: 5000,
            estimatedDuration: 900,
            waypoints: [],
            arrivedAtDestination: true,
          }),
        },
        {
          id: "trip-3",
          data: () => ({
            userId: "uid-1",
            routeKey: "B",
            origin: { lat: 41.0, lng: -73.0, address: "Foo" },
            destination: { lat: 41.5, lng: -72.5, address: "Bar" },
            startedAt: 5000,
            endedAt: 6000,
            duration: 1000,
            distance: 8000,
            estimatedDuration: 1100,
            waypoints: [],
            arrivedAtDestination: false,
          }),
        },
      ],
    } as any);

    const groups = await getTripHistory("uid-1");
    expect(groups).toHaveLength(2);

    const groupA = groups.find((g) => g.routeKey === "A")!;
    expect(groupA.totalTrips).toBe(2);
    expect(groupA.fastestDuration).toBe(1000);
    expect(groupA.slowestDuration).toBe(1500);
    expect(groupA.averageDuration).toBe(1250);
    expect(groupA.lastTripAt).toBe(4500);
    expect(groupA.originAddress).toBe("Home");
    expect(groupA.destinationAddress).toBe("Work");

    const groupB = groups.find((g) => g.routeKey === "B")!;
    expect(groupB.totalTrips).toBe(1);

    // Sorted by lastTripAt desc — group B (6000) should be first
    expect(groups[0].routeKey).toBe("B");
  });
});
