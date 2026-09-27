import { describe, it, expect } from "vitest";
import { resolveWhen, type When, type TimeWindow } from "@/core/intent";
import { mulberry32, randInt, pick } from "./_helpers";

// Africa/Lagos is UTC+1, no DST. Lagos HH:00 == (HH-1):00Z.
const Z = (iso: string) => new Date(iso);
const w = (day: string | null, part: When["part"]): When => ({ day, part });

function expectWindow(r: TimeWindow | null, start: string, end: string) {
  expect(r).not.toBeNull();
  expect(r!.start).toBeInstanceOf(Date);
  expect(r!.end).toBeInstanceOf(Date);
  expect(r!.start.toISOString()).toBe(new Date(start).toISOString());
  expect(r!.end.toISOString()).toBe(new Date(end).toISOString());
}

// 2026-09-27 is a Sunday.
const NOW_0900_LAGOS = Z("2026-09-27T08:00:00.000Z"); // Sunday 09:00 Lagos

describe("resolveWhen: basics", () => {
  it("null when -> null", () => {
    expect(resolveWhen(null, NOW_0900_LAGOS)).toBeNull();
  });

  it("windows for tomorrow map Lagos hours to UTC", () => {
    expectWindow(resolveWhen(w("tomorrow", "morning"), NOW_0900_LAGOS), "2026-09-28T06:00:00Z", "2026-09-28T11:00:00Z");
    expectWindow(resolveWhen(w("tomorrow", "afternoon"), NOW_0900_LAGOS), "2026-09-28T11:00:00Z", "2026-09-28T16:00:00Z");
    expectWindow(resolveWhen(w("tomorrow", "evening"), NOW_0900_LAGOS), "2026-09-28T16:00:00Z", "2026-09-28T20:00:00Z");
    expectWindow(resolveWhen(w("tomorrow", "any"), NOW_0900_LAGOS), "2026-09-28T06:00:00Z", "2026-09-28T20:00:00Z");
  });

  it("today: a started window starts at now", () => {
    expectWindow(resolveWhen(w("today", "morning"), NOW_0900_LAGOS), "2026-09-27T08:00:00Z", "2026-09-27T11:00:00Z");
    expectWindow(resolveWhen(w("today", "any"), NOW_0900_LAGOS), "2026-09-27T08:00:00Z", "2026-09-27T20:00:00Z");
  });

  it("today: a future window is unchanged", () => {
    expectWindow(resolveWhen(w("today", "afternoon"), NOW_0900_LAGOS), "2026-09-27T11:00:00Z", "2026-09-27T16:00:00Z");
    expectWindow(resolveWhen(w("today", "evening"), NOW_0900_LAGOS), "2026-09-27T16:00:00Z", "2026-09-27T20:00:00Z");
  });

  it("today: before any window has started, start is not moved", () => {
    const early = Z("2026-09-27T04:30:00Z"); // 05:30 Lagos
    expectWindow(resolveWhen(w("today", "morning"), early), "2026-09-27T06:00:00Z", "2026-09-27T11:00:00Z");
  });

  it("explicit today after the window has ended -> null", () => {
    const at1300 = Z("2026-09-27T12:00:00Z"); // 13:00 Lagos
    expect(resolveWhen(w("today", "morning"), at1300)).toBeNull();
    const at2130 = Z("2026-09-27T20:30:00Z"); // 21:30 Lagos
    expect(resolveWhen(w("today", "evening"), at2130)).toBeNull();
    expect(resolveWhen(w("today", "any"), at2130)).toBeNull();
  });
});

describe("resolveWhen: null day", () => {
  it("means today when today's window has not ended", () => {
    expectWindow(resolveWhen(w(null, "afternoon"), NOW_0900_LAGOS), "2026-09-27T11:00:00Z", "2026-09-27T16:00:00Z");
    expectWindow(resolveWhen(w(null, "morning"), NOW_0900_LAGOS), "2026-09-27T08:00:00Z", "2026-09-27T11:00:00Z");
  });
  it("means tomorrow when today's window has ended", () => {
    const at1300 = Z("2026-09-27T12:00:00Z");
    expectWindow(resolveWhen(w(null, "morning"), at1300), "2026-09-28T06:00:00Z", "2026-09-28T11:00:00Z");
    const at2330 = Z("2026-09-27T22:30:00Z"); // 23:30 Lagos
    expectWindow(resolveWhen(w(null, "any"), at2330), "2026-09-28T06:00:00Z", "2026-09-28T20:00:00Z");
  });
});

