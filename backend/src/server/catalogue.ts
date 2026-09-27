import "server-only";
import type { Actor } from "../core/access";
import { getTest } from "../core/catalog";
import { ACTIVE_APPOINTMENT_STATUSES, checkCatalogueEntry, checkRemoval, checkTestCode } from "../core/catalogueEdit";
import { audit } from "./booking";
import { prisma } from "./db";

/**
 * A facility edits its own catalogue. The facility always comes from the signed-in actor,
 * never from the form. Held appointments keep the amount locked at hold time, so a price
 * change only affects new bookings.
 */

export type CatalogueResult = { ok: true; message: string } | { ok: false; error: string };

type EntryInput = { testCode: unknown; price: unknown; turnaroundHours: unknown };

function facilityOf(actor: Actor | null): string | null {
  if (!actor || (actor.role !== "facility_staff" && actor.role !== "facility_admin") || !actor.facilityId) return null;
  return actor.facilityId;
}

const NOT_ALLOWED: CatalogueResult = { ok: false, error: "Only staff of this facility can change its catalogue." };

export async function updateFacilityTest(actor: Actor | null, input: EntryInput): Promise<CatalogueResult> {
  const facilityId = facilityOf(actor);
  if (!actor || !facilityId) return NOT_ALLOWED;
  const entry = checkCatalogueEntry(input);
  if (!entry.ok) return entry;
  const { testCode, priceKobo, turnaroundHours } = entry.value;
  const updated = await prisma.facilityTest.updateMany({ where: { facilityId, testCode }, data: { priceKobo, turnaroundHours } });
  if (updated.count === 0) return { ok: false, error: `Your facility does not offer ${getTest(testCode)?.name ?? testCode}. Add it first.` };
  await audit(actor.userId, "catalogue.update", "Facility", facilityId);
  return { ok: true, message: `${getTest(testCode)?.name ?? testCode} updated. New bookings use the new price.` };
}

export async function addFacilityTest(actor: Actor | null, input: EntryInput): Promise<CatalogueResult> {
  const facilityId = facilityOf(actor);
  if (!actor || !facilityId) return NOT_ALLOWED;
  const entry = checkCatalogueEntry(input);
  if (!entry.ok) return entry;
  const { testCode, priceKobo, turnaroundHours } = entry.value;
  const name = getTest(testCode)?.name ?? testCode;
  const existing = await prisma.facilityTest.findUnique({ where: { facilityId_testCode: { facilityId, testCode } } });
  if (existing) return { ok: false, error: `Your facility already offers ${name}. Change its price in the list.` };
  try {
    await prisma.facilityTest.create({ data: { facilityId, testCode, priceKobo, turnaroundHours } });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") return { ok: false, error: `Your facility already offers ${name}.` };
    throw e;
  }
  await audit(actor.userId, "catalogue.add", "Facility", facilityId);
  return { ok: true, message: `${name} added. Patients can now find and book it.` };
}

export async function removeFacilityTest(actor: Actor | null, input: { testCode: unknown }): Promise<CatalogueResult> {
  const facilityId = facilityOf(actor);
  if (!actor || !facilityId) return NOT_ALLOWED;
  const code = checkTestCode(input.testCode);
  if (!code.ok) return code;
  const testCode = code.value;
  const name = getTest(testCode)?.name ?? testCode;

  const result = await prisma.$transaction(async (tx) => {
    const active = await tx.appointment.count({ where: { facilityId, testCode, status: { in: [...ACTIVE_APPOINTMENT_STATUSES] } } });
    const allowed = checkRemoval(testCode, active);
    if (!allowed.ok) return allowed;
    const removed = await tx.facilityTest.deleteMany({ where: { facilityId, testCode } });
    if (removed.count === 0) return { ok: false as const, error: `Your facility does not offer ${name}.` };
    return { ok: true as const, value: testCode };
  });
  if (!result.ok) return result;
  await audit(actor.userId, "catalogue.remove", "Facility", facilityId);
  return { ok: true, message: `${name} removed. Patients can no longer book it here.` };
}
