import { describe, it, expect } from "vitest";
import { findFacilityCandidates, matchFacilityByName } from "@/core/facility";

const PARTNERS = [
  { id: "fac_001", name: "Alausa Diagnostics Centre" },
  { id: "fac_002", name: "Opebi Family Clinic" },
  { id: "fac_008", name: "Yaba Central Laboratory" },
  { id: "fac_005", name: "Ikeja Primary Health Centre" },
];

describe("matchFacilityByName", () => {
  it("matches a full clinic name", () => {
    expect(matchFacilityByName("book a malaria test at Alausa Diagnostics Centre tomorrow", PARTNERS)?.id).toBe("fac_001");
  });

  it("matches a distinctive name fragment plus a building word", () => {
    expect(matchFacilityByName("book me for widal at the Yaba lab this evening", PARTNERS)?.id).toBe("fac_008");
    expect(matchFacilityByName("Opebi clinic, malaria test", PARTNERS)?.id).toBe("fac_002");
  });

  it("does not match a bare area with no building word", () => {
    expect(matchFacilityByName("I need a malaria test around Ikeja tomorrow morning", PARTNERS)).toBeNull();
    expect(matchFacilityByName("widal test near Yaba", PARTNERS)).toBeNull();
  });

  it("does not match a lone building word", () => {
    expect(matchFacilityByName("find me a hospital", PARTNERS)).toBeNull();
    expect(matchFacilityByName("diagnostics", PARTNERS)).toBeNull();
  });

  it("returns null but lists candidates when ambiguous", () => {
    const two = [
      { id: "a", name: "Surulere Wellness Lab" },
      { id: "b", name: "Surulere Community Clinic" },
    ];
    expect(matchFacilityByName("book at Surulere clinic", two)).toBeNull();
    expect(findFacilityCandidates("book at Surulere clinic", two)).toHaveLength(2);
  });

  it("never throws on odd input", () => {
    expect(matchFacilityByName("", PARTNERS)).toBeNull();
    // @ts-expect-error runtime guard
    expect(matchFacilityByName(null, PARTNERS)).toBeNull();
    expect(matchFacilityByName("alausa diagnostics", [])).toBeNull();
  });
});
