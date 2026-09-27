import { describe, it, expect } from "vitest";
import { searchFacilities, RADII_KM, type FacilityCandidate } from "@/core/search";
import { mulberry32, randInt, pick, refHaversineKm, kmToLatDeg } from "./_helpers";

const ORIGIN = { lat: 6.5, lng: 3.35 };

let seq = 0;
function fac(km: number, over: Partial<FacilityCandidate> = {}): FacilityCandidate {
  seq++;
  return {
    id: over.id ?? `f${seq}`,
    name: over.name ?? `Facility ${String(seq).padStart(3, "0")}`,
    lat: ORIGIN.lat + kmToLatDeg(km),
    lng: ORIGIN.lng,
    operational: true,
    isPartner: true,
    offeredTests: ["MALARIA_MP", "FBC"],
    hasSlotInWindow: true,
    ...over,
  };
}

const q = (testCodes: string[] = []) => ({ origin: ORIGIN, testCodes });

describe("RADII_KM", () => {
  it("is [10, 20, 35, 50]", () => {
    expect([...RADII_KM]).toEqual([10, 20, 35, 50]);
  });
});

describe("searchFacilities: filtering", () => {
  it("excludes non-operational candidates, even the closest", () => {
    const closed = fac(0.5, { operational: false, name: "Closed" });
    const r = searchFacilities([closed, fac(1), fac(2), fac(3)], q());
    expect(r.results.map((x) => x.name)).not.toContain("Closed");
    expect(r.results).toHaveLength(3);
  });

  it("returns an empty list at 50 km when nothing qualifies", () => {
    const r = searchFacilities([], q());
    expect(r.results).toEqual([]);
    expect(r.radiusKm).toBe(50);
    expect(r.widened).toBe(true);
    const r2 = searchFacilities([fac(80), fac(1, { operational: false })], q());
    expect(r2.results).toEqual([]);
    expect(r2.radiusKm).toBe(50);
  });

  it("computes distanceKm with haversine", () => {
    const c = { ...fac(0), lat: 6.6018, lng: 3.3515 };
    const r = searchFacilities([c], q(), { minResults: 1 });
    expect(r.results[0].distanceKm).toBeCloseTo(refHaversineKm(ORIGIN, c), 6);
  });

  it("keeps candidate fields on results", () => {
    const c = fac(2, { id: "abc", name: "Keep Me" });
    const r = searchFacilities([c], q(), { minResults: 1 });
    expect(r.results[0]).toMatchObject(c);
  });
});

describe("searchFacilities: radius widening (FR-026)", () => {
  it("stays at 10 km with >= 3 results and excludes farther ones", () => {
    const r = searchFacilities([fac(1), fac(4), fac(9), fac(12)], q());
    expect(r.radiusKm).toBe(10);
    expect(r.widened).toBe(false);
    expect(r.results).toHaveLength(3);
    for (const x of r.results) expect(x.distanceKm).toBeLessThanOrEqual(10);
  });

  it("widens to 20 km when fewer than 3 within 10", () => {
    const r = searchFacilities([fac(2), fac(5), fac(15), fac(30)], q());
    expect(r.radiusKm).toBe(20);
    expect(r.widened).toBe(true);
    expect(r.results).toHaveLength(3);
  });

  it("widens to 35 km", () => {
    const r = searchFacilities([fac(2), fac(25), fac(34), fac(45)], q());
    expect(r.radiusKm).toBe(35);
    expect(r.widened).toBe(true);
    expect(r.results).toHaveLength(3);
  });

  it("stops at 50 km even with fewer than minResults", () => {
    const r = searchFacilities([fac(45), fac(60)], q());
    expect(r.radiusKm).toBe(50);
    expect(r.widened).toBe(true);
    expect(r.results).toHaveLength(1);
  });

  it("honours opts.minResults", () => {
    const r1 = searchFacilities([fac(3), fac(15)], q(), { minResults: 1 });
    expect(r1.radiusKm).toBe(10);
    expect(r1.widened).toBe(false);
    expect(r1.results).toHaveLength(1);
    const r5 = searchFacilities([fac(1), fac(2), fac(3), fac(15), fac(18)], q(), { minResults: 5 });
    expect(r5.radiusKm).toBe(20);
    expect(r5.results).toHaveLength(5);
  });

  it("non-operational facilities do not count toward minResults", () => {
    const r = searchFacilities([fac(1), fac(2), fac(3, { operational: false }), fac(15)], q());
    expect(r.radiusKm).toBe(20);
    expect(r.results).toHaveLength(3);
  });
});

