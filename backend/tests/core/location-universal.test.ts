import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/db", () => ({ prisma: {} }));

import { parseDeviceOrigin } from "@/server/search";
import { geocodeAddress, geocodePlace } from "@/server/geocode";

describe("parseDeviceOrigin", () => {
  it("treats missing or blank coordinates as not shared, never 0,0", () => {
    expect(parseDeviceOrigin(null, null)).toBeNull();
    expect(parseDeviceOrigin(undefined, undefined)).toBeNull();
    expect(parseDeviceOrigin("", "")).toBeNull();
    expect(parseDeviceOrigin("  ", "3.3")).toBeNull();
  });
  it("rounds real coordinates to about 100 m and rejects out-of-range ones", () => {
    expect(parseDeviceOrigin("9.07654", "7.49831")).toEqual({ lat: 9.077, lng: 7.498 });
    expect(parseDeviceOrigin("0", "0")).toEqual({ lat: 0, lng: 0 });
    expect(parseDeviceOrigin("91", "0")).toBeNull();
    expect(parseDeviceOrigin("abc", "1")).toBeNull();
  });
});

const ok = (rows: unknown) => vi.fn(async () => new Response(JSON.stringify(rows), { status: 200 }));

describe("geocodePlace", () => {
  it("uses the built-in list first without any network call", async () => {
    const fetchImpl = ok([]);
    expect((await geocodePlace("Ikeja", { fetchImpl }))?.name).toBe("Ikeja");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("geocodes a place anywhere and sends only the place text", async () => {
    const fetchImpl = ok([{ lat: "5.556", lon: "-0.1969", name: "Osu", addresstype: "suburb" }]);
    const p = await geocodePlace("Osu, Accra-test-1", { fetchImpl });
    expect(p).toEqual({ name: "Osu", kind: "area", lat: 5.556, lng: -0.1969 });
    const url = String((fetchImpl.mock.calls[0] as unknown[])[0]);
    expect(url).toContain("q=Osu%2C%20Accra-test-1");
  });
  it("returns null (never guesses) when nothing is found, on errors, or when disabled", async () => {
    expect(await geocodePlace("Nowhere-test-2", { fetchImpl: ok([]) })).toBeNull();
    expect(await geocodePlace("Err-test-3", { fetchImpl: vi.fn(async () => new Response("", { status: 503 })) })).toBeNull();
    expect(await geocodePlace("Throw-test-4", { fetchImpl: vi.fn(async () => { throw new Error("offline"); }) })).toBeNull();
    const fetchImpl = ok([{ lat: "1", lon: "1" }]);
    expect(await geocodePlace("Off-test-5", { fetchImpl, env: { GEOCODER: "off" } })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("geocodeAddress", () => {
  it("drops leading street parts until the place is found", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) =>
      String(url).includes("q=Wuse%202%2C%20Abuja-test-6")
        ? new Response(JSON.stringify([{ lat: "9.07", lon: "7.47", name: "Wuse 2" }]), { status: 200 })
        : new Response("[]", { status: 200 }),
    );
    const p = await geocodeAddress("12 Aminu Kano Crescent, Wuse 2, Abuja-test-6", { fetchImpl, pauseMs: 0 });
    expect(p?.name).toBe("Wuse 2");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("bare place names (offline fallback)", () => {
  it("accepts short place-like text and rejects chat or sentences", async () => {
    const { isBarePlaceName } = await import("@/server/search");
    for (const q of ["new york", "Port Harcourt", "Accra", "São Paulo"]) expect(isBarePlaceName(q)).toBe(true);
    for (const q of ["hi", "hello", "what is malaria?", "I feel tired all the time", "12345", "book"]) expect(isBarePlaceName(q)).toBe(false);
  });
  it("settlementsOnly ignores results that are not towns, cities or regions", async () => {
    const shop = vi.fn(async () => new Response(JSON.stringify([{ lat: "1", lon: "1", name: "Hello Shop", addresstype: "shop" }]), { status: 200 }));
    expect(await geocodePlace("Hello Shop-test-7", { fetchImpl: shop, settlementsOnly: true })).toBeNull();
    const city = vi.fn(async () => new Response(JSON.stringify([{ lat: "40.71", lon: "-74.0", name: "New York", addresstype: "city" }]), { status: 200 }));
    expect((await geocodePlace("New York-test-8", { fetchImpl: city, settlementsOnly: true }))?.name).toBe("New York");
  });
});
