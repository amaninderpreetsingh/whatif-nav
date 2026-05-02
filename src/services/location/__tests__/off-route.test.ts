import { OffRouteDetector } from "../off-route";

describe("OffRouteDetector", () => {
  it("starts in ON_ROUTE state", () => {
    const detector = new OffRouteDetector();
    expect(detector.getState()).toBe("ON_ROUTE");
  });

  it("stays ON_ROUTE for distance under threshold", () => {
    const detector = new OffRouteDetector();
    detector.update(30, Date.now());
    expect(detector.getState()).toBe("ON_ROUTE");
  });

  it("does not trigger OFF_ROUTE for brief deviation", () => {
    const detector = new OffRouteDetector();
    const now = Date.now();
    detector.update(60, now);
    detector.update(60, now + 5000);
    expect(detector.getState()).toBe("ON_ROUTE");
  });

  it("triggers OFF_ROUTE after sustained deviation", () => {
    const detector = new OffRouteDetector();
    const now = Date.now();
    detector.update(60, now);
    detector.update(70, now + 5000);
    detector.update(80, now + 11000);
    expect(detector.getState()).toBe("OFF_ROUTE");
  });

  it("returns to ON_ROUTE when distance drops", () => {
    const detector = new OffRouteDetector();
    const now = Date.now();
    detector.update(60, now);
    detector.update(70, now + 11000);
    expect(detector.getState()).toBe("OFF_ROUTE");
    detector.update(20, now + 15000);
    expect(detector.getState()).toBe("ON_ROUTE");
  });

  it("reset clears state", () => {
    const detector = new OffRouteDetector();
    const now = Date.now();
    detector.update(60, now);
    detector.update(70, now + 11000);
    expect(detector.getState()).toBe("OFF_ROUTE");
    detector.reset();
    expect(detector.getState()).toBe("ON_ROUTE");
  });
});
