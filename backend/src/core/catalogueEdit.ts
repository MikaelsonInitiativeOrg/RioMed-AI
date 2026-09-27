import { getTest, isKnownTestCode } from "./catalog";
import { MAX_PRICE_NAIRA, MIN_PRICE_NAIRA } from "./facilityRegistration";
import type { AppointmentStatus } from "./booking";

/**
 * A facility edits its own test catalogue (price and turnaround). Pure validation only;
 * the server checks who is asking and writes the rows.
 */

export const MIN_TURNAROUND_HOURS = 1;
export const MAX_TURNAROUND_HOURS = 720;

/** A test cannot be removed while any appointment for it is in one of these statuses. */
export const ACTIVE_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = ["HELD", "PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN"];

export type Check<T> = { ok: true; value: T } | { ok: false; error: string };

export interface CatalogueEntry {
  testCode: string;
  priceKobo: number;
  turnaroundHours: number;
}

/** Parses a naira amount as typed ("2,500", "₦2500", " 2 500 ") into whole naira, or null. */
export function parseNaira(raw: unknown): number | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const s = String(raw).replace(/[,\s₦]/g, "").replace(/^NGN/i, "");
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) ? n : null;
}

/** Parses whole hours, or null. */
export function parseHours(raw: unknown): number | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const s = String(raw).trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) ? n : null;
}

function testName(code: string): string {
  return getTest(code)?.name ?? code;
}

export function checkTestCode(raw: unknown): Check<string> {
  if (typeof raw !== "string" || !isKnownTestCode(raw)) return { ok: false, error: "Choose a test from the RioMed catalogue." };
  return { ok: true, value: raw };
}

export function checkCatalogueEntry(input: { testCode: unknown; price: unknown; turnaroundHours: unknown }): Check<CatalogueEntry> {
  const code = checkTestCode(input.testCode);
  if (!code.ok) return code;
  const name = testName(code.value);
  const naira = parseNaira(input.price);
  if (naira === null || naira < MIN_PRICE_NAIRA || naira > MAX_PRICE_NAIRA) {
    return { ok: false, error: `Enter a whole-naira price between ₦${MIN_PRICE_NAIRA} and ₦${MAX_PRICE_NAIRA.toLocaleString("en-NG")} for ${name}.` };
  }
  const hours = parseHours(input.turnaroundHours);
  if (hours === null || hours < MIN_TURNAROUND_HOURS || hours > MAX_TURNAROUND_HOURS) {
    return { ok: false, error: `Enter a turnaround between ${MIN_TURNAROUND_HOURS} and ${MAX_TURNAROUND_HOURS} hours for ${name}.` };
  }
  return { ok: true, value: { testCode: code.value, priceKobo: naira * 100, turnaroundHours: hours } };
}

/** Removal is allowed only when no appointment for the test is still active. */
export function checkRemoval(testCode: string, activeAppointments: number): Check<string> {
  if (activeAppointments > 0) {
    const n = activeAppointments === 1 ? "1 active appointment" : `${activeAppointments} active appointments`;
    return { ok: false, error: `${testName(testCode)} has ${n} (held, awaiting payment, confirmed or checked in). Finish or cancel them before removing the test.` };
  }
  return { ok: true, value: testCode };
}
