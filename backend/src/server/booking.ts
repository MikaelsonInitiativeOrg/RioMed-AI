import "server-only";
import { randomUUID, createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { can, type Actor } from "../core/access";
import {
  HOLD_MINUTES,
  MAX_ACTIVE_HOLDS_PER_PATIENT,
  assertTransition,
  generateBookingReference,
  isSlotBookable,
  type AppointmentStatus,
} from "../core/booking";
import { computeCharge } from "../core/money";
import { hasBankDetails, transferNarration, TRANSFER_CONFIRM_HOURS } from "../core/bankDetails";
import { prisma } from "./db";

type Tx = Prisma.TransactionClient;

export class BookingError extends Error {
  constructor(public code: "SLOT_UNAVAILABLE" | "TOO_MANY_HOLDS" | "NOT_ALLOWED" | "NOT_FOUND" | "INVALID", message?: string) {
    super(message ?? code);
  }
}

const HOLDING_UNPAID: AppointmentStatus[] = ["HELD", "PENDING_PAYMENT"];

/** Atomic capacity acquire: the database refuses to go over capacity (FR-043). */
async function acquireSlot(tx: Tx, slotId: string): Promise<boolean> {
  const n = await tx.$executeRaw`UPDATE "Slot" SET "used" = "used" + 1 WHERE "id" = ${slotId} AND "used" < "capacity"`;
  return n === 1;
}

async function releaseSlot(tx: Tx, slotId: string) {
  await tx.$executeRaw`UPDATE "Slot" SET "used" = "used" - 1 WHERE "id" = ${slotId} AND "used" > 0`;
}

/** Status change guarded by the current status (optimistic concurrency) and the state machine. */
async function moveStatus(tx: Tx, id: string, from: AppointmentStatus, to: AppointmentStatus): Promise<boolean> {
  assertTransition(from, to);
  const r = await tx.appointment.updateMany({ where: { id, status: from }, data: { status: to } });
  return r.count === 1;
}

export async function expireStaleHolds(now = new Date()) {
  const stale = await prisma.appointment.findMany({
    where: { status: { in: HOLDING_UNPAID }, holdExpiresAt: { lt: now } },
    select: { id: true, status: true, slotId: true },
  });
  for (const a of stale) {
    await prisma.$transaction(async (tx) => {
      if (await moveStatus(tx, a.id, a.status as AppointmentStatus, "EXPIRED")) await releaseSlot(tx, a.slotId);
    });
  }
  return stale.length;
}

export async function holdSlot(actor: Actor | null, input: { slotId: string; testCode: string }, now = new Date()) {
  if (!actor || !can(actor, "booking:create", { patientUserId: actor.userId })) throw new BookingError("NOT_ALLOWED");
  await expireStaleHolds(now);

  return prisma.$transaction(async (tx) => {
    const slot = await tx.slot.findUnique({ where: { id: input.slotId }, include: { facility: true } });
    if (!slot || !slot.facility.isPartner || !slot.facility.operational) throw new BookingError("NOT_FOUND");
    // Direct transfer: no business account on file means no online booking (patients call instead).
    if (!hasBankDetails(slot.facility)) throw new BookingError("NOT_ALLOWED", "This facility isn't taking online bookings yet. Please call it to book.");
    if (!isSlotBookable(slot.start, now)) throw new BookingError("SLOT_UNAVAILABLE", "This time is too soon to book.");
    const offer = await tx.facilityTest.findUnique({ where: { facilityId_testCode: { facilityId: slot.facilityId, testCode: input.testCode } } });
    if (!offer) throw new BookingError("INVALID", "This facility does not offer that test.");

    const active = await tx.appointment.count({ where: { patientUserId: actor.userId, status: { in: HOLDING_UNPAID } } });
    if (active >= MAX_ACTIVE_HOLDS_PER_PATIENT) throw new BookingError("TOO_MANY_HOLDS", "You already have 2 unpaid holds. Pay or wait for them to expire.");

    if (!(await acquireSlot(tx, slot.id))) throw new BookingError("SLOT_UNAVAILABLE", "That time was just booked. Please pick another.");

    return tx.appointment.create({
      data: {
        id: randomUUID(),
        reference: generateBookingReference(),
        patientUserId: actor.userId,
        facilityId: slot.facilityId,
        slotId: slot.id,
        testCode: input.testCode,
        status: "HELD",
        amountKobo: computeCharge(offer.priceKobo, 0), // FR-051: server-side, locked at hold time; fee 0 (FR-059g)
        holdExpiresAt: new Date(now.getTime() + HOLD_MINUTES * 60_000),
      },
    });
  }, { timeout: 10_000, maxWait: 5_000 }); // room for a slow link to the database
}

export type ConfirmOutcome = "CONFIRMED" | "ALREADY_CONFIRMED" | "REFUND_REQUIRED" | "NOT_FOUND";

/**
 * Called only after payment is verified server-side (FR-053). Idempotent (FR-054).
 * Late payment for an expired hold re-acquires capacity or requires a refund (FR-055).
 */
export async function confirmPaid(appointmentId: string): Promise<ConfirmOutcome> {
  return prisma.$transaction(async (tx) => {
    const a = await tx.appointment.findUnique({ where: { id: appointmentId } });
    if (!a) return "NOT_FOUND";
    const status = a.status as AppointmentStatus;
    if (status === "HELD" || status === "PENDING_PAYMENT") {
      if (await moveStatus(tx, a.id, status, "CONFIRMED")) return "CONFIRMED";
      return "ALREADY_CONFIRMED";
    }
    if (status === "EXPIRED") {
      if (await acquireSlot(tx, a.slotId)) {
        await moveStatus(tx, a.id, "EXPIRED", "CONFIRMED");
        return "CONFIRMED";
      }
      await moveStatus(tx, a.id, "EXPIRED", "REFUNDED");
      return "REFUND_REQUIRED";
    }
    return status === "REFUNDED" ? "REFUND_REQUIRED" : "ALREADY_CONFIRMED";
  });
}

export async function markPendingPayment(appointmentId: string) {
  await prisma.$transaction((tx) => moveStatus(tx, appointmentId, "HELD", "PENDING_PAYMENT"));
}

export async function cancelByPatient(actor: Actor | null, appointmentId: string) {
  const a = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!a || !actor || actor.role !== "patient" || a.patientUserId !== actor.userId) throw new BookingError("NOT_ALLOWED");
  const from = a.status as AppointmentStatus;
  if (!HOLDING_UNPAID.includes(from)) throw new BookingError("INVALID", "Only unpaid holds can be cancelled in the demo.");
  await prisma.$transaction(async (tx) => {
    if (await moveStatus(tx, a.id, from, "CANCELLED_BY_PATIENT")) await releaseSlot(tx, a.slotId);
  });
}

