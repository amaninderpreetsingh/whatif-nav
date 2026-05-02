import { searchAddresses } from "../mapbox-geocoding";

const originalFetch = global.fetch;

beforeEach(() => {
  process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN = "pk.test";
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("searchAddresses", () => {
  it("returns empty array for short queries", async () => {
    const result = await searchAddresses("");
    expect(result).toEqual([]);
  });

  it("calls Mapbox geocoding API with correct params", async () => {
    const mockFetch = jest.fn((..._args: any[]) =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            features: [
              {
                id: "place.1",
                text: "Times Square",
                place_name: "Times Square, New York, NY, USA",
                center: [-73.985, 40.758],
                context: [{ text: "New York" }],
              },
            ],
          }),
      })
    );
    global.fetch = mockFetch as any;

    const results = await searchAddresses("times square");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("mapbox.com/geocoding");
    expect(calledUrl).toContain("times%20square");
    expect(calledUrl).toContain("autocomplete=true");
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe("Times Square");
    expect(results[0].coordinate).toEqual({ lat: 40.758, lng: -73.985 });
  });

  it("includes proximity bias when provided", async () => {
    const mockFetch = jest.fn((..._args: any[]) =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ features: [] }),
      })
    );
    global.fetch = mockFetch as any;

    await searchAddresses("coffee", { proximity: { lat: 40.7, lng: -74 } });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("proximity=-74%2C40.7");
  });

  it("throws when API responds with error", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500 })
    ) as any;

    await expect(searchAddresses("query")).rejects.toThrow("Geocoding failed");
  });
});