describe("searchFacilities: offersTests and score", () => {
  it("offersTests requires every requested test", () => {
    const all = fac(1, { name: "All", offeredTests: ["MALARIA_MP", "FBC"] });
    const some = fac(1, { name: "Some", offeredTests: ["MALARIA_MP"] });
    const none = fac(1, { name: "None", offeredTests: [] });
    const r = searchFacilities([all, some, none], q(["MALARIA_MP", "FBC"]));
    const by = Object.fromEntries(r.results.map((x) => [x.name, x]));
    expect(by.All.offersTests).toBe(true);
    expect(by.Some.offersTests).toBe(false);
    expect(by.None.offersTests).toBe(false);
  });

  it("offersTests is true when no tests requested", () => {
    const r = searchFacilities([fac(1, { offeredTests: [] }), fac(2), fac(3)], q([]));
    for (const x of r.results) expect(x.offersTests).toBe(true);
  });

  it("score = distance + 8 (tests requested & not offered) + 4 (no slot) + 3 (not partner)", () => {
    const rng = mulberry32(11);
    const cands: FacilityCandidate[] = [];
    for (let i = 0; i < 40; i++) {
      cands.push(
        fac(rng() * 9.5, {
          isPartner: rng() < 0.5,
          hasSlotInWindow: rng() < 0.5,
          offeredTests: rng() < 0.5 ? ["MALARIA_MP"] : [],
          lng: ORIGIN.lng + (rng() - 0.5) * 0.01,
        }),
      );
    }
    for (const tests of [["MALARIA_MP"], []]) {
      const r = searchFacilities(cands, q(tests));
      for (const x of r.results) {
        const d = refHaversineKm(ORIGIN, x);
        const offers = tests.every((t) => x.offeredTests.includes(t));
        const expected =
          d + (tests.length > 0 && !offers ? 8 : 0) + (!x.hasSlotInWindow ? 4 : 0) + (!x.isPartner ? 3 : 0);
        expect(x.score).toBeCloseTo(expected, 6);
      }
    }
  });

  it("no +8 penalty when no tests requested, even for listed-only facilities", () => {
    const listed = fac(2, { isPartner: false, offeredTests: [], hasSlotInWindow: false });
    const r = searchFacilities([listed], q([]), { minResults: 1 });
    expect(r.results[0].score).toBeCloseTo(r.results[0].distanceKm + 7, 6);
  });

  it("a close listed-only facility ranks below a farther bookable partner", () => {
    const listed = fac(1, { name: "Listed", isPartner: false, offeredTests: [], hasSlotInWindow: false });
    const partner = fac(9, { name: "Partner" });
    const r = searchFacilities([listed, partner, fac(5, { name: "Mid" })], q(["MALARIA_MP"]));
    expect(r.results.map((x) => x.name)).toEqual(["Mid", "Partner", "Listed"]);
    expect(r.results[2].score).toBeCloseTo(r.results[2].distanceKm + 15, 6);
  });
});

describe("searchFacilities: ordering", () => {
  it("sorts by score ascending", () => {
    const r = searchFacilities(
      [fac(3, { name: "C", isPartner: false }), fac(2, { name: "B", hasSlotInWindow: false }), fac(4, { name: "A" })],
      q(),
    );
    // A: 4, C: 3+3=6, B: 2+4=6 -> A first, then tie on score broken by distance: B (2) before C (3)
    expect(r.results[0].name).toBe("A");
    for (let i = 1; i < r.results.length; i++) {
      expect(r.results[i].score).toBeGreaterThanOrEqual(r.results[i - 1].score);
    }
  });

  it("breaks exact ties by name", () => {
    const base = fac(3);
    const r = searchFacilities(
      [
        { ...base, id: "1", name: "Zeta Lab" },
        { ...base, id: "2", name: "Alpha Lab" },
        { ...base, id: "3", name: "Mu Lab" },
      ],
      q(),
    );
    expect(r.results.map((x) => x.name)).toEqual(["Alpha Lab", "Mu Lab", "Zeta Lab"]);
  });

  it("is independent of input order", () => {
    const rng = mulberry32(3);
    const cands = Array.from({ length: 20 }, (_, i) =>
      fac(rng() * 30, { name: `N${i}`, isPartner: rng() < 0.5, hasSlotInWindow: rng() < 0.5 }),
    );
    const a = searchFacilities(cands, q(["FBC"])).results.map((x) => x.id);
    const shuffled = [...cands].reverse();
    const b = searchFacilities(shuffled, q(["FBC"])).results.map((x) => x.id);
    expect(b).toEqual(a);
  });

  it("does not mutate the input array", () => {
    const cands = [fac(5), fac(1), fac(3)];
    const ids = cands.map((c) => c.id);
    searchFacilities(cands, q());
    expect(cands.map((c) => c.id)).toEqual(ids);
  });
});

describe("searchFacilities: monotonicity property", () => {
  it("of two candidates differing only in distance, the closer is never ranked below the farther", () => {
    const rng = mulberry32(777);
    for (let trial = 0; trial < 300; trial++) {
      const flags = () => ({
        isPartner: rng() < 0.5,
        hasSlotInWindow: rng() < 0.5,
        offeredTests: pick(rng, [[], ["MALARIA_MP"], ["MALARIA_MP", "FBC"]]),
      });
      const shared = flags();
      const d1 = rng() * 55;
      const d2 = d1 + 0.01 + rng() * 20;
      const near = fac(d1, { ...shared, name: "Twin", id: "near" });
      const far = fac(d2, { ...shared, name: "Twin", id: "far" });
      const others = Array.from({ length: randInt(rng, 0, 12) }, () => fac(rng() * 55, flags()));
      const all = [...others, far, near].sort(() => rng() - 0.5);
      const tests = pick(rng, [[], ["MALARIA_MP"], ["FBC"]]);
      const ids = searchFacilities(all, q(tests), { minResults: randInt(rng, 1, 5) }).results.map((x) => x.id);
      const iNear = ids.indexOf("near");
      const iFar = ids.indexOf("far");
      if (iFar !== -1) {
        expect(iNear).not.toBe(-1);
        expect(iNear).toBeLessThan(iFar);
      }
    }
  });
});
