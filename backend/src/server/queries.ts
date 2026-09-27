import "server-only";
import { can, type Actor } from "../core/access";
import { isSlotBookable, type AppointmentStatus } from "../core/booking";
import { prisma } from "./db";
import { expireStaleHolds, audit } from "./booking";

/**
 * Read models for the UI. The frontend calls these; it never imports the database.
 * Every function that returns personal data takes the actor and checks access itself.
 */

export async function listDemoUsers() {
  return prisma.user.findMany({ where: { isDemo: true }, orderBy: { role: "asc" }, select: { id: true, name: true, role: true } });
}

/** Session lookup. A facility account that isn't approved yet gets NO facilityId, so every
 *  facility-scoped permission is denied until an operator approves it. */
export async function findUser(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true, facilityId: true, status: true, isDemo: true } });
  if (!u || u.status === "rejected") return null;
  return { ...u, facilityId: u.status === "active" ? u.facilityId : null, pending: u.status === "pending" };
}

export async function getFacilityBooking(facilityId: string, now = new Date()) {
  await expireStaleHolds(now);
  const facility = await prisma.facility.findUnique({ where: { id: facilityId }, include: { tests: { orderBy: { priceKobo: "asc" } } } });
  if (!facility) return null;
  const slots = facility.isPartner
    ? await prisma.slot.findMany({
        where: { facilityId, start: { gte: new Date(now.getTime() + 60 * 60_000), lt: new Date(now.getTime() + 7 * 86400_000) } },
        orderBy: { start: "asc" },
      })
    : [];
  return {
    facility: {
      id: facility.id,
      name: facility.name,
      type: facility.type,
      ownership: facility.ownership,
      address: facility.address,
      phone: facility.phone,
      nhfrId: facility.nhfrId,
      isPartner: facility.isPartner,
      sourceSyncedAt: facility.sourceSyncedAt,
      source: facility.source,
    },
    tests: facility.tests.map((t) => ({ testCode: t.testCode, priceKobo: t.priceKobo, turnaroundHours: t.turnaroundHours })),
    slots: slots
      .filter((s) => isSlotBookable(s.start, now))
      .map((s) => ({ id: s.id, start: s.start, end: s.end, remaining: Math.max(0, s.capacity - s.used) })),
  };
}

/** null = not found OR not allowed (don't reveal existence). */
export async function getAppointmentForActor(actor: Actor | null, appointmentId: string) {
  await expireStaleHolds();
  const a = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { facility: true, slot: true, results: { orderBy: { version: "desc" } }, payments: { orderBy: { createdAt: "desc" } } },
  });
  if (!a) return null;
  const subject = { patientUserId: a.patientUserId, facilityId: a.facilityId, status: a.status as AppointmentStatus };
  if (!can(actor, "appointment:view", subject)) return null;
  const paid = a.payments.find((p) => p.status === "success");
  return {
    id: a.id,
    reference: a.reference,
    status: a.status as AppointmentStatus,
    testCode: a.testCode,
    amountKobo: a.amountKobo,
    holdExpiresAt: a.holdExpiresAt,
    facility: { id: a.facilityId, name: a.facility.name, address: a.facility.address },
    slotStart: a.slot.start,
    slotEnd: a.slot.end,
    paidWith: paid ? (paid.provider as "paystack" | "simulated") : null,
    isOwner: actor?.role === "patient" && actor.userId === a.patientUserId,
    results: can(actor, "result:view", subject)
      ? a.results.map((r) => ({ id: r.id, version: r.version, uploadedAt: r.uploadedAt, superseded: r.supersededBy != null }))
      : [],
  };
}

export async function listPatientAppointments(actor: Actor | null) {
  if (!actor || actor.role !== "patient") return [];
  await expireStaleHolds();
  const rows = await prisma.appointment.findMany({
    where: { patientUserId: actor.userId },
    include: { facility: true, slot: true, _count: { select: { results: true } } },
    orderBy: { slot: { start: "desc" } },
  });
  return rows.map((a) => ({
    id: a.id,
    reference: a.reference,
    status: a.status as AppointmentStatus,
    testCode: a.testCode,
    amountKobo: a.amountKobo,
    facilityName: a.facility.name,
    slotStart: a.slot.start,
    hasResult: a._count.results > 0,
  }));
}

export async function listFacilityAppointments(actor: Actor | null, opts: { referenceQuery?: string } = {}) {
  if (!actor || (actor.role !== "facility_staff" && actor.role !== "facility_admin") || !actor.facilityId) return null;
  const facility = await prisma.facility.findUnique({ where: { id: actor.facilityId }, select: { id: true, name: true } });
  const q = opts.referenceQuery?.trim().toUpperCase();
  const rows = await prisma.appointment.findMany({
    where: {
      facilityId: actor.facilityId,
      status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED", "RESULT_AVAILABLE"] },
      ...(q ? { reference: { contains: q } } : {}),
    },
    include: { slot: true, patient: true, _count: { select: { results: true } } },
    orderBy: { slot: { start: "asc" } },
    take: 50,
  });
  return {
    facility,
    appointments: rows.map((a) => ({
      id: a.id,
      reference: a.reference,
      status: a.status as AppointmentStatus,
      testCode: a.testCode,
      slotStart: a.slot.start,
      patientName: a.patient.name,
      resultCount: a._count.results,
    })),
  };
}

