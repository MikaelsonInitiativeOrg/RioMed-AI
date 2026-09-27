/** Server-side flow smoke test against the local DB. Run: npx tsx --conditions=react-server scripts/e2e-smoke.ts */
import { prisma } from "../src/server/db";
import { holdSlot, checkIn, uploadResult, confirmPaid, expireStaleHolds, markTransferSent, confirmTransferReceived } from "../src/server/booking";
import { can } from "../src/core/access";

const ada = { userId: "usr_patient_ada", role: "patient" as const };
const tunde = { userId: "usr_patient_tunde", role: "patient" as const };
const staff = { userId: "usr_staff_alausa", role: "facility_staff" as const, facilityId: "fac_001" };
const otherStaff = { userId: "usr_staff_yaba", role: "facility_staff" as const, facilityId: "fac_008" };

function check(name: string, ok: boolean) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  // A capacity-1 slot (08:00) at least 2 hours out, at fac_001.
  const slot = await prisma.slot.findFirst({ where: { facilityId: "fac_001", capacity: 1, used: 0, start: { gt: new Date(Date.now() + 2 * 3600_000) } }, orderBy: { start: "asc" } });
  if (!slot) throw new Error("no slot");

  // FR-043: two patients race for the last unit of capacity.
  const race = await Promise.allSettled([holdSlot(ada, { slotId: slot.id, testCode: "MALARIA_MP" }), holdSlot(tunde, { slotId: slot.id, testCode: "MALARIA_MP" })]);
  const wins = race.filter((r) => r.status === "fulfilled");
  check("exactly one of two concurrent holds succeeds", wins.length === 1);
  const after = await prisma.slot.findUnique({ where: { id: slot.id } });
  check("slot used == capacity (no overbooking)", after!.used === 1);
  const appt = (wins[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof holdSlot>>>).value;
  check("amount locked server-side from catalogue", appt.amountKobo > 0 && Number.isInteger(appt.amountKobo));

  // Payment by direct bank transfer: the patient says it was sent, the facility confirms receipt.
  const payer = appt.patientUserId === ada.userId ? ada : tunde;
  let blocked = false;
  try { await confirmTransferReceived(otherStaff, appt.id); } catch { blocked = true; }
  check("staff of another facility cannot confirm the transfer", blocked);
  await markTransferSent(payer, appt.id);
  check("transfer marked as sent keeps the slot held", (await prisma.appointment.findUnique({ where: { id: appt.id } }))?.status === "PENDING_PAYMENT");
  await confirmTransferReceived(staff, appt.id);
  check("facility confirming receipt confirms the booking", (await prisma.appointment.findUnique({ where: { id: appt.id } }))?.status === "CONFIRMED");
  check("confirm is idempotent", (await confirmPaid(appt.id)) === "ALREADY_CONFIRMED");

  // Access control on facility actions.
  let denied = false;
  try { await checkIn(otherStaff, appt.id); } catch { denied = true; }
  check("staff of another facility cannot check in", denied);
  await checkIn(staff, appt.id);
  denied = false;
  try { await uploadResult(staff, appt.id, { name: "fake.pdf", bytes: new TextEncoder().encode("not a pdf") }); } catch { denied = true; }
  check("non-PDF upload rejected by content", denied);
  await uploadResult(staff, appt.id, { name: "result.pdf", bytes: new TextEncoder().encode("%PDF-1.4\n% demo result\n") });
  const done = await prisma.appointment.findUnique({ where: { id: appt.id } });
  check("status RESULT_AVAILABLE after upload", done!.status === "RESULT_AVAILABLE");
  const subj = { patientUserId: done!.patientUserId, facilityId: done!.facilityId, status: "RESULT_AVAILABLE" as const };
  const other = done!.patientUserId === ada.userId ? tunde : ada;
  check("owner can view result", can(done!.patientUserId === ada.userId ? ada : tunde, "result:view", subj));
  check("other patient cannot view result", !can(other, "result:view", subj));
  check("operator cannot view result", !can({ userId: "op", role: "operator" }, "result:view", subj));

  // FR-055: late payment after expiry when the slot was taken -> refund, never overbook.
  const slot2 = await prisma.slot.findFirst({ where: { facilityId: "fac_002", capacity: 1, used: 0, start: { gt: new Date(Date.now() + 2 * 3600_000) } }, orderBy: { start: "asc" } });
  const h = await holdSlot(ada, { slotId: slot2!.id, testCode: "MALARIA_MP" });
  await prisma.appointment.update({ where: { id: h.id }, data: { holdExpiresAt: new Date(Date.now() - 1000) } });
  await expireStaleHolds();
  const h2 = await holdSlot(tunde, { slotId: slot2!.id, testCode: "MALARIA_MP" });
  check("expired hold released capacity for the next patient", !!h2);
  check("late payment for taken slot -> refund, not overbook", (await confirmPaid(h.id)) === "REFUND_REQUIRED");
  check("slot still not overbooked", (await prisma.slot.findUnique({ where: { id: slot2!.id } }))!.used === 1);
}

main().finally(() => prisma.$disconnect());
