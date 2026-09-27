import { describe, expect, it } from "vitest";
import { checkCatalogueEntry, checkRemoval, checkTestCode, parseHours, parseNaira } from "../../src/core/catalogueEdit";

describe("parseNaira", () => {
  it("accepts commas, spaces and the naira sign", () => {
    expect(parseNaira("2,500")).toBe(2500);
    expect(parseNaira("₦2500")).toBe(2500);
    expect(parseNaira(" 12 000 ")).toBe(12000);
    expect(parseNaira(3000)).toBe(3000);
  });
  it("rejects decimals, negatives, text and empty input", () => {
    expect(parseNaira("2500.50")).toBeNull();
    expect(parseNaira("-100")).toBeNull();
    expect(parseNaira("abc")).toBeNull();
    expect(parseNaira("")).toBeNull();
    expect(parseNaira(undefined)).toBeNull();
  });
});

describe("parseHours", () => {
  it("accepts whole hours only", () => {
    expect(parseHours("24")).toBe(24);
    expect(parseHours("1.5")).toBeNull();
    expect(parseHours("x")).toBeNull();
  });
});

describe("checkCatalogueEntry", () => {
  it("accepts a valid entry and converts naira to kobo", () => {
    expect(checkCatalogueEntry({ testCode: "MALARIA_MP", price: "₦2,500", turnaroundHours: "2" })).toEqual({
      ok: true,
      value: { testCode: "MALARIA_MP", priceKobo: 250_000, turnaroundHours: 2 },
    });
  });
  it("enforces the price range", () => {
    expect(checkCatalogueEntry({ testCode: "FBC", price: "100", turnaroundHours: "4" }).ok).toBe(true);
    expect(checkCatalogueEntry({ testCode: "FBC", price: "1,000,000", turnaroundHours: "4" }).ok).toBe(true);
    expect(checkCatalogueEntry({ testCode: "FBC", price: "99", turnaroundHours: "4" }).ok).toBe(false);
    expect(checkCatalogueEntry({ testCode: "FBC", price: "1000001", turnaroundHours: "4" }).ok).toBe(false);
  });
  it("enforces the turnaround range", () => {
    expect(checkCatalogueEntry({ testCode: "FBC", price: "5000", turnaroundHours: "720" }).ok).toBe(true);
    expect(checkCatalogueEntry({ testCode: "FBC", price: "5000", turnaroundHours: "0" }).ok).toBe(false);
    expect(checkCatalogueEntry({ testCode: "FBC", price: "5000", turnaroundHours: "721" }).ok).toBe(false);
  });
  it("rejects unknown test codes", () => {
    expect(checkTestCode("NOT_A_TEST").ok).toBe(false);
    expect(checkCatalogueEntry({ testCode: "NOT_A_TEST", price: "5000", turnaroundHours: "4" }).ok).toBe(false);
  });
});

describe("checkRemoval", () => {
  it("allows removal only with no active appointments", () => {
    expect(checkRemoval("FBC", 0).ok).toBe(true);
    const r = checkRemoval("FBC", 2);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("2 active appointments");
  });
});