export async function checkIn(actor: Actor | null, appointmentId: string) {
  const a = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!a || !can(actor, "appointment:checkin", { facilityId: a.facilityId, patientUserId: a.patientUserId, status: a.status as AppointmentStatus })) {
    throw new BookingError("NOT_ALLOWED");
  }
  await prisma.$transaction((tx) => moveStatus(tx, a.id, "CONFIRMED", "CHECKED_IN"));
  await audit(actor!.userId, "appointment.checkin", "Appointment", a.id);
}

export const MAX_RESULT_BYTES = 4 * 1024 * 1024; // Vercel request body limit for the demo; PRD target is 10 MB

export async function uploadResult(actor: Actor | null, appointmentId: string, file: { name: string; bytes: Uint8Array }) {
  const a = await prisma.appointment.findUnique({ where: { id: appointmentId }, include: { results: true } });
  if (!a || !can(actor, "result:upload", { facilityId: a.facilityId, patientUserId: a.patientUserId, status: a.status as AppointmentStatus })) {
    throw new BookingError("NOT_ALLOWED");
  }
  if (file.bytes.length === 0 || file.bytes.length > MAX_RESULT_BYTES) throw new BookingError("INVALID", "PDF must be between 1 byte and 4 MB.");
  // FR-062: check content, not extension.
  const magic = Buffer.from(file.bytes.slice(0, 5)).toString("latin1");
  if (magic !== "%PDF-") throw new BookingError("INVALID", "Only PDF files are accepted.");

  const version = a.results.length + 1;
  const id = randomUUID();
  await prisma.$transaction(async (tx) => {
    await tx.testResult.updateMany({ where: { appointmentId: a.id, supersededBy: null }, data: { supersededBy: id } });
    await tx.testResult.create({
      data: {
        id,
        appointmentId: a.id,
        version,
        fileName: file.name.replace(/[^\w.\- ]/g, "_").slice(0, 100) || "result.pdf",
        sha256: createHash("sha256").update(file.bytes).digest("hex"),
        sizeBytes: file.bytes.length,
        content: Buffer.from(file.bytes),
        uploadedBy: actor!.userId,
      },
    });
    const status = a.status as AppointmentStatus;
    if (status !== "RESULT_AVAILABLE") await moveStatus(tx, a.id, status, "RESULT_AVAILABLE");
  });
  await audit(actor!.userId, "result.upload", "TestResult", id);
  return id;
}

