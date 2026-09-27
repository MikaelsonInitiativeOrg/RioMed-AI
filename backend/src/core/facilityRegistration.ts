import { isKnownTestCode, TEST_CATALOG } from "./catalog";
import { lagosTime } from "./intent/time";

/**
 * Facility self-registration (added 2026-09-27, product owner request): a clinic creates an
 * account and is listed at once, bookable in the next open slot. Pure: validation and the
 * opening schedule. The server geocodes the address and writes the records.
 */

export const FACILITY_TYPES = ["hospital", "clinic", "laboratory", "diagnostic_centre", "primary_health_centre"] as const;
export type FacilityTypeCode = (typeof FACILITY_TYPES)[number];

export const FACILITY_TYPE_LABELS: Record<FacilityTypeCode, string> = {
  hospital: "Hospital",
  clinic: "Clinic",
  laboratory: "Laboratory",
  diagnostic_centre: "Diagnostic centre",
  primary_health_centre: "Primary health centre",
};

/** Suggested starting prices in naira, pre-filled in the form. The facility sets its own. */
export const SUGGESTED_PRICES_NAIRA: Record<string, number> = {
  MALARIA_MP: 2500, WIDAL: 3000, FBC: 5000, PCV: 1500, HIV: 3000, HBSAG: 3500, HCV: 5000,
  FBS: 2000, HBA1C: 8000, LIPID: 10000, URINALYSIS: 2000, PREGNANCY: 2000, GENOTYPE: 3500,
  BLOOD_GROUP: 1500, LFT: 12000, EUCR: 12000, XRAY_CHEST: 15000, ULTRASOUND: 12000, COVID19: 20000,
};

export const MIN_PRICE_NAIRA = 100;
export const MAX_PRICE_NAIRA = 1_000_000;

export interface FacilityRegistration {
  name: string;
  type: FacilityTypeCode;
  address: string;
  phone: string | null;
  tests: Array<{ testCode: string; priceKobo: number }>;
}

type Check<T> = { ok: true; value: T } | { ok: false; error: string };

function clean(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** prices: testCode -> naira as typed. Only ticked tests are passed. */
export function checkFacilityRegistration(input: { name: unknown; type: unknown; address: unknown; phone: unknown; prices: Record<string, unknown> }): Check<FacilityRegistration> {
  const name = clean(input.name, 80);
  if (name.length < 3) return { ok: false, error: "Enter the facility name (at least 3 characters)." };
  if (typeof input.type !== "string" || !(FACILITY_TYPES as readonly string[]).includes(input.type)) return { ok: false, error: "Choose the type of facility." };
  const address = clean(input.address, 160);
  if (address.length < 5) return { ok: false, error: "Enter the facility address, with the area and city." };
  const phone = clean(input.phone, 20);
  if (phone && !/^\+?[0-9 ()-]{7,20}$/.test(phone)) return { ok: false, error: "Enter a valid phone number, or leave it empty." };

  const tests: FacilityRegistration["tests"] = [];
  for (const [code, raw] of Object.entries(input.prices ?? {})) {
    if (!isKnownTestCode(code)) continue;
    const naira = Number(String(raw ?? "").replace(/[,\s₦]/g, ""));
    const test = TEST_CATALOG.find((t) => t.code === code)!;
    if (!Number.isFinite(naira) || naira < MIN_PRICE_NAIRA || naira > MAX_PRICE_NAIRA) {
      return { ok: false, error: `Enter a price between ₦${MIN_PRICE_NAIRA} and ₦${MAX_PRICE_NAIRA.toLocaleString("en-NG")} for ${test.name}.` };
    }
    tests.push({ testCode: code, priceKobo: Math.round(naira) * 100 });
  }
  if (tests.length === 0) return { ok: false, error: "Tick at least one test your facility offers, with its price." };
  return { ok: true, value: { name, type: input.type as FacilityTypeCode, address, phone: phone || null, tests } };
}

export const OPEN_HOUR = 8;
export const CLOSE_HOUR = 18;
export const SLOT_CAPACITY = 2;
export const SCHEDULE_DAYS = 14;

/**
 * Hourly slots from today for SCHEDULE_DAYS days, 08:00–18:00 on the WAT clock the app runs on.
 * Closed Sundays except hospitals. Slot ids are deterministic, so re-running never duplicates.
 */
export function buildOpeningSlots(facilityId: string, type: FacilityTypeCode, now: Date) {
  const lagosNow = new Date(now.getTime() + 60 * 60_000); // WAT = UTC+1, no DST
  const slots: Array<{ id: string; facilityId: string; start: Date; end: Date; capacity: number }> = [];
  for (let day = 0; day < SCHEDULE_DAYS; day++) {
    const date = new Date(Date.UTC(lagosNow.getUTCFullYear(), lagosNow.getUTCMonth(), lagosNow.getUTCDate() + day));
    if (date.getUTCDay() === 0 && type !== "hospital") continue;
    const ymd = { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
    for (let hour = OPEN_HOUR; hour < CLOSE_HOUR; hour++) {
      const start = lagosTime(ymd, hour);
      if (start.getTime() <= now.getTime()) continue;
      slots.push({ id: `${facilityId}_${ymd.y}${ymd.m}${ymd.d}_${hour}`, facilityId, start, end: lagosTime(ymd, hour + 1), capacity: SLOT_CAPACITY });
    }
  }
  return slots;
}
