import { useConnectionStore } from "../connection-store";

describe("connection store", () => {
  beforeEach(() => { useConnectionStore.getState().reset(); });

  it("starts online", () => {
    expect(useConnectionStore.getState().status).toBe("online");
  });

  it("transitions to degraded", () => {
    useConnectionStore.getState().setStatus("degraded");
    expect(useConnectionStore.getState().status).toBe("degraded");
  });

  it("transitions to offline", () => {
    useConnectionStore.getState().setStatus("offline");
    expect(useConnectionStore.getState().status).toBe("offline");
  });

  it("isWhatIfEnabled returns true only when online", () => {
    expect(useConnectionStore.getState().isWhatIfEnabled()).toBe(true);
    useConnectionStore.getState().setStatus("degraded");
    expect(useConnectionStore.getState().isWhatIfEnabled()).toBe(false);
    useConnectionStore.getState().setStatus("offline");
    expect(useConnectionStore.getState().isWhatIfEnabled()).toBe(false);
  });
});