describe("resolveWhen: near midnight in Lagos", () => {
  // 23:30Z on the 27th is 00:30 on the 28th in Lagos. A UTC-date bug would pick the 27th.
  const lagosJustAfterMidnight = Z("2026-09-27T23:30:00Z");
  it("today is the Lagos calendar date, not the UTC date", () => {
    expectWindow(resolveWhen(w("today", "morning"), lagosJustAfterMidnight), "2026-09-28T06:00:00Z", "2026-09-28T11:00:00Z");
  });
  it("tomorrow is the Lagos date + 1", () => {
    expectWindow(resolveWhen(w("tomorrow", "morning"), lagosJustAfterMidnight), "2026-09-29T06:00:00Z", "2026-09-29T11:00:00Z");
  });
  it("null day before the window means the same Lagos day", () => {
    expectWindow(resolveWhen(w(null, "evening"), lagosJustAfterMidnight), "2026-09-28T16:00:00Z", "2026-09-28T20:00:00Z");
  });
  it("weekday name matching the Lagos weekday (Monday) is today", () => {
    expectWindow(resolveWhen(w("monday", "morning"), lagosJustAfterMidnight), "2026-09-28T06:00:00Z", "2026-09-28T11:00:00Z");
  });
  it("just before Lagos midnight (22:59Z), tomorrow is the next Lagos day", () => {
    const lateLagos = Z("2026-09-27T22:59:00Z"); // 23:59 Sunday Lagos
    expectWindow(resolveWhen(w("tomorrow", "any"), lateLagos), "2026-09-28T06:00:00Z", "2026-09-28T20:00:00Z");
  });
});

describe("resolveWhen: month and year boundaries", () => {
  it("rolls over the month", () => {
    const sep30 = Z("2026-09-30T12:00:00Z"); // 13:00 Lagos, Sep 30
    expectWindow(resolveWhen(w("tomorrow", "morning"), sep30), "2026-10-01T06:00:00Z", "2026-10-01T11:00:00Z");
    const oct1Lagos = Z("2026-09-30T23:30:00Z"); // 00:30 Lagos, Oct 1
    expectWindow(resolveWhen(w("today", "afternoon"), oct1Lagos), "2026-10-01T11:00:00Z", "2026-10-01T16:00:00Z");
    expectWindow(resolveWhen(w("tomorrow", "afternoon"), oct1Lagos), "2026-10-02T11:00:00Z", "2026-10-02T16:00:00Z");
  });
  it("rolls over the year", () => {
    const dec31 = Z("2026-12-31T10:00:00Z"); // 11:00 Lagos
    expectWindow(resolveWhen(w("tomorrow", "morning"), dec31), "2027-01-01T06:00:00Z", "2027-01-01T11:00:00Z");
    const jan1Lagos = Z("2026-12-31T23:30:00Z"); // 00:30 Lagos, Jan 1 2027
    expectWindow(resolveWhen(w("today", "morning"), jan1Lagos), "2027-01-01T06:00:00Z", "2027-01-01T11:00:00Z");
    expectWindow(resolveWhen(w(null, "morning"), Z("2026-12-31T20:30:00Z")), "2027-01-01T06:00:00Z", "2027-01-01T11:00:00Z");
  });
  it("handles Feb 28 -> Mar 1 in a non-leap year and Feb 29 in a leap year", () => {
    expectWindow(resolveWhen(w("tomorrow", "morning"), Z("2027-02-28T10:00:00Z")), "2027-03-01T06:00:00Z", "2027-03-01T11:00:00Z");
    expectWindow(resolveWhen(w("tomorrow", "morning"), Z("2028-02-28T10:00:00Z")), "2028-02-29T06:00:00Z", "2028-02-29T11:00:00Z");
  });
});

describe("resolveWhen: weekday names", () => {
  // now = Sunday 2026-09-27 09:00 Lagos
  it("the next date with that weekday", () => {
    expectWindow(resolveWhen(w("monday", "morning"), NOW_0900_LAGOS), "2026-09-28T06:00:00Z", "2026-09-28T11:00:00Z");
    expectWindow(resolveWhen(w("thursday", "any"), NOW_0900_LAGOS), "2026-10-01T06:00:00Z", "2026-10-01T20:00:00Z");
    expectWindow(resolveWhen(w("saturday", "evening"), NOW_0900_LAGOS), "2026-10-03T16:00:00Z", "2026-10-03T20:00:00Z");
  });
  it("includes today", () => {
    expectWindow(resolveWhen(w("sunday", "afternoon"), NOW_0900_LAGOS), "2026-09-27T11:00:00Z", "2026-09-27T16:00:00Z");
    expectWindow(resolveWhen(w("sunday", "any"), NOW_0900_LAGOS), "2026-09-27T08:00:00Z", "2026-09-27T20:00:00Z");
  });
});