export async function audit(actorUserId: string, action: string, subjectType: string, subjectId: string) {
  await prisma.auditEvent.create({ data: { id: randomUUID(), actorUserId, action, subjectType, subjectId } });
}

// ---- Direct bank transfer (2026-09-27; replaces Paystack for now) ----

/** What the patient needs to pay: the facility's account, the amount and the reference to quote. */
export async function getTransferDetails(actor: Actor | null, appointmentId: string) {
  const a = await prisma.appointment.findUnique({ where: { id: appointmentId }, include: { facility: true } });
  if (!a || !actor || actor.role !== "patient" || a.patientUserId !== actor.userId) return null;
  const f = a.facility;
  if (!hasBankDetails(f)) return null;
  return { bankName: f.bankName!, accountNumber: f.accountNumber!, accountName: f.accountName!, amountKobo: a.amountKobo, narration: transferNarration(a.reference), transferSentAt: a.transferSentAt };
}

/** Patient: "I've sent the transfer". Keeps the slot held while the facility checks its account. */
export async function markTransferSent(actor: Actor | null, appointmentId: string, now = new Date()) {
  const a = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!a || !actor || actor.role !== "patient" || a.patientUserId !== actor.userId) throw new BookingError("NOT_ALLOWED");
  if (a.status !== "HELD") throw new BookingError("INVALID", "This booking isn't waiting for a transfer.");
  if (a.holdExpiresAt.getTime() < now.getTime()) throw new BookingError("SLOT_UNAVAILABLE", "The hold expired. Please book again.");
  await prisma.$transaction(async (tx) => {
    if (!(await moveStatus(tx, a.id, "HELD", "PENDING_PAYMENT"))) throw new BookingError("INVALID", "This booking changed. Please refresh.");
    await tx.appointment.update({ where: { id: a.id }, data: { transferSentAt: now, holdExpiresAt: new Date(now.getTime() + TRANSFER_CONFIRM_HOURS * 3_600_000) } });
  });
  await audit(actor.userId, "payment.transfer_sent", "Appointment", a.id);
}

/** Facility: the transfer arrived in its account. Only staff of that facility can confirm. */
export async function confirmTransferReceived(actor: Actor | null, appointmentId: string) {
  const a = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!a || !actor || (actor.role !== "facility_staff" && actor.role !== "facility_admin") || actor.facilityId !== a.facilityId) throw new BookingError("NOT_ALLOWED");
  if (a.status !== "PENDING_PAYMENT" && a.status !== "HELD") throw new BookingError("INVALID", "This booking isn't waiting for payment.");
  const outcome = await confirmPaid(a.id);
  if (outcome !== "CONFIRMED" && outcome !== "ALREADY_CONFIRMED") throw new BookingError("SLOT_UNAVAILABLE", "The slot was released. Ask the patient to rebook, and refund the transfer.");
  await audit(actor.userId, "payment.transfer_confirmed", "Appointment", a.id);
}

