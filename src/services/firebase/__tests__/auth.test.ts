import {
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getCurrentUser,
} from "../auth";

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
  signInWithEmailAndPassword: jest.fn(() =>
    Promise.resolve({ user: { uid: "test-uid", email: "test@test.com" } })
  ),
  createUserWithEmailAndPassword: jest.fn(() =>
    Promise.resolve({ user: { uid: "new-uid", email: "new@test.com" } })
  ),
  signOut: jest.fn(() => Promise.resolve()),
  onAuthStateChanged: jest.fn(),
}));

jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(),
}));

jest.mock("firebase/functions", () => ({
  getFunctions: jest.fn(),
}));

jest.mock("../config", () => ({
  auth: { currentUser: null },
}));

describe("auth service", () => {
  it("signInWithEmail calls Firebase signInWithEmailAndPassword", async () => {
    const result = await signInWithEmail("test@test.com", "password123");
    expect(result.user.uid).toBe("test-uid");
  });

  it("signUpWithEmail calls Firebase createUserWithEmailAndPassword", async () => {
    const result = await signUpWithEmail("new@test.com", "password123");
    expect(result.user.uid).toBe("new-uid");
  });

  it("signOut calls Firebase signOut", async () => {
    await expect(signOut()).resolves.not.toThrow();
  });

  it("getCurrentUser returns null when not signed in", () => {
    const user = getCurrentUser();
    expect(user).toBeNull();
  });
});