describe("resolveWhen: explicit YYYY-MM-DD", () => {
  it("means that date", () => {
    expectWindow(resolveWhen(w("2026-10-05", "morning"), NOW_0900_LAGOS), "2026-10-05T06:00:00Z", "2026-10-05T11:00:00Z");
    expectWindow(resolveWhen(w("2027-01-01", "any"), NOW_0900_LAGOS), "2027-01-01T06:00:00Z", "2027-01-01T20:00:00Z");
    expectWindow(resolveWhen(w("2028-02-29", "evening"), NOW_0900_LAGOS), "2028-02-29T16:00:00Z", "2028-02-29T20:00:00Z");
  });
  it("today's date behaves like today (start clamped to now)", () => {
    expectWindow(resolveWhen(w("2026-09-27", "morning"), NOW_0900_LAGOS), "2026-09-27T08:00:00Z", "2026-09-27T11:00:00Z");
  });
  it("a past date -> null", () => {
    expect(resolveWhen(w("2026-09-26", "morning"), NOW_0900_LAGOS)).toBeNull();
    expect(resolveWhen(w("2025-12-31", "any"), NOW_0900_LAGOS)).toBeNull();
  });
  it("uses the Lagos date for 'past': the UTC date is not today near midnight", () => {
    // 00:30 Lagos Sep 28; Sep 27 is now in the past in Lagos.
    expect(resolveWhen(w("2026-09-27", "evening"), Z("2026-09-27T23:30:00Z"))).toBeNull();
  });
  it("an invalid date -> null", () => {
    for (const d of ["2026-02-30", "2026-13-01", "2026-00-10", "2027-02-29", "2026-9-5", "not-a-date", "someday", ""]) {
      expect(resolveWhen(w(d, "morning"), NOW_0900_LAGOS), d).toBeNull();
    }
  });
});

describe("resolveWhen: properties over seeded random times", () => {
  const PARTS: Record<When["part"], [number, number]> = {
    morning: [7, 12],
    afternoon: [12, 17],
    evening: [17, 21],
    any: [7, 21],
  };

  it("tomorrow windows are exactly the fixed Lagos window on Lagos date + 1", () => {
    const rng = mulberry32(1234);
    const base = Date.UTC(2026, 0, 1);
    for (let i = 0; i < 1000; i++) {
      const now = new Date(base + randInt(rng, 0, 3 * 365 * 24 * 60) * 60_000);
      const part = pick(rng, ["morning", "afternoon", "evening", "any"] as const);
      const r = resolveWhen(w("tomorrow", part), now);
      expect(r).not.toBeNull();
      const lagosNow = new Date(now.getTime() + 3_600_000);
      const [h0, h1] = PARTS[part];
      const expStart = Date.UTC(lagosNow.getUTCFullYear(), lagosNow.getUTCMonth(), lagosNow.getUTCDate() + 1, h0 - 1);
      const expEnd = Date.UTC(lagosNow.getUTCFullYear(), lagosNow.getUTCMonth(), lagosNow.getUTCDate() + 1, h1 - 1);
      expect(r!.start.getTime(), now.toISOString()).toBe(expStart);
      expect(r!.end.getTime(), now.toISOString()).toBe(expEnd);
    }
  });

  it("any non-null window has start < end, end > now, start >= now or window-start", () => {
    const rng = mulberry32(99);
    const base = Date.UTC(2026, 8, 1);
    const days = [null, "today", "tomorrow"];
    for (let i = 0; i < 1000; i++) {
      const now = new Date(base + randInt(rng, 0, 200 * 24 * 60) * 60_000 + 30_000);
      const r = resolveWhen(w(pick(rng, days), pick(rng, ["morning", "afternoon", "evening", "any"] as const)), now);
      if (r === null) continue;
      expect(r.start.getTime()).toBeLessThan(r.end.getTime());
      expect(r.end.getTime()).toBeGreaterThan(now.getTime());
      expect(r.start.getTime()).toBeGreaterThanOrEqual(now.getTime());
    }
  });

  it("null day never returns null", () => {
    const rng = mulberry32(5);
    const base = Date.UTC(2026, 8, 1);
    for (let i = 0; i < 500; i++) {
      const now = new Date(base + randInt(rng, 0, 60 * 24 * 60) * 60_000);
      const part = pick(rng, ["morning", "afternoon", "evening", "any"] as const);
      expect(resolveWhen(w(null, part), now)).not.toBeNull();
    }
  });
});
