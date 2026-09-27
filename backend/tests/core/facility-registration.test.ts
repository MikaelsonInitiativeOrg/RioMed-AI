import { describe, expect, it } from "vitest";
import { buildOpeningSlots, checkFacilityRegistration, CLOSE_HOUR, OPEN_HOUR, SCHEDULE_DAYS } from "../../src/core/facilityRegistration";

const base = { name: "Wuse Family Clinic", type: "clinic", address: "12 Aminu Kano Crescent, Wuse 2, Abuja", phone: "", prices: { MALARIA_MP: "2,500", FBC: "5000" } };

describe("checkFacilityRegistration", () => {
  it("accepts a valid registration and converts naira to kobo", () => {
    const r = checkFacilityRegistration(base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.tests).toEqual([
      { testCode: "MALARIA_MP", priceKobo: 250_000 },
      { testCode: "FBC", priceKobo: 500_000 },
    ]);
    expect(r.value.phone).toBeNull();
  });
  it("requires a name, a known type, an address and at least one test", () => {
    expect(checkFacilityRegistration({ ...base, name: "A" }).ok).toBe(false);
    expect(checkFacilityRegistration({ ...base, type: "spa" }).ok).toBe(false);
    expect(checkFacilityRegistration({ ...base, address: "x" }).ok).toBe(false);
    expect(checkFacilityRegistration({ ...base, prices: {} }).ok).toBe(false);
  });
  it("ignores unknown test codes and rejects out-of-range prices", () => {
    expect(checkFacilityRegistration({ ...base, prices: { NOT_A_TEST: "100" } }).ok).toBe(false);
    expect(checkFacilityRegistration({ ...base, prices: { MALARIA_MP: "0" } }).ok).toBe(false);
    expect(checkFacilityRegistration({ ...base, prices: { MALARIA_MP: "abc" } }).ok).toBe(false);
    expect(checkFacilityRegistration({ ...base, prices: { MALARIA_MP: "2000000" } }).ok).toBe(false);
  });
  it("strips markup from free text and rejects a bad phone", () => {
    const r = checkFacilityRegistration({ ...base, name: "<b>Clinic</b> One" });
    expect(r.ok && r.value.name).not.toMatch(/[<>]/);
    expect(checkFacilityRegistration({ ...base, phone: "call me" }).ok).toBe(false);
  });
});

describe("buildOpeningSlots", () => {
  const now = new Date("2026-09-27T09:30:00Z"); // Sunday 10:30 WAT
  it("creates future hourly slots only, within opening hours", () => {
    const slots = buildOpeningSlots("fac_x", "clinic", now);
    expect(slots.length).toBeGreaterThan(0);
    for (const s of slots) {
      expect(s.start.getTime()).toBeGreaterThan(now.getTime());
      const watHour = (s.start.getUTCHours() + 1) % 24;
      expect(watHour).toBeGreaterThanOrEqual(OPEN_HOUR);
      expect(watHour).toBeLessThan(CLOSE_HOUR);
      expect(s.end.getTime() - s.start.getTime()).toBe(60 * 60_000);
    }
    expect(new Set(slots.map((s) => s.id)).size).toBe(slots.length);
  });
  it("closes clinics on Sundays but not hospitals", () => {
    const sunday = (d: Date) => new Date(d.getTime() + 60 * 60_000).getUTCDay() === 0;
    expect(buildOpeningSlots("fac_x", "clinic", now).some((s) => sunday(s.start))).toBe(false);
    expect(buildOpeningSlots("fac_x", "hospital", now).some((s) => sunday(s.start))).toBe(true);
  });
  it("covers the schedule window", () => {
    const slots = buildOpeningSlots("fac_x", "hospital", now);
    const last = slots[slots.length - 1].start.getTime();
    expect(last - now.getTime()).toBeLessThan(SCHEDULE_DAYS * 24 * 60 * 60_000);
    expect(last - now.getTime()).toBeGreaterThan((SCHEDULE_DAYS - 1) * 24 * 60 * 60_000);
  });
});
