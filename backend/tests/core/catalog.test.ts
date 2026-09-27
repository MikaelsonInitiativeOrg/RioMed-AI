import { describe, it, expect } from "vitest";
import { TEST_CATALOG, isKnownTestCode, getTest } from "@/core/catalog";

const REQUIRED: Record<string, string[]> = {
  MALARIA_MP: ["malaria", "malaria test", "malaria parasite", "mp", "mp test"],
  WIDAL: ["widal", "typhoid"],
  FBC: ["full blood count", "fbc", "cbc", "complete blood count"],
  PCV: ["pcv", "packed cell volume"],
  HIV: ["hiv", "hiv test"],
  HBSAG: ["hepatitis b", "hbsag"],
  HCV: ["hepatitis c", "hcv"],
  FBS: ["blood sugar", "fasting blood sugar", "fbs", "glucose"],
  HBA1C: ["hba1c"],
  LIPID: ["lipid profile", "cholesterol"],
  URINALYSIS: ["urinalysis", "urine test"],
  PREGNANCY: ["pregnancy test"],
  GENOTYPE: ["genotype", "sickle cell"],
  BLOOD_GROUP: ["blood group"],
  LFT: ["liver function"],
  EUCR: ["kidney function", "e/u/cr", "electrolytes"],
  XRAY_CHEST: ["chest x-ray", "chest xray"],
  ULTRASOUND: ["ultrasound", "scan"],
  COVID19: ["covid", "covid test"],
};

describe("TEST_CATALOG", () => {
  it("contains every required code", () => {
    const codes = TEST_CATALOG.map((t) => t.code);
    for (const code of Object.keys(REQUIRED)) expect(codes).toContain(code);
  });

  it("has unique codes and well-formed entries", () => {
    const codes = TEST_CATALOG.map((t) => t.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const t of TEST_CATALOG) {
      expect(typeof t.code).toBe("string");
      expect(t.code.length).toBeGreaterThan(0);
      expect(typeof t.name).toBe("string");
      expect(t.name.length).toBeGreaterThan(0);
      expect(typeof t.category).toBe("string");
      expect(t.category.length).toBeGreaterThan(0);
      expect(Array.isArray(t.synonyms)).toBe(true);
    }
  });

  for (const [code, syns] of Object.entries(REQUIRED)) {
    it(`${code} has the minimum synonyms (case-insensitive)`, () => {
      const t = getTest(code);
      expect(t).toBeDefined();
      const have = t!.synonyms.map((s) => s.toLowerCase());
      for (const s of syns) expect(have).toContain(s);
    });
  }

  it("no synonym maps to two different codes", () => {
    const owner = new Map<string, string>();
    for (const t of TEST_CATALOG) {
      for (const s of t.synonyms) {
        const k = s.toLowerCase();
        if (owner.has(k)) expect(owner.get(k), `synonym "${k}"`).toBe(t.code);
        owner.set(k, t.code);
      }
    }
  });
});

describe("isKnownTestCode / getTest", () => {
  it("knows every catalogue code", () => {
    for (const t of TEST_CATALOG) {
      expect(isKnownTestCode(t.code)).toBe(true);
      expect(getTest(t.code)?.code).toBe(t.code);
    }
  });
  it("rejects unknown codes", () => {
    for (const c of ["", "MALARIA", "NOT_A_TEST", "malaria test", " FBC", "FBC ", "__proto__", "constructor", "toString"]) {
      expect(isKnownTestCode(c), c).toBe(false);
      expect(getTest(c), c).toBeUndefined();
    }
  });
});
