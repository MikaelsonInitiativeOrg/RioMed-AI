import { describe, it, expect } from "vitest";
import { haversineKm, PLACES, resolveLocation } from "@/core/geo";
import { mulberry32 } from "./_helpers";

const REQUIRED_PLACES = [
  "Ikeja", "GRA Ikeja", "Alausa", "Opebi", "Allen", "Maryland", "Ogba", "Agege", "Oshodi", "Yaba", "Akoka",
  "Ebute Metta", "Surulere", "Mushin", "Ilupeju", "Gbagada", "Ketu", "Ojota", "Magodo", "Lekki", "Ajah",
  "Victoria Island", "Ikoyi", "Lagos Island", "Obalende", "Festac", "Lagos",
];

describe("haversineKm", () => {
  it("is zero for the same point", () => {
    expect(haversineKm({ lat: 6.6, lng: 3.35 }, { lat: 6.6, lng: 3.35 })).toBe(0);
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBe(0);
  });
  it("one degree on the equator is ~111.19 km (R = 6371)", () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(111.19, 2);
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.19, 2);
  });
  it("half the circumference for antipodes", () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })).toBeCloseTo(Math.PI * 6371, 3);
  });
  it("is symmetric, non-negative and satisfies the triangle inequality (seeded)", () => {
    const rng = mulberry32(31);
    const p = () => ({ lat: rng() * 180 - 90, lng: rng() * 360 - 180 });
    for (let i = 0; i < 1000; i++) {
      const a = p(), b = p(), c = p();
      const ab = haversineKm(a, b);
      expect(ab).toBeGreaterThanOrEqual(0);
      expect(ab).toBeCloseTo(haversineKm(b, a), 9);
      expect(ab).toBeLessThanOrEqual(haversineKm(a, c) + haversineKm(c, b) + 1e-6);
      expect(ab).toBeLessThanOrEqual(Math.PI * 6371 + 1e-6);
    }
  });
});

describe("PLACES", () => {
  it("contains every required place", () => {
    const names = PLACES.map((p) => p.name);
    for (const n of REQUIRED_PLACES) expect(names).toContain(n);
  });
  it("Lagos is kind state", () => {
    expect(PLACES.find((p) => p.name === "Lagos")?.kind).toBe("state");
  });
  it("all coordinates lie in the Lagos bounding box", () => {
    for (const p of PLACES) {
      expect(p.lat, p.name).toBeGreaterThanOrEqual(6.3);
      expect(p.lat, p.name).toBeLessThanOrEqual(6.8);
      expect(p.lng, p.name).toBeGreaterThanOrEqual(3.0);
      expect(p.lng, p.name).toBeLessThanOrEqual(3.8);
      expect(["area", "lga", "state"]).toContain(p.kind);
    }
  });
  it("has unique names (case-insensitive)", () => {
    const names = PLACES.map((p) => p.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("resolveLocation", () => {
  const cases: [string, string][] = [
    ["Ikeja", "Ikeja"],
    ["ikeja", "Ikeja"],
    ["MALARIA TEST IN IKEJA", "Ikeja"],
    ["gra ikeja", "GRA Ikeja"],
    ["fbc at GRA Ikeja tomorrow", "GRA Ikeja"],
    ["ikeja gra", "GRA Ikeja"],
    ["clinic near Ikeja GRA", "GRA Ikeja"],
    ["vi", "Victoria Island"],
    ["scan in VI tomorrow", "Victoria Island"],
    ["victoria island", "Victoria Island"],
    ["ebute metta", "Ebute Metta"],
    ["lekki phase 1", "Lekki"],
    ["Yaba, Lagos", "Yaba"],
    ["Lagos Yaba", "Yaba"],
    ["surulere lagos state", "Surulere"],
    ["somewhere in Lagos", "Lagos"],
    ["Lagos Island", "Lagos Island"],
    ["hospital on lagos island please", "Lagos Island"],
    ["festac", "Festac"],
    ["allen", "Allen"],
    ["  yaba  ", "Yaba"],
  ];
  for (const [q, name] of cases) {
    it(`${JSON.stringify(q)} -> ${name}`, () => {
      const r = resolveLocation(q);
      expect(r).not.toBeNull();
      expect(r!.name).toBe(name);
    });
  }

  it("state-level Lagos is kind state and only chosen as a last resort", () => {
    expect(resolveLocation("somewhere in Lagos")?.kind).toBe("state");
    expect(resolveLocation("Lagos Island")?.kind).not.toBe("state");
    expect(resolveLocation("Lagos, Ikoyi")?.name).toBe("Ikoyi");
  });

  it("returns a place with coordinates", () => {
    const r = resolveLocation("yaba")!;
    expect(typeof r.lat).toBe("number");
    expect(typeof r.lng).toBe("number");
  });

  it("returns null for empty, null or unknown input (never guesses)", () => {
    for (const q of [null, undefined, "", "   ", "Abuja", "Timbuktu", "near me", "ikey", "yabba"]) {
      expect(resolveLocation(q), String(q)).toBeNull();
    }
  });

  it("matches whole words only", () => {
    for (const q of ["Yabaville", "ikejaa", "Allentown", "lagosian", "victorian island", "vip lounge", "visit"]) {
      expect(resolveLocation(q), q).toBeNull();
    }
  });

  it("never throws on odd input", () => {
    for (const q of ["(((", "[", "\\", "*", "😷", "\u0000", "a".repeat(10_000), "ikeja".repeat(1000)]) {
      expect(() => resolveLocation(q)).not.toThrow();
    }
  });
});