export async function getSimulatedPayment(actor: Actor | null, reference: string) {
  const p = await prisma.payment.findUnique({ where: { providerReference: reference }, include: { appointment: true } });
  if (!p || p.provider !== "simulated" || !actor || p.appointment.patientUserId !== actor.userId) return null;
  return { reference: p.providerReference, amountKobo: p.amountKobo, appointmentId: p.appointmentId };
}

/** Result file for download. Checks access and writes the audit event (FR-063, FR-064). */
export async function getResultFileForActor(actor: Actor | null, resultId: string) {
  const r = await prisma.testResult.findUnique({ where: { id: resultId }, include: { appointment: true } });
  if (!r) return null;
  const a = r.appointment;
  if (!can(actor, "result:view", { patientUserId: a.patientUserId, facilityId: a.facilityId, status: a.status as AppointmentStatus })) return null;
  await audit(actor!.userId, "result.view", "TestResult", r.id);
  return { fileName: r.fileName, content: new Uint8Array(r.content) };
}

/** Idempotency record for webhooks (FR-054). Returns false if this event was already seen. */
export async function recordWebhookEvent(id: string, provider: string): Promise<boolean> {
  try {
    await prisma.webhookEvent.create({ data: { id, provider, outcome: "received" } });
    return true;
  } catch {
    return false;
  }
}

export async function setWebhookOutcome(id: string, outcome: string) {
  await prisma.webhookEvent.update({ where: { id }, data: { outcome } });
}

const AUDIT_LABEL: Record<string, string> = {
  "account.signup": "Account created",
  "account.login.password": "Signed in with password",
  "account.login.pin": "Unlocked with PIN",
  "account.locked": "Account locked after wrong attempts",
  "appointment.checkin": "Checked in at the facility",
  "result.upload": "Result PDF uploaded",
  "result.view": "Result PDF opened",
};

/** Real audit trail for a patient (FR-064): events on their account, bookings and results. */
export async function listAuditForPatient(actor: Actor | null, opts: { limit?: number } = {}) {
  if (!actor || actor.role !== "patient") return [];
  const appts = await prisma.appointment.findMany({
    where: { patientUserId: actor.userId },
    select: { id: true, reference: true, facility: { select: { name: true } }, results: { select: { id: true } } },
  });
  const subject = new Map<string, { reference: string; facilityName: string }>();
  for (const a of appts) {
    subject.set(a.id, { reference: a.reference, facilityName: a.facility.name });
    for (const r of a.results) subject.set(r.id, { reference: a.reference, facilityName: a.facility.name });
  }
  const events = await prisma.auditEvent.findMany({
    where: { subjectId: { in: [actor.userId, ...subject.keys()] } },
    orderBy: { at: "desc" },
    take: opts.limit ?? 100,
  });
  const actorIds = [...new Set(events.map((e) => e.actorUserId))];
  const actors = new Map((await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, role: true } })).map((u) => [u.id, u]));
  return events.map((e) => {
    const who = actors.get(e.actorUserId);
    return {
      id: e.id,
      action: AUDIT_LABEL[e.action] ?? e.action,
      at: e.at,
      byYou: e.actorUserId === actor.userId,
      byName: e.actorUserId === actor.userId ? "You" : who ? `${who.name} (${who.role === "patient" ? "patient" : who.role === "operator" ? "RioMed operator" : "facility staff"})` : "Unknown",
      reference: subject.get(e.subjectId)?.reference ?? null,
      facilityName: subject.get(e.subjectId)?.facilityName ?? null,
    };
  });
}

/** Data export (FR-006, NDPA portability): the patient's own account, bookings and audit trail. */
export async function exportPatientData(actor: Actor | null) {
  if (!actor || actor.role !== "patient") return null;
  const user = await prisma.user.findUnique({ where: { id: actor.userId }, select: { username: true, name: true, createdAt: true, isDemo: true } });
  return {
    exportedAt: new Date().toISOString(),
    account: user,
    appointments: await listPatientAppointments(actor),
    auditTrail: await listAuditForPatient(actor, { limit: 1000 }),
    note: "Result PDFs are not included; download each from its booking page.",
  };
}

/** The signed-in facility's real test catalogue (FR-071). */
export async function getFacilityCatalogue(actor: Actor | null) {
  if (!actor || (actor.role !== "facility_staff" && actor.role !== "facility_admin") || !actor.facilityId) return null;
  const facility = await prisma.facility.findUnique({ where: { id: actor.facilityId }, include: { tests: { orderBy: { priceKobo: "asc" } } } });
  if (!facility) return null;
  return {
    facility: { id: facility.id, name: facility.name, source: facility.source },
    tests: facility.tests.map((t) => ({ code: t.testCode, priceKobo: t.priceKobo, turnaroundHours: t.turnaroundHours })),
  };
}
