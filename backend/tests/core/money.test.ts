import { describe, it, expect } from "vitest";
import { assertKobo, computeCharge, formatNaira } from "@/core/money";
import { mulberry32, randInt } from "./_helpers";

describe("assertKobo", () => {
  it("accepts safe non-negative integers", () => {
    for (const n of [0, 1, 250000, 99_999_999, Number.MAX_SAFE_INTEGER]) {
      expect(() => assertKobo(n)).not.toThrow();
    }
  });
  it("throws on negatives, fractions, non-finite and unsafe values", () => {
    for (const n of [-1, -0.5, 1.5, 0.1 + 0.2, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, 2 ** 60]) {
      expect(() => assertKobo(n), String(n)).toThrow();
    }
  });
  it("throws on non-numbers", () => {
    for (const v of ["100", null, undefined, {}, [], BigInt(10)]) {
      expect(() => assertKobo(v as unknown as number)).toThrow();
    }
  });
});

describe("computeCharge", () => {
  it("sums price and fee; fee defaults to 0", () => {
    expect(computeCharge(250000)).toBe(250000);
    expect(computeCharge(250000, 0)).toBe(250000);
    expect(computeCharge(250000, 5000)).toBe(255000);
    expect(computeCharge(0, 0)).toBe(0);
  });
  it("throws on invalid price or fee", () => {
    expect(() => computeCharge(-1)).toThrow();
    expect(() => computeCharge(2500.5)).toThrow();
    expect(() => computeCharge(NaN)).toThrow();
    expect(() => computeCharge(250000, -1)).toThrow();
    expect(() => computeCharge(250000, 0.5)).toThrow();
    expect(() => computeCharge(250000, Infinity)).toThrow();
    expect(() => computeCharge("250000" as unknown as number)).toThrow();
  });
  it("throws when the sum is not a safe integer", () => {
    expect(() => computeCharge(Number.MAX_SAFE_INTEGER, 1)).toThrow();
  });
  it("property: integer sum equals price + fee for random kobo values", () => {
    const rng = mulberry32(50);
    for (let i = 0; i < 2000; i++) {
      const p = randInt(rng, 0, 100_000_000);
      const f = randInt(rng, 0, 1_000_000);
      const c = computeCharge(p, f);
      expect(Number.isSafeInteger(c)).toBe(true);
      expect(c).toBe(p + f);
    }
  });
});

describe("formatNaira", () => {
  const cases: [number, string][] = [
    [250000, "₦2,500"],
    [250050, "₦2,500.50"],
    [250005, "₦2,500.05"],
    [250010, "₦2,500.10"],
    [0, "₦0"],
    [5, "₦0.05"],
    [50, "₦0.50"],
    [100, "₦1"],
    [99999, "₦999.99"],
    [100000, "₦1,000"],
    [12345678, "₦123,456.78"],
    [100000000, "₦1,000,000"],
  ];
  for (const [kobo, s] of cases) {
    it(`${kobo} -> ${s}`, () => {
      expect(formatNaira(kobo)).toBe(s);
    });
  }
  it("throws on non-integers", () => {
    expect(() => formatNaira(2500.5)).toThrow();
    expect(() => formatNaira(NaN)).toThrow();
    expect(() => formatNaira(Infinity)).toThrow();
  });
  it("property: round-trips for random kobo values", () => {
    const rng = mulberry32(8);
    for (let i = 0; i < 1000; i++) {
      const k = randInt(rng, 0, 1_000_000_000);
      const s = formatNaira(k);
      expect(s.startsWith("₦")).toBe(true);
      const back = Math.round(Number(s.slice(1).replace(/,/g, "")) * 100);
      expect(back).toBe(k);
      if (k % 100 === 0) expect(s).not.toContain(".");
      else expect(s).toMatch(/\.\d{2}$/);
    }
  });
});
